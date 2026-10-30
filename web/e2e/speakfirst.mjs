// Speaking-first: every exercise answered out loud. On for Mandarin by default; a switch on the
// lesson's start card and in Settings. (The speech model is only marked ready here; nothing is graded.)
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' })).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`${BASE}#/`);
  await page.evaluate(() => localStorage.setItem('whisper-ready', 'base'));
  await editProgress(page, (p) => ({ ...p, lang: 'zh', placement: { zh: 'sentences', es: 'sentences' }, celebrated: null }));

  /** Starts a lesson and reads the first few exercise prompts. */
  const prompts = async (lesson) => {
    await page.goto(`${BASE}#/${lesson}`);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await page.locator('.prompt').first().waitFor();
      seen.push(await page.locator('.prompt').first().innerText());
      const skip = page.getByRole('button', { name: "Can't speak now" });
      if (await skip.count()) await skip.click();
      else break;
      await page.getByRole('button', { name: /Continue/ }).click();
    }
    return seen;
  };

  await page.goto(`${BASE}#/zh/learn/zh-7-1`);
  const sw = page.getByTestId('speak-first');
  expect(await sw.locator('input').isChecked(), 'Mandarin: speaking-first is on by default');
  await page.screenshot({ path: 'S-start.png' });
  const zh = await prompts('zh/learn/zh-7-1');
  console.log('   ', zh.join(' / '));
  expect(zh.length >= 4 && zh.every((t) => /^Say it/.test(t)), 'Mandarin lesson: every exercise is said out loud');
  expect(zh.some((t) => /Say it in Mandarin/.test(t)), 'words you have seen: say it from the English');
  await page.screenshot({ path: 'S-recall.png' });

  await page.goto(`${BASE}#/es/learn/es-7-1`);
  expect(!(await page.getByTestId('speak-first').locator('input').isChecked()), 'Spanish: off by default');
  await page.getByTestId('speak-first').locator('input').check();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('.prompt').first().waitFor();
  expect(/^Say it/.test(await page.locator('.prompt').first().innerText()), 'the switch on the start card turns it on for that language');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).speakFirst);
  expect(saved.es === true && saved.zh === true, `remembered per language (${JSON.stringify(saved)})`);

  // Without the speech model it says so, and you tap as usual.
  await page.goto(`${BASE}#/`);
  await page.evaluate(() => localStorage.removeItem('whisper-ready'));
  await page.goto(`${BASE}#/zh/learn/zh-7-1`);
  await page.getByTestId('speak-first-needs-model').waitFor();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('.prompt').first().waitFor();
  expect(!/^Say it/.test(await page.locator('.prompt').first().innerText()), 'no speech model: a note, and tapping as usual');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
