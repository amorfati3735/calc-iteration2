import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useFinanceData } from './hooks/useFinanceData';
import { useStudyData } from './hooks/useStudyData';
import { LoginScreen } from './components/LoginScreen';
import { SpentTab } from './components/SpentTab';
import { ChronicleTab } from './components/ChronicleTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { FocusTab, TodayPill } from './components/FocusTab';
import { SidebarConfig } from './components/SidebarConfig';
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

  const [activeTab, setActiveTab] = useState<'SPENT' | 'CHRONICLE' | 'ANALYTICS' | 'FOCUS'>('SPENT');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewState, setViewState] = useState<{ type: 'LIST' | 'DETAIL'; id?: string }>({ type: 'LIST' });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSpendId, setEditingSpendId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
  const [fleetingKaomoji, setFleetingKaomoji] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<AppState[]>([]);
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
      setViewState({ type: 'LIST' });
      setEditingSpendId(null);
      setEditingDebtId(null);
      setEditingStudyId(null);
    }
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

  // Undo system (local in-memory, writes back to Firebase on undo)
  const pushToUndo = () => {
    const currentState: AppState = {
      debtTransactions,
      spendEntries,
      friends,
      sortType,
      studySessions,
      runningSession,
      preferences: { monthlyBudget, customTags, dailyStudyGoalMin, customSubjects },
    };
    setUndoStack(prev => [currentState, ...prev].slice(0, 20));
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 4000);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || !user) return;
    const [lastState, ...rest] = undoStack;
    const { ref, set } = await import('firebase/database');
    const { db } = await import('./lib/firebase');
    const userRef = ref(db, `users/${user.uid}`);
    const firebaseData: Record<string, any> = {
      preferences: {
        sortType: lastState.sortType,
        monthlyBudget: lastState.preferences?.monthlyBudget ?? monthlyBudget,
        customTags: lastState.preferences?.customTags ?? customTags,
        dailyStudyGoalMin: lastState.preferences?.dailyStudyGoalMin ?? dailyStudyGoalMin,
        customSubjects: lastState.preferences?.customSubjects ?? customSubjects,
      },
    };

    const entries: Record<string, SpendEntry> = {};
    lastState.spendEntries.forEach(e => { entries[e.id] = e; });
    firebaseData.spendEntries = entries;

    const txs: Record<string, DebtTransaction> = {};
    lastState.debtTransactions.forEach(t => { txs[t.id] = t; });
    firebaseData.debtTransactions = txs;

    const fr: Record<string, Friend> = {};
    lastState.friends.forEach(f => { fr[f.name.replace(/[.#$/\[\]]/g, '_')] = f; });
    firebaseData.friends = fr;

    if (lastState.studySessions && lastState.studySessions.length > 0) {
      const ss: Record<string, StudySession> = {};
      lastState.studySessions.forEach(s => { ss[s.id] = s; });
      firebaseData.studySessions = ss;
    }
    if (lastState.runningSession) {
      firebaseData.runningSession = lastState.runningSession;
    }

    await set(userRef, firebaseData);
    setUndoStack(rest);
    setShowUndoToast(false);
    triggerFleeting('( ˘▽˘)っ Undo');
  };

  const triggerFleeting = (kaomoji: string, duration = 800) => {
    setFleetingKaomoji(kaomoji);
    setTimeout(() => setFleetingKaomoji(null), duration);
  };

  const handleAddSpend = async (entry: Omit<SpendEntry, 'id'>, friendName?: string) => {
    pushToUndo();
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
    pushToUndo();
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
    pushToUndo();
    await settleDebt(id);
    triggerFleeting(KAOMOJI.SETTLE, 1000);
  };

  const handleDeleteEntry = async (id: string, type: 'SPEND' | 'DEBT') => {
    if (confirm(`DELETE? ${KAOMOJI.DELETE}`)) {
      pushToUndo();
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
    pushToUndo();
    await startSession(subject, name, note);
    triggerFleeting('ᕙ(`▿´)ᕗ', 600);
  };

  const handlePauseSession = async () => {
    pushToUndo();
    await pauseSession();
    triggerFleeting('( ´_ゝ`)', 400);
  };

  const handleResumeSession = async () => {
    pushToUndo();
    await resumeSession();
    triggerFleeting('ᕙ(`▿´)ᕗ', 400);
  };

  const handleStopSession = async () => {
    pushToUndo();
    await stopSession();
    triggerFleeting(KAOMOJI.SETTLE, 800);
  };

  const handleDiscardSession = async () => {
    if (!runningSession) return;
    if (confirm(`DISCARD SESSION? ${KAOMOJI.DELETE}`)) {
      pushToUndo();
      await discardSession();
      triggerFleeting(KAOMOJI.DELETE, 600);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm(`DELETE SESSION? ${KAOMOJI.DELETE}`)) {
      pushToUndo();
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
    pushToUndo();
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
      if (activeTab !== 'FOCUS') return;
      if (isSheetOpen || isSidebarOpen) return;
      if (isTextInput(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!runningSession) {
          handleStartSession('untitled');
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
  }, [activeTab, runningSession, isSheetOpen, isSidebarOpen]);

  const TabButton = ({ label, active }: { label: 'SPENT' | 'CHRONICLE' | 'ANALYTICS' | 'FOCUS'; active: boolean }) => (
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-ink text-bg px-4 py-3 flex items-center gap-3 max-w-sm"
        >
          <span className="text-xs font-mono">Found local data. Import?</span>
          <button onClick={importLocalData} className="bg-bg text-ink px-3 py-1 text-[10px] font-mono font-bold">YES</button>
          <button onClick={() => {}} className="text-[10px] font-mono opacity-60">NO</button>
        </motion.div>
      )}

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

      {activeTab === 'SPENT' && (
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

      {activeTab === 'ANALYTICS' && (
        <AnalyticsTab spendEntries={spendEntries} customTags={customTags} />
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
        />
      )}

      {activeTab === 'FOCUS' && (
        <FocusTab
          studySessions={studySessions}
          runningSession={runningSession}
          dailyStudyGoalMin={dailyStudyGoalMin}
          customSubjects={customSubjects}
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

      {/* FAB */}
      <button
        onClick={() => openModal(() => setIsSheetOpen(true))}
        className="fixed bottom-24 right-8 w-14 h-14 bg-ink text-bg flex items-center justify-center text-3xl z-40 hover:scale-105 active:scale-95 transition-transform"
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
        <TabButton label="SPENT" active={activeTab === 'SPENT'} />
        <TabButton label="FOCUS" active={activeTab === 'FOCUS'} />
        <TabButton label="ANALYTICS" active={activeTab === 'ANALYTICS'} />
        <TabButton label="CHRONICLE" active={activeTab === 'CHRONICLE'} />
      </div>

      {/* Sheet */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="fixed inset-0 bg-ink/10 z-40 backdrop-blur-[2px]" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-ink max-w-lg mx-auto"
            >
              <div className="ascii-torn bg-ink text-bg py-1 text-center">^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/^/</div>
              {activeTab === 'SPENT' ? (
                <SpendEntryForm
                  initialData={editingSpendId ? spendEntries.find(e => e.id === editingSpendId) : undefined}
                  friends={friends}
                  customTags={customTags}
                  onSubmit={handleAddSpend}
                  onClose={handleCloseModal}
                />
              ) : activeTab === 'FOCUS' ? (
                <StudySessionForm
                  initialData={editingStudyId ? studySessions.find(s => s.id === editingStudyId) : undefined}
                  customSubjects={customSubjects}
                  onSubmit={async (data) => {
                    if (editingStudyId) {
                      await handleUpdateSession(editingStudyId, data);
                    } else {
                      pushToUndo();
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
                />
              ) : (
                <DebtEntryForm
                  initialData={editingDebtId ? debtTransactions.find(t => t.id === editingDebtId) : undefined}
                  friends={friends}
                  onSubmit={handleAddDebt}
                  onClose={handleCloseModal}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Undo toast */}
      <AnimatePresence>
        {showUndoToast && undoStack.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-ink text-bg border-2 border-bg shadow-[8px_8px_0px_0px_var(--ink)] flex items-center gap-4"
          >
            <span className="text-xs font-mono font-bold tracking-widest uppercase">Action Saved</span>
            <button onClick={handleUndo} className="bg-bg text-ink px-3 py-1 text-[10px] font-mono font-bold hover:invert transition-colors">UNDO</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fleeting kaomoji */}
      <AnimatePresence>
        {fleetingKaomoji && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed inset-0 pointer-events-none flex items-center justify-center z-[60]">
            <div className="bg-bg border border-ink p-4 text-2xl">{fleetingKaomoji}</div>
          </motion.div>
        )}
      </AnimatePresence>

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
      />
    </div>
  );
}

function SpendEntryForm({ initialData, friends, customTags, onSubmit, onClose }: { initialData?: SpendEntry; friends: Friend[]; customTags: string[]; onSubmit: (t: Omit<SpendEntry, 'id'>, friendName?: string) => void; onClose: () => void }) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  const [friendName, setFriendName] = useState('');
  const [date, setDate] = useState(new Date(initialData?.date || Date.now()).toISOString().split('T')[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialData) inputRef.current?.focus();
  }, [initialData]);

  const handle = (type: 'SPENT' | 'EARNED') => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    onSubmit({ amount: val, note: note || '...', tag: tag || undefined, date: new Date(date).getTime(), type }, friendName);
  };

  return (
    <div className="p-6 pb-10 space-y-8 font-sans">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] opacity-40 uppercase">{initialData ? 'Edit entry' : 'New transaction'}</h3>
        <button onClick={onClose} className="text-[10px] font-mono font-bold underline opacity-60 active:opacity-100">CANCEL</button>
      </div>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">AMOUNT</div>
          <div className="flex items-baseline border-b-4 border-ink pb-1">
            <input ref={inputRef} type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 bg-transparent outline-none text-7xl font-display font-black tracking-tighter" placeholder="0" />
            <span className="text-3xl font-mono font-black opacity-10 ml-2">U</span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DESCRIPTION</div>
            <input value={note} onChange={e => setNote(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-3 text-lg font-sans" placeholder="..." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">TAG</div>
              <input value={tag} onChange={e => setTag(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-3 text-sm font-mono font-bold mb-2" placeholder="[NONE]" />
              <div className="flex flex-wrap gap-2">
                {customTags.map(t => (
                  <button key={t} onClick={() => setTag(t)} className={`px-2 py-1 border border-ink text-xs font-mono transition-colors ${tag === t ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>[{t}]</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DATE</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-3 text-sm font-mono font-bold" />
            </div>
          </div>
          {!initialData && (
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">FRIEND (OPTIONAL)</div>
              <input value={friendName} onChange={e => setFriendName(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2 text-sm font-mono font-bold mb-2" placeholder="..." />
              {friends.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {friends.slice(0, 3).map(f => (
                    <button key={f.name} onClick={() => setFriendName(f.name)} className={`px-2 py-1 border border-ink text-xs font-mono transition-colors whitespace-nowrap ${friendName === f.name ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}>[{f.name}]</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-6">
        <button onClick={() => handle('SPENT')} className="w-full bg-ink text-bg py-5 font-display text-xl font-bold border-2 border-ink tracking-[0.05em] active:scale-[0.97] transition-transform">
          LOG AS SPENT
        </button>
        <button onClick={() => handle('EARNED')} className="w-full bg-transparent text-ink py-4 font-display text-base font-bold border-2 border-ink tracking-widest active:scale-[0.97] transition-transform opacity-60">
          LOG AS EARNED
        </button>
      </div>
    </div>
  );
}

function DebtEntryForm({ initialData, friends, onSubmit, onClose }: { initialData?: DebtTransaction; friends: Friend[]; onSubmit: (t: Omit<DebtTransaction, 'id' | 'date' | 'settled'>) => void; onClose: () => void }) {
  const [name, setName] = useState(initialData?.friendName || friends[0]?.name || '');
  const [direction, setDirection] = useState<Direction>(initialData?.direction || 'LENT');
  const [amountRaw, setAmountRaw] = useState(initialData?.amountRaw || '');
  const [note, setNote] = useState(initialData?.note || '');

  const handle = () => {
    if (!name.trim()) return;
    const val = parseFloat(amountRaw.match(/(\d+(\.\d+)?)/)?.[0] || '0');
    onSubmit({ friendName: name, direction, amountRaw, amountValue: val, note: note || '...' });
  };

  return (
    <div className="p-6 space-y-8 font-sans">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] opacity-40 uppercase">{initialData ? 'Edit Chronicle' : 'New Chronicle'}</h3>
        <button onClick={onClose} className="text-[10px] font-mono font-bold underline opacity-60 active:opacity-100">CANCEL</button>
      </div>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">FRIEND</div>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-ink bg-transparent outline-none py-2 text-3xl font-display font-bold uppercase" list="friends-list" placeholder="NAME" />
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
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">AMOUNT</div>
              <input value={amountRaw} onChange={e => setAmountRaw(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2 font-mono font-bold text-2xl" placeholder="0 INR" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">NOTE</div>
              <input value={note} onChange={e => setNote(e.target.value)} className="w-full border-b border-ink bg-transparent outline-none py-2 text-base" placeholder="Optional context" />
            </div>
          </div>
        </div>
      </div>
      <button onClick={handle} className="w-full bg-ink text-bg py-5 font-display text-xl font-bold border-2 border-ink tracking-widest uppercase active:scale-[0.98] transition-transform">
        CONFIRM ENTRY
      </button>
    </div>
  );
}

function StudySessionForm({
  initialData,
  customSubjects,
  onSubmit,
  onClose,
}: {
  initialData?: StudySession;
  customSubjects: string[];
  onSubmit: (data: Omit<StudySession, 'id'>) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(initialData?.subject || '');
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
    <div className="p-6 pb-10 space-y-8 font-sans">
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
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">DURATION (MIN)</div>
          <div className="flex items-baseline border-b-4 border-ink pb-1">
            <input
              type="number"
              inputMode="decimal"
              value={durationMin}
              onChange={e => setDurationMin(e.target.value)}
              className="flex-1 bg-transparent outline-none text-7xl font-display font-black tracking-tighter"
              placeholder="0"
            />
            <span className="text-3xl font-mono font-black opacity-10 ml-2">m</span>
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
        className="w-full bg-ink text-bg py-5 font-display text-xl font-bold border-2 border-ink tracking-widest uppercase active:scale-[0.98] transition-transform"
      >
        {initialData ? 'SAVE CHANGES' : 'LOG SESSION'}
      </button>
    </div>
  );
}
