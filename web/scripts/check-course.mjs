// Checks the lesson path before every build, so a typo in shared/course/ can't ship a broken
// lesson: unique word ids per language, units that exist in the outline, lesson ids that match
// their unit, Chinese pinyin and word tiles that spell the sentence, and a recording for every item.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const outline = read('shared/course/outline.json');
const errors = [];

const inOutline = new Set(outline.stages.flatMap((s) => s.units));
for (const id of inOutline) if (!outline.units[id]) errors.push(`outline: ${id} has no title`);

const hanzi = (s) => s.replace(/[^\p{Script=Han}]/gu, '');

for (const lang of ['es', 'fr', 'zh']) {
  const seen = new Set();
  for (const unit of read(`shared/course/${lang}.json`).units) {
    if (!inOutline.has(unit.id)) errors.push(`${lang}: ${unit.id} isn't in the outline`);
    unit.lessons.forEach((lesson, n) => {
      if (lesson.id !== `${lang}-${unit.id.slice(1)}-${n + 1}`) errors.push(`${lang}: lesson ${lesson.id} should be ${lang}-${unit.id.slice(1)}-${n + 1}`);
      if (seen.has(lesson.id)) errors.push(`${lang}: lesson ${lesson.id} twice`);
      seen.add(lesson.id);
      for (const item of lesson.items) {
        const where = `${lang} ${lesson.id} ${item.id}`;
        if (!/^[a-z0-9-]+$/.test(item.id)) errors.push(`${where}: id should be lowercase letters, digits and dashes`);
        if (seen.has(item.id)) errors.push(`${where}: id used twice`);
        seen.add(item.id);
        if (!item.text || !item.en) errors.push(`${where}: text and en are required`);
        if (lang === 'zh') {
          if (!item.pinyin || !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(item.pinyin)) errors.push(`${where}: pinyin with tone marks is required`);
          if (item.tiles && item.tiles.join('') !== hanzi(item.text)) errors.push(`${where}: tiles ${item.tiles.join(' ')} don't spell ${item.text}`);
          if (!item.tiles && hanzi(item.text).length > 4 && item.kind !== 'sound') errors.push(`${where}: a sentence needs word tiles`);
        }
        if (!existsSync(join(root, `assets/audio/course/${lang}/${item.id}.mp3`))) errors.push(`${where}: no recording (run scripts/generate_audio.py)`);
      }
    });
  }
}

if (errors.length) {
  console.error(`Course check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('Course check passed.');
