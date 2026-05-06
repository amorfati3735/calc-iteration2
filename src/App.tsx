import { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';

import { useAuth } from './hooks/useAuth';
import { useFinanceData } from './hooks/useFinanceData';
import { useStudyData } from './hooks/useStudyData';
import { LoginScreen } from './components/LoginScreen';
import { FocusTab, TodayPill } from './components/FocusTab';

const SpentTab = lazy(() => import('./components/SpentTab').then(m => ({ default: m.SpentTab })));
const ChronicleTab = lazy(() => import('./components/ChronicleTab').then(m => ({ default: m.ChronicleTab })));
const AnalyticsTab = lazy(() => import('./components/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const SidebarConfig = lazy(() => import('./components/SidebarConfig').then(m => ({ default: m.SidebarConfig })));
import { DebtTransaction, SpendEntry, Friend, SortType, Direction, AppState, StudySession, RunningSession } from './types';

const KAOMOJI = {
  LOAD: '(=^･ω･^=)',
  OWES_LOT: '(╬ಠ益ಠ)',
  YOU_OWE_LOT: '(´；ω；`)',
  NET_ZERO: '(￣▽￣)ノ',
  CONFIRM_1: '( •_•)>⌐■-■',
  CONFIRM_2: '(⌐■_■)',
  SETTLE: '(ᵔᴥᵔ)',
  EMPTY: '(´• ω •`)ノ',
  ERROR: '(¬_¬)',
  DELETE: '(╯°□°）╯︵ ┻━┻',
};

export default function App() {
  const { user, loading: authLoading, login, error: authError } = useAuth();
  const {
    dataLoaded,
    spendEntries,
    debtTransactions,
    friends,
    sortType,
    needsImport,
    importLocalData,
    addSpend,
    updateSpend,
    deleteSpend,
    addDebt,
    updateDebt,
    deleteDebt,
    settleDebt,
    updateSortType,
    monthlyBudget,
    customTags,
    updatePreferences,
  } = useFinanceData(user?.uid ?? null);

  const {
    studySessions,
    runningSession,
    dailyStudyGoalMin,
    customSubjects,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    discardSession,
    updateRunning,
    incrementDistraction,
    updateSession,
    deleteSession,
    updateStudyPreferences,
  } = useStudyData(user?.uid ?? null);

  const [activeTab, setActiveTab] = useState<'FINANCE' | 'CHRONICLE' | 'FOCUS'>('FINANCE');

  useEffect(() => {
    if (window.innerWidth > 768) {
      setActiveTab('FOCUS');
    }
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewState, setViewState] = useState<{ type: 'LIST' | 'DETAIL'; id?: string }>({ type: 'LIST' });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [editingSpendId, setEditingSpendId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
  const [fleetingKaomoji, setFleetingKaomoji] = useState<string | null>(null);
  type UndoAction = { type: 'FINANCE' | 'STUDY'; state: AppState };
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('calc_theme') as 'light' | 'dark') || 'light';
  });
  const [gridStyle, setGridStyle] = useState<'lines' | 'dots'>(() => {
    return (localStorage.getItem('calc_grid') as 'lines' | 'dots') || 'lines';
  });
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    [new Date().toDateString()]: true,
  });

  const lastSubject = useMemo(() => {
    if (!studySessions || studySessions.length === 0) return '';
    const sorted = [...studySessions].sort((a, b) => b.endedAt - a.endedAt);
    return sorted[0].subject;
  }, [studySessions]);

  // Show load kaomoji when data first loads
  const hasShownLoad = useRef(false);
  useEffect(() => {
    if (dataLoaded && !hasShownLoad.current) {
      hasShownLoad.current = true;
      setFleetingKaomoji(KAOMOJI.LOAD);
      setTimeout(() => setFleetingKaomoji(null), 1000);
    }
  }, [dataLoaded]);

  // History API for back button support
  useEffect(() => {
    const handlePopState = () => {
      setIsSheetOpen(false);
      setIsSidebarOpen(false);
      setViewState({ type: 'LIST' });
      setEditingSpendId(null);
      setEditingDebtId(null);
      setEditingStudyId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = (action: () => void) => {
    window.history.pushState({ opened: true }, '');
    action();
  };

  const handleCloseModal = () => {
    if (window.history.state?.opened) {
      window.history.back();
    } else {
      setIsSheetOpen(false);
      setIsSidebarOpen(false);
      setIsQuickNoteOpen(false);
      setViewState({ type: 'LIST' });
      setEditingSpendId(null);
      setEditingDebtId(null);
      setEditingStudyId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportData = () => {
    const data = {
      spendEntries,
      debtTransactions,
      friends,
      studySessions,
      runningSession,
      preferences: { monthlyBudget, customTags, dailyStudyGoalMin, customSubjects }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calc_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('calc_theme', theme);
  }, [theme]);

  // Calculations
  const monthTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return spendEntries
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => e.type === 'SPENT' ? sum + e.amount : sum - e.amount, 0);
  }, [spendEntries]);

  const spendByDay = useMemo(() => {
    const groups: Record<string, SpendEntry[]> = {};
    spendEntries.forEach(e => {
      const day = new Date(e.date).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [spendEntries]);

  const getFriendBalance = (name: string) => {
    return debtTransactions
      .filter(t => t.friendName === name && !t.settled)
      .reduce((sum, t) => t.direction === 'LENT' ? sum + t.amountValue : sum - t.amountValue, 0);
  };

  const sortedFriends = useMemo(() => {
    const list = [...friends];
    if (sortType === 'NAME') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortType === 'AMOUNT') list.sort((a, b) => Math.abs(getFriendBalance(b.name)) - Math.abs(getFriendBalance(a.name)));
    else if (sortType === 'RECENT') list.sort((a, b) => b.lastActive - a.lastActive);
    return list;
  }, [friends, debtTransactions, sortType]);

  const pushToFinanceUndo = () => {
    const currentState: AppState = {
      debtTransactions, spendEntries, friends, sortType, studySessions, runningSession,
      preferences: { monthlyBudget, customTags, dailyStudyGoalMin, customSubjects },
    };
    setUndoStack(prev => [{ type: 'FINANCE', state: currentState }, ...prev].slice(0, 50));
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 4000);
  };

  const pushToStudyUndo = () => {
    const currentState: AppState = {
      debtTransactions, spendEntries, friends, sortType, studySessions, runningSession,
      preferences: { monthlyBudget, customTags, dailyStudyGoalMin, customSubjects },
    };
    setUndoStack(prev => [{ type: 'STUDY', state: currentState }, ...prev].slice(0, 50));
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 4000);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || !user) return;
    const [action, ...rest] = undoStack;
    const lastState = action.state;
    const { ref, update } = await import('firebase/database');
    const { db } = await import('./lib/firebase');
    const userRef = ref(db, `users/${user.uid}`);

    if (action.type === 'FINANCE') {
      const firebaseData: Record<string, any> = {};
      const entries: Record<string, SpendEntry> = {};
      lastState.spendEntries.forEach(e => { entries[e.id] = e; });
      firebaseData.spendEntries = entries;

      const txs: Record<string, DebtTransaction> = {};
      lastState.debtTransactions.forEach(t => { txs[t.id] = t; });
      firebaseData.debtTransactions = txs;

      const fr: Record<string, Friend> = {};
      lastState.friends.forEach(f => { fr[f.name.replace(/[.#$/\[\]]/g, '_')] = f; });
      firebaseData.friends = fr;

      await update(userRef, firebaseData);
      await update(ref(db, `users/${user.uid}/preferences`), {
        sortType: lastState.sortType,
        monthlyBudget: lastState.preferences?.monthlyBudget ?? monthlyBudget,
        customTags: lastState.preferences?.customTags ?? customTags,
      });
    } else {
      const firebaseData: Record<string, any> = {};
      const ss: Record<string, StudySession> = {};
      if (lastState.studySessions && lastState.studySessions.length > 0) {
        lastState.studySessions.forEach(s => { ss[s.id] = s; });
      }
      firebaseData.studySessions = ss;
      
      firebaseData.runningSession = lastState.runningSession || null;

      await update(userRef, firebaseData);
      await update(ref(db, `users/${user.uid}/preferences`), {
        dailyStudyGoalMin: lastState.preferences?.dailyStudyGoalMin ?? dailyStudyGoalMin,
        customSubjects: lastState.preferences?.customSubjects ?? customSubjects,
      });
    }

    setUndoStack(rest);
    setShowUndoToast(false);
    triggerFleeting('( ˘▽˘)っ Undo');
  };

  const triggerFleeting = (kaomoji: string, duration = 800) => {
    setFleetingKaomoji(kaomoji);
    setTimeout(() => setFleetingKaomoji(null), duration);
  };

  const handleAddSpend = async (entry: Omit<SpendEntry, 'id'>, friendName?: string) => {
    pushToFinanceUndo();
    if (editingSpendId) {
      await updateSpend(editingSpendId, entry);
    } else {
      const spendId = await addSpend(entry);
      if (friendName && friendName.trim() && spendId) {
        const debtId = await addDebt({
          friendName: friendName.trim(),
          direction: 'LENT',
          amountRaw: entry.amount.toString(),
          amountValue: entry.amount,
          note: entry.note || (entry.tag ? `Spent on ${entry.tag}` : 'Added from Spent'),
          linkedSpendId: spendId
        });
        await updateSpend(spendId, { ...entry, linkedDebtId: debtId });
      }
    }

    handleCloseModal();
    triggerFleeting(KAOMOJI.CONFIRM_1, 400);
    setTimeout(() => setFleetingKaomoji(KAOMOJI.CONFIRM_2), 400);
    setTimeout(() => setFleetingKaomoji(null), 800);
  };

  const handleAddDebt = async (t: Omit<DebtTransaction, 'id' | 'date' | 'settled'>) => {
    pushToFinanceUndo();
    if (editingDebtId) {
      await updateDebt(editingDebtId, t);
    } else {
      await addDebt(t);
    }
    handleCloseModal();
    triggerFleeting(KAOMOJI.CONFIRM_1, 400);
    setTimeout(() => setFleetingKaomoji(KAOMOJI.CONFIRM_2), 400);
    setTimeout(() => setFleetingKaomoji(null), 800);
  };

  const handleSettle = async (id: string) => {
    pushToFinanceUndo();
    await settleDebt(id);
    triggerFleeting(KAOMOJI.SETTLE, 1000);
  };

  const handleDeleteEntry = async (id: string, type: 'SPEND' | 'DEBT') => {
    if (confirm(`DELETE? ${KAOMOJI.DELETE}`)) {
      pushToFinanceUndo();
      if (type === 'SPEND') {
        const entry = spendEntries.find(e => e.id === id);
        await deleteSpend(id);
        if (entry?.linkedDebtId) await deleteDebt(entry.linkedDebtId);
      } else {
        const entry = debtTransactions.find(e => e.id === id);
        await deleteDebt(id);
        if (entry?.linkedSpendId) await deleteSpend(entry.linkedSpendId);
      }
    }
  };

  const handleSortCycle = () => {
    const flow: SortType[] = ['NAME', 'AMOUNT', 'RECENT'];
    const next = flow[(flow.indexOf(sortType) + 1) % flow.length];
    updateSortType(next);
  };

  // ==== Study handlers ====
  const handleStartSession = async (subject: string, name?: string, note?: string) => {
    await startSession(subject, name, note);
    triggerFleeting('ᕙ(`▿´)ᕗ', 600);
  };

  const handlePauseSession = async () => {
    await pauseSession();
    triggerFleeting('( ´_ゝ`)', 400);
  };

  const handleResumeSession = async () => {
    await resumeSession();
    triggerFleeting('ᕙ(`▿´)ᕗ', 400);
  };

  const handleStopSession = async () => {
    pushToStudyUndo();
    await stopSession();
    triggerFleeting(KAOMOJI.SETTLE, 800);
  };

  const handleDiscardSession = async () => {
    if (!runningSession) return;
    if (confirm(`DISCARD SESSION? ${KAOMOJI.DELETE}`)) {
      pushToStudyUndo();
      await discardSession();
      triggerFleeting(KAOMOJI.DELETE, 600);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm(`DELETE SESSION? ${KAOMOJI.DELETE}`)) {
      pushToStudyUndo();
      await deleteSession(id);
    }
  };

  const handleEditSession = (id: string) => {
    openModal(() => {
      setEditingStudyId(id);
      setIsSheetOpen(true);
    });
  };

  const handleUpdateSession = async (id: string, patch: Partial<StudySession>) => {
    pushToStudyUndo();
    await updateSession(id, patch);
    handleCloseModal();
    triggerFleeting(KAOMOJI.CONFIRM_2, 500);
  };

  // ==== Hotkeys (Space=start/pause, Enter=stop) — only on FOCUS tab and when no input focused ====
  useEffect(() => {
    const isTextInput = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      if (isSheetOpen || isSidebarOpen || isQuickNoteOpen) return;
      if (isTextInput(e.target)) return;
      
      if (e.code === 'KeyB') {
        e.preventDefault();
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
        return;
      }

      if (activeTab === 'FOCUS' && e.code === 'KeyN') {
        e.preventDefault();
        setIsQuickNoteOpen(true);
        return;
      }
      
      if (activeTab === 'FINANCE' && e.code === 'KeyN') {
        e.preventDefault();
        setIsSheetOpen(true);
        return;
      }
      
      if (activeTab === 'FINANCE' && e.code === 'Space') {
        e.preventDefault();
        setActiveTab('FOCUS');
        return;
      }

      if (activeTab !== 'FOCUS') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!runningSession) {
          handleStartSession(lastSubject || 'untitled');
        } else if (runningSession.pausedAt) {
          handleResumeSession();
        } else {
          handlePauseSession();
        }
      } else if (e.code === 'Enter') {
        if (runningSession) {
          e.preventDefault();
          handleStopSession();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, runningSession, isSheetOpen, isSidebarOpen, lastSubject]);

  const TabButton = ({ label, active }: { label: 'FINANCE' | 'CHRONICLE' | 'FOCUS'; active: boolean }) => (
    <button
      onClick={() => setActiveTab(label)}
      className={`flex-1 py-5 text-[10px] tracking-widest font-display font-semibold transition-all ${active ? 'underline underline-offset-8 scale-110' : 'opacity-40 hover:opacity-100'}`}
    >
      {label}
    </button>
  );

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm opacity-40">
        <div className="grid-overlay" />
        loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginScreen onLogin={login} error={authError} />;
  }

  // Data loading
  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono">
        <div className="grid-overlay" />
        <div className="text-2xl">{KAOMOJI.LOAD}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 pt-24 pb-40 max-w-lg mx-auto relative cursor-default select-none font-sans overflow-x-hidden ${theme}`}>
      <div className={gridStyle === 'dots' ? 'dot-grid' : 'grid-overlay'} />
      <div className="washi-grain" />

      {/* Import prompt */}
      {needsImport && (
        <div className="pop-in fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-ink text-bg px-4 py-3 flex items-center gap-3 max-w-sm">
          <span className="text-xs font-mono">Found local data. Import?</span>
          <button onClick={importLocalData} className="bg-bg text-ink px-3 py-1 text-[10px] font-mono font-bold">YES</button>
          <button onClick={() => {}} className="text-[10px] font-mono opacity-60">NO</button>
        </div>
      )}

      {/* Quick Note Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isQuickNoteOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div onClick={() => setIsQuickNoteOpen(false)} className="absolute inset-0 bg-ink/10 backdrop-blur-[2px]" />
        <div className="relative w-[90%] max-w-sm bg-bg border border-ink p-6 shadow-[8px_8px_0px_rgba(43,0,212,0.1)] brutal-box transition-transform duration-200" style={{ transform: isQuickNoteOpen ? 'scale(1)' : 'scale(0.95)' }}>
          <div className="text-[10px] opacity-50 font-mono tracking-widest mb-4">QUICK NOTE</div>
          <input
            autoFocus
            value={quickNoteText}
            onChange={e => setQuickNoteText(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Escape') {
                setIsQuickNoteOpen(false);
                setQuickNoteText('');
              } else if (e.key === 'Enter' && quickNoteText.trim()) {
                pushToStudyUndo();
                const id = crypto.randomUUID();
                const now = Date.now();
                const newSession = {
                  id,
                  subject: 'NOTE',
                  note: quickNoteText.trim(),
                  startedAt: now,
                  endedAt: now,
                  durationMs: 0,
                  pausedMs: 0,
                  distractions: 0
                };
                const { ref, set } = await import('firebase/database');
                const { db } = await import('./lib/firebase');
                await set(ref(db, `users/${user!.uid}/studySessions/${id}`), newSession);
                setIsQuickNoteOpen(false);
                setQuickNoteText('');
                triggerFleeting('✏️', 500);
              }
            }}
            className="w-full bg-transparent border-b border-ink outline-none font-display text-lg pb-1"
            placeholder="..."
          />
        </div>
      </div>

      {/* Branding & Theme Toggle */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 w-full max-w-[300px] justify-center">
        <button
          onClick={() => openModal(() => setIsSidebarOpen(true))}
          className="backdrop-blur-md bg-ink/5 border border-ink/10 px-3 py-1.5 text-[10px] tracking-widest font-mono text-ink active:scale-95 transition-transform whitespace-nowrap flex-shrink-0"
        >
          [ CFG ]
        </button>
        <button
          onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
          className="backdrop-blur-md bg-ink/5 border border-ink/10 px-4 py-1.5 text-[10px] tracking-widest font-mono text-ink active:scale-95 transition-transform whitespace-nowrap flex-shrink-0 font-bold"
        >
          CALC
        </button>
      </div>

      {/* Top-right Today pill (FOCUS tab only) */}
      {activeTab === 'FOCUS' && (
        <div className="fixed top-4 right-4 z-30">
          <TodayPill
            studySessions={studySessions}
            runningSession={runningSession}
            goalMin={dailyStudyGoalMin}
          />
        </div>
      )}

      <Suspense fallback={<div className="font-mono text-xs opacity-40 py-12 text-center">loading...</div>}>
        {activeTab === 'FINANCE' && (
          <SpentTab
            monthTotal={monthTotal}
            spendByDay={spendByDay}
            expandedDays={expandedDays}
            setExpandedDays={setExpandedDays}
            onEdit={(id) => openModal(() => { setEditingSpendId(id); setIsSheetOpen(true); })}
            onDelete={(id) => handleDeleteEntry(id, 'SPEND')}
            monthlyBudget={monthlyBudget}
          />
        )}

        {activeTab === 'CHRONICLE' && (
          <ChronicleTab
            sortedFriends={sortedFriends}
            debtTransactions={debtTransactions}
            sortType={sortType}
            getFriendBalance={getFriendBalance}
            onSortCycle={handleSortCycle}
            viewState={viewState}
            onViewDetail={(name) => openModal(() => setViewState({ type: 'DETAIL', id: name }))}
            onBack={() => setViewState({ type: 'LIST' })}
            onSettle={handleSettle}
            onDelete={(id) => handleDeleteEntry(id, 'DEBT')}
            onEdit={(id) => openModal(() => { setEditingDebtId(id); setIsSheetOpen(true); })}
            spendEntries={spendEntries}
            customTags={customTags}
          />
        )}

        {activeTab === 'FOCUS' && (
          <FocusTab
            studySessions={studySessions}
            runningSession={runningSession}
            dailyStudyGoalMin={dailyStudyGoalMin}
            customSubjects={customSubjects}
            lastSubject={lastSubject}
            onStart={handleStartSession}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onStop={handleStopSession}
            onDiscard={handleDiscardSession}
            onIncrementDistraction={incrementDistraction}
            onUpdateRunning={updateRunning}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
            expandedDays={expandedDays}
            setExpandedDays={setExpandedDays}
          />
        )}
      </Suspense>

      {/* FAB */}
      <button
        onClick={() => openModal(() => setIsSheetOpen(true))}
        aria-label="New entry"
        className="fixed bottom-24 right-8 w-14 h-14 bg-ink text-bg flex items-center justify-center text-3xl z-40 hover:scale-105 active:scale-95 transition-all shadow-[4px_4px_0_var(--ink)] hover:shadow-[6px_6px_0_var(--ink)]"
      >
        +
      </button>

      {/* Visual Back Button */}
      {(isSheetOpen || isSidebarOpen || viewState.type === 'DETAIL') && (
        <button
          onClick={handleCloseModal}
          className="fixed bottom-24 right-[5.5rem] w-14 h-14 bg-bg text-ink border-2 border-ink flex items-center justify-center text-xl z-[60] hover:scale-105 active:scale-95 transition-transform font-mono font-bold"
        >
          {'<'}
        </button>
      )}

      {/* Tabs */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[460px] border border-ink/30 bg-bg/80 backdrop-blur-md rounded-xl flex z-40 overflow-hidden shadow-[0_8px_30px_rgba(43,0,212,0.1)]">
        <TabButton label="FINANCE" active={activeTab === 'FINANCE'} />
        <TabButton label="FOCUS" active={activeTab === 'FOCUS'} />
        <TabButton label="CHRONICLE" active={activeTab === 'CHRONICLE'} />
      </div>

      {/* Sheet */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={handleCloseModal} className="absolute inset-0 bg-ink/10 backdrop-blur-[2px]" />
      </div>
      <div
        className={`sheet-shell fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-ink max-w-lg mx-auto transition-transform duration-300 ease-out flex flex-col ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="ascii-torn bg-ink text-bg py-1 text-center shrink-0" aria-hidden="true">^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/</div>
        <div className="overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {activeTab === 'FINANCE' ? (
            <SpendEntryForm
              initialData={editingSpendId ? spendEntries.find(e => e.id === editingSpendId) : undefined}
              friends={friends}
              customTags={customTags}
              onSubmit={handleAddSpend}
              onClose={handleCloseModal}
              isOpen={isSheetOpen}
            />
        ) : activeTab === 'FOCUS' ? (
          <StudySessionForm
            initialData={editingStudyId ? studySessions.find(s => s.id === editingStudyId) : undefined}
            customSubjects={customSubjects}
            lastSubject={lastSubject}
            onSubmit={async (data) => {
              if (editingStudyId) {
                await handleUpdateSession(editingStudyId, data);
              } else {
                pushToStudyUndo();
                const id = crypto.randomUUID();
                const { ref, set } = await import('firebase/database');
                const { db } = await import('./lib/firebase');
                const newSession: StudySession = { id, ...data } as StudySession;
                const clean: any = { ...newSession };
                Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
                await set(ref(db, `users/${user.uid}/studySessions/${id}`), clean);
                handleCloseModal();
                triggerFleeting(KAOMOJI.CONFIRM_2, 500);
              }
            }}
            onClose={handleCloseModal}
            isOpen={isSheetOpen}
          />
        ) : (
          <DebtEntryForm
            initialData={editingDebtId ? debtTransactions.find(t => t.id === editingDebtId) : undefined}
            friends={friends}
            onSubmit={handleAddDebt}
            onClose={handleCloseModal}
            isOpen={isSheetOpen}
          />
        )}
        </div>
      </div>

      {/* Undo toast */}
      <div
        className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-ink text-bg border-2 border-bg shadow-[8px_8px_0px_0px_var(--ink)] flex items-center gap-4 transition-all duration-300 ${showUndoToast && undoStack.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'}`}
      >
        <span className="text-xs font-mono font-bold tracking-widest uppercase">Action Saved</span>
        <button onClick={handleUndo} className="bg-bg text-ink px-3 py-1 text-[10px] font-mono font-bold hover:invert transition-colors">UNDO</button>
      </div>

      {/* Fleeting kaomoji */}
      <div className={`fixed inset-0 pointer-events-none flex items-center justify-center z-[60] transition-all duration-300 ${fleetingKaomoji ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-bg border border-ink p-4 text-2xl">{fleetingKaomoji || KAOMOJI.LOAD}</div>
      </div>

      <Suspense fallback={null}>
        {isSidebarOpen && (
          <SidebarConfig
            isOpen={isSidebarOpen}
            onClose={handleCloseModal}
            monthlyBudget={monthlyBudget}
            customTags={customTags}
            updatePreferences={updatePreferences}
            gridStyle={gridStyle}
            setGridStyle={(v: 'lines' | 'dots') => { setGridStyle(v); localStorage.setItem('calc_grid', v); }}
            dailyStudyGoalMin={dailyStudyGoalMin}
            customSubjects={customSubjects}
            updateStudyPreferences={updateStudyPreferences}
            onExport={handleExportData}
          />
        )}
      </Suspense>
    </div>
  );
}

function SpendEntryForm({ initialData, friends, customTags, onSubmit, onClose, isOpen }: { initialData?: SpendEntry; friends: Friend[]; customTags: string[]; onSubmit: (t: Omit<SpendEntry, 'id'>, friendName?: string) => void; onClose: () => void; isOpen?: boolean }) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  const [friendName, setFriendName] = useState('');
  const [date, setDate] = useState(new Date(initialData?.date || Date.now()).toISOString().split('T')[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount?.toString() || '');
        setNote(initialData.note || '');
        setTag(initialData.tag || '');
        setFriendName('');
        setDate(new Date(initialData.date || Date.now()).toISOString().split('T')[0]);
      } else {
        setAmount('');
        setNote('');
        setTag('');
        setFriendName('');
        setDate(new Date().toISOString().split('T')[0]);
      }
      // Small delay allows the sheet transition to start before grabbing focus, 
      // which makes the keyboard slide up smoother on Android.
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  const handle = (type: 'SPENT' | 'EARNED') => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    onSubmit({ amount: val, note: note || '...', tag: tag || undefined, date: new Date(date).getTime(), type }, friendName);
  };

  return (
    <div className="sheet-padding p-5 sm:p-6 pb-6 sm:pb-10 space-y-5 sm:space-y-7 font-sans sheet-stack">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] opacity-40 uppercase">{initialData ? 'Edit entry' : 'New transaction'}</h3>
        <button onClick={onClose} className="text-[10px] font-mono font-bold underline opacity-60 active:opacity-100">CANCEL</button>
      </div>
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">AMOUNT</div>
          <div className="flex items-baseline border-b-4 border-ink pb-1">
            <input ref={inputRef} type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="sheet-amount-input flex-1 min-w-0 bg-transparent outline-none text-[clamp(3rem,14vw,4.5rem)] font-display font-black tracking-tighter leading-none" placeholder="0" />
            <span className="text-2xl sm:text-3xl font-mono font-black opacity-10 ml-2 shrink-0">U</span>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DESCRIPTION</div>
            <input value={note} onChange={e => setNote(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2.5 text-base sm:text-lg font-sans" placeholder="..." />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">TAG</div>
              <input value={tag} onChange={e => setTag(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2.5 text-sm font-mono font-bold mb-2" placeholder="[NONE]" />
              <div className="flex flex-wrap gap-1.5">
                {customTags.map(t => (
                  <button key={t} onClick={() => setTag(t)} className={`px-2 py-1 border border-ink text-[11px] font-mono transition-colors ${tag === t ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>[{t}]</button>
                ))}
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DATE</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2.5 text-sm font-mono font-bold" />
            </div>
          </div>
          {!initialData && (
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">FRIEND (OPTIONAL)</div>
              <input value={friendName} onChange={e => setFriendName(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2 text-sm font-mono font-bold mb-2" placeholder="..." />
              {friends.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {friends.slice(0, 3).map(f => (
                    <button key={f.name} onClick={() => setFriendName(f.name)} className={`px-2 py-1 border border-ink text-[11px] font-mono transition-colors whitespace-nowrap ${friendName === f.name ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>[{f.name}]</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 pt-3">
        <button onClick={() => handle('SPENT')} className="w-full bg-ink text-bg py-4 sm:py-5 font-display text-lg sm:text-xl font-bold border-2 border-ink tracking-[0.05em] active:scale-[0.97] transition-transform">
          LOG AS SPENT
        </button>
        <button onClick={() => handle('EARNED')} className="w-full bg-transparent text-ink py-3 sm:py-4 font-display text-sm sm:text-base font-bold border-2 border-ink tracking-widest active:scale-[0.97] transition-transform opacity-60">
          LOG AS EARNED
        </button>
      </div>
    </div>
  );
}

function DebtEntryForm({ initialData, friends, onSubmit, onClose, isOpen }: { initialData?: DebtTransaction; friends: Friend[]; onSubmit: (t: Omit<DebtTransaction, 'id' | 'date' | 'settled'>) => void; onClose: () => void; isOpen?: boolean }) {
  const [name, setName] = useState(initialData?.friendName || friends[0]?.name || '');
  const [direction, setDirection] = useState<Direction>(initialData?.direction || 'LENT');
  const [amountRaw, setAmountRaw] = useState(initialData?.amountRaw || '');
  const [note, setNote] = useState(initialData?.note || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.friendName);
        setDirection(initialData.direction);
        setAmountRaw(initialData.amountRaw);
        setNote(initialData.note);
      } else {
        setName(friends[0]?.name || '');
        setDirection('LENT');
        setAmountRaw('');
        setNote('');
      }
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData, friends]);

  const handle = () => {
    if (!name.trim()) return;
    const val = parseFloat(amountRaw.match(/(\d+(\.\d+)?)/)?.[0] || '0');
    onSubmit({ friendName: name, direction, amountRaw, amountValue: val, note: note || '...' });
  };

  return (
    <div className="sheet-padding p-5 sm:p-6 pb-6 sm:pb-10 space-y-5 sm:space-y-7 font-sans sheet-stack">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] opacity-40 uppercase">{initialData ? 'Edit Chronicle' : 'New Chronicle'}</h3>
        <button onClick={onClose} className="text-[10px] font-mono font-bold underline opacity-60 active:opacity-100">CANCEL</button>
      </div>
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">FRIEND</div>
          <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-ink bg-transparent outline-none py-2 text-2xl sm:text-3xl font-display font-bold uppercase" list="friends-list" placeholder="NAME" />
          <datalist id="friends-list">{friends.map(f => <option key={f.name} value={f.name} />)}</datalist>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DIRECTION</div>
            <div className="flex border-2 border-ink overflow-hidden font-display font-bold text-xs">
              <button onClick={() => setDirection('LENT')} className={`flex-1 py-3 transition-colors ${direction === 'LENT' ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>I LENT</button>
              <button onClick={() => setDirection('PAID')} className={`flex-1 py-3 transition-colors ${direction === 'PAID' ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>I PAID</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">AMOUNT</div>
              <input value={amountRaw} onChange={e => setAmountRaw(e.target.value)} inputMode="decimal" className="w-full border-b border-ink bg-transparent outline-none py-2 font-mono font-bold text-2xl sm:text-3xl" placeholder="0 INR" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">NOTE</div>
              <input value={note} onChange={e => setNote(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2 text-base" placeholder="Optional context" />
            </div>
          </div>
        </div>
      </div>
      <button onClick={handle} className="w-full bg-ink text-bg py-4 sm:py-5 font-display text-lg sm:text-xl font-bold border-2 border-ink tracking-widest uppercase active:scale-[0.98] transition-transform">
        CONFIRM ENTRY
      </button>
    </div>
  );
}

function StudySessionForm({
  initialData,
  customSubjects,
  lastSubject,
  onSubmit,
  onClose,
  isOpen
}: {
  initialData?: StudySession;
  customSubjects: string[];
  lastSubject?: string;
  onSubmit: (data: Omit<StudySession, 'id'>) => void;
  onClose: () => void;
  isOpen?: boolean;
}) {
  const [subject, setSubject] = useState(initialData?.subject || lastSubject || '');
  const [name, setName] = useState(initialData?.name || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [durationMin, setDurationMin] = useState(
    initialData ? Math.round(initialData.durationMs / 60000).toString() : ''
  );
  const initialDateObj = new Date(initialData?.startedAt || Date.now());
  const [date, setDate] = useState(initialDateObj.toISOString().split('T')[0]);
  const [time, setTime] = useState(
    `${initialDateObj.getHours().toString().padStart(2, '0')}:${initialDateObj
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSubject(initialData.subject);
        setName(initialData.name || '');
        setNote(initialData.note || '');
        setDurationMin(Math.round(initialData.durationMs / 60000).toString());
        const d = new Date(initialData.startedAt);
        setDate(d.toISOString().split('T')[0]);
        setTime(
          `${d.getHours().toString().padStart(2, '0')}:${d
            .getMinutes()
            .toString()
            .padStart(2, '0')}`
        );
      } else {
        setSubject(lastSubject || '');
        setName('');
        setNote('');
        setDurationMin('');
        const d = new Date();
        setDate(d.toISOString().split('T')[0]);
        setTime(
          `${d.getHours().toString().padStart(2, '0')}:${d
            .getMinutes()
            .toString()
            .padStart(2, '0')}`
        );
      }
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData, lastSubject]);

  const handle = () => {
    const mins = parseFloat(durationMin);
    if (isNaN(mins) || mins <= 0) return;
    if (!subject.trim()) return;
    const [h, m] = time.split(':').map(Number);
    const startDt = new Date(date);
    startDt.setHours(h || 0, m || 0, 0, 0);
    const startedAt = startDt.getTime();
    const durationMs = Math.round(mins * 60000);
    const endedAt = startedAt + durationMs;
    onSubmit({
      subject: subject.trim(),
      name: name.trim() || undefined,
      note: note.trim() || undefined,
      startedAt,
      endedAt,
      durationMs,
      pausedMs: initialData?.pausedMs ?? 0,
      distractions: initialData?.distractions ?? 0,
    });
  };

  return (
    <div className="sheet-padding p-5 sm:p-6 pb-6 sm:pb-10 space-y-5 sm:space-y-7 font-sans sheet-stack">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] opacity-40 uppercase">
          {initialData ? 'Edit session' : 'Manual session'}
        </h3>
        <button
          onClick={onClose}
          className="text-[10px] font-mono font-bold underline opacity-60 active:opacity-100"
        >
          CANCEL
        </button>
      </div>
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DURATION (MIN)</div>
          <div className="flex items-baseline border-b-4 border-ink pb-1">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={durationMin}
              onChange={e => setDurationMin(e.target.value)}
              className="sheet-amount-input flex-1 min-w-0 bg-transparent outline-none text-[clamp(3rem,14vw,4.5rem)] font-display font-black tracking-tighter leading-none"
              placeholder="0"
            />
            <span className="text-2xl sm:text-3xl font-mono font-black opacity-10 ml-2 shrink-0">m</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">SUBJECT</div>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border-b border-ink bg-transparent outline-none py-2 text-lg font-display font-bold uppercase"
            placeholder="..."
          />
          {customSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {customSubjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-2 py-1 border border-ink text-xs font-mono transition-colors ${
                    subject === s ? 'bg-ink text-bg' : 'bg-transparent text-ink'
                  }`}
                >
                  [{s}]
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">NAME</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border-b border-ink bg-transparent outline-none py-3 text-lg font-sans"
            placeholder="(optional)"
          />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">NOTE</div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border-b border-ink bg-transparent outline-none py-3 text-base"
            placeholder="(optional)"
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DATE</div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border-b border-ink bg-transparent outline-none py-3 text-sm font-mono font-bold"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">START TIME</div>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border-b border-ink bg-transparent outline-none py-3 text-sm font-mono font-bold"
            />
          </div>
        </div>
      </div>
      <button
        onClick={handle}
        className="w-full bg-ink text-bg py-4 sm:py-5 font-display text-lg sm:text-xl font-bold border-2 border-ink tracking-widest uppercase active:scale-[0.98] transition-transform"
      >
        {initialData ? 'SAVE CHANGES' : 'LOG SESSION'}
      </button>
    </div>
  );
}
