import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { SpendEntry, DebtTransaction, Friend, NoteEntry, SortType, AppState } from '../types';

const STORAGE_KEY = 'calc_v2';

export function useFinanceData(uid: string | null) {
  // 1. Initialize state synchronously from localStorage if available
  const [dataLoaded, setDataLoaded] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });

  const getInitialState = () => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  };

  const init = getInitialState();

  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>(init.spendEntries || []);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>(init.debtTransactions || []);
  const [friends, setFriends] = useState<Friend[]>(init.friends || []);
  const [sortType, setSortType] = useState<SortType>(init.sortType || 'NAME');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(init.preferences?.monthlyBudget || 0);
  const [customTags, setCustomTags] = useState<string[]>(init.preferences?.customTags || ['eat-out', 'snacks', 'misc']);
  const [notes, setNotes] = useState<NoteEntry[]>(init.notes || []);
  const [noteTags, setNoteTags] = useState<string[]>(init.preferences?.noteTags || ['idea', 'todo', 'misc']);
  const [hideNotes, setHideNotes] = useState(init.preferences?.hideNotes ?? false);
  const [needsImport, setNeedsImport] = useState(false);

  useEffect(() => {
    if (!uid) {
      setDataLoaded(false);
      return;
    }

    const userRef = ref(db, `users/${uid}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const spend = data.spendEntries
          ? Object.values(data.spendEntries) as SpendEntry[]
          : [];
        const debts = data.debtTransactions
          ? Object.values(data.debtTransactions) as DebtTransaction[]
          : [];
        const fr = data.friends
          ? Object.values(data.friends) as Friend[]
          : [];
        const nt = data.notes
          ? Object.values(data.notes) as NoteEntry[]
          : [];
        const sort = data.preferences?.sortType || 'NAME';
        const budget = data.preferences?.monthlyBudget || 0;
        const tags = data.preferences?.customTags || ['eat-out', 'snacks', 'misc'];
        const nTags = data.preferences?.noteTags || ['idea', 'todo', 'misc'];
        const hNotes = data.preferences?.hideNotes ?? false;

        setSpendEntries(spend);
        setDebtTransactions(debts);
        setFriends(fr);
        setNotes(nt);
        setSortType(sort);
        setMonthlyBudget(budget);
        setCustomTags(tags);
        setNoteTags(nTags);
        setHideNotes(hNotes);
        setNeedsImport(false);

        // Save fresh network state to localStorage for offline-first boots
        const newState: Partial<AppState> = {
          spendEntries: spend,
          debtTransactions: debts,
          friends: fr,
          notes: nt,
          sortType: sort,
          preferences: { monthlyBudget: budget, customTags: tags, noteTags: nTags, hideNotes: hNotes }
        };
        
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        let existing = {};
        try { if (existingRaw) existing = JSON.parse(existingRaw); } catch {}
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...newState }));

      }
      setDataLoaded(true);
    });

    return () => unsub();
  }, [uid]);

  const importLocalData = useCallback(async () => {
    if (!uid) return;
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) return;
    try {
      const parsed: AppState = JSON.parse(local);
      const userRef = ref(db, `users/${uid}`);
      const firebaseData: Record<string, any> = {};

      if (parsed.spendEntries) {
        const entries: Record<string, SpendEntry> = {};
        parsed.spendEntries.forEach(e => { entries[e.id] = e; });
        firebaseData.spendEntries = entries;
      }
      if (parsed.debtTransactions) {
        const txs: Record<string, DebtTransaction> = {};
        parsed.debtTransactions.forEach(t => { txs[t.id] = t; });
        firebaseData.debtTransactions = txs;
      }
      if (parsed.friends) {
        const fr: Record<string, Friend> = {};
        parsed.friends.forEach(f => { fr[f.name.replace(/[.#$/\[\]]/g, '_')] = f; });
        firebaseData.friends = fr;
      }
      if (parsed.sortType) {
        firebaseData.preferences = { sortType: parsed.sortType };
      }

      await set(userRef, firebaseData);
      setNeedsImport(false);
    } catch (e) {
      console.error('Import failed', e);
    }
  }, [uid]);

  const addSpend = useCallback(async (entry: Omit<SpendEntry, 'id'>) => {
    if (!uid) return;
    const id = crypto.randomUUID();
    const newEntry: SpendEntry = { ...entry, id };
    await set(ref(db, `users/${uid}/spendEntries/${id}`), newEntry);
    return id;
  }, [uid]);

  const updateSpend = useCallback(async (id: string, entry: Omit<SpendEntry, 'id'>) => {
    if (!uid) return;
    await set(ref(db, `users/${uid}/spendEntries/${id}`), { ...entry, id });
  }, [uid]);

  const deleteSpend = useCallback(async (id: string) => {
    if (!uid) return;
    await remove(ref(db, `users/${uid}/spendEntries/${id}`));
  }, [uid]);

  const addDebt = useCallback(async (t: Omit<DebtTransaction, 'id' | 'date' | 'settled'>) => {
    if (!uid) return;
    const id = crypto.randomUUID();
    const newT: DebtTransaction = { ...t, id, date: Date.now(), settled: false };
    await set(ref(db, `users/${uid}/debtTransactions/${id}`), newT);
    const friendKey = t.friendName.replace(/[.#$/\[\]]/g, '_');
    await set(ref(db, `users/${uid}/friends/${friendKey}`), { name: t.friendName, lastActive: Date.now() });
    return id;
  }, [uid]);

  const updateDebt = useCallback(async (id: string, t: Partial<DebtTransaction>) => {
    if (!uid) return;
    await update(ref(db, `users/${uid}/debtTransactions/${id}`), t);
  }, [uid]);

  const deleteDebt = useCallback(async (id: string) => {
    if (!uid) return;
    await remove(ref(db, `users/${uid}/debtTransactions/${id}`));
  }, [uid]);

  const settleDebt = useCallback(async (id: string) => {
    if (!uid) return;
    await update(ref(db, `users/${uid}/debtTransactions/${id}`), { settled: true });
  }, [uid]);

  const updateSortType = useCallback(async (sort: SortType) => {
    if (!uid) return;
    await set(ref(db, `users/${uid}/preferences/sortType`), sort);
  }, [uid]);

  const addNote = useCallback(async (n: Omit<NoteEntry, 'id'>) => {
    if (!uid) return;
    const id = crypto.randomUUID();
    const newNote: Record<string, any> = { ...n, id };
    Object.keys(newNote).forEach(k => newNote[k] === undefined && delete newNote[k]);
    await set(ref(db, `users/${uid}/notes/${id}`), newNote);
    return id;
  }, [uid]);

  const updateNote = useCallback(async (id: string, patch: Partial<NoteEntry>) => {
    if (!uid) return;
    await update(ref(db, `users/${uid}/notes/${id}`), patch);
  }, [uid]);

  const deleteNote = useCallback(async (id: string) => {
    if (!uid) return;
    await remove(ref(db, `users/${uid}/notes/${id}`));
  }, [uid]);

  const updatePreferences = useCallback(async (prefs: { monthlyBudget?: number; customTags?: string[]; noteTags?: string[]; hideNotes?: boolean }) => {
    if (!uid) return;
    await update(ref(db, `users/${uid}/preferences`), prefs);
  }, [uid]);

  return {
    dataLoaded,
    spendEntries,
    debtTransactions,
    friends,
    sortType,
    notes,
    noteTags,
    hideNotes,
    needsImport,
    importLocalData,
    addSpend,
    updateSpend,
    deleteSpend,
    addDebt,
    updateDebt,
    deleteDebt,
    settleDebt,
    addNote,
    updateNote,
    deleteNote,
    updateSortType,
    monthlyBudget,
    customTags,
    updatePreferences,
  };
}
