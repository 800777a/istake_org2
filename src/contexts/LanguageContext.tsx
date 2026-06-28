import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAllTranslations, TranslationDoc } from '../../services/translationService';

interface LanguageContextType {
  currentLang: string;
  setLang: (lang: string) => void;
  availableLangs: string[];
  t: (key: string) => any; // 魔改為支援 ReactNode
  tString: (key: string) => string; // 屬性專用的純字串版本
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
  loading: boolean;
  refreshTranslations: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>(localStorage.getItem('app_lang') || 'zh-TW');
  const [translations, setTranslations] = useState<Record<string, TranslationDoc>>({});
  const [availableLangs, setAvailableLangs] = useState<string[]>(['en', 'zh-TW', 'ja']);
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTranslations();
      setTranslations(data);
      
      // 動態分析可用語言
      const langs = new Set<string>(['en', 'zh-TW']);
      Object.values(data).forEach((doc: TranslationDoc) => {
        Object.keys(doc).forEach(lang => langs.add(lang));
      });
      setAvailableLangs(Array.from(langs).sort());
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranslations();
  }, []);

  const setLang = (lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('app_lang', lang);
  };

  // 永遠回傳純字串的函式 (專門給 placeholder 或 HTML 屬性使用)
  const tString = (key: string): string => {
    const doc = translations[key];
    if (!doc) return key;
    return doc[currentLang] || doc['en'] || key;
  };

  /**
   * 魔改後的翻譯函式 t()
   * 1. 非編輯模式：回傳純字串 (string)
   * 2. 編輯模式：回傳強行置頂、具備點擊攔截功能的 <span> 元件
   */
  const t = (key: string): any => {
    const text = tString(key);

    // 模式 A: 非編輯模式，維持原樣
    if (!isEditMode) return text;

    // 模式 B: 編輯模式，注入魔改元件
    const isActive = activeKey === key;

    return (
      <span
        key={`i18n-${key}`}
        data-i18n-key={key}
        onClick={(e) => {
          e.stopPropagation(); // 阻斷冒泡，確保只有這一層會收到點擊
          // 移除 e.preventDefault() 以維持原生行為
          console.log("🔥 點擊成功：", key); 
          setActiveKey(key);   // 觸發右側編輯條定位
        }}
        className={`
          inline-block rounded px-0.5 transition-all duration-200 
          cursor-pointer pointer-events-auto relative z-[9999]
          border border-dashed border-red-400 hover:bg-red-50
          ${isActive ? 'bg-yellow-200 border-yellow-500 ring-2 ring-yellow-400 animate-pulse shadow-sm' : ''}
        `}
        title={`Key: ${key}`}
      >
        {text}
      </span>
    );
  };

  return (
    <LanguageContext.Provider value={{ 
      currentLang, setLang, availableLangs, t, tString,
      isEditMode, setIsEditMode, activeKey, setActiveKey,
      loading,
      refreshTranslations: loadTranslations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used within a LanguageProvider');
  return context;
};
