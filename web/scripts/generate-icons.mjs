// Builds the app icon, favicon, launch (splash) screens and in-app logo images from the
// brand logo, and writes the launch-screen <link> tags into index.html.
// Run after changing the logo:  npm run icons
// The source logo is only read, never modified. The PNGs are committed, so building the
// site doesn't need this script (or sharp).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const LOGO = join(root, '..', 'Logos', 'logo.png');

// Brand colors, sampled from the logo (see styles.css for how the app uses them).
const LIGHT_BG = '#F4F8FF';
const DARK_BG = '#070D1A';

// ---- Pieces of the logo, in its own pixel coordinates ----

const PARROT = { region: { left: 60, top: 140, width: 930, height: 740 }, seed: [560, 650] }; // seed: yellow chest
const BUBBLE = { region: { left: 860, top: 70, width: 490, height: 390 }, seed: [1100, 250] }; // seed: inside "Hola"

/** RGBA pixels of a region of the logo. */
async function pixels(region) {
  const img = region ? sharp(LOGO).extract(region) : sharp(LOGO);
  return img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Marks which pixels belong to the shape containing (sx, sy) (8-connected, alpha > 24). */
function flood(data, W, H, starts) {
  const keep = new Uint8Array(W * H);
  const stack = [...starts];
  while (stack.length) {
    const p = stack.pop();
    if (keep[p] || data[p * 4 + 3] < 24) continue;
    keep[p] = 1;
    const x = p % W;
    const y = (p - x) / W;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) stack.push(ny * W + nx);
      }
  }
  return keep;
}

const toPng = (data, width, height) => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

/** One shape cut out of the logo, without its neighbours (e.g. the parrot without the speech lines). */
async function cutout({ region, seed }) {
  const { data, info } = await pixels(region);
  const keep = flood(data, info.width, info.height, [(seed[1] - region.top) * info.width + (seed[0] - region.left)]);
  for (let p = 0; p < keep.length; p++) if (!keep[p]) data[p * 4 + 3] = 0;
  return toPng(data, info.width, info.height);
}

/** The whole logo with stray specks (tiny disconnected bits around the edges) removed. */
async function cleanLogo() {
  const { data, info } = await pixels();
  const { width: W, height: H } = info;
  const seen = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (seen[p] || data[p * 4 + 3] < 24) continue;
    const part = flood(data, W, H, [p]);
    let size = 0;
    for (let q = 0; q < part.length; q++) if (part[q]) (seen[q] = 1), size++;
    if (size < 1500) for (let q = 0; q < part.length; q++) if (part[q]) data[q * 4 + 3] = 0;
  }
  return sharp(await toPng(data, W, H)).trim({ threshold: 1 }).png().toBuffer();
}

/** Places `img` resized to `height` at (x, y) on a `size` canvas, trimming what falls outside. */
async function place(img, height, x, y, size) {
  const resized = await sharp(img).resize({ height }).png().toBuffer();
  const { width } = await sharp(resized).metadata();
  const left = Math.max(0, -x);
  const top = Math.max(0, -y);
  const w = Math.min(width - left, size - Math.max(x, 0));
  const h = Math.min(height - top, size - Math.max(y, 0));
  return { input: await sharp(resized).extract({ left, top, width: w, height: h }).png().toBuffer(), left: Math.max(x, 0), top: Math.max(y, 0) };
}

