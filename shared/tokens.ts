// Splits a story line into tappable words and the text between them, for tap-to-translate.
// Spanish and French: runs of letters, keeping elisions and hyphens together ("j'ai",
// "l'après-midi", "parlez-moi") because that's how they're glossed. Chinese lines come
// pre-segmented ("seg", words separated by spaces) since Chinese has no spaces between words.

export type Token = { text: string; word: boolean };

const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

export function tokenize(text: string, seg?: string): Token[] {
  if (seg) return seg.split(' ').map((t) => ({ text: t, word: /\p{Script=Han}/u.test(t) }));
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}

/** The glossary key for a word: lower case, with a typographic apostrophe made straight. */
export const glossKey = (word: string) => word.toLowerCase().replace(/’/g, "'");
