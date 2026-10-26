// Pick your level: start at any level, everything below unlocks, change it any time from the
// path or Settings, and XP, streak and finished lessons are never touched.
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const day = (ago) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', keepCelebrations: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const state = (id) => page.locator(`[data-lesson="${id}"]`).getAttribute('class').then((c) => c.replace('lesson-node ', ''));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));

  // Someone with XP and a streak from another language, starting Spanish fresh.
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p, a) => ({ ...p, lang: 'es', xp: 777, days: Object.fromEntries(a.map((d) => [d, 20])), lessons: { 'fr:fr-1-1': 2 }, celebrated: null }), [day(0), day(1), day(2)]);
  await page.goto(`${BASE}#/es`);
  await page.getByTestId('level-start').waitFor();
  const tiles = await page.locator('.level-tile .level-tile-name').allInnerTexts();
  const cefr = await page.locator('.level-cefr').allInnerTexts();
  expect(tiles.join() === 'Beginner,Elementary,Intermediate,Upper-intermediate,Advanced,Fluent', `new language: six big level tiles (${tiles.join(', ')})`);
  expect(cefr.join() === 'A1,A2,B1,B2,C1,C2', `each with its band (${cefr.join(' ')})`);
  expect(/Not sure\? Take a quick test/.test(await page.getByTestId('placement-card').innerText()), 'the placement test is there as an option');
  await page.screenshot({ path: 'L-start.png' });
  await page.getByTestId('level-start').screenshot({ path: 'L-tiles.png' });

  // ---------- Start at Intermediate ----------
  await page.getByTestId('level-pick-reading').click();
  await page.waitForTimeout(800);
  expect((await state('es-10-1')) === 'current', 'Intermediate: your next lesson is its first one');
  const below = await page.locator('.lesson-node').evaluateAll((els) => {
    const i = els.findIndex((e) => e.dataset.lesson === 'es-10-1');
    return els.slice(0, i).filter((e) => e.classList.contains('locked') && !e.closest('.tone-cream')).length;
  });
  expect(below === 0, `everything below Intermediate is unlocked (${below} locked)`);
  expect((await state('es-11-1')) === 'locked', 'lessons after it unlock as you go');
  expect((await page.getByTestId('achievement').count()) === 0, 'no "placement test passed" celebration for a level you picked');
  let p = await saved();
  expect(p.xp === 777 && Object.keys(p.days).length === 3 && p.lessons['fr:fr-1-1'] === 2, 'XP, streak and other lessons untouched');
  expect(/Intermediate/.test(await page.getByTestId('level-change').innerText()), `the path shows your level (${(await page.getByTestId('level-change').innerText()).replace(/\n/g, ' ')})`);
  await page.screenshot({ path: 'L-picked.png' });

  // Finish a lesson there, then go back down to Beginner.
  await editProgress(page, (q) => ({ ...q, lessons: { ...q.lessons, 'es:es-10-1': 1 } }));
  await page.getByTestId('level-change').click();
  await page.locator('.level-tile.here').waitFor();
  expect(/Intermediate/.test(await page.locator('.level-tile.here').innerText()), "Change level: your level is marked You're here");
  await page.screenshot({ path: 'L-change.png', fullPage: true });
  await page.getByTestId('level-pick-sounds').click();
  await page.waitForTimeout(800);
  expect((await state('es-1-1')) === 'current', 'Beginner: back to the very first lesson');
  expect((await state('es-10-1')) === 'done', 'a lesson you finished stays finished');
  expect((await state('es-9-1')) === 'open', 'and nothing you had unlocked is locked again');
  p = await saved();
  expect(p.xp === 777 && Object.keys(p.days).length === 3, 'XP and streak still untouched');

  // ---------- Jump to Fluent ----------
  await page.getByTestId('level-change').click();
  await page.getByTestId('level-pick-fluent').click();
  await page.waitForTimeout(800);
  expect((await state('es-18-1')) === 'current', 'Fluent: starts at its first lesson');
  expect((await page.locator('.card.unit', { hasText: 'Love, couples & family' }).locator('.lesson-node.open').count()) === 2, "Fluent's extra topic opens too");

  // ---------- From Settings ----------
  await page.goto(`${BASE}#/settings`);
  const row = await page.getByTestId('settings-level-es').innerText();
  expect(/Fluent/.test(row), `Settings › Your level shows it (${row.replace(/\n/g, ' ')})`);
  expect(/Not started/.test(await page.getByTestId('settings-level-zh').innerText()), 'a language not started says so');
  await page.getByTestId('settings-level-es').click();
  await page.getByTestId('level-test').waitFor();
  await page.getByTestId('level-test').click();
  await page.waitForTimeout(600);
  expect(/#\/es\/placement$/.test(page.url()), 'Not sure? opens the placement test');

  // The placement test still sets the level when it's used.
  await page.goto(`${BASE}#/es`);
  await editProgress(page, (q) => {
    const { es, ...rest } = q.levelStart;
    return { ...q, placement: { ...q.placement, es: 'conversation' }, levelStart: rest };
  });
  await page.goto(`${BASE}#/es`);
  await page.waitForTimeout(600);
  expect((await state('es-10-2')) === 'current', `after a test result, your next lesson follows it (${await state('es-10-2')})`);

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
