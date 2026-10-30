// Shared test setup: every browser is muted, and always closed when the test ends — on
// success, on failure, on Ctrl-C, or when the time limit runs out.
//
// WebKit has no --mute-audio switch (that's Chromium), so audio is muted inside every page:
// Web Audio is routed through a zero-volume node before the speakers, <audio>/<video>
// elements are forced muted, and the device voice (speechSynthesis) never speaks. Tests can still see *what* plays (they hook start()/play()).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

export { devices } from 'playwright';

/** Runs in every page before the app's own scripts. */
function muteAudio() {
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode) {
      const ctx = target.context;
      if (!ctx.__mute) {
        ctx.__mute = ctx.createGain();
        ctx.__mute.gain.value = 0;
        connect.call(ctx.__mute, target);
      }
      connect.call(this, ctx.__mute, ...rest);
      return target;
    }
    return connect.call(this, target, ...rest);
  };
  const played = new Set(); // includes `new Audio()` elements that never join the page
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    this.muted = true;
    this.volume = 0;
    played.add(this);
    return play.apply(this, a);
  };
  // The phone's own voice (speechSynthesis) never speaks in a test: it records what it would
  // have said and reports the utterance finished.
  // (WebKit's test browser has no voices at all, so a silent stand-in fills in there.)
  window.__spoken = [];
  if (!window.SpeechSynthesisUtterance) {
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  }
  const silentSpeak = function (u) {
    if (u.text.trim()) window.__spoken.push(u.text);
    setTimeout(() => u.onend?.(new Event('end')), 30);
  };
  if (window.SpeechSynthesis) window.SpeechSynthesis.prototype.speak = silentSpeak; // WebKit keeps it on the prototype
  if (window.speechSynthesis) window.speechSynthesis.speak = silentSpeak;
  else Object.defineProperty(window, 'speechSynthesis', { value: { speak: silentSpeak, cancel() {}, getVoices: () => [] }, configurable: true });
  // For checks: every audio context that reached the speakers went through a muted node.
  const contexts = new Set();
  const Ctx = window.AudioContext;
  window.AudioContext = function (...a) {
    const c = new Ctx(...a);
    contexts.add(c);
    return c;
  };
  window.AudioContext.prototype = Ctx.prototype;
  window.__muteReport = () => ({
    contexts: contexts.size,
    allMuted: [...contexts].every((c) => !c.__mute || c.__mute.gain.value === 0),
    played: played.size,
    media: [...played, ...document.querySelectorAll('audio, video')].every((m) => m.muted && m.volume === 0),
    voice: !window.speechSynthesis || /__spoken/.test(String(window.speechSynthesis.speak)),
  });
}

/**
 * Changes the app's saved progress (settings, hearts, finished lessons) for a test, then reloads.
 * `edit` gets the saved object and changes it in place (or returns a new one). It runs in the
 * page, so it can't see the test's variables: pass what it needs as `arg` (its second parameter).
 * The app saves its in-memory progress as it unloads (practice time), which would overwrite a
 * plain localStorage write, so this first steps the tab onto a static file of the same site:
 * the app's last save runs, then the edit is made with no app code loaded.
 */
export async function editProgress(page, edit, arg) {
  const back = page.url();
  await page.goto(new URL('icons/favicon-32.png', back).href);
  await page.evaluate(
    ([src, a]) => {
      const p = JSON.parse(localStorage.getItem('progress-v1') ?? '{}');
      const next = new Function(`return (${src})`)()(p, a) ?? p;
      localStorage.setItem('progress-v1', JSON.stringify(next));
    },
    [edit.toString(), arg],
  );
  await page.goto(back);
}

const browsers = new Set();

/**
 * Replaces the mic with a stream: quiet room noise, then the recording in window.__micClip (a URL,
 * or null for silence) after a short pause, then quiet again. Lets a test "say" things.
 */
