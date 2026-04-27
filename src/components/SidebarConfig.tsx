import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarConfigProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyBudget: number;
  customTags: string[];
  updatePreferences: (prefs: { monthlyBudget?: number; customTags?: string[] }) => void;
  gridStyle: 'lines' | 'dots';
  setGridStyle: (v: 'lines' | 'dots') => void;
  dailyStudyGoalMin: number;
  customSubjects: string[];
  updateStudyPreferences: (prefs: { dailyStudyGoalMin?: number; customSubjects?: string[] }) => void;
  onExport: () => void;
}

export function SidebarConfig({
  isOpen,
  onClose,
  monthlyBudget,
  customTags,
  updatePreferences,
  gridStyle,
  setGridStyle,
  dailyStudyGoalMin,
  customSubjects,
  updateStudyPreferences,
  onExport,
}: SidebarConfigProps) {
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [newTag, setNewTag] = useState('');
  const [goalInput, setGoalInput] = useState(dailyStudyGoalMin.toString());
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
  }, [monthlyBudget]);

  useEffect(() => {
    setGoalInput(dailyStudyGoalMin.toString());
  }, [dailyStudyGoalMin]);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val)) updatePreferences({ monthlyBudget: val });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      updatePreferences({ customTags: [...customTags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updatePreferences({ customTags: customTags.filter(t => t !== tag) });
  };

  const handleSaveGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val >= 0) updateStudyPreferences({ dailyStudyGoalMin: val });
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !customSubjects.includes(newSubject.trim())) {
      updateStudyPreferences({ customSubjects: [...customSubjects, newSubject.trim()] });
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (s: string) => {
    updateStudyPreferences({ customSubjects: customSubjects.filter(x => x !== s) });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/10 z-50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: 'circOut' }}
            className="fixed top-0 bottom-0 left-0 w-64 bg-bg border-r-2 border-ink z-[60] p-6 space-y-8 overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b-2 border-ink pb-2">
              <span className="font-mono font-bold tracking-widest text-xs">CONFIG</span>
              <button onClick={onClose} className="font-mono text-xs opacity-60">[ X ]</button>
            </div>

            <div className="space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">MONTHLY BUDGET</div>
              <div className="flex items-center gap-2">
                <input
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  type="number"
                  className="flex-1 bg-transparent border-b border-ink py-1 font-mono font-bold outline-none"
                />
                <button onClick={handleSaveBudget} className="px-2 py-1 bg-ink text-bg font-mono text-[10px] tracking-widest">
                  SAVE
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">TAGS</div>
              <div className="flex items-center gap-2">
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="flex-1 bg-transparent border-b border-ink py-1 font-mono outline-none text-sm"
                  placeholder="new tag"
                />
                <button onClick={handleAddTag} className="px-2 py-1 border border-ink text-ink font-mono text-[10px] tracking-widest">
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {customTags.map(t => (
                  <div key={t} className="flex items-center border border-ink px-2 py-1 gap-2 text-xs font-mono">
                    <span>{t}</span>
                    <button onClick={() => handleRemoveTag(t)} className="opacity-40 hover:opacity-100 text-[10px]">x</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-ink/30 pt-6 space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">DAILY STUDY GOAL (MIN)</div>
              <div className="flex items-center gap-2">
                <input
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  type="number"
                  className="flex-1 bg-transparent border-b border-ink py-1 font-mono font-bold outline-none"
                />
                <button onClick={handleSaveGoal} className="px-2 py-1 bg-ink text-bg font-mono text-[10px] tracking-widest">
                  SAVE
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">SUBJECTS</div>
              <div className="flex items-center gap-2">
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="flex-1 bg-transparent border-b border-ink py-1 font-mono outline-none text-sm"
                  placeholder="new subject"
                />
                <button onClick={handleAddSubject} className="px-2 py-1 border border-ink text-ink font-mono text-[10px] tracking-widest">
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {customSubjects.map(s => (
                  <div key={s} className="flex items-center border border-ink px-2 py-1 gap-2 text-xs font-mono">
                    <span>{s}</span>
                    <button onClick={() => handleRemoveSubject(s)} className="opacity-40 hover:opacity-100 text-[10px]">x</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-ink/30 pt-6 space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">GRID</div>
              <div className="flex border-2 border-ink overflow-hidden font-mono font-bold text-[10px] tracking-widest">
                <button
                  onClick={() => setGridStyle('lines')}
                  className={`flex-1 py-2 transition-colors ${gridStyle === 'lines' ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}
                >
                  LINES
                </button>
                <button
                  onClick={() => setGridStyle('dots')}
                  className={`flex-1 py-2 transition-colors ${gridStyle === 'dots' ? 'bg-ink text-bg' : 'bg-transparent text-ink'}`}
                >
                  DOTS
                </button>
              </div>
            </div>

            <div className="border-t border-ink/30 pt-6 space-y-4 pb-12">
              <button 
                onClick={onExport}
                className="w-full py-3 border-2 border-ink text-ink font-mono font-bold text-[10px] tracking-widest hover:bg-ink hover:text-bg transition-colors"
              >
                EXPORT ALL DATA (JSON)
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
