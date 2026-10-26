import { useState } from 'react';
import { playPhrase } from '../lib/audio';
import { getPhrases, type Lang, type Phrase, shuffle } from '../lib/content';
import { cardBox, MAX_BOX, reviewCard, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { PhraseText, Screen } from '../ui';

export function Flashcards({ lang, topic }: { lang: Lang; topic: string }) {
  const progress = useProgress();
  const back = `/${lang}/${topic}`;

  // Least-known cards first; cards you miss go to the back of the deck to see again.
  const [deck, setDeck] = useState<Phrase[]>(() =>
    shuffle(getPhrases(lang, topic)).sort((a, b) => cardBox(progress, lang, a.id) - cardBox(progress, lang, b.id)),
  );
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const card = deck[0];

  const flip = () => {
    if (!flipped) playPhrase(card.audio);
    setFlipped(!flipped);
  };

  const answer = (knewIt: boolean) => {
    reviewCard(lang, card.id, knewIt);
    setFlipped(false);
    if (knewIt) {
      setDone((d) => d + 1);
      setDeck((d) => d.slice(1));
    } else {
      setDeck((d) => [...d.slice(1), d[0]]);
    }
  };

  if (!card) {
    return (
      <Screen title="Flashcards" back={back}>
        <div className="card" style={{ alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>All {done} cards done!</div>
          <button className="btn" style={{ alignSelf: 'stretch' }} onClick={() => navigate(back)}>
            Back to topic
          </button>
        </div>
      </Screen>
    );
  }

  const box = cardBox(progress, lang, card.id);
  return (
    <Screen title={`Flashcards · ${deck.length} left`} back={back} fill>
      <button className="card flashcard" onClick={flip}>
        <span className="level">{'●'.repeat(box) + '○'.repeat(MAX_BOX - box)}</span>
        {flipped ? (
          <>
            <PhraseText phrase={card} showEnglish={false} />
            <p className="english" style={{ fontSize: 18 }}>
              {card.en}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{card.en}</div>
            <p className="muted">Say it out loud, then tap to check</p>
          </>
        )}
      </button>

      {flipped ? (
        <>
          <div className="row">
            <button className="btn danger flex" onClick={() => answer(false)}>
              ✗ Again
            </button>
            <button className="btn success flex" onClick={() => answer(true)}>
              ✓ Got it
            </button>
          </div>
          <button className="btn secondary" onClick={() => playPhrase(card.audio)}>
            🔊 Play again
          </button>
        </>
      ) : (
        <button className="btn" onClick={flip}>
          Show answer
        </button>
      )}
    </Screen>
  );
}
