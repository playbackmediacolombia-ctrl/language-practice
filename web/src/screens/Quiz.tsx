import { useMemo, useState } from 'react';
import { playPhrase } from '../lib/audio';
import { getPhrases, type Lang, type Phrase, shuffle } from '../lib/content';
import { recordPhraseAnswer, recordQuiz } from '../lib/progress';
import { navigate } from '../lib/router';
import { Sticker } from '../art';
import { Icon, PhraseText, Screen } from '../ui';

type Question = {
  phrase: Phrase;
  /** 'listen': hear it, pick the English. 'read': see English, pick the phrase. */
  mode: 'listen' | 'read';
  options: Phrase[];
};

function makeQuiz(phrases: Phrase[]): Question[] {
  return shuffle(phrases).map((phrase, i) => ({
    phrase,
    mode: i % 2 === 0 ? 'listen' : 'read',
    options: shuffle([phrase, ...shuffle(phrases.filter((p) => p.id !== phrase.id)).slice(0, 3)]),
  }));
}

export function Quiz({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = useMemo(() => getPhrases(lang, topic), [lang, topic]);
  const [questions, setQuestions] = useState(() => makeQuiz(phrases));
  const [index, setIndex] = useState(-1); // -1 = start screen, so the first sound plays from a tap
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const back = `/${lang}/${topic}`;

  // Sound is started from the tap itself; iOS blocks audio that starts any other way.
  const show = (i: number, qs = questions) => {
    setPicked(null);
    setIndex(i);
    if (qs[i]?.mode === 'listen') playPhrase(qs[i].phrase.audio);
  };

  const q = questions[index];

  const pick = (option: Phrase) => {
    if (picked) return;
    setPicked(option.id);
    const right = option.id === q.phrase.id;
    if (right) setCorrect((c) => c + 1);
    recordPhraseAnswer(lang, q.phrase.id, right);
    if (q.mode === 'read') playPhrase(q.phrase.audio);
    if (index + 1 === questions.length) recordQuiz(lang, topic, (correct + (right ? 1 : 0)) / questions.length);
  };

  const restart = () => {
    const qs = makeQuiz(phrases);
    setQuestions(qs);
    setCorrect(0);
    show(0, qs);
  };

  if (index < 0) {
    return (
      <Screen title="Quiz" back={back}>
        <div className="card" style={{ gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{questions.length} questions</div>
          <p className="muted">Half are listening (turn your sound on), half are “how do you say…”.</p>
          <button className="btn" onClick={() => show(0)}>
            Start
          </button>
        </div>
      </Screen>
    );
  }

  if (index >= questions.length) {
    return (
      <Screen title="Quiz" back={back}>
        <div className="card" style={{ alignItems: 'center', gap: 14 }}>
          <Sticker name={correct === questions.length ? 'trophy' : 'clap'} size={64} />
          <div style={{ fontSize: 26, fontWeight: 600 }}>
            {correct} / {questions.length} correct
          </div>
          <button className="btn" style={{ alignSelf: 'stretch' }} onClick={restart}>
            Try again
          </button>
          <button className="btn secondary" style={{ alignSelf: 'stretch' }} onClick={() => navigate(back)}>
            Back to topic
          </button>
        </div>
      </Screen>
    );
  }

  const optionClass = (option: Phrase) => {
    if (!picked) return 'btn secondary';
    if (option.id === q.phrase.id) return 'btn secondary picked-right';
    if (option.id === picked) return 'btn secondary picked-wrong';
    return 'btn secondary faded';
  };

  return (
    <Screen title={`Quiz  ${index + 1}/${questions.length}`} back={back}>
      <div className="card" style={{ gap: 12 }}>
        {q.mode === 'listen' ? (
          <>
            <p className="muted">What does this mean?</p>
            {picked && <PhraseText phrase={q.phrase} showEnglish={false} />}
            <button className="btn secondary" onClick={() => playPhrase(q.phrase.audio)}>
              <Icon name="speaker" size={20} /> Play again
            </button>
          </>
        ) : (
          <>
            <p className="muted">How do you say…</p>
            <div style={{ fontSize: 26, fontWeight: 600 }}>{q.phrase.en}</div>
          </>
        )}
      </div>

      {q.options.map((option) => (
        <button key={option.id} className={optionClass(option)} onClick={() => pick(option)}>
          {q.mode === 'listen' ? option.en : option.pinyin ? `${option.text}\n${option.pinyin}` : option.text}
        </button>
      ))}

      {picked && (
        <button className="btn" onClick={() => show(index + 1)}>
          {index + 1 === questions.length ? 'See score' : 'Next ›'}
        </button>
      )}
    </Screen>
  );
}
