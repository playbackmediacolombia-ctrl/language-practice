import { useEffect, useState } from 'react';
import { Ink } from './art';
import type { InkLayer } from './ink.gen';
import { STICKERS } from './ink.gen';
import type { PICTURES, PICTURE_STICKERS } from './pictures.gen';

// Hand-drawn pictures of what a word means, for the first hint. They're only needed in lessons,
// so they load in their own small file (cached with the app, so they work offline too).

export type PictureName = keyof typeof PICTURES | keyof typeof PICTURE_STICKERS;

type Pics = typeof import('./pictures.gen');
let pics: Pics | null = null;
let loading: Promise<Pics> | null = null;
/** Loads the pictures once; if it fails (say, offline before the app was cached), the next picture tries again. */
function load() {
  loading ??= import('./pictures.gen').then(
    (m) => (pics = m),
    (e) => {
      loading = null;
      throw e;
    },
  );
  return loading;
}

function layersFor(m: Pics, name: PictureName): readonly InkLayer[] {
  const sticker = (m.PICTURE_STICKERS as Record<string, keyof typeof STICKERS>)[name];
  return sticker ? STICKERS[sticker] : (m.PICTURES as Record<string, readonly InkLayer[]>)[name];
}

export function Picture({ name, size = 44 }: { name: PictureName; size?: number }) {
  const [m, setM] = useState(pics);
  useEffect(() => {
    if (m) return;
    let live = true;
    load().then(
      (p) => live && setM(p),
      () => {}, // no picture this time; the bubble still shows
    );
    return () => {
      live = false;
    };
  }, [m]);
  return (
    <svg className="hint-picture" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="A picture of it" data-picture={name}>
      {m && <Ink layers={layersFor(m, name)} />}
    </svg>
  );
}
