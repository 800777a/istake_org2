
import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Database, Download, Upload, RefreshCw, UploadCloud, Loader, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, getSettings, migrateToCloud, subscribeToEvents } from '../../services/sheetService';
import { getDocs, collection } from 'firebase/firestore';
import ConfirmDialog from '../ConfirmDialog';

const BackupTab: React.FC = () => {
    const { t, tString } = useI18n();
    const [cloudDataJson, setCloudDataJson] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [appVersion, setAppVersion] = useState('');
    
    // Dialog State
    const [confirmAction, setConfirmAction] = useState<{
        type: 'sync' | 'export' | 'import' | 'rebuild',
        payload?: any
    } | null>(null);

    useEffect(() => {
        const s = getSettings();
        setAppVersion(s.app_version || 'V 1.0.0');
    }, []);

    const showToast = (message: string) => {
        setMsg(message);
        setTimeout(() => setMsg(null), 3000);
    };

    // --- Action Handlers ---

    const handleSync = async () => {
        setConfirmAction(null);
        setIsProcessing(true);
        setMsg(t('stake.backup.alerts.downloadingCloudData', '正在下載雲端資料...'));
        try {
            const eventsSnap = await getDocs(collection(db, 'events'));
            const regsSnap = await getDocs(collection(db, 'registrations'));
            const settingsSnap = await getDocs(collection(db, 'settings'));
            const usersSnap = await getDocs(collection(db, 'users'));
            const blacklistSnap = await getDocs(collection(db, 'blacklist')).catch(() => ({ docs: [] }));
            const personalInfoSnap = await getDocs(collection(db, 'personal_info')).catch(() => ({ docs: [] }));
            const representativesSnap = await getDocs(collection(db, 'representatives')).catch(() => ({ docs: [] }));

            const data = {
                events: eventsSnap.docs.map(d => d.data()),
                registrations: regsSnap.docs.map(d => d.data()),
                settings: settingsSnap.docs.length > 0 ? settingsSnap.docs[0].data() : {},
                users: usersSnap.docs.map(d => d.data()),
                blacklist: blacklistSnap.docs.map(d => d.data()),
                personalInfo: personalInfoSnap.docs.map(d => d.data()),
                representatives: representativesSnap.docs.map(d => d.data())
            };

            setCloudDataJson(JSON.stringify(data, null, 2));
            showToast(t('stake.backup.alerts.cloudSyncSuccess', '雲端資料已下載同步完成'));
        } catch (e: any) {
            showToast(t('stake.backup.alerts.downloadFailed', '下載失敗: {{error}}', { error: e.message }));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = () => {
        const blob = new Blob([cloudDataJson], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        a.download = `backup_${appVersion}_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setConfirmAction(null);
        showToast(t('stake.backup.alerts.exportSuccess', '匯出檔案成功'));
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setConfirmAction({ type: 'import', payload: file });
        e.target.value = '';
    };

    const executeImport = () => {
        const file = confirmAction?.payload;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result as string;
                JSON.parse(text); 
                setCloudDataJson(text);
                showToast(t('stake.backup.alerts.importSuccess', '資料已成功載入編輯區'));
            } catch(e) {
                showToast(t('stake.backup.alerts.importFailedJsonError', '匯入失敗：JSON 格式錯誤'));
            }
        };
        reader.readAsText(file);
        setConfirmAction(null);
    };

    const handleRebuild = async () => {
        setConfirmAction(null);
        setIsProcessing(true);
        setMsg(t('stake.backup.alerts.rebuildingCloudData', '正在重構雲端資料庫...'));
        try {
            const data = JSON.parse(cloudDataJson);
            const migrationPayload = {
                events: data.events,
                regs: data.registrations || data.regs,
                settings: data.settings,
                users: data.users,
                blacklist: data.blacklist,
                personalInfo: data.personalInfo,
                representatives: data.representatives
            };

            const result = await migrateToCloud(migrationPayload, (p) => setMsg(p));
            showToast(result.message);
        } catch (e: any) {
            showToast(t('stake.backup.alerts.rebuildFailed', '重建失敗: {{error}}', { error: e.message }));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center">
                        <div className="w-12 h-12 rounded bg-slate-900 flex items-center justify-center text-white mr-4">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{t('stake.backup.title.backupRestore', '備份還原')}</h2>
                            <p className="text-sm text-slate-500">{t('stake.backup.desc.backupRestore', '管理雲端資料的同步、匯出、匯入與災難重建')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">App Version</span>
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-600">{appVersion}</span>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <button 
                        onClick={() => setConfirmAction({ type: 'sync' })}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 text-white rounded font-bold text-sm hover:bg-sky-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {t('stake.backup.button.cloudSync', '雲端同步')}
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (!cloudDataJson) {
                                showToast(t('stake.backup.alerts.pleaseSyncFirst', '請先進行雲端同步或載入資料'));
                                return;
                            }
                            setConfirmAction({ type: 'export' });
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        {t('stake.backup.button.exportJson', '匯出 JSON')}
                    </button>

                    <label 
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Upload className="w-4 h-4" />
                        {t('stake.backup.button.importJson', '匯入 JSON')}
                        <input type="file" className="hidden" accept=".json" onChange={handleImportFileChange} />
                    </label>

                    <button 
                        onClick={() => {
                            if (!cloudDataJson) {
                                showToast(t('stake.backup.alerts.noDataToRebuild', '編輯區無資料可供重建'));
                                return;
                            }
                            setConfirmAction({ type: 'rebuild' });
                        }}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded font-bold text-sm hover:bg-rose-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <UploadCloud className="w-4 h-4" />
                        {t('stake.backup.button.rebuildCloud', '重建雲端')}
                    </button>
                </div>

                {/* Editor Area */}
                <div className="relative group border border-slate-200 rounded overflow-hidden bg-slate-900">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">JSON DATA PREVIEW</span>
                        </div>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(cloudDataJson);
                                showToast('已複製到剪貼簿');
                            }}
                            className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            COPY
                        </button>
                    </div>
                    <textarea 
                        className="w-full h-[500px] bg-transparent text-emerald-400 font-mono text-[11px] p-6 focus:ring-0 outline-none resize-none leading-relaxed"
                        value={cloudDataJson}
                        onChange={(e) => setCloudDataJson(e.target.value)}
                        placeholder={tString('stake.backup.placeholder.editorArea', '請點擊上方按鈕獲取雲端資料...')}
                    />
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmDialog 
                isOpen={confirmAction?.type === 'sync'}
                title={tString('stake.backup.modal.syncConfirmTitle', '雲端資料同步')}
                message={t('stake.backup.modal.syncConfirmMsg', '確定要從雲端伺服器下載最新資料嗎？這將覆蓋目前編輯區的內容。')}
                onConfirm={handleSync}
                onCancel={() => setConfirmAction(null)}
            />
            
            <ConfirmDialog 
                isOpen={confirmAction?.type === 'export'}
                title={tString('stake.backup.modal.exportConfirmTitle', '資料匯出確認')}
                message={t('stake.backup.modal.exportConfirmMsg', '確定要將編輯區的內容下載為 JSON 檔案進行備份嗎？')}
                onConfirm={handleExport}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'import'}
                title={tString('stake.backup.modal.importConfirmTitle', '載入外部資料')}
                message={t('stake.backup.modal.importConfirmMsg', '確定要載入此 JSON 檔案到編輯區嗎？此操作僅載入至畫面，尚未寫入雲端。')}
                onConfirm={executeImport}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'rebuild'}
                title={tString('stake.backup.modal.rebuildConfirmTitle', '重建雲端資料庫')}
                message={
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-rose-600 font-bold">
                            <AlertTriangle size={18} />
                            <span>{t('stake.backup.modal.rebuildDangerLabel', '⚠ 極度危險的操作：')}</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{t('stake.backup.modal.rebuildWarningMsg', '系統將把編輯區內的 JSON 資料「完整覆蓋」目前的雲端資料庫。')}</p>
                        <p className="bg-amber-50 border border-amber-100 p-3 rounded text-amber-800 text-xs font-medium">{t('stake.backup.modal.rebuildAdvice', '建議在執行前先備份目前雲端資料！')}</p>
                        <p className="text-slate-900 font-bold">{t('stake.backup.modal.rebuildConfirmFinal', '確定要執行重建嗎？')}</p>
                    </div>
                }
                isDangerous={true}
                onConfirm={handleRebuild}
                onCancel={() => setConfirmAction(null)}
            />

            {/* Global Message Toast */}
            <AnimatePresence>
                {msg && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]"
                    >
                        <div className={`px-4 py-2.5 rounded shadow-xl flex items-center gap-3 font-bold text-sm ${msg.includes(t('common.failed', '失敗')) ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
                            {msg.includes(t('common.failed', '失敗')) ? <AlertTriangle size={16} /> : <CheckCircle size={16} className="text-emerald-400" />}
                            {msg}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BackupTab;
