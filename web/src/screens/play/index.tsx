import { useEffect, useState } from 'react';
import { Sticker, type StickerName } from '../../art';
import type { Lang } from '../../lib/content';
import { currentLevel, hasStarted } from '../../lib/course';
import { tapFeedback } from '../../lib/fx';
import { type Band, BANDS, bandOf, loadPlay, type PlayData, type PlayKind, playCached } from '../../lib/play';
import { useProgress } from '../../lib/progress';
import { navigate, useRoute } from '../../lib/router';
import { Icon, Screen } from '../../ui';
import { LangSwitcher } from '../Path';
import { AdventureScreen } from './Adventure';
import { CallScreen } from './Call';
import { ChatScreen } from './Chat';
import { DebateList, DebateScreen } from './Debate';
import { MissionScreen } from './Missions';
import { SpotScreen } from './Spot';
import { TeachScreen } from './Teach';
import './play.css';

// Practice › Play: seven ways to use the language like in real life, at every level, in every
// language. Each works offline; with the internet, the AI partner makes some of them live.

export const KINDS: { kind: PlayKind; title: string; about: string; sticker: StickerName; tint: string; online?: string }[] = [
  { kind: 'adventure', title: 'Adventures', about: 'Mysteries and trips where you steer the story by saying what you do.', sticker: 'book', tint: 'tint-orange', online: 'answer in your own words' },
  { kind: 'call', title: 'Phone calls', about: 'The phone rings: book a table, call a taxi, sort out an appointment.', sticker: 'phone', tint: 'tint-blue', online: 'a live AI caller' },
  { kind: 'chat', title: 'Text chats', about: 'WhatsApp-style threads with real slang, abbreviations and emojis.', sticker: 'chat', tint: 'tint-sky', online: 'keep texting with AI' },
  { kind: 'teach', title: 'Teach the bird', about: 'The bird forgot a word: explain it in the language you are learning.', sticker: 'bulb', tint: 'tint-sun', online: 'the AI judges your explanation' },
  { kind: 'spot', title: 'Spot the mistake', about: 'The bird says something slightly wrong. Catch it and fix it.', sticker: 'words', tint: 'tint-red' },
  { kind: 'mission', title: 'Real-life missions', about: 'Small challenges out in the world, like ordering a coffee. Check them off for bonus XP.', sticker: 'pin', tint: 'tint-blue' },
  { kind: 'debate', title: 'Debate', about: 'Argue a fun topic with the AI partner. Fluent level.', sticker: 'debate', tint: 'tint-navy', online: 'needs the internet' },
];

