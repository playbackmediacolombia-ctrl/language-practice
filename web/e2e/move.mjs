// Moving to learnguage.net: the old app copies everything as a move code, the new app (a separate
// address, so separate storage, like two Home Screen apps on the phone) pastes it and confirms.
import { devices, editProgress, launch, run } from './harness.mjs';

const NEW = 'http://localhost:4173/';
const OLD = `${NEW}?test&oldaddress&newhome=${encodeURIComponent(NEW)}`;
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
  const phone = { ...devices['iPhone 15'], serviceWorkers: 'block' };

  // ---------- The old app ----------
  const old = await (await browser.newContext(phone)).newPage();
  old.on('pageerror', (e) => console.log('PAGE ERROR (old)', e.message));
  await old.goto(`${OLD}#/es`);
  const lessons = Object.fromEntries(['es-1-1', 'es-1-2', 'es-1-3', 'fr-1-1'].map((id) => [`${id.slice(0, 2)}:${id}`, 1]));
  await editProgress(old, (p, a) => ({ ...p, lang: 'es', xp: 1234, days: Object.fromEntries(a.days.map((d) => [d, 30])), lessons: a.lessons, celebrated: null, goal: 30, theme: 'dark' }), { days: [day(0), day(1), day(2), day(3), day(4)], lessons });
  await old.reload();
  await old.getByTestId('move-banner').waitFor({ timeout: 10000 }).catch(() => {});
  expect((await old.getByTestId('move-banner').count()) === 1, 'old address: Learn shows "Learnguage has moved" once the new address is up');
  await old.getByTestId('move-banner').click();
  await old.getByTestId('move-out').waitFor();
  await old.locator('details.move-details').first().evaluate((d) => (d.open = true));
  await old.waitForFunction(() => document.querySelector('[data-testid=move-code]')?.value.startsWith('LG1.'));
  const code = await old.getByTestId('move-code').inputValue();
  const json = await old.evaluate(() => localStorage.getItem('progress-v1'));
  expect(code.length < json.length, `move code is compact: ${code.length} characters for ${json.length} of progress`);
  await old.screenshot({ path: 'V-old.png', fullPage: true });

  // ---------- The new app: empty, then paste ----------
  const fresh = await (await browser.newContext(phone)).newPage();
  fresh.on('pageerror', (e) => console.log('PAGE ERROR (new)', e.message));
  await fresh.goto(`${NEW}?test#/`);
  await fresh.getByTestId('move-welcome').click();
  await fresh.getByTestId('move-paste').waitFor();
  await fresh.locator('details.move-details').evaluate((d) => (d.open = true));
  await fresh.getByTestId('move-input').fill('hello');
  await fresh.getByTestId('move-use').click();
  expect(/isn't a move code/.test(await fresh.getByRole('alert').innerText()), 'new app: something that is not a move code is refused, nothing changes');
  await fresh.getByTestId('move-input').fill(code.slice(0, code.length - 40));
  await fresh.getByTestId('move-use').click();
  await fresh.waitForTimeout(300);
  expect(/missing/.test(await fresh.getByRole('alert').innerText()), 'new app: a cut-off code is refused with a clear message');
  await fresh.getByTestId('move-input').fill(`Here it is: ${code} `);
  await fresh.getByTestId('move-use').click();
  const confirm = await fresh.getByTestId('move-confirm').innerText();
  expect(/1234 XP/.test(confirm) && /3 lessons|4 lessons/.test(confirm), `new app: shows what will come over before changing anything (${confirm.split('\n')[2]})`);
  await fresh.screenshot({ path: 'V-confirm.png', fullPage: true });
  await fresh.getByTestId('move-confirm-btn').click();
  await fresh.getByTestId('move-done').waitFor();
  const moved = await fresh.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  const before = JSON.parse(json);
  expect(moved.xp === 1234 && JSON.stringify(moved.days) === JSON.stringify(before.days) && JSON.stringify(moved.lessons) === JSON.stringify(before.lessons), 'new app: XP, every streak day and every lesson arrive exactly');
  expect(moved.goal === 30 && moved.theme === 'dark', 'new app: settings come along too');
  await fresh.goto(`${NEW}?test#/es`);
  await fresh.waitForTimeout(600);
  expect(/5/.test(await fresh.locator('.stat-pill.streak').innerText()), `new app: the 5-day streak is on the Learn tab (${await fresh.locator('.stat-pill.streak').innerText()})`);
  const old2 = await old.evaluate(() => localStorage.getItem('progress-v1'));
  expect(old2 === json, 'old app: its progress is left untouched');

  // ---------- In Safari: the link carries it straight over ----------
  const safari = await (await browser.newContext(phone)).newPage();
  await safari.goto(`${NEW}?test#/move/${code}`);
  await safari.getByTestId('move-confirm').waitFor();
  expect(!safari.url().includes('LG1.'), 'link: the code is removed from the address bar right away');
  await safari.getByTestId('move-confirm-btn').click();
  expect((await safari.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')).xp)) === 1234, 'link: progress arrives');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
