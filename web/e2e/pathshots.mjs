// Before/after pictures of the lesson path: iPhone-size screenshots (light and dark) and a
// short screen recording of scrolling the path. Usage: SHOTS=<label> npm run test:e2e -- pathshots
import { mkdirSync, renameSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const label = process.env.SHOTS ?? 'now';
const DIR = new URL(`./out/path-${label}/`, import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:4173/?test';
const day = (ago) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const seed = (p, days) => ({
  ...p,
  lang: 'es',
  xp: 420,
  days: Object.fromEntries(days.map((d, i) => [d, i === 0 ? 10 : 25])),
  lessons: Object.fromEntries(['es-1-1', 'es-1-2', 'es-1-3', 'es-1-4', 'es-2-1', 'es-2-2', 'es-2-3'].map((id) => [`es:${id}`, 1])),
  celebrated: null,
  hearts: 5,
  heartsAt: Date.now(),
});

await run(async () => {
  const browser = await launch();
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({
      ...devices['iPhone 15'],
      serviceWorkers: 'block',
      colorScheme: scheme,
      ...(scheme === 'light' ? { recordVideo: { dir: DIR, size: { width: 393, height: 852 } } } : {}),
    });
    const page = await context.newPage();
    await page.goto(`${BASE}#/`);
    await editProgress(page, seed, [day(0), day(1), day(2)]);
    await page.goto(`${BASE}#/es`);
    await page.locator('.lesson-node').first().waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}${scheme}-1-top.png` });
    await page.locator('.lesson-node.current').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}${scheme}-2-current.png` });
    if (await page.locator('.lesson-node.current').isVisible()) {
      await page.locator('.lesson-node.current').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${DIR}${scheme}-2b-popup.png` });
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.scrollBy(0, 1600));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}${scheme}-3-further.png` });
    if (scheme === 'light') {
      // The recording: scroll down the path slowly, then back up.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
      for (let i = 0; i < 40; i++) {
        await page.evaluate(() => window.scrollBy(0, 90));
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(800);
      const jump = page.getByTestId('jump-to-lesson');
      if (await jump.isVisible().catch(() => false)) {
        await jump.click();
        await page.waitForTimeout(1500);
      } else {
        for (let i = 0; i < 25; i++) {
          await page.evaluate(() => window.scrollBy(0, -120));
          await page.waitForTimeout(60);
        }
      }
      await page.waitForTimeout(800);
    }
    // An answer screen.
    await page.goto(`${BASE}#/es/learn/es-2-4`);
    await page.getByTestId('grammar-tip').getByRole('button', { name: 'Got it' }).click({ timeout: 3000 }).catch(() => {});
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.waitForTimeout(900);
    for (let i = 0; i < 4; i++) {
      const ex = await page.evaluate(() => window.__exercise);
      if (['listen', 'translate'].includes(ex.type)) break;
      if (ex.type === 'meaning') {
        await page.locator('.options button').nth(ex.options.indexOf(ex.item.en)).click();
        await page.getByRole('button', { name: 'Check' }).click();
        await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
        await page.waitForTimeout(500);
      } else break;
    }
    await page.screenshot({ path: `${DIR}${scheme}-4-answers.png` });
    const video = page.video();
    await context.close();
    if (video) renameSync(await video.path(), `${DIR}path-scroll.webm`);
  }
  console.log('saved to', DIR);
});
