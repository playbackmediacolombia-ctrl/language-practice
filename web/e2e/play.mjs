// Practice › Play: adventures, phone calls, text chats, teach the bird, spot the mistake,
// missions and debates, in Spanish, with a stand-in for the AI Worker. Answers are typed (the
// speech model isn't downloaded here; the AnswerBar is the same either way).
import { readFileSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
const DATA = JSON.parse(readFileSync(new URL('../../shared/play/es.json', import.meta.url), 'utf8'));
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const xp = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).xp ?? 0);

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  const requests = [];
  await context.route('**/__talk/*', async (route) => {
    const url = route.request().url();
    const body = route.request().postDataJSON();
    requests.push({ url, body });
    if (url.endsWith('/judge') && body.kind === 'choose') return route.fulfill({ json: { choice: 1 } });
    if (url.endsWith('/judge')) {
      const good = /puerta/.test(body.said);
      return route.fulfill({ json: { understood: good, reply: good ? '¡Claro, la llave!' : 'Mmm, ¿otra pista?', translation: good ? 'Of course, the key!' : 'Hmm, another clue?', correction: good ? 'Es una cosa para abrir la puerta.' : '', why: good ? 'Small fix.' : '' } });
    }
    const reply = body.mode === 'text' ? { reply: 'Jaja sii 😂 nos vemos!!', translation: 'Haha yess 😂 see you!!' } : { reply: 'Buenas tardes, ¿en qué le ayudo?', translation: 'Good afternoon, how can I help?' };
    return route.fulfill({ json: { ...reply, correction: { corrected: '', explanation: '' }, newWords: [], done: false, suggestion: { text: 'Hola', en: 'Hi' }, audio: null, voice: 'off' } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${e.message} @ ${page.url().split('#')[1]}`));
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', levelStart: { es: 'sounds' }, celebrated: null }));

  // ---------- The hub ----------
  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('play-card').click();
  await page.getByTestId('play-adventure').waitFor();
  const kinds = await page.locator('[data-testid^=play-]').count();
  expect(kinds === 7, `Play: seven kinds of activity (${kinds})`);
  await page.screenshot({ path: 'P-hub.png' });

  // ---------- Adventure: steer by what you say ----------
  await page.getByTestId('play-adventure').click();
  await page.getByTestId('play-adventure-market').click();
  await page.getByTestId('adventure-start').click();
  await page.getByTestId('adventure-scene').waitFor();
  const s1 = await page.evaluate(() => window.__scene);
  expect(s1.id === 's1' && s1.choices.length === 2, 'adventure: the first scene with two choices');
  expect((await page.getByTestId('character').count()) === 1, 'adventure: a guide character tells the story');
  // Typed a bit differently from the choice: still picked (fuzzy match).
  await page.getByTestId('answer-input').fill(s1.choices[1].replace(/[.,¡!¿?]/g, '').toLowerCase());
  await page.getByTestId('answer-send').click();
  await page.waitForFunction(() => window.__scene.id !== 's1');
  expect((await page.evaluate(() => window.__scene.id)) === 's3', 'adventure: what you said picks the matching path (juice → s3)');
  // Something no choice says: online, the AI works out which one you meant.
  await page.getByTestId('answer-input').fill('el morado me gusta más');
  await page.getByTestId('answer-send').click();
  await page.waitForFunction(() => window.__scene.id !== 's3');
  expect(requests.some((r) => r.url.endsWith('/judge') && r.body.kind === 'choose'), 'adventure: an answer in your own words goes to the AI');
  const before = await xp(page);
  for (let i = 0; i < 6; i++) {
    const sc = await page.evaluate(() => window.__scene);
    if (sc.end) break;
    await page.getByTestId('choice-0').click();
    await page.waitForFunction((id) => window.__scene.id !== id, sc.id);
  }
  await page.getByTestId('play-done').waitFor();
  expect((await xp(page)) > before, `adventure: an ending earns XP (+${(await xp(page)) - before})`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'P-adventure-end.png' });

  // ---------- Phone call: it rings, you pick up, you handle it ----------
  await page.goto(`${BASE}#/es/play/call/clinic`);
  await page.getByTestId('call-start').click();
  await page.getByTestId('call-ringing').waitFor();
  await page.screenshot({ path: 'P-call-ringing.png' });
  await page.getByTestId('call-answer').click();
  await page.getByTestId('call-on').waitFor();
  expect((await page.getByTestId('call-bar').count()) === 1, 'call: answered, with the call timer and hang-up');
  const clinic = DATA.calls.find((c) => c.id === 'clinic');
  for (let guard = 0; guard < 12; guard++) {
    if (await page.getByTestId('play-done').isVisible()) break;
    await page.waitForFunction(() => window.__callLine?.who === 'you' || document.querySelector('[data-testid=play-done]'), null, { timeout: 30000 });
    if (await page.getByTestId('play-done').isVisible()) break;
    const line = await page.evaluate(() => window.__callLine);
    await page.getByTestId('answer-input').fill(line.text);
    await page.getByTestId('answer-send').click();
    await page.waitForFunction((s) => window.__callLine?.step !== s || document.querySelector('[data-testid=play-done]'), line.step, { timeout: 30000 });
  }
  await page.getByTestId('play-done').waitFor({ timeout: 30000 });
  expect(/Call ended/.test(await page.getByTestId('play-done').innerText()), `call: all ${clinic.lines.filter((l) => l.who === 'you').length} of your lines said, call ended`);
  // A live call: the AI is the caller.
  await page.goto(`${BASE}#/es/play/call/taxi`);
  await page.getByTestId('call-live').click();
  await page.getByTestId('call-ringing').waitFor();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 20000 });
  expect(requests.at(-1).body.mode === 'call' && /taxi/i.test(requests.at(-1).body.scenario.them), 'live call: the AI plays the taxi company');
  expect((await page.getByTestId('call-bar').count()) === 1, 'live call: on the phone screen, with hang-up');
  await page.screenshot({ path: 'P-call-live.png' });

  // ---------- Text chat ----------
  await page.goto(`${BASE}#/es/play/chat/plans`);
  await page.getByTestId('chat-replies').waitFor();
  const slang = page.getByTestId('slang').first();
  await slang.click();
  expect(/what's up/.test(await page.getByTestId('slang-meaning').innerText()), 'chat: tap slang to see what it means (q más)');
  const wrongOne = page.getByTestId('chat-option').filter({ hasText: 'señora' });
  await wrongOne.click();
  expect(/formal/.test(await page.getByTestId('chat-why').innerText()), 'chat: a reply that does not fit says why');
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('chat-done').isVisible()) break;
    await page.getByTestId('chat-replies').waitFor({ timeout: 10000 }).catch(() => {});
    if (await page.getByTestId('chat-done').isVisible()) break;
    const right = await page.evaluate(() => window.__chatTurn?.right);
    if (!right) {
      await page.waitForTimeout(400);
      continue;
    }
    await page.getByTestId('chat-option').filter({ hasText: right }).click();
    await page.waitForTimeout(500);
  }
  await page.getByTestId('chat-done').waitFor({ timeout: 15000 });
  expect((await page.getByTestId('chat-you').count()) === 3, 'chat: your three replies sent, with ticks');
  await page.getByTestId('chat-input').fill('nos vemos a las 8');
  await page.getByTestId('chat-send').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=chat-them]').length >= 5);
  expect(requests.at(-1).body.mode === 'text' && requests.at(-1).body.name === 'Vale', 'chat: then keep texting with the AI, as Vale');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'P-chat.png' });

  // ---------- Teach the bird ----------
  await page.goto(`${BASE}#/es/play/teach/1`);
  await page.getByTestId('teach-start').click();
  await page.getByTestId('teach-word').waitFor();
  await page.getByTestId('answer-input').fill('Es para abrir la puerta de la casa');
  await page.getByTestId('answer-send').click();
  await page.getByTestId('teach-next').waitFor();
  expect(/llave/.test(await page.getByTestId('bird-says').innerText()), 'teach (online): the AI understood, and the bird says the word back');
  expect((await page.getByTestId('teach-fix').count()) === 1, 'teach: a gentle fix of your sentence');
  await page.getByTestId('teach-next').click();
  // Offline: the key ideas decide.
  await context.setOffline(true);
  await page.getByTestId('answer-input').fill('el paraguas');
  await page.getByTestId('answer-send').click();
  await page.waitForTimeout(300);
  expect((await page.getByTestId('teach-next').count()) === 0, 'teach (offline): just saying the word is not explaining it');
  await page.getByTestId('answer-input').fill('Lo usas cuando hay lluvia para no mojarte');
  await page.getByTestId('answer-send').click();
  await page.getByTestId('teach-next').waitFor();
  expect(true, 'teach (offline): an explanation with the key idea (lluvia) is understood');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'P-teach.png' });
  await context.setOffline(false);

  // ---------- Spot the mistake ----------
  await page.goto(`${BASE}#/es/play/spot/1`);
  await page.getByTestId('spot-start').click();
  await page.getByTestId('spot-sentence').waitFor();
  let spot = await page.evaluate(() => window.__spot);
  await page.getByTestId(`spot-word-${spot.bad === 0 ? 1 : 0}`).click();
  expect(/fine/.test(await page.getByTestId('spot-sentence').innerText()), 'spot: tapping a word that is fine says so');
  await page.getByTestId(`spot-word-${spot.bad}`).click();
  await page.getByTestId('spot-fixes').waitFor();
  await page.getByTestId('spot-fix').filter({ hasText: spot.fix }).first().click();
  expect((await page.getByTestId('spot-why').innerText()).length > 10, 'spot: the right fix, and why');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'P-spot.png' });
  for (let i = 0; i < 6; i++) {
    await page.getByTestId('spot-next').click();
    if (await page.getByTestId('play-done').isVisible().catch(() => false)) break;
    await page.getByTestId('spot-sentence').waitFor({ timeout: 3000 }).catch(() => {});
    if (await page.getByTestId('play-done').isVisible()) break;
    spot = await page.evaluate(() => window.__spot);
    await page.getByTestId(`spot-word-${spot.bad}`).click();
    await page.getByTestId('spot-fix').filter({ hasText: spot.fix }).first().click();
  }
  await page.getByTestId('play-done').waitFor();
  expect(true, 'spot: a round of five finished');

  // ---------- A real-life mission ----------
  await page.goto(`${BASE}#/es/play/mission/coffee`);
  const x0 = await xp(page);
  await page.getByTestId('mission-claim').click();
  await page.getByTestId('play-done').waitFor();
  expect((await xp(page)) - x0 === 20, 'mission: checked off for +20 bonus XP');
  await page.goto(`${BASE}#/es/play/mission`);
  await page.getByTestId('play-mission-coffee').click();
  await page.getByTestId('mission').waitFor();
  expect((await page.getByTestId('mission-claim').count()) === 0 && (await page.getByTestId('mission-done').count()) === 1, 'mission: the bonus is once (it shows when you did it)');

  // ---------- Debate: Fluent only ----------
  await page.goto(`${BASE}#/es/play/debate`);
  await page.getByTestId('debate-phrases').waitFor();
  await page.screenshot({ path: 'P-debate-locked.png' });
  expect((await page.getByTestId('debate-locked').count()) === 1, 'debate: locked before the Fluent level, phrases to practise');
  await editProgress(page, (p) => ({ ...p, levelStart: { es: 'fluent' } }));
  await page.goto(`${BASE}#/es/play/debate`);
  await page.getByTestId('debate-cats').click();
  await page.getByTestId('debate-for').click();
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 20000 });
  const d = requests.at(-1).body;
  expect(d.mode === 'debate' && d.side === 'against' && /Cats/.test(d.topic) && d.level === 'Fluent', 'debate: you agree, so the AI argues against, at Fluent level');
  await page.screenshot({ path: 'P-debate.png' });

  // ---------- Every language: content, recordings, pinyin ----------
  for (const lang of ['fr', 'zh', 'pt', 'it']) {
    const data = JSON.parse(readFileSync(new URL(`../../shared/play/${lang}.json`, import.meta.url), 'utf8'));
    await page.goto(`${BASE}#/${lang}/play`);
    await page.getByTestId('play-adventure').waitFor();
    await page.goto(`${BASE}#/${lang}/play/adventure/market`);
    await page.getByTestId('adventure-start').click();
    await page.getByTestId('adventure-scene').waitFor();
    await page.waitForFunction(() => window.__played);
    const played = await page.evaluate(() => window.__played);
    const first = await page.evaluate(() => window.__scene.choices[0]);
    await page.getByTestId('answer-input').fill(first);
    await page.getByTestId('answer-send').click();
    await page.waitForFunction(() => window.__scene.id !== 's1');
    const counts = `${data.adventures.length} adventures, ${data.calls.length} calls, ${data.chats.length} chats, ${data.teach.words.length} words, ${data.spot.length} mistakes, ${data.missions.length} missions, ${data.debate.topics.length} debates`;
    expect(/\.mp3/.test(played) && !played.startsWith('tts:'), `${lang}: recorded narration, and saying a choice moves the story on (${counts})`);
    await page.goto(`${BASE}#/${lang}/play/spot/2`);
    await page.getByTestId('spot-start').click();
    await page.getByTestId('spot-sentence').waitFor();
    if (lang === 'zh') expect((await page.locator('.spot-pinyin').count()) > 3, 'zh: pinyin under each word in Spot the mistake');
    await page.goto(`${BASE}#/${lang}/play/chat/gossip`);
    await page.getByTestId('chat-replies').waitFor({ timeout: 15000 });
    expect((await page.getByTestId('chat-them').count()) === 1, `${lang}: the gossip chat starts`);
  }

  // ---------- Characters: each role its own look; credits ----------
  await page.goto(`${BASE}#/gallery`);
  await page.getByTestId('gallery-idle').waitFor();
  const looks = await page.locator('[data-testid=gallery-idle] .character').evaluateAll((els) => new Set(els.map((e) => e.getAttribute('style'))).size);
  const count = await page.locator('[data-testid=gallery-idle] .character').count();
  expect(count >= 20 && looks === count, `characters: ${count} roles, each with its own skin, hair and clothes (${looks} different)`);
  await page.goto(`${BASE}#/settings`);
  await page.getByTestId('credits').scrollIntoViewIfNeeded();
  expect(/Characters: Open Peeps by Pablo Stanley \(CC0\), via DiceBear/.test(await page.getByTestId('credits').innerText()) && (await page.getByTestId('credits').locator('a').count()) >= 4, 'Settings › About › Credits: “Characters: Open Peeps by Pablo Stanley (CC0), via DiceBear”, with links');
  await page.getByTestId('credits').screenshot({ path: 'P-credits.png' });

  // ---------- Dark mode and Reduce Motion ----------
  const dark = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme: 'dark', reducedMotion: 'reduce' });
  const p2 = await dark.newPage();
  await p2.goto(`${BASE}#/es/play/chat/late`);
  await p2.getByTestId('chat-replies').waitFor();
  const moving = await p2.evaluate(() => [...document.querySelectorAll('.chat-bubble, .character *')].filter((e) => getComputedStyle(e).animationName !== 'none').length);
  expect(moving === 0, `Reduce Motion: nothing moves in a chat (${moving})`);
  await p2.screenshot({ path: 'P-chat-dark.png' });
  await p2.goto(`${BASE}#/es/play/call/delivery`);
  await p2.getByTestId('call-start').click();
  await p2.getByTestId('call-ringing').waitFor();
  await p2.screenshot({ path: 'P-call-dark.png' });
  await dark.close();

  expect(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  if (failures) process.exitCode = 1;
});
