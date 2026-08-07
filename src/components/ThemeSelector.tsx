import React, { useState } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setThemeColor, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] transition-all group shadow-md brightness-105 border border-white/10"
        title="版面顏色"
      >
        <div 
          className="text-white w-7 h-7 flex items-center justify-center shrink-0 border border-white"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <Palette size={14} />
        </div>
        <div className="bg-white text-indigo-950 flex-1 flex items-center justify-between px-3 text-[10px] md:text-xs lg:text-sm font-normal whitespace-nowrap border border-white rounded-r-[4px]">
          <span>版面顏色</span>
          <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 w-full bg-white rounded shadow-2xl border border-indigo-100 py-1 z-20 overflow-hidden"
            >
              <div className="px-3 py-1 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-50 mb-1 flex items-center gap-1">
                <Palette size={10} />
                <span>版面顏色選項</span>
              </div>
              <div className="grid grid-cols-1 divide-y divide-indigo-50 max-h-52 overflow-y-auto">
                {availableThemes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setThemeColor(t.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full h-8 flex items-center justify-between px-3 text-[10px] transition-colors
                      ${currentTheme.id === t.id ? 'bg-indigo-50 text-indigo-900 font-bold' : 'bg-white hover:bg-slate-50 text-slate-700'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0 inline-block"
                        style={{ backgroundColor: t.hex }}
                      />
                      <span>{t.name}色</span>
                    </div>
                    {currentTheme.id === t.id && <Check size={12} className="text-indigo-900 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
