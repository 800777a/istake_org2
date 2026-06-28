
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Download, Upload, RefreshCw, UploadCloud, Loader, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, getSettings, migrateToCloud, subscribeToEvents } from '../../services/sheetService';
import { getDocs, collection } from 'firebase/firestore';
import ConfirmDialog from '../ConfirmDialog';

const BackupTab: React.FC = () => {
    const { t } = useTranslation();
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

    // Rainbow Schemes
    const rainbowSchemes = [
        { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-200' },
        { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200' },
        { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-200' },
        { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-200' },
        { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200' },
        { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-200' },
        { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-200' },
    ];

    const getBtnStyle = (idx: number) => {
        const s = rainbowSchemes[idx % rainbowSchemes.length];
        return `${s.bg} ${s.text} ${s.border} border-2 hover:brightness-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`;
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
        <div className="space-y-8 animate-fade-in p-2 md:p-8">
            {/* Header Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-indigo-50">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-indigo-50">
                    <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white mr-4 shadow-lg shadow-indigo-100">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800">{t('stake.backup.title.backupRestore', '備份還原')}</h2>
                            <p className="text-sm font-bold text-gray-500">{t('stake.backup.desc.backupRestore', '管理雲端資料的同步、匯出、匯入與災難重建')}</p>
                        </div>
                    </div>
                </div>

                {/* Control Buttons - Sequential colors */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <button 
                        onClick={() => setConfirmAction({ type: 'sync' })}
                        disabled={isProcessing}
                        className={`flex items-center justify-center px-6 py-4 rounded-2xl font-black text-sm w-full md:w-auto h-16 min-w-[180px] ${getBtnStyle(0)}`}
                    >
                        {isProcessing ? <Loader className="w-5 h-5 mr-3 animate-spin" /> : <RefreshCw className="w-5 h-5 mr-3" />}
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
                        className={`flex items-center justify-center px-6 py-4 rounded-2xl font-black text-sm w-full md:w-auto h-16 min-w-[180px] ${getBtnStyle(1)}`}
                    >
                        <Download className="w-5 h-5 mr-3" />
                        {t('stake.backup.button.exportJson', '匯出 JSON')}
                    </button>

                    <label 
                        className={`flex items-center justify-center px-6 py-4 rounded-2xl font-black text-sm w-full md:w-auto h-16 min-w-[180px] cursor-pointer ${getBtnStyle(2)}`}
                    >
                        <Upload className="w-5 h-5 mr-3" />
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
                        className={`flex items-center justify-center px-6 py-4 rounded-2xl font-black text-sm w-full md:w-auto h-16 min-w-[180px] ${getBtnStyle(3)}`}
                    >
                        <UploadCloud className="w-5 h-5 mr-3" />
                        {t('stake.backup.button.rebuildCloud', '重建雲端')}
                    </button>
                </div>

                {/* Editor Area */}
                <div className="relative group">
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-gray-800/80 text-white text-[10px] px-3 py-1.5 rounded-full font-black">
                            {t('stake.backup.label.editorArea', '資料預覽編輯區')}
                        </span>
                    </div>
                    <div className="bg-gray-900 rounded-[1.5rem] p-1 shadow-2xl">
                        <textarea 
                            className="w-full h-[500px] bg-transparent text-green-400 font-mono text-xs p-8 focus:ring-0 outline-none resize-none leading-relaxed"
                            value={cloudDataJson}
                            onChange={(e) => setCloudDataJson(e.target.value)}
                            placeholder={t('stake.backup.placeholder.editorArea', '請點擊上方按鈕獲取雲端資料...')}
                        />
                    </div>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmDialog 
                isOpen={confirmAction?.type === 'sync'}
                title={t('stake.backup.modal.syncConfirmTitle', '雲端資料同步')}
                message={t('stake.backup.modal.syncConfirmMsg', '確定要從雲端伺服器下載最新資料嗎？這將覆蓋目前編輯區的內容。')}
                onConfirm={handleSync}
                onCancel={() => setConfirmAction(null)}
            />
            
            <ConfirmDialog 
                isOpen={confirmAction?.type === 'export'}
                title={t('stake.backup.modal.exportConfirmTitle', '資料匯出確認')}
                message={t('stake.backup.modal.exportConfirmMsg', '確定要將編輯區的內容下載為 JSON 檔案進行備份嗎？')}
                onConfirm={handleExport}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'import'}
                title={t('stake.backup.modal.importConfirmTitle', '載入外部資料')}
                message={t('stake.backup.modal.importConfirmMsg', '確定要載入此 JSON 檔案到編輯區嗎？此操作僅載入至畫面，尚未寫入雲端。')}
                onConfirm={executeImport}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'rebuild'}
                title={t('stake.backup.modal.rebuildConfirmTitle', '重建雲端資料庫')}
                message={
                    <div className="space-y-4">
                        <p className="font-black text-red-600">{t('stake.backup.modal.rebuildDangerLabel', '⚠ 極度危險的操作：')}</p>
                        <p>{t('stake.backup.modal.rebuildWarningMsg', '系統將把編輯區內的 JSON 資料「完整覆蓋」目前的雲端資料庫。')}</p>
                        <p className="font-bold bg-yellow-100 p-2 rounded">{t('stake.backup.modal.rebuildAdvice', '建議在執行前先備份目前雲端資料！')}</p>
                        <p>{t('stake.backup.modal.rebuildConfirmFinal', '確定要執行重建嗎？')}</p>
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
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-12 left-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center font-black ${msg.includes(t('common.failed', '失敗')) ? 'bg-red-600 text-white' : 'bg-black/90 text-white'}`}
                    >
                        {msg.includes(t('common.failed', '失敗')) ? <AlertTriangle className="w-5 h-5 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3 text-green-400" />}
                        {msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BackupTab;