/** #/<lang>/play[/<kind>[/<id>]] */
export default function PlayRoutes({ lang }: { lang: Lang }) {
  const [, , kind, id] = useRoute();
  const [data, setData] = useState<PlayData | undefined>(() => playCached(lang));
  useEffect(() => {
    let live = true;
    void loadPlay(lang).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [lang]);
  if (!data) return <Screen title="Play" back="/practice">{null}</Screen>;
  if (!kind) return <PlayHub lang={lang} data={data} />;
  const k = kind as PlayKind;
  if (id) {
    if (k === 'adventure') return <AdventureScreen key={id} lang={lang} data={data} id={id} />;
    if (k === 'call') return <CallScreen key={id} lang={lang} data={data} id={id} />;
    if (k === 'chat') return <ChatScreen key={id} lang={lang} data={data} id={id} />;
    if (k === 'teach') return <TeachScreen key={id} lang={lang} data={data} band={Number(id) as Band} />;
    if (k === 'spot') return <SpotScreen key={id} lang={lang} data={data} band={Number(id) as Band} />;
    if (k === 'mission') return <MissionScreen key={id} lang={lang} data={data} id={id} />;
    if (k === 'debate') return <DebateScreen key={id} lang={lang} data={data} id={id} />;
  }
  if (k === 'debate') return <DebateList lang={lang} data={data} />;
  return <PlayList lang={lang} data={data} kind={k} />;
}

function usePlayBand(lang: Lang): Band {
  const progress = useProgress();
  return bandOf(hasStarted(progress, lang) ? currentLevel(progress, lang) : 'Beginner');
}

function PlayHub({ lang, data }: { lang: Lang; data: PlayData }) {
  const progress = useProgress();
  const done = (kind: PlayKind) => Object.keys(progress.play ?? {}).filter((k) => k.startsWith(`${lang}:${kind}:`)).length;
  const total: Record<PlayKind, number> = {
    adventure: data.adventures.length,
    call: data.calls.length,
    chat: data.chats.length,
    teach: 3,
    spot: 3,
    mission: data.missions.length,
    debate: data.debate.topics.length,
  };
  return (
    <Screen title="Play & real life" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/play`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Use the language the way you would for real. Everything works offline; with the internet, the AI partner joins in.
      </p>
      <div className="list">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            className="list-row link"
            data-testid={`play-${k.kind}`}
            onClick={() => {
              tapFeedback();
              navigate(`/${lang}/play/${k.kind}`);
            }}
          >
            <span className={`row-icon sticker-icon ${k.tint}`} aria-hidden="true">
              <Sticker name={k.sticker} size={36} />
            </span>
            <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="row-title">{k.title}</span>
              <span className="row-hint">{k.about}</span>
              {k.online && <span className="row-hint online-hint">Online: {k.online}</span>}
            </span>
            <span className="story-score">
              {done(k.kind)}/{total[k.kind]}
            </span>
            <Icon name="chevron" />
          </button>
        ))}
      </div>
    </Screen>
  );
}

type Row = { id: string; band: Band; title: string; sub: string; test: string };

/** One kind's list, by level band (yours first). Teach and Spot are rounds, one per band. */
function PlayList({ lang, data, kind }: { lang: Lang; data: PlayData; kind: PlayKind }) {
  const progress = useProgress();
  const mine = usePlayBand(lang);
  const info = KINDS.find((k) => k.kind === kind);
  if (!info) {
    navigate(`/${lang}/play`, { replace: true });
    return null;
  }
  const rows: Row[] =
    kind === 'adventure'
      ? data.adventures.map((a) => ({ id: a.id, band: a.band, title: a.en, sub: `${a.title} · ${a.kind === 'mystery' ? 'Mystery' : 'Trip'}`, test: a.id }))
      : kind === 'call'
        ? data.calls.map((c) => ({ id: c.id, band: c.band, title: c.en, sub: `${c.title} · ${c.incoming ? 'Incoming call' : 'You call'}`, test: c.id }))
        : kind === 'chat'
          ? data.chats.map((c) => ({ id: c.id, band: c.band, title: c.en, sub: `${c.title} · with ${c.them}`, test: c.id }))
          : kind === 'mission'
            ? data.missions.map((m) => ({ id: m.id, band: m.band, title: m.en, sub: m.title, test: m.id }))
            : ([1, 2, 3] as Band[]).map((b) => ({
                id: String(b),
                band: b,
                title: kind === 'teach' ? `${data.teach.words.filter((w) => w.band === b).length} words to explain` : `${data.spot.filter((s) => s.band === b).length} sentences to fix`,
                sub: BANDS[b],
                test: String(b),
              }));
  const bands = ([mine, ...([1, 2, 3] as Band[]).filter((b) => b !== mine)] as Band[]).filter((b) => rows.some((r) => r.band === b));
  return (
    <Screen title={info.title} back={`/${lang}/play`}>
      <LangSwitcher lang={lang} to={(l) => `/${l}/play/${kind}`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        {info.about}
      </p>
      {bands.map((b) => (
        <section key={b}>
          <div className="section-title">
            {BANDS[b]}
            {b === mine && <span className="your-level"> · your level</span>}
          </div>
          <div className="list">
            {rows
              .filter((r) => r.band === b)
              .map((r) => {
                const best = progress.play?.[`${lang}:${kind}:${r.id}`];
                return (
                  <button
                    key={r.id}
                    className="list-row link"
                    data-testid={`play-${kind}-${r.test}`}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/play/${kind}/${r.id}`);
                    }}
                  >
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title">{r.title}</span>
                      <span className="row-hint" lang={kind === 'teach' || kind === 'spot' ? undefined : lang}>
                        {r.sub}
                      </span>
                    </span>
                    {best !== undefined &&
                      (kind === 'mission' ? (
                        <span className="story-score full" aria-label="Done">
                          <Icon name="check" size={16} />
                        </span>
                      ) : (
                        <span className={`story-score ${best >= 0.85 ? 'full' : ''}`}>{Math.round(best * 100)}%</span>
                      ))}
                    <Icon name="chevron" />
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </Screen>
  );
}
