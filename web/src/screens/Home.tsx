import { LANGS } from '../lib/content';
import { getLessons } from '../lib/course';
import { lessonDone, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { chosenModel, isModelReady, MODELS } from '../lib/whisper';
import { ProgressBar, Screen } from '../ui';
import { StatsBar } from './Path';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export function Home() {
  const ready = isModelReady();
  const progress = useProgress();
  return (
    <Screen title="Language Practice">
      <StatsBar progress={progress} />
      <h2 className="heading">What do you want to learn?</h2>

      {LANGS.map((lang) => {
        const lessons = getLessons(lang.id);
        const done = lessons.filter((l) => lessonDone(progress, lang.id, l.id)).length;
        return (
          <button key={lang.id} className="card" onClick={() => navigate(`/${lang.id}`)}>
            <div className="row">
              <span style={{ fontSize: 40 }}>{lang.flag}</span>
              <div className="grow">
                <div style={{ fontSize: 20, fontWeight: 600 }}>{lang.name}</div>
                <p className="muted">
                  {lang.native} · {done ? `${done}/${lessons.length} lessons` : 'Start from the very first sounds'}
                </p>
              </div>
            </div>
            {done > 0 && <ProgressBar value={done / lessons.length} />}
          </button>
        );
      })}

      <button className="card" style={{ marginTop: 12 }} onClick={() => navigate('/settings')}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>⚙️ Settings · daily goal · speech checking</div>
        <p className="muted">
          {ready
            ? `Whisper (${MODELS[chosenModel()].label.toLowerCase()}) is saved on this phone. Works offline.`
            : 'Not set up yet. Tap to download the Whisper model once (Wi‑Fi recommended).'}
        </p>
      </button>

      {!isStandalone && (
        <div className="card">
          <div style={{ fontSize: 17, fontWeight: 600 }}>📲 Add to Home Screen</div>
          <p className="muted">
            In Safari, tap the Share button, then <b>Add to Home Screen</b>. It opens full screen like an app, works
            offline, and keeps your progress safe.
          </p>
        </div>
      )}
    </Screen>
  );
}