// A soft sunny-sky background, from the logo's yellow and blue.
const iconBg = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><radialGradient id="g" cx="0.28" cy="0.18" r="1.05">
    <stop offset="0" stop-color="#FFF4C7"/><stop offset="0.5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D3E8FF"/>
  </radialGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/></svg>`);

/**
 * The square icon: the parrot large in the bottom-left, running off the edges like a bust,
 * and its "Hola" bubble in the top-right. `scale` < 1 shrinks the art into a safe zone
 * (for Android's maskable icons, which get cropped to a circle).
 */
async function iconArt(parrot, bubble, size, scale = 1) {
  const s = size / 1024;
  const k = scale;
  const parrotH = Math.round(780 * s * k);
  const bubbleH = Math.round(335 * s * k);
  const bubbleW = Math.round((bubbleH * 490) / 390);
  const inset = Math.round(((1 - k) * size) / 2);
  const layers = [
    await place(parrot, parrotH, Math.round(-40 * s * k) + inset, size - parrotH + Math.round(70 * s * k) - inset, size),
    await place(bubble, bubbleH, size - bubbleW - Math.round(40 * s * k) - inset, Math.round(40 * s * k) + inset, size),
  ];
  // Flatten onto an opaque background: iOS shows any transparent pixel in an icon as black.
  return sharp(iconBg(size)).composite(layers).flatten({ background: '#ffffff' }).removeAlpha().png({ compressionLevel: 9 }).toBuffer();
}

// Portrait launch screens for iPhones: CSS points and pixel ratio.
const DEVICES = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
  [430, 932, 3], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6–8 Plus
  [375, 667, 2], // SE, 6–8
];

async function splash(w, h, dpr, bg, logo) {
  const W = w * dpr;
  const H = h * dpr;
  const logoW = Math.round(Math.min(300, w * 0.72) * dpr);
  const img = await sharp(logo).resize({ width: logoW }).png().toBuffer();
  const { height: logoH } = await sharp(img).metadata();
  return sharp({ create: { width: W, height: H, channels: 3, background: bg } })
    .composite([{ input: img, left: Math.round((W - logoW) / 2), top: Math.round(H * 0.45 - logoH / 2) }])
    // A 256-color palette keeps each screen ~100 KB; the flat background compresses to almost nothing.
    .png({ palette: true, quality: 95, effort: 10, dither: 0.6 })
    .toBuffer();
}

await mkdir(join(pub, 'icons'), { recursive: true });
await mkdir(join(pub, 'splash'), { recursive: true });
await mkdir(join(pub, 'brand'), { recursive: true });

const parrot = await cutout(PARROT);
const bubble = await cutout(BUBBLE);
const logo = await cleanLogo();

// Icons, drawn at each size from the full-resolution art (sharper than scaling one down).
for (const size of [1024, 512, 192, 180, 64, 32]) {
  const art = await iconArt(parrot, bubble, 1024);
  const name = size <= 64 ? `favicon-${size}.png` : `icon-${size}.png`;
  await sharp(art).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(join(pub, 'icons', name));
}
await sharp(await iconArt(parrot, bubble, 1024, 0.8)).resize(512).png().toFile(join(pub, 'icons', 'icon-maskable-512.png'));

// In-app images: the full logo (welcome screen) and a small mark for the header, at 3× for iPhone.
await sharp(logo).resize({ width: 720 }).webp({ quality: 88, alphaQuality: 95 }).toFile(join(pub, 'brand', 'logo.webp'));
const mark = await sharp({ create: { width: 1240, height: 900, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: await sharp(parrot).resize({ height: 820 }).png().toBuffer(), left: 0, top: 80 },
    { input: await sharp(bubble).resize({ height: 380 }).png().toBuffer(), left: 760, top: 0 },
  ])
  .png()
  .toBuffer();
await sharp(await sharp(mark).trim({ threshold: 1 }).png().toBuffer()).resize({ height: 120 }).png({ compressionLevel: 9 }).toFile(join(pub, 'brand', 'mark.png'));

const links = [];
for (const [w, h, dpr] of DEVICES) {
  for (const [name, bg] of [['light', LIGHT_BG], ['dark', DARK_BG]]) {
    const file = `splash/${name}-${w * dpr}x${h * dpr}.png`;
    await writeFile(join(pub, file), await splash(w, h, dpr, bg, logo));
    const media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${name})`;
    links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="${file}" />`);
  }
}

const htmlPath = join(root, 'index.html');
const html = await readFile(htmlPath, 'utf8');
const block = `    <!-- splash:start (generated by scripts/generate-icons.mjs) -->\n${links.join('\n')}\n    <!-- splash:end -->`;
await writeFile(htmlPath, html.replace(/ {4}<!-- splash:start[\s\S]*?splash:end -->/, block));
console.log(`Wrote icons, favicons, brand images and ${links.length} launch screens from ${LOGO}.`);
