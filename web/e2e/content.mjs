// Phase 2 content: the 18+ check for flirting, word of the day, role-play hints, new role-play topics.
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const json = (f) => JSON.parse(readFileSync(new URL(`../../shared/${f}.json`, import.meta.url), 'utf8'));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' })).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  // ---------- Flirting waits behind "I'm 18 or older" ----------
  await page.goto(`${BASE}#/es`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', placement: { es: 'reading' }, levelStart: {}, celebrated: null, adult: false }));
  await page.reload();
  const flirt = page.locator('.card.unit', { hasText: 'Flirting with charm' });
  await flirt.waitFor();
  expect((await flirt.getByTestId('adult-gate').count()) === 1 && (await flirt.locator('.lesson-node').count()) === 0, 'path: the flirting unit shows the 18+ check, not its lessons');
  await flirt.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'C-gate.png' });

  await page.goto(`${BASE}#/es/roleplay`);
  await page.locator('[data-testid^=roleplay-es-]').first().waitFor();
  expect((await page.locator('[data-testid^=roleplay-es-flirting-]').count()) === 0 && (await page.getByTestId('adult-gate').count()) === 1, 'role-plays: flirting ones hidden, with the 18+ check at the end');
  expect((await page.locator('[data-testid^=roleplay-es-hotel-]').count()) === 3 && (await page.locator('[data-testid^=roleplay-es-job-]').count()) === 3, 'role-plays: hotel and job interview, three levels each');
  await page.goto(`${BASE}#/es/stories/es-fl-signals`);
  await page.getByTestId('adult-gate').waitFor();
  expect(true, 'a flirting dialogue opened directly asks first');
  await page.goto(`${BASE}#/es/learn/es-24-1`);
  await page.getByTestId('adult-gate').waitFor();
  expect((await page.getByRole('button', { name: 'Start', exact: true }).count()) === 0, 'a flirting lesson opened directly asks first');

  // One tap opens it everywhere.
  await page.getByTestId('adult-confirm').click();
  await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
  expect(true, '"I\'m 18 or older": the lesson opens');
  await page.goto(`${BASE}#/es`);
  await flirt.waitFor();
  expect((await flirt.locator('.lesson-node').count()) === 2, 'path: its two lessons are there now');
  await page.goto(`${BASE}#/es/roleplay`);
  await page.locator('[data-testid^=roleplay-es-flirting-]').first().waitFor();
  expect((await page.locator('[data-testid^=roleplay-es-flirting-]').count()) === 3, 'role-plays: three flirting ones');
  await page.goto(`${BASE}#/fr/stories`);
  await page.getByTestId('story-fr-fl-worst-line').waitFor();
  expect(/Flirting/.test(await page.getByTestId('story-fr-fl-worst-line').innerText()), 'dialogues: labeled Flirting (18+)');

  // Settings can hide it again.
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('checkbox', { name: /Show 18\+ topics/ }).uncheck();
  await page.goto(`${BASE}#/es/roleplay`);
  await page.getByTestId('adult-gate').waitFor();
  expect((await page.locator('[data-testid^=roleplay-es-flirting-]').count()) === 0, 'Settings › Show 18+ topics off: hidden again');

  // ---------- Word of the day ----------
  await page.goto(`${BASE}#/zh`);
  await page.getByTestId('word-of-day').waitFor();
  const wod = await page.getByTestId('word-of-day').innerText();
  console.log('  ', wod.replace(/\n/g, ' | '));
  expect(/Word of the day/i.test(wod) && wod.split('\n').length >= 4, 'word of the day: a word, its pinyin and meaning, and an example sentence');
  const again = await page.evaluate(() => document.querySelector('[data-testid=word-of-day] .word-day-word').textContent);
  await page.reload();
  await page.getByTestId('word-of-day').waitFor();
  expect((await page.locator('.word-day-word').innerText()) === again, 'the same word all day');
  await page.getByTestId('word-of-day').screenshot({ path: 'C-word.png' });

  // ---------- Role-play hints ----------
  await page.goto(`${BASE}#/es/roleplay/es-food-3`);
  await page.getByTestId('roleplay-start').click();
  await page.getByTestId('hint-btn').waitFor({ timeout: 20000 });
  await page.getByTestId('hint-btn').click();
  const first = json('scenarios/es').scenarios.find((s) => s.id === 'es-food-3').lines.find((l) => l.who === 'you').text;
  const letter = await page.getByTestId('hint-1').innerText();
  expect(letter.startsWith('Starts with') && letter.endsWith(first[0]), `hint 1: the first letter (${letter})`);
  await page.getByTestId('hint-btn').click();
  const hint = (await page.getByTestId('hint-2').innerText()).replace('…', '').trim();
  expect(first.startsWith(hint), `hint 2: how your line starts (${hint}…)`);
  await page.screenshot({ path: 'C-hint.png' });

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
