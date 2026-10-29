// Timed step-by-step hints: the Settings slider, hints in a lesson (picture or first letter, how it
// starts with tap-to-hear, the whole answer faint), the wait starting over when you tap, the Hint
// button, less XP and a Mistakes review for hinted answers, role-plays, the AI partner, and Off.
import { devices, editProgress, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const prog = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));

/** Answers whatever exercise is showing, correctly. */
async function answer(page) {
  const ex = await page.evaluate(() => window.__exercise);
  if (['meaning', 'listen', 'translate'].includes(ex.type)) {
    const i = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
    await page.locator('.options button').nth(i).click();
    await page.getByRole('button', { name: 'Check' }).click();
  } else if (ex.type === 'tiles') {
    const used = new Set();
    for (const w of ex.item.tiles) {
      const j = ex.bank.findIndex((b, k) => b === w && !used.has(k));
      used.add(j);
      await page.locator('.bank button').nth(j).click();
    }
    await page.getByRole('button', { name: 'Check' }).click();
  } else if (ex.type === 'match') {
    for (const item of ex.items) {
      await page.locator('.match-col').nth(0).getByRole('button', { name: item.text, exact: true }).first().click();
      await page.locator('.match-col').nth(1).getByRole('button', { name: item.en, exact: true }).first().click();
    }
  } else if (ex.type === 'type') {
    await page.locator('textarea').fill(ex.item.text);
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    await page.getByRole('button', { name: /Can't speak now/ }).click();
  }
  await page.locator('.banner').waitFor({ timeout: 10000 });
  return ex;
}

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  // The stand-in Worker, with a suggested answer for the hints.
  await context.route(`${API}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: '¡Hola! ¿Qué te gusta comer?',
        translation: 'Hi! What do you like to eat?',
        newWords: [],
        done: false,
        suggestion: { text: 'Me gusta mucho la pizza', en: 'I really like pizza' },
        audio: null,
        voice: 'off',
      }),
    }),
  );
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', xp: 50, speaking: false, celebrated: null, mistakes: {}, hearts: 5, heartsAt: Date.now() }));

  // ---------- Settings ----------
  await page.goto(`${BASE}#/settings`);
  const slider = page.getByTestId('hint-setting').locator('input[type=range]');
  expect((await slider.getAttribute('aria-valuetext')) === '10 seconds', 'Settings: hint wait starts at 10 seconds');
  await slider.fill('0');
  expect((await prog(page)).hintWait === 5 && (await slider.getAttribute('aria-valuetext')) === '5 seconds', 'the slider sets 5 s');
  await slider.fill('3');
  expect((await prog(page)).hintWait === 0 && /No timed hints/.test(await page.getByTestId('hint-setting').innerText()), 'and Off');
  await page.getByTestId('hint-setting').screenshot({ path: 'H-setting.png' });
  await slider.fill('0'); // 5 s for the rest of the test

  // ---------- A lesson ----------
  await page.goto(`${BASE}#/es/learn/es-2-1`);
  await page.getByTestId('grammar-tip').getByRole('button', { name: 'Got it' }).click({ timeout: 3000 }).catch(() => {});
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  // The first exercise with an answer to hint at.
  let ex;
  for (let i = 0; i < 8; i++) {
    await page.waitForFunction(() => window.__exercise);
    ex = await page.evaluate(() => window.__exercise);
    if (ex.type !== 'match') break;
    await answer(page);
    await page.getByRole('button', { name: /Continue/ }).click();
  }
  const answerText = ex.type === 'meaning' ? ex.item.en : ex.item.text;
  const coach = page.getByTestId('hint-coach');
  expect((await coach.getAttribute('data-level')) === '0' && (await page.getByTestId('hint-bubble').count()) === 0, 'at first: just the bird and a Hint button');
  await page.waitForTimeout(3500);
  await page.locator('.prompt').first().dispatchEvent('pointerdown'); // a tap starts the wait over
  await page.waitForTimeout(3000);
  expect((await coach.getAttribute('data-level')) === '0', 'a tap starts the wait over (no hint 6.5 s in)');
  await page.getByTestId('hint-1').waitFor({ timeout: 4000 });
  const h1 = await page.getByTestId('hint-1').innerText();
  const pic = await page.getByTestId('hint-1').locator('svg[data-picture] path').count();
  const first = [...answerText.replace(/^[¿¡]/, '')][0];
  expect(pic > 0 || h1.includes(first), `after 5 s quiet: hint 1, a hand-drawn picture or the first letter (“${h1.replace(/\s+/g, ' ')}”, ${pic} picture paths)`);
  await page.screenshot({ path: 'H-1.png' });
  await page.getByTestId('hint-2').waitFor({ timeout: 6500 });
  const h2 = await page.getByTestId('hint-2').innerText();
  expect(answerText.startsWith(h2.replace(/…$/, '').trim().split(' (')[0]), `after another wait: hint 2, how it starts (“${h2}”)`);
  await page.evaluate(() => (window.__spoken.length = 0));
  await page.getByTestId('hint-2').click();
  await page.waitForTimeout(800);
  const said = await page.evaluate(() => window.__spoken);
  expect(said.length === 1 && answerText.startsWith(said[0]), `tap it to hear it (said “${said[0]}”)`);
  await page.getByTestId('hint-3').waitFor({ timeout: 6500 });
  const h3 = page.getByTestId('hint-3');
  const faint = Number(await h3.evaluate((e) => getComputedStyle(e).opacity));
  expect((await h3.innerText()).includes(answerText.replace(/\s*\p{Extended_Pictographic}.*/u, '')) && faint < 0.6, `then the whole answer, faint (opacity ${faint})`);
  expect((await page.getByTestId('hint-btn').count()) === 0, 'no Hint button once it shows everything');
  await page.screenshot({ path: 'H-3.png' });
  await answer(page);
  expect(/With a hint/.test(await page.locator('.banner').innerText()), 'answered right with a hint: says it comes back in Mistakes review');
  const p1 = await prog(page);
  const mistakeKeys = Object.keys(p1.mistakes);
  expect(mistakeKeys.some((k) => k === `es:${ex.item?.id}`) || mistakeKeys.length > 0, `it's on the Mistakes list (${mistakeKeys.join(', ')})`);
  await page.getByRole('button', { name: /Continue/ }).click();

  // The Hint button: the next hint straight away.
  await page.waitForFunction(() => window.__exercise);
  if ((await page.getByTestId('hint-btn').count()) && (await page.evaluate(() => window.__exercise.type)) !== 'match') {
    await page.getByTestId('hint-btn').click();
    expect((await page.getByTestId('hint-1').count()) === 1, 'the Hint button shows hint 1 at once');
    await page.getByTestId('hint-btn').click();
    expect((await page.getByTestId('hint-2').count()) === 1, 'and hint 2 on the next tap');
  }
  // Finish the lesson quickly (before any more hints show up).
  const xpBefore = (await prog(page)).xp;
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: /complete/ }).count()) break;
    await answer(page);
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole('heading', { name: /complete/ }).waitFor({ timeout: 10000 });
  const xpAfter = (await prog(page)).xp;
  const note = await page.getByTestId('hint-xp').innerText().catch(() => '');
  expect(/with a hint: −\d XP/.test(note) && xpAfter - xpBefore < 15, `hinted answers earn a little less XP (+${xpAfter - xpBefore}; “${note}”)`);

  // ---------- Off ----------
  await editProgress(page, (p) => ({ ...p, hintWait: 0 }));
  await page.goto(`${BASE}#/es/learn/es-2-2`);
  await page.getByTestId('grammar-tip').getByRole('button', { name: 'Got it' }).click({ timeout: 3000 }).catch(() => {});
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForTimeout(7000);
  expect((await page.getByTestId('hint-bubble').count()) === 0, 'Off: no timed hints');
  if (await page.getByTestId('hint-btn').count()) {
    await page.getByTestId('hint-btn').click();
    expect((await page.getByTestId('hint-1').count()) === 1, 'Off: the Hint button still works');
  }
  await editProgress(page, (p) => ({ ...p, hintWait: 5 }));

  // ---------- A role-play (no speech model: say it, then Next) ----------
  await page.goto(`${BASE}#/es/roleplay/es-food-3`);
  await page.getByTestId('roleplay-start').click();
  await page.getByTestId('turn-panel').waitFor({ timeout: 30000 });
  await page.getByTestId('hint-1').waitFor({ timeout: 7000 });
  expect(true, 'role-play: hint 1 after the wait, in the turn panel');
  await page.getByTestId('hint-btn').click();
  const rh2 = await page.getByTestId('hint-2').innerText();
  expect(rh2.length > 1, `role-play: Hint gives how the line starts (“${rh2}”)`);
  await page.screenshot({ path: 'H-roleplay.png' });
  await page.getByTestId('turn-next').click();
  const p2 = await prog(page);
  expect(Object.keys(p2.mistakes).length > mistakeKeys.length, 'a role-play line said with a hint goes into Mistakes review');

  // ---------- The AI partner (typing: no speech model) ----------
  await page.goto(`${BASE}#/es/talk`);
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 20000 });
  await page.getByTestId('talk-input').fill('Me');
  await page.waitForTimeout(3500);
  await page.getByTestId('talk-input').fill('Me g'); // typing starts the wait over
  await page.waitForTimeout(2500);
  expect((await page.getByTestId('hint-bubble').count()) === 0, 'AI partner: typing starts the wait over');
  await page.getByTestId('hint-1').waitFor({ timeout: 4000 });
  expect(/M/.test(await page.getByTestId('hint-1').innerText()), 'AI partner: hint 1 from the suggested answer');
  await page.getByTestId('hint-2').waitFor({ timeout: 6500 });
  expect(/Me gusta/.test(await page.getByTestId('hint-2').innerText()), 'then how it starts');
  await page.getByTestId('hint-3').waitFor({ timeout: 6500 });
  expect(/Me gusta mucho la pizza/.test(await page.getByTestId('hint-3').innerText()), 'then the whole suggestion, faint');
  await page.screenshot({ path: 'H-talk.png' });
  await page.getByTestId('talk-input').fill('Me gusta mucho la pizza');
  await page.getByTestId('talk-send').click();
  await page.waitForTimeout(1500);
  await page.getByTestId('talk-end').click();
  const sum = await page.getByTestId('talk-summary').innerText();
  expect(/\+9 XP \(1 with a hint\)/.test(sum), `AI partner: a hinted answer costs 1 XP (${sum.match(/\+\d+ XP[^\n]*/)?.[0]})`);
  expect(Object.keys((await prog(page)).mistakes).some((k) => k.startsWith('es:ai:me-gusta')), 'and the suggestion goes into Mistakes review');

  // ---------- Reduce Motion ----------
  const still = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p3 = await still.newPage();
  await p3.goto(`${BASE}#/`);
  await editProgress(p3, (p) => ({ ...p, lang: 'es', speaking: false, hintWait: 5 }));
  await p3.goto(`${BASE}#/es/learn/es-1-1`);
  await p3.getByRole('button', { name: 'Start', exact: true }).click();
  await p3.getByTestId('hint-btn').click();
  const moving = await p3.evaluate(() => [...document.querySelectorAll('.hint-coach, .hint-coach *')].filter((e) => getComputedStyle(e).animationName !== 'none').length);
  expect(moving === 0, `Reduce Motion: the hint bird and bubble stand still (${moving} moving)`);
  await still.close();

  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  if (failures) process.exitCode = 1;
});
