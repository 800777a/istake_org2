import React, { useState, useRef } from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { User, Plus, Edit, Trash2, Download, Upload, Clock } from 'lucide-react';
import { EventData } from '../../../types';
import { isCancellationDisabled } from '../../utils/registrationUtils';
import ConfirmationModal from '../ConfirmationModal';

interface RegistrationHeaderProps {
    mode: 'register' | 'lookup';
    setMode: (mode: 'register' | 'lookup') => void;
    lang?: 'zh' | 'en';
    setLang?: (lang: 'zh' | 'en') => void;
    activeEvent: EventData;
    lockCountdown: number;
    handleResetAndRegister: () => void;
    isFormDirty: () => boolean;
    setLookupIntent: (intent: 'edit' | 'delete') => void;
    setConfirmAction: (action: any) => void;
    setMsg: (msg: any) => void;
    handleDownloadConfig: () => void;
    handleUploadConfig: (e: React.ChangeEvent<HTMLInputElement>) => void;
    hideModeButtons?: boolean;
}

const RegistrationHeader: React.FC<RegistrationHeaderProps> = ({
    mode,
    setMode,
    lang,
    setLang,
    activeEvent,
    lockCountdown,
    handleResetAndRegister,
    isFormDirty,
    setLookupIntent,
    setConfirmAction,
    setMsg,
    handleDownloadConfig,
    handleUploadConfig,
    hideModeButtons
}) => {
    const { t, tString } = useI18n();
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showLoadConfirm, setShowLoadConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (mode !== 'register') return null;

    return (
        <div className="space-y-2 mb-4 min-w-0">
            {/* Level 1: Page Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 px-3 py-2 md:px-6 md:py-3 shadow-lg flex items-center justify-between rounded border-2 border-amber-500/50 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="p-1 md:p-1.5 bg-black/5 rounded border-2 border-black/10 shrink-0">
                        <User className="text-amber-900 w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-xs md:text-lg font-black tracking-tight leading-tight uppercase truncate">
                            {t('stake.registration.form.title', '登記')}
                        </h2>
                    </div>
                </div>
            </div>
            
            {/* Action Row */}
            {!hideModeButtons && (
                <div className="bg-indigo-100 text-indigo-900 px-2 py-3 md:px-4 md:py-3 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 rounded border-2 border-indigo-200 min-w-0">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0 overflow-x-auto no-scrollbar py-0.5 overscroll-x-contain">
                        <button 
                            onClick={handleResetAndRegister}
                            className={`flex-1 sm:flex-none h-11 px-3 md:px-6 rounded font-black transition-all shadow-md flex items-center justify-center border-2 text-[10px] md:text-sm active:scale-95 whitespace-nowrap shrink-0 ${lockCountdown > 0 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 border-red-800 shadow-red-200'}`}
                            disabled={lockCountdown > 0}
                        >
                            {lockCountdown > 0 ? (
                                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 animate-spin" /> {lockCountdown}s</span>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-1" /> {t('stake.registration.form.register_btn')}
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => { 
                                setLookupIntent('edit');
                                if (isFormDirty()) {
                                    setConfirmAction({ type: 'abandonToLookup' });
                                } else {
                                    setMode('lookup'); 
                                    setMsg(null); 
                                }
                            }}
                            className="flex-1 sm:flex-none h-11 px-3 md:px-6 rounded font-black transition-all shadow-md flex items-center justify-center bg-white text-orange-800 hover:bg-orange-50 border-2 border-orange-300 text-[10px] md:text-sm active:scale-95 whitespace-nowrap shrink-0"
                        >
                            <Edit className="w-4 h-4 mr-1" /> {t('stake.registration.form.edit_btn')}
                        </button>
                        <button 
                            onClick={() => { 
                                setLookupIntent('delete');
                                if (isFormDirty()) {
                                    setConfirmAction({ type: 'abandonToLookup' });
                                } else {
                                    setMode('lookup'); 
                                    setMsg(null); 
                                }
                            }}
                            disabled={isCancellationDisabled(activeEvent)}
                            className={`flex-1 sm:flex-none h-11 px-3 md:px-6 rounded font-black transition-all shadow-md flex items-center justify-center border-2 text-[10px] md:text-sm active:scale-95 whitespace-nowrap shrink-0 ${isCancellationDisabled(activeEvent) ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-amber-900 hover:bg-amber-50 border-2 border-amber-300'}`}
                        >
                            <Trash2 className="w-4 h-4 mr-1" /> {t('stake.registration.form.delete_btn')}
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0">
                        <button 
                            type="button"
                            onClick={() => setShowSaveConfirm(true)}
                            className="flex-1 sm:flex-none h-11 px-3 md:px-6 rounded font-black transition-all shadow-md bg-emerald-600 text-white hover:bg-emerald-700 border-2 border-emerald-800 flex items-center justify-center text-[10px] md:text-sm active:scale-95 whitespace-nowrap min-w-0"
                            title={t('stake.registration.form.save_tooltip')}
                        >
                            <Download className="w-4 h-4 mr-1" /> {t('stake.registration.form.save_btn')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowLoadConfirm(true)}
                            className="flex-1 sm:flex-none h-11 px-3 md:px-6 rounded font-black transition-all shadow-md bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-800 flex items-center justify-center text-[10px] md:text-sm active:scale-95 whitespace-nowrap min-w-0"
                        >
                            <Upload className="w-4 h-4 mr-1" /> {t('stake.registration.form.read_btn')}
                        </button>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".json" 
                        onChange={handleUploadConfig} 
                        className="hidden" 
                    />
                </div>
            )}
            
            <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                onConfirm={handleDownloadConfig}
                title={t('common.notice', '通知')}
                message={t('common.confirm_save', '確定要儲存目前的變動嗎？')}
                confirmText={t('common.confirm', '確定')}
                type="info"
            />

            <ConfirmationModal
                isOpen={showLoadConfirm}
                onClose={() => setShowLoadConfirm(false)}
                onConfirm={() => {
                    fileInputRef.current?.click();
                }}
                title={t('common.notice', '通知')}
                message={t('common.confirm_load', '確定要讀取存檔嗎？這將會覆蓋目前正在填寫的資料。')}
                confirmText={t('common.confirm', '確定')}
                type="warning"
            />
        </div>
    );
};

export default RegistrationHeader;
