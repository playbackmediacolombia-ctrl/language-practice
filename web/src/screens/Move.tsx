import { type ReactNode, useEffect, useState } from 'react';
import { Sticker } from '../art';
import { type BackupSummary, currentSummary, saveBackup } from '../lib/backup';
import { tapFeedback } from '../lib/fx';
import { makeMoveCode, NEW_HOME, newHomeIsLive, onOldAddress, readMoveCode } from '../lib/move';
import { navigate } from '../lib/router';
import { Icon, Screen } from '../ui';
import { SummaryRow } from './Settings';

// Settings › New address: carry your progress from the old github.io app to learnguage.net.

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const HOST = new URL(NEW_HOME).host;

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="card step">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="step-num" aria-hidden="true">
          {n}
        </span>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="step-title">{title}</div>
          {children}
        </div>
      </div>
    </li>
  );
}

export function Move({ code }: { code?: string }) {
  return onOldAddress ? <MoveOut /> : <MoveIn incoming={code} />;
}

/** In the old app: copy everything, then open the new address. */
function MoveOut() {
  const [code, setCode] = useState('');
  const [live, setLive] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<'yes' | 'blocked' | null>(null);
  useEffect(() => {
    void makeMoveCode().then(setCode);
    void newHomeIsLive().then(setLive);
  }, []);
  const mine = currentSummary();

  const copy = async () => {
    tapFeedback();
    try {
      await navigator.clipboard.writeText(code);
      setCopied('yes');
    } catch {
      setCopied('blocked'); // the code is on screen to copy by hand
    }
  };

  return (
    <Screen title="New address" back="/settings">
      <div className="card start-card" data-testid="move-out">
        <span className="start-sticker" aria-hidden="true">
          <Sticker name="plane" size={88} />
        </span>
        <div className="start-title">Learnguage now lives at {HOST}</div>
        <p className="muted">
          {live === false
            ? `The new address isn't open yet. Copy your progress whenever you like; it'll be ready to paste once ${HOST} is up.`
            : 'Same app, same free lessons, just an easier address. Your progress stays on this phone, so bring it along in three steps.'}
        </p>
      </div>

      <ol className="steps">
        <Step n={1} title="Copy my progress">
          <SummaryRow label="Everything on this app" s={mine} />
          <button className="btn" onClick={copy} disabled={!code} data-testid="move-copy">
            <Icon name={copied === 'yes' ? 'check' : 'copy'} size={20} /> {copied === 'yes' ? 'Copied!' : 'Copy my progress'}
          </button>
          {copied === 'blocked' && <p className="muted small">Copying was blocked. Press and hold the code below, then Select All and Copy.</p>}
          <details className="move-details">
            <summary className="muted small">Show the code</summary>
            <textarea className="answer-input move-code" readOnly value={code} rows={3} data-testid="move-code" onFocus={(e) => e.target.select()} />
          </details>
        </Step>
        <Step n={2} title={`Open ${HOST}`}>
          {isStandalone ? (
            <p className="muted small">
              Open <b>Safari</b>, go to <b>{HOST}</b>, then tap <b>Share</b> › <b>Add to Home Screen</b>. Open the new icon.
            </p>
          ) : (
            <>
              <a className="btn secondary" href={`${NEW_HOME}#/move/${code}`} data-testid="move-link">
                <Icon name="chevron" size={20} /> Open {HOST} with my progress
              </a>
              <p className="muted small">
                Using the Home Screen app? Open {HOST} in Safari and tap <b>Share</b> › <b>Add to Home Screen</b> instead.
              </p>
            </>
          )}
        </Step>
        <Step n={3} title="Paste it in the new app">
          <p className="muted small">
            On its first screen tap <b>Bring my progress</b>, then <b>Paste my progress</b>. Your XP, streak, lessons and review days come
            along.
          </p>
        </Step>
      </ol>

      <div className="card">
        <p className="muted small" style={{ margin: 0 }}>
          Keep this old app until the new one shows your XP. Rather use a file? Save a backup and import it in the new app (Settings ›
          Backup).
        </p>
        <button className="btn secondary" onClick={() => void saveBackup()}>
          <Icon name="download" size={20} /> Save a backup file
        </button>
      </div>
    </Screen>
  );
}

/** In the new app: paste the code (or follow the link) and confirm. */
function MoveIn({ incoming }: { incoming?: string }) {
  const [pending, setPending] = useState<{ summary: BackupSummary; restore: () => void } | null>(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState<BackupSummary | null>(null);
  const mine = currentSummary();

  const read = async (text: string) => {
    setError('');
    try {
      setPending(await readMoveCode(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    if (!incoming) return;
    history.replaceState(null, '', '#/move'); // don't leave the code in the address bar or history
    void read(incoming);
  }, [incoming]);

  const paste = async () => {
    tapFeedback();
    try {
      await read(await navigator.clipboard.readText());
    } catch {
      setError("Couldn't read the clipboard. Press and hold in the box below and tap Paste.");
    }
  };

  if (done) {
    return (
      <Screen title="Welcome back" back="/">
        <div className="card start-card" data-testid="move-done">
          <span className="start-sticker" aria-hidden="true">
            <Sticker name="trophy" size={88} />
          </span>
          <div className="start-title">Your progress is here!</div>
          <SummaryRow label="Brought over" s={done} />
          <p className="muted small">
            Set up the daily reminder with the “Open URLs” step? In Shortcuts, change its address to <b>{location.origin}/</b>. Once you see
            your XP here, you can delete the old icon from your Home Screen.
          </p>
          <button className="btn" onClick={() => navigate('/')}>
            Go to my lessons
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Bring my progress" back="/">
      <div className="card start-card">
        <span className="start-sticker" aria-hidden="true">
          <Sticker name="plane" size={88} />
        </span>
        <div className="start-title">Used Learnguage at the old address?</div>
        <p className="muted">
          In the old app, open <b>Settings › New address</b> and tap <b>Copy my progress</b>. Then come back here.
        </p>
        <button className="btn" onClick={paste} data-testid="move-paste">
          <Icon name="copy" size={20} /> Paste my progress
        </button>
        <details className="move-details">
          <summary className="muted small">Paste the code by hand</summary>
          <textarea className="answer-input move-code" rows={3} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="LG1.…" data-testid="move-input" />
          <button className="btn secondary" disabled={!typed.trim()} onClick={() => void read(typed)} data-testid="move-use">
            Use this code
          </button>
        </details>
        {error && (
          <p role="alert" style={{ margin: 0, color: 'var(--wrong)', fontWeight: 700 }}>
            {error}
          </p>
        )}
      </div>

      {pending && (
        <div className="card restore-card" data-testid="move-confirm">
          <div className="card-title">Bring this progress here?</div>
          <SummaryRow label="From the old app" s={pending.summary} />
          {mine.xp > 0 || mine.lessons > 0 ? (
            <>
              <SummaryRow label="Here now (will be replaced)" s={mine} />
              <p className="muted small">The progress already in this app is replaced. Usually you want the one with more XP.</p>
            </>
          ) : null}
          <div className="row">
            <button
              className="btn flex"
              onClick={() => {
                pending.restore();
                setDone(pending.summary);
                setPending(null);
              }}
              data-testid="move-confirm-btn"
            >
              Bring it over
            </button>
            <button className="btn secondary flex" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
