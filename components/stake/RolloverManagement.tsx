import React, { useState } from 'react';
import { Clock, Download, Upload, Info, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Registration, RegStatus, PaymentMethod } from '../../types';
import { batchImportRegistrations } from '../../services/registrationService';
import Toast from '../Toast';

interface RolloverManagementProps {
    registrations: Registration[];
    currentEventId: string;
    onRefresh: () => void;
}

const RolloverManagement: React.FC<RolloverManagementProps> = ({ registrations, currentEventId, onRefresh }) => {
    const { t } = useI18n();
    const [isProcessing, setIsProcessing] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

    const retainedCount = registrations.filter(r => r.status === RegStatus.RETAINED).length;

    const handleExportRetained = () => {
        const retainedList = registrations.filter(r => r.status === RegStatus.RETAINED);
        if (retainedList.length === 0) {
            setMsg('目前沒有留用名單可供匯出');
            setMsgType('info');
            return;
        }

        const dataStr = JSON.stringify(retainedList, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retained_list_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleImportRetainedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (Array.isArray(data)) {
                    const processedData = data.map(r => ({
                        ...r,
                        amount_due: 0,
                        payment_method: PaymentMethod.EXTENDED,
                        status: RegStatus.NORMAL,
                        is_paid: true,
                        reg_id: `R-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        created_at: new Date().toISOString()
                    }));

                    const result = await batchImportRegistrations(processedData, currentEventId);
                    if (result.success) {
                        setMsgType('success');
                        setMsg(`成功匯入 ${result.count} 筆資料。金額已歸零，付款方式已設為「延用」且「已收」。`);
                        onRefresh();
                    } else {
                        setMsgType('error');
                        setMsg(result.message || '匯入失敗');
                    }
                } else {
                    setMsgType('error');
                    setMsg('格式錯誤：需為 JSON 陣列');
                }
            } catch (err) {
                setMsgType('error');
                setMsg('檔案讀取失敗');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden animate-fade-in mb-8">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            
            {/* Header Row */}
            <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center border-b border-indigo-950">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/10 rounded border border-white/10">
                        <Clock className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base md:text-lg tracking-tight">
                            {t('stake.registration.retained_mgmt', '留用管理 (Roll over Management)')}
                        </h3>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Historical Credit & Seat Rollover</p>
                    </div>
                </div>
                <div className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    {retainedCount} 位留用
                </div>
            </div>

            <div className="p-6 space-y-6 bg-[#F0F4F8]/10">
                {/* Description Box */}
                <div className="flex gap-4 p-4 bg-blue-50 border border-blue-100 rounded">
                    <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-blue-900/70 font-medium leading-relaxed">
                        {t('stake.registration.retained_desc', '💡 說明：當活動結束時，可將「留用」名單匯出存檔。在下次活動開始時，使用匯入功能讀取該檔案，系統會自動建立新的報名資料，並將付款方式設為「延用」，且標記為已繳費。')}
                    </div>
                </div>

                {/* Actions Row - Right Aligned underneath */}
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={handleExportRetained}
                        disabled={isProcessing}
                        className="h-11 px-6 bg-white border border-slate-200 text-slate-700 rounded text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <Download size={18} className="text-blue-600" /> 
                        {t('stake.registration.export_retained_btn_text', '匯出 Roll over 名單')}
                    </button>
                    <label className={`h-11 px-6 bg-blue-600 text-white rounded text-sm font-bold shadow-md hover:bg-blue-700 cursor-pointer transition-all flex items-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload size={18} /> 
                        {t('stake.registration.import_retained_btn_text', '匯入 Roll over 名單')}
                        <input type="file" className="hidden" accept=".json" onChange={handleImportRetainedChange} disabled={isProcessing} />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default RolloverManagement;
