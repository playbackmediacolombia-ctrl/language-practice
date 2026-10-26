import { useState } from 'react';
import { LANGS } from '../lib/content';
import { getLessons } from '../lib/course';
import { dateKey, lessonDone, type Progress, streak, todayXp, useProgress } from '../lib/progress';
import { dailyMinutes, formatDuration, lastDays, practicedOn, type Scope, streakFor, totals, weeklyAccuracy } from '../lib/stats';
import { CountUp, Flame, Icon, LangIcon, ProgressBar, Screen } from '../ui';

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const NARROW_DAY = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const LONG_DAY = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function ProgressScreen() {
  const progress = useProgress();
  const [scope, setScope] = useState<Scope>(progress.lang ?? 'all');
  const days = streak(progress);
  const lessonsDone = LANGS.reduce((n, l) => n + getLessons(l.id).filter((x) => lessonDone(progress, l.id, x.id)).length, 0);
  const today = todayXp(progress);
  const t = totals(progress, scope);
  const week = dailyMinutes(progress, scope, 7).reduce((m, d) => m + d.minutes, 0);
  const scopeStreak = streakFor(progress, scope);

  return (
    <Screen title="Progress" large>
      <div className="card">
        <span className="muted small">Total XP</span>
        <div className="hero">
          <Icon name="bolt" size={40} style={{ color: 'var(--xp)' }} />
          <span className="hero-value">
            <CountUp value={progress.xp} />
          </span>
        </div>
        <div className="row">
          <span className="grow muted small">Today</span>
          <span className="muted small">
            {Math.min(today, progress.goal)}/{progress.goal} XP goal
          </span>
        </div>
        <ProgressBar value={today / progress.goal} tone="flame" />
      </div>

      <div className="tiles">
        <div className="tile-stat">
          <span className="tile-value">
            <Flame lit={days > 0} /> {days}
          </span>
          <span className="tile-label">Day streak</span>
        </div>
        <div className="tile-stat">
          <span className="tile-value">{lessonsDone}</span>
          <span className="tile-label">Lessons done</span>
        </div>
        <div className="tile-stat">
          <span className="tile-value">{totals(progress, 'all').words}</span>
          <span className="tile-label">Words learned</span>
        </div>
      </div>

      <div className="section-title">XP this week</div>
      <div className="card">
        <WeekChart progress={progress} />
      </div>

      <div className="section-title">By language</div>
      <div className="lang-switch compact" role="tablist" aria-label="Show stats for">
        {[{ id: 'all' as Scope, name: 'All' }, ...LANGS.map((l) => ({ id: l.id as Scope, name: l.name }))].map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={scope === o.id}
            className={scope === o.id ? 'lang-chip active' : 'lang-chip'}
            onClick={() => setScope(o.id)}
          >
            {o.name}
          </button>
        ))}
      </div>

      <div className="tiles" data-testid="scope-tiles">
        <div className="tile-stat">
          <span className="tile-value">{t.words}</span>
          <span className="tile-label">Words learned</span>
          <span className="tile-sub">{t.mastered} mastered</span>
        </div>
        <div className="tile-stat">
          <span className="tile-value">{formatDuration(t.seconds)}</span>
          <span className="tile-label">Time practiced</span>
          <span className="tile-sub">{formatDuration(week * 60)} this week</span>
        </div>
        <div className="tile-stat">
          <span className="tile-value">{t.accuracy === null ? '—' : `${Math.round(t.accuracy * 100)}%`}</span>
          <span className="tile-label">Accuracy</span>
          <span className="tile-sub">
            {t.answers} answer{t.answers === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="chart-title">Accuracy by week</div>
        <AccuracyChart progress={progress} scope={scope} />
      </div>

      <div className="card">
        <div className="chart-title">Time practiced, last 14 days</div>
        <MinutesChart progress={progress} scope={scope} />
      </div>

      <div className="card">
        <div className="row">
          <div className="chart-title grow">Streak calendar</div>
          <span className="streak-up small">
            <Flame lit={scopeStreak > 0} size={18} /> {scopeStreak} day{scopeStreak === 1 ? '' : 's'}
          </span>
        </div>
        <Calendar progress={progress} scope={scope} />
      </div>

      <div className="section-title">Lessons</div>
      <div className="list">
        {LANGS.map((l) => {
          const lessons = getLessons(l.id);
          const done = lessons.filter((x) => lessonDone(progress, l.id, x.id)).length;
          return (
            <div key={l.id} className="list-row">
              <LangIcon lang={l.id} size={38} />
              <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="row">
                  <span className="row-title grow">{l.name}</span>
                  <span className="muted small">
                    {done}/{lessons.length} lessons
                  </span>
                </span>
                <ProgressBar value={done / lessons.length} />
              </span>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

/** Rounded-top column from the baseline. */
function column(x: number, w: number, top: number, base: number) {
  const r = Math.min(4, (base - top) / 2, w / 2);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

/** Seven columns, one series (XP per day), a hairline at the daily goal, today labelled. */
function WeekChart({ progress }: { progress: Progress }) {
  const days = lastDays(7);
  const values = days.map((d) => progress.days[dateKey(d)] ?? 0);
  const [picked, setPicked] = useState<number | null>(null);

  const W = 320;
  const H = 150;
  const top = 22;
  const base = H - 24;
  const gutter = 34; // right edge, for the goal label, so it can't collide with a bar's value
  const band = (W - gutter) / days.length;
  const colW = Math.min(24, band * 0.5);
  const max = Math.max(progress.goal, ...values) * 1.15;
  const y = (v: number) => base - (v / max) * (base - top);
  const goalY = y(progress.goal);
  const shown = picked ?? days.length - 1; // today is labelled unless another column is tapped

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="XP earned each day this week">
        <line className="grid" x1={0} x2={W - gutter} y1={base} y2={base} />
        <line className="goal-line" x1={0} x2={W - gutter + 4} y1={goalY} y2={goalY} />
        <text x={W} y={goalY - 2} textAnchor="end">
          Goal
        </text>
        <text x={W} y={goalY + 12} textAnchor="end">
          {progress.goal}
        </text>
        {values.map((v, i) => {
          const x = i * band + (band - colW) / 2;
          return (
            <g key={i}>
              {v > 0 && <path className={picked !== null && picked !== i ? 'col dim' : 'col'} d={column(x, colW, y(v), base)} />}
              {i === shown && v > 0 && (
                <text className="value" x={x + colW / 2} y={y(v) - 6} textAnchor="middle">
                  {v}
                </text>
              )}
              <text x={x + colW / 2} y={H - 6} textAnchor="middle" style={i === days.length - 1 ? { fontWeight: 700, fill: 'var(--text)' } : undefined}>
                {i === days.length - 1 ? 'Today' : WEEKDAY.format(days[i])}
              </text>
              {/* Hit target: the whole column band, much bigger than the bar. */}
              <rect
                className="hit"
                x={i * band}
                y={0}
                width={band}
                height={H}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setPicked(i)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setPicked(null)}
                onClick={() => setPicked(picked === i ? null : i)}
              />
            </g>
          );
        })}
      </svg>
      {picked !== null && (
        <div className="chart-tip" style={{ left: `${(((picked + 0.5) * band) / W) * 100}%`, top: `${(Math.min(y(values[picked]), goalY) / H) * 100}%` }}>
          {LONG_DAY.format(days[picked])}: {values[picked]} XP
        </div>
      )}
      <table className="sr-only">
        <caption>XP per day</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <th>{LONG_DAY.format(d)}</th>
              <td>{values[i]} XP</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One line, a point per week with answers (gaps where there were none), 0–100%. */
function AccuracyChart({ progress, scope }: { progress: Progress; scope: Scope }) {
  const weeks = weeklyAccuracy(progress, scope, 8);
  const [picked, setPicked] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const left = 34;
  const top = 12;
  const base = H - 24;
  const band = (W - left) / weeks.length;
  const x = (i: number) => left + band * (i + 0.5);
  const y = (a: number) => base - a * (base - top);
  const has = weeks.some((w) => w.accuracy !== null);
  const last = weeks.reduce((k, w, i) => (w.accuracy !== null ? i : k), -1);
  const shown = picked ?? last;

  // Consecutive weeks with answers are joined; a week without breaks the line.
  let d = '';
  weeks.forEach((w, i) => {
    if (w.accuracy === null) return;
    d += `${i > 0 && weeks[i - 1].accuracy !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(w.accuracy).toFixed(1)}`;
  });

  return (
    <div className="chart" data-testid="accuracy-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Share of answers right, each week for the last 8 weeks">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line className="grid" x1={left} x2={W} y1={y(g)} y2={y(g)} />
            <text x={left - 6} y={y(g) + 4} textAnchor="end">
              {g * 100}%
            </text>
          </g>
        ))}
        <path className="series-line" d={d} />
        {weeks.map((w, i) =>
          w.accuracy === null ? null : <circle key={i} className={picked !== null && picked !== i ? 'series-dot dim' : 'series-dot'} cx={x(i)} cy={y(w.accuracy)} r={4.5} />,
        )}
        {shown >= 0 && weeks[shown].accuracy !== null && (
          <text className="value" x={x(shown)} y={y(weeks[shown].accuracy!) - 10} textAnchor="middle">
            {Math.round(weeks[shown].accuracy! * 100)}%
          </text>
        )}
        {weeks.map((w, i) => (
          <g key={`l${i}`}>
            {(i % 2 === 1 || i === weeks.length - 1) && (
              <text x={x(i)} y={H - 6} textAnchor="middle" style={i === weeks.length - 1 ? { fontWeight: 700, fill: 'var(--text)' } : undefined}>
                {i === weeks.length - 1 ? 'This wk' : SHORT_DATE.format(w.start)}
              </text>
            )}
            <rect
              className="hit"
              x={left + band * i}
              y={0}
              width={band}
              height={H}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setPicked(i)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setPicked(null)}
              onClick={() => setPicked(i)} // hover already picked it with a mouse; a tap picks it
            />
          </g>
        ))}
      </svg>
      {!has && <p className="chart-empty">Answer a few exercises to see your accuracy here.</p>}
      {picked !== null && (
        <div className="chart-tip" style={{ left: `${(x(picked) / W) * 100}%`, top: `${(y(weeks[picked].accuracy ?? 0.5) / H) * 100}%` }}>
          Week of {SHORT_DATE.format(weeks[picked].start)}:{' '}
          {weeks[picked].accuracy === null ? 'no answers' : `${Math.round(weeks[picked].accuracy! * 100)}% (${weeks[picked].r}/${weeks[picked].n})`}
        </div>
      )}
      <table className="sr-only">
        <caption>Accuracy per week</caption>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              <th>Week of {SHORT_DATE.format(w.start)}</th>
              <td>{w.accuracy === null ? 'No answers' : `${Math.round(w.accuracy * 100)}%, ${w.r} of ${w.n} right`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Minutes per day for two weeks, one series. */
function MinutesChart({ progress, scope }: { progress: Progress; scope: Scope }) {
  const days = dailyMinutes(progress, scope, 14);
  const [picked, setPicked] = useState<number | null>(null);
  const W = 320;
  const H = 140;
  const top = 20;
  const base = H - 24;
  const band = W / days.length;
  const colW = Math.min(14, band * 0.6);
  const max = Math.max(10, ...days.map((d) => d.minutes)) * 1.15;
  const y = (v: number) => base - (v / max) * (base - top);
  const shown = picked ?? days.length - 1;
  const total = days.reduce((m, d) => m + d.minutes, 0);

  return (
    <div className="chart" data-testid="minutes-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minutes practiced each day for the last two weeks">
        <line className="grid" x1={0} x2={W} y1={base} y2={base} />
        {days.map((d, i) => {
          const x = i * band + (band - colW) / 2;
          return (
            <g key={i}>
              {d.minutes > 0 && <path className={picked !== null && picked !== i ? 'col dim' : 'col'} d={column(x, colW, y(d.minutes), base)} />}
              {i === shown && d.minutes > 0 && (
                <text className="value" x={x + colW / 2} y={y(d.minutes) - 6} textAnchor="middle">
                  {d.minutes}
                </text>
              )}
              <text x={x + colW / 2} y={H - 6} textAnchor="middle" style={i === days.length - 1 ? { fontWeight: 700, fill: 'var(--text)' } : undefined}>
                {NARROW_DAY.format(d.date)}
              </text>
              <rect
                className="hit"
                x={i * band}
                y={0}
                width={band}
                height={H}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setPicked(i)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setPicked(null)}
                onClick={() => setPicked(i)} // hover already picked it with a mouse; a tap picks it
              />
            </g>
          );
        })}
      </svg>
      {total === 0 && <p className="chart-empty">Time spent practicing shows up here.</p>}
      {picked !== null && (
        <div className="chart-tip" style={{ left: `${Math.max(18, Math.min(82, (((picked + 0.5) * band) / W) * 100))}%`, top: `${(y(days[picked].minutes) / H) * 100}%` }}>
          {LONG_DAY.format(days[picked].date)}: {days[picked].minutes} min
        </div>
      )}
      <table className="sr-only">
        <caption>Minutes practiced per day</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <th>{LONG_DAY.format(d.date)}</th>
              <td>{d.minutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Five weeks, Monday first; days practiced in this language glow. */
function Calendar({ progress, scope }: { progress: Progress; scope: Scope }) {
  const now = new Date();
  const sinceMonday = (now.getDay() + 6) % 7;
  const days = lastDays(28 + sinceMonday + 1).concat(
    // Fill the rest of this week with the days still to come.
    Array.from({ length: 6 - sinceMonday }, (_, i) => {
      const d = new Date(now);
      d.setHours(12, 0, 0, 0);
      d.setDate(now.getDate() + i + 1);
      return d;
    }),
  );
  const todayKey = dateKey();
  const header = lastDays(7, days[6]).map((d) => NARROW_DAY.format(d));
  return (
    <>
      <div className="calendar" role="list" aria-label="Days practiced in the last five weeks" data-testid="calendar">
        {header.map((h, i) => (
          <span key={`h${i}`} className="head" aria-hidden="true">
            {h}
          </span>
        ))}
        {days.map((d) => {
          const k = dateKey(d);
          const future = d.getTime() > now.getTime() && k !== todayKey;
          const on = !future && practicedOn(progress, scope, k);
          return (
            <span
              key={k}
              role="listitem"
              className={[on && 'on', k === todayKey && 'today', future && 'future'].filter(Boolean).join(' ')}
              aria-label={`${LONG_DAY.format(d)}: ${future ? 'still to come' : on ? 'practiced' : 'no practice'}`}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
      <p className="muted small">Orange days had practice{scope === 'all' ? '' : ' in this language'}. Keep the chain going!</p>
    </>
  );
}
