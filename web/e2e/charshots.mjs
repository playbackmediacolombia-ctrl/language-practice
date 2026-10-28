// Pictures and a screen recording of the characters: every role in every mood, a talking
// mouth, and the bird's poses. Usage: npm run test:e2e -- charshots  (saves to e2e/out/chars/)
import { mkdirSync, renameSync } from 'node:fs';
import { devices, launch, run } from './harness.mjs';

const DIR = new URL('./out/chars/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

await run(async () => {
  const browser = await launch();
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('http://localhost:4173/?test#/gallery');
    await page.getByTestId('gallery').waitFor();
    await page.waitForTimeout(1500);
    for (const s of ['talk', 'idle', 'wave', 'happy', 'confused', 'thinking', 'celebrate', 'birds']) {
      await page.getByTestId(`gallery-${s}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await page.getByTestId(`gallery-${s}`).screenshot({ path: `${DIR}${scheme}-${s}.png` });
    }
    await context.close();
  }
  await browser.close();
  console.log(`saved to ${DIR}`);
});
