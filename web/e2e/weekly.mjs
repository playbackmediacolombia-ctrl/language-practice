// Weekly challenge: beat your own last week, a bar that fills, a celebration when you win, and
// a history of past weeks.
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monday = (d = new Date()) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};
const plus = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', keepCelebrations: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const thisMon = monday();
  // Three weeks ago 40 XP, two weeks ago 80 (won: goal 50), last week 100 (won: goal 90). This week: 30 so far.
  const days = {
    [key(plus(thisMon, -21))]: 40,
    [key(plus(thisMon, -14))]: 50,
    [key(plus(thisMon, -12))]: 30,
    [key(plus(thisMon, -7))]: 60,
    [key(plus(thisMon, -5))]: 40,
    [key(thisMon)]: 30,
  };
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p, d) => ({ ...p, lang: 'es', days: d, xp: 350, celebrated: null }), days);
  await page.goto(`${BASE}#/progress`);
  const card = page.getByTestId('weekly');
  await card.waitFor();
  const text = await card.innerText();
  expect(/Beat last week: 120 XP/.test(text) && /Last week you earned 100 XP/.test(text) && /90 XP to go/.test(text), `goal: a bit more than last week (${text.split('\n')[0]})`);
  expect(/30\/120/.test(text), 'progress so far: 30/120');
  const bar = await card.locator('.bar > div').evaluate((e) => e.style.transform);
  expect(/scaleX\(0\.25\)/.test(bar), `the bar fills to a quarter (${bar})`);
  const history = await page.getByTestId('weekly-history').locator('li').allInnerTexts();
  expect(history.length === 3 && /100\/90/.test(history[0]) && /80\/50/.test(history[1]) && /40\/50/.test(history[2]), `history of past weeks (${history.map((h) => h.replace(/\s+/g, ' ')).join(' | ')})`);
  expect((await page.getByTestId('weekly-history').locator('li.won').count()) === 2, 'won weeks are ticked');
  expect((await page.getByTestId('achievement').count()) === 0, 'past wins never pop up a celebration');
  await card.screenshot({ path: 'W-card.png' });

  // Win this week: the logo celebration.
  await editProgress(page, (p, k) => ({ ...p, days: { ...p.days, [k]: (p.days[k] ?? 0) + 100 } }), key(new Date()));
  await page.getByTestId('achievement').waitFor({ timeout: 5000 });
  const party = await page.getByTestId('achievement').innerText();
  expect(/Weekly challenge won!/.test(party), `winning the week: the logo celebration (${party.split('\n').find((l) => /won/.test(l))})`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'W-won.png' });
  await page.getByTestId('achievement').getByRole('button', { name: 'Continue' }).click();
  expect(/Challenge won!/.test(await card.innerText()), 'the card says so');
  await page.reload();
  await card.waitFor();
  await page.waitForTimeout(800);
  expect((await page.getByTestId('achievement').count()) === 0, 'and celebrates only once');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
