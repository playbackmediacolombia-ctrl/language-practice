// Checks the harness itself: the app makes its sounds, but nothing reaches the speakers.
import { devices, launch, run } from './harness.mjs';

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.addInitScript(() => {
    window.__started = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a) {
      window.__started++;
      return start.apply(this, a);
    };
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4173/#/es/learn/es-1-1');
  await page.getByRole('button', { name: 'Start', exact: true }).click(); // plays the first word
  await page.locator('.options button').first().click(); // tap sound
  await page.getByRole('button', { name: 'Check' }).click(); // right/wrong sound + maybe a voice line
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ ...window.__muteReport(), sounds: window.__started }));
  const ok = r.contexts > 0 && r.allMuted && r.sounds > 0 && r.played > 0 && r.media && r.voice;
  console.log(`${ok ? 'PASS' : 'FAIL'}  app played ${r.sounds} sound-effect notes through ${r.contexts} audio context(s), all muted: ${r.allMuted}; ${r.played} phrase audio element(s) played, all muted: ${r.media}; device voice silenced: ${r.voice}`);
  console.log(ok ? 'ALL PASS' : '1 FAILED');
  if (!ok) process.exitCode = 1;
});
