import React, { useState, useRef } from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { User, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
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
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                            登記
                        </h2>
                    </div>
                </div>
                
                <button 
                    onClick={() => setLang && setLang(lang === 'zh' ? 'en' : 'zh')}
                    className="h-10 px-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center self-start md:self-auto"
                >
                    <span className="mr-1 opacity-60">LANGUAGE:</span> {lang === 'zh' ? 'ENGLISH' : '繁體中文'}
                </button>
            </div>
            
            {!hideModeButtons && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button 
                        onClick={handleResetAndRegister}
                        className={`h-12 md:h-11 lg:h-10 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center border text-sm md:text-base lg:text-sm ${lockCountdown > 0 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'}`}
                        disabled={lockCountdown > 0}
                    >
                        {lockCountdown > 0 ? (
                            <span>{t('stake.registration.form.wait_label')} {lockCountdown}s</span>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" /> {t('stake.registration.form.register_btn')}
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
                        className="h-12 md:h-11 lg:h-10 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 text-sm md:text-base lg:text-sm"
                    >
                        <Edit className="w-4 h-4 mr-2" /> {t('stake.registration.form.edit_btn')}
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
                        className={`h-12 md:h-11 lg:h-10 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center border text-sm md:text-base lg:text-sm ${isCancellationDisabled(activeEvent) ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'}`}
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> {t('stake.registration.form.delete_btn')}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => setShowSaveConfirm(true)}
                        className="h-12 md:h-11 lg:h-10 rounded-lg font-bold transition-all shadow-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm md:text-base lg:text-sm"
                        title={t('stake.registration.form.save_tooltip')}
                    >
                        <Download className="w-4 h-4 mr-2" /> {t('stake.registration.form.save_btn')}
                    </button>
                    <button 
                        type="button"
                        onClick={() => setShowLoadConfirm(true)}
                        className="h-12 md:h-11 lg:h-10 rounded-lg font-bold transition-all shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center text-sm md:text-base lg:text-sm"
                    >
                        <Upload className="w-4 h-4 mr-2" /> {t('stake.registration.form.read_btn')}
                    </button>
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
