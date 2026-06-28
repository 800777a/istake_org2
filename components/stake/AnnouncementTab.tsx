
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings, BillingEngineConfig } from '../../types';
import { subscribeToSettings, saveSettings } from '../../services/sheetService';
import { FileText, Download, Upload, Save, CheckCircle, XCircle } from 'lucide-react';
import { CalculatorOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import ConfirmDialog from '../ConfirmDialog';
import { FeeExplanationSection } from './fee-config/FeeExplanationSection';
import { FeeCalculationModal } from './fee-config/FeeCalculationModal';
import { Modal, Button } from 'antd';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementTabProps {
    settings: GlobalSettings;
}

const AnnouncementTab: React.FC<AnnouncementTabProps> = ({ settings: initialSettings }) => {
    const { t } = useTranslation();
    const [rulesContent, setRulesContent] = useState(initialSettings.rules_content || '');
    const [localSettings, setLocalSettings] = useState<GlobalSettings>(initialSettings);
    const [msg, setMsg] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [sandboxVisible, setSandboxVisible] = useState(false);
    const [isRulesCollapsed, setIsRulesCollapsed] = useState(false);

    const [billingConfig, setBillingConfig] = useState<BillingEngineConfig>(initialSettings.billingConfig || {
        units: initialSettings.units.map(u => ({ shortName: u, fullName: u })),
        baseFees: { 'GLOBAL': 500 },
        unitGroups: {},
        identityPricings: [],
        tripPricings: [],
        specialPromos: [],
        calcStrategy: 'stack',
        roundingToTen: true
    });

    useEffect(() => {
        const unsub = subscribeToSettings((s) => {
            setLocalSettings(s);
            setRulesContent(s.rules_content || '');
            if (s.billingConfig) {
                setBillingConfig(s.billingConfig);
            }
        });
        return () => unsub();
    }, []);

    const handleSaveRules = async () => {
        const newSettings = { ...localSettings, rules_content: rulesContent };
        await saveSettings(newSettings);
        setMsg(t('stake.announcement.alerts.rulesUpdated', '活動辦法已更新'));
        setTimeout(() => setMsg(null), 3000);
    };

    const handleExport = () => {
        const data = { content: rulesContent };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        a.download = `${datePrefix}_${t('stake.announcement.filename.rules_export', 'rules_export')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (data.content !== undefined) {
                    setRulesContent(data.content);
                    setShowConfirm(true);
                } else {
                    setMsg(t('stake.announcement.alerts.importFailedFormat', '匯入失敗：格式不符'));
                }
            } catch (err) {
                setMsg(t('stake.announcement.alerts.importFailedError', '匯入失敗：檔案格式錯誤'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const confirmImport = async () => {
        const newSettings = { ...localSettings, rules_content: rulesContent };
        await saveSettings(newSettings);
        setMsg(t('stake.announcement.alerts.rulesImported', '活動辦法已匯入並更新'));
        setTimeout(() => setMsg(null), 3000);
        setShowConfirm(false);
    };

    return (
        <div className="bg-yellow-50 p-6 rounded-2xl shadow-sm border-2 border-yellow-200 flex flex-col h-full animate-fade-in">
            {msg && (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-xl shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border ${msg.includes(t('common.failed', '失敗')) ? 'bg-red-100 text-red-800 border-red-200' : 'bg-black bg-opacity-80 text-white border-transparent'}`}>
                    {msg.includes(t('common.failed', '失敗')) ? <XCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-6 h-6 mr-3 text-green-400" />}
                    <span className="font-black text-lg">{msg}</span>
                </div>
            )}

            <ConfirmDialog 
                isOpen={showConfirm}
                title={t('stake.announcement.modal.importConfirmTitle', '匯入確認')}
                message={t('stake.announcement.modal.importConfirmMsg', '讀取成功！確定要覆蓋現有內容嗎？')}
                onConfirm={confirmImport}
                onCancel={() => setShowConfirm(false)}
            />

            <div className="flex flex-col mb-6 bg-white/50 p-6 rounded-3xl border border-yellow-100 shadow-sm">
                <div 
                    className="flex items-center justify-between cursor-pointer select-none py-2"
                    onClick={() => setIsRulesCollapsed(!isRulesCollapsed)}
                >
                    <h3 className="font-black text-2xl text-yellow-900 flex items-center mb-0">
                        <FileText className="w-7 h-7 mr-3 text-yellow-600" /> {t('stake.announcement.title.rules', '活動辦法')}
                    </h3>
                    <div className="text-yellow-400">
                        {isRulesCollapsed ? <DownOutlined className="text-xl" /> : <UpOutlined className="text-xl" />}
                    </div>
                </div>

                <AnimatePresence>
                    {!isRulesCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-yellow-200/50">
                                <button onClick={handleExport} className="bg-yellow-100 text-yellow-900 border-2 border-yellow-200 hover:bg-white px-6 py-3 rounded-xl text-sm flex items-center font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                                    <Download className="w-4 h-4 mr-2 text-yellow-600"/> {t('common.exportData', '匯出資料')}
                                </button>
                                <label className="bg-yellow-100 text-yellow-900 border-2 border-yellow-200 hover:bg-white px-6 py-3 rounded-xl text-sm flex items-center cursor-pointer font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                                    <Upload className="w-4 h-4 mr-2 text-yellow-600"/> {t('common.importData', '匯入資料')}
                                    <input type="file" className="hidden" accept=".json" onChange={handleImportFileChange} />
                                </label>
                                <button onClick={handleSaveRules} className="bg-yellow-600 text-white hover:bg-yellow-700 px-8 py-3 rounded-xl text-sm flex items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ml-auto">
                                    <Save className="w-5 h-5 mr-2"/> {t('common.saveSettings', '儲存設定')}
                                </button>
                            </div>
                            
                            <div className="mt-6 bg-white rounded-2xl border-2 border-yellow-200 p-2 shadow-inner min-h-[400px]">
                                <ReactQuill 
                                    theme="snow"
                                    value={rulesContent}
                                    onChange={setRulesContent}
                                    className="h-[350px] mb-12"
                                    placeholder={t('stake.announcement.placeholder.rules', '請輸入活動辦法、注意事項等內容...')}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            [{ 'color': [] }, { 'background': [] }],
                                            ['clean']
                                        ]
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4">
                <FeeExplanationSection 
                    billingConfig={billingConfig} 
                    onOpenCalcModal={() => setSandboxVisible(true)}
                    defaultCollapsed={false}
                />
            </div>

            <Modal
                title={
                    <div className="flex items-center text-amber-900">
                        <CalculatorOutlined className="mr-2" /> {t('stake.fee_config.modal.calculationSandbox', '收費試算 (Fee Calculation Sandbox)')}
                    </div>
                }
                open={sandboxVisible}
                onCancel={() => setSandboxVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setSandboxVisible(false)}>{t('common.close', '關閉 (Close)')}</Button>
                ]}
                width={500}
                styles={{ body: { padding: '24px', backgroundColor: '#FFFBE6' } }}
            >
                <FeeCalculationModal billingConfig={billingConfig} />
            </Modal>
        </div>
    );
};

export default AnnouncementTab;
