import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarConfigProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyBudget: number;
  customTags: string[];
  updatePreferences: (prefs: { monthlyBudget?: number; customTags?: string[] }) => void;
}

export function SidebarConfig({ isOpen, onClose, monthlyBudget, customTags, updatePreferences }: SidebarConfigProps) {
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
  }, [monthlyBudget]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-ink/10 z-50 backdrop-blur-[2px]" />
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', ease: 'circOut' }}
            className="fixed top-0 bottom-0 left-0 w-64 bg-bg border-r-2 border-ink z-[60] p-6 space-y-8 overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b-2 border-ink pb-2">
              <span className="font-mono font-bold tracking-widest text-xs">CONFIG</span>
              <button onClick={onClose} className="font-mono text-xs opacity-60">[ X ]</button>
            </div>

            <div className="space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">MONTHLY BUDGET</div>
              <div className="flex items-center gap-2">
                <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} type="number" className="flex-1 bg-transparent border-b border-ink py-1 font-mono font-bold outline-none" />
                <button onClick={handleSaveBudget} className="px-2 py-1 bg-ink text-bg font-mono text-[10px] tracking-widest">SAVE</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="font-mono text-[10px] tracking-widest opacity-60">TAGS</div>
              <div className="flex items-center gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 bg-transparent border-b border-ink py-1 font-mono outline-none text-sm" placeholder="new tag" />
                <button onClick={handleAddTag} className="px-2 py-1 border border-ink text-ink font-mono text-[10px] tracking-widest">+</button>
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
