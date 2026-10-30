import { useState } from 'react';
import { playPhrase } from '../lib/audio';
import { getPhrases, type Lang } from '../lib/content';
import { saveSpoken } from '../lib/course';
import { recordSpeech } from '../lib/progress';
import { SpeakCoach } from '../SpeakCoach';
import { Icon, PhraseText, Screen } from '../ui';

export default function Practice({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = getPhrases(lang, topic);
  const [index, setIndex] = useState(0);
  const phrase = phrases[index];
  const go = (delta: number) => setIndex((i) => (i + delta + phrases.length) % phrases.length);

  return (
    <Screen title={`Listen & repeat  ${index + 1}/${phrases.length}`} back={`/${lang}/${topic}`}>
      <div className="card" style={{ gap: 16 }}>
        <PhraseText phrase={phrase} />
        <div className="row">
          <button className="btn secondary flex" onClick={() => playPhrase(phrase.audio, true)}>
            <Icon name="speaker" size={18} /> Slow
          </button>
        </div>
      </div>
      <SpeakCoach
        key={phrase.id}
        lang={lang}
        said={phrase}
        onRight={(v) => {
          recordSpeech(lang, phrase.id, v.score);
          go(1);
        }}
        onSkip={(saved) => {
          if (saved) saveSpoken(lang, phrase);
          go(1);
        }}
      />
      <div className="row">
        <button className="btn secondary flex" onClick={() => go(-1)}>
          ‹ Previous
        </button>
        <button className="btn flex" onClick={() => go(1)}>
          Next ›
        </button>
      </div>
    </Screen>
  );
}
