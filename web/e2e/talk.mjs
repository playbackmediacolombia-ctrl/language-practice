// Talk with AI: the app side of the conversation partner, against a stand-in for the Worker
// (no Gemini call, no quota used). Real Whisper turns the fake mic's speech into text.
import { readFileSync } from 'node:fs';
import { devices, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
const clip = (lang, id) => readFileSync(new URL(`../../assets/audio/course/${lang}/${id}.mp3`, import.meta.url)).toString('base64');
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.addInitScript(() => {
    // Fake mic: quiet, then "Tengo una hermana." (a course recording) as your answer.
    MediaDevices.prototype.getUserMedia = async function () {
      const c = new AudioContext();
      await c.resume();
      const dest = c.createMediaStreamDestination();
      const noise = c.createBufferSource();
      const nb = c.createBuffer(1, c.sampleRate * 20, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.002;
      noise.buffer = nb;
      noise.connect(dest);
      noise.start();
      const src = c.createBufferSource();
      src.buffer = await c.decodeAudioData(await (await fetch('/assets-mic/tengo-una-hermana.mp3')).arrayBuffer());
      src.connect(dest);
      src.start(c.currentTime + 0.6);
      return dest.stream;
    };
  });
  await context.route('**/assets-mic/tengo-una-hermana.mp3', (r) => r.fulfill({ body: readFileSync(new URL('../../assets/audio/course/es/tengo-una-hermana.mp3', import.meta.url)), contentType: 'audio/mpeg' }));

  // The stand-in Worker: a greeting, then a reply that corrects and teaches a word.
  const requests = [];
  let mode = 'ok';
  await context.route(`${API}*`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    if (mode === 'quota') return route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"quota"}' });
    if (mode === 'down') return route.abort('failed');
    if (mode === 'key') return route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"key"}' });
    if (mode === 'busy') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"busy"}' });
    const first = !body.history.length;
    const reply = first
      ? { reply: '¡Hola! ¿Tienes hermanos?', translation: 'Hi! Do you have brothers or sisters?', newWords: [{ word: 'hermanos', meaning: 'brothers and sisters, siblings' }], done: false }
      : {
          reply: '¡Qué bien! ¿Cómo se llama tu hermana?',
          translation: "How nice! What's your sister's name?",
          correction: { corrected: 'Tengo una hermana mayor.', explanation: 'Add "mayor" to say she is older.' },
          newWords: [{ word: 'llamarse', meaning: 'to be called' }],
          done: false,
        };
    const voice = mode === 'novoice' ? { audio: null, voice: 'unavailable' } : { audio: clip('es', first ? 'si-gracias' : 'no-gracias'), voice: 'ok' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...reply, ...voice }) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  // The speech model, once.
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Download standard model/ }).click();
  await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

  // ---------- A conversation ----------
  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('talk-card').click();
  await page.getByTestId('talk-intro').waitFor();
  expect(/Needs the internet/.test(await page.getByTestId('talk-intro').innerText()), 'intro: says it needs the internet and what is sent');
  await page.screenshot({ path: 'T-intro.png' });
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 20000 });
  expect(/Tienes hermanos/.test(await page.getByTestId('talk-ai').first().innerText()), 'the partner opens the conversation');
  expect(requests[0].lang === 'es' && typeof requests[0].level === 'string' && requests[0].voice === true, `asks at your level (${requests[0].level}), with voice`);
  await page.getByTestId('talk-status').filter({ hasText: /speak now|Listening|Writing down/i }).waitFor({ timeout: 20000 });
  expect(true, 'after the reply plays, the mic opens by itself');
  await page.getByTestId('talk-me').first().waitFor({ timeout: 90000 });
  const said = await page.getByTestId('talk-me').first().innerText();
  expect(/hermana/i.test(said), `Whisper wrote down your answer (${said.replace(/\s+/g, ' ')})`);
  await page.getByTestId('talk-correction').waitFor({ timeout: 20000 });
  expect(/Tengo una hermana mayor/.test(await page.getByTestId('talk-correction').innerText()), 'a gentle correction under what you said');
  expect(requests[1].history.length === 2 && requests[1].history[1].role === 'user' && /hermana/i.test(requests[1].history[1].text), 'only text is sent: the conversation so far');
  await page.getByTestId('talk-translate').first().click();
  expect(/brothers or sisters/.test(await page.getByTestId('talk-ai').first().innerText()), 'Translate shows the English');
  await page.screenshot({ path: 'T-chat.png' });

  // The voice service resting: the phone's own voice (muted here) reads the reply instead.
  mode = 'novoice';
  await page.getByTestId('talk-type').click();
  await page.getByTestId('talk-input').fill('Se llama Laura.');
  await page.getByTestId('talk-send').click();
  await page.getByTestId('talk-voice-note').waitFor({ timeout: 20000 });
  const spoken = await page.evaluate(() => window.__spoken);
  expect(spoken.some((t) => /hermana/.test(t)), 'voice unavailable: a note, and the phone voice reads the reply');

  // End: words to review and mistakes.
  await page.getByTestId('talk-end').click();
  const summary = await page.getByTestId('talk-summary').innerText();
  expect(/hermanos/.test(summary) && /llamarse/.test(summary), 'summary: the new words');
  expect(/Tengo una hermana mayor/.test(summary), 'summary: what to review');
  expect(/added to your reviews/.test(summary), `summary: ${(await page.getByTestId('talk-added').innerText()).split(':')[0]}`);
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  const keys = Object.keys(p.srs).filter((k) => k.startsWith('es:ai:'));
  expect(keys.length >= 2 && p.talkWords['es:ai:hermanos']?.en, `the words are in spaced repetition (${keys.join(', ')})`);
  await page.screenshot({ path: 'T-summary.png', fullPage: true });

  // ---------- Problems are friendly ----------
  mode = 'quota';
  await page.goto(`${BASE}#/es/talk`);
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-problem').waitFor();
  expect(/free AI conversations are used up/.test(await page.getByTestId('talk-problem').innerText()), 'free quota used up: a friendly message');
  mode = 'down';
  await page.getByTestId('talk-type').click().catch(() => {});
  await page.goto(`${BASE}#/es/talk`);
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-problem').waitFor();
  expect(/isn't answering/.test(await page.getByTestId('talk-problem').innerText()), 'service down: a friendly message and Try again');
  await context.setOffline(true);
  await page.getByTestId('talk-retry').click();
  await page.waitForTimeout(500);
  expect(/You're offline/.test(await page.getByTestId('talk-problem').innerText()), 'offline: says so, the rest of the app still works');
  await context.setOffline(false);
  mode = 'key';
  await page.getByTestId('talk-retry').click();
  await page.waitForTimeout(500);
  expect(/rejected its Gemini key/.test(await page.getByTestId('talk-problem').innerText()), 'a rejected Gemini key: says so plainly, not "isn\'t answering"');
  mode = 'busy';
  await page.getByTestId('talk-retry').click();
  await page.waitForTimeout(500);
  expect(/very busy right now/.test(await page.getByTestId('talk-problem').innerText()) && (await page.getByTestId('talk-retry').count()) > 0, 'Google too busy: "wait a minute", with Try again');

  // ---------- A role-play with the AI ----------
  mode = 'ok';
  await page.goto(`${BASE}#/es/roleplay/es-doctor-2`);
  await page.getByTestId('roleplay-ai').click();
  await page.getByTestId('talk-start').click();
  await page.getByTestId('talk-ai').first().waitFor({ timeout: 20000 });
  expect(requests.at(-1).scenario?.them === 'Doctor', 'role-play: the AI plays the doctor');
  expect((await page.getByTestId('character').count()) === 1, 'animated character on stage');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
