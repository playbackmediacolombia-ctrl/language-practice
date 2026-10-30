// Every audio button, measured on an iPhone screen: the mic is 72×72 and round, speakers are round
// and at least 48×48 with a visible background, and neighbours are at least 8px apart (DESIGN.md).
// Usage: npm run test:e2e -- audiobuttons  (pictures in e2e/out/audiobuttons/)
import { mkdirSync, readFileSync } from 'node:fs';
import { ALL_CLASSES, devices, editProgress, fakeMic, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const DIR = new URL('./out/audiobuttons/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const DONE = JSON.parse(readFileSync(new URL('../../shared/course/es.json', import.meta.url), 'utf8')).units.slice(0, 3).flatMap((u) => u.lessons.map((l) => `es:${l.id}`));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

/** In the page: what every button with a mic or speaker on it measures. */
const measure = () => {
  const box = (e) => e.getBoundingClientRect();
  const shown = (e) => {
    const r = box(e);
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  };
  const buttons = [...document.querySelectorAll('button')].filter((b) => shown(b) && b.querySelector('svg[data-icon=speaker], svg[data-icon=mic]'));
  const out = { mics: [], speakers: [], tooClose: [] };
  for (const b of buttons) {
    const name = (b.getAttribute('aria-label') || b.innerText || b.className).trim().slice(0, 40);
    const r = box(b);
    if (b.classList.contains('mic')) {
      const cs = getComputedStyle(b);
      out.mics.push({ name, w: Math.round(r.width), h: Math.round(r.height), round: cs.borderRadius === '50%' });
      continue;
    }
    if (b.classList.contains('btn') && !b.classList.contains('sound-big')) continue; // a full-width button that says what it does ("Start talking")
    const round = b.querySelector('svg[data-icon=speaker]')?.closest('.audio-btn, .audio-disc, .sound-big, .option-speaker');
    const rr = round ? box(round) : { width: 0, height: 0 };
    const cs = round ? getComputedStyle(round) : null;
    out.speakers.push({ name, tapW: Math.round(r.width), tapH: Math.round(r.height), w: Math.round(rr.width), h: Math.round(rr.height), round: cs?.borderRadius === '50%', fill: !!cs && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' });
  }
  const audio = buttons.filter((b) => (!b.classList.contains('btn') || b.classList.contains('sound-big')) && !b.closest('.header')); // the sticky header floats over what scrolls under it
  for (let i = 0; i < audio.length; i++)
    for (let j = i + 1; j < audio.length; j++) {
      const [a, c] = [box(audio[i]), box(audio[j])];
      const dx = Math.max(a.left - c.right, c.left - a.right);
      const dy = Math.max(a.top - c.bottom, c.top - a.bottom);
      if (Math.max(dx, dy) < 8) out.tooClose.push(`${audio[i].innerText || audio[i].getAttribute('aria-label')} / ${audio[j].innerText || audio[j].getAttribute('aria-label')} (${Math.round(Math.max(dx, dy))}px)`);
    }
  return out;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await fakeMic(context);
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    if (/whisper\.worker|module script/.test(e.message)) return; // leaving a screen while the speech model starts up
    console.log('PAGE ERROR', e.message);
    failures++;
  });
  const seen = { mic: 0, speaker: 0 };
  const audit = async (label, shot = true) => {
    await page.waitForTimeout(500);
    const m = await page.evaluate(measure);
    seen.mic += m.mics.length;
    seen.speaker += m.speakers.length;
    const badMic = m.mics.filter((x) => x.w !== 72 || x.h !== 72 || !x.round);
    const badSp = m.speakers.filter((x) => x.tapW < 48 || x.tapH < 48 || x.w < 48 || x.h < 48 || !x.round || !x.fill);
    expect(!badMic.length, `${label}: mic 72×72 and round (${m.mics.length})${badMic.length ? ' ' + JSON.stringify(badMic) : ''}`);
    expect(!badSp.length, `${label}: speakers round, 48+, filled (${m.speakers.length})${badSp.length ? ' ' + JSON.stringify(badSp).slice(0, 400) : ''}`);
    expect(!m.tooClose.length, `${label}: at least 8px apart${m.tooClose.length ? ' ' + m.tooClose.slice(0, 4).join('; ') : ''}`);
    if (shot) await page.screenshot({ path: `${DIR}${label.replace(/\W+/g, '-')}.png` });
  };

  await page.goto(`${BASE}#/`);
  await page.evaluate(() => localStorage.setItem('whisper-ready', 'base'));
  await editProgress(page, (p, [done, classes]) => ({ ...p, lang: 'es', levelStart: { es: 'sounds', zh: 'sounds' }, classes: {}, lessons: Object.fromEntries(done.map((k) => [k, 1])), celebrated: null, speakFirst: { es: true } }), [DONE, ALL_CLASSES]);

  // Day 1, with the mic listening: the pulsing ring.
  await page.goto(`${BASE}#/es/day1/speak`);
  await page.getByTestId('day1-lesson').waitFor();
  await page.getByTestId('day1-next').click(); // welcome
  await page.getByTestId('day1-next').click(); // opening
  await page.getByTestId('speak-coach').waitFor();
  await audit('Day 1 Listen and Speak');
  const center = await page.evaluate(() => {
    const b = document.querySelector('.mic').getBoundingClientRect();
    const p = document.querySelector('.coach').getBoundingClientRect();
    return Math.abs(b.left + b.width / 2 - (p.left + p.width / 2));
  });
  expect(center <= 1, `the mic is centered (${center}px off)`);
  await page.getByTestId('coach-mic').click();
  await page.locator('.mic.on').waitFor({ timeout: 10000 });
  const ring = await page.evaluate(() => getComputedStyle(document.querySelector('.mic.on'), '::before').animationName);
  expect(ring === 'ring', `a pulsing ring while it's listening (${ring})`);
  await audit('Mic listening');
  await page.getByRole('button', { name: 'Quit lesson' }).click();

  for (const [label, hash, wait] of [
    ['Day 1 First Words', '#/es/day1/words', 'day1-lesson'],
    ['Day 1 Tones', '#/zh/day1/sounds', 'day1-lesson'],
    ['Class', '#/es/class/u4', 'class'],
    ['Listen and repeat', '#/es/greetings/practice', 'speak-coach'],
    ['Flashcards', '#/es/greetings/flashcards', 'speak-coach'],
    ['Phrasebook', '#/es/greetings', null],
    ['Notebook', '#/es/notebook', null],
  ]) {
    await page.goto(`${BASE}${hash}`);
    await page.reload(); // a hash-only change can lose to the last screen's transition
    if (wait) await page.getByTestId(wait).waitFor();
    await page.waitForTimeout(400);
    for (let i = 0; label.startsWith('Day 1') && i < 6 && !(await page.getByTestId('day1-word').or(page.locator('[data-testid=speak-coach]')).first().isVisible()); i++) await page.getByTestId('day1-next').click();
    if (label === 'Class') {
      await page.getByTestId('class-next').click();
      await page.getByTestId('class-word').waitFor();
    }
    await audit(label);
  }

  // Practice: a tap exercise's speakers, then a spoken one.
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, speakFirst: {}, classes: { ...p.classes, 'es:u4': 1 } }));
  await page.goto(`${BASE}#/es/learn/es-4-1`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('.prompt').first().waitFor();
  await audit('Lesson tap exercise');

  // Role-play, and Talk's intro; a story with its line buttons.
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p, all) => ({ ...p, classes: all }), ALL_CLASSES);
  const scenarios = JSON.parse(readFileSync(new URL('../../shared/scenarios/es.json', import.meta.url), 'utf8'));
  await page.goto(`${BASE}#/es/roleplay/${(scenarios.scenarios ?? scenarios)[0].id}`);
  await page.getByTestId('need-ready').or(page.getByRole('button', { name: 'Start', exact: false }).first()).first().waitFor();
  await page.getByTestId('need-ready').click({ timeout: 2000 }).catch(() => {}); // the harness may have tapped it already
  await page.getByRole('button', { name: /^Start/ }).first().click();
  await page.getByTestId('turn-mic').or(page.getByTestId('turn-next')).first().waitFor({ timeout: 60000 });
  await audit('Role-play');
  const stories = JSON.parse(readFileSync(new URL('../../shared/stories/es.json', import.meta.url), 'utf8'));
  await page.goto(`${BASE}#/es/stories/${stories.stories[0].id}`);
  await page.getByTestId('need-ready').or(page.getByTestId('shadow-start')).first().waitFor();
  await page.getByTestId('need-ready').click({ timeout: 2000 }).catch(() => {}); // the harness may have tapped it already
  await page.getByTestId('shadow-start').waitFor();
  await audit('Story');

  expect(seen.mic >= 5 && seen.speaker >= 10, `measured real buttons (${seen.mic} mics, ${seen.speaker} speakers)`);
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : 'ALL PASS');
  if (failures) process.exitCode = 1;
}, { minutes: 10 });
