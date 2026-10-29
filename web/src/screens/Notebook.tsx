import { useState } from 'react';
import { UnitArt } from '../art';
import { classTaken, clipUrl, getClass, isDay1, letters } from '../lib/classes';
import type { Lang } from '../lib/content';
import { getItem, getPath, type Item } from '../lib/course';
import { playPhrase } from '../lib/audio';
import { useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { Icon, Screen } from '../ui';
import { TonePitch } from './Class';

// Class notes: every word, phrase and rule your Classes have taught, unit by unit, to look back
// at any time. Tap a word to hear it; open a rule to read it again with its "why".

export function Notebook({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const units = getPath(lang)
    .flatMap((s) => s.units)
    .filter((u) => u.lessons.length && classTaken(progress, lang, u) && (!u.adult || progress.adult));
  const match = (i: Item) => !q || i.text.toLowerCase().includes(q) || i.en.toLowerCase().includes(q) || (i.pinyin ?? '').toLowerCase().includes(q);
  const words = units.reduce((n, u) => n + (getClass(lang, u.id)?.words.length ?? 0), 0);
  const rules = units.reduce((n, u) => n + (getClass(lang, u.id)?.rules.length ?? 0), 0);

  return (
    <Screen title="Notebook" back={`/${lang}`}>
      <p className="muted" data-testid="notebook-count">
        {units.length ? `${words} words and phrases, and ${rules} rules from ${units.length} ${units.length === 1 ? 'Class' : 'Classes'}.` : 'Everything your Classes teach is saved here. Take your first Class on the Learn path.'}
      </p>
      {units.length > 0 && (
        <input className="answer-input" type="search" placeholder="Find a word or rule" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a word or rule" />
      )}
      {units.map((u) => {
        const data = getClass(lang, u.id)!;
        const items = data.words.map((w) => getItem(lang, w.id)).filter((i): i is Item => !!i && match(i));
        const ruleList = data.rules.filter((r) => !q || r.title.toLowerCase().includes(q) || r.body.some((b) => b.text.toLowerCase().includes(q)));
        const extras = data.extras.flatMap((x) => [...x.lines.map((l) => ({ text: l.text, en: l.en ?? '', audio: l.audio, pinyin: l.pinyin })), ...x.words.map((w) => ({ ...w, pinyin: undefined }))]).filter((x) => !q || x.text.toLowerCase().includes(q) || x.en.toLowerCase().includes(q));
        if (q && !items.length && !ruleList.length && !extras.length) return null;
        return (
          <section key={u.id} className="card notebook-unit" data-testid="notebook-unit" data-unit={u.id}>
            <div className="row">
              <UnitArt unitId={u.id} size={40} />
              <div className="grow">
                <div className="card-title">{isDay1(u.id) ? `Day 1: ${u.title}` : u.title}</div>
              </div>
              <button className="btn ghost small" onClick={() => navigate(`/${lang}/class/${u.id}`)} aria-label={`Open the Class: ${u.title}`}>
                <Icon name="book" size={18} /> Class
              </button>
            </div>
            {isDay1(u.id) && !q && <Day1Notes lang={lang} />}
            {ruleList.map((r) => (
              <details key={r.title} className="notebook-rule" data-testid="notebook-rule">
                <summary>
                  <Icon name="bulb" size={18} /> {r.title}
                </summary>
                {r.body.map((b) => (
                  <p key={b.text}>{b.text}</p>
                ))}
                {r.table.length > 0 && (
                  <table className="tip-table">
                    <tbody>
                      {r.table.map(([a, b]) => (
                        <tr key={a}>
                          <td lang={lang}>{a}</td>
                          <td>{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="small">
                  <b>Why it works this way:</b> {r.why.text}
                </p>
              </details>
            ))}
            <ul className="notebook-words">
              {items.map((i) => (
                <li key={i.id}>
                  <button className="notebook-word" onClick={() => playPhrase(i.audio)} data-testid="notebook-word">
                    <Icon name="speaker" size={16} />
                    <span lang={lang} className="nb-text">
                      {i.text}
                    </span>
                    {i.pinyin && <span className="pinyin small">{i.pinyin}</span>}
                    <span className="muted small">{i.en}</span>
                  </button>
                </li>
              ))}
              {extras.map((x) => (
                <li key={x.text}>
                  <button className="notebook-word" onClick={() => playPhrase(clipUrl(x.audio) ?? '')}>
                    <Icon name="speaker" size={16} />
                    <span lang={lang} className="nb-text">
                      {x.text}
                    </span>
                    {x.pinyin && <span className="pinyin small">{x.pinyin}</span>}
                    <span className="muted small">{x.en}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Screen>
  );
}

function Day1Notes({ lang }: { lang: Lang }) {
  if (lang === 'zh')
    return (
      <details className="notebook-rule" data-testid="notebook-rule">
        <summary>
          <Icon name="bulb" size={18} /> The four tones and the neutral tone
        </summary>
        <div className="tone-row">
          {[1, 2, 3, 4, 5].map((t) => (
            <TonePitch key={t} tone={t} />
          ))}
        </div>
        <p className="small">Pinyin spells Chinese sounds with Latin letters; the mark over the vowel is the tone. Each character is one syllable, often built from a meaning part and a sound part (妈 = 女 + 马).</p>
      </details>
    );
  return (
    <details className="notebook-rule" data-testid="notebook-rule">
      <summary>
        <Icon name="bulb" size={18} /> The alphabet
      </summary>
      <div className="class-letters">
        {letters(lang).map(([letter, name, audio]) => (
          <button key={letter} className="class-letter" onClick={() => playPhrase(clipUrl(audio) ?? '')}>
            <b>{letter}</b>
            <span>{name}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
