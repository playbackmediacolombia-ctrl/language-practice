// Pronunciation heatmap: each word green, yellow or red after you speak; tap a red one to hear it
// and try just that word; Mandarin flags wrong tones.
import { devices, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.addInitScript(() => {
    // Fake mic: "¿Dónde está el baño?" whatever you were asked to say.
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      window.__played = this.src;
      return play.apply(this, a);
    };
    MediaDevices.prototype.getUserMedia = async function () {
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
      const src = c.createBufferSource();
      src.buffer = await c.decodeAudioData(await (await fetch(window.__micClip)).arrayBuffer());
      src.connect(dest);
      src.start(c.currentTime + 0.6);
      return dest.stream;
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Download standard model/ }).click();
  await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

  // ---------- Listen & repeat: one word missed ----------
  await page.goto(`${BASE}#/es/travel/practice`);
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  const bathroom = new URL('../../assets/audio/es/dir-bathroom.mp3', import.meta.url);
  await context.route('**/mic/dir-bathroom.mp3', async (r) => r.fulfill({ path: bathroom.pathname, contentType: 'audio/mpeg' }));
  await page.evaluate(() => (window.__micClip = '/mic/dir-bathroom.mp3'));
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.getByTestId('heatmap').waitFor({ timeout: 90_000 });
  const words = await page.locator('.heat').evaluateAll((els) => els.map((e) => `${e.textContent}:${e.dataset.status}`));
  console.log('   ', words.join(' '));
  expect(words.some((w) => w.endsWith(':ok')) && words.some((w) => /aeropuerto.*:(wrong|close)/.test(w)), 'each word colored: the ones you said green, "aeropuerto" not');
  expect(/tap a word to practice it/.test(await page.getByTestId('heatmap').innerText()), 'it says you can tap a word');
  await page.getByTestId('heatmap').screenshot({ path: 'H-heatmap.png' });
  await page.locator('.heat[data-status=wrong], .heat[data-status=close]').first().click();
  await page.getByTestId('word-practice').waitFor();
  await page.evaluate(() => (window.__played = null));
  await page.getByTestId('word-hear').click();
  await page.waitForTimeout(400);
  const heard = await page.evaluate(() => ({ played: window.__played, spoken: window.__spoken.slice(-1)[0] }));
  expect(/aeropuerto/i.test(heard.played ?? '') || /aeropuerto/i.test(heard.spoken ?? ''), `tap it: you hear the word (${heard.played?.split('/').pop() ?? `phone voice: ${heard.spoken}`})`);
  await page.getByTestId('word-try').click();
  await page.getByTestId('word-result').waitFor({ timeout: 60_000 });
  expect(/Heard:/.test(await page.getByTestId('word-result').innerText()), `and can try just that word again (${(await page.getByTestId('word-result').innerText()).replace(/\s+/g, ' ')})`);
  await page.screenshot({ path: 'H-word.png' });

  // ---------- Mandarin: a wrong tone is flagged ----------
  const zh = await page.evaluate(() => window.__compare('买单', '卖单', 'zh'));
  expect(zh.tokens[0].status === 'close' && zh.tokens[0].tone?.expected === 'mai3' && zh.tokens[0].tone?.heard === 'mai4', `Mandarin: 买 said as 卖 is "right sound, wrong tone" (${JSON.stringify(zh.tokens[0])})`);
  expect(zh.tokens[1].status === 'ok', 'and the right character stays green');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
