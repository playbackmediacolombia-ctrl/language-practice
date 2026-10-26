import { useEffect, useRef, useState } from 'react';
import { playPhrase } from '../lib/audio';
import { type BackupSummary, currentSummary, readBackup, saveBackup } from '../lib/backup';
import { getPhrases, getTopics } from '../lib/content';
import { formatBytes, offlineStatus, type OfflineStatus, useOnline } from '../lib/offline';
import { GOALS, resetProgress, setGoal, setPref, setSpeaking, setVoice, type Speed, type Theme, useProgress } from '../lib/progress';
import { chosenModel, deleteModel, isModelReady, loadModel, type ModelKey, MODELS, setChosenModel } from '../lib/whisper';
import { Icon, ProgressBar, Screen, Segmented, Toggle } from '../ui';

export function Settings() {
  const [model, setModel] = useState<ModelKey>(chosenModel());
  const [ready, setReady] = useState(isModelReady(model));
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const info = MODELS[model];
  const prefs = useProgress();
  const online = useOnline();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ summary: BackupSummary; restore: () => void } | null>(null);
  const [backupMsg, setBackupMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const confirmCard = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pending) confirmCard.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pending]);

  const exportBackup = async () => {
    setBackupMsg(null);
    if (await saveBackup()) setBackupMsg({ text: 'Backup saved. Keep the file somewhere safe, like iCloud Drive in the Files app.', ok: true });
  };
  const pickBackup = async (file: File | undefined) => {
    setBackupMsg(null);
    setPending(null);
    if (!file) return;
    try {
      setPending(await readBackup(file));
    } catch (e) {
      setBackupMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    }
    if (fileInput.current) fileInput.current.value = ''; // so the same file can be picked again
  };
  const restore = () => {
    if (!pending) return;
    pending.restore();
    setModel(chosenModel());
    setReady(isModelReady(chosenModel()));
    setBackupMsg({ text: `Progress restored from the backup of ${DATE.format(pending.summary.exported)}.`, ok: true });
    setPending(null);
  };
  const [offline, setOffline] = useState<OfflineStatus | null>(null);
  useEffect(() => {
    let live = true;
    const check = () => offlineStatus().then((s) => live && setOffline(s));
    void check();
    // The service worker may finish saving the app while this screen is open.
    navigator.serviceWorker?.addEventListener('controllerchange', check);
    return () => {
      live = false;
      navigator.serviceWorker?.removeEventListener('controllerchange', check);
    };
  }, [ready]);

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
        <div className="list-block" data-testid="speed-setting">
          <span className="row-title">Listening speed</span>
          <span className="row-hint">For every recording: lessons, stories, the phrasebook and hands-free. Slow buttons stay slower.</span>
          <Segmented
            label="Listening speed"
            value={prefs.speed}
            onChange={(speed: Speed) => {
              setPref('speed', speed);
              // A sample at the new speed, in the language you're learning.
              const sample = getPhrases(prefs.lang ?? 'es', getTopics()[0].id).at(-1);
              if (sample) playPhrase(sample.audio, speed);
            }}
            options={[
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
            ]}
          />
        </div>
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

      <div className="section-title">Backup</div>
      <div className="list" data-testid="backup">
        <div className="list-block">
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            Your progress lives only on this phone. Save a backup file now and then (to Files or iCloud Drive), and you can bring it back
            on this phone or a new one.
          </p>
          <button className="btn" onClick={exportBackup}>
            <Icon name="download" /> Export my progress
          </button>
          <button className="btn secondary" onClick={() => fileInput.current?.click()}>
            Import a backup…
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => pickBackup(e.target.files?.[0])} data-testid="backup-file" />
          {pending && (
            <div ref={confirmCard} className="card restore-card" data-testid="restore-confirm">
              <div style={{ fontWeight: 700 }}>Replace your progress with this backup?</div>
              <SummaryRow label={`Backup, ${DATE.format(pending.summary.exported)}`} s={pending.summary} />
              <SummaryRow label="On this phone now" s={currentSummary()} />
              <p className="muted small" style={{ margin: 0 }}>
                Everything on this phone is replaced by the backup. Export first if you want to keep it.
              </p>
              <div className="row">
                <button className="btn secondary flex" onClick={() => setPending(null)}>
                  Cancel
                </button>
                <button className="btn flex" onClick={restore}>
                  Replace
                </button>
              </div>
            </div>
          )}
          {backupMsg && (
            <p role="status" style={{ margin: 0, color: backupMsg.ok ? 'var(--ok)' : 'var(--wrong)', fontWeight: 600 }}>
              {backupMsg.text}
            </p>
          )}
        </div>
      </div>

      <div className="section-title">Offline</div>
      <div className="list" data-testid="offline">
        <div className="list-block">
          <p className="row" style={{ margin: 0, fontWeight: 650 }}>
            <span className={online ? 'dot ok' : 'dot off'} aria-hidden="true" />
            {online ? 'Online' : "You're offline. Everything below still works."}
          </p>
          <OfflineRow ok={!!offline?.app} label="App, lessons, stories and all audio" detail={offline?.app ? `Saved on this phone (${offline.files} files)` : offline ? 'Saving… keep the app open while online' : 'Checking…'} />
          <OfflineRow
            ok={ready}
            label={`Speech model (${info.label.toLowerCase()})`}
            detail={ready ? 'Saved on this phone' : 'Needed to check your speaking offline: download it above'}
          />
          {offline?.usage != null && (
            <p className="muted small" style={{ margin: 0 }}>
              Using {formatBytes(offline.usage)} on this phone.{' '}
              {offline.persisted
                ? 'Protected: Safari won’t clear it to make space.'
                : 'Open the app from the Home Screen so Safari keeps it; a Safari tab can be cleared after weeks without a visit.'}
            </p>
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

function OfflineRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="row offline-row">
      <span className={ok ? 'offline-icon ok' : 'offline-icon'}>
        <Icon name={ok ? 'check' : 'download'} size={18} />
      </span>
      <span className="grow">
        <span className="row-title">{label}</span>
        <span className="row-hint">{detail}</span>
      </span>
    </div>
  );
}

const DATE = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function SummaryRow({ label, s }: { label: string; s: BackupSummary }) {
  return (
    <div className="summary-row">
      <span className="muted small">{label}</span>
      <span>
        {s.xp} XP · {s.lessons} lesson{s.lessons === 1 ? '' : 's'} · {s.words} word{s.words === 1 ? '' : 's'} · {s.streakDays} day{s.streakDays === 1 ? '' : 's'} practiced
      </span>
    </div>
  );
}
