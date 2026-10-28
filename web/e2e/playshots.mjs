// A screen recording (and pictures) of Practice › Play: the hub, an adventure, a phone call
// ringing and answered, a text chat, teach the bird, spot the mistake and a mission.
// Usage: npm run test:e2e -- playshots  (saves to e2e/out/playshots/)
import { mkdirSync, renameSync } from 'node:fs';
import { devices, editProgress, launch, run } from './harness.mjs';

const DIR = new URL('./out/playshots/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:4173/?test';

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', recordVideo: { dir: DIR, size: { width: 393, height: 659 } } });
  const page = await context.newPage();
  const shot = (name) => page.screenshot({ path: `${DIR}${name}.png` });
  await page.goto(`${BASE}#/`);
  await editProgress(page, (p) => ({ ...p, lang: 'es', levelStart: { es: 'sounds' }, celebrated: null }));

  await page.goto(`${BASE}#/practice`);
  await page.waitForTimeout(800);
  await page.getByTestId('play-card').click();
  await page.getByTestId('play-adventure').waitFor();
  await page.waitForTimeout(1200);
  await shot('1-hub');

  // An adventure: the narrator tells it, you say what you do.
  await page.getByTestId('play-adventure').click();
  await page.getByTestId('play-adventure-cat').click();
  await page.getByTestId('adventure-start').click();
  await page.getByTestId('adventure-scene').waitFor();
  await page.waitForTimeout(3500);
  await shot('2-adventure');
  await page.getByTestId('answer-input').fill('¿Cuándo lo vio por última vez?');
  await page.waitForTimeout(600);
  await page.getByTestId('answer-send').click();
  await page.waitForTimeout(3500);

  // A phone call: it rings, you answer.
  await page.goto(`${BASE}#/es/play/call/clinic`);
  await page.getByTestId('call-start').click();
  await page.getByTestId('call-ringing').waitFor();
  await page.waitForTimeout(2500);
  await shot('3-call-ringing');
  await page.getByTestId('call-answer').click();
  await page.getByTestId('call-them').waitFor();
  await page.waitForTimeout(1500);
  await shot('4-call-on');
  await page.waitForFunction(() => window.__callLine?.who === 'you', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.getByTestId('answer-input').fill('Sí, soy yo. Buenos días.');
  await page.getByTestId('answer-send').click();
  await page.waitForTimeout(2500);

  // A text chat: typing…, slang, picking a reply.
  await page.goto(`${BASE}#/es/play/chat/late`);
  await page.getByTestId('chat-replies').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.getByTestId('slang').first().click();
  await page.waitForTimeout(1500);
  await page.getByTestId('chat-option').filter({ hasText: 'bien, gracias' }).click();
  await page.waitForTimeout(1500);
  await shot('5-chat-why');
  for (let i = 0; i < 3; i++) {
    const right = await page.evaluate(() => window.__chatTurn?.right);
    if (!right) break;
    await page.getByTestId('chat-option').filter({ hasText: right }).click();
    await page.waitForTimeout(2600);
  }
  await shot('6-chat');

  // Teach the bird (offline: the key ideas decide).
  await context.setOffline(true);
  await page.goto(`${BASE}#/es/play/teach/1`);
  await page.getByTestId('teach-start').click();
  await page.getByTestId('teach-word').waitFor();
  await page.waitForTimeout(2500);
  await shot('7-teach');
  await page.getByTestId('answer-input').fill('Es una cosa de metal para abrir la puerta de tu casa');
  await page.getByTestId('answer-send').click();
  await page.waitForTimeout(2500);
  await shot('8-teach-yes');
  await context.setOffline(false);

  // Spot the mistake.
  await page.goto(`${BASE}#/es/play/spot/2`);
  await page.getByTestId('spot-start').click();
  await page.getByTestId('spot-sentence').waitFor();
  await page.waitForTimeout(2500);
  const spot = await page.evaluate(() => window.__spot);
  await page.getByTestId(`spot-word-${spot.bad}`).click();
  await page.waitForTimeout(1200);
  await page.getByTestId('spot-fix').filter({ hasText: spot.fix }).first().click();
  await page.waitForTimeout(2500);
  await shot('9-spot');

  // A mission, checked off.
  await page.goto(`${BASE}#/es/play/mission/coffee`);
  await page.getByTestId('mission').waitFor();
  await page.waitForTimeout(1500);
  await shot('10-mission');
  await page.getByTestId('mission-claim').click();
  await page.waitForTimeout(2500);
  await shot('11-mission-done');

  const video = page.video();
  await context.close();
  renameSync(await video.path(), `${DIR}play.webm`);
  await browser.close();
  console.log(`saved to ${DIR}`);
});
