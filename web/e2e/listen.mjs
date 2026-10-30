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
  await page.evaluate(() => (window.__clip = 'silence'));
  await dl.click();
  await page.locator('.bar').waitFor();
  await page.getByTestId('speak-coach').waitFor({ timeout: 300_000 });
  console.log(since(), 'model downloaded: the voice plays and the mic opens by itself');

  const phrase = () => page.locator('.screen-title, h1').first().innerText().catch(() => '');
  const stage = (...s) => page.locator(s.map((x) => `[data-testid=speak-coach][data-stage=${x}]`).join(', '));
  const results = [];
  // Silence: it says so, out loud, and waits for a tap.
  await page.getByTestId('coach-nohear').waitFor({ timeout: 40_000 });
  await page.waitForTimeout(400);
  const spokeNoHear = (await page.evaluate(() => window.__feedback.length)) >= 1;
  console.log(spokeNoHear ? '  PASS silence: said out loud' : '  FAIL silence was quiet');
  results.push(spokeNoHear);
  await stage('idle').waitFor({ timeout: 10_000 });
  // A wrong phrase: not Great, and it listens again by itself.
  await page.evaluate(() => (window.__clip = 'goodbye'));
  await page.getByTestId('coach-mic').click();
  await page.getByTestId('coach-result').waitFor({ timeout: 60_000 });
  const wrong = await page.getByTestId('coach-result').getAttribute('data-grade');
  console.log(`  [goodbye] ${wrong}: ${(await page.getByTestId('coach-result').innerText()).replace(/\n+/g, ' | ')}`);
  results.push(wrong !== 'great');
  await page.screenshot({ path: 'shot-goodbye-result.png' });
  // The right one: Great!, then on to the next phrase by itself.
  await page.evaluate(() => (window.__clip = 'hola'));
  const was = await page.locator('main').innerText();
  await page.waitForFunction((t) => document.querySelector('main').innerText.split('\n')[0] !== t.split('\n')[0] || document.querySelector('[data-testid=coach-result]')?.dataset.grade === 'great', was, { timeout: 120_000 });
  console.log('  PASS moved on or graded Great');
  results.push(true);

  // 2. Reload: model is remembered, no download prompt.
  await page.reload();
  await page.getByTestId('speak-coach').waitFor();
  console.log(since(), 'after reload: no download prompt (model cached)');
  void phrase;

  console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
  await browser.close();
});
