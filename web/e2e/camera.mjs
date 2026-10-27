// Camera mode: snap a frame, the stand-in Worker names it (no quota used), hear it, add it to
// your words (spaced repetition); friendly messages when offline or over the daily limit.
import { readFileSync } from 'node:fs';
import { devices, launch, run } from './harness.mjs';

const API = 'http://localhost:4173/__talk/chat';
const BASE = `http://localhost:4173/?test&talkapi=${encodeURIComponent(API)}`;
let failures = 0;
const expect = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

await run(async () => {
  const browser = await launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' });
  await context.addInitScript(() => {
    // A fake camera: a drawn "cup" on a canvas.
    const real = MediaDevices.prototype.getUserMedia;
    MediaDevices.prototype.getUserMedia = async function (c) {
      if (!c?.video) return real.call(this, c);
      if (window.__cameraBlocked) throw new DOMException('denied', 'NotAllowedError');
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const g = canvas.getContext('2d');
      const draw = () => {
        g.fillStyle = '#f4e3c3';
        g.fillRect(0, 0, 640, 480);
        g.fillStyle = '#0164f9';
        g.fillRect(250, 160, 140, 170);
        g.fillStyle = '#071334';
        g.font = '40px sans-serif';
        g.fillText('cup', 280, 120);
      };
      draw();
      setInterval(draw, 100);
      return canvas.captureStream(10);
    };
  });
  const requests = [];
  let mode = 'ok';
  await context.route(`**/__talk/vision*`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    if (mode === 'quota') return route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"quota"}' });
    if (mode === 'none') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ found: false, word: '', meaning: '', example: '', exampleTranslation: '', audio: null }) });
    const audio = readFileSync(new URL('../../assets/audio/course/es/si-gracias.mp3', import.meta.url)).toString('base64');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ found: true, word: 'la taza', meaning: 'cup, mug', example: 'Quiero una taza de café.', exampleTranslation: 'I want a cup of coffee.', audio }) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await context.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      if (this.src.startsWith('blob:')) window.__playedBlob = true;
      return play.apply(this, a);
    };
  });

  await page.goto(`${BASE}#/practice`);
  await page.getByTestId('camera-card').click();
  await page.waitForFunction(() => document.querySelector('.camera-video.on')?.videoWidth > 0, null, { timeout: 15000 });
  expect(true, 'the camera view starts');
  expect(/isn't kept/.test(await page.locator('main').innerText()), 'it says where the photo goes and that it is not kept');
  await page.screenshot({ path: 'C-camera.png' });
  await page.getByTestId('camera-snap').click();
  await page.getByTestId('camera-result').waitFor({ timeout: 15000 });
  const r = await page.getByTestId('camera-result').innerText();
  expect(/la taza/.test(r) && /cup, mug/.test(r) && /Quiero una taza de café/.test(r), 'names it in Spanish, with the English and an example');
  const sent = requests[0];
  expect(sent.lang === 'es' && sent.image.startsWith('/9j/') && sent.image.length < 120000, `the photo is sent as a small JPEG (${Math.round((sent.image.length * 3) / 4 / 1024)} KB)`);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__playedBlob === true), 'and says the word out loud');
  await page.screenshot({ path: 'C-result.png' });
  await page.getByTestId('camera-add').click();
  expect(/Added/.test(await page.getByTestId('camera-add').innerText()), 'Add to my words');
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('progress-v1')));
  expect(!!p.srs['es:ai:la-taza'] && p.talkWords['es:ai:la-taza']?.en === 'cup, mug', 'it goes into spaced repetition');

  mode = 'none';
  await page.getByTestId('camera-snap').click();
  await page.getByTestId('camera-none').waitFor();
  expect(true, 'nothing clear in the photo: a friendly tip');

  mode = 'quota';
  await page.getByTestId('camera-snap').click();
  await page.getByTestId('camera-problem').waitFor();
  expect(/used up/.test(await page.getByTestId('camera-problem').innerText()), 'over the daily limit: a friendly message');
  await context.setOffline(true);
  await page.getByTestId('camera-snap').click();
  await page.waitForTimeout(300);
  expect(/offline/.test(await page.getByTestId('camera-problem').innerText()), 'offline: a friendly message');
  await context.setOffline(false);

  // A photo from the library works too.
  mode = 'ok';
  await page.getByTestId('camera-file').setInputFiles(new URL('../public/icons/icon-192.png', import.meta.url).pathname);
  await page.getByTestId('camera-result').waitFor({ timeout: 15000 });
  expect(true, 'or pick a photo instead');

  // Camera blocked: says how to allow it, and offers a photo.
  const p2 = await context.newPage();
  await p2.addInitScript(() => (window.__cameraBlocked = true));
  await p2.goto(`${BASE}#/es/camera`);
  await p2.getByText(/camera is blocked/).waitFor();
  expect(true, 'camera blocked: how to allow it, or pick a photo');

  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
});
