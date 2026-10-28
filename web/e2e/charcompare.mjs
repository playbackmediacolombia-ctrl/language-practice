// Before (the live site) and after (this build) pictures of the role-play characters, and a
// screen recording of the new ones. Usage: npm run test:e2e -- charcompare  (e2e/out/compare/)
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const DIR = new URL('./out/compare/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const SITES = { before: 'https://learnguage.net/', after: 'http://localhost:4173/?test' };

await run(async () => {
  const browser = await launch();
  for (const [when, base] of Object.entries(SITES)) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme: scheme });
      const page = await context.newPage();
      await page.goto(`${base}#/`);
      await editProgress(page, (p) => ({ ...p, lang: 'es', characters: true }));
      for (const [name, id] of [['waiter', 'es-food-1'], ['doctor', 'es-doctor-2']]) {
        await page.goto(`${base}#/es/roleplay/${id}`);
        await page.getByTestId('char-stage').waitFor();
        await page.waitForTimeout(1200);
        await page.getByTestId('char-stage').screenshot({ path: `${DIR}${when}-${scheme}-${name}.png` });
        // Talking: press Start and catch the mouth open.
        await page.getByTestId('roleplay-start').click();
        const mouth = () => page.evaluate(() => Number(document.querySelector('[data-testid=character]')?.getAttribute('data-mouth')));
        for (let tries = 0; tries < 25; tries++) {
          await page.waitForFunction(() => Number(document.querySelector('[data-testid=character]')?.getAttribute('data-mouth')) >= 2, null, { timeout: 8000 }).catch(() => {});
          const shot = await page.getByTestId('char-stage').screenshot();
          if ((await mouth()) >= 2 || tries === 24) {
            writeFileSync(`${DIR}${when}-${scheme}-${name}-talking.png`, shot);
            break;
          }
        }
      }
      await context.close();
    }
  }
  // The recording: the new character going through a little scene, and the bird.
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', recordVideo: { dir: DIR, size: { width: 393, height: 852 } } });
  const page = await context.newPage();
  await page.goto(`${SITES.after}#/gallery`);
  await page.getByTestId('gallery-demo').waitFor();
  await page.waitForTimeout(19000);
  const video = page.video();
  await context.close();
  renameSync(await video.path(), `${DIR}characters.webm`);
  await browser.close();
  console.log(`saved to ${DIR}`);
});
