// Music & chants: karaoke highlighting in time with the voice over a beat, Mandarin tone chants
// with tone marks, and sing-along graded by Whisper with the heatmap.
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
    window.__ticks = 0;
    const ostart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a) {
      window.__ticks++;
      return ostart.apply(this, a);
    };
    // Fake mic: sings back the line that was just played.
    // Like the app, the fake mic's audio starts in a tap (WebKit won't start it later).
    document.addEventListener('click', () => (window.__micCtx ??= new AudioContext()).resume(), { capture: true });
    MediaDevices.prototype.getUserMedia = async function () {
      const c = window.__micCtx ?? new AudioContext();
      await c.resume();
      const dest = c.createMediaStreamDestination();
      const noise = c.createBufferSource();
      const nb = c.createBuffer(1, c.sampleRate * 20, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.002;
      noise.buffer = nb;
      noise.connect(dest);
      noise.start();
      const clip = '/mic/es-chant-hola-0.mp3';
      const src = c.createBufferSource();
      src.buffer = await c.decodeAudioData(await (await fetch(clip)).arrayBuffer());
      src.connect(dest);
      src.start(c.currentTime + 0.4);
      return dest.stream;
    };
  });
  await context.route('**/mic/es-chant-hola-0.mp3', (r) => r.fulfill({ path: new URL('../../assets/audio/chants/es/es-chant-hola-0.mp3', import.meta.url).pathname, contentType: 'audio/mpeg' }));
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 200)));
  const state = () => page.getByTestId('chant-state').evaluate((e) => ({ line: Number(e.dataset.line), word: Number(e.dataset.word), you: e.dataset.you === '1' }));

  // ---------- The list ----------
  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('music-card').click();
  await page.locator('[data-testid^=chant-]').first().waitFor();
  expect((await page.locator('[data-testid^=chant-es-]').count()) === 6, 'Spanish: a chant or song for each of the six levels');
  await page.goto(`${BASE}#/zh/music`);
  await page.getByTestId('chant-zh-tones-four').waitFor();
  expect(/Tone chant/.test(await page.getByTestId('chant-zh-tones-four').innerText()), 'Mandarin: tone chants too');
  await page.screenshot({ path: 'U-list.png' });

  // ---------- A tone chant: tone marks and colors over each syllable ----------
  await page.getByTestId('chant-zh-tones-four').click();
  await page.locator('.karaoke-line ruby').first().waitFor();
  const ruby = await page.locator('.karaoke-line').first().locator('ruby').evaluateAll((els) => els.map((e) => `${e.firstChild.textContent}${e.querySelector('rt').textContent}:${e.className}`));
  expect(ruby.join(' ') === '妈mā:tone1 麻má:tone2 马mǎ:tone3 骂mà:tone4', `each syllable shows its tone mark and tone color (${ruby.join(' ')})`);

  // Listen: the beat plays and the words light up in time.
  await page.getByTestId('chant-listen').click();
  const seen = [];
  for (let i = 0; i < 240; i++) {
    const s = await state();
    if (s.line === 0 && s.word >= 0 && seen.at(-1) !== s.word) seen.push(s.word);
    if (s.line >= 1) break;
    await page.waitForTimeout(50);
  }
  expect(seen.length >= 3 && seen.every((w, i) => i === 0 || w > seen[i - 1]), `karaoke: the words light up one by one in time (${seen.join(' → ')})`);
  expect((await page.evaluate(() => window.__ticks)) >= 4, `a soft beat plays (${await page.evaluate(() => window.__ticks)} ticks)`);
  await page.screenshot({ path: 'U-tones.png' });
  await page.getByTestId('chant-listen').click(); // stop

  // ---------- Sing along: your turn on the beat, graded ----------
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Download standard model/ }).click();
  await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });
  await page.goto(`${BASE}#/es/music/es-chant-hola`);
  await page.getByTestId('chant-sing').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=chant-state]')?.dataset.you === '1', null, { timeout: 30000 });
  expect(true, 'after the line plays, it is your turn');
  await page.screenshot({ path: 'U-yourturn.png' });
  await page.locator('.karaoke-line').first().getByTestId('heatmap').waitFor({ timeout: 90000 }).catch(async (e) => {
    console.log('   line 0 now:', (await page.locator('.karaoke-line').first().innerText()).replace(/\n/g, ' | '));
    await page.screenshot({ path: 'U-debug.png' });
    throw e;
  });
  const heat = await page.locator('.karaoke-line').first().locator('.heat').evaluateAll((els) => els.map((e) => e.dataset.status));
  expect(heat.filter((s) => s === 'ok').length >= heat.length / 2, `your singing is graded word by word (${heat.join(' ')})`);
  await page.screenshot({ path: 'U-graded.png' });
  await page.getByTestId('chant-sing').click(); // stop

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
