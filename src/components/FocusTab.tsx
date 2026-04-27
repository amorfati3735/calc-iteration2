import React, { useState, useEffect, useMemo, useRef, memo } from 'react';

import { StudySession, RunningSession } from '../types';

const formatBrutalDate = (timestamp: number) => {
  const d = new Date(timestamp);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getDate()}-${months[d.getMonth()]}`;
};

export const formatDuration = (ms: number, alwaysShowHours = false) => {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0 || alwaysShowHours) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

export const formatDurationShort = (ms: number) => {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}m`;
};

export const computeRunningElapsed = (r: RunningSession, now: number) => {
  const base = now - r.startedAt - r.pausedMs;
  if (r.pausedAt) return base - (now - r.pausedAt);
  return base;
};

interface FocusTabProps {
  studySessions: StudySession[];
  runningSession: RunningSession | null;
  dailyStudyGoalMin: number;
  customSubjects: string[];
  onStart: (subject: string, name?: string, note?: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onIncrementDistraction: () => void;
  onUpdateRunning: (patch: Partial<RunningSession>) => void;
  onEditSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  expandedDays: Record<string, boolean>;
  setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const KAOMOJI = { EMPTY: '(´• ω •`)ノ', GOAL: '(=^･ω･^=)', GO: 'ᕙ(`▿´)ᕗ' };

// Isolated ticker — re-renders only itself.
function LiveTimer({ runningSession }: { runningSession: RunningSession }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (runningSession.pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningSession.pausedAt]);
  const elapsed = computeRunningElapsed(runningSession, now);
  return (
    <div className="font-display font-black tracking-tighter text-[5.5rem] sm:text-[7rem] leading-none tabular-nums">
      {formatDuration(elapsed)}
    </div>
  );
}

// Today total pill — ticks once per minute when a session is running.
export function TodayPill({
  studySessions,
  runningSession,
  goalMin,
}: {
  studySessions: StudySession[];
  runningSession: RunningSession | null;
  goalMin: number;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!runningSession || runningSession.pausedAt) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [runningSession, runningSession?.pausedAt]);

  const todayMs = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    let total = studySessions
      .filter(s => s.endedAt >= startMs)
      .reduce((sum, s) => sum + s.durationMs, 0);
    if (runningSession) {
      total += computeRunningElapsed(runningSession, Date.now());
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySessions, runningSession, tick]);

  const goalMs = goalMin * 60_000;
  const hit = goalMs > 0 && todayMs >= goalMs;
  const pct = goalMs > 0 ? Math.min(100, Math.round((todayMs / goalMs) * 100)) : 0;

  return (
    <div
      className={`flex flex-col items-end gap-0.5 px-3 py-1.5 border font-mono text-[10px] tracking-widest backdrop-blur-md ${
        hit ? 'bg-ink text-bg border-ink' : 'bg-ink/5 border-ink/10 text-ink'
      }`}
      title="Total study time today"
    >
      <span className="font-bold">TODAY · {formatDurationShort(todayMs)}</span>
      {goalMs > 0 && (
        <span className="opacity-60 text-[9px]">
          {hit ? `${KAOMOJI.GOAL}` : `${pct}% of ${goalMin}m`}
        </span>
      )}
    </div>
  );
}

