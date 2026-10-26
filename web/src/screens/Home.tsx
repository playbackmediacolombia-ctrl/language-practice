import { LANGS } from '../lib/content';
import { navigate } from '../lib/router';
import { chosenModel, isModelReady, MODELS } from '../lib/whisper';
import { Screen } from '../ui';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export function Home() {
  const ready = isModelReady();
  return (
    <Screen title="Language Practice">
      <h2 className="heading">What do you want to practice?</h2>

      {LANGS.map((lang) => (
        <button key={lang.id} className="card" onClick={() => navigate(`/${lang.id}`)}>
          <div className="row">
            <span style={{ fontSize: 40 }}>{lang.flag}</span>
            <div className="grow">
              <div style={{ fontSize: 20, fontWeight: 600 }}>{lang.name}</div>
              <p className="muted">{lang.native}</p>
            </div>
          </div>
        </button>
      ))}

      <button className="card" style={{ marginTop: 12 }} onClick={() => navigate('/settings')}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>🎙️ Speech checking</div>
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
