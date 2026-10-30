// Speaking exercises and Day 1's short lessons, with real Whisper and a stand-in mic that "says"
// the app's recordings: on an iPhone screen (WebKit) and on desktop (WebKit and Chrome).
// Usage: npm run test:e2e -- speaking  (pictures in e2e/out/speaking/)
import { mkdirSync, readFileSync } from 'node:fs';
import { ALL_CLASSES, devices, editProgress, fakeMic, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
const DIR = new URL('./out/speaking/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const course = (l) => JSON.parse(readFileSync(new URL(`../../shared/course/${l}.json`, import.meta.url), 'utf8'));
const lessonsOf = (l, units) => course(l).units.filter((u) => units.includes(u.id)).flatMap((u) => u.lessons.map((x) => x.id));
const LANGS = ['es', 'fr', 'zh', 'pt', 'it'];

let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  for (const [name, engine, device] of [
    ['iphone', 'webkit', devices['iPhone 15']],
    ['desktop-safari', 'webkit', devices['Desktop Safari']],
    ['desktop-chrome', 'chrome', devices['Desktop Chrome']],
  ]) {
    console.log(`\n=== ${name}`);
    const browser = await launch({ engine });
    const context = await browser.newContext({ ...device, serviceWorkers: 'block', classes: 'fresh' });
    await fakeMic(context);
    await context.addInitScript(() => {
      window.__plays = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...a) {
        if (!this.src.startsWith('blob:')) window.__plays.push(this.src);
        return play.apply(this, a);
      };
      window.__clips = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a) {
        if (this.buffer?.duration > 0.5) window.__clips++;
        return start.apply(this, a);
      };
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
    const say = (url) => page.evaluate((u) => (window.__micClip = u), url);
    const audioOf = (lang, id) => `/test-audio/${lang}/${id}.mp3`;
    await context.route('**/test-audio/**', (r) => {
      const [lang, file] = r.request().url().split('/test-audio/')[1].split('/');
      r.fulfill({ path: new URL(`../../assets/audio/course/${lang}/${file}`, import.meta.url).pathname, contentType: 'audio/mpeg' });
    });
    const coach = (attr = 'data-stage') => page.getByTestId('speak-coach').getAttribute(attr);
    const result = async () => {
      await page.getByTestId('coach-result').waitFor({ timeout: 90_000 });
      return page.getByTestId('coach-result').getAttribute('data-grade');
    };

    await page.goto(`${BASE}#/`);
    await page.evaluate(() => 0);
    await editProgress(page, (p) => ({ ...p, lang: 'es', levelStart: { es: 'sounds' }, celebrated: null }));

    // ---------- The speech model, once ----------
    await page.goto(`${BASE}#/settings`);
    await page.getByRole('button', { name: /Download standard model/ }).click();
    await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

    // ---------- Day 1: a section of short lessons, nothing plays by itself ----------
    await page.goto(`${BASE}#/es`);
    await page.getByTestId('day1-section').waitFor();
    const buttons = page.getByTestId('day1-btn');
    expect((await buttons.count()) === 5, 'Day 1: five lessons, each with its own button');
    expect((await buttons.evaluateAll((b) => b.map((x) => x.textContent))).join().includes('Day 1: First Words'), 'Day 1: buttons say what they are');
    expect((await page.locator('[data-testid=day1-btn][data-done=true]').count()) === 0, 'Day 1: nothing checked yet');
    await page.getByTestId('day1-section').scrollIntoViewIfNeeded();
    await shot('path');

    await page.locator('[data-key=words]').click();
    await page.getByTestId('day1-lesson').waitFor();
    await page.evaluate(() => (window.__plays = []));
    expect(/welcome/i.test(await page.locator('main').innerText()), 'the welcome shows the first time');
    await page.waitForTimeout(1500);
    expect((await page.evaluate(() => window.__plays.length)) === 0, 'nothing plays by itself: not the welcome');
    await shot('welcome');
    await page.getByTestId('day1-play').click();
    await page.waitForTimeout(300);
    expect((await page.evaluate(() => window.__plays.length)) === 1, 'Play plays it');
    await page.getByTestId('day1-next').click();
    await page.getByTestId('day1-opening').waitFor();
    const opening = await page.getByTestId('day1-opening').innerText();
    await page.getByTestId('day1-next').click();
    await page.getByTestId('day1-word').waitFor();
    await page.evaluate(() => (window.__plays = []));
    await page.waitForTimeout(800);
    expect((await page.evaluate(() => window.__plays.length)) === 0, 'nothing plays by itself: not a word');
    await shot('word');
    await page.getByTestId('day1-play').click();
    await page.getByTestId('day1-play').click();
    await page.waitForTimeout(200);
    expect((await page.evaluate(() => window.__plays.length)) >= 2, 'any part can be replayed');
    for (let i = 0; i < 40 && !(await page.getByTestId('day1-done').isVisible()); i++) await page.getByTestId('day1-next').click();
    const words = Number(await page.getByTestId('day1-lesson').getAttribute('data-of')) - 3; // welcome, opening, done
    expect(words >= 10 && words <= 15, `First Words: ${words} words`);
    await page.getByTestId('day1-to-path').click();
    expect((await page.locator('[data-key=words]').getAttribute('data-done')) === 'true', 'a finished lesson has its checkmark');
    await shot('checked');

    // Redo: no welcome, its own opening only.
    await page.locator('[data-key=words]').click();
    await page.getByTestId('day1-opening').waitFor();
    expect(!/welcome to/i.test(await page.locator('main').innerText()) && (await page.getByTestId('day1-opening').innerText()) === opening, 'redo: the welcome never comes back');
    await page.getByRole('button', { name: 'Quit lesson' }).click();

    // Other lessons open with a different line.
    await page.locator('[data-key=sounds]').click();
    await page.getByTestId('day1-opening').waitFor();
    expect((await page.getByTestId('day1-opening').innerText()) !== opening, 'each lesson has its own opening');
    await page.getByRole('button', { name: 'Quit lesson' }).click();

    // ---------- Picture Match ----------
    await page.locator('[data-key=pictures]').click();
    await page.getByTestId('day1-opening').waitFor();
    await page.getByTestId('day1-next').click();
    await page.getByTestId('picture-match').waitFor();
    expect(await page.getByTestId('day1-next').isDisabled(), 'Picture Match: Next waits until they are matched');
    const ids = await page.locator('[data-pic]').evaluateAll((b) => b.map((x) => x.dataset.pic));
    await page.waitForSelector('[data-pic] svg path');
    await shot('match');
    for (const id of ids) {
      await page.locator(`[data-pic="${id}"]`).click();
      await page.locator(`[data-word="${id}"]`).click();
    }
    await page.getByTestId('day1-next').click();
    await page.getByTestId('day1-done').waitFor();
    await page.getByTestId('day1-to-path').click();

    // ---------- Listen & Speak: tap Play, the mic opens by itself, it grades ----------
    await page.locator('[data-key=speak]').click();
    await page.getByTestId('day1-opening').waitFor();
    await page.getByTestId('day1-next').click();
    await page.getByTestId('speak-coach').waitFor();
    await page.waitForTimeout(600);
    expect((await coach()) === 'idle' && (await page.evaluate(() => window.__micOpens)) === 0, 'Day 1: the mic waits for your tap');
    expect(await page.getByTestId('day1-next').isDisabled(), 'Day 1: no "I did it" way past a word');
    expect((await page.getByText(/I did it|I said it/).count()) === 0, 'no self-check button');
    const first = await page.getByTestId('day1-word').getAttribute('data-item');
    // Right:
    await say(audioOf('es', `${first}`));
    await page.getByTestId('coach-play').click();
    await page.locator('[data-testid=speak-coach][data-stage=listening], [data-testid=speak-coach][data-stage=heard]').waitFor({ timeout: 15_000 });
    expect(true, 'after the voice plays, listening starts by itself');
    expect(await page.locator('.coach .waveform.live').count() === 1, 'a live mic meter shows');
    await shot('listening');
    const stopAt = Date.now();
    expect((await result()) === 'great', `says Great! for the right word (${await page.getByTestId('coach-result').innerText()})`);
    expect(Date.now() - stopAt < 60_000, 'it stopped by itself');
    await page.waitForTimeout(1800);
    expect((await page.getByTestId('day1-word').getAttribute('data-item')) === first, 'Day 1: stays until you tap Next');
    expect(!(await page.getByTestId('day1-next').isDisabled()), 'Day 1: Next opens once it is right');
    await shot('great');
    await page.getByTestId('day1-next').click();

    // Silence: never quiet about it, and Skip after three.
    await page.getByTestId('speak-coach').waitFor();
    const second = await page.getByTestId('day1-word').getAttribute('data-item');
    await say(null);
    for (let n = 1; n <= 2; n++) {
      await page.evaluate(() => (window.__clips = 0));
      await page.getByTestId('coach-mic').click();
      await page.getByTestId('coach-nohear').waitFor({ timeout: 20_000 });
      expect((await page.getByTestId('coach-nohear').innerText()).includes("I didn't hear you, tap the mic to try again."), `heard nothing: says so (${n})`);
      await page.waitForTimeout(400);
      expect((await page.evaluate(() => window.__clips)) >= 1, `and says it out loud (${n})`);
      await page.locator('[data-testid=speak-coach][data-stage=idle]').waitFor({ timeout: 10_000 });
    }
    await shot('nohear');
    // A wrong word: Not quite / Close, then Skip for now, saved to Mistakes, no heart lost.
    await say(audioOf('es', 'tomate'));
    await page.getByTestId('coach-mic').click();
    const grade = await page.locator('[data-testid=coach-result]').getAttribute('data-grade', { timeout: 90_000 });
    expect(grade !== 'great', `a wrong word isn't Great (${grade}: ${await page.getByTestId('coach-result').innerText()})`);
    await page.getByTestId('coach-skip').waitFor({ timeout: 15_000 });
    expect(true, 'after 3 misses: Skip for now');
    await shot('skip');
    const heartsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).hearts);
    await page.getByTestId('coach-skip').click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Quit lesson' }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
    expect(!!saved.mistakes[`es:${second}`], `skipped word is in Mistakes (${second})`);
    expect(JSON.stringify(saved.hearts) === JSON.stringify(heartsBefore), 'Day 1: a miss costs no hearts');

    // ---------- First Greeting; finishing all five opens the path ----------
    for (const key of ['sounds', 'speak', 'greeting']) {
      await page.locator(`[data-key=${key}]`).click();
      await page.getByTestId('day1-lesson').waitFor();
      for (let i = 0; i < 60 && !(await page.getByTestId('day1-done').isVisible()); i++) {
        const next = page.getByTestId('day1-next');
        if (await next.isDisabled()) {
          const id = await page.getByTestId('day1-word').getAttribute('data-item').catch(() => null);
          const known = id && !id.startsWith('day1');
          await say(known ? audioOf('es', id) : null);
          await page.getByTestId('coach-mic').click();
          await page.waitForFunction(() => !document.querySelector('[data-testid=day1-next]')?.disabled, null, { timeout: 90_000 });
        }
        await next.click();
      }
      await page.getByTestId('day1-to-path').click();
    }
    await page.getByTestId('day1-section').waitFor();
    await page.waitForTimeout(500);
    expect((await page.locator('[data-testid=day1-btn][data-done=true]').count()) === 5, 'all five checked');
    expect((await page.locator('.class-node.current').count()) === 1, 'finishing Day 1 opens the next unit');

    // ---------- Chinese tones: my line on the correct shape, and a tip ----------
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, lang: 'zh', levelStart: { zh: 'sounds' }, celebrated: null }));
    await page.goto(`${BASE}#/zh/day1/sounds`);
    await page.getByTestId('day1-opening').waitFor();
    for (let i = 0; i < 12 && !(await page.getByRole('heading', { name: 'Tone 3: dips low' }).isVisible()); i++) {
      const next = page.getByTestId('day1-next');
      if (await next.isDisabled()) {
        await say(audioOf('zh', `ma${await page.locator('[data-testid=tone-pitch]').getAttribute('data-tone')}`));
        await page.getByTestId('coach-mic').click();
        await page.waitForFunction(() => !document.querySelector('[data-testid=day1-next]')?.disabled, null, { timeout: 90_000 });
      }
      await next.click();
    }
    expect((await page.getByTestId('coach-play').count()) === 1, 'tone practice: graded too');
    await say(audioOf('zh', 'ma4'));
    await page.getByTestId('coach-mic').click();
    await page.getByTestId('pitch-overlay').waitFor({ timeout: 90_000 });
    const g3 = await result();
    const tip = await page.getByTestId('coach-detail').innerText().catch(() => '');
    expect(g3 !== 'great' && /Start lower and dip down, then rise/.test(tip), `tone 3 said with a falling voice: a miss, with the tip (${g3}: ${tip})`);
    expect((await page.getByTestId('correct-shape').count()) >= 1 && (await page.getByTestId('my-pitch').count()) === 1, 'my pitch line is drawn over the correct tone shape');
    await shot('tone-miss');
    await say(audioOf('zh', 'ma3'));
    await page.locator('[data-testid=speak-coach][data-stage=idle]').waitFor({ timeout: 15_000 });
    await page.getByTestId('coach-mic').click();
    await page.waitForFunction(() => document.querySelector('[data-testid=coach-result]')?.dataset.grade === 'great', null, { timeout: 90_000 });
    expect(true, 'the right tone: Great!');
    expect((await page.getByTestId('my-pitch').count()) === 1, 'and its line is drawn too');
    await shot('tone-great');

    // ---------- A regular Class: plays, listens by itself, right moves on, no hearts ----------
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p, done) => ({ ...p, lang: 'es', levelStart: { es: 'sounds' }, classes: {}, lessons: Object.fromEntries(done.map((id) => [`es:${id}`, 1])), celebrated: null }), lessonsOf('es', ['u1']));
    await page.goto(`${BASE}#/es/class/u2`);
    await page.getByTestId('class-next').click();
    await page.getByTestId('class-word').waitFor();
    expect((await page.getByTestId('class-next').count()) === 0, 'Class: no way past a word without saying it');
    const w = await page.getByTestId('class-word').getAttribute('data-item');
    await say(audioOf('es', w));
    await page.locator('[data-testid=speak-coach][data-stage=listening], [data-testid=speak-coach][data-stage=heard]').waitFor({ timeout: 40_000 });
    expect(true, 'Class: listening starts by itself after the voice');
    await shot('class-listening');
    await page.waitForFunction((id) => document.querySelector('[data-testid=class-word]')?.dataset.item !== id, w, { timeout: 90_000 });
    expect(true, `Class: right moves on by itself (${w})`);

    // ---------- Practice: right moves on by itself ----------
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p) => ({ ...p, speakFirst: { es: true }, classes: { ...p.classes, 'es:u2': 1 } }));
    await page.goto(`${BASE}#/es/learn/${lessonsOf('es', ['u2'])[1]}`);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByTestId('speak-coach').waitFor();
    const ex1 = await page.evaluate(() => window.__exercise);
    await say(audioOf('es', ex1.item.id));
    await page.waitForFunction((id) => window.__exercise?.item?.id !== id, ex1.item.id, { timeout: 90_000 });
    expect(true, `Practice: right moves on by itself, no Continue (${ex1.item.text})`);

    // ---------- Test: a clear miss costs one heart, once per word ----------
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p, done) => ({ ...p, speakFirst: { es: true }, hearts: 5, heartsAt: Date.now(), classes: { ...p.classes, 'es:u2': 1 }, lessons: { ...p.lessons, ...Object.fromEntries(done.map((id) => [`es:${id}`, 1])) } }), lessonsOf('es', ['u2']));
    // The order's shuffled: open it until the first question is a spoken one.
    for (let i = 0; i < 12; i++) {
      await page.goto(`${BASE}#/es`);
      await page.goto(`${BASE}#/es/learn/test-u2`);
      await say(audioOf('es', 'nino'));
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.waitForTimeout(300);
      if (await page.getByTestId('speak-coach').count()) break;
    }
    await page.getByTestId('speak-coach').waitFor();
    const heartCount = async () => parseInt((await page.locator('.lesson-top .hearts').getAttribute('aria-label')) ?? '', 10);
    const before = 5;
    await page.getByTestId('coach-skip').waitFor({ timeout: 180_000 });
    const after = await heartCount();
    expect(before - after === 1, `Test: three misses on one word cost one heart (${before} → ${after})`);

    // ---------- Shadowing ----------
    const stories = JSON.parse(readFileSync(new URL('../../shared/stories/es.json', import.meta.url), 'utf8'));
    const list = stories.stories ?? stories;
    const story = list[0];
    await page.goto(`${BASE}#/`);
    await editProgress(page, (p, all) => ({ ...p, classes: all }), ALL_CLASSES);
    await page.goto(`${BASE}#/es/stories/${story.id}`);
    await page.getByTestId('need-ready').or(page.getByTestId('shadow-start')).waitFor();
    if (await page.getByTestId('need-ready').isVisible()) await page.getByTestId('need-ready').click();
    await page.getByTestId('shadow-start').click();
    await page.getByTestId('shadow-bar').waitFor();
    await page.waitForFunction(() => window.__shadowAudio);
    const clip = await page.evaluate(() => window.__shadowAudio);
    await say(clip);
    await page.locator('[data-testid=shadow-bar] [data-testid=speak-coach][data-stage=listening], [data-testid=shadow-bar] [data-testid=speak-coach][data-stage=heard]').waitFor({ timeout: 40_000 });
    expect(true, 'Shadowing: listening starts by itself after the voice');
    await shot('shadow');
    await page.waitForFunction(() => /line 2 of/.test(document.querySelector('[data-testid=shadow-bar]')?.textContent ?? '') || document.querySelector('[data-testid=shadow-done]'), null, { timeout: 90_000 });
    expect(true, 'Shadowing: right moves on to the next line');
    await page.getByTestId('shadow-bar').getByRole('button', { name: 'Stop', exact: true }).click();

    // ---------- Flashcards: say it from the English, no "Got it" ----------
    await page.goto(`${BASE}#/`);
    await page.evaluate(() => (window.__micClip = null));
    await page.goto(`${BASE}#/es/greetings/flashcards`);
    await page.getByTestId('speak-coach').waitFor();
    expect((await page.getByRole('button', { name: 'Got it' }).count()) === 0, 'Flashcards: no self-check button');
    await page.getByTestId('coach-nohear').waitFor({ timeout: 20_000 });
    expect(true, 'Flashcards: the mic opens by itself, and silence gets a message');

    // ---------- All five languages: Day 1's lessons are all there ----------
    for (const lang of LANGS) {
      await page.goto(`${BASE}#/${lang}`);
      await page.getByTestId('day1-section').waitFor();
      const of = {};
      for (const key of ['sounds', 'words', 'pictures', 'speak', 'greeting']) {
        await page.goto(`${BASE}#/${lang}/day1/${key}`);
        await page.getByTestId('day1-lesson').waitFor();
        of[key] = Number(await page.getByTestId('day1-lesson').getAttribute('data-of'));
      }
      expect(of.sounds >= 4 && of.words >= 12 && of.pictures === 3 && of.speak === 8 && of.greeting >= 5, `${lang}: all five lessons (${JSON.stringify(of)})`);
    }
    await browser.close();
  }
  console.log(failures ? `FAILED: ${failures}` : 'ALL PASS');
  if (failures) process.exitCode = 1;
}, { minutes: 40 });
