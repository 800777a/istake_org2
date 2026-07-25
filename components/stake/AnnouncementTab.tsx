
import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { GlobalSettings, BillingEngineConfig } from '../../types';
import { subscribeToSettings, saveSettings } from '../../services/sheetService';
import { FileText, Download, Upload, Save, CheckCircle, XCircle, Info, Settings, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { CalculatorOutlined } from '@ant-design/icons';
import ConfirmDialog from '../ConfirmDialog';
import { FeeExplanationSection } from './fee-config/FeeExplanationSection';
import { FeeCalculationModal } from './fee-config/FeeCalculationModal';
import { RainbowCard, rainbowStyles } from './fee-config/RainbowCard';
import { Modal, Button } from 'antd';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementTabProps {
    settings: GlobalSettings;
}

const AnnouncementTab: React.FC<AnnouncementTabProps> = ({ settings: initialSettings }) => {
    const { t, tString } = useI18n();
    const [rulesContent, setRulesContent] = useState(initialSettings.rules_content || '');
    const [localSettings, setLocalSettings] = useState<GlobalSettings>(initialSettings);
    const [msg, setMsg] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [sandboxVisible, setSandboxVisible] = useState(false);
    const [isRulesExpanded, setIsRulesExpanded] = useState(true);

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
        <div className="animate-fade-in space-y-6">
            {msg && (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-xl shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border ${msg.includes(t('common.failed', '失敗')) ? 'bg-red-100 text-red-800 border-red-200' : 'bg-black bg-opacity-80 text-white border-transparent'}`}>
                    {msg.includes(t('common.failed', '失敗')) ? <XCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-6 h-6 mr-3 text-green-400" />}
                    <span className="font-black text-lg">{msg}</span>
                </div>
            )}

            <ConfirmDialog 
                isOpen={showConfirm}
                title={tString('stake.announcement.modal.importConfirmTitle', '匯入確認')}
                message={t('stake.announcement.modal.importConfirmMsg', '讀取成功！確定要覆蓋現有內容嗎？')}
                onConfirm={confirmImport}
                onCancel={() => setShowConfirm(false)}
            />

            {/* Page Title Row - Independent */}
            <div className="bg-indigo-900 text-white px-6 py-4 rounded-lg shadow-md flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                    <FileText className="text-blue-300" size={24} />
                </div>
                <div>
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                        {t('stake.announcement.title.rules', '活動辦法')}
                    </h2>
                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider opacity-60">
                        Event Rules & Guidelines Management
                    </p>
                </div>
            </div>

            <RainbowCard
                title={t('stake.announcement.title.rules', '活動辦法內容')}
                icon={<Settings size={20} />}
                colorIndex={0} // Red
                isExpanded={isRulesExpanded}
                onToggle={() => setIsRulesExpanded(!isRulesExpanded)}
            >
                <div className="space-y-4">
                    {/* Buttons Row - Below Title, Right Aligned */}
                    <div className="flex flex-wrap justify-end gap-3 w-full">
                        <button 
                            onClick={handleExport} 
                            className="h-12 md:h-11 lg:h-10 px-6 md:px-5 lg:px-5 rounded-lg text-base md:text-sm lg:text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                            style={{ 
                                backgroundColor: rainbowStyles[0].bg,
                                color: rainbowStyles[0].text,
                                border: `1px solid ${rainbowStyles[0].border}`
                            }}
                        >
                            <Download size={16} /> {t('common.exportData', '匯出資料')}
                        </button>
                        <label 
                            className="h-12 md:h-11 lg:h-10 px-6 md:px-5 lg:px-5 rounded-lg text-base md:text-sm lg:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                            style={{ 
                                backgroundColor: rainbowStyles[0].bg,
                                color: rainbowStyles[0].text,
                                border: `1px solid ${rainbowStyles[0].border}`
                            }}
                        >
                            <Upload size={16} /> {t('common.importData', '匯入資料')}
                            <input type="file" className="hidden" accept=".json" onChange={handleImportFileChange} />
                        </label>
                        <button 
                            onClick={handleSaveRules} 
                            className="h-12 md:h-11 lg:h-10 px-8 md:px-6 lg:px-6 bg-blue-600 text-white rounded-lg text-base md:text-sm lg:text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <Save size={16} /> {t('common.saveSettings', '儲存設定')}
                        </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 p-2 shadow-inner min-h-[400px]">
                        <ReactQuill 
                            theme="snow"
                            value={rulesContent}
                            onChange={setRulesContent}
                            className="h-[350px] mb-12"
                            placeholder={tString('stake.announcement.placeholder.rules', '請輸入活動辦法、注意事項等內容...')}
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
                </div>
            </RainbowCard>

            <div className="mt-4">
                <FeeExplanationSection 
                    billingConfig={billingConfig} 
                    onOpenCalcModal={() => setSandboxVisible(true)}
                    defaultCollapsed={false}
                    colorIndex={1}
                />
            </div>

            <Modal
                title={
                    <div className="flex items-center text-indigo-900 font-bold">
                        <Calculator size={20} className="mr-2 text-indigo-600" /> {t('stake.fee_config.modal.calculationSandbox', '收費試算 (Fee Calculation Sandbox)')}
                    </div>
                }
                open={sandboxVisible}
                onCancel={() => setSandboxVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setSandboxVisible(false)} className="bg-indigo-600">
                        {t('common.close', '關閉 (Close)')}
                    </Button>
                ]}
                width={600}
                styles={{ body: { padding: '24px' } }}
            >
                <FeeCalculationModal billingConfig={billingConfig} />
            </Modal>
        </div>
    );
};

export default AnnouncementTab;
