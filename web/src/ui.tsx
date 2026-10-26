import type { ReactNode } from 'react';
import type { Phrase } from './lib/content';
import { navigate } from './lib/router';

/** Top bar with a title and, except on the home screen, a back arrow to `back`. */
export function Header({ title, back }: { title: string; back?: string }) {
  return (
    <header className="header">
      {back !== undefined ? (
        <button className="back" aria-label="Back" onClick={() => navigate(back)}>
          ‹
        </button>
      ) : (
        <span className="spacer" />
      )}
      <h1>{title}</h1>
      <span className="spacer" />
    </header>
  );
}

export function Screen({ title, back, fill, children }: { title: string; back?: string; fill?: boolean; children: ReactNode }) {
  return (
    <>
      <Header title={title} back={back} />
      <main className={fill ? 'page fill' : 'page'}>{children}</main>
    </>
  );
}

/** Phrase in the target language, pinyin for Chinese, and optionally the English. */
export function PhraseText({ phrase, showEnglish = true, size = 'large' }: { phrase: Phrase; showEnglish?: boolean; size?: 'large' | 'small' }) {
  const big = size === 'large';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p className="target" style={{ fontSize: big ? (phrase.pinyin ? 40 : 30) : 20 }}>
        {phrase.text}
      </p>
      {phrase.pinyin && (
        <p className="pinyin" style={{ fontSize: big ? 22 : 15 }}>
          {phrase.pinyin}
        </p>
      )}
      {showEnglish && (
        <p className="english" style={{ fontSize: big ? 18 : 14 }}>
          {phrase.en}
        </p>
      )}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bar">
      <div style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  );
}
