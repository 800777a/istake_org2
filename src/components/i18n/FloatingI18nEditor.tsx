import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { 
    X, Save, Download, Upload, Search, RefreshCw, 
    Settings, Globe, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateTranslation, batchUpdateTranslations, TranslationDoc, TranslationRow } from '../../../services/translationService';
import { csvService } from '../../../services/csvService';

const FloatingI18nEditor: React.FC = () => {
  const { 
    isEditMode, setIsEditMode, availableLangs, activeKey, setActiveKey, 
    refreshTranslations, loading 
  } = useI18n();
  
  const [translations, setTranslations] = useState<Record<string, TranslationDoc>>({});
  const [newKeyData, setNewKeyData] = useState<TranslationDoc>({}); // 暫存新內碼的翻譯
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(650); // 預設寬度
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
      // 計算新寬度：視窗寬度 - 滑鼠 X 座標
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < window.innerWidth * 0.9) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // 獲取最新資料
  const loadData = async () => {
    const { fetchAllTranslations } = await import('../../../services/translationService');
    const data = await fetchAllTranslations();
    setTranslations(data);
  };

  useEffect(() => {
    if (isEditMode) loadData();
  }, [isEditMode]);

  // 當 activeKey 變更時自動捲動 或 初始化新內碼區塊
  useEffect(() => {
    if (activeKey) {
      // 1. 檢查是否為現有內碼
      const element = document.querySelector(`[id="${activeKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!translations[activeKey]) {
        // 2. 如果不存在於資料庫，初始化新內碼暫存區
        const initialData: TranslationDoc = {};
        availableLangs.forEach(lang => {
          initialData[lang] = '';
        });
        setNewKeyData(initialData);
      }
    }
  }, [activeKey, translations, availableLangs]);

  if (!isEditMode) {
    return (
      <button
        onClick={() => setIsEditMode(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-50 flex items-center gap-2 group"
      >
        <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        <span className="font-bold text-sm">i18n Editor</span>
      </button>
    );
  }

  const handleUpdate = async (key: string, lang: string, val: string) => {
    const updatedDoc = { ...translations[key], [lang]: val };
    setTranslations(prev => ({ ...prev, [key]: updatedDoc }));
    
    try {
      await updateTranslation(key, { [lang]: val });
      // 同步更新 Context 中的顯示
      refreshTranslations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNewKey = async () => {
    if (!activeKey) return;
    setStatus({ type: 'loading', msg: 'Saving new key...' });
    try {
      await updateTranslation(activeKey, newKeyData);
      await loadData();
      await refreshTranslations();
      setStatus({ type: 'success', msg: 'New key added successfully!' });
      setNewKeyData({}); // 清空暫存
    } catch (e) {
      setStatus({ type: 'error', msg: 'Failed to add new key' });
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
      await loadData();
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
    Object.values(translations[k]).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      style={{ width: `${width}px` }}
      className="fixed top-0 right-0 h-screen max-w-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[100] flex flex-col"
    >
      {/* Resize Handle (Left Edge) */}
      <div
        onMouseDown={startResizing}
        className="absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500/40 transition-colors z-50 group"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-0.5 h-8 bg-indigo-300 rounded-full" />
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
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
          >
            <Download size={16} /> Export
          </button>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          
          <button 
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Refresh from Firestore"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

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
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
        {/* 新內碼初始化區塊 */}
        {activeKey && !translations[activeKey] && Object.keys(newKeyData).length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-indigo-900 text-white shadow-xl border border-indigo-700 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Globe size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-indigo-200">
                <AlertCircle size={18} />
                <span className="text-xs font-black uppercase tracking-tighter">偵測到全新內碼，請初始化翻譯</span>
              </div>
              
              <div className="mb-4">
                <code className="text-sm font-black bg-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-700">
                  {activeKey}
                </code>
              </div>

              <div className="space-y-4 mb-6">
                {availableLangs.map(lang => (
                  <div key={lang} className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase ml-1">{lang}</span>
                    <input
                      type="text"
                      value={newKeyData[lang] || ''}
                      onChange={(e) => setNewKeyData(prev => ({ ...prev, [lang]: e.target.value }))}
                      className="w-full p-3 bg-indigo-800/50 border border-indigo-700 rounded-xl text-sm text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      placeholder={`Enter ${lang} translation...`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveNewKey}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-indigo-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
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
              id={key}
              className={`p-4 rounded-2xl border transition-all ${
                activeKey === key 
                  ? 'bg-white shadow-xl border-indigo-200 ring-2 ring-indigo-500/20' 
                  : 'bg-white/50 border-gray-100 hover:border-indigo-100 hover:shadow-md'
              }`}
              onClick={() => setActiveKey(key)}
            >
              <div className="flex items-center justify-between mb-4">
                <code className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  {key}
                </code>
                {activeKey === key && (
                  <span className="text-[10px] font-bold text-indigo-400 animate-pulse">EDITING</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {availableLangs.map(lang => (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center gap-2 ml-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{lang}</span>
                    </div>
                    <textarea
                      value={translations[key][lang] || ''}
                      onChange={(e) => handleUpdate(key, lang, e.target.value)}
                      className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all min-h-[60px] resize-none"
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
