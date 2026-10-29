// Plays through lessons in WebKit with iPhone emulation, answering via the real UI.
import { devices, editProgress, launch, run, skipDay1 } from './harness.mjs';

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
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      window.__media = this;
      return play.apply(this, a);
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
      const makeMistake = mistakeAt instanceof Set ? costly && mistakeAt.has(step) : mistakeAt === 'costly' ? costly && !log.some((l) => l.mistake) : step === mistakeAt;
      const ex = await answer(lang, makeMistake);
      const banner = page.locator('.banner');
      const cls = await banner.getAttribute('class');
      const text = (await banner.innerText()).replace(/\n+/g, ' | ');
      const title = (await banner.locator('.banner-title').innerText()).trim();
      types.push(ex.type);
      // The voice waits for the phrase audio to end, so wait for that, then for the voice to start.
      await page.waitForFunction(() => !window.__media || window.__media.paused || window.__media.ended, null, { timeout: 8000 });
      // A spoken line (wrong answers, streak cheers) starts only once the phrase has finished and
      // a short pause has passed, so wait for it to start rather than a fixed time.
      const voiceExpected = !cls.includes('ok') || /in a row/.test(text);
      if (voiceExpected) await page.waitForFunction(() => window.__sounds.length > 0, null, { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(900);
      const said = await spoken();
      log.push({ title, right: cls.includes('ok'), mistake: makeMistake, step, type: ex.type, cls, text, said, heartsBefore: beforeHearts, heartsAfter: await hearts().catch(() => NaN) });
      if (step === mistakeAt) await shot(`${label}-wrong`);
      if (/in a row/.test(text)) await shot(`${label}-streak`);
      if (ex.type === 'speak' && !(await shot(`${label}-speak`))) {}
      step++;
      await banner.getByRole('button', { name: 'Continue' }).click();
      if (await page.getByText(/complete!|Out of hearts/).isVisible().catch(() => false)) break;
      if (step > 70) throw new Error(`lesson never ended: ${log.map((l) => `${l.type}${l.right ? '' : '✗'}`).join(' ')}`);
    }
    return { types, log };
  }


  const cat = (name) => name.replace(/-\d+(-[\w-]+)?$/, ''); // "praise-3-AbC12" -> "praise"
  const all = [];
  async function lesson(lang, mistakes, label) {
    // Mistakes cost hearts; refill them so a run of planted mistakes can't end in "Out of hearts".
    await editProgress(page, (p) => ({ ...p, hearts: 5, heartsAt: Date.now() }));
    await page.locator('.lesson-node.current').click();
    await page.getByTestId('lesson-start').click();
    const r = await playLesson(lang, { mistakeAt: new Set(mistakes), label });
    await page.getByText(/complete!/).waitFor();
    if (label !== 'quiet') await page.waitForFunction(() => window.__sounds.length > 0, null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(600);
    const endSaid = await spoken();
    const cheer = await page.locator('.cheer').innerText();
    await shot(`${label}-complete`);
    await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600); // screen transition
    r.log.forEach((l, i) => (l.first = i === 0));
    all.push(...r.log);
    return { ...r, endSaid, cheer };
  }

  await page.goto(`${BASE}#/es`);
  await skipDay1(page, 'es', 'fr', 'zh'); // Day 1 is listen and repeat: nothing to praise or correct
  await page.locator('.lesson-node').first().waitFor();
  const runs = [];
  runs.push(await lesson('es', [], 'es1'));          // perfect
  runs.push(await lesson('es', [3, 8, 9], 'es2'));   // a few mistakes
  runs.push(await lesson('es', [6], 'es3'));
  await page.goto(`${BASE}#/fr`);
  runs.push(await lesson('fr', [4, 10], 'fr1'));
  await page.goto(`${BASE}#/zh`);
  runs.push(await lesson('zh', [5], 'zh1'));

  // Which clips played after each answer, and running streaks.
  let inARow = 0;
  let streakOk = true;
  for (const l of all) {
    if (l.first) inARow = 0; // each lesson starts a new streak
    inARow = l.right ? inARow + 1 : 0;
    const cats = l.said.map(cat);
    const milestone = inARow === 3 || inARow === 5 || (inARow >= 10 && inARow % 5 === 0);
    if (milestone !== cats.includes('streak')) streakOk = false;
    if (milestone !== /in a row/.test(l.text)) streakOk = false;
  }
  const rights = all.filter((l) => l.right);
  inARow = 0;
  for (const l of all) {
    if (l.first) inARow = 0; // each lesson starts a new streak
    inARow = l.right ? inARow + 1 : 0;
    const milestone = inARow === 3 || inARow === 5 || (inARow >= 10 && inARow % 5 === 0);
    if (milestone !== l.said.map(cat).includes('streak') || milestone !== /in a row/.test(l.text)) console.log('  streak mismatch', inARow, l.type, l.said, l.text);
  }
  for (const l of all.filter((x) => !x.right)) if (l.said.length !== 1) console.log('  wrong said', l.type, l.said, l.text);
  const wrongs = all.filter((l) => !l.right);
  const spokenOnRight = rights.filter((l) => l.said.length).length;
  console.log(`  ${all.length} answers: ${rights.length} right (${spokenOnRight} spoken), ${wrongs.length} wrong`);
  expect(spokenOnRight / rights.length < 0.5, `most right answers only chime (voice on ${spokenOnRight}/${rights.length})`);
  expect(rights.every((l) => l.said.every((n) => ['praise', 'streak'].includes(cat(n)))), 'right answers only ever say praise or streak lines');
  expect(streakOk, 'streak praise exactly at 3, 5, 10… in a row, with "🔥 N in a row!"');
  expect(wrongs.every((l) => l.said.length === 1 && cat(l.said[0]) === 'wrong'), 'every wrong answer gets a gentle spoken line');
  const wrongTitles = wrongs.map((l) => l.title);
  expect(new Set(wrongTitles).size >= Math.min(4, wrongTitles.length), `wrong-answer lines vary: ${[...new Set(wrongTitles)].join(' / ')}`);
  let repeats = 0;
  // Within a lesson (a new lesson starts after the celebration screen, so its first line may match).
  for (let i = 1; i < all.length; i++) if (!all[i].first && all[i].title === all[i - 1].title) repeats++, console.log('  same banner twice:', JSON.stringify(all[i - 1]).slice(0, 200), '→', JSON.stringify(all[i]).slice(0, 200));
  expect(repeats === 0, 'banner phrase never the same twice in a row');
  const saidSeq = all.flatMap((l) => l.said);
  const twice = saidSeq.findIndex((n, i) => i > 0 && n === saidSeq[i - 1]);
  if (twice > 0) console.log('  said twice in a row:', saidSeq[twice], 'at', twice, 'of', saidSeq.length);
  expect(saidSeq.every((n, i) => i === 0 || n !== saidSeq[i - 1]), 'spoken clip never the same twice in a row');
  const praiseTitles = new Set(rights.map((l) => l.title));
  console.log('  praise seen:', [...praiseTitles].join(' / '));
  expect(praiseTitles.size >= 15, `at least 15 different praise phrases seen (${praiseTitles.size})`);
  const english = rights.filter((l) => /^(Nice!|Great job!|Well done!|You got it!|Spot on!|You're on a roll!|Amazing streak!)$/.test(l.title)).length;
  expect(english > 0 && english / rights.length < 0.35, `mostly target language, a little English (${english}/${rights.length} English)`);
  const esTitles = runs.slice(0, 3).flatMap((r) => r.log.map((l) => l.title)).join(' ');
  expect(/¡/.test(esTitles) && /[一-鿿]/.test(runs[4].log.map((l) => l.title).join(' ')), 'Spanish lessons cheer in Spanish, Mandarin in Mandarin');
  expect(runs.every((r) => r.endSaid.length === 1 && ['complete', 'perfect'].includes(cat(r.endSaid[0]))), `lesson complete: a bigger spoken cheer (${runs.map((r) => r.cheer.split('\n')[0]).join(' / ')})`);
  expect(cat(runs[0].endSaid[0]) === 'perfect', 'perfect lesson gets the "no mistakes" cheer');

  // ---------- Voice off ----------
  await page.goto(`${BASE}#/settings`);
  const toggle = page.getByRole('checkbox', { name: /Spoken feedback/ });
  await shot('settings');
  await toggle.uncheck();
  await page.goto(`${BASE}#/es`);
  await page.evaluate(() => (window.__chimes = 0));
  const quiet = await lesson('es', [2, 3], 'quiet');
  expect(quiet.log.every((l) => l.said.length === 0) && quiet.endSaid.length === 0, 'spoken feedback off: no voice at all');
  expect((await page.evaluate(() => window.__chimes)) >= quiet.log.length * 2, 'spoken feedback off: chimes still play');
  expect(quiet.log.every((l) => l.title.length > 3), 'spoken feedback off: banner still shows the phrase');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  await browser.close();
});
