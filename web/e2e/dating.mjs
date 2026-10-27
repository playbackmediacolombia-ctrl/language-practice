// Dating & relationships: elective units beside the main path, plus dialogues and role-plays.
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const json = (f) => JSON.parse(readFileSync(new URL(`../../shared/${f}.json`, import.meta.url), 'utf8'));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

// Data: emoji are only decoration, never a word tile; each unit has two lessons of six.
for (const lang of ['es', 'fr', 'zh']) {
  const units = json(`course/${lang}`).units.filter((u) => ['u21', 'u22', 'u23'].includes(u.id));
  const items = units.flatMap((u) => u.lessons.flatMap((l) => l.items));
  expect(units.length === 3 && items.length === 36, `${lang}: three dating units, 36 phrases`);
  const emojiTiles = items.filter((i) => (i.tiles ?? []).some((t) => !/[\p{L}\p{N}]/u.test(t)));
  expect(!emojiTiles.length, `${lang}: no emoji word tiles (${emojiTiles.map((i) => i.id).join(', ') || 'none'})`);
  const emojiSaid = items.filter((i) => /\p{Extended_Pictographic}/u.test(i.text) && (!i.say || /\p{Extended_Pictographic}/u.test(i.say)));
  expect(!emojiSaid.length, `${lang}: the voice never reads an emoji (${emojiSaid.map((i) => i.id).join(', ') || 'ok'})`);
}

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  // ---------- A beginner: the electives are there but locked ----------
  await page.goto(`${BASE}#/es`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', placement: {}, lessons: {} }));
  await page.reload();
  const unit = page.locator('.card.unit', { hasText: 'Dating & relationships' });
  await unit.waitFor();
  expect(/^optional$/i.test(await unit.locator('.unit-badge').innerText()), 'path: the dating unit is marked Optional');
  expect(/never holds up your path/.test(await unit.innerText()), 'path: says it never holds up the main path');
  expect((await unit.locator('.lesson-node.locked').count()) === 2, 'beginner: dating lessons locked until Upper-intermediate');

  // ---------- Placed at Upper-intermediate: open, without moving "current" ----------
  await editProgress(page, (p) => ({ ...p, placement: { es: 'upper' } }));
  await page.reload();
  await unit.waitFor();
  expect((await unit.locator('.lesson-node.open').count()) === 2, 'Upper-intermediate: both dating lessons open');
  const current = await page.locator('.lesson-node.current').innerText();
  expect(!/Meeting someone|Asking someone out/.test(current), `your next lesson is still on the main path (${current.split('\n')[0]})`);
  // Tested out of Upper-intermediate means Advanced is where you are now, so its topic opens too.
  const advanced = page.locator('.card.unit', { hasText: 'Texting & dating apps' });
  expect((await advanced.locator('.lesson-node.open').count()) === 2, 'the Advanced dating unit opens with Advanced, your new level');
  const fluent = page.locator('.card.unit', { hasText: 'Love, couples & family' });
  expect((await fluent.locator('.lesson-node.locked').count()) === 2, 'the Fluent dating unit waits for Fluent');
  await unit.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'D-path.png' });
  await unit.locator('.lesson-node').first().click();
  await page.getByTestId('lesson-start').click();
  await page.waitForTimeout(600);
  expect(/#\/es\/learn\/es-21-1$/.test(page.url()), `an open dating lesson starts (${page.url().split('#')[1]})`);

  // ---------- Dialogues at levels 4–6 ----------
  await page.goto(`${BASE}#/es/stories`);
  await page.getByTestId('story-es-dt-first-date').waitFor();
  const levels = await page.locator('.section-title').allInnerTexts();
  expect(levels.join() === 'BEGINNER,ELEMENTARY,INTERMEDIATE,UPPER-INTERMEDIATE,ADVANCED,FLUENT', `stories: six levels (${levels.join(', ')})`);
  expect(/Dating/.test(await page.getByTestId('story-es-dt-first-date').innerText()), 'stories: the dating dialogues are labeled Dating');
  await page.getByTestId('story-es-dt-first-date').click();
  await page.locator('.story-line').first().waitFor();
  await page.locator('.story-line').first().getByRole('button', { name: 'trancón', exact: true }).click();
  expect(/traffic jam/.test(await page.getByTestId('word-sheet').innerText()), 'dialogue: tap a word for its meaning (trancón)');
  await page.screenshot({ path: 'D-dialogue.png' });

  await page.goto(`${BASE}#/zh/stories/zh-dt-left-on-read`);
  await page.locator('.story-line').first().waitFor();
  await page.locator('.story-line').nth(2).getByRole('button', { name: '有空', exact: true }).click();
  const zh = await page.getByTestId('word-sheet').innerText();
  expect(/yǒu kòng/.test(zh), `Mandarin dialogue: 有空 → yǒu kòng (${zh.replace(/\n/g, ' ')})`);

  // ---------- Role-plays ----------
  await page.goto(`${BASE}#/fr/roleplay`);
  await page.locator('[data-testid^=roleplay-]').first().waitFor();
  const dating = page.locator('[data-testid^=roleplay-fr-dating-]');
  expect((await dating.count()) === 3, `role-plays: three dating ones in French (${await dating.count()})`);
  expect(/Dating/.test(await dating.first().innerText()), 'role-plays: labeled Dating');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
