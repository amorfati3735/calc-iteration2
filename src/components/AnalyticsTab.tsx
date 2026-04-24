import React, { useMemo } from 'react';
import { SpendEntry } from '../types';

interface AnalyticsTabProps {
  spendEntries: SpendEntry[];
  customTags: string[];
}

export function AnalyticsTab({ spendEntries, customTags }: AnalyticsTabProps) {
  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthEntries = spendEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.type === 'SPENT';
    });

    const tagTotals: Record<string, number> = {};
    let total = 0;

    monthEntries.forEach(e => {
      const tag = e.tag || 'misc';
      tagTotals[tag] = (tagTotals[tag] || 0) + e.amount;
      total += e.amount;
    });

    return { tagTotals, total };
  }, [spendEntries]);

  // Generate vibrant colors consistently
  const getColor = (index: number) => {
    const colors = [
      '#FF3366', // Vibrant Pink/Red
      '#00E5FF', // Cyan
      '#FFD500', // Yellow
      '#B000FF', // Purple
      '#00FF66', // Neon Green
      '#FF6B00', // Orange
    ];
    return colors[index % colors.length];
  };

  const sortedTags = Object.entries(data.tagTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-12 pb-12 font-sans">
      <div className="text-right">
        <div className="text-xs font-mono opacity-40 mb-1 tracking-widest">ANALYTICS // THIS MONTH</div>
        <div className="text-4xl font-display">{data.total}</div>
      </div>

      <div className="space-y-6">
        {sortedTags.map(([tag, amt], idx) => {
          const percentage = data.total > 0 ? (amt / data.total) * 100 : 0;
          return (
            <div key={tag} className="space-y-2">
              <div className="flex justify-between items-baseline font-mono text-xs font-bold">
                <span className="uppercase">{tag}</span>
                <span>{amt} ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="h-4 bg-ink/10 w-full overflow-hidden border border-ink">
                <div 
                  className="h-full transition-all duration-1000 ease-out border-r border-ink" 
                  style={{ width: `${percentage}%`, backgroundColor: getColor(idx) }}
                />
              </div>
            </div>
          );
        })}

        {sortedTags.length === 0 && (
          <div className="py-20 text-center opacity-50 font-mono text-sm tracking-widest uppercase">
            Not enough data to analyze...
          </div>
        )}
      </div>
    </div>
  );
}
