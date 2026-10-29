// Teach before testing: Day 1, a unit's Class → Practice → Test, "Words you'll need" before a
// role-play, the Notebook, skipping a Class you tested out of, and old progress left as it was.
// Usage: npm run test:e2e -- classes  (pictures in e2e/out/classes/)
import { mkdirSync, readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const DIR = new URL('./out/classes/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const course = (lang) => JSON.parse(readFileSync(new URL(`../../shared/course/${lang}.json`, import.meta.url), 'utf8'));
const lessonsOf = (lang, units) => course(lang).units.filter((u) => units.includes(u.id)).flatMap((u) => u.lessons.map((l) => l.id));

let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const open = async (options = {}) => {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', classes: 'fresh', ...options });
    const page = await context.newPage();
    page.on('pageerror', (e) => {
      console.log('PAGE ERROR', e.message);
      failures++;
    });
    return page;
  };
  const shot = async (page, name) => {
    await page.waitForTimeout(900); // let slides and count-ups settle
    await page.screenshot({ path: `${DIR}${name}.png` });
  };
  const step = (page) => page.evaluate(() => window.__classStep);
  const next = async (page) => {
    await page.getByTestId('class-next').click();
    await page.waitForTimeout(250);
  };

  /** Answers every exercise right (listen-and-repeat just goes on) until the lesson or test is done. */
  async function playLesson(page) {
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (let n = 0; n < 80; n++) {
      if (await page.getByText(/Lesson complete!|Test complete!/).isVisible().catch(() => false)) return;
      const ex = await page.evaluate(() => window.__exercise);
      if (ex.type === 'repeat') {
        await page.getByTestId('repeat-next').click();
        await page.waitForTimeout(120);
        continue;
      }
      if (ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'translate') {
        const i = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
        await page.locator('.options button').nth(i).click();
        await page.getByRole('button', { name: 'Check' }).click();
      } else if (ex.type === 'tiles') {
        const used = new Set();
        for (const w of ex.item.tiles) {
          const i = ex.bank.findIndex((b, j) => b === w && !used.has(j));
          used.add(i);
          await page.locator('.bank button').nth(i).click();
        }
        await page.getByRole('button', { name: 'Check' }).click();
      } else if (ex.type === 'match') {
        for (const item of ex.items) {
          for (const [col, want] of [[0, item.text], [1, item.en]]) {
            const b = page.locator('.match-col').nth(col).locator('button');
            const texts = await b.allInnerTexts();
            await b.nth(texts.findIndex((t) => t.split('\n')[0].trim() === want)).click();
          }
        }
      } else if (ex.type === 'type') {
        await page.locator('textarea').fill(ex.item.text);
        await page.getByRole('button', { name: 'Check' }).click();
      } else throw new Error(`can't answer a ${ex.type} exercise`);
      await page.locator('.banner').waitFor();
      await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(120);
    }
    await page.getByText(/Lesson complete!|Test complete!/).waitFor();
  }

  // ---------- Chinese, Day 1: a true first class ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'zh', levelStart: { zh: 'sounds' }, celebrated: null }));
    await page.goto(`${BASE}#/zh`);
    await page.getByTestId('class-node').first().waitFor();
    const path = await page.evaluate(() => ({
      cls: document.querySelector('[data-testid=class-node]')?.dataset.state,
      firstLesson: document.querySelector('.lesson-node:not(.class-node)')?.className,
      strip: [...document.querySelector('[data-testid=step-strip]').querySelectorAll('.step-chip')].map((c) => c.textContent.trim()),
    }));
    expect(path.cls === 'current', `path: Day 1's Class is the first thing to do (${path.cls})`);
    expect(/locked/.test(path.firstLesson), `path: its practice waits for the Class (${path.firstLesson})`);
    expect(path.strip[0].includes('Day 1 class') && path.strip.length === 2, `path: unit 1 shows Day 1 class → Listen & repeat, no test (${path.strip.join(' | ')})`);
    await page.locator('[data-testid=class-node]').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot(page, 'zh-0-path');
    await page.getByTestId('class-node').first().click();
    await page.getByTestId('class').waitFor();
    const seen = [];
    for (let i = 0; i < 60; i++) {
      const s = await step(page);
      const title = await page.evaluate(() => document.querySelector('.class-title')?.textContent ?? '');
      seen.push(title || s.kind);
      const info = await page.evaluate(() => ({
        teacher: !!document.querySelector('[data-testid=char-stage] svg'),
        bird: !!document.querySelector('.class-bird'),
        says: document.querySelector('[data-testid=teacher-says]')?.innerText ?? '',
        graded: !!document.querySelector('.options, .bank, textarea'),
        hearts: document.querySelector('.hearts')?.getAttribute('aria-label'),
        pitch: document.querySelector('[data-testid=tone-pitch]')?.dataset.tone,
      }));
      if (i === 0) {
        expect(info.teacher && info.bird, 'Day 1: the Open Peeps teacher and the bird mascot are there');
        expect(info.hearts === 'Practice, no hearts' && !info.graded, `Day 1: nothing graded, no hearts (${info.hearts})`);
        await shot(page, 'zh-1-welcome');
      }
      if (title === 'What is pinyin?') await shot(page, 'zh-2-pinyin');
      if (info.pitch) expect(true, `Day 1: ${title} has its pitch chart (tone ${info.pitch})`);
      if (title === 'Tone 1: high and flat') await shot(page, 'zh-3-tone1');
      if (title === 'Tone 3: dips low') await shot(page, 'zh-4-tone3');
      if (title === 'The neutral tone') await shot(page, 'zh-5-neutral');
      if (title === 'How characters work') await shot(page, 'zh-6-characters');
      if (title === 'Your first greeting') {
        expect(info.says.includes('nǐ hǎo') && (await page.getByTestId('say-it').count()) === 1, 'Day 1: first greeting, listen and repeat');
        await shot(page, 'zh-7-greeting');
      }
      if (s.kind === 'word' && !seen.includes('word-shot')) {
        seen.push('word-shot');
        const w = await page.evaluate(() => ({ pinyin: document.querySelector('[data-testid=class-pinyin]')?.innerText, tips: document.querySelector('[data-testid=class-tips]')?.innerText }));
        expect(!!w.pinyin && /tone/.test(w.tips ?? ''), `Day 1 words: pinyin and its tones (${w.pinyin} · ${w.tips?.replace(/\s+/g, ' ')})`);
        await shot(page, 'zh-8-word');
      }
      if (s.kind === 'done') break;
      await next(page);
    }
    for (const t of ['Welcome', 'What is pinyin?', 'Tone 1: high and flat', 'Tone 2: rising', 'Tone 3: dips low', 'Tone 4: falling', 'The neutral tone', 'How characters work', 'Your first greeting'])
      expect(seen.includes(t), `Day 1 covers: ${t}`);
    await shot(page, 'zh-9-done');
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(p.classes['zh:u1'] > 0, 'Day 1: the Class is saved as taken');
    // Day 1 practice: listen and repeat only.
    await page.getByTestId('class-start-practice').click();
    await page.getByTestId('lesson-kind').waitFor();
    expect((await page.getByTestId('lesson-kind').innerText()).toLowerCase().includes('listen and repeat'), 'Day 1 practice: listen and repeat');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByTestId('repeat-card').waitFor();
    expect((await page.locator('.options, .bank, textarea').count()) === 0, 'Day 1 practice: no questions to get wrong');
    await shot(page, 'zh-10-repeat');
    await page.context().close();
  }

  // ---------- Spanish, one whole unit: Class → Practice → Test (unit 4: I want, I have, I like) ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/`);
    const before = lessonsOf('es', ['u1', 'u2', 'u3']);
    await editProgress(page, (p, done) => ({ ...p, lang: 'es', xp: 340, levelStart: { es: 'sounds' }, lessons: Object.fromEntries(done.map((id) => [`es:${id}`, 1])), celebrated: null }), before);
    await page.goto(`${BASE}#/es`);
    await page.waitForTimeout(800);
    const u4 = page.locator('.card.unit[data-unit=u4]');
    const st = await u4.evaluate((el) => ({ cls: el.querySelector('[data-testid=class-node]').dataset.state, test: el.querySelector('[data-testid=test-node]').dataset.state, lesson: el.querySelector('.lesson-node:not(.class-node)').className }));
    expect(st.cls === 'current' && st.test === 'locked' && /locked/.test(st.lesson), `unit 4: Class first; Practice and Test wait for it (${JSON.stringify(st)})`);
    const done3 = await page.locator('.card.unit[data-unit=u3] [data-testid=class-node]').getAttribute('data-state');
    expect(done3 === 'done', `old progress: units already practiced count their Class as taken (${done3})`);
    await u4.scrollIntoViewIfNeeded();
    await shot(page, 'es-1-path-class');
    await u4.getByTestId('class-node').click();
    await page.getByTestId('class').waitFor();
    await shot(page, 'es-2-class-intro');
    let words = 0, rules = 0, why = 0, examples = 0, extras = 0;
    for (let i = 0; i < 80; i++) {
      const s = await step(page);
      if (s.kind === 'word') {
        words++;
        if (await page.getByTestId('class-example').count()) {
          examples++;
          if (examples === 1) await shot(page, 'es-3-class-word');
        }
      }
      if (s.kind === 'rule') {
        rules++;
        why += await page.getByTestId('class-why').count();
        if (rules === 1) await shot(page, 'es-4-class-rule');
      }
      if (s.kind === 'line' || s.kind === 'extra') {
        extras++;
        if (s.kind === 'line' && extras <= 2) await shot(page, 'es-5-class-roleplay-line');
      }
      if (s.kind === 'done') break;
      await next(page);
    }
    expect(words === 18, `Class: every word and phrase of the unit, one at a time (${words})`);
    expect(examples > 0, `Class: words come with an example sentence (${examples})`);
    expect(rules >= 1 && why === rules, `Class: rule cards, each with "why it works this way" (${rules})`);
    expect(extras > 1, `Class: the role-play's new lines are taught too (${extras} steps)`);
    await shot(page, 'es-6-class-done');
    // Replay and back work.
    await page.getByTestId('class-replay').click();
    await page.getByTestId('class-start-practice').click();
    // Practice: gentle.
    await page.getByTestId('lesson-kind').waitFor();
    const kind = await page.getByTestId('lesson-kind').innerText();
    const hearts = await page.locator('.hearts').getAttribute('aria-label');
    expect(/practice/i.test(kind) && hearts === 'Practice, no hearts', `Practice: no hearts lost (${kind} · ${hearts})`);
    await shot(page, 'es-7-practice-start');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.waitForTimeout(600);
    expect((await page.getByTestId('hint-coach').count()) === 1, 'Practice: the hint button is always there');
    await shot(page, 'es-8-practice-exercise');
    await page.getByLabel('Quit lesson').click();
    page.once('dialog', (d) => d.accept());
    await page.goto(`${BASE}#/es`);
    await page.waitForTimeout(800);
    const after = await u4.evaluate((el) => ({ cls: el.querySelector('[data-testid=class-node]').dataset.state, test: el.querySelector('[data-testid=test-node]').dataset.state, lesson: el.querySelector('.lesson-node:not(.class-node)').className }));
    expect(after.cls === 'done' && after.test === 'open' && /current/.test(after.lesson), `after the Class: Practice and Test open (${JSON.stringify(after)})`);
    await u4.scrollIntoViewIfNeeded();
    await shot(page, 'es-9-path-after-class');
    // Test: graded, then the role-play with "Words you'll need".
    await u4.getByTestId('test-node').click();
    await page.getByTestId('lesson-kind').waitFor();
    const tHearts = await page.locator('.hearts').getAttribute('aria-label');
    expect(/test/i.test(await page.getByTestId('lesson-kind').innerText()) && /\d hearts/.test(tHearts), `Test: graded, hearts count (${tHearts})`);
    await shot(page, 'es-10-test-start');
    await playLesson(page);
    await page.getByTestId('test-roleplays').waitFor();
    await shot(page, 'es-11-test-done');
    const pr = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(pr.tests['es:u4'] === 1, `Test: score saved (${pr.tests['es:u4']})`);
    await page.getByTestId('test-roleplays').getByRole('button').first().click();
    await page.getByTestId('words-youll-need').waitFor();
    const need = await page.getByTestId('need-line').count();
    expect(need >= 3, `role-play: "Words you'll need" first, with audio (${need} lines)`);
    await shot(page, 'es-12-words-youll-need');
    await page.getByTestId('need-ready').click();
    await page.waitForTimeout(800);
    expect((await page.getByTestId('words-youll-need').count()) === 0, "role-play: I'm ready goes on to it");
    await shot(page, 'es-13-roleplay');
    // Later role-plays wait for their Class.
    await page.goto(`${BASE}#/es/roleplay`);
    await page.waitForTimeout(600);
    const gates = await page.evaluate(() => [...document.querySelectorAll('[data-testid^=roleplay-]')].map((b) => [b.dataset.testid, b.dataset.open]));
    const openOnes = gates.filter(([, o]) => o === 'true').map(([t]) => t);
    expect(openOnes.includes('roleplay-es-food-1') && gates.some(([, o]) => o === 'false'), `role-plays: open once their Class is taken, the rest wait (${openOnes.join(', ')})`);
    await page.goto(`${BASE}#/es/roleplay/es-doctor-2`);
    await page.getByTestId('taught-first-locked').waitFor();
    expect(true, 'role-play before its Class: says which Class teaches it');
    // The Notebook.
    await page.goto(`${BASE}#/es/notebook`);
    await page.getByTestId('notebook-unit').first().waitFor();
    const nb = await page.evaluate(() => ({ units: [...document.querySelectorAll('[data-testid=notebook-unit]')].map((u) => u.dataset.unit), rules: document.querySelectorAll('[data-testid=notebook-rule]').length }));
    expect(nb.units.join() === 'u1,u2,u3,u4' && nb.rules >= 5, `Notebook: every Class taken, with its rules (${nb.units.join()} · ${nb.rules} rules)`);
    await page.locator('[data-testid=notebook-unit][data-unit=u4] summary').first().click();
    await page.locator('[data-testid=notebook-unit][data-unit=u4]').scrollIntoViewIfNeeded();
    await shot(page, 'es-14-notebook');
    await page.getByLabel('Find a word or rule').fill('quiero');
    await page.waitForTimeout(300);
    const found = await page.getByTestId('notebook-word').allInnerTexts();
    expect(found.length > 0 && found.every((t) => /quiero/i.test(t)), `Notebook: search (${found.length} found)`);
    await shot(page, 'es-15-notebook-search');
    const xp = (await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')))).xp;
    expect(xp > 340, `XP kept and added to (${xp})`);
    await page.context().close();
  }

  // ---------- Tested in: the Class is there, with "I know this, skip to practice" ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'fr', placement: { fr: 'sentences' }, celebrated: null }));
    await page.goto(`${BASE}#/fr`);
    await page.waitForTimeout(800);
    const u2 = page.locator('.card.unit[data-unit=u2]');
    expect((await u2.getByTestId('class-node').getAttribute('data-state')) === 'open', 'placed: lower units keep their Class, open');
    await u2.getByTestId('class-node').click();
    await page.getByTestId('class-skip').waitFor();
    await shot(page, 'fr-skip');
    await page.getByTestId('class-skip').click();
    await page.getByTestId('lesson-kind').waitFor();
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(p.classes['fr:u2'] < 0, 'placed: skipping goes straight to practice, and is remembered');
    await page.context().close();
  }

  // ---------- Old progress: nothing reset ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/`);
    const done = [...lessonsOf('it', ['u1', 'u2', 'u3']), 'it-4-1'];
    await editProgress(page, (p, d) => ({ ...p, lang: 'it', xp: 1234, levelStart: { it: 'sounds' }, lessons: Object.fromEntries(d.map((id) => [`it:${id}`, 2])), celebrated: null }), done);
    await page.goto(`${BASE}#/it`);
    await page.waitForTimeout(800);
    const cur = await page.evaluate(() => document.querySelector('.lesson-node.current')?.dataset.lesson);
    expect(cur === 'it-4-2', `old progress: the next lesson is still the next lesson (${cur})`);
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(p.xp === 1234 && Object.keys(p.lessons).length === done.length, 'old progress: XP and finished lessons untouched');
    await page.context().close();
  }

  // ---------- Dark mode: a Class ----------
  {
    const page = await open({ colorScheme: 'dark' });
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'es', levelStart: { es: 'sounds' }, celebrated: null }));
    await page.goto(`${BASE}#/es/class/u1`);
    await page.getByTestId('class').waitFor();
    await next(page);
    await page.getByTestId('class-letters').waitFor();
    expect((await page.locator('.class-letter').count()) === 27, 'Spanish Day 1: the alphabet, 27 letters to tap and hear');
    await shot(page, 'es-day1-alphabet-dark');
    await page.context().close();
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
