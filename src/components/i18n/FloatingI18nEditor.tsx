import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { 
    X, Save, Download, Upload, Search, RefreshCw, 
    Settings, Globe, AlertCircle, CheckCircle2, Eye 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateTranslation, batchUpdateTranslations, TranslationDoc, TranslationRow } from '../../../services/translationService';
import { csvService } from '../../../services/csvService';

const FloatingI18nEditor: React.FC = () => {
  const { 
    isEditMode, setIsEditMode, availableLangs, activeKey, setActiveKey, 
    refreshTranslations, loading, translations, lastClickTime, renderedKeys,
    clearRenderedKeys
  } = useI18n();
  
  const [newKeyData, setNewKeyData] = useState<TranslationDoc>({}); // 暫存新內碼的翻譯
  const [editingData, setEditingData] = useState<Record<string, TranslationDoc>>({}); // 暫存正在編輯的現有內碼，避免打字延遲
  const lastActiveKey = React.useRef<string | null>(null);
  const [showVisibleKeys, setShowVisibleKeys] = useState(false);
  const [search, setSearch] = useState('');
  // 初始化寬度：從 localStorage 讀取或預設 500
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('i18n_panel_width');
    return saved ? parseInt(saved, 10) : 500;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, msg: string }>({ type: null, msg: '' });
  const editorRef = useRef<HTMLDivElement>(null);

  // 寬度縮放處理邏輯
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 350 && newWidth < window.innerWidth * 0.9) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('i18n_panel_width', width.toString());
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, width]);

  // 移除多餘的 loadData，統一使用 Context
  useEffect(() => {
    if (isEditMode) refreshTranslations();
  }, [isEditMode]);

  // 當 activeKey 變更時自動捲動 或 初始化新內碼區塊
  useEffect(() => {
    if (activeKey) {
      // 延遲執行以確保 DOM 已渲染 (尤其是剛從 "新內碼" 變更為 "現有內碼" 時)
      const timer = setTimeout(() => {
        let element = null;
        if (!translations[activeKey]) {
          // 如果是新內碼，優先捲動到新內碼區塊
          element = document.getElementById('i18n-new-key-block');
          if (!element) {
             // 如果找不到區塊，直接捲到最上方
             const container = document.getElementById('i18n-editor-container');
             if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          // 如果是現有內碼，捲動到對應行
          const editorRowId = `i18n-editor-row-${activeKey}`;
          element = document.getElementById(editorRowId);
        }

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      
      // 如果不存在於資料庫，初始化新內碼暫存區
      if (!translations[activeKey]) {
        // 只有在 activeKey 真的變更時才重置，避免重複點擊同一個新內碼導致輸入內容丟失
        if (lastActiveKey.current !== activeKey) {
          const initialData: TranslationDoc = {};
          availableLangs.forEach(lang => {
            initialData[lang] = '';
          });
          setNewKeyData(initialData);
          lastActiveKey.current = activeKey;
        }
      } else {
        // 如果是現有內碼，將當前值放入編輯暫存
        setEditingData(prev => ({ ...prev, [activeKey]: translations[activeKey] }));
        lastActiveKey.current = activeKey;
      }
      return () => clearTimeout(timer);
    }
  }, [activeKey, lastClickTime, translations, availableLangs]);

  if (!isEditMode) {
    return null;
  }

  const handleUpdateLocal = (key: string, lang: string, val: string) => {
    setEditingData(prev => ({
      ...prev,
      [key]: { ...(prev[key] || translations[key]), [lang]: val }
    }));
  };

  const handleSaveUpdate = async (key: string) => {
    const data = editingData[key];
    if (!data) return;
    
    setStatus({ type: 'loading', msg: 'Saving changes...' });
    try {
      await updateTranslation(key, data);
      await refreshTranslations();
      setStatus({ type: 'success', msg: 'Saved successfully!' });
    } catch (e) {
      setStatus({ type: 'error', msg: 'Save failed' });
    } finally {
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    }
  };

  const handleSaveNewKey = async () => {
    if (!activeKey) return;
    setStatus({ type: 'loading', msg: 'Saving new key...' });
    try {
      await updateTranslation(activeKey, newKeyData);
      await refreshTranslations();
      setStatus({ type: 'success', msg: 'New key added successfully!' });
      
      // 成功後將暫存區清空
      setNewKeyData({}); 
      
      // 稍微延遲後，如果 activeKey 還在，它現在應該是「現有內碼」了
      // 我們不需要特別處理，因為 translations[activeKey] 現在應該已經有值了
      // 但保險起見，我們強制更新一次 editingData
      setTimeout(() => {
        if (activeKey && translations[activeKey]) {
          setEditingData(prev => ({ ...prev, [activeKey]: translations[activeKey] }));
        }
      }, 300);
      
    } catch (e) {
      setStatus({ type: 'error', msg: 'Failed to add new key' });
    } finally {
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    }
  };

  const handleBatchImport = async () => {
    const newKeys = Array.from(renderedKeys.entries()).filter(([key]) => !translations[key]);
    if (newKeys.length === 0) {
      setStatus({ type: 'success', msg: '沒有新的內碼需要導入' });
      return;
    }

    setStatus({ type: 'loading', msg: `正在導入 ${newKeys.length} 筆資料...` });
    try {
      const rows: TranslationRow[] = newKeys.map(([key, defaultValue]) => {
        const row: any = { string_key: key };
        availableLangs.forEach(lang => {
          row[lang] = (lang === 'zh-TW') ? defaultValue : (lang === 'en-US' ? key : '');
        });
        return row as TranslationRow;
      });

      await batchUpdateTranslations(rows);
      await refreshTranslations();
      setStatus({ type: 'success', msg: `成功導入 ${newKeys.length} 筆原始文字！` });
    } catch (e) {
      console.error('Batch import error:', e);
      setStatus({ type: 'error', msg: '導入失敗' });
    } finally {
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    }
  };

  const handleExport = () => {
    const rows: TranslationRow[] = Object.entries(translations).map(([key, doc]) => ({
      string_key: key,
      ...doc
    }));
    csvService.exportToCsv(rows, `translations_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', msg: 'Importing...' });
    try {
      const rows = await csvService.parseCsv(file);
      await batchUpdateTranslations(rows);
      await refreshTranslations();
      setStatus({ type: 'success', msg: 'Import successful!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Import failed' });
    } finally {
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
      e.target.value = '';
    }
  };

  const filteredKeys = Object.keys(translations).filter(k => 
    k.toLowerCase().includes(search.toLowerCase()) || 
    Object.values(translations[k]).some(v => String(v).toLowerCase().includes(search.toLowerCase())) ||
    (renderedKeys.get(k) && renderedKeys.get(k)!.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      style={{ width: `${width}px` }}
      className="h-screen flex-shrink-0 bg-white border-l border-gray-200 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] relative z-[100] flex flex-col overflow-hidden"
    >
      {/* 專業分割線 (Tailwind 版) */}
      <div
        onMouseDown={startResizing}
        className={`
          absolute left-0 top-0 w-1.5 h-full cursor-col-resize z-[101]
          transition-colors group
          ${isResizing ? 'bg-indigo-500' : 'hover:bg-indigo-300'}
        `}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none">
          <div className="w-1 h-12 bg-white rounded-full shadow-sm" />
        </div>
      </div>
      {/* Header */}
      <div className="p-6 border-b bg-indigo-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
            <Globe className="text-indigo-600" />
            i18n Management
          </h2>
          <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">
            Real-time visual translation editor
          </p>
        </div>
        <button 
          onClick={() => setIsEditMode(false)}
          className="p-2 hover:bg-white rounded-full transition-colors text-indigo-300 hover:text-indigo-600"
        >
          <X size={24} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search keys or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        {activeKey && (
          <button 
            onClick={() => setActiveKey(null)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm font-bold hover:bg-gray-200 transition-all"
          >
            <X size={16} /> Clear Selection
          </button>
        )}
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowVisibleKeys(!showVisibleKeys)}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${
              showVisibleKeys ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            }`}
            title="Show keys visible on current page"
          >
            <Eye size={16} /> 
            <span className="hidden sm:inline">偵測內碼 ({renderedKeys.size})</span>
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded text-sm font-bold hover:bg-indigo-100 transition-all"
          >
            <Download size={16} /> Export
          </button>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 transition-all cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          
          <button 
            onClick={() => refreshTranslations()}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Refresh from Firestore"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Visible Keys Quick Access Panel */}
      {showVisibleKeys && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 max-h-[200px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">目前畫面上偵測到的內碼</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBatchImport}
                className="text-[10px] text-green-600 hover:text-green-700 font-black flex items-center gap-1"
                title="將所有偵測到的原始文字導入 zh-TW"
              >
                <CheckCircle2 size={10} /> 全部導入原始文字
              </button>
              <button 
                onClick={() => { clearRenderedKeys(); setShowVisibleKeys(false); }}
                className="text-[10px] text-indigo-400 hover:text-indigo-600 font-bold"
              >
                清空清單
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {Array.from(renderedKeys.entries()).map(([key, defaultValue]) => (
              <div key={key} className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveKey(key)}
                  className={`w-full px-3 py-2 rounded text-xs font-bold transition-all text-left flex items-center justify-between ${
                    activeKey === key 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white border border-indigo-200 text-indigo-600 hover:border-indigo-400'
                  }`}
                >
                  <div className="truncate flex-1 mr-2">
                    <span className="opacity-70 text-[10px] mr-2">#{key}</span>
                    <span className="font-medium text-current">{defaultValue}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!translations[key] && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] italic">new</span>}
                    <Eye size={10} />
                  </div>
                </button>
              </div>
            ))}
            {renderedKeys.size === 0 && (
              <p className="text-xs text-indigo-300 italic w-full text-center py-4">尚未偵測到內碼，請在頁面上點擊或捲動...</p>
            )}
          </div>
        </div>
      )}

      {/* Status Msg */}
      <AnimatePresence>
        {status.type && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-6 py-2 flex items-center gap-2 text-xs font-bold ${
              status.type === 'success' ? 'bg-green-50 text-green-600' : 
              status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div 
        id="i18n-editor-container"
        className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50"
      >
        {/* 新內碼初始化區塊 */}
        {activeKey && !translations[activeKey] && Object.keys(newKeyData).length > 0 && (
          <motion.div
            id="i18n-new-key-block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded bg-indigo-900 text-white shadow-xl border border-indigo-700 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Globe size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-200">
                  <AlertCircle size={18} />
                  <span className="text-xs font-black uppercase tracking-tighter">偵測到全新內碼，請初始化翻譯</span>
                </div>
                {renderedKeys.has(activeKey) && (
                  <button
                    onClick={() => {
                      const originalText = renderedKeys.get(activeKey);
                      if (originalText) {
                        setNewKeyData(prev => ({ ...prev, ['zh-TW']: originalText }));
                      }
                    }}
                    className="text-[10px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-white/10 px-2 py-1 rounded transition-colors"
                  >
                    <RefreshCw size={10} /> 填入原始文字 (zh-TW)
                  </button>
                )}
              </div>
              
              <div className="mb-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">系統代碼(內碼)</span>
                <code className="text-sm font-black bg-indigo-800 px-3 py-1.5 rounded border border-indigo-700">
                  {activeKey}
                </code>
              </div>

              <div className="space-y-4 mb-6">
                {availableLangs.map(lang => (
                  <div key={lang} className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase ml-1">
                      {lang === 'en' ? 'English(EN)' : lang === 'zh-TW' ? '繁體中文(ZH)' : lang}
                    </span>
                    <input
                      type="text"
                      value={newKeyData[lang] || ''}
                      onChange={(e) => setNewKeyData(prev => ({ ...prev, [lang]: e.target.value }))}
                      className="w-full p-3 bg-indigo-800/50 border border-indigo-700 rounded text-sm text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      placeholder={`Enter ${lang} translation...`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveNewKey}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-indigo-950 font-black rounded shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                新增至資料庫
              </button>
            </div>
          </motion.div>
        )}

        {filteredKeys.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>No translations found</p>
          </div>
        ) : (
          filteredKeys.map((key) => (
            <div 
              key={key} 
              id={`i18n-editor-row-${key}`}
              className={`p-4 rounded border transition-all ${
                activeKey === key 
                  ? 'bg-white shadow-xl border-indigo-200 ring-2 ring-indigo-500/20' 
                  : 'bg-white/50 border-gray-100 hover:border-indigo-100 hover:shadow-md'
              }`}
              onClick={() => setActiveKey(key)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">系統代碼(內碼)</span>
                    <code className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                      {key}
                    </code>
                  </div>
                  {renderedKeys.has(key) && (
                    <div className="text-sm font-bold text-gray-800 leading-tight">
                      {renderedKeys.get(key)}
                    </div>
                  )}
                </div>
                {activeKey === key && (
                  <span className="text-[10px] font-bold text-indigo-400 animate-pulse">EDITING</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {availableLangs.map(lang => (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center gap-2 ml-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {lang === 'en' ? 'English(EN)' : lang === 'zh-TW' ? '繁體中文(ZH)' : lang}
                      </span>
                    </div>
                    <textarea
                      value={(editingData[key] ? editingData[key][lang] : translations[key][lang]) || ''}
                      onChange={(e) => handleUpdateLocal(key, lang, e.target.value)}
                      onBlur={() => handleSaveUpdate(key)}
                      className="w-full p-3 bg-white border border-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all min-h-[60px] resize-none"
                      placeholder={`Translation for ${lang}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default FloatingI18nEditor;
