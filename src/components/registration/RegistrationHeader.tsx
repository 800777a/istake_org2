import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import { EventData } from '../../../types';

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
    handleUploadConfig
}) => {
    const { t } = useTranslation();
    if (mode !== 'register') return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-4 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center shrink-0">
                        <User className="mr-2" /> {t('stake.registration.form.registration_title')}
                    </h2>
                    <button 
                        onClick={() => setLang && setLang(lang === 'zh' ? 'en' : 'zh')}
                        className="flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 shadow-sm transition-colors shrink-0"
                    >
                        中文/ENG
                    </button>
                </div>
                <span className="text-sm md:text-base text-gray-600 px-2 py-1 rounded-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {t('stake.registration.form.date_label')}{activeEvent.event_date}
                </span>
            </div>
            
            <div className="flex flex-wrap gap-4 mb-4">
                <button 
                    onClick={handleResetAndRegister}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all shadow-sm flex items-center justify-center ring-1 ${lockCountdown > 0 ? 'bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-200 ring-red-200'}`}
                    disabled={lockCountdown > 0}
                >
                    {lockCountdown > 0 ? (
                        <span>{t('stake.registration.form.wait_label')} {lockCountdown}s</span>
                    ) : (
                        <>
                            <Plus className="inline w-4 h-4 mr-2" /> {t('stake.registration.form.register_btn')}
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
                    className="flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all shadow-sm flex items-center justify-center bg-orange-50 text-orange-700 hover:bg-orange-200 ring-1 ring-orange-200"
                >
                    <Edit className="inline w-4 h-4 mr-2" /> {t('stake.registration.form.edit_btn')}
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
                    disabled={activeEvent?.stop_cancellation}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all shadow-sm flex items-center justify-center ring-1 ${activeEvent?.stop_cancellation ? 'bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed opacity-50' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-200 ring-yellow-200'}`}
                >
                    <Trash2 className="inline w-4 h-4 mr-2" /> {t('stake.registration.form.delete_btn')}
                </button>
                
                <>
                    <button 
                        type="button"
                        onClick={handleDownloadConfig}
                        className="flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all shadow-sm bg-green-50 text-green-700 hover:bg-green-200 flex items-center justify-center ring-1 ring-green-200"
                        title={t('stake.registration.form.save_tooltip')}
                    >
                        <Download className="w-4 h-4 mr-2" /> {t('stake.registration.form.save_btn')}
                    </button>
                    <label className="flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-200 cursor-pointer flex items-center justify-center ring-1 ring-blue-200">
                        <Upload className="w-4 h-4 mr-2" /> {t('stake.registration.form.read_btn')}
                        <input type="file" accept=".json" onChange={handleUploadConfig} className="hidden" />
                    </label>
                </>
            </div>
        </div>
    );
};

export default RegistrationHeader;
