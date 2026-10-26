import { useState } from 'react';
import { LANGS } from '../lib/content';
import { getLessons } from '../lib/course';
import { dateKey, lessonDone, type Progress, streak, todayXp, useProgress } from '../lib/progress';
import { CountUp, Flame, Icon, LangIcon, ProgressBar, Screen } from '../ui';

const DAY = 24 * 3600 * 1000;
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const LONG_DAY = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function lastDays(n: number): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() - (n - 1 - i) * DAY));
}

export function ProgressScreen() {
  const progress = useProgress();
  const days = streak(progress);
  const lessonsDone = LANGS.reduce((n, l) => n + getLessons(l.id).filter((x) => lessonDone(progress, l.id, x.id)).length, 0);
  const words = LANGS.reduce(
    (n, l) =>
      n +
      getLessons(l.id)
        .filter((x) => lessonDone(progress, l.id, x.id))
        .reduce((m, x) => m + x.items.length, 0),
    0,
  );
  const today = todayXp(progress);

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
          <span className="tile-value">{words}</span>
          <span className="tile-label">Words learned</span>
        </div>
      </div>

      <div className="section-title">XP this week</div>
      <div className="card">
        <WeekChart progress={progress} />
      </div>

      <div className="section-title">Streak calendar</div>
      <div className="card">
        <Calendar progress={progress} />
      </div>

      <div className="section-title">Languages</div>
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

  const column = (x: number, v: number) => {
    const yTop = y(v);
    const r = Math.min(4, (base - yTop) / 2, colW / 2);
    return `M${x},${base}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + colW - r}Q${x + colW},${yTop} ${x + colW},${yTop + r}V${base}Z`;
  };

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
              {v > 0 && <path className={picked !== null && picked !== i ? 'col dim' : 'col'} d={column(x, v)} />}
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

/** The last four weeks; days with a finished lesson glow. */
function Calendar({ progress }: { progress: Progress }) {
  const days = lastDays(28);
  const todayKey = dateKey();
  return (
    <>
      <div className="calendar" role="list" aria-label="Days practiced in the last four weeks">
        {days.map((d) => {
          const k = dateKey(d);
          const on = (progress.days[k] ?? 0) > 0;
          return (
            <span key={k} role="listitem" className={[on && 'on', k === todayKey && 'today'].filter(Boolean).join(' ')} aria-label={`${LONG_DAY.format(d)}: ${on ? 'practiced' : 'no practice'}`}>
              {d.getDate()}
            </span>
          );
        })}
      </div>
      <p className="muted small">Orange days had at least one finished lesson. Keep the chain going!</p>
    </>
  );
}
