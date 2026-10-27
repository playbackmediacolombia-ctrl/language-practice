import es from '../../../shared/grammar/es.json';
import fr from '../../../shared/grammar/fr.json';
import it from '../../../shared/grammar/it.json';
import pt from '../../../shared/grammar/pt.json';
import zh from '../../../shared/grammar/zh.json';
import type { Lang } from './content';
import { getItem, type Item } from './course';

// Grammar tips: a short, plain-English explanation attached to the lesson where a rule first
// appears (shared/grammar/<lang>.json). Examples are course items, so they come with audio.

type RawTip = { lesson: string; title: string; body: string[]; table?: string[][]; examples?: string[] };
export type Tip = { lesson: string; title: string; body: string[]; table: [string, string][]; examples: Item[] };

const TIPS = { es, fr, zh, pt, it } as Record<Lang, { tips: RawTip[] }>;

export function getTip(lang: Lang, lessonId: string): Tip | undefined {
  const raw = TIPS[lang].tips.find((t) => t.lesson === lessonId);
  if (!raw) return undefined;
  return {
    ...raw,
    table: (raw.table ?? []) as [string, string][],
    examples: (raw.examples ?? []).map((id) => getItem(lang, id)).filter((i): i is Item => !!i),
  };
}
