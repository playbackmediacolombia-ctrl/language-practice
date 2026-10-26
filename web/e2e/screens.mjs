// Screenshots of every screen at iPhone size, for before/after comparisons of the design.
// Usage: node screens.mjs <label>  →  out/shots/<label>/NN-name.png (light, plus a few in dark).
import { mkdirSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const label = process.argv[2] ?? process.env.SHOTS ?? 'now';
const DIR = new URL(`./out/shots/${label}/`, import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:4173/?test';
const day = (ago) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A learner a few days in: Spanish lessons 1-1 … 2-2 done, a 4-day streak, some XP today.
const seed = (p, days) => ({
  ...p,
  lang: 'es',
  xp: 340,
  days: Object.fromEntries(days.map((d, i) => [d, i === 0 ? 12 : 25])),
  lessons: Object.fromEntries(['es-1-1', 'es-1-2', 'es-1-3', 'es-2-1', 'es-2-2', 'zh-1-1'].map((id) => [id.slice(0, 2) + ':' + id, 1])),
  celebrated: null, // already earned, so nothing pops up over the screenshots
  hearts: 4,
  heartsAt: Date.now(),
});

const SCREENS = [
  ['learn', '#/es'],
  ['learn-mandarin', '#/zh'],
  ['learn-french-new', '#/fr'],
  ['level', '#/es/level'],
  ['practice', '#/practice'],
  ['progress', '#/progress'],
  ['settings', '#/settings'],
  ['reminder', '#/settings/reminder'],
  ['lesson', '#/es/learn/es-2-3'],
  ['review', '#/es/learn/review'],
  ['placement', '#/es/placement'],
  ['stories', '#/es/stories'],
  ['story', '#/es/stories/es-cafe'],
  ['roleplays', '#/es/roleplay'],
  ['roleplay', '#/es/roleplay/es-food-1'],
  ['reading', '#/es/reading'],
  ['handsfree', '#/es/handsfree'],
  ['phrasebook-topic', '#/es/greetings'],
  ['flashcards', '#/es/greetings/flashcards'],
  ['quiz', '#/es/greetings/quiz'],
  ['writing', '#/zh/write'],
];
const DARK = ['learn', 'practice', 'lesson', 'progress'];

await run(async () => {
  const browser = await launch();
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme: scheme });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    let n = 0;
    if (scheme === 'light') {
      await page.goto(`${BASE}#/`);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}${String(n++).padStart(2, '0')}-welcome.png` });
    }
    if (scheme === 'dark') await page.goto(`${BASE}#/`);
    await editProgress(page, seed, [day(0), day(1), day(2), day(3)]);
    for (const [name, hash] of SCREENS) {
      if (scheme === 'dark' && !DARK.includes(name)) continue;
      await page.goto(`${BASE}${hash}`);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}${String(n++).padStart(2, '0')}-${name}${scheme === 'dark' ? '-dark' : ''}.png` });
      if (name === 'learn' && scheme === 'light') {
        await page.screenshot({ path: `${DIR}${String(n++).padStart(2, '0')}-learn-full.png`, fullPage: true });
      }
      if (name === 'lesson') {
        // Into the first exercise.
        const start = page.getByRole('button', { name: /^(Start|Begin|Let's go)/i });
        if (await start.count()) {
          await start.first().click();
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${DIR}${String(n++).padStart(2, '0')}-exercise${scheme === 'dark' ? '-dark' : ''}.png` });
        }
      }
    }
    await context.close();
  }
  console.log('saved to', DIR);
});
