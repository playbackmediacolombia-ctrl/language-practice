// Copies the stroke data for every Chinese character the app uses (course, phrasebook, stories)
// from hanzi-writer-data into public/hanzi/, so character writing works offline and the app only
// ships the few hundred characters it needs instead of all 9,000. Runs before every build.
// The data comes from the Make Me a Hanzi project under the Arphic Public License, which is
// copied alongside it.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shared = join(here, '../../shared');
const out = join(here, '../public/hanzi');
const data = dirname(createRequire(import.meta.url).resolve('hanzi-writer-data/package.json'));

const sources = [join(shared, 'phrases.json'), join(shared, 'course/zh.json')];
const stories = join(shared, 'stories');
if (existsSync(stories)) for (const f of readdirSync(stories)) if (f.startsWith('zh')) sources.push(join(stories, f));

const chars = new Set();
for (const file of sources) for (const ch of readFileSync(file, 'utf8').match(/\p{Script=Han}/gu) ?? []) chars.add(ch);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const missing = [];
for (const ch of chars) {
  const src = join(data, `${ch}.json`);
  if (existsSync(src)) copyFileSync(src, join(out, `${ch}.json`));
  else missing.push(ch);
}
copyFileSync(join(data, 'ARPHICPL.TXT'), join(out, 'ARPHICPL.TXT'));
console.log(`hanzi: ${chars.size - missing.length} characters copied to public/hanzi${missing.length ? `, no stroke data for ${missing.join('')}` : ''}`);
