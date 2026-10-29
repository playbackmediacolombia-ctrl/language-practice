// UI polish checks in WebKit with iPhone emulation: themes, tabs, motion, haptics, sound.
import { devices, editProgress, launch, run, skipDay1 } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();

  async function newPage({ colorScheme = 'light', reducedMotion = 'no-preference' } = {}) {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme, reducedMotion });
    await context.addInitScript(() => {
      window.__osc = 0;
      const ostart = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...a) {
        window.__osc++;
        return ostart.apply(this, a);
      };
      // Count haptic-switch toggles (the iOS 18 trick) without needing a real phone.
      window.__haptics = 0;
      document.addEventListener('change', (e) => e.target?.id === 'haptic-switch' && window.__haptics++, true);
      // Fake mic for the waveform: quiet, then a loud tone for a second.
      MediaDevices.prototype.getUserMedia = async function () {
        const c = new AudioContext();
        await c.resume();
        const dest = c.createMediaStreamDestination();
        const osc = c.createOscillator();
        const g = c.createGain();
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.setValueAtTime(0.5, c.currentTime + 0.5);
        g.gain.setValueAtTime(0, c.currentTime + 1.6);
        osc.connect(g).connect(dest);
        osc.start();
        return dest.stream;
      };
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    return page;
  }

  const answerRight = async (page) => {
    const ex = await page.evaluate(() => window.__exercise);
    if (ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'translate') {
      const i = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
      await page.locator('.options button').nth(i).click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'type') {
      await page.locator('textarea').fill(ex.item.text);
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'tiles') {
      const used = new Set();
      for (const w of ex.item.tiles) {
        const i = ex.bank.findIndex((b, j) => b === w && !used.has(j));
        used.add(i);
        await page.locator('.bank button').nth(i).click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
    } else if (ex.type === 'match') {
      for (const item of ex.items) {
        const pick = async (col, text) => {
          const b = page.locator('.match-col').nth(col).locator('button');
          const texts = await b.allInnerTexts();
          await b.nth(texts.findIndex((t) => t.split('\n')[0].trim() === text)).click();
        };
        await pick(0, item.text);
        await pick(1, item.en);
      }
    }
    await page.locator('.banner').waitFor();
    return ex;
  };

  const answerWrong = async (page) => {
    const ex = await page.evaluate(() => window.__exercise);
    const correct = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.findIndex((o) => o.id === ex.item.id);
    await page.locator('.options button').nth((correct + 1) % ex.options.length).click();
    await page.getByRole('button', { name: 'Check' }).click();
    await page.locator('.banner').waitFor();
  };

  const shots = (page, name) => page.screenshot({ path: `U-${name}.png` });

  // ---------- Light & dark, tabs ----------
  for (const scheme of ['light', 'dark']) {
    const page = await newPage({ colorScheme: scheme });
    await page.goto(`${BASE}#/`);
    await page.getByText('Pick a language').waitFor();
    await shots(page, `${scheme}-welcome`);
    await page.getByRole('button', { name: /Spanish/ }).click();
    await page.locator('.lesson-node').first().waitFor();
    await page.waitForTimeout(500);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(scheme === 'light' ? bg === 'rgb(244, 248, 255)' : bg === 'rgb(7, 13, 26)', `${scheme} mode follows the phone (body ${bg})`);
    await shots(page, `${scheme}-learn`);
    for (const tab of ['Practice', 'Progress', 'Settings']) {
      await page.locator('.tabbar').getByRole('button', { name: tab }).click();
      await page.waitForTimeout(450);
      const title = await page.locator('.large-title').innerText();
      expect(title === tab, `${scheme}: ${tab} tab opens (${title})`);
      await shots(page, `${scheme}-${tab.toLowerCase()}`);
    }
    if (scheme === 'light') {
      // Manual override beats the phone setting.
      await page.getByRole('radio', { name: 'Dark' }).click();
      const forced = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]);
      expect(forced[0] === 'dark' && forced[1] === 'rgb(7, 13, 26)', `Settings › Dark forces dark mode (${forced.join(', ')})`);
      const meta = await page.evaluate(() => [...document.querySelectorAll('meta[name=theme-color]')].map((m) => m.content));
      expect(meta.every((c) => c === '#070D1A'), 'status bar color follows the theme');
      await page.getByRole('radio', { name: 'Automatic' }).click();
      const auto = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(auto === undefined, 'Automatic goes back to following the phone');
      const vt = await page.evaluate(() => typeof document.startViewTransition === 'function');
      console.log(`  view transitions in this WebKit: ${vt ? 'yes' : 'no (CSS fade fallback)'}`);
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).position === 'fixed'), 'tab bar is fixed at the bottom');
      // Press-down effect on buttons.
      const btn = page.getByRole('button', { name: /Reset my progress/ });
      await btn.scrollIntoViewIfNeeded();
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.waitForTimeout(250);
      const t = await btn.evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.up();
      expect(/matrix\(1, 0, 0, 1, 0, 4\)/.test(t), `buttons squish down into their bottom edge when touched (${t})`);
    }
    await page.context().close();
  }

  // ---------- Lesson effects, haptics, sounds ----------
  {
    const page = await newPage();
    await page.goto(`${BASE}#/es`);
    await skipDay1(page, 'es'); // Day 1 is listen and repeat: no answers to tap
    // Turn the voice off so only sound effects make sound here.
    await editProgress(page, (p) => ({ ...p, voice: false }));
    await page.locator('.lesson-node.current').click();
    await page.getByTestId('lesson-start').click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    expect(await page.locator('.tabbar').count() === 0, 'tab bar hides during a lesson');

    let ex = await page.evaluate(() => window.__exercise);
    await page.evaluate(() => ((window.__osc = 0), (window.__haptics = 0)));
    await page.locator('.options button').first().click(); // a tap on an answer
    const tapHaptics = await page.evaluate(() => window.__haptics);
    const tapOsc = await page.evaluate(() => window.__osc);
    expect(tapHaptics === 1, `tapping an answer: one haptic tick via the iOS switch trick (${tapHaptics})`);
    expect(tapOsc >= 1, `tapping an answer: tap sound (${tapOsc} notes)`);
    await page.locator('.options button').first().click(); // reselect, then answer properly
    ex = await answerRight(page);
    const okState = await page.evaluate(() => ({
      feedback: document.querySelector('.lesson')?.dataset.feedback,
      flash: !!document.querySelector('.flash.ok'),
      burst: document.querySelectorAll('.burst span').length,
      bounce: getComputedStyle(document.querySelector('.picked-right') ?? document.body).animationName,
    }));
    expect(okState.feedback === 'ok' && okState.flash, 'right answer: green flash');
    expect(okState.bounce === 'bounce', `right answer: the answer bounces (${okState.bounce})`);
    expect(okState.burst >= 10, `right answer: sparkle burst (${okState.burst} sparkles)`);
    await page.waitForTimeout(150);
    await shots(page, 'right');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Find a heart-costing choice exercise and get it wrong.
    for (;;) {
      ex = await page.evaluate(() => window.__exercise);
      if ((ex.type === 'listen' || ex.type === 'translate' || (ex.type === 'meaning' && !ex.isNew))) break;
      await answerRight(page);
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    await page.evaluate(() => ((window.__osc = 0), (window.__haptics = 0)));
    await answerWrong(page);
    await page.waitForTimeout(50);
    const bad = await page.evaluate(() => ({
      feedback: document.querySelector('.lesson')?.dataset.feedback,
      shake: getComputedStyle(document.querySelector('.picked-wrong')).animationName,
      heart: document.querySelector('.hearts')?.className,
      osc: window.__osc,
      haptics: window.__haptics,
    }));
    expect(bad.feedback === 'bad' && bad.shake === 'shake', `wrong answer: gentle shake (${bad.shake})`);
    expect(!bad.heart.includes('lost'), 'wrong answer in Practice: no heart lost');
    expect(bad.osc >= 2, `wrong answer: "bonk" sound (${bad.osc} notes)`);
    await page.waitForTimeout(150);
    expect((await page.evaluate(() => window.__haptics)) >= 1, 'wrong answer: haptic');
    await shots(page, 'wrong');

    // In a unit's Test, hearts count: the counter pulses when one goes.
    await page.goto(`${BASE}#/es/learn/test-u2`);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (;;) {
      ex = await page.evaluate(() => window.__exercise);
      if (ex.type === 'listen' || ex.type === 'translate' || ex.type === 'meaning') break;
      await answerRight(page);
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    await answerWrong(page);
    await page.waitForTimeout(50);
    const testHeart = await page.evaluate(() => document.querySelector('.lesson-top .hearts')?.className);
    expect(testHeart?.includes('lost'), `wrong answer in a Test: heart counter pulses (${testHeart})`);
    await page.goto(`${BASE}#/es/learn/es-2-1`);

    // Mute and haptics off.
    await editProgress(page, (p) => ({ ...p, sfx: false, haptics: false }));
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.evaluate(() => ((window.__osc = 0), (window.__haptics = 0)));
    await answerRight(page);
    await page.waitForTimeout(200);
    const muted = await page.evaluate(() => [window.__osc, window.__haptics]);
    expect(muted[0] === 0 && muted[1] === 0, `sound effects off + haptics off: silent and still (${muted})`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await editProgress(page, (p) => ({ ...p, sfx: true, haptics: true }));

    // Finish a lesson perfectly: celebration.
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    let frames = 0;
    for (;;) {
      await answerRight(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      if (await page.getByText('Lesson complete!').isVisible().catch(() => false)) break;
      await page.waitForTimeout(80);
      if (await page.getByText('Lesson complete!').isVisible().catch(() => false)) break;
    }
    const xpEarly = await page.locator('.stat').first().innerText();
    const atEnd = await page.evaluate(() => ({ confetti: document.querySelectorAll('.confetti span').length, osc: window.__osc }));
    // Measure frame rate while the confetti falls.
    frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => (performance.now() - t0 < 1000 ? (n++, requestAnimationFrame(tick)) : resolve(n));
          requestAnimationFrame(tick);
        }),
    );
    await page.waitForTimeout(300);
    const xpLate = await page.locator('.stat').first().innerText();
    await shots(page, 'complete');
    expect(atEnd.confetti >= 60, `lesson complete: confetti (${atEnd.confetti} pieces)`);
    expect(xpLate.startsWith('+15') && !xpEarly.startsWith('+15'), `lesson complete: XP counts up (${xpEarly.split('\n')[0]} → ${xpLate.split('\n')[0]})`);
    expect(await page.locator('.streak-up .flame.lit').count() === 1, 'lesson complete: streak flame lit and animated');
    expect(await page.locator('.trophy.perfect').count() === 1, 'perfect lesson: gold star trophy');
    expect(frames >= 50, `smooth during confetti: ${frames} fps (desktop WebKit; a phone will differ)`);
    await page.context().close();
  }

  // ---------- Mic waveform ----------
  {
    const page = await newPage();
    await page.goto(`${BASE}#/settings`);
    await page.getByRole('button', { name: /Download standard model/ }).click();
    await page.getByText(/model saved on this phone/).waitFor({ timeout: 300_000 });
    await page.goto(`${BASE}#/es/greetings/practice`);
    await page.getByRole('button', { name: 'Start recording' }).click();
    await page.locator('.mic.on').waitFor();
    await page.waitForTimeout(900);
    const wave = await page.evaluate(() => {
      const c = document.querySelector('canvas.waveform');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let inked = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) inked++;
      return { live: c.classList.contains('live'), inked, ring: getComputedStyle(document.querySelector('.mic.on'), '::before').animationName };
    });
    await shots(page, 'mic');
    expect(wave.live && wave.inked > 500, `mic: live sound wave while talking (${wave.inked} px drawn)`);
    expect(wave.ring === 'ring', `mic: pulsing rings while listening (${wave.ring})`);
    await page.context().close();
  }

  // ---------- Reduce Motion ----------
  {
    const page = await newPage({ reducedMotion: 'reduce' });
    await page.goto(`${BASE}#/es`);
    await skipDay1(page, 'es');
    await page.locator('.lesson-node.current').click();
    await page.getByTestId('lesson-start').click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await answerRight(page);
    const rm = await page.evaluate(() => ({
      burst: document.querySelectorAll('.burst span').length,
      dur: getComputedStyle(document.querySelector('.banner')).animationDuration,
    }));
    expect(rm.burst === 0, 'Reduce Motion: no sparkle burst');
    expect(parseFloat(rm.dur) < 0.01, `Reduce Motion: animations effectively off (${rm.dur})`);
    for (;;) {
      await page.getByRole('button', { name: 'Continue' }).click();
      if (await page.getByText('Lesson complete!').isVisible().catch(() => false)) break;
      await answerRight(page);
    }
    const end = await page.evaluate(() => ({ confetti: document.querySelectorAll('.confetti span').length, xp: document.querySelector('.stat')?.innerText }));
    expect(end.confetti === 0, 'Reduce Motion: no confetti');
    expect(end.xp.startsWith('+15'), `Reduce Motion: XP shown at once (${end.xp.split('\n')[0]})`);
    await page.context().close();
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  await browser.close();
});
