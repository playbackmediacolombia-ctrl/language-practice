// The app's drawings, as clean shapes; scripts/ink.mjs goes over them with the hand-drawn brush.
// Each drawing is a list of layers, drawn in order:
//   ['ink', d]              a line in ink (the icons' own color, or navy in color drawings)
//   ['line', d, color, w?]  a line in a color
//   ['fill', d, color]      a flat color, no outline
//   ['shape', d, color, w?] a flat color with an ink outline
//   ['raw', svg]            kept as it is (lettering)
// Colors are palette names (see PALETTE in src/art.tsx), 'ink', 'cur' (currentColor) or 'duo'.
import { circle, ellipse, rect } from './inkbrush.mjs';

const T = (x, y, size, color, text, weight = 800) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="Plus Jakarta Sans Variable, sans-serif">${text}</text>`;

// ---- Icons: 24×24, one color (currentColor) ----

export const ICONS = {
  learn: [['ink', 'M12 6.5C9.8 5 6.9 4.4 3.5 4.9v13.4c3.4-.5 6.3.1 8.5 1.6 2.2-1.5 5.1-2.1 8.5-1.6V4.9c-3.4-.5-6.3.1-8.5 1.6ZM12 6.5v13.4']],
  practice: [['ink', 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11']],
  progress: [['ink', 'M5 20v-8M12 20V5M19 20v-5']],
  settings: [['ink', `M4 7h9M17 7h3M4 17h3M11 17h9${circle(15, 7, 2)}${circle(9, 17, 2)}`]],
  back: [['ink', 'M15 5 8 12l7 7']],
  close: [['ink', 'M6 6l12 12M18 6 6 18']],
  chevron: [['ink', 'm9 5 7 7-7 7']],
  speaker: [['ink', 'M4 9.5v5h3.5L12 18V6L7.5 9.5ZM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11']],
  mute: [['ink', 'M4 9.5v5h3.5L12 18V6L7.5 9.5ZM16 9.5l5 5M21 9.5l-5 5']],
  mic: [['ink', `${rect(9, 3, 6, 11, 3)}M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21`]],
  check: [['ink', 'm5 12.5 4.5 4.5L19 7.5']],
  ticks: [['ink', 'm2.5 12.5 4 4 8.5-9M11 16l1 1 8.5-9.5']],
  phone: [['ink', 'M7.2 3.5 9.6 3c.5-.1 1 .2 1.2.7l1.2 3.1c.2.5 0 1-.4 1.3L10 9.3a12 12 0 0 0 4.7 4.7l1.2-1.6c.3-.4.8-.6 1.3-.4l3.1 1.2c.5.2.8.7.7 1.2l-.5 2.4c-.2.8-.9 1.3-1.7 1.3C10.4 18 6 13.6 6 5.2c0-.8.5-1.5 1.2-1.7Z']],
  send: [['ink', 'M4 12 20 4l-4 16-4-7-8-1Zm8 1 8-9']],
  lock: [['ink', `${rect(5, 11, 14, 9.5, 2.5)}M8.5 11V8a3.5 3.5 0 0 1 7 0v3`]],
  review: [['ink', 'M4.5 12a7.5 7.5 0 0 1 13-5.1M18.5 3.5v4h-4M19.5 12a7.5 7.5 0 0 1-13 5.1M5.5 20.5v-4h4']],
  book: [['ink', 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5ZM5 19.5A1.5 1.5 0 0 0 6.5 21H19']],
  cards: [['ink', `${rect(4, 6, 12, 15, 2)}M8 3h10a2 2 0 0 1 2 2v12`]],
  quiz: [['ink', `${circle(12, 12, 8.5)}M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.2`]],
  target: [['ink', `${circle(12, 12, 8.5)}${circle(12, 12, 4.5)}M12 12v.1`]],
  sun: [['ink', `${circle(12, 12, 4)}M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4`]],
  bell: [['ink', 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5h4']],
  copy: [['ink', `${rect(8.5, 8.5, 11, 11, 2)}M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5`]],
  download: [['ink', 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14']],
  chat: [['ink', 'M4 5.5h16v10H9l-5 4Z']],
  bulb: [['ink', 'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z']],
  brush: [['ink', 'M14.5 4.5 19.5 9.5 10 19H5v-5ZM12.5 6.5l5 5']],
  // Solid ones: the shape filled, gone over with the same ink so its edge is hand-drawn.
  flame: [['shape', 'M12.3 2.5c.8 3.3 4.7 5.3 4.7 10.2a5 5 0 0 1-10 .3c0-2 .9-3.5 2-4.6.2 1.5.9 2.5 1.9 3 .1-3.4-.2-6.2 1.4-8.9Z', 'cur', 1.5]],
  heart: [['shape', 'M12 20.5s-7.3-4.4-9.1-8.9C1.6 8.3 3.6 5 6.9 5c2 0 3.4 1.1 5.1 3 1.7-1.9 3.1-3 5.1-3 3.3 0 5.3 3.3 4 6.6-1.8 4.5-9.1 8.9-9.1 8.9Z', 'cur', 1.5]],
  bolt: [['shape', 'M13.2 2.5 4.8 13.6h6.3l-1 7.9 8.4-11.1h-6.3Z', 'cur', 1.5]],
  play: [['shape', 'M8 5.2v13.6c0 .8.9 1.3 1.6.8l10-6.8a1 1 0 0 0 0-1.6l-10-6.8c-.7-.5-1.6 0-1.6.8Z', 'cur', 1.5]],
  stop: [['shape', rect(6.5, 6.5, 11, 11, 2.5), 'cur', 1.5]],
  pause: [['shape', rect(6.5, 5.5, 4, 13, 1.5) + rect(13.5, 5.5, 4, 13, 1.5), 'cur', 1.5]],
  star: [['shape', 'm12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z', 'cur', 1.5]],
};
/** Icons drawn solid (the rest are lines). */
export const SOLID_ICONS = ['flame', 'heart', 'bolt', 'play', 'stop', 'pause', 'star'];

// ---- Tab bar icons: 24×24, a light wash (duo) under the line ----

export const TAB_ICONS = {
  learn: [['fill', 'M4 11.2 12 4.5l8 6.7v8.3a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z', 'duo'], ['ink', 'M4 11.2 12 4.5l8 6.7v8.3a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z']],
  practice: [['fill', rect(5, 7, 3.5, 10, 1.2) + rect(15.5, 7, 3.5, 10, 1.2), 'duo'], ['ink', rect(5, 7, 3.5, 10, 1.2) + rect(15.5, 7, 3.5, 10, 1.2) + 'M8.5 12h7M2.5 10v4M21.5 10v4']],
  progress: [['fill', 'M7 4h10v5a5 5 0 0 1-10 0Z', 'duo'], ['ink', 'M7 4h10v5a5 5 0 0 1-10 0ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8.5 20.5h7l-1-3.5h-5Z']],
  settings: [['fill', circle(12, 12, 7), 'duo'], ['ink', `M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7${circle(12, 12, 6.2)}${circle(12, 12, 2.4)}`]],
};

// ---- Stickers: 64×64, flat colors and navy ink ----

const sunRays = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((a) => {
    const r = (a * Math.PI) / 180;
    const p = (d) => `${(32 + Math.sin(r) * d).toFixed(2)} ${(32 - Math.cos(r) * d).toFixed(2)}`;
    return `M${p(26)}L${p(19)}`;
  })
  .join('');
const face = (color, extra) => [['shape', circle(32, 32, 22), color], ...extra];

export const STICKERS = {
  sounds: [['shape', 'M14 26h8l10-8v28l-10-8h-8Z', 'sun'], ['line', 'M38 25c3 3 3 11 0 14M43 20c6 6 6 18 0 24', 'blue']],
  words: [['shape', 'M12 18a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H28l-10 8v-8a6 6 0 0 1-6-6Z', 'skyLight'], ['raw', T(32, 34, 18, '#fff', 'hi!')]],
  home: [['shape', 'M12 30 32 13l20 17v19a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z', 'orange'], ['shape', 'M32 46s-9-5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z', 'white', 2.5]],
  heart: [['shape', 'M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27Z', 'red'], ['line', 'M19 24c1-3 3-5 6-5', 'white', 2.6]],
  colors: [
    ['shape', 'M32 11C19 11 10 20 10 31s8 20 17 20c4 0 5-3 4-6s1-6 5-6h6c6 0 10-4 10-10 0-10-9-18-20-18Z', 'cream'],
    ['fill', circle(22, 27, 4), 'red'], ['fill', circle(31, 20, 4), 'sun'], ['fill', circle(41, 24, 4), 'blue'], ['fill', circle(22, 39, 4), 'skyLight'],
  ],
  bag: [['shape', 'M14 22h36l-3 30H17Z', 'orange'], ['ink', 'M24 26v-6a8 8 0 0 1 16 0v6'], ['line', 'M18 31h28', 'sun', 4.5], ['fill', circle(24, 27, 2.2), 'navy'], ['fill', circle(40, 27, 2.2), 'navy']],
  numbers: [['shape', rect(8, 14, 48, 36, 9), 'white'], ['raw', T(32, 40, 20, '#0164F9', '123')]],
  wave: [
    ['shape', 'M22 50c-6-6-10-14-8-22l3-12a3 3 0 0 1 6 1l-1 9 4-16a3 3 0 0 1 6 1l-3 14 5-17a3 3 0 0 1 6 2l-4 16 5-12a3 3 0 0 1 5 2l-6 18c-2 8-6 14-12 17Z', 'sun'],
    ['line', 'M10 18a10 10 0 0 1 6-8M50 44a10 10 0 0 1-4 8', 'sky'],
  ],
  pin: [['shape', 'M32 54S16 37 16 27a16 16 0 0 1 32 0c0 10-16 27-16 27Z', 'red'], ['shape', circle(32, 27, 6), 'white', 2.5]],
  chat: [
    ['shape', 'M8 16a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H20l-7 6v-6a5 5 0 0 1-5-5Z', 'sun'],
    ['shape', 'M56 32a5 5 0 0 0-5-5H31a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h12l7 6v-6a5 5 0 0 0 6-5Z', 'skyLight'],
  ],
  cup: [
    ['shape', 'M14 24h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12Z', 'white'],
    ['ink', 'M44 28h4a6 6 0 0 1 0 12h-5'],
    ['line', 'M16 31h26', 'orange', 4.5],
    ['line', 'M24 10c-3 4 3 6 0 10M33 10c-3 4 3 6 0 10', 'slate', 2.5],
  ],
  sun: [['line', sunRays, 'orange', 4], ['shape', circle(32, 32, 13), 'sun']],
  book: [
    ['shape', 'M32 18c-6-4-14-5-21-4v32c7-1 15 0 21 4 6-4 14-5 21-4V14c-7-1-15 0-21 4Z', 'white'],
    ['ink', 'M32 18v32'],
    ['line', 'M17 23c4 0 7 1 10 2M17 30c4 0 7 1 10 2M37 25c3-1 6-2 10-2M37 32c3-1 6-2 10-2', 'blue', 2.4],
  ],
  phone: [['shape', rect(18, 8, 28, 48, 6), 'navy'], ['fill', rect(21, 14, 22, 34, 2), 'white'], ['fill', 'M24 22h14l-3 3h-11Z', 'skyLight'], ['fill', 'M27 32h13v5H31l-4 3Z', 'sun']],
  briefcase: [['ink', 'M24 20v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4'], ['shape', rect(10, 20, 44, 30, 5), 'orange'], ['ink', 'M10 32h44'], ['shape', rect(28, 29, 8, 7, 2), 'sun', 2.5]],
  health: [['shape', 'M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27Z', 'white'], ['line', 'M32 24v16M24 32h16', 'red', 5.5]],
  plane: [['shape', 'M8 36 56 14l-14 36-9-11Z', 'white'], ['shape', 'm33 39 23-25-30 20Z', 'skyLight']],
  news: [
    ['shape', rect(10, 12, 40, 40, 4), 'white'],
    ['ink', 'M50 22h4v24a6 6 0 0 1-6 6'],
    ['fill', rect(16, 18, 28, 9, 2), 'blue'],
    ['line', 'M16 34h12M16 40h12M16 46h12', 'slate', 2.4],
    ['fill', rect(32, 33, 12, 13, 2), 'sun'],
  ],
  debate: [
    ['shape', 'M6 18a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H18l-7 6v-6a5 5 0 0 1-5-5Z', 'red'],
    ['shape', 'M58 30a5 5 0 0 0-5-5H35a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h11l7 6v-6a5 5 0 0 0 5-5Z', 'blue'],
    ['raw', T(20, 29, 15, '#fff', '!') + T(44, 41, 15, '#fff', '?')],
  ],
  bowtie: [['shape', 'M8 20l20 9v6L8 44ZM56 20 36 29v6l20 9Z', 'blue'], ['shape', rect(27, 26, 10, 12, 3), 'sun']],
  bulb: [
    ['shape', 'M32 8a16 16 0 0 0-9 29c2 2 3 4 3 7h12c0-3 1-5 3-7a16 16 0 0 0-9-29Z', 'sun'],
    ['ink', 'M26 50h12M28 56h8'],
    ['line', 'M27 23c1-3 3-5 6-5', 'white', 3],
  ],
  shades: [
    ['shape', circle(32, 32, 22), 'sun'],
    ['ink', 'M14 27h36'],
    ['shape', 'M15 27h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6ZM35 27h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6Z', 'navy'],
    ['ink', 'M25 45c4 3 10 3 14 0'],
  ],
  trophy: [
    ['shape', 'M20 10h24v14a12 12 0 0 1-24 0Z', 'sun'],
    ['ink', 'M20 15h-7a7 7 0 0 0 7 9M44 15h7a7 7 0 0 1-7 9M32 36v8'],
    ['shape', 'M24 52h16l-2-8H26Z', 'orange'],
    ['fill', 'm32 15 2 4 4 .6-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.6Z', 'white'],
  ],
  hearts: [
    ['shape', 'M24 46S8 37 8 25a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 12-16 21-16 21Z', 'red'],
    ['shape', 'M42 54S30 47 30 38a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 9-12 16-12 16Z', 'orange'],
  ],
  lovetext: [['shape', rect(18, 8, 28, 48, 6), 'navy'], ['fill', rect(21, 14, 22, 34, 2), 'white'], ['fill', 'M32 40s-7-4-7-9a3.5 3.5 0 0 1 7-1.5 3.5 3.5 0 0 1 7 1.5c0 5-7 9-7 9Z', 'red']],
  rings: [
    ['line', circle(25, 36, 13), 'navy', 7],
    ['line', circle(39, 36, 13), 'navy', 7],
    ['line', circle(25, 36, 13), 'sun', 3.4],
    ['line', circle(39, 36, 13), 'sun', 3.4],
    ['shape', 'm39 13 4 5-4 5-4-5Z', 'skyLight', 2.2],
  ],
  wink: face('sun', [
    ['ink', 'M22 28c2-2 5-2 7 0'],
    ['fill', circle(41, 27, 3), 'navy'],
    ['shape', 'M22 39c5 6 15 6 20 0Z', 'white'],
    ['fill', 'M46 14s-4-2-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 3-4 5-4 5Z', 'red'],
  ]),
  // For celebrations and empty states.
  party: [
    ['shape', 'M10 56 22 20l22 22Z', 'sun'],
    ['line', 'M16 40l10 10M19 31l15 15', 'orange', 3.2],
    ['line', 'M30 16c2-4 6-5 8-2M44 24c4-2 8-1 9 3M40 10l2-5M50 14l4-3M52 33l6 1', 'blue', 2.8],
    ['fill', circle(34, 6, 2.6), 'red'], ['fill', circle(57, 22, 2.6), 'skyLight'], ['fill', circle(48, 42, 2.4), 'red'],
  ],
  clap: [
    ['shape', 'M24 54c-8-4-13-12-12-20l2-14a3 3 0 0 1 6 0v8l6-17a3 3 0 0 1 6 2l-4 13 8-15a3 3 0 0 1 5 3l-7 14 9-9a3 3 0 0 1 4 4l-9 12c-4 8-8 14-14 19Z', 'sun'],
    ['line', 'M44 8l2-4M52 14l4-3M54 24l5 0', 'orange', 2.8],
  ],
  medal: [
    ['shape', 'M22 6h8l6 18h-8ZM42 6h-8l-6 18h8Z', 'blue'],
    ['shape', circle(32, 40, 15), 'sun'],
    ['line', circle(32, 40, 9), 'orange', 2.4],
    ['raw', T(32, 46, 15, '#071334', '1')],
  ],
  empty: [
    ['shape', 'M10 30h44l-5 22a4 4 0 0 1-4 3H19a4 4 0 0 1-4-3Z', 'cream'],
    ['ink', 'M10 30c2-6 6-9 10-9M54 30c-2-6-6-9-10-9'],
    ['line', 'M26 12c-3 3 1 5-1 8M38 9c-3 3 1 5-1 8', 'slate', 2.4],
    ['line', 'M22 40h20', 'orange', 3],
  ],
  calendar: [
    ['shape', rect(10, 14, 44, 40, 6), 'white'],
    ['shape', 'M10 20a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v6H10Z', 'red'],
    ['ink', 'M22 9v9M42 9v9'],
    ['line', 'M18 36h6M30 36h6M42 36h4M18 45h6M30 45h6', 'slate', 3],
  ],
};

// ---- Pictures for hints: 64×64, what a word means ----

const clockFace = [['shape', circle(32, 32, 22), 'white'], ['ink', 'M32 18v14l9 6'], ['fill', circle(32, 32, 2.6), 'navy']];
const digit = (n, color) => [['shape', rect(12, 10, 40, 44, 12), color], ['raw', T(32, 45, 30, '#fff', String(n))]];

export const PICTURES = {
  cat: [
    ['shape', 'M14 26 12 8l12 9a24 24 0 0 1 16 0l12-9-2 18c3 4 4 8 4 12 0 11-10 18-22 18S10 49 10 38c0-4 1-8 4-12Z', 'orange'],
    ['fill', circle(24, 34, 2.8), 'navy'], ['fill', circle(40, 34, 2.8), 'navy'],
    ['shape', 'M30 41h4l-2 2.5Z', 'red', 2],
    ['ink', 'M32 43.5c-1 3-4 3-6 2M32 43.5c1 3 4 3 6 2'],
    ['line', 'M6 38l11 2M6 45l11-1M58 38l-11 2M58 45l-11-1', 'slate', 2],
  ],
  dog: [
    ['shape', 'M18 22c0-8 6-12 14-12s14 4 14 12v14c0 10-6 18-14 18s-14-8-14-18Z', 'cream'],
    ['shape', 'M18 18c-6-2-12 4-11 14 1 6 5 8 8 6l4-14ZM46 18c6-2 12 4 11 14-1 6-5 8-8 6l-4-14Z', 'orange'],
    ['fill', circle(25, 30, 2.8), 'navy'], ['fill', circle(39, 30, 2.8), 'navy'],
    ['shape', ellipse(32, 40, 5, 3.6), 'navy'],
    ['ink', 'M32 44v3c-2 3-6 3-8 1M32 47c2 3 6 3 8 1'],
  ],
  water: [['shape', 'M32 6C26 18 14 28 14 40a18 18 0 0 0 36 0C50 28 38 18 32 6Z', 'sky'], ['line', 'M23 40c0 5 3 9 8 10', 'white', 3.2]],
  tea: [
    ['shape', 'M12 26h34v10a17 17 0 0 1-34 0Z', 'white'],
    ['ink', 'M46 30h3a5 5 0 0 1 0 10h-5'],
    ['fill', 'M15 30h28v6a14 14 0 0 1-28 0Z', 'orange'],
    ['line', 'M30 26V10M30 10h8v7h-8', 'slate', 2.2],
    ['ink', 'M8 54h44'],
  ],
  bread: [
    ['shape', 'M10 30c0-10 8-16 22-16s22 6 22 16c0 4-3 6-6 6v14H16V36c-3 0-6-2-6-6Z', 'sun'],
    ['line', 'M22 26l4 6M31 24l4 6M40 26l4 6', 'orange', 3],
  ],
  beer: [
    ['shape', 'M14 18h28v32a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4Z', 'sun'],
    ['ink', 'M42 24h6a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-6'],
    ['shape', 'M12 18c0-6 6-8 10-6 2-4 10-4 12 0 4-2 10 0 10 6-2 3-6 3-8 1-3 3-9 3-12 0-3 2-9 2-12-1Z', 'white'],
    ['line', 'M22 28v18M32 28v18', 'white', 2.6],
  ],
  wine: [['shape', 'M20 8h24c2 14-2 24-12 24S18 22 20 8Z', 'white'], ['fill', 'M20.6 16h22.8c0 9-4 14-11.4 14S20.6 25 20.6 16Z', 'red'], ['ink', 'M32 32v20M22 54h20']],
  milk: [
    ['shape', 'M20 22l6-10h12l6 10v30a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3Z', 'white'],
    ['ink', 'M20 22h24'],
    ['fill', rect(23, 30, 18, 14, 3), 'sky'],
    ['shape', rect(26, 6, 12, 6, 2), 'blue', 2.4],
  ],
  apple: [
    ['shape', 'M32 18c-6-6-20-4-20 12 0 12 8 24 14 24 3 0 4-2 6-2s3 2 6 2c6 0 14-12 14-24 0-16-14-18-20-12Z', 'red'],
    ['ink', 'M32 18c0-5 1-8 4-11'],
    ['shape', 'M36 14c2-6 8-8 12-6-2 6-8 8-12 6Z', 'skyLight', 2.4],
    ['line', 'M19 28c1-4 3-6 6-7', 'white', 3],
  ],
  banana: [
    ['shape', 'M12 18c4 18 16 30 36 30 4 0 6-2 6-4-14 0-26-10-32-26-1-4-11-4-10 0Z', 'sun'],
    ['ink', 'M14 16l-2-6h6l2 6'],
    ['line', 'M22 22c5 10 13 17 24 20', 'orange', 2.4],
  ],
  rice: [
    ['shape', 'M8 32h48c0 14-10 22-24 22S8 46 8 32Z', 'blue'],
    ['shape', 'M10 32c0-10 10-16 22-16s22 6 22 16Z', 'white'],
    ['line', 'M22 24h3M30 21h3M38 25h3M26 28h3M35 29h3', 'cream', 2.4],
    ['ink', 'M44 6 30 20M52 8 36 22'],
  ],
  cheese: [
    ['shape', 'M8 36 46 14l10 14v20H8Z', 'sun'],
    ['ink', 'M8 36h48'],
    ['fill', circle(20, 44, 3.4), 'orange'], ['fill', circle(36, 42, 4), 'orange'], ['fill', circle(47, 29, 3), 'orange'], ['fill', circle(48, 46, 2.4), 'orange'],
  ],
  egg: [['shape', 'M32 8c-10 0-18 16-18 28a18 18 0 0 0 36 0C50 24 42 8 32 8Z', 'white'], ['line', 'M22 34c0-6 3-12 6-15', 'cream', 3]],
  fish: [
    ['shape', 'M8 32c8-12 20-16 30-12 6 2 10 7 12 12-2 5-6 10-12 12-10 4-22 0-30-12Z', 'sky'],
    ['shape', 'M48 32l10-10v20Z', 'blue'],
    ['fill', circle(18, 30, 2.6), 'navy'],
    ['line', 'M28 24c3 4 3 12 0 16', 'white', 2.6],
  ],
  chicken: [
    ['shape', 'M28 12c-12 0-20 10-18 20 2 8 10 12 18 12 4 0 6-2 8-4l10 10c2-2 4-2 6-1-1-2-1-4 1-6l-10-10c2-3 3-6 2-10-1-6-7-11-17-11Z', 'orange'],
    ['shape', circle(53, 50, 4) + circle(49, 54, 3.4), 'white', 2.4],
    ['line', 'M18 24c2-4 6-6 10-6', 'sun', 3],
  ],
  meat: [
    ['shape', 'M8 30c2-12 14-18 26-16 10 2 20 8 22 18 2 12-8 20-22 20-8 0-12-4-18-4-6 0-10-6-8-18Z', 'red'],
    ['line', 'M18 26c8-2 16 0 22 6s14 6 14 6', 'cream', 3.4],
    ['shape', circle(28, 34, 4), 'white', 2.4],
  ],
  soup: [
    ['shape', 'M8 30h48c0 14-10 24-24 24S8 44 8 30Z', 'orange'],
    ['shape', ellipse(32, 30, 24, 5), 'sun'],
    ['line', 'M22 8c-3 4 3 6 0 10M32 6c-3 4 3 6 0 10M42 8c-3 4 3 6 0 10', 'slate', 2.4],
  ],
  cake: [
    ['shape', 'M10 32h44v20H10Z', 'cream'],
    ['shape', 'M10 32c0-4 3-6 6-6h32c3 0 6 2 6 6 0 4-4 4-6 2-2 4-6 4-8 0-2 4-6 4-8 0-2 4-6 4-8 0-2 4-6 4-8 0-2 2-6 2-6-2Z', 'red', 2.6],
    ['ink', 'M10 52h44'],
    ['shape', rect(29, 12, 6, 14, 1.5), 'sky', 2.4],
    ['shape', 'M32 3c3 3 4 6 0 8-4-2-3-5 0-8Z', 'sun', 2],
  ],
  car: [
    ['shape', 'M6 40c0-4 2-7 6-8l6-10c2-3 4-4 8-4h12c4 0 6 1 8 4l6 10c4 1 6 4 6 8v6H6Z', 'red'],
    ['shape', 'M20 30l4-7h7v7ZM35 23h5l4 7h-9Z', 'skyLight', 2.4],
    ['shape', circle(18, 46, 6) + circle(46, 46, 6), 'navy'],
    ['fill', circle(18, 46, 2.2) + circle(46, 46, 2.2), 'white'],
  ],
  bus: [
    ['shape', rect(10, 8, 44, 42, 7), 'sun'],
    ['shape', rect(15, 14, 34, 16, 3), 'skyLight', 2.4],
    ['ink', 'M10 36h44'],
    ['fill', circle(18, 43, 3) + circle(46, 43, 3), 'white'],
    ['shape', rect(14, 50, 8, 6, 2) + rect(42, 50, 8, 6, 2), 'navy'],
  ],
  train: [
    ['shape', 'M14 16c0-6 4-10 10-10h16c6 0 10 4 10 10v28a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z', 'blue'],
    ['shape', rect(19, 14, 26, 14, 3), 'skyLight', 2.4],
    ['fill', circle(22, 40, 3) + circle(42, 40, 3), 'sun'],
    ['ink', 'M20 50l-6 8M44 50l6 8M10 58h44'],
  ],
  hotel: [
    ['shape', rect(14, 10, 36, 46, 3), 'blue'],
    ['fill', rect(19, 16, 7, 7, 1.5) + rect(29, 16, 7, 7, 1.5) + rect(39, 16, 6, 7, 1.5) + rect(19, 27, 7, 7, 1.5) + rect(29, 27, 7, 7, 1.5) + rect(39, 27, 6, 7, 1.5), 'sun'],
    ['shape', 'M26 56V44a6 6 0 0 1 12 0v12', 'white'],
    ['ink', 'M6 56h52'],
  ],
  school: [
    ['shape', 'M10 28 32 12l22 16v26H10Z', 'red'],
    ['shape', circle(32, 30, 6), 'white', 2.4],
    ['ink', 'M32 27v3h3'],
    ['shape', 'M26 54V44h12v10', 'sun'],
    ['line', 'M32 12V4h8v5h-8', 'blue', 2.4],
  ],
  money: [
    ['shape', rect(6, 18, 52, 30, 5), 'skyLight'],
    ['shape', circle(32, 33, 9), 'white', 2.4],
    ['raw', T(32, 38.5, 14, '#071334', '€')],
    ['fill', circle(14, 33, 2.4) + circle(50, 33, 2.4), 'navy'],
  ],
  rain: [
    ['shape', 'M16 36a10 10 0 0 1 0-20 14 14 0 0 1 26-4 11 11 0 0 1 6 24Z', 'white'],
    ['line', 'M20 44l-3 8M32 44l-3 8M44 44l-3 8', 'sky', 3.4],
  ],
  snow: [['line', 'M32 8v48M11 20l42 24M11 44l42-24M26 10l6 6 6-6M26 54l6-6 6 6M8 26l8-2-2-8M56 38l-8 2 2 8M8 38l8 2-2 8M56 26l-8-2 2-8', 'sky', 3.4]],
  cold: face('skyLight', [['fill', circle(24, 28, 3) + circle(40, 28, 3), 'navy'], ['line', 'M22 42l4-3 4 3 4-3 4 3 4-3', 'white', 2.6], ['line', 'M8 14l4 4M56 14l-4 4', 'sky', 2.6]]),
  hot: face('orange', [['ink', 'M20 30c2-3 6-3 8 0M36 30c2-3 6-3 8 0'], ['shape', 'M24 40c4 6 12 6 16 0Z', 'red', 2.4], ['shape', 'M48 18c-3 4-3 7 0 8 3-1 3-4 0-8Z', 'sky', 2]]),
  hello: [
    ['shape', 'M22 50c-6-6-10-14-8-22l3-12a3 3 0 0 1 6 1l-1 9 4-16a3 3 0 0 1 6 1l-3 14 5-17a3 3 0 0 1 6 2l-4 16 5-12a3 3 0 0 1 5 2l-6 18c-2 8-6 14-12 17Z', 'sun'],
    ['line', 'M10 18a10 10 0 0 1 6-8M50 44a10 10 0 0 1-4 8', 'sky'],
  ],
  thanks: [
    ['shape', 'M30 54 22 36c-2-4-2-8 0-12l8-18c1-3 4-2 4 1l-2 26ZM34 54l8-18c2-4 2-8 0-12L34 6c-1-3-4-2-4 1l2 26Z', 'sun'],
    ['line', 'M14 14l4 4M50 14l-4 4M10 28h5M54 28h-5', 'orange', 2.6],
  ],
  sorry: face('sun', [['ink', 'M20 26l8 3M44 26l-8 3'], ['fill', circle(25, 33, 2.6) + circle(39, 33, 2.6), 'navy'], ['ink', 'M25 45c4-3 10-3 14 0']]),
  happy: face('sun', [['ink', 'M20 30c2-4 6-4 8 0M36 30c2-4 6-4 8 0'], ['shape', 'M21 38c4 8 18 8 22 0Z', 'white', 2.6], ['fill', circle(17, 36, 3) + circle(47, 36, 3), 'orange']]),
  sad: face('sun', [['fill', circle(24, 29, 2.8) + circle(40, 29, 2.8), 'navy'], ['ink', 'M23 46c4-5 14-5 18 0'], ['shape', 'M42 34c-2 4-2 6 0 7 2-1 2-3 0-7Z', 'sky', 2]]),
  tired: face('sun', [['ink', 'M19 31h9M36 31h9M28 44h8'], ['line', 'M44 12h6l-6 6h6', 'blue', 2.4]]),
  hungry: [
    ['shape', circle(32, 34, 20), 'white'],
    ['line', circle(32, 34, 13), 'cream', 3],
    ['ink', 'M6 14v12a3 3 0 0 0 6 0V14M9 26v28M56 14c-4 0-6 6-6 12h6v28'],
  ],
  love: [['shape', 'M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27Z', 'red'], ['line', 'M19 24c1-3 3-5 6-5', 'white', 2.6]],
  morning: [
    ['line', 'M32 14v6M14 24l4 4M50 24l-4 4M8 38h6M50 38h6', 'orange', 3.4],
    ['shape', 'M16 44a16 16 0 0 1 32 0Z', 'sun'],
    ['ink', 'M6 44h52M14 52h36'],
  ],
  night: [
    ['shape', 'M40 8a22 22 0 1 0 16 34A18 18 0 0 1 40 8Z', 'sun'],
    ['fill', 'M14 12l1.5 3.5L19 17l-3.5 1.5L14 22l-1.5-3.5L9 17l3.5-1.5Z', 'skyLight'],
  ],
  today: [
    ['shape', rect(10, 14, 44, 40, 6), 'white'],
    ['shape', 'M10 20a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v6H10Z', 'red'],
    ['ink', 'M22 9v9M42 9v9'],
    ['shape', circle(32, 40, 7), 'sun', 2.4],
  ],
  clock: clockFace,
  birthday: [
    ['shape', 'M10 32h44v20H10Z', 'cream'],
    ['shape', 'M10 32c0-4 3-6 6-6h32c3 0 6 2 6 6 0 4-4 4-6 2-2 4-6 4-8 0-2 4-6 4-8 0-2 4-6 4-8 0-2 4-6 4-8 0-2 2-6 2-6-2Z', 'red', 2.6],
    ['ink', 'M10 52h44'],
    ['shape', rect(20, 14, 5, 12, 1.5) + rect(39, 14, 5, 12, 1.5), 'sky', 2.2],
    ['shape', 'M22.5 5c3 3 3 5 0 7-3-2-3-4 0-7ZM41.5 5c3 3 3 5 0 7-3-2-3-4 0-7Z', 'sun', 2],
  ],
  music: [['shape', ellipse(18, 46, 8, 6) + ellipse(44, 40, 8, 6), 'blue'], ['ink', 'M26 46V14l26-6v32'], ['line', 'M26 22l26-6', 'navy', 5]],
  football: [
    ['shape', circle(32, 32, 22), 'white'],
    ['shape', 'M32 22l8 6-3 9h-10l-3-9Z', 'navy', 2.4],
    ['ink', 'M32 22V11M40 28l10-4M37 37l6 9M27 37l-6 9M24 28l-10-4'],
  ],
  beach: [
    ['fill', 'M4 50c10-4 20-4 30 0s20 4 26 0v10H4Z', 'sky'],
    ['shape', 'M6 46c8-3 18-4 30-3', 'cream', 2.4],
    ['ink', 'M34 50 26 18'],
    ['shape', 'M10 22c4-10 26-14 34-4Z', 'red'],
    ['shape', circle(50, 14, 6), 'sun', 2.4],
  ],
  tree: [['shape', 'M32 6c-12 0-20 8-20 18 0 8 6 14 12 14h16c6 0 12-6 12-14 0-10-8-18-20-18Z', 'skyLight'], ['shape', 'M28 38h8v16h-8Z', 'orange'], ['ink', 'M16 56h32']],
  flower: [
    ['ink', 'M32 34v22M32 46c-4-4-10-4-12-2 4 4 8 4 12 2'],
    ['shape', `${circle(32, 12, 7)}${circle(42, 20, 7)}${circle(38, 31, 7)}${circle(26, 31, 7)}${circle(22, 20, 7)}`, 'red'],
    ['shape', circle(32, 22, 6), 'sun', 2.4],
  ],
  shop: [['shape', 'M14 22h36l-3 30H17Z', 'orange'], ['ink', 'M24 26v-6a8 8 0 0 1 16 0v6'], ['line', 'M18 31h28', 'sun', 4.5]],
  restaurant: [['shape', circle(32, 34, 18), 'white'], ['line', circle(32, 34, 11), 'cream', 3], ['ink', 'M6 14v12a3 3 0 0 0 6 0V14M9 26v28M58 14c-4 0-6 6-6 12h6v28']],
  drink: [
    ['shape', 'M16 20h32l-4 34H20Z', 'skyLight'],
    ['fill', 'M18 30h28l-2.8 22H20.8Z', 'orange'],
    ['line', 'M36 26l6-20h8', 'red', 3],
    ['line', 'M24 38v2M30 44v2M38 36v2', 'white', 2.6],
  ],
  sleep: [
    ['shape', rect(6, 32, 52, 14, 4), 'blue'],
    ['shape', rect(10, 24, 16, 10, 4), 'white', 2.4],
    ['ink', 'M6 46v8M58 46v8'],
    ['raw', T(44, 22, 13, '#404D6B', 'z') + T(52, 13, 10, '#404D6B', 'z')],
  ],
  thumbs: [
    ['shape', 'M20 28h-8v24h8ZM20 50h22c4 0 6-2 7-5l5-14c1-4-1-7-5-7H38l2-10c1-4-2-7-5-7l-15 19Z', 'sun'],
  ],
  one: digit(1, 'blue'),
  two: digit(2, 'sky'),
  three: digit(3, 'orange'),
  four: digit(4, 'red'),
  five: digit(5, 'skyLight'),
};
/** Hint pictures that are a sticker already (picture → sticker). */
export const PICTURE_STICKERS = { house: 'home', coffee: 'cup', book: 'book', phone: 'phone', plane: 'plane', hospital: 'health', sun: 'sun', work: 'briefcase', wink: 'wink' };

// ---- The bird: an in-app version of the logo's macaw, 120×120, facing right ----
// Parts are drawn and animated separately (see src/Bird.tsx).

export const BIRD = {
  tail: [
    ['shape', 'M46 92C38 104 30 112 18 117c10 0 22-6 31-16Z', 'skyLight'],
    ['shape', 'M52 96c-4 9-7 15-12 22 8-4 14-11 18-20Z', 'deep'],
  ],
  body: [['shape', 'M58 50c-16 0-26 12-26 28 0 14 10 26 26 26s24-10 24-24c0-18-10-30-24-30Z', 'blue']],
  belly: [
    ['shape', 'M64 56c12 0 19 9 19 22 0 15-9 26-21 26-9 0-12-8-10-19 2-13 5-23 12-29Z', 'sun'],
    ['line', 'M60 76c2 2 5 2 7 0M70 72c2 2 5 2 7 0M58 87c2 2 5 2 7 0M68 84c2 2 5 2 7 0M64 96c2 2 4 2 6 0', 'orange', 2],
  ],
  feet: [['line', 'M52 102l-3 7M47 109h5M62 103l2 7M61 110h5', 'slate', 3.2]],
  crest: [
    ['shape', 'M48 30C40 24 32 24 24 28c8 0 14 2 18 6-8-1-14 1-20 6 8-1 16 0 22 4Z', 'blue'],
    ['shape', 'M50 22c-4-8-2-14 4-18 0 6 2 10 6 12Z', 'skyLight'],
  ],
  head: [['shape', 'M62 18c-14 0-24 10-24 24 0 12 8 20 20 20 6 0 12-2 16-6l6-14c0-14-6-24-18-24Z', 'blue']],
  forehead: [['fill', 'M68 20c6 1 11 5 13 12l-8 2c-2-6-4-10-5-14Z', 'cream']],
  throat: [['shape', 'M60 52c5 8 15 11 25 7 1 5-1 9-6 11-8 2-15-2-19-9Z', 'sun', 2.4]],
  face: [['shape', 'M74 30c-8 0-14 6-14 14s6 14 14 14c4 0 8-2 10-6V34c-2-3-6-4-10-4Z', 'white', 2.6]],
  faceLines: [['line', 'M66 50c2 1 4 1 6 0M69 54c2 1 4 1 6 0', 'cream', 1.8]],
  beak: [['shape', 'M78 28c12-3 23 4 23 18 0 10-4 16-10 19 2-9 0-16-11-18Z', 'slate'], ['line', 'M84 32c4 0 8 2 10 6', 'white', 1.8]],
  jaw: [['shape', 'M79 48c7 0 11 4 10 10-2 5-8 6-11 3Z', 'slate', 2.6]],
  tongue: [['fill', 'M80 50c4 0 6 2 6 5-2 2-5 2-6 1Z', 'red']],
  eyeOpen: [['fill', circle(73.5, 41, 4.6), 'navy'], ['fill', circle(75, 39.4, 1.6), 'white']],
  eyeHappy: [['ink', 'M68 43c1-5 9-5 11 0']],
  eyeNap: [['ink', 'M68 41c2 4 9 4 11 0']],
  brow: [['ink', 'M67 33c3-2 8-2 11 0']],
  sweat: [['shape', 'M88 24q3 5 0 7q-3-2 0-7Z', 'skyLight', 2]],
  wing: [
    ['shape', 'M50 60c-14 4-20 18-16 38 8-2 16-8 20-16 4-8 4-16-4-22Z', 'deep'],
    ['line', 'M40 86c4-1 7-3 9-6M38 76c4 0 7-2 9-4', 'skyLight', 2.4],
  ],
  wingUp: [
    ['shape', 'M50 66C42 54 32 44 18 40c-2 8 2 14 8 18-4 0-6 2-6 4 6 2 10 4 12 6-3 1-4 3-3 5 8 0 16-2 24-4Z', 'deep'],
    ['line', 'M26 52c6 2 10 6 14 10M30 64c4 0 8 2 12 4', 'skyLight', 2.4],
  ],
  farWing: [
    ['shape', 'M72 64C84 50 98 42 112 42c-1 9-6 14-13 18 4 1 6 3 6 6-7 1-12 3-17 7-5 3-9 4-13 4Z', 'deep'],
    ['line', 'M104 50c-7 2-14 7-18 12M100 66c-6 0-10 2-14 5', 'skyLight', 2.2],
  ],
  book: [
    ['shape', 'M48 74 66 78l18-4v22l-18 4-18-4Z', 'red'],
    ['shape', 'M51 76 66 80v17l-15-4ZM81 76 66 80v17l15-4Z', 'white', 2.2],
    ['line', 'M55 82l7 2M55 86l7 2M70 84l7-2M70 88l7-2', 'sky', 1.8],
  ],
  globe: [['fill', circle(72, 86, 14), 'sky']],
  globeInk: [['line', ellipse(72, 86, 6, 14), 'white', 1.6], ['ink', circle(72, 86, 14)]],
  globeLand: [['fill', 'M62 80Q66 74 72 77Q70 83 74 86Q68 90 63 87ZM76 90Q82 86 84 92Q80 98 75 96Z', 'sun']],
  flame: [
    ['shape', 'M100 30C92 22 98 12 94 4c10 6 16 16 12 26-2 4-6 4-6 0Z', 'orange', 2.4],
    ['fill', 'M100 30c-3-5 1-10-1-15 6 4 7 10 4 15Z', 'sun'],
  ],
  note1: [['shape', 'M98 14v16a4 3 0 1 1-2-2.6V16l10-3v3Z', 'sky', 2]],
  note2: [['shape', 'M14 30v12a3.5 2.6 0 1 1-2-2.2V30Z', 'sky', 2]],
  // The sound lines from the logo, when it cheers.
  talk: [['line', 'M100 52h8M100 60l6 4', 'sun', 2.6]],
  ledge: [['ink', 'M44 66q-4 6 0 10M80 66q4 6 0 10']],
};

// ---- Bits for celebrations: confetti pieces and sparkles, drawn by hand ----

export const BITS = {
  squiggle: [['line', 'M2 10c2-6 4-6 6 0s4 6 6 0 4-6 6 0', 'cur', 2.6]],
  star: [['shape', 'm12 2 2.6 6.2 6.4.6-4.8 4.2 1.5 6.5L12 16.2 6.3 19.5l1.5-6.5L3 8.8l6.4-.6Z', 'cur', 1.6]],
  dot: [['shape', circle(12, 12, 6), 'cur', 1.6]],
  zig: [['line', 'M3 16 8 6l5 10 5-10 3 6', 'cur', 2.6]],
  spark: [['line', 'M12 3v18M3 12h18', 'cur', 2.6]],
};

// ---- The reward chest's ink, over its own colored shapes (see ChestArt in Path.tsx) ----

export const CHEST = {
  body: [['ink', `${rect(10, 34, 60, 32, 7)}M10 41h60M36 41v25M44 41v25`]],
  coins: [['ink', `${circle(30, 34, 6)}${circle(42, 31, 6)}${circle(52, 35, 5.5)}`]],
  lid: [['ink', 'M10 36Q10 13 40 13Q70 13 70 36ZM36 14v22M44 14v22']],
  lock: [['ink', rect(33, 31, 14, 13, 3.5)]],
};
