import { pinyin } from 'pinyin-pro';
import { getPhrases, getTopics } from './content';
import { getLessons, type Item } from './course';
import { lessonDone, type Progress } from './progress';

// The Chinese characters to practice writing: every one in the course and the phrasebook, in
// the order you meet them, each with a word that uses it (for its meaning and sound).

export type WritingChar = {
  char: string;
  /** This character's own reading, e.g. 好 → hǎo. */
  pinyin: string;
  /** The first word or phrase it appears in. */
  word: Item;
  /** It's in a lesson you've finished or a phrase you've practiced. */
  seen: boolean;
};

const HAN = /\p{Script=Han}/gu;

let all: Omit<WritingChar, 'seen'>[] | null = null;
const seenIn = new Map<string, { lessons: string[]; phrases: string[] }>();

function build() {
  const list: Omit<WritingChar, 'seen'>[] = [];
  const add = (ch: string, word: Item, where: { lesson?: string; phrase?: string }) => {
    let s = seenIn.get(ch);
    if (!s) {
      s = { lessons: [], phrases: [] };
      seenIn.set(ch, s);
      // The reading in context (pinyin-pro knows 了 in 好了 is le), split per character.
      const readings = pinyin(word.text.replace(/[^\p{Script=Han}]/gu, ''), { type: 'array' });
      const i = [...word.text.matchAll(HAN)].findIndex((m) => m[0] === ch);
      list.push({ char: ch, pinyin: readings[i] ?? pinyin(ch), word });
    }
    if (where.lesson) s.lessons.push(where.lesson);
    if (where.phrase) s.phrases.push(where.phrase);
  };
  for (const lesson of getLessons('zh')) for (const item of lesson.items) for (const [ch] of item.text.matchAll(HAN)) add(ch, item, { lesson: lesson.id });
  for (const topic of getTopics())
    for (const p of getPhrases('zh', topic.id)) {
      const item: Item = { id: `pb:${p.id}`, text: p.text, pinyin: p.pinyin, en: p.en, kind: 'phrase', tiles: [p.text], alt: [], audio: p.audio };
      for (const [ch] of p.text.matchAll(HAN)) add(ch, item, { phrase: p.id });
    }
  return list;
}

export function writingChars(p: Progress): WritingChar[] {
  all ??= build();
  return all.map((c) => {
    const s = seenIn.get(c.char)!;
    const seen = s.lessons.some((id) => lessonDone(p, 'zh', id)) || s.phrases.some((id) => `zh:pb:${id}` in p.srs);
    return { ...c, seen };
  });
}

export const writingChar = (p: Progress, ch: string) => writingChars(p).find((c) => c.char === ch);
