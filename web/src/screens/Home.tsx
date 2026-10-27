import { onOldAddress } from '../lib/move';
import { navigate } from '../lib/router';
import { InstallCard } from '../InstallCard';
import { Screen } from '../ui';
import { LangTiles } from './Path';

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
      <InstallCard />
    </Screen>
  );
}
