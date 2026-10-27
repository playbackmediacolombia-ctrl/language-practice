// Culture lessons: optional units on the path with a culture note, phrases with audio, and a quiz.
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const course = (l) => JSON.parse(readFileSync(new URL(`../../shared/course/${l}.json`, import.meta.url), 'utf8'));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

// Data: five culture lessons per language, each with six phrases (with audio) and three questions.
for (const l of ['es', 'fr', 'zh']) {
  const units = course(l).units.filter((u) => ['u27', 'u28', 'u29', 'u30', 'u31'].includes(u.id));
  const ok = units.length === 5 && units.every((u) => u.lessons[0].items.length === 6 && u.lessons[0].quiz.length === 3);
  expect(ok, `${l}: five culture lessons, six phrases and a three-question quiz each`);
}

await run(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' })).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`${BASE}#/es`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', placement: { es: 'conversation' }, levelStart: {}, celebrated: null, speaking: false, tips: {} }));
  await page.reload();
  const unit = page.locator('.card.unit', { hasText: 'Culture: greetings & gestures' });
  await unit.waitFor();
  expect(/^culture/i.test(await unit.locator('.unit-kicker').innerText()), 'path: labeled Culture, an optional unit');
  expect((await unit.locator('.lesson-node.open').count()) === 1, 'path: open once you reach its level');
  await unit.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'K-path.png' });

  await unit.locator('.lesson-node').click();
  await page.getByTestId('lesson-start').click();
  await page.getByTestId('grammar-tip').waitFor();
  const tip = await page.getByTestId('grammar-tip').innerText();
  expect(/culture note/i.test(tip) && /Spain/.test(tip) && /Colombia/.test(tip), 'the culture note pops up first, covering Spain and Latin America');
  await page.screenshot({ path: 'K-note.png' });
  await page.getByTestId('grammar-tip').getByRole('button', { name: /Got it|Close/ }).first().click();

  // Play it through; the quiz comes last.
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const types = [];
  let wrongFact = false;
  let heartsBefore = null;
  for (let step = 0; step < 40; step++) {
    if (await page.getByText(/complete!/).isVisible().catch(() => false)) break;
    const ex = await page.evaluate(() => window.__exercise);
    types.push(ex.type);
    if (ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'translate') {
      const i = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
      await page.locator('.options button').nth(i).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'tiles') {
      const used = new Set();
      for (const w of ex.item.tiles) {
        const i = ex.bank.findIndex((b, j) => b === w && !used.has(j));
        used.add(i);
        await page.locator('.bank button').nth(i).click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'match') {
      for (const item of ex.items) {
        await page.locator('.match-col').nth(0).getByRole('button', { name: item.text, exact: true }).click();
        await page.locator('.match-col').nth(1).getByRole('button', { name: item.en, exact: true }).click();
      }
    } else if (ex.type === 'type') {
      await page.locator('textarea').fill(ex.item.text);
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'fact') {
      if (!wrongFact) {
        heartsBefore = await page.locator('.hearts').innerText();
        await page.locator('.options button').nth((ex.options.indexOf(ex.answer) + 1) % ex.options.length).click();
        await page.getByRole('button', { name: 'Check' }).click();
        const banner = await page.locator('.banner').innerText();
        expect(/Answer:/.test(banner) && banner.includes(ex.answer), `a wrong quiz answer shows the right one (${ex.answer})`);
        expect((await page.locator('.hearts').innerText()) === heartsBefore, 'and costs no hearts');
        await page.screenshot({ path: 'K-quiz.png' });
        wrongFact = true;
      } else {
        await page.locator('.options button').nth(ex.options.indexOf(ex.answer)).click();
        await page.getByRole('button', { name: 'Check' }).click();
      }
    }
    await page.locator('.banner').waitFor();
    await page.locator('.banner').getByRole('button', { name: 'Continue' }).click();
  }
  const facts = types.filter((t) => t === 'fact').length;
  expect(facts === 3 && types.slice(-3).every((t) => t === 'fact'), `the lesson ends with its three-question quiz (${types.join(', ')})`);
  expect(await page.getByText(/complete!/).isVisible(), 'lesson complete');
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  expect(p.lessons['es:es-27-1'] === 1, 'counted as done');

  // French and Mandarin notes cover their countries too.
  for (const [lang, lesson, places] of [['fr', 'fr-27-1', /Belgium|Québec/], ['zh', 'zh-28-1', /Taiwan/]]) {
    await page.goto(`${BASE}#/${lang}/learn/${lesson}`);
    await page.getByTestId('tip-button').click().catch(() => {});
    const t = await page.getByTestId('grammar-tip').innerText().catch(() => '');
    expect(places.test(t), `${lang}: the culture note covers ${places.source.replace(/\|/g, ' / ')}`);
    await page.keyboard.press('Escape');
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
