// Portuguese (Brazil) and Italian: as complete as the other languages (course, tips, stories,
// reading, role-plays, culture, flirting, chants, phrasebook, coach), every line recorded, and
// working in the app: picking the language, a lesson, a story, a role-play, music, the
// phrasebook and the AI partner. Also: recordings download only for the languages you learn.
import { existsSync, readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
const json = (f) => JSON.parse(readFileSync(new URL(`../../shared/${f}.json`, import.meta.url), 'utf8'));
const audio = (path) => existsSync(new URL(`../../assets/audio/${path}`, import.meta.url));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

// ---------- Content: the same size as Spanish, and every line has its recording ----------
const es = { course: json('course/es'), tips: json('grammar/es').tips, stories: json('stories/es').stories, articles: json('reading/es').articles, scenarios: json('scenarios/es').scenarios, chants: json('chants/es').chants };
const phrases = json('phrases').topics.flatMap((t) => t.phrases);
const coach = json('feedback');
for (const lang of ['pt', 'it']) {
  const course = json(`course/${lang}`);
  const lessons = course.units.flatMap((u) => u.lessons);
  const items = lessons.flatMap((l) => l.items);
  const esLessons = es.course.units.flatMap((u) => u.lessons);
  expect(course.units.length === es.course.units.length && lessons.length === esLessons.length && items.length >= 470, `${lang}: ${course.units.length} units, ${lessons.length} lessons, ${items.length} words and phrases`);
  expect(course.units.map((u) => u.lessons.length).join() === es.course.units.map((u) => u.lessons.length).join(), `${lang}: the same outline, unit by unit`);
  const quizzes = lessons.filter((l) => l.quiz?.length === 3).length;
  expect(quizzes === 5, `${lang}: five culture lessons with a quiz`);
  const dating = course.units.filter((u) => ['u21', 'u22', 'u23'].includes(u.id)).flatMap((u) => u.lessons);
  const flirting = course.units.filter((u) => ['u24', 'u25', 'u26'].includes(u.id)).flatMap((u) => u.lessons);
  expect(dating.length === 6 && flirting.length === 6, `${lang}: dating and flirting (18+) units`);
  const tips = json(`grammar/${lang}`).tips;
  const ids = new Set(items.map((i) => i.id));
  expect(tips.length >= 30 && tips.every((t) => t.examples.every((e) => ids.has(e))), `${lang}: ${tips.length} grammar and culture tips, examples all in the course`);
  const stories = json(`stories/${lang}`).stories;
  const articles = json(`reading/${lang}`).articles;
  const scenarios = json(`scenarios/${lang}`).scenarios;
  const chants = json(`chants/${lang}`).chants;
  expect(stories.length === es.stories.length && articles.length === es.articles.length, `${lang}: ${stories.length} stories and dialogues, ${articles.length} reading articles`);
  expect(scenarios.length === es.scenarios.length && new Set(scenarios.map((s) => s.topic)).size === new Set(es.scenarios.map((s) => s.topic)).size, `${lang}: ${scenarios.length} role-plays in every topic`);
  expect(chants.length === es.chants.length, `${lang}: ${chants.length} chants and songs`);
  expect(phrases.every((p) => typeof p[lang] === 'string' && p[lang]), `${lang}: the whole phrasebook`);
  expect(Object.keys(coach[lang] ?? {}).join() === Object.keys(coach.es).join(), `${lang}: the coach's lines`);
  const missing = [
    ...items.filter((i) => !audio(`course/${lang}/${i.id}.mp3`)).map((i) => i.id),
    ...[...stories, ...articles].flatMap((s) => s.lines.map((_, n) => `${s.id}-${n}`)).filter((n) => !audio(`stories/${lang}/${n}.mp3`)),
    ...scenarios.flatMap((s) => s.lines.map((_, n) => `${s.id}-${n}`)).filter((n) => !audio(`scenarios/${lang}/${n}.mp3`)),
    ...chants.flatMap((c) => c.lines.map((_, n) => `${c.id}-${n}`)).filter((n) => !audio(`chants/${lang}/${n}.mp3`)),
    ...phrases.filter((p) => !audio(`${lang}/${p.id}.mp3`)).map((p) => p.id),
    ...Object.entries(coach[lang]).flatMap(([cat, lines]) => lines.map((_, n) => `${cat}-${n}`)).filter((n) => !audio(`feedback/${lang}/${n}.mp3`)),
  ];
  expect(!missing.length, `${lang}: every line has its recording${missing.length ? ` (missing ${missing.length}: ${missing.slice(0, 5).join(', ')}…)` : ''}`);
  const timings = JSON.parse(readFileSync(new URL(`../../assets/audio/chants/${lang}/timings.json`, import.meta.url), 'utf8'));
  expect(chants.every((c) => c.lines.every((_, n) => timings[`${c.id}-${n}`]?.length)), `${lang}: karaoke word timings for every chant line`);
}

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const talks = [];
  await context.route(`${API}*`, (route) => {
    talks.push(route.request().postDataJSON());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Oi! Tudo bem com você?', translation: 'Hi! How are you?', newWords: [], done: false, suggestion: { text: 'Tudo bem, e você?', en: 'All good, and you?' }, audio: null, voice: 'device' }),
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', speaking: false, celebrated: null, hearts: 5, heartsAt: Date.now() }));

  // ---------- Picking the language ----------
  await page.goto(`${BASE}#/es`);
  await page.getByTestId('flag-btn').click();
  const tiles = await page.locator('.lang-tile').allInnerTexts();
  expect(tiles.some((t) => /Portuguese/.test(t) && /Português/.test(t)) && tiles.some((t) => /Italian/.test(t) && /Italiano/.test(t)), `the language picker has Portuguese and Italian (${tiles.length} languages)`);
  expect((await page.locator('.lang-tile-pt .flag, .lang-tile-it .flag').count()) === 2, 'with the Brazilian and Italian flags');
  await page.screenshot({ path: 'NL-picker.png' });
  await page.locator('.lang-tile-pt').click();
  await page.getByTestId('level-start').waitFor();
  expect(page.url().endsWith('#/pt'), 'Portuguese opens its own path');
  expect(/The sounds of Portuguese/.test(await page.locator('main').innerText()), 'starting with the sounds of Portuguese');
  await page.screenshot({ path: 'NL-pt-path.png' });

  // ---------- A Portuguese lesson ----------
  await page.goto(`${BASE}#/pt/learn/pt-2-1`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  let done = false;
  for (let i = 0; i < 30 && !done; i++) {
    await page.waitForFunction(() => window.__exercise);
    const ex = await page.evaluate(() => window.__exercise);
    if (['meaning', 'listen', 'translate'].includes(ex.type)) {
      const k = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
      await page.locator('.options button').nth(k).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'tiles') {
      const used = new Set();
      for (const w of ex.item.tiles) {
        const j = ex.bank.findIndex((b, n) => b === w && !used.has(n));
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
    }
    await page.locator('.banner').waitFor({ timeout: 10000 });
    if (i === 0) await page.screenshot({ path: 'NL-pt-lesson.png' });
    await page.getByRole('button', { name: /Continue/ }).click();
    done = (await page.getByRole('heading', { name: /complete/ }).count()) > 0;
  }
  expect(done, 'a Portuguese lesson, start to finish');
  const cheer = await page.locator('.cheer').innerText().catch(() => '');
  expect(/[A-Za-zÀ-ú]/.test(cheer) && !/¡/.test(cheer), `the coach cheers in Portuguese (or English) (“${cheer.split('\n')[0]}”)`);

  // A grammar tip, a story with tap-to-translate, a role-play, music and the phrasebook.
  await page.goto(`${BASE}#/pt/learn/pt-2-4`);
  await page.locator('.tip-open').click();
  const tip = await page.getByTestId('grammar-tip').innerText({ timeout: 5000 }).catch(() => '');
  expect(/O and a/.test(tip), `a Portuguese grammar tip (“${tip.split('\n')[0]}”)`);
  await page.goto(`${BASE}#/pt/stories/pt-cat`);
  await page.locator('.word', { hasText: 'gato' }).first().click();
  expect(/cat/.test(await page.getByTestId('word-sheet').innerText()), 'a Portuguese story: tap a word for its meaning');
  await page.goto(`${BASE}#/it/roleplay/it-food-1`);
  await page.getByText('Al bar').first().waitFor({ timeout: 5000 }).catch(() => {});
  expect(/Al bar/.test(await page.locator('main').innerText()), 'an Italian role-play');
  await page.screenshot({ path: 'NL-it-roleplay.png' });
  await page.goto(`${BASE}#/it/music`);
  await page.getByText('Ciao, ciao').first().waitFor({ timeout: 5000 }).catch(() => {});
  const songs = await page.locator('main').innerText();
  expect(/Ciao, ciao/.test(songs) && /Daje, raga/.test(songs), 'Italian chants and songs');
  await page.screenshot({ path: 'NL-it-music.png' });
  await page.goto(`${BASE}#/it/greetings`);
  await page.getByText('Ciao').first().waitFor({ timeout: 5000 }).catch(() => {});
  expect(/Ciao/.test(await page.locator('main').innerText()), 'the Italian phrasebook');
  await page.goto(`${BASE}#/it/reading`);
  await page.getByText('Un parco nuovo').first().waitFor({ timeout: 5000 }).catch(() => {});
  expect(/Un parco nuovo/.test(await page.locator('main').innerText()), 'Italian reading practice');

  // ---------- The AI partner in Portuguese (the phone reads the reply, no "voice resting" note) ----------
  await page.goto(`${BASE}#/pt/talk`);
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 15000 });
  expect(talks[0]?.lang === 'pt', 'the AI partner is asked in Portuguese');
  await page.waitForTimeout(800);
  expect((await page.getByTestId('talk-voice-note').count()) === 0, 'no AI voice for Portuguese: the phone reads it, without a warning');
  const spoken = await page.evaluate(() => window.__spoken);
  expect(spoken.some((t) => /Tudo bem/.test(t)), 'the phone voice reads the reply');

  // ---------- Recordings download per language ----------
  const packs = await (await page.request.get('http://localhost:4173/audio-packs.json')).json();
  const mb = (p) => Math.round(packs[p].bytes / 1e6);
  console.log(`  pack sizes: ${Object.keys(packs).map((p) => `${p} ${mb(p)} MB (${packs[p].files.length} files)`).join(', ')}`);
  expect(['es', 'fr', 'zh', 'pt', 'it', 'coach', 'en'].every((p) => packs[p]?.files.length > 0), 'a recordings pack for every language, the coach and hands-free English');
  const sw = await (await page.request.get('http://localhost:4173/sw.js')).text();
  expect(!/audio\/(es|pt|it)\//.test(sw) && /audio-pt/.test(sw), "recordings aren't in the app's precache; each language has its own cache");

  const fresh = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const p2 = await fresh.newPage();
  await p2.goto('http://localhost:4173/?test&packs#/');
  await editProgress(p2, (p) => ({ ...p, lang: 'pt', levelStart: { pt: 'sounds' } }));
  await p2.goto('http://localhost:4173/?test&packs#/pt');
  const ready = await p2
    .waitForFunction(async (n) => (await (await caches.open('audio-pt')).keys()).length >= n, packs.pt.files.length, { timeout: 120000, polling: 1000 })
    .then(() => true, () => false);
  expect(ready, `opening Portuguese downloads its recordings (${packs.pt.files.length} files, ${mb('pt')} MB)`);
  const others = await p2.evaluate(async () => Promise.all(['es', 'fr', 'zh', 'it'].map(async (l) => (await (await caches.open(`audio-${l}`)).keys()).length)));
  expect(others.every((n) => n === 0), `and nothing for the languages you don't learn (${others.join(', ')})`);
  await p2.goto('http://localhost:4173/?test&packs#/settings');
  await p2.getByTestId('pack-pt').waitFor();
  await p2.waitForFunction(() => document.querySelector('[data-testid=pack-pt]')?.dataset.ready === 'yes', null, { timeout: 10000 }).catch(() => {});
  expect(/Saved on this phone/.test(await p2.getByTestId('pack-pt').innerText()), `Settings: Portuguese audio saved (${(await p2.getByTestId('pack-pt').innerText()).split('\n').pop()})`);
  expect(/Not downloaded/.test(await p2.getByTestId('pack-it').innerText()), 'Settings: Italian not downloaded');
  await p2.getByTestId('offline').screenshot({ path: 'NL-offline.png' });
  // Removing a language you don't learn frees its space; progress stays.
  await p2.getByTestId('pack-it').getByRole('button', { name: /Download/ }).click();
  await p2.waitForFunction(() => document.querySelector('[data-testid=pack-it]')?.dataset.ready === 'yes', null, { timeout: 120000, polling: 1000 }).catch(() => {});
  const xpBefore = await p2.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).xp);
  p2.once('dialog', (d) => d.accept());
  await p2.getByTestId('pack-it').getByRole('button', { name: /Remove/ }).click();
  await p2.waitForFunction(() => /Not downloaded/.test(document.querySelector('[data-testid=pack-it]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {});
  expect(/Not downloaded/.test(await p2.getByTestId('pack-it').innerText()) && (await p2.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).xp)) === xpBefore, 'Remove frees a language’s recordings; progress is untouched');
  expect((await p2.getByTestId('pack-pt').getByRole('button', { name: /Remove/ }).count()) === 0, "the language you're learning can't be removed by mistake");
  await fresh.close();

  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  if (failures) process.exitCode = 1;
});
