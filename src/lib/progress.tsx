import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from './content';

const KEY = 'progress-v1';

/** Flashcards use a simple Leitner system: box 0 = new, box 4 = learned. */
export const MAX_BOX = 4;

type CardProgress = { box: number; reviews: number };
type Progress = {
  cards: Record<string, CardProgress>; // key: `${lang}:${phraseId}`
  speech: Record<string, number>; // best pronunciation score 0..1
  quiz: Record<string, number>; // best quiz score 0..1, key: `${lang}:${topicId}`
};

const EMPTY: Progress = { cards: {}, speech: {}, quiz: {} };

type Ctx = {
  progress: Progress;
  ready: boolean;
  cardBox: (lang: Lang, phraseId: string) => number;
  reviewCard: (lang: Lang, phraseId: string, knewIt: boolean) => void;
  recordSpeech: (lang: Lang, phraseId: string, score: number) => void;
  recordQuiz: (lang: Lang, topicId: string, score: number) => void;
  reset: () => void;
};

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProgress({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      progress,
      ready,
      cardBox: (lang, id) => progress.cards[`${lang}:${id}`]?.box ?? 0,
      reviewCard: (lang, id, knewIt) =>
        update((p) => {
          const k = `${lang}:${id}`;
          const cur = p.cards[k] ?? { box: 0, reviews: 0 };
          const box = knewIt ? Math.min(MAX_BOX, cur.box + 1) : 0;
          return { ...p, cards: { ...p.cards, [k]: { box, reviews: cur.reviews + 1 } } };
        }),
      recordSpeech: (lang, id, score) =>
        update((p) => {
          const k = `${lang}:${id}`;
          return { ...p, speech: { ...p.speech, [k]: Math.max(score, p.speech[k] ?? 0) } };
        }),
      recordQuiz: (lang, topicId, score) =>
        update((p) => {
          const k = `${lang}:${topicId}`;
          return { ...p, quiz: { ...p.quiz, [k]: Math.max(score, p.quiz[k] ?? 0) } };
        }),
      reset: () => update(() => EMPTY),
    }),
    [progress, ready, update],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
