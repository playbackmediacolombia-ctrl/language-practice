// Pictures and a screen recording of the macaw's animations: the path's poses, hints, a right
// answer, a wrong one, a streak, the lesson-complete dance and the daily-goal wave.
// Usage: npm run test:e2e -- birdshots  (saves to e2e/out/birds/)
import { mkdirSync, renameSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const DIR = new URL('./out/birds/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:4173/?test';

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', recordVideo: { dir: DIR, size: { width: 393, height: 852 } } });
  const page = await context.newPage();
  const shot = (name) => page.screenshot({ path: `${DIR}${name}.png` });
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', speaking: false, hintWait: 5, levelStart: { es: 'sounds' }, lessons: { 'es:es-1-1': 1 }, hearts: 5, heartsAt: Date.now(), celebrated: null, xp: 40 }));

  // The path: a bird beside each unit, each in its pose, playing as it scrolls into view.
  await page.goto(`${BASE}#/es`);
  await page.locator('.lesson-node').first().waitFor();
  for (const [i, pose] of ['peek', 'hop', 'wave', 'read', 'globe', 'nap'].entries()) {
    const bird = page.locator(`.path-bird .bird[data-pose=${pose}]`).first();
    await bird.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -160));
    await page.waitForTimeout(1300);
    await shot(`1-path-${i + 1}-${pose}`);
  }

  // A lesson: a hint, then a wrong answer, then right ones (a streak), then the dance.
  await page.goto(`${BASE}#/es/learn/es-2-1`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForFunction(() => window.__exercise);
  await page.getByTestId('hint-btn').click();
  await page.getByTestId('hint-btn').click();
  await page.waitForTimeout(900);
  await shot('2-hint-think');
  let wrongDone = false;
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: /complete/ }).count()) break;
    const e = await page.evaluate(() => window.__exercise);
    if (['meaning', 'listen', 'translate'].includes(e.type)) {
      const right = e.type === 'meaning' ? e.options.indexOf(e.item.en) : e.options.findIndex((o) => o.id === e.item.id);
      await page.locator('.options button').nth(wrongDone ? right : (right + 1) % e.options.length).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (e.type === 'tiles') {
      const used = new Set();
      for (const w of e.item.tiles) {
        const j = e.bank.findIndex((b, k) => b === w && !used.has(k));
        used.add(j);
        await page.locator('.bank button').nth(j).click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (e.type === 'match') {
      for (const item of e.items) {
        await page.locator('.match-col').nth(0).getByRole('button', { name: item.text, exact: true }).first().click();
        await page.locator('.match-col').nth(1).getByRole('button', { name: item.en, exact: true }).first().click();
      }
    } else if (e.type === 'type') {
      await page.locator('textarea').fill(e.item.text);
      await page.getByRole('button', { name: 'Check' }).click();
    }
    await page.locator('.banner').waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);
    const pose = await page.locator('.banner .bird').getAttribute('data-pose');
    if (pose === 'oops' && !wrongDone) await shot('3-oops');
    if (pose === 'cheer') await shot('4-cheer');
    if (pose === 'streak') await shot('5-streak');
    wrongDone = true;
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('heading', { name: /complete/ }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(1600);
  await shot('6-dance');
  await page.getByRole('button', { name: 'Continue' }).click();

  // The daily goal reached: the bird waves on the Learn tab.
  await editProgress(page, (p) => ({ ...p, goal: 10 }));
  await page.goto(`${BASE}#/es`);
  await page.getByTestId('daily-goal').waitFor();
  await page.waitForTimeout(1200);
  await page.getByTestId('daily-goal').screenshot({ path: `${DIR}7-goal-wave.png` });
  await page.waitForTimeout(800);

  const video = page.video();
  await context.close();
  renameSync(await video.path(), `${DIR}birds.webm`);
  await browser.close();
  console.log(`saved to ${DIR}`);
});
