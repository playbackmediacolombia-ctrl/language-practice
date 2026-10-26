// Reading practice: news-style articles with tap-to-translate and comprehension questions.
import { readFileSync } from 'node:fs';
import { devices, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const data = (lang) => JSON.parse(readFileSync(new URL(`../../shared/reading/${lang}.json`, import.meta.url), 'utf8')).articles;
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('reading-card').click();
  await page.locator('[data-testid^=article-]').first().waitFor();
  const levels = await page.locator('.section-title').allInnerTexts();
  const n = await page.locator('[data-testid^=article-]').count();
  expect(levels.join() === 'BEGINNER,ELEMENTARY,INTERMEDIATE,UPPER-INTERMEDIATE,ADVANCED,FLUENT', `list: every level (${levels.join(', ')})`);
  expect(n === data('es').length, `list: all ${data('es').length} Spanish articles (${n})`);
  await page.screenshot({ path: 'A-list.png' });

  // ---------- A Spanish article ----------
  const es = data('es').find((a) => a.id === 'es-news-bikes');
  await page.getByTestId(`article-${es.id}`).click();
  await page.locator('.story-line').first().waitFor();
  const head = await page.locator('.story-head').innerText();
  expect(/Practice article/.test(head) && head.includes(es.title), `article: headline and "practice article" label (${es.title})`);
  expect((await page.locator('.story-line').count()) === es.lines.length, `article: all ${es.lines.length} sentences`);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.story-lines.article .bubble')).borderTopWidth === '0px'), 'article: laid out as paragraphs, not chat bubbles');

  // Tap a glossed word, then one that isn't in the word list.
  await page.locator('.story-line').first().getByRole('button', { name: 'alcaldía', exact: true }).click();
  const gloss = await page.getByTestId('word-sheet').innerText();
  expect(/city hall/.test(gloss), `tap a word: its meaning ("alcaldía" → ${gloss.split('\n').slice(-1)[0]})`);
  await page.screenshot({ path: 'A-word.png' });
  await page.locator('.story-line').first().getByRole('button', { name: 'Medellín', exact: true }).click();
  const fallback = await page.getByTestId('word-sheet').innerText();
  expect(/whole sentence means/.test(fallback) && fallback.includes(es.lines[0].en), 'tap a word not in the list: the sentence in English instead of "no translation"');

  // Answer the questions (the right option is index 0 in the data; the screen shuffles them).
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  for (const [i, q] of es.questions.entries()) {
    const right = q.options[q.answer].text;
    await page.locator('.question').nth(i).getByRole('button', { name: right }).click();
  }
  const result = await page.getByTestId('story-result').innerText();
  expect(/4\/4 right/.test(result) && /\+10 XP/.test(result), `questions: ${result.split('\n')[0]}`);
  expect(/More articles/.test(result), 'questions: leads back to more articles');
  await page.screenshot({ path: 'A-done.png' });
  await page.getByRole('button', { name: 'More articles' }).click();
  await page.waitForTimeout(500);
  expect(/#\/es\/reading$/.test(page.url()), 'back goes to the reading list, not stories');

  // ---------- A Mandarin article: words come pre-split, with pinyin ----------
  const zh = data('zh').find((a) => a.id === 'zh-news-bikes');
  await page.goto(`${BASE}#/zh/reading/${zh.id}`);
  await page.locator('.story-line').first().waitFor();
  await page.locator('.story-line').first().getByRole('button', { name: '免费', exact: true }).click();
  const zhGloss = await page.getByTestId('word-sheet').innerText();
  expect(/miǎnfèi/.test(zhGloss) && /free/.test(zhGloss), `Mandarin: tap 免费 → pinyin and meaning (${zhGloss.replace(/\n/g, ' ')})`);
  expect((await page.locator('.line-pinyin').count()) === zh.lines.length, 'Mandarin: pinyin under every sentence');
  await page.screenshot({ path: 'A-zh.png' });

  // ---------- French: the questions are in French, with English under them ----------
  const fr = data('fr').find((a) => a.level === 6);
  await page.goto(`${BASE}#/fr/reading/${fr.id}`);
  await page.locator('.question').first().waitFor();
  const q1 = await page.locator('.question').first().innerText();
  expect(q1.includes(fr.questions[0].q) && q1.includes(fr.questions[0].qEn), 'French: question in French with the English underneath');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
