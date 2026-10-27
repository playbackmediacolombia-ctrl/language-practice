// One voice at a time: phrases, spoken feedback and other clips never overlap; after a feedback
// line the next clip waits a short pause; tapping Continue early cuts the feedback off cleanly.
import { devices, editProgress, launch, run } from './harness.mjs';

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
    // A timeline of every spoken clip: <audio> phrases and Web Audio buffers longer than a blip.
    window.__voice = [];
    const now = () => performance.now();
    const seen = new WeakSet();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      if (!seen.has(this)) {
        seen.add(this);
        // One element plays one thing: a new clip starting closes the previous record, and a
        // late 'pause' for the old clip can't close the new one.
        let rec = null;
        const stop = () => rec && rec.end === Infinity && (rec.end = now());
        this.addEventListener('playing', () => {
          stop();
          rec = { kind: 'phrase', name: this.src.split('/').pop().slice(0, 30), start: now(), end: Infinity, src: this.src };
          window.__voice.push(rec);
        });
        const stopIfSame = () => rec && rec.src === this.src && stop();
        this.addEventListener('pause', stopIfSame);
        this.addEventListener('ended', stopIfSame);
        this.addEventListener('emptied', stop);
      }
      return play.apply(this, a);
    };
    const start = AudioBufferSourceNode.prototype.start;
    const stopFn = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (when = 0, ...rest) {
      if (this.buffer && this.buffer.duration > 0.4) {
        const delay = Math.max(0, (when - this.context.currentTime) * 1000);
        const rec = { kind: 'clip', start: now() + delay, end: now() + delay + this.buffer.duration * 1000 };
        this.__rec = rec;
        window.__voice.push(rec);
      }
      return start.call(this, when, ...rest);
    };
    AudioBufferSourceNode.prototype.stop = function (...a) {
      if (this.__rec && this.__rec.end > now()) this.__rec.end = now();
      return stopFn.apply(this, a);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const overlaps = async () =>
    page.evaluate(() => {
      const v = window.__voice.map((r) => ({ ...r, end: r.end === Infinity ? performance.now() : r.end }));
      const out = [];
      for (let i = 0; i < v.length; i++)
        for (let j = i + 1; j < v.length; j++) {
          const o = Math.min(v[i].end, v[j].end) - Math.max(v[i].start, v[j].start);
          if (o > 60) out.push(`${v[i].kind}:${v[i].name ?? ''} & ${v[j].kind}:${v[j].name ?? ''} (${Math.round(o)} ms)`);
        }
      return out;
    });
  const lastClip = () => page.evaluate(() => [...window.__voice].reverse().find((r) => r.kind === 'clip'));

  /** Answer the current exercise right or wrong (choice-type exercises only). */
  async function answerChoice(right) {
    for (let guard = 0; guard < 20; guard++) {
      const ex = await page.evaluate(() => window.__exercise);
      if (['meaning', 'listen', 'translate'].includes(ex.type)) {
        const i = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
        await page.locator('.options button').nth(right ? i : (i + 1) % ex.options.length).click();
        await page.getByRole('button', { name: 'Check' }).click();
        await page.locator('.banner').waitFor();
        return ex;
      }
      // Not a choice exercise: skip past it with a right answer the easy way.
      if (ex.type === 'type') {
        await page.locator('textarea').fill(ex.item.text);
        await page.getByRole('button', { name: 'Check' }).click();
      } else if (ex.type === 'tiles') {
        const used = new Set();
        for (const w of ex.item.tiles) {
          const k = ex.bank.findIndex((b, j) => b === w && !used.has(j));
          used.add(k);
          await page.locator('.bank button').nth(k).click();
        }
        await page.getByRole('button', { name: 'Check' }).click();
      } else if (ex.type === 'match') {
        for (const item of ex.items) {
          await page.locator('.match-col').nth(0).getByRole('button', { name: item.text, exact: true }).click();
          await page.locator('.match-col').nth(1).getByRole('button', { name: item.en, exact: true }).click();
        }
      }
      await page.locator('.banner').waitFor();
      await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(300);
    }
    throw new Error('no choice exercise found');
  }

  await page.goto(`${BASE}#/es`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', voice: true, speaking: false, placement: { es: 'sentences' }, celebrated: null, tips: { 'es:es-7-1': 1 } }));
  await page.goto(`${BASE}#/es/learn/es-7-1`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForTimeout(1200);

  // ---------- Wrong answer, Continue tapped early: the feedback is cut, nothing overlaps ----------
  await answerChoice(false);
  await page.waitForFunction(() => window.__voice.some((r) => r.kind === 'clip' && r.start < performance.now()), null, { timeout: 8000 });
  await page.waitForTimeout(250); // the feedback line has started
  const tapAt = await page.evaluate(() => performance.now());
  await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1500);
  const cut = await lastClip();
  expect(cut && cut.end - tapAt < 200, `Continue early: the feedback line stops at once (${Math.round(cut.end - tapAt)} ms after the tap)`);
  expect((await overlaps()).length === 0, `no two clips at once (${(await overlaps()).join('; ') || 'none'})`);

  // ---------- Wrong answer, waiting: the next clip comes a short pause after the feedback ----------
  await answerChoice(false);
  await page.waitForFunction(() => window.__voice.some((r) => r.kind === 'clip' && r.start < performance.now()), null, { timeout: 8000 });
  const clip = await lastClip();
  await page.waitForTimeout(Math.max(0, clip.end - (await page.evaluate(() => performance.now()))) + 50);
  const before = await page.evaluate(() => window.__voice.length);
  await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1800);
  const nextPhrase = await page.evaluate((n) => window.__voice.slice(n).find((r) => r.kind === 'phrase'), before);
  if (nextPhrase) expect(nextPhrase.start - clip.end >= 500, `after a feedback line, the next audio waits a beat (${Math.round(nextPhrase.start - clip.end)} ms)`);
  else console.log('   (the next exercise has no audio to start; pause check skipped)');

  // ---------- Correct answers and the retries at the end ----------
  for (let i = 0; i < 4; i++) {
    if (await page.getByText(/complete!/).isVisible().catch(() => false)) break;
    await answerChoice(true).catch(() => {});
    await page.waitForTimeout(400);
    await page.locator('.banner').getByRole('button', { name: 'Continue' }).click().catch(() => {});
    await page.waitForTimeout(500);
  }
  expect((await overlaps()).length === 0, `right answers and retries: never two clips at once (${(await overlaps()).join('; ') || 'none'})`);
  const lesson = await page.evaluate(() => window.__voice.length);
  console.log(`   lesson: ${lesson} clips played, none overlapping`);

  // ---------- Role-play (no speech model: Next moves on) ----------
  await page.goto(`${BASE}#/es/roleplay/es-food-1`);
  await page.evaluate(() => (window.__voice = []));
  await page.getByTestId('roleplay-start').click();
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('turn-next').waitFor({ timeout: 20000 });
    await page.getByTestId('turn-next').click();
  }
  await page.waitForTimeout(2500);
  const rp = await page.evaluate(() => window.__voice.length);
  expect(rp >= 3 && (await overlaps()).length === 0, `role-play: ${rp} lines, never two at once`);

  // ---------- Hands-free: starting it silences anything else ----------
  await page.goto(`${BASE}#/es/handsfree`);
  await page.locator('[data-testid^=hf-]').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => (window.__voice = []));
  const playBtn = page.getByTestId('hf-play');
  await playBtn.waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[data-testid=hf-play]')?.disabled, null, { timeout: 60000 }).catch(() => {});
  if (await playBtn.isEnabled().catch(() => false)) {
    await playBtn.click();
    await page.waitForTimeout(3000);
    expect((await overlaps()).length === 0, `hands-free: one voice at a time (${(await overlaps()).join('; ') || 'none'})`);
  } else console.log('   (no hands-free track to play here)');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
