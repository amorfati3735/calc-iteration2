import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpendEntry } from '../types';
import { getSparkline } from '../lib/sparkline';

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
  monthlyBudget: number;
}

const KAOMOJI = { EMPTY: '(´• ω •`)ノ' };

export function SpentTab({ monthTotal, spendByDay, expandedDays, setExpandedDays, onEdit, onDelete, monthlyBudget }: SpentTabProps) {
  const [showArchive, setShowArchive] = useState(false);

  // Sparkline for last 7 days with data
  const sparkline = useMemo(() => {
    const recent = spendByDay.slice(0, 7).map(([, entries]) => 
      entries.reduce((sum, e) => e.type === 'SPENT' ? sum + e.amount : sum - e.amount, 0)
    ).reverse();
    return getSparkline(recent);
  }, [spendByDay]);

  // Archive receipts grouped by Month-Year
  const archiveReceipts = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pastEntries = spendByDay.flatMap(([, entries]) => entries).filter(e => {
      const d = new Date(e.date);
      return !(d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    });

    const groups: Record<string, { total: number, tags: Record<string, number> }> = {};
    pastEntries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`;
      if (!groups[key]) groups[key] = { total: 0, tags: {} };
      
      const amt = e.type === 'SPENT' ? e.amount : -e.amount;
      groups[key].total += amt;
      if (e.tag) {
        groups[key].tags[e.tag] = (groups[key].tags[e.tag] || 0) + amt;
      }
    });
    
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [spendByDay]);

  // Progressive budget calculations
  const { dailyAim, remainingWeekly, remainingMonthly, hasBudget } = useMemo(() => {
    if (monthlyBudget <= 0) return { dailyAim: 0, remainingWeekly: 0, remainingMonthly: 0, hasBudget: false };
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeftInMonth = daysInMonth - now.getDate() + 1; // including today
    const remMonth = monthlyBudget - monthTotal;
    
    // Daily Aim
    const dAim = daysLeftInMonth > 0 ? remMonth / daysLeftInMonth : remMonth;
    
    // Remaining Weekly (Hardcoded logic)
    const day = now.getDate();
    const currentWeek = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    const startDay = (currentWeek - 1) * 7 + 1;
    const endDay = currentWeek === 4 ? 31 : currentWeek * 7;
    
    let currentWeekSpend = 0;
    spendByDay.forEach(([dateStr, entries]) => {
      const d = new Date(dateStr);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const dd = d.getDate();
        if (dd >= startDay && dd <= endDay) {
          entries.forEach(e => {
            if (e.type === 'SPENT') currentWeekSpend += e.amount;
            else currentWeekSpend -= e.amount;
          });
        }
      }
    });
    
    const remWeek = (monthlyBudget / 4) - currentWeekSpend;

    return { 
      dailyAim: Math.max(0, Math.round(dAim)), 
      remainingWeekly: Math.round(remWeek), 
      remainingMonthly: Math.round(remMonth),
      hasBudget: true
    };
  }, [monthlyBudget, monthTotal, spendByDay]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col">
          {hasBudget ? (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-4xl">{dailyAim}</span>
              <span className="font-mono text-sm opacity-60">/{remainingWeekly}</span>
              <span className="font-mono text-[10px] opacity-40">/{remainingMonthly}</span>
            </div>
          ) : (
            <div className="text-xs font-mono tracking-widest opacity-40 mt-1">
              <div className="mb-1">{sparkline}</div>
              <div>7D TREND</div>
            </div>
          )}
          {hasBudget && <div className="text-[10px] font-mono tracking-widest opacity-40 mt-1">DAILY AIM</div>}
        </div>
        <div className="text-4xl text-right font-display flex flex-col items-end">
          <div className="text-xs font-mono opacity-40 mb-1">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          {monthTotal}
        </div>
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
                className="brutal-box flex justify-between items-baseline cursor-pointer group hand-ruled-border"
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

      {/* Archive Section */}
      {archiveReceipts.length > 0 && (
        <div className="pt-12 border-t border-ink border-dashed mt-12">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className="w-full py-4 text-center text-xs font-mono tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
          >
            [ {showArchive ? 'HIDE ARCHIVE' : 'SHOW ARCHIVE'} ]
          </button>
          
          <AnimatePresence>
            {showArchive && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6 mt-6">
                {archiveReceipts.map(([month, data]) => (
                  <div key={month} className="p-4 border-2 border-ink border-dashed font-mono text-xs bg-bg">
                    <div className="text-center font-bold mb-4 tracking-widest border-b border-ink border-dotted pb-2">=== {month} ===</div>
                    <div className="space-y-2 mb-4">
                      {Object.entries(data.tags).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([tag, amt]) => (
                        <div key={tag} className="flex justify-between">
                          <span>{tag.padEnd(15, '.')}</span>
                          <span>{amt}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold border-t border-ink border-dotted pt-2">
                      <span>TOTAL</span>
                      <span>{data.total}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
