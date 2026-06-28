import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

const LanguageSelector: React.FC = () => {
  const { currentLang, setLang, availableLangs } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const langNames: Record<string, string> = {
    'en': 'English',
    'zh-TW': '繁體中文',
    'ja': '日本語',
    'ko': '한국어'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-md border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
      >
        <Globe size={18} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
        <span className="text-sm font-bold text-gray-700 hidden sm:block">
          {langNames[currentLang] || currentLang}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden"
            >
              <div className="px-4 py-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Select Language
              </div>
              {availableLangs.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLang(lang);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                    ${currentLang === lang ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  {langNames[lang] || lang}
                  {currentLang === lang && <Check size={14} />}
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
