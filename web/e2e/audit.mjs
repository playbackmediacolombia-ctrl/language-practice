// A sweep across the app: every button and image has a name for VoiceOver, screens with nothing
// in them yet still make sense, bigger text fits, and the lesson's bird, quick mute and watermark.
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

/** Buttons, links and inputs with no accessible name, and images with no alt. */
const unnamed = (page) =>
  page.evaluate(() => {
    const name = (el) =>
      (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim() ||
      (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent?.trim()) ||
      (el.labels?.[0]?.textContent ?? '').trim();
    const hidden = (el) => el.closest('[aria-hidden="true"]') || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden';
    const bad = [];
    for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')) {
      if (!hidden(el) && !name(el)) bad.push(el.outerHTML.slice(0, 90));
    }
    for (const img of document.querySelectorAll('img')) if (!hidden(img) && !img.hasAttribute('alt')) bad.push(img.outerHTML.slice(0, 90));
    return bad;
  });

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ---------- A brand-new user: empty states ----------
  await page.goto(`${BASE}#/`);
  const empty = ['#/', '#/practice', '#/progress', '#/settings', '#/es', '#/pt/stories', '#/it/reading', '#/fr/roleplay', '#/zh/music', '#/es/handsfree', '#/es/talk', '#/es/camera'];
  for (const hash of empty) {
    await page.goto(`${BASE}${hash}`);
    await page.waitForTimeout(700);
    const text = (await page.locator('main').first().innerText().catch(() => '')).trim();
    expect(text.length > 20, `new user, ${hash}: something to read (${text.split('\n')[0].slice(0, 50)})`);
  }
  for (const hash of ['#/es/learn/mistakes', '#/es/learn/daily']) {
    await page.goto(`${BASE}${hash}`);
    await page.waitForTimeout(800);
    expect(!/learn\/(mistakes|daily)/.test(page.url()) || (await page.locator('main').innerText()).trim().length > 10, `new user, ${hash}: goes somewhere sensible (${page.url().split('#')[1]})`);
  }
  expect(errors.length === 0, `no errors on any screen${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);

  // ---------- VoiceOver: everything has a name ----------
  await editProgress(page, (p) => ({ ...p, lang: 'es', speaking: false, levelStart: { es: 'words' }, lessons: { 'es:es-2-1': 1 }, hearts: 5, heartsAt: Date.now(), celebrated: null }));
  const screens = ['#/es', '#/practice', '#/progress', '#/settings', '#/es/stories', '#/es/roleplay', '#/es/music', '#/es/greetings', '#/es/talk', '#/es/play', '#/es/play/adventure', '#/es/play/chat/plans', '#/es/play/mission/coffee', '#/es/play/debate', '#/es/play/call/taxi'];
  for (const hash of screens) {
    await page.goto(`${BASE}${hash}`);
    await page.waitForTimeout(600);
    const bad = await unnamed(page);
    expect(!bad.length, `VoiceOver, ${hash}: every button, field and image has a name${bad.length ? ` (${bad.length}: ${bad.slice(0, 2).join(' · ')})` : ''}`);
  }
  await page.goto(`${BASE}#/es/learn/es-2-2`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForFunction(() => window.__exercise);
  const inLesson = await unnamed(page);
  expect(!inLesson.length, `VoiceOver, in a lesson: everything has a name${inLesson.length ? ` (${inLesson.slice(0, 2).join(' · ')})` : ''}`);

  // ---------- The lesson: watermark, quick mute and the bird ----------
  const mark = await page.locator('.lesson-watermark').evaluate((e) => ({ o: Number(getComputedStyle(e).opacity), pe: getComputedStyle(e).pointerEvents }));
  expect(mark.o > 0 && mark.o <= 0.08 && mark.pe === 'none', `a faint logo behind the lesson (opacity ${mark.o}), never in the way`);
  await page.getByTestId('lesson-mute').click();
  let prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  expect(!prefs.sfx && !prefs.voice, 'quick mute: sounds and spoken feedback off');
  await page.getByTestId('lesson-mute').click();
  prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  expect(prefs.sfx && prefs.voice, 'and on again');
  const ex = await page.evaluate(() => window.__exercise);
  if (['meaning', 'listen', 'translate'].includes(ex.type)) {
    const right = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
    await page.locator('.options button').nth((right + 1) % ex.options.length).click();
    await page.getByRole('button', { name: 'Check' }).click();
    await page.locator('.banner .bird').waitFor();
    expect((await page.locator('.banner .bird').getAttribute('data-pose')) === 'oops', 'a wrong answer: the bird says “oops”');
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'A-oops.png' });
    await page.getByRole('button', { name: /Continue/ }).click();
  }
  // Right answers until it's done.
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: /complete/ }).count()) break;
    const e = await page.evaluate(() => window.__exercise);
    if (['meaning', 'listen', 'translate'].includes(e.type)) {
      await page.locator('.options button').nth(e.type === 'meaning' ? e.options.indexOf(e.item.en) : e.options.findIndex((o) => o.id === e.item.id)).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (e.type === 'tiles') {
      const used = new Set();
      for (const w of e.item.tiles) {
        const j = e.bank.findIndex((b, k) => b === w && !used.has(k));
        used.add(j);
        await page.locator('.bank button').nth(j).click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (e.type === 'match') {
      for (const item of e.items) {
        await page.locator('.match-col').nth(0).getByRole('button', { name: item.text, exact: true }).first().click();
        await page.locator('.match-col').nth(1).getByRole('button', { name: item.en, exact: true }).first().click();
      }
    } else if (e.type === 'type') {
      await page.locator('textarea').fill(e.item.text);
      await page.getByRole('button', { name: 'Check' }).click();
    }
    await page.locator('.banner').waitFor({ timeout: 10000 });
    const pose = await page.locator('.banner .bird').getAttribute('data-pose');
    if (i === 0) {
      expect(['cheer', 'streak'].includes(pose), `a right answer: the bird cheers (${pose})`);
      await page.waitForTimeout(900);
      await page.screenshot({ path: 'A-cheer.png' });
    }
    if (pose === 'streak') await page.screenshot({ path: 'A-streak.png' });
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.waitForTimeout(150);
  }
  await page.getByRole('heading', { name: /complete/ }).waitFor({ timeout: 10000 });
  expect((await page.locator('.complete-bird').getAttribute('data-pose')) === 'dance', 'lesson complete: the bird dances');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'A-dance.png' });

  // ---------- Bigger text fits ----------
  for (const size of ['large', 'larger']) {
    await editProgress(page, (p, s) => ({ ...p, textSize: s }), size);
    for (const hash of ['#/es', '#/practice', '#/settings', '#/es/learn/es-2-3']) {
      await page.goto(`${BASE}${hash}`);
      await page.waitForTimeout(500);
      const fit = await page.evaluate(() => ({ zoom: getComputedStyle(document.body).zoom, wide: document.documentElement.scrollWidth - innerWidth }));
      expect(fit.wide <= 1, `text size ${size}, ${hash}: no sideways scrolling (zoom ${fit.zoom}, ${fit.wide}px over)`);
    }
    await page.goto(`${BASE}#/es`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `A-text-${size}.png` });
  }
  await editProgress(page, (p) => ({ ...p, textSize: 'default' }));

  // ---------- Reduce Motion: the bird stands still ----------
  const still = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p3 = await still.newPage();
  await p3.goto(`${BASE}#/`);
  await editProgress(p3, (p) => ({ ...p, lang: 'es', speaking: false, hearts: 5, heartsAt: Date.now() }));
  await p3.goto(`${BASE}#/es/learn/es-2-1`);
  await p3.getByRole('button', { name: 'Start', exact: true }).click();
  await p3.waitForFunction(() => window.__exercise);
  const e3 = await p3.evaluate(() => window.__exercise);
  if (['meaning', 'listen', 'translate'].includes(e3.type)) {
    await p3.locator('.options button').first().click();
    await p3.getByRole('button', { name: 'Check' }).click();
    await p3.locator('.banner .bird').waitFor();
    const moving = await p3.evaluate(() => [...document.querySelectorAll('.banner .bird, .banner .bird *')].filter((e) => getComputedStyle(e).animationName !== 'none').length);
    expect(moving === 0, `Reduce Motion: the bird in the banner stands still (${moving} moving)`);
  }
  await still.close();

  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  if (failures) process.exitCode = 1;
});
