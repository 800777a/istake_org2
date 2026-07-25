import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAllTranslations, TranslationDoc } from '../../services/translationService';

interface LanguageContextType {
  currentLang: string;
  setLang: (lang: string) => void;
  availableLangs: string[];
  t: (key: string, arg2?: string | Record<string, any>, arg3?: Record<string, any>) => any;
  tString: (key: string, arg2?: string | Record<string, any>, arg3?: Record<string, any>) => string;
  tAttr: (key: string, arg2?: string | Record<string, any>, arg3?: Record<string, any>) => string;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
  lastClickTime: number;
  loading: boolean;
  translations: Record<string, TranslationDoc>;
  renderedKeys: Map<string, string>;
  clearRenderedKeys: () => void;
  refreshTranslations: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>(localStorage.getItem('app_lang') || 'zh-TW');
  const [translations, setTranslations] = useState<Record<string, TranslationDoc>>({});
  const [availableLangs, setAvailableLangs] = useState<string[]>(['en', 'zh-TW']);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renderedKeys, setRenderedKeys] = useState<Map<string, string>>(new Map());
  const keyCollector = React.useRef<Map<string, string>>(new Map());
  const lastPathname = React.useRef<string>(window.location.pathname);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTranslations();
      setTranslations(data);
      
      const langs = new Set<string>(['en', 'zh-TW']);
      setAvailableLangs(Array.from(langs).sort());
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 每秒同步一次偵測到的內碼到狀態中，供編輯器顯示
  useEffect(() => {
    if (!isEditMode) return;
    const interval = setInterval(() => {
      // 偵測路徑變更，如果變更了就清空 collector
      if (window.location.pathname !== lastPathname.current) {
        keyCollector.current.clear();
        lastPathname.current = window.location.pathname;
      }
      
      if (keyCollector.current.size !== renderedKeys.size) {
        setRenderedKeys(new Map(keyCollector.current));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEditMode, renderedKeys.size]);

  useEffect(() => {
    // 優先使用實時監聽
    let unsubscribe = () => {};
    const setupSnapshot = async () => {
      try {
        const { db, collection, onSnapshot } = await import('../../services/firebaseConfig');
        
        unsubscribe = onSnapshot(collection(db, 'translations'), (snapshot: any) => {
          const data: Record<string, TranslationDoc> = {};
          snapshot.forEach((doc: any) => {
            data[doc.id] = doc.data() as TranslationDoc;
          });
          setTranslations(data);
          setLoading(false);

          // 更新可用語言
          const langs = new Set<string>(['en', 'zh-TW']);
          setAvailableLangs(Array.from(langs).sort());
        }, (error) => {
          console.error('Snapshot error:', error);
          loadTranslations(); // 降級為手動載入
        });
      } catch (e) {
        console.error('Failed to setup snapshot:', e);
        loadTranslations();
      }
    };

    setupSnapshot();
    return () => unsubscribe();
  }, []);

  const setLang = (lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('app_lang', lang);
  };

  // 永遠回傳純字串的函式 (專門給 placeholder 或 HTML 屬性使用)
  const tString = (key: string, arg2?: string | Record<string, any>, arg3?: Record<string, any>): string => {
    const defaultValue = typeof arg2 === 'string' ? arg2 : (typeof arg3 === 'string' ? arg3 : (arg2?.defaultValue || key));
    const options = (typeof arg2 === 'object' && arg2 !== null) ? arg2 : ((typeof arg3 === 'object' && arg3 !== null) ? arg3 : undefined);
    
    // 即使是字串模式，也要收集內碼，讓「偵測內碼」清單能看到它
    if (isEditMode) {
      keyCollector.current.set(key, defaultValue || key);
    }

    const doc = translations[key];
    let text = (doc ? (doc[currentLang] || doc['en']) : null) || defaultValue || key;

    // 支援簡單的 {{var}} 變數替換
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        if (k !== 'defaultValue' && k !== 'forceString') {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      });
    }
    return text;
  };

  /**
   * 專用於 HTML 屬性 (如 placeholder, title) 的翻譯函式
   * 功能同 tString，但語意更明確
   */
  const tAttr = tString;

  /**
   * 魔改後的翻譯函式 t()
   * 1. 非編輯模式：回傳純字串 (string)
   * 2. 編輯模式：回傳強行置頂、具備點擊攔截功能的 <span> 元件
   */
  const t = (key: string, arg2?: string | Record<string, any>, arg3?: Record<string, any>): any => {
    const text = tString(key, arg2, arg3);
    const options = (typeof arg2 === 'object' && arg2 !== null) ? arg2 : ((typeof arg3 === 'object' && arg3 !== null) ? arg3 : undefined);

    // 模式 A: 非編輯模式，或者強制要求字串模式 (例如在 <option> 內)
    if (!isEditMode || options?.forceString) return text;

    // 模式 B: 編輯模式，注入魔改元件
    const isActive = activeKey === key;
    const isMissing = !translations[key];

    return (
      <span
        key={`i18n-${key}`}
        data-i18n-key={key}
        onClick={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          // 如果已經是選中狀態且是新內碼，嘗試重新整理確保同步
          if (isActive && isMissing) {
            loadTranslations();
          }
          setActiveKey(key);
        }}
        // 核心：即使父層 disabled，也要嘗試接收事件
        style={{ pointerEvents: 'auto' }}
        className={`
          inline-block rounded px-0.5 transition-all duration-200 
          cursor-pointer pointer-events-auto relative z-[9999]
          ${isMissing ? 'border-2 border-dashed border-red-500 bg-red-50/30' : 'hover:bg-indigo-50/50'}
          ${isActive ? 'bg-yellow-200 !border-yellow-500 !border-2 !border-solid ring-2 ring-yellow-400 shadow-lg' : ''}
        `}
        title={isMissing ? `[NEW] Key: ${key}` : `Key: ${key}`}
      >
        {text}
      </span>
    );
  };

  const handleSetActiveKey = (key: string | null) => {
    setActiveKey(key);
    setLastClickTime(Date.now());
  };

  const clearRenderedKeys = () => {
    keyCollector.current.clear();
    setRenderedKeys(new Map());
  };

  return (
    <LanguageContext.Provider value={{ 
      currentLang, setLang, availableLangs, t, tString, tAttr,
      isEditMode, setIsEditMode, activeKey, setActiveKey: handleSetActiveKey,
      lastClickTime,
      loading,
      translations,
      renderedKeys,
      clearRenderedKeys,
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
