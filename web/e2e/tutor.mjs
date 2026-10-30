// The Advanced/Fluent live tutor, against a stand-in for the Worker (no Gemini call, no quota),
// with real Whisper and a stand-in mic: on an iPhone screen and on desktop.
// Usage: npm run test:e2e -- tutor  (pictures in e2e/out/tutor/)
import { mkdirSync, readFileSync } from 'node:fs';
import { devices, editProgress, fakeMic, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
const DIR = new URL('./out/tutor/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const clip = (lang, id) => readFileSync(new URL(`../../assets/audio/course/${lang}/${id}.mp3`, import.meta.url)).toString('base64');
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const base = { translation: 'English here.', newWords: [], done: false, suggestion: { text: 'x', en: 'x' } };

await run(async () => {
  for (const [name, engine, device] of [
    ['iphone', 'webkit', devices['iPhone 15']],
    ['desktop-safari', 'webkit', devices['Desktop Safari']],
    ['desktop-chrome', 'chrome', devices['Desktop Chrome']],
  ]) {
    console.log(`\n=== ${name}`);
    const browser = await launch({ engine });
    const context = await browser.newContext({ ...device, serviceWorkers: 'block' });
    await fakeMic(context);
    const requests = [];
    let script = []; // the Worker's next replies
    await context.route(`${API}*`, async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      const next = script.shift() ?? { reply: 'Sigamos hablando.' };
      const noVoice = body.lang === 'pt' || body.lang === 'it';
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...base, ...next, audio: noVoice ? null : clip('es', 'si-gracias'), voice: noVoice ? 'device' : 'ok' }) });
    });
    await context.route('**/test-audio/**', (r) => {
      const [lang, file] = r.request().url().split('/test-audio/')[1].split('/');
      r.fulfill({ path: new URL(`../../assets/audio/course/${lang}/${file}`, import.meta.url).pathname, contentType: 'audio/mpeg' });
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => {
      console.log('PAGE ERROR', e.message);
      failures++;
    });
    const shot = async (n) => {
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${DIR}${name}-${n}.png` });
    };
    const say = (lang, id) => page.evaluate((u) => (window.__micClip = u), id ? `/test-audio/${lang}/${id}.mp3` : null);
    const reqCount = (n) => page.waitForFunction(() => true).then(async () => {
      for (let i = 0; i < 400 && requests.length < n; i++) await page.waitForTimeout(250);
      return requests.length >= n;
    });
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'es', levelStart: { es: 'advanced', zh: 'advanced', fr: 'advanced', pt: 'advanced', it: 'advanced' }, celebrated: null }));
    await page.goto(`${BASE}#/settings`);
    await page.getByRole('button', { name: /Download standard model/ }).click();
    await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

    // ---------- Topics ----------
    await page.goto(`${BASE}#/es/talk`);
    await page.getByTestId('tutor-pick').waitFor();
    const topics = await page.getByTestId('tutor-topic').evaluateAll((b) => b.map((x) => x.dataset.topic));
    expect(topics.join() === 'daily,travel,work,debate,flirting,surprise', `topics to pick from (${topics.join()})`);
    await shot('pick');
    await page.locator('[data-topic=flirting]').click();
    expect(/18|adult/i.test(await page.locator('main').innerText()), 'flirting: asks for 18+ first');
    await page.reload();

    // ---------- One tap, then a whole conversation with no buttons ----------
    script = [
      { reply: '¡Hola! ¿Tienes hermanos?' },
      { reply: 'Casi, diríamos "Tengo una hermana", porque es femenino. Dilo otra vez.', correction: { corrected: 'Tengo una hermana.', explanation: 'Hermana is feminine, so it takes "una".', severity: 'mistake', en: 'I have a sister.' } },
      { reply: '¡Eso! ¿Cómo se llama?' }, // after the repeat
      { reply: '¡Qué bonito! ¿Y vive cerca?' }, // you were right: no interruption
      { reply: 'Una hermana, sí. ¿Dónde vive?', correction: { corrected: 'Tengo una hermana mayor.', explanation: 'A small slip: "mayor" says she is older.', severity: 'slip', en: 'I have an older sister.' } },
      { reply: 'Casi, dilo así: "Sí, gracias". Otra vez.', correction: { corrected: 'Sí, gracias.', explanation: 'Say thanks this way.', severity: 'mistake', en: 'Yes, thanks.' } },
      { reply: 'Bueno, sigamos.' },
    ];
    await say('es', 'tengo-una-hermana');
    await page.locator('[data-topic=travel]').click();
    await page.getByTestId('tutor-ai').first().waitFor({ timeout: 20_000 });
    expect(requests[0].mode === 'tutor' && requests[0].topic === 'travel' && requests[0].lang === 'es' && /Advanced|Fluent/.test(requests[0].level), `asks for the tutor on your topic (${requests[0].topic}, ${requests[0].level})`);

    expect(await reqCount(2), 'after the reply it listened, stopped by itself and sent what you said');
    expect(/hermana/i.test(requests[1].history.at(-1).text), `your words went as text (${requests[1].history.at(-1).text})`);
    await page.getByTestId('tutor-card').waitFor({ timeout: 20_000 });
    const c1 = await page.getByTestId('tutor-card').innerText();
    expect(/You said:.*hermana/is.test(c1) && /Tengo una hermana\./.test(c1) && /feminine/.test(c1), 'a mistake: a card with what you said, the correct version, and why');
    expect((await page.getByTestId('tutor-card').getAttribute('data-severity')) === 'mistake', 'marked as a real mistake');
    await shot('card');
    await page.waitForFunction(() => window.__tutor?.repeating, null, { timeout: 20_000 });
    expect(true, 'it waits for you to say it again');

    expect(await reqCount(3), 'you repeat it, it checks');
    expect(requests[2].resume === true, 'right: it carries on (and is told not to correct again)');
    await page.waitForFunction(() => /Cómo se llama/.test(document.querySelector('[data-testid=tutor-lines]').innerText));
    expect(await reqCount(4), 'then it listens again by itself');
    await page.waitForFunction(() => /Y vive cerca/.test(document.querySelector('[data-testid=tutor-lines]').innerText), null, { timeout: 20_000 });
    expect((await page.getByTestId('tutor-card').count()) === 0, 'you were right: no card, no interruption');
    expect(!requests[3].resume, 'and just keeps talking');

    expect(await reqCount(5), 'next turn');
    await page.getByTestId('tutor-card').waitFor({ timeout: 20_000 });
    expect((await page.getByTestId('tutor-card').getAttribute('data-severity')) === 'slip', 'a small slip: a quick card');
    await page.waitForTimeout(600);
    expect(!(await page.evaluate(() => window.__tutor.repeating)), 'and no asking you to repeat it');

    // A correction you can't manage: two tries, then it moves on all the same.
    expect(await reqCount(6), 'next turn');
    await page.waitForFunction(() => window.__tutor?.repeating, null, { timeout: 30_000 });
    const carried = await reqCount(7);
    if (!carried) console.log('   stuck', JSON.stringify(await page.evaluate(() => window.__tutor)), await page.getByTestId('tutor-panel').innerText());
    expect(carried, 'you miss the correction twice: it carries on anyway');
    expect(requests[6].resume === true, 'still without correcting it again');

    // Nothing else was tapped since the topic: the counts above came by themselves.
    await say('es', null);
    const before = requests.length;
    await page.getByTestId('tutor-note').waitFor({ timeout: 60_000 });
    expect(/I didn't hear you, tap the mic to try again\./.test(await page.getByTestId('tutor-note').innerText()) && requests.length === before, "silence: it listens a few times, then says so, and sends nothing");
    await shot('nohear');
    await page.getByTestId('tutor-end').click();
    await page.getByTestId('tutor-summary').waitFor();
    expect(/saved to your Mistakes review and Notebook/.test(await page.getByTestId('tutor-summary').innerText()), 'the end says where the corrections went');

    // ---------- Saved ----------
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(saved.corrections.length === 3 && Object.keys(saved.mistakes).some((k) => k.startsWith('es:')), `corrections saved (${saved.corrections.length}) and in Mistakes (${Object.keys(saved.mistakes).join(', ').slice(0, 80)})`);
    await page.goto(`${BASE}#/es/notebook`);
    await page.getByTestId('notebook-corrections').waitFor();
    expect((await page.getByTestId('notebook-correction').count()) === 3 && /feminine/.test(await page.getByTestId('notebook-corrections').innerText()), 'Notebook: each correction, with its why');
    await page.goto(`${BASE}#/es/learn/mistakes`);
    expect(/Tengo una hermana/.test(await page.getByTestId('mistake-chips').innerText()), 'Mistakes review: the corrected line is in it');
    await shot('mistakes');

    // ---------- Mandarin: a wrong tone on a short sentence is passed on ----------
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'zh' }));
    script = [{ reply: '你好！今天怎么样？' }, { reply: '好的。', correction: { corrected: '妈', explanation: 'The tone on mā is high and flat.', severity: 'slip', pinyin: 'mā', en: 'mom' } }];
    const n = requests.length;
    await page.goto(`${BASE}#/zh/talk`);
    await say('zh', 'ma4');
    await page.locator('[data-topic=surprise]').click();
    expect(await reqCount(n + 2), 'Mandarin: back and forth');
    expect(!['flirting'].includes(requests[n].topic) && ['daily', 'travel', 'work', 'debate'].includes(requests[n].topic), `Surprise me picks a topic, never 18+ (${requests[n].topic})`);
    const heard = requests[n + 1].history.at(-1).text;
    console.log('   heard', heard, '| toneNote', requests[n + 1].toneNote);
    expect(heard !== '妈' || /tone 1/.test(requests[n + 1].toneNote ?? ''), `the pitch tracker passes on a wrong tone (${heard}: ${requests[n + 1].toneNote})`);
    await page.getByTestId('tutor-card').waitFor({ timeout: 20_000 });
    await shot('zh-card');
    await page.getByTestId('tutor-end').click();

    // ---------- All five languages ----------
    for (const lang of ['fr', 'pt', 'it']) {
      await page.goto(`${BASE}#/`);
      await editProgress(page, (p, l) => ({ ...p, lang: l }), lang);
      const at = requests.length;
      script = [{ reply: 'Ciao / Salut / Olá' }];
      await page.goto(`${BASE}#/${lang}/talk`);
      await say(lang, null);
      await page.locator('[data-topic=work]').click();
      await page.getByTestId('tutor-ai').first().waitFor({ timeout: 20_000 });
      await page.locator('[data-testid=tutor-status]').filter({ hasText: /speak now|Listening/ }).waitFor({ timeout: 30_000 });
      expect(requests[at]?.lang === lang, `${lang}: starts, speaks and listens${lang === 'fr' ? '' : ' (with the device voice)'}`);
      await page.getByTestId('tutor-end').click();
    }
    await browser.close();
  }
  console.log(failures ? `FAILED: ${failures}` : 'ALL PASS');
  if (failures) process.exitCode = 1;
}, { minutes: 30 });
