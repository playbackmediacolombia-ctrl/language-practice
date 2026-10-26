import { onOldAddress } from '../lib/move';
import { navigate } from '../lib/router';
import { Icon, Screen } from '../ui';
import { LangTiles } from './Path';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** First run: pick a language. Afterwards the Learn tab opens straight on its path. */
export function Home() {
  return (
    <Screen title="Welcome" large brand={false}>
      <img className="welcome-logo" src="brand/logo.webp" alt="Learnguage" width={300} height={246} />
      <p className="muted" style={{ fontSize: 17, textAlign: 'center' }}>
        Learn like a child does: sounds first, then words, sentences and real conversation. Free, no account, saved on this
        phone.
      </p>
      <h2 className="heading">Pick a language</h2>
      <LangTiles onPick={(l) => navigate(`/${l}`)} />
      {!onOldAddress && (
        <button className="btn ghost" onClick={() => navigate('/move')} data-testid="move-welcome">
          Used Learnguage before? Bring my progress
        </button>
      )}
      {!isStandalone && (
        <div className="card">
          <div className="row">
            <span className="row-icon">
              <Icon name="download" />
            </span>
            <div className="grow">
              <div style={{ fontWeight: 650 }}>Add to Home Screen</div>
              <p className="muted small">
                In Safari tap Share, then <b>Add to Home Screen</b>. It opens full screen like an app and works offline.
              </p>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
