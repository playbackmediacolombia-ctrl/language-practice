// Shared test setup: every browser is muted, and always closed when the test ends — on
// success, on failure, on Ctrl-C, or when the time limit runs out.
//
// WebKit has no --mute-audio switch (that's Chromium), so audio is muted inside every page:
// Web Audio is routed through a zero-volume node before the speakers, and <audio>/<video>
// elements are forced muted. Tests can still see *what* plays (they hook start()/play()).
import { execFileSync } from 'node:child_process';
import { webkit } from 'playwright';

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
  });
}

/**
 * Changes the app's saved progress (settings, hearts, finished lessons) for a test, then reloads.
 * `edit` gets the saved object and changes it in place (or returns a new one).
 * The app saves its in-memory progress as it unloads (practice time), which would overwrite a
 * plain localStorage write, so this first steps the tab onto a static file of the same site:
 * the app's last save runs, then the edit is made with no app code loaded.
 */
export async function editProgress(page, edit) {
  const back = page.url();
  await page.goto(new URL('icons/favicon-32.png', back).href);
  await page.evaluate((src) => {
    const p = JSON.parse(localStorage.getItem('progress-v1') ?? '{}');
    const next = new Function(`return (${src})`)()(p) ?? p;
    localStorage.setItem('progress-v1', JSON.stringify(next));
  }, edit.toString());
  await page.goto(back);
}

const browsers = new Set();

/** Launches WebKit (Safari's engine); every context and page it makes is muted. */
export async function launch() {
  const browser = await webkit.launch();
  browsers.add(browser);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await newContext(options);
    await context.addInitScript(muteAudio);
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
