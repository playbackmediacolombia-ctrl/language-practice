// Updates reach the phone: a newer version published while the app is open is picked up when
// the app comes back to the screen (no full reload needed), waits while you're in a lesson, and
// switches as soon as you're back on a tab. Serves its own copy of the build, so it can publish
// a "new version" mid-test.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { devices, launch, run } from './harness.mjs';

const SITE = new URL('./out/update-site/', import.meta.url).pathname;
const PORT = 4181;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

rmSync(SITE, { recursive: true, force: true });
cpSync(new URL('../dist/', import.meta.url).pathname, SITE, { recursive: true });
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = readFileSync(join(SITE, path.endsWith('/') ? path + 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? (path.endsWith('/') ? 'text/html' : 'application/octet-stream'), 'cache-control': 'max-age=600' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT);

/** Publish a "new version": a changed service worker and version.json, like a deploy does. */
function publish(n) {
  writeFileSync(join(SITE, 'sw.js'), readFileSync(join(SITE, 'sw.js'), 'utf8') + `\n// test version ${n}\n`);
  writeFileSync(join(SITE, 'version.json'), JSON.stringify({ commit: `test-version-${n}`, built: new Date().toISOString() }));
}

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'] });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const base = `http://localhost:${PORT}/?test`;
  const swScript = () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? null);
  const swVersion = () =>
    page.evaluate(async () => {
      const url = (await navigator.serviceWorker.getRegistration())?.active?.scriptURL;
      return url ? ([...(await (await fetch(url, { cache: 'no-store' })).text()).matchAll(/test version (\d+)/g)].pop()?.[1] ?? '0') : null;
    });

  await page.goto(`${base}#/es`);
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 180000 });
  expect(!!(await swScript()), 'first visit: the service worker installs and takes over (works offline)');

  // ---------- A new version, picked up when the app comes back to the screen ----------
  await page.evaluate(() => (window.__sameLoad = true));
  publish(1);
  const t0 = Date.now();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // like reopening the Home Screen app
  const reloaded = await page.waitForFunction(() => !window.__sameLoad, null, { timeout: 120000 }).then(() => true, () => false);
  expect(reloaded, `back on screen: the new version is found and the app switches to it by itself (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  expect((await swVersion()) === '1', 'the new service worker is the one in control');

  // ---------- In a lesson, it waits ----------
  await page.goto(`${base}#/es/learn/es-1-1`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => (window.__sameLoad = true));
  publish(2);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(8000);
  expect(await page.evaluate(() => window.__sameLoad === true), 'mid-lesson: no reload, the lesson is never interrupted');
  await page.evaluate(() => (location.hash = '#/es'));
  const after = await page.waitForFunction(() => !window.__sameLoad, null, { timeout: 30000 }).then(() => true, () => false);
  expect(after, 'back on the Learn tab: it switches to the new version');
  expect((await swVersion()) === '2', 'version 2 now in control');

  // ---------- Settings shows the build ----------
  await page.goto(`${base}#/settings`);
  const version = await page.getByTestId('app-version').innerText();
  const built = JSON.parse(readFileSync(new URL('../dist/version.json', import.meta.url), 'utf8'));
  expect(version.includes(built.commit.slice(0, 7)), `Settings shows the version (${version.split('\n')[0]})`);
  await page.getByTestId('check-update').click();
  await page.waitForTimeout(1500);
  expect(/new version is downloading/.test(await page.getByTestId('app-version').innerText()), 'Check for updates: sees the newer published version');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
}).finally(() => {
  server.close();
  rmSync(SITE, { recursive: true, force: true });
});
