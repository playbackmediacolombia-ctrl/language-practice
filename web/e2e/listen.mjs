// End-to-end test of Listen & repeat in WebKit with iPhone emulation.
// The mic is replaced by a stream that plays a real recording after a short pause, then silence.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { devices, launch, run } from './harness.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const AUDIO = fileURLToPath(new URL('../../assets/audio', import.meta.url));
const clips = {
  hola: `${AUDIO}/es/greet-hello.mp3`,
  bonjour: `${AUDIO}/fr/greet-hello.mp3`,
  goodbye: `${AUDIO}/es/greet-goodbye.mp3`,
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.route('**/test-clip/*', (route) => {
    const name = route.request().url().split('/').pop();
    route.fulfill({ body: readFileSync(clips[name]), contentType: 'audio/mpeg' });
  });
  await context.addInitScript(() => {
    window.__clip = 'hola';
    window.__feedback = [];
    window.__getUserMediaCalls = 0;
    // Fake mic: 0.8 s of quiet room noise, the clip, then quiet.
    MediaDevices.prototype.getUserMedia = async function () {
      window.__getUserMediaCalls++;
      const c = new AudioContext();
      await c.resume();
      const dest = c.createMediaStreamDestination();
      const noise = c.createBufferSource();
      const nb = c.createBuffer(1, c.sampleRate * 20, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.002;
      noise.buffer = nb;
      noise.connect(dest);
      noise.start();
      if (window.__clip !== 'silence') {
        const data = await (await fetch(`/test-clip/${window.__clip}`)).arrayBuffer();
        const src = c.createBufferSource();
        src.buffer = await c.decodeAudioData(data);
        src.__mic = true;
        src.connect(dest);
        src.start(c.currentTime + 0.8);
      }
      return dest.stream;
    };
    // Record what feedback the app speaks.
    const realFetch = window.fetch;
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      return realFetch(input, init);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const dur = this.buffer?.duration;
      if (dur && dur < 5 && !this.__mic) window.__feedback.push(Math.round(dur * 10) / 10);
      return start.apply(this, args);
    };
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const t0 = Date.now();
  const since = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
  const status = () => page.locator('.status').innerText();

  await page.goto(`${BASE}#/es/greetings/practice`);

  // 1. Model not downloaded: a clear download button on the practice screen.
  const dl = page.getByRole('button', { name: /Download speech model/ });
  await dl.waitFor();
  console.log(since(), 'download button shown:', await dl.innerText());
  await page.screenshot({ path: 'shot-1-download.png' });
  await dl.click();
  await page.locator('.bar').waitFor();
  console.log(since(), 'downloading…');
  await page.getByRole('button', { name: 'Start recording' }).waitFor({ timeout: 300_000 });
  console.log(since(), 'model downloaded, mic shown');

  // Feedback clip durations, to tell which one played.
  const durations = await page.evaluate(async () => {
    const c = new OfflineAudioContext(1, 1, 44100);
    const out = {};
    for (const n of ['great', 'close', 'retry']) {
      const b = await (await fetch(`feedback/${n}.mp3`)).arrayBuffer();
      out[Math.round((await c.decodeAudioData(b)).duration * 10) / 10] = n;
    }
    return out;
  });

  async function attempt(clip, expectGrade) {
    await page.evaluate((c) => {
      window.__clip = c;
      window.__feedback = [];
    }, clip);
    const tap = Date.now();
    await page.getByRole('button', { name: 'Start recording' }).click();
    await page.locator('.mic.on').waitFor();
    console.log(`  [${clip}] recording; status: "${await status()}"`);
    if (clip !== 'silence') {
      await page.waitForFunction(() => document.querySelector('.status')?.textContent?.includes('stops when you finish'));
      console.log(`  [${clip}] speech detected; status: "${await status()}"`);
      // No stop button is pressed: it must stop by itself and show "checking".
      await page.locator('.mic.checking').waitFor({ timeout: 15_000 });
      console.log(`  [${clip}] auto-stopped after ${((Date.now() - tap) / 1000).toFixed(1)}s; status: "${await status()}"`);
      await page.screenshot({ path: `shot-${clip}-checking.png` });
      await page.locator('.grade').waitFor({ timeout: 60_000 });
      const grade = await page.locator('.grade').getAttribute('class');
      const text = (await page.locator('.grade').innerText()).replace(/\n+/g, ' | ');
      await page.waitForTimeout(300);
      const spoken = (await page.evaluate(() => window.__feedback)).map((d) => durations[d] ?? d);
      console.log(`  [${clip}] RESULT class="${grade}" text="${text}" spoken=${JSON.stringify(spoken)}`);
      await page.screenshot({ path: `shot-${clip}-result.png` });
      const ok = grade.includes(expectGrade) && spoken.length === 1;
      console.log(ok ? `  PASS ${clip}` : `  FAIL ${clip} (expected ${expectGrade})`);
      return ok;
    }
    await page.getByText("I didn't hear anything").waitFor({ timeout: 15_000 });
    console.log(`  [silence] gave up after ${((Date.now() - tap) / 1000).toFixed(1)}s with a clear message`);
    console.log('  PASS silence');
    return true;
  }

  const results = [
    await attempt('hola', 'ok'),
    await attempt('goodbye', 'wrong'),
    await attempt('silence'),
    await attempt('hola', 'ok'), // second try still works (mic, worker and audio reused)
  ];

  // 2. Reload: model is remembered, no download prompt.
  await page.reload();
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  console.log(since(), 'after reload: mic shown directly (model cached)');

  console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
  await browser.close();
});
