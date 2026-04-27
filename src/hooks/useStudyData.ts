import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { StudySession, RunningSession } from '../types';

export function useStudyData(uid: string | null) {
  const STORAGE_KEY = 'calc_v2';
  
  const [studyLoaded, setStudyLoaded] = useState(() => {
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

  const [studySessions, setStudySessions] = useState<StudySession[]>(init.studySessions || []);
  const [runningSession, setRunningSession] = useState<RunningSession | null>(null);
  const [dailyStudyGoalMin, setDailyStudyGoalMin] = useState<number>(init.preferences?.dailyStudyGoalMin || 0);
  const [customSubjects, setCustomSubjects] = useState<string[]>(init.preferences?.customSubjects || ['math', 'physics', 'reading']);

  useEffect(() => {
    if (!uid) {
      setStudyLoaded(false);
      return;
    }
    const userRef = ref(db, `users/${uid}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessions = data.studySessions
          ? (Object.values(data.studySessions) as StudySession[])
          : [];
        const goal = data.preferences?.dailyStudyGoalMin || 0;
        const subjects = data.preferences?.customSubjects || ['math', 'physics', 'reading'];

        setStudySessions(sessions);
        setRunningSession(data.runningSession || null);
        setDailyStudyGoalMin(goal);
        setCustomSubjects(subjects);

        // Save fresh network state to localStorage
        const newState: Partial<any> = {
          studySessions: sessions,
          preferences: { dailyStudyGoalMin: goal, customSubjects: subjects }
        };
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        let existing: any = {};
        try { if (existingRaw) existing = JSON.parse(existingRaw); } catch {}
        
        // merge preferences carefully
        const mergedPrefs = { ...existing.preferences, ...newState.preferences };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...newState, preferences: mergedPrefs }));

      } else {
        setStudySessions([]);
        setRunningSession(null);
      }
      setStudyLoaded(true);
    });
    return () => unsub();
  }, [uid]);

  const startSession = useCallback(
    async (subject: string, name?: string, note?: string) => {
      if (!uid) return;
      const newRunning: RunningSession = {
        id: crypto.randomUUID(),
        subject: subject || 'untitled',
        name: name || undefined,
        note: note || undefined,
        startedAt: Date.now(),
        pausedMs: 0,
        distractions: 0,
      };
      const clean: any = { ...newRunning };
      Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
      await set(ref(db, `users/${uid}/runningSession`), clean);
      return newRunning.id;
    },
    [uid]
  );

  const pauseSession = useCallback(async () => {
    if (!uid || !runningSession || runningSession.pausedAt) return;
    await update(ref(db, `users/${uid}/runningSession`), {
      pausedAt: Date.now(),
    });
  }, [uid, runningSession]);

  const resumeSession = useCallback(async () => {
    if (!uid || !runningSession || !runningSession.pausedAt) return;
    const additional = Date.now() - runningSession.pausedAt;
    await update(ref(db, `users/${uid}/runningSession`), {
      pausedAt: null,
      pausedMs: runningSession.pausedMs + additional,
    });
  }, [uid, runningSession]);

  const updateRunning = useCallback(
    async (patch: Partial<RunningSession>) => {
      if (!uid || !runningSession) return;
      await update(ref(db, `users/${uid}/runningSession`), patch);
    },
    [uid, runningSession]
  );

  const incrementDistraction = useCallback(async () => {
    if (!uid || !runningSession) return;
    await update(ref(db, `users/${uid}/runningSession`), {
      distractions: (runningSession.distractions || 0) + 1,
    });
  }, [uid, runningSession]);

  const stopSession = useCallback(async () => {
    if (!uid || !runningSession) return;
    const now = Date.now();
    // finalize paused time if still paused
    let totalPaused = runningSession.pausedMs;
    if (runningSession.pausedAt) {
      totalPaused += now - runningSession.pausedAt;
    }
    const duration = now - runningSession.startedAt - totalPaused;
    if (duration < 1000) {
      // discard sub-second sessions
      await remove(ref(db, `users/${uid}/runningSession`));
      return;
    }
    const completed: StudySession = {
      id: runningSession.id,
      subject: runningSession.subject,
      name: runningSession.name,
      note: runningSession.note,
      startedAt: runningSession.startedAt,
      endedAt: now,
      durationMs: duration,
      pausedMs: totalPaused,
      distractions: runningSession.distractions || 0,
    };
    // strip undefineds for Firebase
    const clean: any = { ...completed };
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
    await set(ref(db, `users/${uid}/studySessions/${completed.id}`), clean);
    await remove(ref(db, `users/${uid}/runningSession`));
    return completed.id;
  }, [uid, runningSession]);

  const discardSession = useCallback(async () => {
    if (!uid) return;
    await remove(ref(db, `users/${uid}/runningSession`));
  }, [uid]);

  const updateSession = useCallback(
    async (id: string, patch: Partial<StudySession>) => {
      if (!uid) return;
      const clean: any = { ...patch };
      Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
      await update(ref(db, `users/${uid}/studySessions/${id}`), clean);
    },
    [uid]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!uid) return;
      await remove(ref(db, `users/${uid}/studySessions/${id}`));
    },
    [uid]
  );

  const updateStudyPreferences = useCallback(
    async (prefs: { dailyStudyGoalMin?: number; customSubjects?: string[] }) => {
      if (!uid) return;
      await update(ref(db, `users/${uid}/preferences`), prefs);
    },
    [uid]
  );

  return {
    studyLoaded,
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
  };
}
