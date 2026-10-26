import { useState } from 'react';
import { GOALS, resetProgress, setGoal, setSpeaking, useProgress } from '../lib/progress';
import { chosenModel, deleteModel, isModelReady, loadModel, type ModelKey, MODELS, setChosenModel } from '../lib/whisper';
import { ProgressBar, Screen } from '../ui';

export function Settings() {
  const [model, setModel] = useState<ModelKey>(chosenModel());
  const [ready, setReady] = useState(isModelReady(model));
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const info = MODELS[model];
  const prefs = useProgress();

  const choose = (key: ModelKey) => {
    if (progress !== null) return;
    setChosenModel(key);
    setModel(key);
    setReady(isModelReady(key));
    setError(null);
  };

  const download = async () => {
    setError(null);
    setProgress(0);
    try {
      await loadModel(setProgress);
      setReady(true);
    } catch (e) {
      setError(`Download failed: ${e instanceof Error ? e.message : String(e)}. Check your connection and try again.`);
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete the ${info.label.toLowerCase()} model? This frees about ${info.sizeMB} MB.`)) return;
    await deleteModel(model);
    setReady(false);
  };

  return (
    <Screen title="Settings" back="/">
      <div className="card">
        <div style={{ fontWeight: 650, fontSize: 17 }}>🎯 Daily goal</div>
        <div className="choice">
          {GOALS.map((goal) => (
            <label key={goal}>
              <input type="radio" name="goal" checked={prefs.goal === goal} onChange={() => setGoal(goal)} />
              <b>{goal} XP</b>
              <span className="muted small">{goal / 10 === 1 ? '1 lesson' : `${goal / 10} lessons`}</span>
            </label>
          ))}
        </div>
        <label className="row toggle">
          <span className="grow">
            <b>Speaking exercises</b>
            <span className="muted small" style={{ display: 'block' }}>
              “Say it out loud” in lessons, graded by Whisper
            </span>
          </span>
          <input type="checkbox" checked={prefs.speaking} onChange={(e) => setSpeaking(e.target.checked)} />
        </label>
      </div>

      <div className="card">
        <div style={{ fontWeight: 650, fontSize: 17 }}>🎙️ Speech checking</div>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          Listen &amp; Repeat uses Whisper running entirely in Safari on your phone. It's downloaded once for free,
          then works with no internet. Your voice never leaves the phone.
        </p>
        <div className="choice">
          {(Object.keys(MODELS) as ModelKey[]).map((key) => (
            <label key={key}>
              <input type="radio" name="model" checked={model === key} onChange={() => choose(key)} />
              <b>{MODELS[key].label}</b>
              <span className="muted small">
                {MODELS[key].sizeMB} MB · {MODELS[key].note}
              </span>
            </label>
          ))}
        </div>

        {progress !== null ? (
          <>
            <ProgressBar value={progress} />
            <p className="muted">Downloading… {Math.round(progress * 100)}%. Keep this screen open.</p>
          </>
        ) : ready ? (
          <p style={{ margin: 0, color: 'var(--ok)', fontWeight: 600 }}>✓ {info.label} model saved on this phone</p>
        ) : (
          <button className="btn" onClick={download}>
            Download {info.label.toLowerCase()} model ({info.sizeMB} MB)
          </button>
        )}
        {error && <p style={{ margin: 0, color: 'var(--wrong)' }}>{error}</p>}
      </div>

      {ready && progress === null && (
        <button className="btn secondary" onClick={remove}>
          Delete {info.label.toLowerCase()} model
        </button>
      )}

      <button
        className="btn secondary"
        style={{ marginTop: 24, color: 'var(--wrong)' }}
        onClick={() => confirm('Reset all lessons, XP, streak, flashcard, quiz and speaking progress?') && resetProgress()}
      >
        Reset my progress
      </button>
    </Screen>
  );
}
