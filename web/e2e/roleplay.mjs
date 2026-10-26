// Real-life role-plays: the other person talks, you say your lines, Whisper grades them.
import { devices, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const open = async () => {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
    await context.addInitScript(() => {
      // Fake mic: a little quiet, then the clip the app says is your line (or __wrongClip).
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
        src.buffer = await c.decodeAudioData(await (await fetch(window.__wrongClip ?? window.__roleplayAudio)).arrayBuffer());
        src.connect(dest);
        src.start(c.currentTime + 0.6);
        return dest.stream;
      };
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    return page;
  };

  /** Plays a role-play to the end, saying each line right. Returns each graded turn's score. */
  async function playThrough(page) {
    await page.getByTestId('roleplay-start').click();
    const scores = [];
    for (let guard = 0; guard < 30; guard++) {
      await page.locator('[data-testid=turn-panel], [data-testid=roleplay-done]').first().waitFor({ timeout: 30_000 });
      if (await page.getByTestId('roleplay-done').isVisible()) break;
      await page.getByTestId('turn-mic').click();
      await page.getByTestId('turn-status').filter({ hasText: /%|Didn't hear/ }).waitFor({ timeout: 60_000 });
      const status = await page.getByTestId('turn-status').innerText();
      scores.push(Number(status.match(/(\d+)%/)?.[1] ?? 0));
      if (!/Great|Close/.test(status)) await page.getByTestId('turn-skip').click();
      await page.waitForFunction(() => !document.querySelector('[data-testid=turn-status]') || !/%/.test(document.querySelector('[data-testid=turn-status]').textContent), null, { timeout: 15_000 });
    }
    return scores;
  }

  const page = await open();
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Download standard model/ }).click();
  await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });

  // ---------- The list ----------
  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('roleplay-card').click();
  await page.locator('[data-testid^=roleplay-es-]').first().waitFor();
  const levels = await page.locator('.section-title').allInnerTexts();
  const count = await page.locator('[data-testid^=roleplay-es-]').count();
  expect(levels.join() === 'BEGINNER,ELEMENTARY,INTERMEDIATE,UPPER-INTERMEDIATE,ADVANCED,FLUENT' || levels.length === 6, `list: six levels (${levels.join(', ')})`);
  expect(count === 18, `list: 18 Spanish role-plays (${count})`);
  await page.screenshot({ path: 'R-list.png' });

  // ---------- Beginner: words shown, every line said right ----------
  await page.getByTestId('roleplay-es-food-1').click();
  await page.getByTestId('roleplay-start').waitFor();
  await page.screenshot({ path: 'R-intro.png' });
  await page.getByTestId('roleplay-start').click();
  await page.getByTestId('turn-panel').waitFor({ timeout: 30_000 });
  const firstPrompt = await page.getByTestId('turn-panel').innerText();
  expect(/Un café con leche, por favor/.test(firstPrompt), 'Beginner: your line is shown in Spanish');
  expect((await page.locator('.story-line.left').count()) >= 1, "Beginner: the waiter's line came first (left)");
  await page.screenshot({ path: 'R-turn.png' });
  await page.reload();
  const es = await playThrough(page);
  console.log('  es-food-1 scores:', es.join(', '));
  expect(es.length === 3 && es.every((s) => s >= 50), `Beginner: all 3 of your lines graded and passed (${es.join(', ')})`);
  const done = await page.getByTestId('roleplay-done').innerText();
  expect(/Conversation done: \d+% on average/.test(done) && /\+10 XP/.test(done), `end: average score and XP (${done.split('\n')[0]})`);
  await page.screenshot({ path: 'R-done.png' });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).roleplays['es:es-food-1']);
  expect(saved > 0.5, `end: best score saved (${Math.round(saved * 100)}%)`);

  // ---------- Intermediate: English shown, words hidden behind a tap ----------
  await page.goto(`${BASE}#/es/roleplay/es-food-3`);
  await page.getByTestId('roleplay-start').click();
  await page.getByTestId('turn-panel').waitFor({ timeout: 30_000 });
  const hidden = await page.getByTestId('turn-panel').innerText();
  expect(/I ordered the fish/.test(hidden) && !/pedí el pescado/.test(hidden), 'Intermediate: you see the English, not the Spanish');
  await page.getByTestId('show-words').click();
  expect(/pedí el pescado/.test(await page.getByTestId('turn-panel').innerText()), 'Intermediate: "Show the words" reveals them');

  // ---------- A wrong answer: not passed, try again or skip ----------
  await page.evaluate(() => (window.__wrongClip = window.__roleplayLines[3])); // the waiter's line, not yours
  await page.getByTestId('turn-mic').click();
  await page.getByTestId('turn-status').filter({ hasText: /%|Didn't hear/ }).waitFor({ timeout: 60_000 });
  const wrong = await page.getByTestId('turn-status').innerText();
  expect(/Not quite|Didn't hear/.test(wrong), `wrong line: not passed (${wrong})`);
  expect(await page.getByTestId('turn-mic').isEnabled(), 'wrong line: the mic is ready to try again');
  await page.screenshot({ path: 'R-wrong.png' });
  await page.evaluate(() => (window.__wrongClip = undefined));
  await page.getByTestId('turn-mic').click();
  await page.getByTestId('turn-status').filter({ hasText: /Great|Close/ }).waitFor({ timeout: 60_000 });
  expect(true, 'wrong line: trying again with the right words passes');
  await page.waitForTimeout(1600);
  const atStep = await page.locator('.story-line').count();
  await page.getByTestId('turn-panel').waitFor({ timeout: 30_000 });
  await page.getByTestId('turn-skip').click();
  await page.waitForTimeout(400);
  expect((await page.locator('.story-line').count()) > atStep, 'Skip moves the conversation on');

  // ---------- Mandarin ----------
  await page.goto(`${BASE}#/zh/roleplay/zh-food-1`);
  const zh = await playThrough(page);
  console.log('  zh-food-1 scores:', zh.join(', '));
  expect(zh.length === 3 && zh.every((s) => s >= 50), `Mandarin Beginner: all your lines passed (${zh.join(', ')})`);
  expect((await page.locator('.line-pinyin').count()) >= 5, 'Mandarin: pinyin under every line');
  await page.screenshot({ path: 'R-zh.png' });
  await page.context().close();

  // ---------- Without the speech model: still playable, not graded ----------
  const plain = await open();
  await plain.goto(`${BASE}#/fr/roleplay/fr-directions-1`);
  await plain.getByTestId('roleplay-start').click();
  for (let i = 0; i < 10; i++) {
    await plain.locator('[data-testid=turn-next], [data-testid=roleplay-done]').first().waitFor({ timeout: 30_000 });
    if (await plain.getByTestId('roleplay-done').isVisible()) break;
    await plain.getByTestId('turn-next').click();
  }
  const plainDone = await plain.getByTestId('roleplay-done').innerText();
  expect(/Conversation done!/.test(plainDone) && /Download the speech model/.test(plainDone), 'no speech model: plays through, says how to get graded');
  await plain.context().close();

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
