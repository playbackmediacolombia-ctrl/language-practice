// The living path: a popup for each lesson (what it covers, its XP, Start), reward chests that
// give their XP once, the macaw beside each unit in its own pose, the unit banner that stays at the
// top while you scroll, and the button back to your lesson.
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
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
  await page.goto(`${BASE}#/`);
  // Unit 1's first two lessons done: its chest (halfway along) is ready to open.
  await editProgress(page, (p) => ({ ...p, lang: 'es', xp: 100, lessons: { 'es:es-1-1': 1, 'es:es-1-2': 1 }, chests: {}, celebrated: null }));
  await page.goto(`${BASE}#/es`);
  await page.locator('.lesson-node.current').waitFor();

  // ---------- Lesson popup ----------
  await page.locator('.lesson-node.current').click();
  const pop = page.getByTestId('lesson-pop');
  await pop.waitFor({ timeout: 3000 });
  const text = await pop.innerText();
  expect(/Lesson 3 of 4/i.test(text) && /words and phrases/.test(text), `popup: which lesson and what it covers (${text.split('\n').slice(0, 3).join(' | ')})`);
  expect(/Start\s*\+10 XP/.test(text) && /\+5 more if you make no mistakes/.test(text), 'popup: Start +10 XP, +5 if perfect');
  expect(page.url().endsWith('#/es'), 'tapping a coin opens the popup, not the lesson');
  await page.screenshot({ path: 'LP-popup.png' });
  await page.locator('.daily-goal, [data-testid=daily-goal]').first().click();
  expect((await pop.count()) === 0, 'a tap elsewhere closes the popup');
  await page.locator('.lesson-node.done').first().click();
  expect(/Practice again/.test(await pop.innerText()), 'a done lesson offers Practice again');
  await page.keyboard.press('Escape');
  expect((await pop.count()) === 0, 'Escape closes it');
  await page.locator('.lesson-node.current').click();
  await page.getByTestId('lesson-start').click();
  await page.waitForFunction(() => location.hash.includes('/learn/es-1-3'), null, { timeout: 5000 }).catch(() => {});
  expect(page.url().includes('/learn/es-1-3'), 'Start opens the lesson');
  await page.goto(`${BASE}#/es`);
  await page.locator('.lesson-node.current').waitFor();

  // ---------- Reward chests ----------
  const chests = page.getByTestId('reward-chest');
  const states = await chests.evaluateAll((els) => els.map((e) => e.dataset.state));
  expect(states[0] === 'ready' && states.slice(1).every((s) => s === 'locked'), `chests: unit 1's is ready, later ones locked (${states.slice(0, 3).join(', ')}…)`);
  const wiggle = await chests.first().evaluate((e) => getComputedStyle(e).animationName);
  expect(wiggle === 'chest-wiggle', `a ready chest wiggles (${wiggle})`);
  const xp = async () => page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).xp);
  const before = await xp();
  await chests.first().scrollIntoViewIfNeeded();
  await chests.first().click();
  const burst = await page.getByTestId('chest-xp').innerText({ timeout: 2000 }).catch(() => '');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'LP-chest.png' });
  expect(/\+15 XP/.test(burst), `opening it: a +15 XP burst (${burst})`);
  expect((await xp()) === before + 15, `XP goes up by 15 (${before} → ${await xp()})`);
  expect((await chests.first().getAttribute('data-state')) === 'opened', 'the chest stays open');
  await chests.first().click({ force: true });
  expect((await xp()) === before + 15, 'tapping an open chest gives nothing more');
  await page.reload();
  await page.locator('.lesson-node.current').waitFor();
  expect((await chests.first().getAttribute('data-state')) === 'opened' && (await xp()) === before + 15, 'after a reload: still open, XP counted once');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).chests);
  expect(Object.keys(saved).join() === 'es:u1', `saved in progress (${Object.keys(saved).join()})`);

  // ---------- Birds ----------
  const poses = await page.locator('.path-bird .bird').evaluateAll((els) => els.slice(0, 6).map((e) => e.dataset.pose));
  expect(new Set(poses).size === 6, `a bird beside each unit, each in its own pose (${poses.join(', ')})`);
  expect((await page.locator('.path-buddy .bird').count()) === 1 && (await page.locator('.path-buddy img').count()) === 0, 'the buddy by your lesson is the drawn macaw');
  const firstBird = page.locator('.path-bird .bird').nth(1);
  await firstBird.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  expect(/\bseen\b/.test(await firstBird.getAttribute('class')), 'a bird reacts when it scrolls into view');

  // ---------- Sticky unit banner ----------
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  expect((await page.getByTestId('sticky-unit').count()) === 0, 'sticky banner: hidden at the top');
  const unit2 = page.locator('.card.unit[data-unit]').nth(1);
  await unit2.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY + 200));
  await page.waitForTimeout(400);
  const s1 = await page.getByTestId('sticky-unit').innerText().catch(() => '');
  const t2 = await unit2.getAttribute('data-title');
  expect(s1.includes(t2), `scrolled into unit 2: the banner shows its title (${s1.replace(/\s+/g, ' ')})`);
  const tone2 = await page.getByTestId('sticky-unit').getAttribute('class');
  await page.screenshot({ path: 'LP-sticky.png' });
  const unit4 = page.locator('.card.unit[data-unit]').nth(3);
  await unit4.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY + 200));
  await page.waitForTimeout(400);
  const s2 = await page.getByTestId('sticky-unit').innerText().catch(() => '');
  const tone4 = await page.getByTestId('sticky-unit').getAttribute('class');
  expect(s2.includes(await unit4.getAttribute('data-title')) && tone2 !== tone4, `further down it changes title and color (${tone2} → ${tone4})`);

  // ---------- Jump to your lesson ----------
  const jump = page.getByTestId('jump-to-lesson');
  expect(await jump.isVisible(), 'your lesson off screen: the jump button shows');
  expect(/\bup\b/.test(await jump.getAttribute('class')), 'it points up, toward your lesson');
  await jump.click();
  await page.waitForTimeout(1200);
  const inView = await page.locator('.lesson-node.current').evaluate((e) => {
    const r = e.getBoundingClientRect();
    return r.top > 0 && r.bottom < innerHeight;
  });
  expect(inView, 'tapping it brings your lesson back on screen');
  expect((await jump.count()) === 0, 'and the button goes away');

  // ---------- Answer tiles ----------
  // Answer until a "How do you say…" question comes up: its answers each have a speaker and say themselves.
  await page.goto(`${BASE}#/es/learn/es-2-4`);
  await page.getByTestId('grammar-tip').getByRole('button', { name: 'Got it' }).click({ timeout: 3000 }).catch(() => {});
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  let sawListen = false;
  let ex = null;
  for (let i = 0; i < 25; i++) {
    await page.waitForFunction(() => window.__exercise && document.querySelector('.prompt'), null, { timeout: 5000 });
    ex = await page.evaluate(() => window.__exercise);
    if (ex.type === 'translate') break;
    if (ex.type === 'listen') sawListen = sawListen || (await page.locator('.options .option-speaker').count()) === 0;
    if (['meaning', 'listen'].includes(ex.type)) {
      await page.locator('.options button').nth(ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id)).click();
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
      const skip = page.getByRole('button', { name: /Can't (speak|listen) now|I don't know|Skip/ });
      if (await skip.count()) await skip.first().click();
      else break;
    }
    await page.getByRole('button', { name: /Continue/ }).click({ timeout: 8000 });
  }
  if (ex?.type === 'translate') {
    const opts = page.locator('.options button');
    expect((await page.locator('.options .option-speaker').count()) === ex.options.length, '"How do you say…": every answer tile has a speaker');
    const h = await opts.first().evaluate((e) => e.getBoundingClientRect().height);
    expect(h >= 64, `answer tiles are big (${Math.round(h)} px tall)`);
    await page.evaluate(() => {
      window.__srcs = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...a) {
        window.__srcs.push(this.src);
        return play.apply(this, a);
      };
    });
    await opts.nth(1).click();
    const anim = await opts.nth(1).evaluate((e) => getComputedStyle(e).animationName);
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'LP-tiles.png' });
    expect(anim === 'tile-pick', `a picked tile bounces (${anim})`);
    await page.waitForTimeout(900);
    const srcs = await page.evaluate(() => window.__srcs);
    const want = ex.options[1].audio.split('/').pop();
    expect(srcs.some((u) => u.endsWith(want)), `tapping it plays that answer (${srcs.map((u) => u.split('/').pop()).join(', ') || 'nothing'})`);
  } else expect(false, `a "How do you say…" question came up (last: ${ex?.type})`);
  if (sawListen) expect(true, '"What do you hear?": no speakers on the answers (that would give it away)');

  // ---------- Reduce Motion ----------
  const still = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p2 = await still.newPage();
  await p2.goto(`${BASE}#/`);
  await editProgress(p2, (p) => ({ ...p, lang: 'es', lessons: { 'es:es-1-1': 1, 'es:es-1-2': 1 }, chests: {} }));
  await p2.goto(`${BASE}#/es`);
  await p2.locator('.lesson-node.current').waitFor();
  await p2.locator('.path-bird .bird').first().scrollIntoViewIfNeeded();
  await p2.waitForTimeout(400);
  const moving = await p2.evaluate(() =>
    [...document.querySelectorAll('.bird *, .path-chest, .path-buddy')].filter((e) => getComputedStyle(e).animationName !== 'none').length,
  );
  expect(moving === 0, `Reduce Motion: the birds and chests stand still (${moving} moving)`);
  await still.close();

  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  if (failures) process.exitCode = 1;
});
