// Branding checks in WebKit with iPhone emulation.
import { devices, launch, run } from './harness.mjs';
const BASE = 'http://localhost:4173/';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
await run(async () => {
  const browser = await launch();

  const lum = (rgb) => {
    const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => +v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', colorScheme: scheme });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await page.goto(`${BASE}#/`);
    await page.locator('.welcome-logo').waitFor();
    await page.waitForFunction(() => document.querySelector('.welcome-logo').complete);
    const welcome = await page.evaluate(() => document.querySelector('.welcome-logo').naturalWidth);
    expect(welcome === 720, `${scheme}: welcome screen shows the full logo (${welcome}px source)`);
    await page.screenshot({ path: `B-${scheme}-welcome.png` });

    if (scheme === 'light') {
      const head = await page.evaluate(() => ({
        title: document.title,
        appTitle: document.querySelector('meta[name=apple-mobile-web-app-title]').content,
        touch: document.querySelector('link[rel=apple-touch-icon]').href,
        icons: [...document.querySelectorAll('link[rel=icon]')].map((l) => l.href),
        manifest: document.querySelector('link[rel=manifest]')?.href,
        splash: [...document.querySelectorAll('link[rel=apple-touch-startup-image]')].map((l) => ({ href: l.href, media: l.media })),
      }));
      expect(head.title === 'Learnguage' && head.appTitle === 'Learnguage', `name: tab title and Home Screen name are "Learnguage"`);
      const check = async (url) => {
        const r = await page.request.get(url);
        const b = await r.body();
        // PNG header: width/height at 16..24, color type at 25 (2 = RGB, 6 = RGBA).
        return { ok: r.ok(), w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 };
      };
      const touch = await check(head.touch);
      expect(touch.ok && touch.w === 180 && touch.h === 180 && !touch.alpha, `apple-touch-icon: 180×180, opaque (no alpha to turn black) ${JSON.stringify(touch)}`);
      for (const href of head.icons) {
        const f = await check(href);
        expect(f.ok && !f.alpha, `favicon ${href.split('/').pop()}: ${f.w}×${f.h}, loads`);
      }
      const manifest = await (await page.request.get(head.manifest)).json();
      expect(manifest.name === 'Learnguage' && manifest.background_color === '#F4F8FF', `manifest: name ${manifest.name}, background ${manifest.background_color}`);
      for (const icon of manifest.icons) {
        const f = await check(new URL(icon.src, head.manifest).href);
        const [w] = icon.sizes.split('x').map(Number);
        expect(f.ok && f.w === w && !f.alpha, `manifest icon ${icon.src} (${icon.purpose ?? 'any'}): ${f.w}×${f.h}, opaque`);
      }
      let splashOk = 0;
      for (const s of head.splash) if ((await page.request.get(s.href)).ok()) splashOk++;
      expect(splashOk === 22, `all ${splashOk}/22 launch screens load`);
      // Which launch screen would an iPhone 15 (393×852 @3x) pick in each mode?
      const pick = (mode) => head.splash.filter((s) => s.media.includes('393px') && s.media.includes('852px') && s.media.includes(mode)).map((s) => s.href.split('/').pop());
      expect(pick('light').join() === 'light-1179x2556.png' && pick('dark').join() === 'dark-1179x2556.png', `iPhone 15 gets ${pick('light')} / ${pick('dark')}`);
    }

    await page.getByRole('button', { name: /Spanish/ }).click();
    await page.locator('.lesson-node').first().waitFor();
    await page.waitForTimeout(500);
    // Learn opens on the path with its own top bar (flag, streak, XP, hearts); the other tabs show the logo.
    expect((await page.locator('.header.topbar .flag-btn').count()) === 1, `${scheme}: Learn has the top bar with the language flag`);
    const colors = await page.evaluate(() => {
      const cs = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
      return {
        bg: getComputedStyle(document.body).backgroundColor,
        text: getComputedStyle(document.body).color,
        card: cs('.card', 'backgroundColor'),
        muted: cs('.muted', 'color'),
        // The coin is a glossy gradient over its unit color (--tone).
        btn: cs('.day1-num', 'backgroundColor'),
        btnText: cs('.day1-num', 'color'),
              };
    });
    await page.locator('.tabbar').getByRole('button', { name: 'Practice' }).click();
    await page.waitForTimeout(500);
    const brand = await page.evaluate(() => {
      const img = document.querySelector('.header .brand img');
      return { loaded: img?.complete && img.naturalWidth > 0, h: img?.getBoundingClientRect().height, text: document.querySelector('.brand')?.getAttribute('aria-label') };
    });
    expect(brand.loaded && brand.h === 32 && brand.text === 'Learnguage', `${scheme}: small logo in the header of the other tabs (${brand.h}px tall)`);
    colors.learn = await page.evaluate(() => getComputedStyle(document.querySelector('.brand-name .learn')).color);
    console.log(`  ${scheme} colors:`, JSON.stringify(colors));
    expect(colors.btn === 'rgb(1, 100, 249)', `${scheme}: Day 1's buttons in the logo's blue #0164F9 (${colors.btn})`);
    expect(scheme === 'light' ? colors.bg === 'rgb(244, 248, 255)' : colors.bg === 'rgb(7, 13, 26)', `${scheme}: background ${colors.bg}`);
    expect(scheme === 'light' ? colors.learn === 'rgb(7, 19, 52)' : colors.learn === 'rgb(242, 246, 255)', `${scheme}: "learn" in navy, white in dark mode (${colors.learn})`);
    const pairs = [
      ['body text on background', colors.text, colors.bg, 4.5],
      ['muted text on card', colors.muted, colors.card, 4.5],
      ['number on Day 1 button', colors.btnText, colors.btn, 4.5],
    ];
    for (const [name, fg, bg, min] of pairs) {
      const r = ratio(fg, bg);
      expect(r >= min, `${scheme}: ${name} contrast ${r.toFixed(2)}:1 (≥ ${min})`);
    }
    await page.screenshot({ path: `B-${scheme}-learn.png` });
    await page.locator('.tabbar').getByRole('button', { name: 'Learn' }).click();
    await page.waitForTimeout(800); // let the tab's transition finish
    await page.goto(`${BASE}#/es/day1/words`);
    await page.getByTestId('day1-lesson').waitFor();
    expect((await page.locator('.header .brand').count()) === 0, `${scheme}: no logo in the lesson header (stays focused)`);
    await page.goto(`${BASE}#/progress`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `B-${scheme}-progress.png` });
    await context.close();
  }
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  await browser.close();
});
