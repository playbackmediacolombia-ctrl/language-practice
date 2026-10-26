import { useState } from 'react';
import { GOALS, resetProgress, setGoal, setPref, setSpeaking, setVoice, type Theme, useProgress } from '../lib/progress';
import { chosenModel, deleteModel, isModelReady, loadModel, type ModelKey, MODELS, setChosenModel } from '../lib/whisper';
import { Icon, ProgressBar, Screen, Segmented, Toggle } from '../ui';

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
    <Screen title="Settings" large>
      <div className="section-title">Appearance</div>
      <div className="list">
        <div className="list-block">
          <Segmented
            label="Theme"
            value={prefs.theme}
            onChange={(theme: Theme) => setPref('theme', theme)}
            options={[
              { value: 'auto', label: 'Automatic' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <p className="muted small">Automatic follows your iPhone's Light/Dark setting.</p>
        </div>
      </div>

      <div className="section-title">Lessons</div>
      <div className="list">
        <div className="list-block">
          <span className="row-title">Daily goal</span>
          <Segmented
            label="Daily goal"
            value={prefs.goal}
            onChange={setGoal}
            options={GOALS.map((goal) => ({
              value: goal,
              label: (
                <>
                  {goal} XP<small>{goal / 10 === 1 ? '1 lesson' : `${goal / 10} lessons`}</small>
                </>
              ),
            }))}
          />
        </div>
        <Toggle label="Speaking exercises" hint="“Say it out loud”, graded by Whisper" checked={prefs.speaking} onChange={setSpeaking} />
      </div>

      <div className="section-title">Sound &amp; haptics</div>
      <div className="list">
        <Toggle label="Sound effects" hint="Taps, right and wrong, lesson complete" checked={prefs.sfx} onChange={(v) => setPref('sfx', v)} />
        <Toggle label="Spoken feedback" hint="A voice says “¡Muy bien!”, “Presque.”… now and then" checked={prefs.voice} onChange={setVoice} />
        <Toggle label="Haptics" hint="Light taps on answers (iPhone with iOS 18 or later)" checked={prefs.haptics} onChange={(v) => setPref('haptics', v)} />
      </div>

      <div className="section-title">Speech checking</div>
      <div className="list">
        <div className="list-block">
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            Whisper runs entirely in Safari on your phone. It's downloaded once for free, then works with no internet. Your
            voice never leaves the phone.
          </p>
          <Segmented
            label="Speech model"
            value={model}
            onChange={choose}
            options={(Object.keys(MODELS) as ModelKey[]).map((key) => ({
              value: key,
              label: (
                <>
                  {MODELS[key].label}
                  <small>{MODELS[key].sizeMB} MB</small>
                </>
              ),
            }))}
          />
          <p className="muted small">{info.note}</p>
          {progress !== null ? (
            <>
              <ProgressBar value={progress} tone="accent" />
              <p className="muted">Downloading… {Math.round(progress * 100)}%. Keep this screen open.</p>
            </>
          ) : ready ? (
            <p className="row" style={{ margin: 0, color: 'var(--ok)', fontWeight: 650 }}>
              <Icon name="check" size={20} /> {info.label} model saved on this phone
            </p>
          ) : (
            <button className="btn" onClick={download}>
              <Icon name="download" /> Download {info.label.toLowerCase()} model ({info.sizeMB} MB)
            </button>
          )}
          {error && <p style={{ margin: 0, color: 'var(--wrong)' }}>{error}</p>}
          {ready && progress === null && (
            <button className="btn secondary" onClick={remove}>
              Delete {info.label.toLowerCase()} model
            </button>
          )}
        </div>
      </div>

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
