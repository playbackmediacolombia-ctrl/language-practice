// The logo moments: the app-start intro, and the celebration for big achievements only.
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const es = JSON.parse(readFileSync(new URL('../../shared/course/es.json', import.meta.url), 'utf8'));
const U1 = es.units[0].lessons.map((l) => l.id); // the first unit's lessons

let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return key(d);
};

await run(async () => {
  const browser = await launch();
  const open = async (options = {}) => {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', keepCelebrations: true, ...options });
    await context.addInitScript(() => {
      window.__osc = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...a) {
        window.__osc++;
        return start.apply(this, a);
      };
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    return page;
  };

  /** Answers every exercise right until "Lesson complete!". */
  async function playLesson(page) {
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (let step = 0; step < 50; step++) {
      if (await page.getByText('Lesson complete!').isVisible().catch(() => false)) return;
      const ex = await page.evaluate(() => window.__exercise);
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
      } else {
        throw new Error(`can't answer a ${ex.type} exercise`);
      }
      await page.locator('.banner').waitFor();
      await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(150);
    }
    await page.getByText('Lesson complete!').waitFor();
  }
  const overlay = (page) => page.locator('[data-testid=achievement]');
  /** Finishes the current lesson on the path, then taps Continue on "Lesson complete!". */
  async function finishCurrent(page) {
    await page.locator('.lesson-node.current').click();
    await page.getByTestId('lesson-start').click();
    await playLesson(page);
    await page.waitForTimeout(400);
    const duringComplete = await overlay(page).count();
    await page.evaluate(() => (window.__osc = 0));
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(900);
    return { duringComplete };
  }

  // ---------- App-start intro ----------
  {
    const page = await open();
    const t0 = Date.now();
    await page.goto(`${BASE}&intro#/`);
    const intro = await page.evaluate(() => ({
      shown: !!document.getElementById('intro') && !document.documentElement.classList.contains('no-intro'),
      anim: getComputedStyle(document.querySelector('#intro img')).animationName,
      blocks: getComputedStyle(document.getElementById('intro')).pointerEvents,
    }));
    await page.locator('#root > *').first().waitFor();
    const appReady = Date.now() - t0;
    expect(intro.shown && intro.anim.includes('intro-pop') && intro.anim.includes('intro-glow'), `intro: logo pops in with a glow (${intro.anim})`);
    expect(intro.blocks === 'none', 'intro: never blocks taps (pointer-events: none)');
    expect(appReady < 1500, `intro: app renders underneath right away (${appReady} ms, not after the intro)`);
    await page.screenshot({ path: 'G-intro.png' });
    await page.waitForTimeout(1700);
    expect((await page.locator('#intro').count()) === 0, 'intro: gone after about 1.5 s');
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains('no-intro')), 'intro: skipped when reopened within a few minutes');
    // Six minutes later it plays again.
    await page.goto(new URL('icons/favicon-32.png', BASE).href);
    await page.evaluate(() => localStorage.setItem('intro-last', String(Date.now() - 6 * 60 * 1000)));
    await page.goto(`${BASE}&intro#/`);
    expect(!(await page.evaluate(() => document.documentElement.classList.contains('no-intro'))), 'intro: plays again after a few minutes away');
    await page.context().close();
  }
  {
    const page = await open({ reducedMotion: 'reduce' });
    await page.goto(`${BASE}&intro#/`);
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('#intro img')).animationName);
    expect(anim === 'intro-fade', `intro with Reduce Motion: a simple fade (${anim})`);
    await page.context().close();
  }

  // ---------- Existing progress never sets off old celebrations ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p, unit) => {
      const days = {};
      for (let i = 0; i < 8; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = 20;
      }
      return { ...p, lang: 'es', days, xp: 160, lessons: Object.fromEntries(unit.map((id) => [`es:${id}`, 1])), celebrated: undefined };
    }, U1);
    await page.waitForTimeout(1200);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).celebrated ?? []);
    expect((await overlay(page).count()) === 0, 'update: a unit, a 7-day streak and a daily goal already earned show nothing');
    expect(saved.some((k) => k.startsWith('unit:es:')) && saved.some((k) => k.startsWith('streak:7:')) && saved.includes('goal:first'), `update: they're quietly marked as celebrated (${saved.length})`);
    await page.context().close();
  }

  // ---------- Finishing a unit: lesson complete as usual, then the logo ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/es`);
    // Every lesson of the first unit but the last done; the first daily goal was hit long ago.
    await editProgress(page, (p, done) => ({ ...p, lang: 'es', days: { '2000-01-01': 50 }, lessons: Object.fromEntries(done.map((id) => [`es:${id}`, 1])), celebrated: ['goal:first'] }), U1.slice(0, -1));
    await page.locator('.lesson-node.current').waitFor();
    const r = await finishCurrent(page);
    expect(r.duringComplete === 0, 'unit: the regular "Lesson complete!" screen comes first, unchanged');
    await overlay(page).waitFor({ timeout: 5000 }).catch(() => {});
    const cel = await page.evaluate(() => {
      const o = document.querySelector('[data-testid=achievement]');
      const img = o?.querySelector('.achievement-logo img');
      return o && { title: o.querySelector('h2').innerText, logo: img.complete && img.naturalWidth > 0, spin: getComputedStyle(img).animationName, confetti: o.querySelectorAll('.confetti span').length, notes: window.__osc };
    });
    expect(cel?.title === 'Unit complete!', `unit: then the logo celebration (${cel?.title})`);
    expect(cel?.logo && cel.spin === 'logo-spin', `unit: the logo spins in (${cel?.spin})`);
    expect(cel?.confetti >= 100, `unit: confetti burst (${cel?.confetti} pieces)`);
    expect(cel?.notes >= 8, `unit: its own short sound (${cel?.notes} notes, muted in tests)`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'G-unit.png' });
    await overlay(page).getByRole('button', { name: 'Continue' }).click();
    expect((await overlay(page).count()) === 0, 'unit: Continue closes it');
    await page.reload();
    await page.waitForTimeout(1500);
    expect((await overlay(page).count()) === 0, 'unit: shown only once (not again after reopening)');

    // The next lesson is a regular one: no logo.
    const r2 = await finishCurrent(page);
    expect(r2.duringComplete === 0 && (await overlay(page).count()) === 0, 'regular lesson: no logo celebration');
    await page.context().close();
  }

  // ---------- 7-day streak ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p, past) => ({ ...p, lang: 'es', days: Object.fromEntries(past.map((d) => [d, 5])), lessons: {}, celebrated: [] }), [1, 2, 3, 4, 5, 6].map(daysAgo));
    await page.waitForTimeout(800);
    expect((await overlay(page).count()) === 0, 'streak: 6 days is not a milestone');
    await finishCurrent(page);
    const title = await overlay(page).locator('h2').innerText().catch(() => null);
    expect(title === '7-day streak!', `streak: the 7th day gets the logo (${title})`);
    await page.screenshot({ path: 'G-streak.png' });
    await page.context().close();
  }

  // ---------- First daily goal ever ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p) => ({ ...p, lang: 'es', goal: 10, days: {}, lessons: {}, celebrated: [] }));
    await finishCurrent(page);
    const title = await overlay(page).locator('h2').innerText().catch(() => null);
    expect(title === 'Daily goal reached!', `goal: the first time ever (${title})`);
    await overlay(page).getByRole('button', { name: 'Continue' }).click();
    const r = await finishCurrent(page);
    void r;
    expect((await overlay(page).count()) === 0, 'goal: not again on later lessons or days');
    await page.context().close();
  }

  // ---------- Placement test result ----------
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await open({ reducedMotion });
    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p) => ({ ...p, lang: 'es', days: {}, lessons: {}, celebrated: [] }));
    await page.waitForTimeout(500);
    // What the placement test saves when it finishes (it then shows its result on the same screen).
    await editProgress(page, (p) => ({ ...p, placement: { es: 'words' } }));
    await overlay(page).waitFor({ timeout: 5000 }).catch(() => {});
    const cel = await page.evaluate(() => {
      const o = document.querySelector('[data-testid=achievement]');
      return o && { title: o.querySelector('h2').innerText, detail: o.querySelector('.achievement-detail').innerText, calm: o.classList.contains('calm'), confetti: o.querySelectorAll('.confetti span').length, anim: getComputedStyle(o.querySelector('.achievement-logo img')).animationName };
    });
    if (reducedMotion === 'reduce') {
      expect(cel?.calm && cel.confetti === 0 && cel.anim === 'achievement-in', `Reduce Motion: a simple fade, no spin or confetti (${cel?.anim})`);
      await page.screenshot({ path: 'G-calm.png' });
    } else {
      expect(cel?.title === 'Placement test passed!' && /First words/.test(cel.detail), `placement: ${cel?.title} ${cel?.detail}`);
      await page.screenshot({ path: 'G-placement.png' });
    }
    await page.context().close();
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
