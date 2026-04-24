import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpendEntry } from '../types';

const formatBrutalDate = (timestamp: number) => {
  const d = new Date(timestamp);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getDate()}-${months[d.getMonth()]}`;
};

interface SpentTabProps {
  monthTotal: number;
  spendByDay: [string, SpendEntry[]][];
  expandedDays: Record<string, boolean>;
  setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const KAOMOJI = { EMPTY: '(´• ω •`)ノ' };

export function SpentTab({ monthTotal, spendByDay, expandedDays, setExpandedDays, onEdit, onDelete }: SpentTabProps) {
  return (
    <div className="space-y-8">
      <div className="text-4xl text-right mb-12 font-display">
        <div className="text-xs font-mono opacity-40 mb-1">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
        {monthTotal}
      </div>
      <div className="space-y-4">
        {spendByDay.length === 0 && (
          <div className="py-20 text-center opacity-50">
            <span className="text-2xl font-mono">{KAOMOJI.EMPTY}</span>
            <br /><span className="text-[10px] tracking-widest">EMPTY LOG</span>
          </div>
        )}
        {spendByDay.map(([day, entries]) => {
          const dayTotal = entries.reduce((sum, e) => e.type === 'SPENT' ? sum + e.amount : sum - e.amount, 0);
          const isToday = day === new Date().toDateString();
          const isExpanded = expandedDays[day];

          return (
            <div key={day} className="space-y-2">
              <div
                onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                className="brutal-box flex justify-between items-baseline cursor-pointer group"
              >
                <span className="font-display text-sm">{isToday ? 'TODAY' : formatBrutalDate(new Date(day).getTime())}</span>
                <div className="flex-grow border-b border-dotted border-ink opacity-20 mx-4 group-hover:opacity-40 transition-opacity" />
                <span className="font-mono font-bold">{dayTotal}</span>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-4 space-y-2"
                  >
                    {entries.map(e => (
                      <div
                        key={e.id}
                        className="flex justify-between items-baseline text-xs group pr-2 cursor-pointer active:opacity-50"
                        onClick={() => onEdit(e.id)}
                        onContextMenu={(ev) => { ev.preventDefault(); onDelete(e.id); }}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-sans">{e.note}</span>
                          {e.tag && <span className="opacity-40 text-[10px]">[{e.tag}]</span>}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`font-mono ${e.type === 'EARNED' ? 'opacity-40 font-normal' : 'font-bold'}`}>
                            {e.type === 'EARNED' ? '-' : '+'}{e.amount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
