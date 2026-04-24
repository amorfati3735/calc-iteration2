import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { SpendEntry, DebtTransaction, Friend, SortType, AppState } from '../types';

const STORAGE_KEY = 'calc_v2';

export function useFinanceData(uid: string | null) {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>([]);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sortType, setSortType] = useState<SortType>('NAME');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [customTags, setCustomTags] = useState<string[]>(['eat-out', 'snacks', 'misc']);
  const [needsImport, setNeedsImport] = useState(false);
  const initialLoadDone = useRef(false);

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
        const sort = data.preferences?.sortType || 'NAME';

        setSpendEntries(spend);
        setDebtTransactions(debts);
        setFriends(fr);
        setSortType(sort);
        setMonthlyBudget(data.preferences?.monthlyBudget || 0);
        setCustomTags(data.preferences?.customTags || ['eat-out', 'snacks', 'misc']);
        setNeedsImport(false);
      } else {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local && !initialLoadDone.current) {
          try {
            const parsed: AppState = JSON.parse(local);
            if ((parsed.spendEntries?.length || 0) > 0 || (parsed.debtTransactions?.length || 0) > 0) {
              setNeedsImport(true);
            }
          } catch {}
        }
      }
      initialLoadDone.current = true;
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

  const updatePreferences = useCallback(async (prefs: { monthlyBudget?: number; customTags?: string[] }) => {
    if (!uid) return;
    await update(ref(db, `users/${uid}/preferences`), prefs);
  }, [uid]);

  return {
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
  };
}
