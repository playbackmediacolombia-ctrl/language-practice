// "Add to Home Screen": Chrome's real install prompt on Android, a guide pointing at Safari's own
// button on iPhone (two Safari layouts), hidden once installed, and dismissible for good.
import { devices, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const SAFARI_26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SAFARI_18 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

await run(async () => {
  const browser = await launch();
  const open = async (opts = {}, init) => {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block', ...opts });
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    return page;
  };

  // ---------- iPhone, Safari 18: Share is in the middle of the bottom bar ----------
  {
    const page = await open({ userAgent: SAFARI_18 });
    await page.goto(`${BASE}#/`);
    await page.getByTestId('install-card').waitFor();
    expect(/Show me how/.test(await page.getByTestId('install-button').innerText()), 'iPhone: the card offers a guide');
    await page.getByTestId('install-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'I-card.png' });
    await page.getByTestId('install-button').click();
    await page.getByTestId('install-guide').waitFor();
    await page.waitForTimeout(900);
    expect(/Tap the Share button/.test(await page.getByTestId('install-step-title').innerText()), 'step 1: tap Share');
    const arrow = await page.getByTestId('install-arrow').boundingBox();
    const vw = page.viewportSize().width;
    expect(Math.abs(arrow.x + arrow.width / 2 - vw / 2) < 20 && arrow.y > page.viewportSize().height - 90, `the arrow bounces at the bottom middle, where Safari 18's Share button is (x ${Math.round(arrow.x)})`);
    expect(/arrow-bounce/.test(await page.getByTestId('install-arrow').evaluate((e) => getComputedStyle(e).animationName)), 'and it bounces');
    await page.screenshot({ path: 'I-step1-safari18.png' });
    await page.getByTestId('install-next').click();
    expect(/Add to Home Screen/.test(await page.getByTestId('install-step-title').innerText()) && (await page.getByTestId('install-arrow').count()) === 0, 'step 2: tap "Add to Home Screen", with a picture of the menu');
    await page.screenshot({ path: 'I-step2.png' });
    await page.getByTestId('install-done').click();
    expect((await page.getByTestId('install-guide').count()) === 0, 'Got it closes the guide');
    await page.context().close();
  }

  // ---------- iPhone, Safari 26: Share is in the ⋯ menu at the bottom right ----------
  {
    const page = await open({ userAgent: SAFARI_26 });
    await page.goto(`${BASE}#/`);
    await page.getByTestId('install-button').click();
    await page.waitForTimeout(900);
    expect(/Tap ⋯/.test(await page.getByTestId('install-step-title').innerText()), 'Safari 26: step 1 is the ⋯ button, then Share');
    const arrow = await page.getByTestId('install-arrow').boundingBox();
    expect(arrow.x > page.viewportSize().width - 90, `the arrow points at the bottom right (x ${Math.round(arrow.x)})`);
    await page.screenshot({ path: 'I-step1-safari26.png' });
    await page.getByTestId('install-next').click();
    await page.screenshot({ path: 'I-step2-safari26.png' });

    // Dismissed: gone, and stays gone. It also shows on the Learn tab until then.
    await page.getByTestId('install-done').click();
    await page.goto(`${BASE}#/es`);
    await page.getByTestId('install-card').waitFor();
    expect(true, 'the card is on the Learn tab too');
    await page.getByTestId('install-dismiss').click();
    expect((await page.getByTestId('install-card').count()) === 0, 'dismiss: gone');
    await page.reload();
    await page.locator('.lesson-node').first().waitFor();
    expect((await page.getByTestId('install-card').count()) === 0, 'and it stays gone');
    await page.context().close();
  }

  // ---------- Installed (Home Screen app): never shown ----------
  {
    const page = await open({}, () => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    await page.goto(`${BASE}#/`);
    await page.getByText('Pick a language').waitFor();
    expect((await page.getByTestId('install-card').count()) === 0, 'installed: no card at all');
    await page.context().close();
  }

  // ---------- Android / Chrome: the real install prompt ----------
  {
    const page = await open({ ...devices['Pixel 7'] });
    await page.goto(`${BASE}#/`);
    await page.getByText('Pick a language').waitFor();
    expect((await page.getByTestId('install-card').count()) === 0, 'Android before Chrome offers install: no card');
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      e.prompt = () => {
        window.__prompted = true;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await page.getByTestId('install-card').waitFor();
    expect(/Install the app/.test(await page.getByTestId('install-button').innerText()), 'Chrome offers install: "Install the app"');
    await page.getByTestId('install-card').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'I-android.png' });
    await page.getByTestId('install-button').click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__prompted === true), 'the button opens Chrome\'s own install prompt');
    expect((await page.getByTestId('install-card').count()) === 0, 'installed: the card goes away');
    await page.context().close();
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
