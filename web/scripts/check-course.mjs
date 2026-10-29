// Checks the lesson path before every build, so a typo in shared/course/ can't ship a broken
// lesson: unique word ids per language, units that exist in the outline, lesson ids that match
// their unit, Chinese pinyin and word tiles that spell the sentence, a recording for every item,
// and grammar tips (shared/grammar/) that point at real lessons and words.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const outline = read('shared/course/outline.json');
const errors = [];

const inOutline = new Set(outline.stages.flatMap((s) => [...s.units, ...(s.electives ?? [])]));
for (const id of outline.adult ?? []) if (!inOutline.has(id)) errors.push(`outline: adult unit ${id} isn't an elective on any stage`);
for (const id of inOutline) if (!outline.units[id]) errors.push(`outline: ${id} has no title`);

const hanzi = (s) => s.replace(/[^\p{Script=Han}]/gu, '');

for (const lang of ['es', 'fr', 'zh']) {
  const seen = new Set();
  const items = new Set();
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
        items.add(item.id);
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
  const tipped = new Set();
  for (const tip of read(`shared/grammar/${lang}.json`).tips) {
    const where = `${lang} grammar tip for ${tip.lesson}`;
    if (!seen.has(tip.lesson) || items.has(tip.lesson)) errors.push(`${where}: no such lesson`);
    if (tipped.has(tip.lesson)) errors.push(`${where}: a lesson has one tip`);
    tipped.add(tip.lesson);
    if (!tip.title || !tip.body?.length) errors.push(`${where}: title and body are required`);
    for (const id of tip.examples ?? []) if (!items.has(id)) errors.push(`${where}: example ${id} isn't a course item`);
  }
}

// The Classes (shared/classes/, built by scripts/content/classes.py) must teach exactly the
// course's words, unit by unit, and every clip they play must exist. If this fails after
// changing the course, run: python3 scripts/content/classes.py && scripts/.venv/bin/python scripts/generate_class_audio.py
for (const lang of ['es', 'fr', 'zh', 'pt', 'it']) {
  const course = read(`shared/course/${lang}.json`);
  const classes = read(`shared/classes/${lang}.json`);
  for (const unit of course.units) {
    const cls = classes.units[unit.id];
    const want = unit.lessons.flatMap((l) => l.items.map((i) => i.id)).join(',');
    if (!cls) errors.push(`${lang} ${unit.id}: no Class (rebuild the Classes)`);
    else if (cls.words.map((w) => w.id).join(',') !== want) errors.push(`${lang} ${unit.id}: the Class doesn't match the unit's words (rebuild the Classes)`);
  }
  const clips = new Set();
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.audio === 'string') clips.add(o.audio);
      Object.values(o).forEach(walk);
    }
  };
  walk(classes);
  for (const [, , audio] of classes.letters) clips.add(audio);
  for (const c of clips) if (!existsSync(join(root, 'assets/audio', c))) errors.push(`${lang}: Class clip ${c} is missing (run scripts/generate_class_audio.py)`);
}

if (errors.length) {
  console.error(`Course check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('Course check passed.');
