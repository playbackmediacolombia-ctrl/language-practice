import { useEffect, useRef } from 'react';
import { playPhrase } from './lib/audio';
import type { Lang } from './lib/content';
import type { Tip } from './lib/grammar';
import { Icon, AudioDisc } from './ui';

/** A grammar tip as a sheet over the lesson. Shown once on its own, and any time from the lesson. */
export function GrammarSheet({ tip, lang, onClose }: { tip: Tip; lang: Lang; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tip-sheet" role="dialog" aria-modal="true" aria-labelledby="tip-title" data-testid="grammar-tip" onClick={(e) => e.stopPropagation()}>
        <div className="tip-kicker">
          <Icon name="book" size={18} /> {tip.title.startsWith('Culture') ? 'Culture note' : 'Grammar tip'}
        </div>
        <h2 id="tip-title" className="tip-title">
          {tip.title}
        </h2>
        {tip.body.map((p, i) => (
          <p key={i} className="tip-body">
            {p}
          </p>
        ))}
        {tip.table.length > 0 && (
          <table className="tip-table">
            <tbody>
              {tip.table.map(([target, en]) => (
                <tr key={target}>
                  <td lang={lang}>{target}</td>
                  <td>{en}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tip.examples.length > 0 && (
          <div className="tip-examples">
            {tip.examples.map((item) => (
              <button key={item.id} className="tip-example" onClick={() => playPhrase(item.audio)} aria-label={`Play: ${item.text}`}>
                <AudioDisc />
                <span className="grow">
                  <span className="tip-example-text" lang={lang}>
                    {item.text}
                  </span>
                  {item.pinyin && <span className="pinyin small"> {item.pinyin}</span>}
                  <span className="tip-example-en">{item.en}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <button ref={button} className="btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
