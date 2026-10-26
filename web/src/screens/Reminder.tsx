import { type ReactNode, useState } from 'react';
import { tapFeedback } from '../lib/fx';
import { Icon, Screen } from '../ui';
import { GUIDE_SHOTS } from './ReminderArt';

// Settings › Daily reminder: a step-by-step guide, with a drawn screen for each step, to an
// iPhone Shortcuts personal automation.
// No push notifications and no server: the iPhone itself shows the reminder at the time you pick.

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const APP_URL = `${location.origin}${location.pathname}`;
const MESSAGE = 'Time to practice! 🔥 Keep your Learnguage streak going.';

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn secondary copy-btn"
      onClick={async () => {
        tapFeedback();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard blocked: the text is on screen to copy by hand.
        }
      }}
      aria-label={`Copy ${label}`}
    >
      <Icon name={done ? 'check' : 'copy'} size={18} /> {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function Step({ n, title, shot, children }: { n: number; title: string; shot: keyof typeof GUIDE_SHOTS; children: ReactNode }) {
  return (
    <li className="card step">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="step-num" aria-hidden="true">
          {n}
        </span>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="step-title">{title}</div>
          {children}
        </div>
      </div>
      {GUIDE_SHOTS[shot]()}
    </li>
  );
}

const K = ({ children }: { children: ReactNode }) => <b className="ios-label">{children}</b>;

export function Reminder() {
  // In the Home Screen app, Shortcuts' "Open URLs" would open Safari, which keeps separate
  // storage (no XP, no streak), so that step is only offered when the app is used in Safari.
  const [withUrl, setWithUrl] = useState(!isStandalone);
  let n = 0;
  return (
    <Screen title="Daily reminder" back="/settings">
      <p className="muted" style={{ margin: '0 4px' }}>
        Your iPhone can remind you every day, for free, with the built-in <b>Shortcuts</b> app. Nothing is sent online: no
        account, no push service. It takes about two minutes.
      </p>

      <ol className="steps">
        <Step n={++n} title="Open the Shortcuts app" shot="open">
          <p className="muted small">
            It comes with every iPhone. If you deleted it, it's free in the App Store. Tap <K>Automation</K> at the bottom.
          </p>
        </Step>
        <Step n={++n} title="Make a new automation" shot="new">
          <p className="muted small">
            Tap <K>+</K> in the top corner (or <K>New Automation</K> if you have none yet), then choose <K>Time of Day</K>.
          </p>
        </Step>
        <Step n={++n} title="Pick your time" shot="time">
          <p className="muted small">
            Choose a time that suits you (early evening works well), and set <K>Repeat</K> to <K>Daily</K>. Then choose{' '}
            <K>Run Immediately</K> so it doesn't ask first, and tap <K>Next</K>.
          </p>
        </Step>
        <Step n={++n} title="Add “Show Notification”" shot="notify">
          <p className="muted small">
            Tap <K>New Blank Automation</K>, then <K>Add Action</K>. Search for <K>Show Notification</K> and tap it. Tap the
            text in it and replace it with your reminder:
          </p>
          <div className="copy-row">
            <code className="copy-text">{MESSAGE}</code>
            <Copy text={MESSAGE} label="the reminder text" />
          </div>
        </Step>
        {withUrl && (
          <Step n={++n} title="Add “Open URLs”" shot="url">
            <p className="muted small">
              Tap the search bar at the bottom, search for <K>Open URLs</K> and tap it. Tap <K>URL</K> and paste the app's
              address:
            </p>
            <div className="copy-row">
              <code className="copy-text">{APP_URL}</code>
              <Copy text={APP_URL} label="the app address" />
            </div>
            <p className="muted small">This opens the app in Safari right when the reminder goes off.</p>
          </Step>
        )}
        <Step n={++n} title="Tap Done" shot="done">
          <p className="muted small">
            That's it. To try it now, open the automation and tap the <K>▶</K> play button at the bottom.
          </p>
        </Step>
      </ol>

      <div className="card">
        {isStandalone ? (
          <p className="muted small" style={{ margin: 0 }}>
            <b>Why there's no “open the app” step:</b> Shortcuts opens web addresses in Safari, and Safari keeps its own
            separate copy of the app with none of your XP or streak. So when the reminder comes, just tap the Learnguage icon
            on your Home Screen.
          </p>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            <b>Using the Home Screen app instead?</b> Leave out the “Open URLs” step: Shortcuts would open Safari, which
            keeps its own separate progress. Just tap the app icon when the reminder comes.
          </p>
        )}
        <label className="chip-toggle" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
          <input type="checkbox" checked={withUrl} onChange={(e) => setWithUrl(e.target.checked)} /> Include the “Open URLs” step
        </label>
      </div>
    </Screen>
  );
}
