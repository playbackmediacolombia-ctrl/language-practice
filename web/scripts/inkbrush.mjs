// The hand-drawn "ink" brush: turns clean SVG strokes into filled brush outlines, so every icon,
// sticker and the bird share the Open Peeps look — one ink line that swells and tapers, wobbles a
// little, overshoots where a loop closes, and lifts at sharp corners. Deterministic: the same
// drawing always comes out the same, so the generated file only changes when a drawing does.
import { svgPathProperties } from 'svg-path-properties';
import { subpaths } from './svgparts.mjs';

/** A small seeded random generator (the seed comes from the drawing's name and path). */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
export const hash = (str) => {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** The direction of a part at `at`, from nearby points (the library's arc tangents are wrong). */
const dir = (p, at) => {
  const e = Math.min(0.05, p.length / 4);
  const a = p.getPointAtLength(clamp(at - e, 0, p.length)), b = p.getPointAtLength(clamp(at + e, 0, p.length));
  return unit({ x: b.x - a.x, y: b.y - a.y });
};
const unit = (v) => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const ease = (t) => 1 - (1 - t) * (1 - t);

/** A path as smooth runs: it splits at sharp corners, where a hand lifts the pen. */
function runs(d) {
  const out = [];
  for (const sub of subpaths(d)) {
    const closed = /z$/i.test(sub.d);
    const parts = new svgPathProperties(sub.d).getParts().filter((p) => p.length > 1e-4);
    if (!parts.length) {
      const [, x, y] = sub.d.match(/M(-?[\d.]+) (-?[\d.]+)/);
      out.push({ dot: { x: +x, y: +y } });
      continue;
    }
    const tan = (p, at) => dir(p, at);
    const turn = (a, b) => {
      const t1 = tan(a, a.length - 1e-3), t2 = tan(b, 1e-3);
      return Math.acos(clamp(t1.x * t2.x + t1.y * t2.y, -1, 1));
    };
    const groups = [[parts[0]]];
    for (let i = 1; i < parts.length; i++) (turn(parts[i - 1], parts[i]) < 0.62 ? groups.at(-1) : groups[groups.push([]) - 1]).push(parts[i]);
    let loop = false;
    if (closed && turn(parts.at(-1), parts[0]) < 0.62) {
      if (groups.length > 1) groups[0] = [...groups.pop(), ...groups[0]];
      else loop = true;
    }
    groups.forEach((g, i) => out.push({ parts: g, loop, joinStart: closed || i > 0, joinEnd: closed || i < groups.length - 1 }));
  }
  return out;
}

function sampler(parts) {
  const lens = parts.map((p) => p.length);
  const total = lens.reduce((a, b) => a + b, 0);
  return {
    total,
    at(s, wrap) {
      s = wrap ? ((s % total) + total) % total : clamp(s, 0, total);
      let i = 0;
      while (i < parts.length - 1 && s > lens[i]) s -= lens[i++];
      const p = parts[i];
      const at = clamp(s, 0, p.length);
      const pt = p.getPointAtLength(at);
      const t = dir(p, at);
      return { x: pt.x, y: pt.y, t };
    },
  };
}

const fmt = (n, dec) => {
  const v = +n.toFixed(dec);
  return Object.is(v, -0) ? '0' : String(v);
};

/**
 * A closed ring of points as a smooth path: quadratic curves through the midpoints, written as
 * one Q and then T's (each T's control point is the next point), in relative steps between
 * rounded points so nothing drifts.
 */
function ring(pts, dec) {
  const m = pts.length;
  const k = 10 ** dec;
  const r = (v) => Math.round(v * k);
  const mids = pts.map((a, i) => {
    const b = pts[(i + 1) % m];
    return [r((a[0] + b[0]) / 2), r((a[1] + b[1]) / 2)];
  });
  const n = (v) => {
    const s = String(v / k);
    return s.replace(/^(-?)0\./, '$1.');
  };
  const pair = (x, y) => `${n(x)}${y < 0 ? '' : ' '}${n(y)}`.replace(' -', '-');
  let [px, py] = mids[m - 1];
  const c = [r(pts[0][0]), r(pts[0][1])];
  let d = `M${pair(px, py)}q${pair(c[0] - px, c[1] - py)} ${pair(mids[0][0] - px, mids[0][1] - py)}`.replace(/ -/g, '-');
  [px, py] = mids[0];
  for (let i = 1; i < m; i++) {
    const [x, y] = mids[i];
    d += `t${pair(x - px, y - py)}`;
    [px, py] = [x, y];
  }
  return d + 'z';
}

function dot(c, r, dec, rand) {
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.92 + rand() * 0.16);
    pts.push([c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr]);
  }
  return ring(pts, dec);
}

