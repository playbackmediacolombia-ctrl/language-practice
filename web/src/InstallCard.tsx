import { useState } from 'react';
import { tapFeedback } from './lib/fx';
import { iosVersion, isIPad, useInstall } from './lib/install';
import { Icon } from './ui';

// "Add to Home Screen": on Android/Chrome the button opens the real install prompt; on iPhone
// it opens a short guide whose arrow points at Safari's own button. Hidden once installed, and
// it can be dismissed for good.

export function InstallCard() {
  const install = useInstall();
  const [guide, setGuide] = useState(false);
  if (!install.mode) return null;
  return (
    <>
      <div className="card install-card" data-testid="install-card">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <img src="icons/icon-192.png" alt="" width={48} height={48} className="install-icon" />
          <div className="grow">
            <div className="card-title">Add Learnguage to your Home Screen</div>
            <p className="muted small">It opens full screen like an app, works offline and keeps your progress safe.</p>
          </div>
          <button className="icon-btn install-close" aria-label="Dismiss" onClick={install.dismiss} data-testid="install-dismiss">
            <Icon name="close" size={20} />
          </button>
        </div>
        <button
          className="btn"
          onClick={() => {
            tapFeedback();
            if (install.mode === 'prompt') void install.prompt();
            else setGuide(true);
          }}
          data-testid="install-button"
        >
          <Icon name="download" size={20} /> {install.mode === 'prompt' ? 'Install the app' : 'Show me how'}
        </button>
      </div>
      {guide && <IosGuide onClose={() => setGuide(false)} />}
    </>
  );
}

/**
 * The iPhone guide. Step 1 points at Share: in Safari 26 on iPhone it's in the "⋯" menu at the
 * bottom right; before that it's the middle of the bottom toolbar; on iPad it's at the top right.
 * Step 2 shows the "Add to Home Screen" row of the share sheet.
 */
function IosGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const newSafari = iosVersion >= 26 && !isIPad;
  const where = isIPad ? 'top' : newSafari ? 'bottom-right' : 'bottom';
  const steps = newSafari
    ? [
        { title: 'Tap ⋯ at the bottom right', body: 'It\'s next to the address bar. Then tap Share in the menu.' },
        { title: 'Tap “Add to Home Screen”', body: 'Scroll down in the list if you don\'t see it (it may be under View More). Then tap Add.' },
      ]
    : [
        { title: 'Tap the Share button', body: isIPad ? 'It\'s at the top right of Safari: a square with an arrow pointing up.' : 'It\'s in the middle of Safari\'s bottom bar: a square with an arrow pointing up.' },
        { title: 'Tap “Add to Home Screen”', body: 'Scroll down in the list until you see it, then tap Add.' },
      ];
  return (
    <div className="install-backdrop" onClick={onClose} data-testid="install-guide">
      <div className="install-guide card" role="dialog" aria-label="How to add Learnguage to your Home Screen" onClick={(e) => e.stopPropagation()}>
        <img className="install-logo" src="brand/logo.webp" alt="" width={140} height={115} />
        <div className="install-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div className="muted small install-step">Step {step + 1} of 2</div>
        <div className="start-title" style={{ fontSize: 'var(--text-lg)' }} data-testid="install-step-title">
          {steps[step].title}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {steps[step].body}
        </p>
        {step === 0 ? <ShareArt newSafari={newSafari} /> : <AddRowArt />}
        <div className="row">
          {step === 0 ? (
            <button className="btn flex" onClick={() => setStep(1)} data-testid="install-next">
              Next
            </button>
          ) : (
            <>
              <button className="btn secondary flex" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn flex" onClick={onClose} data-testid="install-done">
                Got it
              </button>
            </>
          )}
        </div>
      </div>
      {step === 0 && (
        <div className={`install-arrow ${where}`} aria-hidden="true" data-testid="install-arrow">
          <svg viewBox="0 0 40 56" width="40" height="56">
            <path d="M20 4 V44 M8 32 L20 46 L32 32" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 4 V44 M8 32 L20 46 L32 32" fill="none" stroke="#0164f9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

/** Safari's bottom bar, with the button to tap highlighted. */
function ShareArt({ newSafari }: { newSafari: boolean }) {
  const share = (
    <g>
      <rect x="-9" y="-6" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M0 -13 V3 M-5 -8 L0 -13 L5 -8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  return (
    <svg className="install-art" viewBox="0 0 300 70" role="img" aria-label={newSafari ? 'Safari bottom bar with the More button highlighted' : 'Safari bottom bar with the Share button highlighted'}>
      <rect x="2" y="2" width="296" height="66" rx="18" strokeWidth="2" style={{ fill: 'var(--card-2)', stroke: 'var(--border)' }} />
      {newSafari ? (
        <>
          <rect x="18" y="18" width="200" height="34" rx="17" strokeWidth="2" style={{ fill: 'var(--card)', stroke: 'var(--border)' }} />
          <text x="118" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
            learnguage.net
          </text>
          <circle cx="258" cy="35" r="20" fill="#0164f9" />
          <g fill="#fff">
            <circle cx="249" cy="35" r="3" />
            <circle cx="258" cy="35" r="3" />
            <circle cx="267" cy="35" r="3" />
          </g>
        </>
      ) : (
        <>
          {[40, 95, 205, 260].map((x) => (
            <circle key={x} cx={x} cy="35" r="7" opacity="0.5" style={{ fill: 'var(--faint)' }} />
          ))}
          <circle cx="150" cy="35" r="22" fill="#0164f9" />
          <g transform="translate(150 37)" color="#fff">
            {share}
          </g>
        </>
      )}
    </svg>
  );
}

/** The share sheet's "Add to Home Screen" row. */
function AddRowArt() {
  return (
    <svg className="install-art" viewBox="0 0 300 120" role="img" aria-label="The share menu with Add to Home Screen highlighted">
      <rect x="2" y="2" width="296" height="116" rx="18" strokeWidth="2" style={{ fill: 'var(--card-2)', stroke: 'var(--border)' }} />
      <rect x="16" y="14" width="268" height="36" rx="10" style={{ fill: 'var(--card)' }} />
      <text x="30" y="37" fontSize="13" fontWeight="600" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
        Copy
      </text>
      <rect x="16" y="62" width="268" height="44" rx="12" stroke="#0164f9" strokeWidth="3" style={{ fill: 'var(--card)' }} />
      <text x="30" y="89" fontSize="15" fontWeight="700" fontFamily="var(--font)" style={{ fill: 'var(--text)' }}>
        Add to Home Screen
      </text>
      <rect x="248" y="72" width="24" height="24" rx="6" fill="none" strokeWidth="2.2" style={{ stroke: 'var(--text)' }} />
      <path d="M260 78 V90 M254 84 H266" strokeWidth="2.2" strokeLinecap="round" style={{ stroke: 'var(--text)' }} />
    </svg>
  );
}
