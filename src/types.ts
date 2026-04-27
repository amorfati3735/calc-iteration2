export type Direction = 'LENT' | 'PAID';

export interface DebtTransaction {
  id: string;
  friendName: string;
  amountRaw: string; // e.g. "850 INR"
  amountValue: number; // e.g. 850
  note: string;
  tag?: string;
  date: number; // timestamp
  direction: Direction;
  settled: boolean;
  linkedSpendId?: string;
}

export interface Friend {
  name: string;
  lastActive: number;
}

export interface SpendEntry {
  id: string;
  amount: number;
  note: string;
  tag?: string;
  date: number; // timestamp
  type: 'SPENT' | 'EARNED';
  linkedDebtId?: string;
}

export type SortType = 'NAME' | 'AMOUNT' | 'RECENT';

export interface StudySession {
  id: string;
  subject: string;
  name?: string;
  note?: string;
  startedAt: number;     // ms timestamp
  endedAt: number;       // ms timestamp (0 if discarded shouldn't be stored; completed only)
  durationMs: number;    // (endedAt - startedAt) - pausedMs
  pausedMs: number;      // total paused duration
  distractions: number;
}

export interface RunningSession {
  id: string;
  subject: string;
  name?: string;
  note?: string;
  startedAt: number;
  pausedAt?: number;     // if defined, currently paused (timestamp)
  pausedMs: number;      // accumulated paused duration before current pause
  distractions: number;
}

export interface AppState {
  debtTransactions: DebtTransaction[];
  spendEntries: SpendEntry[];
  friends: Friend[];
  sortType: SortType;
  studySessions?: StudySession[];
  runningSession?: RunningSession | null;
  preferences?: {
    monthlyBudget?: number;
    customTags?: string[];
    dailyStudyGoalMin?: number;
    customSubjects?: string[];
  };
}