export const FocusTab = memo(function FocusTab({
  studySessions,
  runningSession,
  dailyStudyGoalMin,
  customSubjects,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onIncrementDistraction,
  onUpdateRunning,
  onEditSession,
  onDeleteSession,
  expandedDays,
  setExpandedDays,
}: FocusTabProps) {
  const [draftSubject, setDraftSubject] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  // Derived stats
  const todayMs = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return studySessions
      .filter(s => s.endedAt >= start.getTime())
      .reduce((sum, s) => sum + s.durationMs, 0);
  }, [studySessions]);

  const streak = useMemo(() => {
    if (dailyStudyGoalMin <= 0) return 0;
    const goalMs = dailyStudyGoalMin * 60_000;
    const byDay: Record<string, number> = {};
    studySessions.forEach(s => {
      const d = new Date(s.endedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toDateString();
      byDay[key] = (byDay[key] || 0) + s.durationMs;
    });
    let count = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // include today only if hit; otherwise start counting from yesterday
    if ((byDay[cursor.toDateString()] || 0) < goalMs) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while ((byDay[cursor.toDateString()] || 0) >= goalMs) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [studySessions, dailyStudyGoalMin]);

  // Group completed sessions by day, newest first
  const sessionsByDay = useMemo(() => {
    const groups: Record<string, StudySession[]> = {};
    studySessions.forEach(s => {
      const day = new Date(s.endedAt).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    });
    Object.values(groups).forEach(list =>
      list.sort((a, b) => b.endedAt - a.endedAt)
    );
    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [studySessions]);

  // Subject totals lifetime
  const subjectTotals = useMemo(() => {
    const map: Record<string, number> = {};
    studySessions.forEach(s => {
      map[s.subject] = (map[s.subject] || 0) + s.durationMs;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [studySessions]);

  const isPaused = !!runningSession?.pausedAt;
  const goalMs = dailyStudyGoalMin * 60_000;
  const goalPct = goalMs > 0 ? Math.min(100, (todayMs / goalMs) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header — daily goal/today stats on left, branding-like meta on right */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col">
          {dailyStudyGoalMin > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-4xl tabular-nums">
                  {formatDurationShort(todayMs)}
                </span>
                <span className="font-mono text-sm opacity-60">
                  /{dailyStudyGoalMin}m
                </span>
              </div>
              <div className="text-[10px] font-mono tracking-widest opacity-40 mt-1">
                DAILY FOCUS
              </div>
              <div className="mt-2 w-32 h-[3px] bg-ink/10 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-ink transition-all"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-4xl tabular-nums">
                {formatDurationShort(todayMs)}
              </div>
              <div className="text-[10px] font-mono tracking-widest opacity-40 mt-1">
                TODAY
              </div>
            </>
          )}
        </div>
        <div className="text-right font-display flex flex-col items-end">
          <div className="text-xs font-mono opacity-40 mb-1">
            {new Date()
              .toLocaleString('en-US', { weekday: 'long' })
              .toUpperCase()}
          </div>
          {streak > 0 && (
            <div className="font-mono text-xs tracking-widest">
              <span className="opacity-40">STREAK · </span>
              <span className="font-bold">{streak}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="brutal-box space-y-4 p-6">
        {runningSession ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-mono font-bold tracking-widest opacity-60">
                {isPaused ? 'PAUSED' : 'IN SESSION'}
              </span>
              <span className="text-[10px] font-mono opacity-40 tracking-widest">
                {new Date(runningSession.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex justify-center py-2">
              <LiveTimer runningSession={runningSession} />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  SUBJECT
                </span>
                <input
                  value={runningSession.subject}
                  onChange={e =>
                    onUpdateRunning({ subject: e.target.value || 'untitled' })
                  }
                  className="flex-1 bg-transparent border-b border-ink outline-none font-display font-bold uppercase text-base"
                />
              </div>
              {customSubjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-[58px]">
                  {customSubjects.map(s => (
                    <button
                      key={s}
                      onClick={() => onUpdateRunning({ subject: s })}
                      className={`px-2 py-1 border border-ink text-[10px] font-mono transition-colors ${
                        runningSession.subject === s
                          ? 'bg-ink text-bg'
                          : 'bg-transparent text-ink'
                      }`}
                    >
                      [{s}]
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  NAME
                </span>
                <input
                  value={runningSession.name || ''}
                  onChange={e =>
                    onUpdateRunning({ name: e.target.value || undefined })
                  }
                  placeholder="(optional)"
                  className="flex-1 bg-transparent border-b border-ink/30 outline-none font-sans text-sm py-1"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  NOTE
                </span>
                <input
                  value={runningSession.note || ''}
                  onChange={e =>
                    onUpdateRunning({ note: e.target.value || undefined })
                  }
                  placeholder="(optional)"
                  className="flex-1 bg-transparent border-b border-ink/30 outline-none font-sans text-sm py-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={isPaused ? onResume : onPause}
                className="py-3 bg-ink text-bg font-display font-bold text-sm tracking-widest active:scale-95 transition-transform"
              >
                {isPaused ? 'RESUME' : 'PAUSE'}
              </button>
              <button
                onClick={onStop}
                className="py-3 border-2 border-ink text-ink font-display font-bold text-sm tracking-widest active:scale-95 transition-transform"
              >
                STOP
              </button>
              <button
                onClick={onDiscard}
                className="py-3 border border-ink/40 text-ink/60 font-mono font-bold text-[10px] tracking-widest active:scale-95 transition-transform"
              >
                DISCARD
              </button>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-ink/10">
              <span className="text-[10px] font-mono opacity-40 tracking-widest">
                DISTRACTIONS · {runningSession.distractions || 0}
              </span>
              <button
                onClick={onIncrementDistraction}
                className="text-[10px] font-mono opacity-60 hover:opacity-100 active:scale-95 transition-all"
              >
                [ (¬_¬) +1 ]
              </button>
            </div>
            <div className="text-[9px] font-mono opacity-30 tracking-widest text-center pt-1">
              SPACE: {isPaused ? 'RESUME' : 'PAUSE'} · ENTER: STOP
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] font-mono font-bold tracking-widest opacity-60">
              READY
            </div>
            <div className="flex justify-center py-4">
              <div className="font-display font-black tracking-tighter text-[5.5rem] sm:text-[7rem] leading-none tabular-nums opacity-20">
                00:00
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  SUBJECT
                </span>
                <input
                  value={draftSubject}
                  onChange={e => setDraftSubject(e.target.value)}
                  placeholder="..."
                  className="flex-1 bg-transparent border-b border-ink outline-none font-display font-bold uppercase text-base"
                />
              </div>
              {customSubjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-[58px]">
                  {customSubjects.map(s => (
                    <button
                      key={s}
                      onClick={() => setDraftSubject(s)}
                      className={`px-2 py-1 border border-ink text-[10px] font-mono transition-colors ${
                        draftSubject === s
                          ? 'bg-ink text-bg'
                          : 'bg-transparent text-ink'
                      }`}
                    >
                      [{s}]
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  NAME
                </span>
                <input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  placeholder="(optional)"
                  className="flex-1 bg-transparent border-b border-ink/30 outline-none font-sans text-sm py-1"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono opacity-40 tracking-widest">
                  NOTE
                </span>
                <input
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  placeholder="(optional)"
                  className="flex-1 bg-transparent border-b border-ink/30 outline-none font-sans text-sm py-1"
                />
              </div>
            </div>
            <button
              onClick={() => {
                onStart(draftSubject || 'untitled', draftName || undefined, draftNote || undefined);
                setDraftSubject('');
                setDraftName('');
                setDraftNote('');
              }}
              className="w-full bg-ink text-bg py-4 font-display font-bold text-base tracking-widest active:scale-[0.97] transition-transform"
            >
              START · {KAOMOJI.GO}
            </button>
            <div className="text-[9px] font-mono opacity-30 tracking-widest text-center pt-1">
              SPACE: START
            </div>
          </>
        )}
      </div>

      {/* Subject totals (lifetime) */}
      {subjectTotals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono tracking-widest opacity-40">
            SUBJECT TOTALS
          </div>
          <div className="grid grid-cols-2 gap-2">
            {subjectTotals.slice(0, 6).map(([subj, ms]) => (
              <div
                key={subj}
                className="border border-ink/20 px-3 py-2 flex justify-between items-baseline"
              >
                <span className="font-mono text-xs uppercase">{subj}</span>
                <span className="font-mono text-xs font-bold tabular-nums">
                  {formatDurationShort(ms)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past sessions grouped by day */}
      <div className="space-y-4">
        <div className="text-[10px] font-mono tracking-widest opacity-40">
          PAST SESSIONS
        </div>
        {sessionsByDay.length === 0 && (
          <div className="py-12 text-center opacity-50">
            <span className="text-2xl font-mono">{KAOMOJI.EMPTY}</span>
            <br />
            <span className="text-[10px] tracking-widest">NO SESSIONS YET</span>
          </div>
        )}
        {sessionsByDay.map(([day, sessions]) => {
          const dayTotal = sessions.reduce((sum, s) => sum + s.durationMs, 0);
          const isToday = day === new Date().toDateString();
          const isExpanded = expandedDays[`focus-${day}`];
          return (
            <div key={day} className="space-y-2">
              <div
                onClick={() =>
                  setExpandedDays(prev => ({
                    ...prev,
                    [`focus-${day}`]: !prev[`focus-${day}`],
                  }))
                }
                className="brutal-box flex justify-between items-baseline cursor-pointer group hand-ruled-border"
                style={{ borderLeft: '2px solid #2c7a3d' }}
              >
                <span className="font-display text-sm">
                  {isToday ? 'TODAY' : formatBrutalDate(new Date(day).getTime())}
                </span>
                <div className="flex-grow border-b border-dotted border-ink opacity-20 mx-4 group-hover:opacity-40 transition-opacity" />
                <span className="font-mono font-bold tabular-nums">
                  {formatDurationShort(dayTotal)}
                </span>
              </div>
              <div className={`overflow-hidden pl-4 space-y-2 transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {sessions.map(s => {
                  if (s.subject === 'NOTE') {
                    return (
                      <div
                        key={s.id}
                        className="flex items-baseline text-sm group pr-2 cursor-pointer active:opacity-50 py-1.5"
                        onClick={() => onEditSession(s.id)}
                        onContextMenu={ev => {
                          ev.preventDefault();
                          onDeleteSession(s.id);
                        }}
                      >
                        <span className="font-mono text-xs opacity-40 tabular-nums w-14 flex-shrink-0">
                          {new Date(s.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="font-sans italic opacity-70 flex-1 break-words">
                          {s.note}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className="flex justify-between items-baseline text-sm group pr-2 cursor-pointer active:opacity-50 py-2 border-b border-ink/5 last:border-0"
                      onClick={() => onEditSession(s.id)}
                      onContextMenu={ev => {
                        ev.preventDefault();
                        onDeleteSession(s.id);
                      }}
                    >
                      <div className="flex items-baseline gap-3 min-w-0 flex-1">
                        <span className="font-mono font-bold uppercase opacity-80 text-xs tracking-wider">
                          [{s.subject}]
                        </span>
                        <span className="font-sans truncate text-base">
                          {s.name || s.note || '...'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0 pl-2">
                        <span className="font-mono opacity-40 text-xs tabular-nums hidden sm:inline-block">
                          {new Date(s.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="font-mono font-black text-base tabular-nums">
                          {formatDurationShort(s.durationMs)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Archive: per-month totals */}
      {sessionsByDay.length > 0 && (
        <div className="pt-12 border-t border-ink border-dashed mt-12">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="w-full py-4 text-center text-xs font-mono tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
          >
            [ {showArchive ? 'HIDE ARCHIVE' : 'SHOW ARCHIVE'} ]
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showArchive ? 'max-h-[5000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            <FocusArchive sessions={studySessions} />
          </div>
        </div>
      )}
    </div>
  );
});

function FocusArchive({ sessions }: { sessions: StudySession[] }) {
  const archive = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    const past = sessions.filter(s => {
      const d = new Date(s.endedAt);
      return !(d.getMonth() === cm && d.getFullYear() === cy);
    });
    const groups: Record<
      string,
      { total: number; subjects: Record<string, number> }
    > = {};
    past.forEach(s => {
      const d = new Date(s.endedAt);
      const key = d
        .toLocaleString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase();
      if (!groups[key]) groups[key] = { total: 0, subjects: {} };
      groups[key].total += s.durationMs;
      groups[key].subjects[s.subject] =
        (groups[key].subjects[s.subject] || 0) + s.durationMs;
    });
    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [sessions]);

  if (archive.length === 0) {
    return (
      <div className="text-center py-6 font-mono text-xs opacity-40">
        nothing archived yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {archive.map(([month, data]) => (
        <div
          key={month}
          className="p-4 border-2 border-ink border-dashed font-mono text-xs bg-bg"
        >
          <div className="text-center font-bold mb-4 tracking-widest border-b border-ink border-dotted pb-2">
            === {month} ===
          </div>
          <div className="space-y-2 mb-4">
            {(Object.entries(data.subjects) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([subj, ms]) => (
                <div key={subj} className="flex justify-between">
                  <span>{subj.padEnd(15, '.')}</span>
                  <span>{formatDurationShort(ms)}</span>
                </div>
              ))}
          </div>
          <div className="flex justify-between font-bold border-t border-ink border-dotted pt-2">
            <span>TOTAL</span>
            <span>{formatDurationShort(data.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
