import { pinyin } from 'pinyin-pro';
import type { Lang } from './lang';

/**
 * One expected word (a character in Chinese): said right, nearly, or missed. For Chinese,
 * `tone` is set when the syllable was right but the tone wasn't (numbered pinyin, e.g. "ma3").
 */
export type TokenResult = { text: string; status: 'ok' | 'close' | 'wrong'; tone?: { expected: string; heard: string } };
export type Comparison = { tokens: TokenResult[]; score: number };

// Whisper sometimes writes traditional characters. Map the common ones back to simplified so
// they compare equal (and so pinyin-pro reads them in the right sense, e.g. 車 as chē not jū).
const TO_SIMPLIFIED: Record<string, string> = {
  謝: '谢', 認: '认', 識: '识', 興: '兴', 嗎: '吗', 麼: '么', 見: '见', 餓: '饿', 請: '请',
  給: '给', 單: '单', 結: '结', 賬: '账', 帳: '账', 錢: '钱', 機: '机', 場: '场', 裡: '里',
  裏: '里', 預: '预', 訂: '订', 輛: '辆', 車: '车', 點: '点', 發: '发', 聽: '听', 間: '间',
  轉: '转', 遠: '远', 鐵: '铁', 幫: '帮', 歲: '岁', 幾: '几', 張: '张', 喫: '吃', 乾: '干',
  這: '这', 個: '个', 們: '们', 說: '说', 對: '对', 時: '时', 樣: '样', 邊: '边', 進: '进',
  開: '开', 門: '门', 號: '号', 員: '员', 務: '务', 會: '会', 來: '来', 為: '为', 兩: '两',
  電: '电', 話: '话', 碼: '码', 現: '现', 歐: '欧', 元: '元', 塊: '块', 灣: '湾', 長: '长',
};

// Whisper often writes numbers as digits. Spell the ones in our lessons back out.
const NUMBER_WORDS: Partial<Record<Lang, Record<string, string>>> = {
  es: { 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 20: 'veinte', 30: 'treinta', 100: 'cien' },
  fr: { 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix', 20: 'vingt', 30: 'trente', 100: 'cent' },
  pt: { 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 12: 'doze', 20: 'vinte', 30: 'trinta', 100: 'cem' },
  it: { 1: 'uno', 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci', 12: 'dodici', 20: 'venti', 30: 'trenta', 100: 'cento' },
};

const ZH_DIGITS = '零一二三四五六七八九';

/** 30 → 三十, 105 → 一百零五 (good enough for 0–9999). */
function chineseNumber(n: number): string {
  if (n < 10) return ZH_DIGITS[n];
  const units = ['', '十', '百', '千'];
  const digits = String(n).split('').map(Number);
  let out = '';
  let zero = false;
  digits.forEach((d, i) => {
    const unit = units[digits.length - 1 - i];
    if (d === 0) {
      zero = true;
      return;
    }
    if (zero) out += '零';
    zero = false;
    out += (d === 1 && unit === '十' && i === 0 ? '' : ZH_DIGITS[d]) + unit;
  });
  return out;
}

const HAN = /\p{Script=Han}/u;

function simplify(text: string): string {
  return text
    .replace(/\d+/g, (m) => (m.length <= 4 ? chineseNumber(Number(m)) : m))
    .replace(/./gu, (ch) => TO_SIMPLIFIED[ch] ?? ch);
}

function normalizeWord(word: string, lang: Lang): string {
  const key = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accents: "esta" vs "está" is not a speaking error
    .replace(/[^\p{L}\p{N}]/gu, '');
  return NUMBER_WORDS[lang]?.[key] ?? key;
}

type Token = { display: string; key: string; sound?: string; toneless?: string };

/** Split into display tokens plus the keys used for matching. */
function tokenize(text: string, lang: Lang): Token[] {
  if (lang === 'zh') {
    const chars = [...simplify(text)].filter((ch) => HAN.test(ch));
    // Compare Chinese by sound: Whisper may pick a different character with the same reading.
    const sounds = pinyin(chars.join(''), { type: 'array', toneType: 'num' });
    return chars.map((ch, i) => ({
      display: ch,
      key: ch,
      sound: sounds[i],
      toneless: sounds[i]?.replace(/\d/g, ''),
    }));
  }
  return text
    .split(/[\s,\-]+/)
    .map((display) => ({ display, key: normalizeWord(display, lang) }))
    .filter((t) => t.key.length > 0);
}

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function similarity(a: Token, b: Token): 'ok' | 'close' | null {
  if (a.key === b.key) return 'ok';
  if (a.sound) {
    if (a.sound === b.sound) return 'ok'; // same syllable and tone, different character
    if (a.toneless && a.toneless === b.toneless) return 'close'; // right syllable, tone unclear
    return null;
  }
  const shorter = Math.min(a.key.length, b.key.length);
  if (shorter >= 3 && editDistance(a.key, b.key) <= 1) return 'close';
  // Silent endings ("quel"/"quelle", "heure"/"heures") sound the same.
  if (shorter >= 4 && (a.key.startsWith(b.key) || b.key.startsWith(a.key)) && editDistance(a.key, b.key) <= 2) return 'close';
  return null;
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Align what Whisper heard against the expected phrase (longest common subsequence)
 * and mark each expected word/character as said correctly, nearly, or missed.
 */
export function compare(expected: string, heard: string, lang: Lang, alt: string[] = []): Comparison {
  const exp = tokenize(expected, lang);
  const got = tokenize(heard, lang);

  // An accepted alternative ("123" for "uno, dos, tres") counts as a perfect answer.
  if (squash(heard) && alt.some((a) => squash(a) === squash(heard))) {
    return { tokens: exp.map((t) => ({ text: t.display, status: 'ok' })), score: 1 };
  }

  const n = exp.length;
  const m = got.length;
  const weight = (s: 'ok' | 'close' | null) => (s === 'ok' ? 2 : s === 'close' ? 1 : 0);
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const w = weight(similarity(exp[i], got[j]));
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], w ? dp[i + 1][j + 1] + w : 0);
    }
  }

  const tokens: TokenResult[] = exp.map((t) => ({ text: t.display, status: 'wrong' }));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const s = similarity(exp[i], got[j]);
    if (s && dp[i][j] === dp[i + 1][j + 1] + weight(s)) {
      tokens[i].status = s;
      if (s === 'close' && exp[i].sound && got[j].sound && exp[i].sound !== got[j].sound) tokens[i].tone = { expected: exp[i].sound!, heard: got[j].sound! };
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const points = tokens.reduce((sum, t) => sum + (t.status === 'ok' ? 1 : t.status === 'close' ? 0.5 : 0), 0);
  return { tokens, score: n ? points / n : 0 };
}