/**
 * Brush outlines for the strokes of `d`, `w` wide (the nominal line weight, in the drawing's own
 * units). `seed` keeps it repeatable. Options: `wobble` (how far the line wanders, × w), `taper`
 * (how thin the free ends get, 0–1), `dec` (decimals).
 */
export function brush(d, w, seed, { wobble = 0.17, taper = 0.4, dec = 2, steady = false } = {}) {
  const rand = rng(seed);
  let out = '';
  for (const r of runs(d)) {
    if (r.dot) {
      out += dot(r.dot, w * 0.62, dec, rand);
      continue;
    }
    const S = sampler(r.parts);
    const L = S.total;
    if (L < w * 0.7) {
      out += dot(S.at(L / 2), w * 0.64, dec, rand);
      continue;
    }
    const over = r.loop ? Math.min(L * 0.09, w * 2.4) : 0; // a loop overshoots where it closes
    const len = L + over;
    const step = Math.max(w * 1.1, len / 90);
    const n = Math.max(5, Math.ceil(len / step));
    const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
    const lam1 = w * 15, lam2 = w * 5.5, lamW = w * 7.5;
    const amp = steady ? 0 : w * wobble;
    const taperLen = Math.min(len * 0.38, w * 2.6);
    const startMin = r.joinStart && !r.loop ? 0.82 : 1 - (1 - taper) * 0.75;
    const endMin = r.joinEnd && !r.loop ? 0.82 : taper;
    const start0 = r.loop ? rand() * L : 0;
    const L1 = [], R1 = [];
    let first, last;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * len;
      const p = S.at(start0 + s, r.loop);
      const nx = -p.t.y, ny = p.t.x;
      let off = amp * (0.6 * Math.sin((2 * Math.PI * s) / lam1 + ph[0]) + 0.4 * Math.sin((2 * Math.PI * s) / lam2 + ph[1]));
      if (r.loop) off += w * 0.35 * (s / len - 0.5); // the two ends don't quite meet
      const fs = startMin + (1 - startMin) * ease(clamp(s / taperLen, 0, 1));
      const fe = endMin + (1 - endMin) * ease(clamp((len - s) / taperLen, 0, 1));
      const hw = (w / 2) * Math.min(fs, fe) * (1 + 0.13 * Math.sin((2 * Math.PI * s) / lamW + ph[2]));
      const cx = p.x + nx * off, cy = p.y + ny * off;
      const pt = { x: cx, y: cy, t: p.t, n: { x: nx, y: ny }, hw };
      if (i === 0) first = pt;
      last = pt;
      L1.push(pt);
      R1.push(pt);
    }
    // Offset each side; drop points where a tight bend would fold the inner side back on itself.
    const side = (pts, sgn) => {
      const o = [];
      for (const p of pts) {
        const q = [p.x + p.n.x * p.hw * sgn, p.y + p.n.y * p.hw * sgn];
        const prev = o.at(-1);
        if (prev && (q[0] - prev[0]) * p.t.x + (q[1] - prev[1]) * p.t.y < 0) continue;
        o.push(q);
      }
      return o;
    };
    const left = side(L1, 1);
    const right = side(R1, -1).reverse();
    const cap = (p, dir) => {
      const o = [];
      for (let k = 1; k < 5; k++) {
        const a = (k / 5) * Math.PI;
        o.push([p.x + p.hw * (p.n.x * Math.cos(a) * dir + p.t.x * Math.sin(a) * dir), p.y + p.hw * (p.n.y * Math.cos(a) * dir + p.t.y * Math.sin(a) * dir)]);
      }
      return o;
    };
    out += ring([...left, ...cap(last, 1), ...right, ...cap(first, -1)], dec);
  }
  return out;
}

/** The outline of a filled shape, gone over by hand: the edge wobbles a little. */
export function rough(d, w, seed, { dec = 2, amount = 0.12, shift = 0 } = {}) {
  const rand = rng(seed);
  let out = '';
  for (const sub of subpaths(d)) {
    const props = new svgPathProperties(sub.d);
    const L = props.getTotalLength();
    if (L < 1e-3) continue;
    const n = Math.max(8, Math.ceil(L / (w * 1.6)));
    const ph = [rand() * 6.28, rand() * 6.28];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const s = (i / n) * L;
      const p = props.getPointAtLength(s);
      const t = dir({ length: L, getPointAtLength: (x) => props.getPointAtLength(x) }, s);
      const off = w * amount * (0.6 * Math.sin((2 * Math.PI * s) / (w * 14) + ph[0]) + 0.4 * Math.sin((2 * Math.PI * s) / (w * 5) + ph[1]));
      pts.push([p.x - t.y * off + shift, p.y + t.x * off + shift * 1.2]);
    }
    out += ring(pts, dec);
  }
  return out;
}

// ---- Shape helpers for writing the drawings ----

export const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
export const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
export function rect(x, y, w, h, r = 0) {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`;
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
}
