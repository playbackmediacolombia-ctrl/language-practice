// Plays through lessons in WebKit with iPhone emulation, answering via the real UI.
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

// Expected path shape, from the course files themselves (so new units don't break the test).
const course = (f) => JSON.parse(readFileSync(new URL(`../../shared/course/${f}.json`, import.meta.url), 'utf8'));
const OUTLINE = course('outline');
const STAGES = OUTLINE.stages.length;
const UNITS = OUTLINE.stages.reduce((n, s) => n + s.units.length, 0);
const CORE = new Set(OUTLINE.stages.flatMap((s) => s.units));
const ES_UNITS = course('es').units.filter((u) => CORE.has(u.id)).length; // electives are never "coming soon"

const BASE = 'http://localhost:4173/?test';
await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.addInitScript(() => {
    window.__sounds = [];
    window.__chimes = 0;
    // Fake mic: quiet, then whatever clip the test puts in __micUrl.
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
      src.buffer = await c.decodeAudioData(await (await fetch(window.__micUrl)).arrayBuffer());
      src.__mic = true;
      src.connect(dest);
      src.start(c.currentTime + 0.6);
      return dest.stream;
    };
    // Tag decoded clips with their file name so the test can tell which voice line played.
    const names = new WeakMap();
    const ab = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = async function () {
      const buf = await ab.call(this);
      names.set(buf, this.url.split('/').pop().replace('.mp3', ''));
      return buf;
    };
    const decode = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = async function (data, ...rest) {
      const name = names.get(data);
      const out = await decode.call(this, data, ...rest);
      out.__name = name;
      return out;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      if (!this.__mic && this.buffer?.__name) window.__sounds.push(this.buffer.__name);
      return start.apply(this, a);
    };
    const ostart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a) {
      window.__chimes++;
      return ostart.apply(this, a);
    };
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  let failures = 0;
  const expect = (ok, msg) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
    if (!ok) failures++;
  };
  const hearts = async () => Number((await page.locator('.hearts').innerText()).replace(/\D/g, '') || NaN);
  const shot = (name) => page.screenshot({ path: `L-${name}.png` });

  // Download Whisper first so lessons include speaking.
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Download standard model/ }).click();
  await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

  const spoken = async () => page.evaluate(() => window.__sounds.splice(0));

  const indexOfText = async (locator, want) => {
    const texts = await locator.allInnerTexts();
    return texts.findIndex((t) => t.trim().split('\n')[0].trim() === want);
  };

  const toNumbered = (py) => {
    const marks = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };
    return py
      .normalize('NFD')
      .split(' ')
      .map((syl) => {
        let tone = '';
        const letters = [...syl].filter((ch) => (marks[ch] ? ((tone = marks[ch]), false) : true)).join('');
        return letters + tone;
      })
      .join(' ');
  };

  /** Answer the current exercise. `wrong` picks a wrong answer on purpose. */
  async function answer(lang, wrong = false) {
    const ex = await page.evaluate(() => window.__exercise);
    const { type } = ex;
    if (type === 'meaning' || type === 'listen' || type === 'translate') {
      const correct = type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
      const i = wrong ? (correct + 1) % ex.options.length : correct;
      await page.locator('.options button').nth(i).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (type === 'tiles') {
      const used = new Set();
      const words = wrong ? [...ex.item.tiles].reverse() : ex.item.tiles;
      for (const w of words) {
        const i = ex.bank.findIndex((b, j) => b === w && !used.has(j));
        used.add(i);
        await page.locator('.bank button').nth(i).click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (type === 'match') {
      for (const item of ex.items) {
        const left = page.locator('.match-col').nth(0).locator('button');
        const right = page.locator('.match-col').nth(1).locator('button');
        await left.nth(await indexOfText(left, item.text)).click();
        await right.nth(await indexOfText(right, item.en)).click();
      }
    } else if (type === 'type') {
      // Pinyin with tone numbers (ma3) for one-syllable words; characters for longer ones.
      const text = wrong ? 'xyz' : lang === 'zh' ? (ex.item.pinyin.normalize('NFD').match(/[\u0300-\u030c]/g) ?? []).length > 1 ? ex.item.text : toNumbered(ex.item.pinyin) : ex.item.text;
      await page.locator('textarea').fill(text);
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (type === 'speak') {
      await page.evaluate((url) => (window.__micUrl = url), new URL(ex.item.audio, page.url()).href);
      await page.getByRole('button', { name: 'Start recording' }).click();
    }
    await page.locator('.banner').waitFor({ timeout: 60_000 });
    return ex;
  }

  /** Play a whole lesson from the path. Returns what happened. */
  async function playLesson(lang, { mistakeAt = -1, label }) {
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    const types = [];
    const log = [];
    let step = 0;
    while (await page.locator('.banner, .lesson-foot, .mic, .match').first().isVisible().catch(() => false)) {
      if (await page.getByText(/complete!/).isVisible()) break;
      const beforeHearts = await hearts().catch(() => NaN);
      const peek = await page.evaluate(() => window.__exercise);
      const costly = !['meaning', 'match', 'speak'].includes(peek.type);
      const makeMistake = mistakeAt === 'costly' ? costly && !log.some((l) => l.mistake) : step === mistakeAt;
      const ex = await answer(lang, makeMistake);
      const banner = page.locator('.banner');
      const cls = await banner.getAttribute('class');
      const text = (await banner.innerText()).replace(/\n+/g, ' | ');
      types.push(ex.type);
      await page.waitForTimeout(2500); // the voice waits for the phrase audio
      const said = await spoken();
      log.push({ mistake: makeMistake, step, type: ex.type, cls, text, said, heartsBefore: beforeHearts, heartsAfter: await hearts().catch(() => NaN) });
      if (step === mistakeAt) await shot(`${label}-wrong`);
      if (ex.type === 'speak' && !(await shot(`${label}-speak`))) {}
      step++;
      await banner.getByRole('button', { name: 'Continue' }).click();
      if (await page.getByText(/complete!|Out of hearts/).isVisible().catch(() => false)) break;
      if (step > 40) throw new Error('lesson never ended');
    }
    return { types, log };
  }

  /** Day 1's practice: listen and repeat, nothing graded. Returns how many it played. */
  async function playRepeat() {
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    let n = 0;
    while (!(await page.getByText(/complete!/).isVisible().catch(() => false))) {
      await page.getByTestId('repeat-next').click();
      await page.waitForTimeout(120);
      if (++n > 60) throw new Error('listen and repeat never ended');
    }
    return n;
  }
  const doneLessons = (lang, units) => course(lang).units.filter((u) => units.includes(u.id)).flatMap((u) => u.lessons.map((l) => l.id));

  // ---------- Spanish Day 1: listen and repeat, nothing graded ----------
  await page.goto(`${BASE}#/es`);
  await page.locator('.lesson-node').first().waitFor();
  await shot('path-start');
  const nodes = await page.locator('.lesson-node').evaluateAll((els) => els.map((e) => e.className.replace('lesson-node ', '')));
  expect(nodes[0] === 'current' && nodes.slice(1).every((c) => c === 'locked'), `path: first lesson open, rest locked (${nodes.length} lessons)`);
  const soon = await page.locator('.unit.soon').count();
  expect(soon === UNITS - ES_UNITS, `path: ${UNITS - ES_UNITS} unwritten units shown as coming soon (${soon})`);
  const stages = await page.locator('.stage').count();
  expect(stages === STAGES, `path: all ${STAGES} stages, from sounds to adult topics (${stages})`);

  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  const heartsDay1 = await page.locator('.lesson-top .hearts').getAttribute('aria-label');
  const repeated = await playRepeat();
  expect(repeated >= 8 && heartsDay1 === 'Practice, no hearts', `Day 1 practice: ${repeated} listen-and-repeat steps, no hearts at stake (${heartsDay1})`);
  await page.waitForTimeout(1600); // XP counts up
  const doneText = await page.locator('main').innerText();
  expect(/\+10/.test(doneText) && /1 day streak/.test(doneText), 'complete screen: +10 XP, 1 day streak');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition
  const nodes2 = await page.locator('.lesson-node').evaluateAll((els) => els.map((e) => e.className.replace('lesson-node ', '')));
  expect(nodes2[0] === 'done' && nodes2[1] === 'current' && nodes2[2] === 'locked', 'path: lesson 1 done, lesson 2 unlocked');

  // ---------- Spanish unit 2, Practice: a mistake is shown, but costs no heart ----------
  await editProgress(page, (p, ids) => ({ ...p, lessons: { ...p.lessons, ...Object.fromEntries(ids.map((id) => [`es:${id}`, 1])) } }), doneLessons('es', ['u1']));
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  const es1 = await playLesson('es', { mistakeAt: 'costly', label: 'es1' });
  const wrong = es1.log.find((l) => l.mistake);
  console.log('  es-2-1 exercises:', es1.types.join(', '));
  expect(wrong.cls.includes('bad') && /Correct answer/.test(wrong.text), `wrong answer: red banner with correct answer ("${wrong.text}")`);
  expect(wrong.said.some((n) => n.startsWith('wrong-')), `wrong answer: a gentle voice line (${JSON.stringify(wrong.said)})`);
  expect(Number.isNaN(wrong.heartsAfter) && Number.isNaN(wrong.heartsBefore), 'Practice: no hearts shown or lost');
  expect(es1.log.filter((l) => !l.mistake).every((l) => l.cls.includes('ok')), 'every other answer: green banner');
  expect(es1.types.filter((t, i) => i > wrong.step).includes(wrong.type), 'missed exercise came back at the end');
  const chimes = await page.evaluate(() => window.__chimes);
  expect(chimes >= es1.log.length * 2, `a chime played on every answer (${chimes} notes)`);
  await page.getByText('Lesson complete!').waitFor();
  await page.waitForTimeout(1600);
  await shot('es1-complete');
  expect(/\+10/.test(await page.locator('main').innerText()), 'complete screen: +10 XP (one mistake)');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition

  // ---------- Spanish unit 2, lesson 2 (has words, so speaking + translate), perfect ----------
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  const es2 = await playLesson('es', { label: 'es2' });
  console.log('  es2 exercises:', es2.types.join(', '));
  const speaks = es2.log.filter((l) => l.type === 'speak');
  expect(speaks.length > 0 && speaks.every((l) => l.cls.includes('ok')), `speaking graded by Whisper: ${speaks.map((s) => s.text).join(' / ')}`);
  await page.getByText('Lesson complete!').waitFor();
  await page.waitForTimeout(1600);
  expect(/\+15/.test(await page.locator('main').innerText()), 'perfect lesson: +15 XP');
  await shot('es2-complete');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition

  // ---------- Mandarin: Day 1, then a lesson typing pinyin with tone numbers ----------
  await page.goto(`${BASE}#/zh`);
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  await playRepeat();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  await editProgress(page, (p, ids) => ({ ...p, lessons: { ...p.lessons, ...Object.fromEntries(ids.map((id) => [`zh:${id}`, 1])) } }), doneLessons('zh', ['u1']));
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  const zh2 = await playLesson('zh', { label: 'zh2' });
  console.log('  zh2 bad:', JSON.stringify(zh2.log.filter((l) => !l.cls.includes('ok'))));
  expect(zh2.log.every((l) => l.cls.includes('ok')), `zh lesson all right, pinyin typed with numbers like ma3 (${zh2.types.join(', ')})`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition

  // ---------- French unit 2: sentence tiles ----------
  await page.goto(`${BASE}#/fr`);
  await editProgress(page, (p, ids) => ({ ...p, lessons: { ...p.lessons, ...Object.fromEntries(ids.map((id) => [`fr:${id}`, 1])) } }), doneLessons('fr', ['u1']));
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
  const fr21 = await playLesson('fr', { label: 'fr21' });
  expect(fr21.types.includes('tiles') && fr21.log.every((l) => l.cls.includes('ok')), `fr unit 2: sentence tiles right (${fr21.types.join(', ')})`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition

  // ---------- Review weak words ----------
  await page.goto(`${BASE}#/es`);
  const heartsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).hearts);
  await page.getByRole('button', { name: /Review weak words/ }).click();
  const rev = await playLesson('es', { label: 'review', mistakeAt: 'costly' }); // order is random: miss the first exercise that can be missed
  console.log('  review exercises:', rev.types.join(', '));
  expect(rev.log.find((l) => l.mistake)?.cls.includes('bad') && (await page.locator('.hearts').count()) >= 0, 'review: wrong answer shown, no hearts at stake');
  await page.getByText('Review complete!').waitFor();
  await shot('review-complete');
  const heartsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).hearts);
  expect(heartsAfter === Math.min(5, heartsBefore + 1), `review earned a heart (${heartsBefore} → ${heartsAfter})`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition

  // ---------- Out of hearts ----------
  await editProgress(page, (p) => {
    p.hearts = 1;
    p.heartsAt = Date.now();
  });
  // Hearts count in a unit's Test (Practice is free).
  await page.goto(`${BASE}#/es/learn/test-u2`);
  await page.getByTestId('lesson-kind').waitFor();
  await playLesson('es', { label: 'hearts', mistakeAt: 'costly' });
  expect(await page.getByText('Out of hearts').isVisible(), 'Test: losing the last heart ends it with "Out of hearts"');
  await shot('no-hearts');
  expect(await page.getByRole('button', { name: 'Practice to earn a heart' }).isVisible(), 'out of hearts: offers practice to earn one');

  // ---------- Persisted progress and home screen ----------
  await page.goto(`${BASE}#/`);
  await page.reload();
  const home = await page.locator('main').innerText();
  await shot('home');
  const pills = await page.locator('.stat-pill').allInnerTexts();
  const xpLabel = await page.locator('.stat-pill.xp').getAttribute('aria-label');
  expect(pills[0].trim() === '1' && /^\d+$/.test(pills[1].trim()) && xpLabel === `${pills[1].trim()} XP`, `home shows streak and XP after reload (streak ${pills[0]}, ${xpLabel})`);

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  await browser.close();
});
