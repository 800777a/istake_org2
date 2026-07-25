import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

const LanguageSelector: React.FC = () => {
  const { currentLang, setLang, availableLangs } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const langNames: Record<string, string> = {
    'en': 'English(EN)',
    'zh-TW': '繁體中文(ZH)'
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] transition-all group shadow-md brightness-105 border border-white/10"
      >
        <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white">
          <Globe size={14} />
        </div>
        <div className="bg-white text-indigo-950 flex-1 flex items-center justify-between px-3 text-[10px] font-black whitespace-nowrap">
          <span>{langNames[currentLang] || currentLang}</span>
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
              className="absolute top-full left-0 mt-2 w-full bg-white rounded-md shadow-2xl border border-indigo-100 py-1 z-20 overflow-hidden"
            >
              <div className="px-3 py-1 text-[9px] font-black text-indigo-300 uppercase tracking-widest border-b border-indigo-50 mb-1 pl-10">
                Language
              </div>
              {availableLangs.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLang(lang);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full h-7 flex items-stretch overflow-hidden transition-colors border-b border-indigo-50
                    ${currentLang === lang ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}
                  `}
                >
                  <div className={`w-7 h-7 flex items-center justify-center shrink-0 border-r border-indigo-100 ${currentLang === lang ? 'text-indigo-900' : 'text-slate-300'}`}>
                    {currentLang === lang && <Check size={12} />}
                  </div>
                  <div className={`flex-1 flex items-center px-3 text-[10px] font-normal ${currentLang === lang ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>
                    <span>{langNames[lang] || lang}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
