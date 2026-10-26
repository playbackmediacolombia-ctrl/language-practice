import { Sticker } from '../art';
import { tapFeedback } from '../lib/fx';
import { setPref } from '../lib/progress';
import { Screen } from '../ui';

// The flirting topic (lessons, role-plays, dialogues) opens after a one-tap "I'm 18 or older".
// Settings › Show 18+ topics turns it off again.

export function AdultGate({ count }: { count?: string }) {
  return (
    <div className="card adult-gate" data-testid="adult-gate">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Sticker name="wink" size={52} />
        <div className="grow">
          <div className="card-title">Flirting is an 18+ topic{count ? ` · ${count}` : ''}</div>
          <p className="muted small">
            Compliments, playful teasing, smooth and cheesy pick-up lines, flirty texts and how to read the signals. Flirty, never sexual.
          </p>
        </div>
      </div>
      <button
        className="btn"
        onClick={() => {
          tapFeedback();
          setPref('adult', true);
        }}
        data-testid="adult-confirm"
      >
        I'm 18 or older
      </button>
    </div>
  );
}

/** A flirting lesson, role-play or dialogue opened directly (from a link or history). */
export function AdultGateScreen({ back }: { back: string }) {
  return (
    <Screen title="18+ topic" back={back}>
      <AdultGate />
    </Screen>
  );
}
