import type { Lang } from './content';

// The AI conversation partner. Your speech is turned into text on the phone (Whisper); only that
// text goes to the app's free Cloudflare Worker, which asks Google Gemini for a reply and has
// Workers AI speak it. See worker/ in the repo. Nothing else in the app needs the internet.

const ENDPOINT = new URLSearchParams(location.search).get('talkapi') ?? 'https://learnguage-talk.learnguage-talk.workers.dev/chat';

export type TalkMessage = { role: 'user' | 'model'; text: string };
export type NewWord = { word: string; meaning: string; pinyin?: string };
export type TalkReply = {
  reply: string;
  pinyin?: string;
  translation: string;
  correction?: { corrected: string; explanation: string } | null;
  newWords: NewWord[];
  done: boolean;
  /** An answer you could give next, for the hints if you're stuck. */
  suggestion?: { text: string; pinyin?: string; en: string };
  /** Base64 MP3 of the reply, when the voice service answered. */
  audio: string | null;
  /** 'device': no AI voice for this language, so the phone's own voice reads it. */
  voice: 'ok' | 'unavailable' | 'off' | 'device';
};
export type TalkScenario = { setting: string; them: string; en: string };

/** Why a reply didn't come: no signal, today's free quota used up, Google busy, the Gemini key rejected, or the service is down. */
export type TalkProblem = 'offline' | 'quota' | 'busy' | 'setup' | 'unavailable';
export class TalkError extends Error {
  constructor(readonly problem: TalkProblem) {
    super(problem);
  }
}

export const PROBLEM_TEXT: Record<TalkProblem, string> = {
  offline: "You're offline. The AI partner needs the internet; everything else in the app still works.",
  quota: "Today's free AI conversations are used up. They come back tomorrow, and the rest of the app works as usual.",
  busy: "Google's free AI is very busy right now. Wait a minute and try again.",
  setup: "The AI partner isn't set up right: Google rejected its Gemini key. Store the key again in the Worker (see the README). Everything else in the app works.",
  unavailable: "The AI partner isn't answering right now. Try again in a little while.",
};

/** A failed reply: the Worker says 'key' when Google rejected the Gemini key, 'not_configured' when there is none, 'busy' when every model is overloaded. */
async function problemOf(res: Response): Promise<TalkProblem> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === 'busy') return 'busy';
  return body?.error === 'key' || body?.error === 'not_configured' ? 'setup' : 'unavailable';
}

/** What the partner does: free talk or a role-play (no mode), a phone call, texting a friend, or a debate. */
export type TalkMode = 'call' | 'text' | 'debate';

export async function nextReply(req: {
  lang: Lang;
  level: string;
  scenario?: TalkScenario;
  history: TalkMessage[];
  voice: boolean;
  mode?: TalkMode;
  /** Debate: the motion and the side the AI argues. Texting: the friend's name. */
  topic?: string;
  side?: 'for' | 'against';
  name?: string;
}): Promise<TalkReply> {
  if (!navigator.onLine) throw new TalkError('offline');
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new TalkError(navigator.onLine ? 'unavailable' : 'offline');
  }
  if (res.status === 429) throw new TalkError('quota');
  if (!res.ok) throw new TalkError(await problemOf(res));
  const data = (await res.json()) as TalkReply;
  if (!data?.reply) throw new TalkError('unavailable');
  const correction = data.correction?.corrected?.trim() ? data.correction : null;
  return { ...data, correction, newWords: Array.isArray(data.newWords) ? data.newWords.filter((w) => w?.word && w?.meaning).slice(0, 3) : [] };
}

export type TeachVerdict = { understood: boolean; reply: string; pinyin?: string; translation: string; correction: string; why: string };

async function judgeCall<T>(body: Record<string, unknown>): Promise<T> {
  if (!navigator.onLine) throw new TalkError('offline');
  let res: Response;
  try {
    res = await fetch(ENDPOINT.replace(/\/chat$/, '/judge'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new TalkError(navigator.onLine ? 'unavailable' : 'offline');
  }
  if (res.status === 429) throw new TalkError('quota');
  if (!res.ok) throw new TalkError(await problemOf(res));
  return (await res.json()) as T;
}

/** Teach the bird: would a native speaker understand which word your explanation describes? */
export const judgeTeach = (lang: Lang, level: string, word: string, en: string, said: string) => judgeCall<TeachVerdict>({ kind: 'teach', lang, level, word, en, said });

/** An adventure answered in your own words: which of the choices did you mean (-1 for none)? */
export const judgeChoice = async (lang: Lang, said: string, options: string[]) => (await judgeCall<{ choice: number }>({ kind: 'choose', lang, said, options })).choice;

export type Named = { found: boolean; word: string; pinyin?: string; meaning: string; example: string; examplePinyin?: string; exampleTranslation: string; audio: string | null };

/** Camera mode: the main object in a photo (a small JPEG, base64), named in `lang`. */
export async function nameObject(lang: Lang, image: string): Promise<Named> {
  if (!navigator.onLine) throw new TalkError('offline');
  let res: Response;
  try {
    res = await fetch(ENDPOINT.replace(/\/chat$/, '/vision'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, image }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new TalkError(navigator.onLine ? 'unavailable' : 'offline');
  }
  if (res.status === 429) throw new TalkError('quota');
  if (!res.ok) throw new TalkError(await problemOf(res));
  return (await res.json()) as Named;
}

/** The reply's audio as a playable URL (revoke it when done). */
export function audioUrl(base64: string): string {
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
}
