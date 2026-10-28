// Splits an SVG path into its separate shapes (subpaths), keeping holes with the shape they cut
// into, so drawings can be taken apart and rigged (eyes that blink, a mouth that talks).

const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** Commands and their numbers; arc flags are single digits that may be glued ("a5 5 0 015 5"). */
function parse(d) {
  const out = [];
  let i = 0;
  const num = () => {
    const m = /^[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/.exec(d.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[1]);
  };
  const flag = () => {
    const m = /^[\s,]*([01])/.exec(d.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[1]);
  };
  let cmd = null;
  while (i < d.length) {
    const c = /^[\s,]*([MLHVCSQTAZmlhvcsqtaz])/.exec(d.slice(i));
    if (c) {
      cmd = c[1];
      i += c[0].length;
      if (cmd.toUpperCase() === 'Z') { out.push([cmd, []]); continue; }
    } else if (!cmd || /^[\s,]*$/.test(d.slice(i))) break;
    const C = cmd.toUpperCase();
    const args = [];
    for (let k = 0; k < ARGS[C]; k++) {
      const v = C === 'A' && (k === 3 || k === 4) ? flag() : num();
      if (v === null) return out;
      args.push(v);
    }
    out.push([cmd, args]);
    if (C === 'M') cmd = cmd === 'm' ? 'l' : 'L';
  }
  return out;
}

/** The subpaths of `d`, each as a standalone path string starting with an absolute M, and its rough box. */
export function subpaths(d) {
  const subs = [];
  let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0;
  const box = () => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const grow = (b, px, py) => { b.x0 = Math.min(b.x0, px); b.y0 = Math.min(b.y0, py); b.x1 = Math.max(b.x1, px); b.y1 = Math.max(b.y1, py); };
  for (const [cmd, a] of parse(d)) {
    const C = cmd.toUpperCase(), rel = cmd !== C;
    if (C === 'Z') {
      cur.d += 'Z';
      x = sx; y = sy;
      continue;
    }
    if (C === 'M') {
      const nx = rel ? x + a[0] : a[0], ny = rel ? y + a[1] : a[1];
      cur = { d: `M${+nx.toFixed(2)} ${+ny.toFixed(2)}`, box: box() };
      subs.push(cur);
      x = sx = nx; y = sy = ny;
      grow(cur.box, x, y);
      continue;
    }
    cur.d += `${cmd}${a.join(' ')}`;
    const pts = [];
    if (C === 'H') { x = rel ? x + a[0] : a[0]; pts.push([x, y]); }
    else if (C === 'V') { y = rel ? y + a[0] : a[0]; pts.push([x, y]); }
    else if (C === 'A') { x = rel ? x + a[5] : a[5]; y = rel ? y + a[6] : a[6]; pts.push([x, y]); }
    else {
      for (let k = 0; k < a.length; k += 2) pts.push(rel ? [x + a[k], y + a[k + 1]] : [a[k], a[k + 1]]);
      [x, y] = pts.at(-1);
    }
    for (const [px, py] of pts) grow(cur.box, px, py);
  }
  return subs;
}

const inside = (a, b) => a.x0 >= b.x0 - 1 && a.y0 >= b.y0 - 1 && a.x1 <= b.x1 + 1 && a.y1 <= b.y1 + 1;

/** The separate shapes in an SVG snippet's paths: holes stay with the shape around them. */
export function shapes(svg) {
  const out = [];
  for (const m of svg.matchAll(/<path([^>]*?)\sd="([^"]+)"([^>]*?)\/>/g)) {
    const attrs = (m[1] + m[3]).trim();
    const fill = attrs.match(/fill="([^"]+)"/)?.[1] ?? '#000';
    const subs = subpaths(m[2]);
    const groups = [];
    for (const s of subs) {
      const host = groups.find((g) => inside(s.box, g.box));
      if (host) host.d += s.d;
      else groups.push({ ...s });
    }
    for (const g of groups) out.push({ d: g.d, fill, box: g.box });
  }
  return out;
}
