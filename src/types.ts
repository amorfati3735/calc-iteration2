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
}

export type SortType = 'NAME' | 'AMOUNT' | 'RECENT';

export interface AppState {
  debtTransactions: DebtTransaction[];
  spendEntries: SpendEntry[];
  friends: Friend[];
  sortType: SortType;
  preferences?: {
    monthlyBudget?: number;
    customTags?: string[];
  };
}