export async function fakeMic(context) {
  await context.addInitScript(() => {
    window.__micClip = null;
    window.__micOpens = 0;
    MediaDevices.prototype.getUserMedia = async function () {
      window.__micOpens++;
      const c = (window.__micCtx ??= new AudioContext()); // only one: browsers allow just a few
      await c.resume();
      const dest = c.createMediaStreamDestination();
      const noise = c.createBufferSource();
      const nb = c.createBuffer(1, c.sampleRate * 20, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.002;
      noise.buffer = nb;
      noise.connect(dest);
      noise.start();
      if (window.__micClip) {
        const src = c.createBufferSource();
        src.buffer = await c.decodeAudioData(await (await fetch(window.__micClip)).arrayBuffer());
        src.connect(dest);
        src.start(c.currentTime + 0.6);
      }
      return dest.stream;
    };
  });
}


const UNITS = JSON.parse(readFileSync(new URL('../../shared/course/outline.json', import.meta.url), 'utf8')).stages.flatMap((s) => [...s.units, ...(s.electives ?? [])]);
/** Every unit's Class marked taken, in every language. */
export const ALL_CLASSES = Object.fromEntries(['es', 'fr', 'zh', 'pt', 'it'].flatMap((l) => UNITS.map((u) => [`${l}:${u}`, 1])));
const DAY1 = Object.fromEntries(['es', 'fr', 'zh', 'pt', 'it'].map((l) => [l, JSON.parse(readFileSync(new URL(`../../shared/course/${l}.json`, import.meta.url), 'utf8')).units.find((u) => u.id === 'u1').lessons.map((x) => x.id)]));
/** Marks Day 1 (unit 1, its short lessons) done, so the next lesson has graded answers. */
export const skipDay1 = (page, ...langs) =>
  editProgress(page, (p, done) => ({ ...p, lessons: { ...p.lessons, ...Object.fromEntries(done.map((k) => [k, 1])) } }), langs.flatMap((l) => DAY1[l].map((id) => `${l}:${id}`)));

function seedClasses(all) {
  try {
    if (localStorage.getItem('test-classes-seeded')) return;
    const p = JSON.parse(localStorage.getItem('progress-v1') ?? '{}');
    localStorage.setItem('progress-v1', JSON.stringify({ ...p, classes: { ...all, ...p.classes } }));
    localStorage.setItem('test-classes-seeded', '1');
  } catch {
    // not an app page (about:blank)
  }
}

/**
 * Launches WebKit (Safari's engine); every context and page it makes is muted.
 * Big-achievement celebrations are tapped away whenever one gets in the way of a test's next
 * tap, like a person would; pass `keepCelebrations: true` to newContext to look at them instead.
 */
export async function launch({ engine = 'webkit' } = {}) {
  // 'chrome' is desktop Chrome itself, with its own temporary profile: never the user's, and muted.
  const browser = engine === 'chrome' ? await chromium.launch({ channel: 'chrome', args: ['--mute-audio'] }) : await webkit.launch();
  browsers.add(browser);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async ({ keepCelebrations = false, classes = 'taken', ...options } = {}) => {
    const context = await newContext(options);
    await context.addInitScript(muteAudio);
    // Most suites test what comes after a unit's Class, so every Class starts out taken (once
    // per browser context); pass `classes: 'fresh'` to test the Classes themselves.
    if (classes === 'taken') await context.addInitScript(seedClasses, ALL_CLASSES);
    if (classes === 'taken') {
      // "Words you'll need" comes before role-plays and stories: tap I'm ready, like a person would.
      context.on('page', (page) => void page.addLocatorHandler(page.getByTestId('need-ready'), () => page.getByTestId('need-ready').click()));
    }
    if (!keepCelebrations) {
      context.on('page', (page) => {
        const celebration = page.getByTestId('achievement');
        void page.addLocatorHandler(celebration, () => celebration.getByRole('button', { name: 'Continue' }).click());
      });
    }
    return context;
  };
  browser.newPage = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.once('close', () => context.close().catch(() => {}));
    return page;
  };
  return browser;
}

let closing = null;

/** Closes every browser (each close gets 5 s), then kills any Playwright browser still running. */
export function cleanup() {
  closing ??= (async () => {
    await Promise.all(
      [...browsers].map((b) => Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))])),
    );
    killStrays();
  })();
  return closing;
}

/**
 * Last resort for a browser that didn't close: kills Playwright browser processes, matched by
 * their executable path, so Safari, Chrome and this test process itself are never touched.
 */
export function killStrays() {
  try {
    const PW = `${process.env.HOME}/Library/Caches/ms-playwright/`;
    const lines = execFileSync('ps', ['-axo', 'pid=,comm='], { encoding: 'utf8' }).split('\n');
    const pids = lines.map((l) => l.trim().split(/\s+(.*)/)).filter(([, comm]) => comm?.startsWith(PW)).map(([pid]) => Number(pid));
    for (const pid of pids) if (pid !== process.pid) process.kill(pid, 'SIGKILL');
  } catch {
    // Nothing to kill.
  }
}

/** Runs a test body with guaranteed cleanup and a hard time limit. */
export async function run(main, { minutes = 15 } = {}) {
  const fail = (why, code = 1) => {
    console.error(why);
    process.exitCode = code;
    cleanup().finally(() => process.exit(code));
  };
  const timer = setTimeout(() => fail(`TIMEOUT: still running after ${minutes} min, stopping.`), minutes * 60_000);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => fail(`Stopped (${sig}).`, 130));
  process.once('uncaughtException', (e) => fail(e));
  process.once('unhandledRejection', (e) => fail(e));
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    await cleanup();
  }
}
