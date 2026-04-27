import { useState, memo } from 'react';
import { DebtTransaction, Friend, SortType, SpendEntry } from '../types';
import { AnalyticsTab } from './AnalyticsTab';

const formatBrutalDate = (timestamp: number) => {
  const d = new Date(timestamp);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getDate()}-${months[d.getMonth()]}`;
};

const KAOMOJI = {
  EMPTY: '(´• ω •`)ノ',
  OWES_LOT: '(╬ಠ益ಠ)',
  YOU_OWE_LOT: '(´；ω；`)',
  SETTLE: '(ᵔᴥᵔ)',
};

interface ChronicleTabProps {
  sortedFriends: Friend[];
  debtTransactions: DebtTransaction[];
  sortType: SortType;
  getFriendBalance: (name: string) => number;
  onSortCycle: () => void;
  viewState: { type: 'LIST' | 'DETAIL'; id?: string };
  onViewDetail: (name: string) => void;
  onBack: () => void;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  spendEntries: SpendEntry[];
  customTags: string[];
}

export const ChronicleTab = memo(function ChronicleTab({ sortedFriends, debtTransactions, sortType, getFriendBalance, onSortCycle, viewState, onViewDetail, onBack, onSettle, onDelete, onEdit, spendEntries, customTags }: ChronicleTabProps) {
  const [subTab, setSubTab] = useState<'FRIENDS' | 'ANALYTICS'>('FRIENDS');

  if (viewState.type === 'DETAIL' && viewState.id) {
    return (
      <FriendDetail
        name={viewState.id}
        transactions={debtTransactions}
        onSettle={onSettle}
        onBack={onBack}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center h-8">
        <div className="flex gap-4">
          <button
            onClick={() => setSubTab('FRIENDS')}
            className={`text-xs font-mono font-bold tracking-widest px-2 py-1 -ml-2 transition-opacity ${subTab === 'FRIENDS' ? 'underline opacity-100' : 'opacity-40 hover:opacity-80'}`}
          >
            FRIENDS
          </button>
          <button
            onClick={() => setSubTab('ANALYTICS')}
            className={`text-xs font-mono font-bold tracking-widest px-2 py-1 transition-opacity ${subTab === 'ANALYTICS' ? 'underline opacity-100' : 'opacity-40 hover:opacity-80'}`}
          >
            ANALYTICS
          </button>
        </div>
        {subTab === 'FRIENDS' && (
          <button
            onClick={onSortCycle}
            className="text-[10px] opacity-60 underline font-mono font-bold tracking-widest px-2 py-1 active:opacity-100"
          >
            SORT: {sortType}
          </button>
        )}
      </div>

      {subTab === 'FRIENDS' ? (
        <div className="grid grid-cols-2 gap-4">
          {sortedFriends.length === 0 && (
            <div className="col-span-2 py-20 text-center opacity-50">
              <span className="text-2xl font-mono">{KAOMOJI.EMPTY}</span>
              <br /><span className="text-[10px] tracking-widest">NO FRIENDS</span>
            </div>
          )}
          {sortedFriends.map(friend => {
            const balance = getFriendBalance(friend.name);
            return (
              <div
                key={friend.name}
                onClick={() => onViewDetail(friend.name)}
                className="brutal-box aspect-square flex flex-col justify-between cursor-pointer group hover:bg-ink/5"
              >
                <div className="text-sm font-display uppercase tracking-tight">{friend.name}</div>
                <div className="flex-grow flex flex-wrap gap-1.5 p-2 opacity-5 mt-2">
                  {Array.from({ length: 40 }).map((_, i) => <div key={i} className="w-0.5 h-0.5 bg-ink rounded-full" />)}
                </div>
                <div className="text-right flex items-center justify-end gap-1">
                  {balance > 5000 && <span className="text-[10px]">{KAOMOJI.OWES_LOT}</span>}
                  {balance < -5000 && <span className="text-[10px]">{KAOMOJI.YOU_OWE_LOT}</span>}
                  <span className="text-xl font-mono font-bold tracking-tighter">{balance > 0 ? `+${balance}` : balance}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AnalyticsTab spendEntries={spendEntries} customTags={customTags} />
      )}
    </div>
  );
});

function FriendDetail({ name, transactions, onSettle, onBack, onDelete, onEdit }: { name: string; transactions: DebtTransaction[]; onSettle: (id: string) => void; onBack: () => void; onDelete: (id: string) => void; onEdit: (id: string) => void }) {
  const [showKaomojiLocal, setShowKaomojiLocal] = useState<string | null>(null);

  const settle = (id: string) => {
    onSettle(id);
    setShowKaomojiLocal(id);
    setTimeout(() => setShowKaomojiLocal(null), 1000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="text-[11px] font-mono font-bold underline px-3 py-2 -ml-3 active:opacity-60 transition-opacity">← BACK</button>
        <h2 className="text-2xl font-display font-black uppercase tracking-tighter">{name}</h2>
      </div>
      <div className="space-y-4">
        {transactions.filter(t => t.friendName === name).map(t => (
          <div key={t.id} className="notebook-row items-center group py-2 cursor-pointer active:opacity-60" onClick={() => onEdit(t.id)} onContextMenu={(e) => { e.preventDefault(); onDelete(t.id); }}>
            <div className={`text-[9px] w-12 font-mono opacity-40 ${t.settled ? 'strike-through' : ''}`}>
              {formatBrutalDate(t.date)}
            </div>
            <div className={`flex-grow truncate px-4 text-sm font-sans ${t.settled ? 'strike-through opacity-30' : ''}`}>
              {t.note}
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-mono text-xs ${t.settled ? 'strike-through opacity-30' : 'font-bold'}`}>
                {t.direction === 'LENT' ? '+' : '-'}{t.amountRaw}
              </div>
              {!t.settled ? (
                <button
                  onClick={(e) => { e.stopPropagation(); settle(t.id); }}
                  className="w-5 h-5 border border-ink flex items-center justify-center text-[10px] hover:bg-ink hover:text-bg transition-colors"
                >
                  
                </button>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center text-[10px] bg-ink text-bg">
                  ✓ {showKaomojiLocal === t.id && <span className="ml-1">{KAOMOJI.SETTLE}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
