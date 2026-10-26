// Daily reminder guide (iPhone Shortcuts, nothing online) and the in-app streak warning.
import { devices, editProgress, launch, run } from './harness.mjs';

const BASE = 'http://localhost:4173/?test';
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};
const day = (ago) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

await run(async () => {
  const browser = await launch();
  const open = async (standalone = false) => {
    const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
    if (standalone) await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    return page;
  };

  // ---------- The guide, in Safari ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/settings`);
    await page.getByTestId('reminder-link').click();
    await page.locator('.step').first().waitFor();
    const text = await page.locator('main').innerText();
    const steps = await page.locator('.step-title').allInnerTexts();
    console.log('  steps:', steps.join(' → '));
    expect(/Shortcuts/.test(text) && /no account, no push service/i.test(text), 'guide: uses the built-in Shortcuts app, nothing online');
    expect(steps.some((s) => /time/i.test(s)) && /Time of Day/.test(text) && /Daily/.test(text), 'guide: time of day, repeating daily');
    expect(steps.some((s) => /Show Notification/.test(s)), 'guide: show a notification');
    expect(steps.some((s) => /Open URLs/.test(s)), 'guide (Safari): open the app URL');
    const url = await page.locator('.copy-text').nth(1).innerText();
    expect(url === 'http://localhost:4173/', `guide: the app's own address to paste (${url})`);
    await page.screenshot({ path: 'M-guide.png', fullPage: true });
    await page.getByRole('checkbox', { name: /Include the “Open URLs” step/ }).uncheck();
    expect(!(await page.locator('.step-title').allInnerTexts()).some((s) => /Open URLs/.test(s)), 'guide: the Open URLs step can be left out');
    await page.context().close();
  }

  // ---------- The guide, in the Home Screen app ----------
  {
    const page = await open(true);
    await page.goto(`${BASE}#/settings/reminder`);
    await page.locator('.step').first().waitFor();
    const steps = await page.locator('.step-title').allInnerTexts();
    const text = await page.locator('main').innerText();
    expect(!steps.some((s) => /Open URLs/.test(s)), 'Home Screen app: no Open URLs step by default');
    expect(/separate copy of the app with none of your XP or streak/.test(text), "Home Screen app: explains why (Safari wouldn't have your progress)");
    await page.screenshot({ path: 'M-standalone.png', fullPage: true });
    await page.context().close();
  }

  // ---------- Streak warning ----------
  {
    const page = await open();
    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p, days) => ({ ...p, lang: 'es', days: Object.fromEntries(days.map((d) => [d, 15])), celebrated: [] }), [day(1), day(2)]);
    await page.getByTestId('streak-warning').waitFor({ timeout: 5000 }).catch(() => {});
    const warn = await page.getByTestId('streak-warning').innerText().catch(() => '');
    expect(/2-day streak ends at midnight/.test(warn) && /left today/.test(warn), `streak warning: shown when today isn't done yet (${warn.split('\n')[0]})`);
    await page.screenshot({ path: 'M-warning.png' });
    await page.getByTestId('streak-practice').click();
    await page.waitForTimeout(600);
    expect(/#\/es\/learn\/[a-z0-9-]+$/.test(page.url()), `"Practice now" opens your next lesson (${page.url().split('#')[1]})`);

    await page.goto(`${BASE}#/es`);
    await editProgress(page, (p, today) => ({ ...p, days: { ...p.days, [today]: 10 } }), day(0));
    await page.waitForTimeout(800);
    expect((await page.getByTestId('streak-warning').count()) === 0, 'streak warning: gone once you practiced today');
    await editProgress(page, (p) => ({ ...p, days: {} }));
    await page.waitForTimeout(800);
    expect((await page.getByTestId('streak-warning').count()) === 0, 'streak warning: not shown when there is no streak');
    await page.context().close();
  }

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
