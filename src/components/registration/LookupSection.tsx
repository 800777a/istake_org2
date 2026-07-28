import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Clock } from 'lucide-react';
import { GlobalSettings } from '../../../types';

interface LookupSectionProps {
    mode: 'register' | 'lookup';
    lookupIntent: 'edit' | 'delete';
    lookupLockCountdown: number;
    lookupUnit: string;
    setLookupUnit: (val: string) => void;
    lookupName: string;
    setLookupName: (val: string) => void;
    lookupPassword: string;
    setLookupPassword: (val: string) => void;
    handleLookup: (e: React.FormEvent) => void;
    handleBackToRegister: () => void;
    settings: GlobalSettings;
    units: { value: string; label: string }[];
}

const LookupSection: React.FC<LookupSectionProps> = ({
    mode,
    lookupIntent,
    lookupLockCountdown,
    lookupUnit,
    setLookupUnit,
    lookupName,
    setLookupName,
    lookupPassword,
    setLookupPassword,
    handleLookup,
    handleBackToRegister,
    settings,
    units
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();
    if (mode !== 'lookup') return null;

    const lookupTheme = {
        bg: lookupIntent === 'delete' ? 'bg-red-50' : 'bg-orange-50',
        border: lookupIntent === 'delete' ? 'border-red-200' : 'border-orange-200',
        text: lookupIntent === 'delete' ? 'text-red-800' : 'text-orange-800',
        label: lookupIntent === 'delete' ? 'text-red-900' : 'text-orange-900',
        button: lookupIntent === 'delete' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200',
        ring: lookupIntent === 'delete' ? 'focus:ring-red-300' : 'focus:ring-orange-300'
    };

    return (
        <div className="space-y-4 max-w-2xl mx-auto min-w-0 w-full">
            <div className={`overflow-visible border-2 rounded shadow-xl animate-fade-in bg-white min-w-0 w-full ${lookupTheme.border}`}>
                {/* Level 1: Page Header */}
                <div className="bg-indigo-900 text-white px-4 py-2 md:px-6 md:py-3 shadow-md flex items-center justify-between border-b-2 border-indigo-800 rounded-t-[10px] min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="p-1 bg-white/10 rounded border-2 border-white/20 shrink-0">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                        </div>
                        <h3 className="text-xs md:text-lg font-black tracking-tighter truncate">
                            {lookupIntent === 'delete' ? '刪除報名 (Delete)' : '編輯報名 (Edit)'}
                        </h3>
                    </div>
                    <button 
                        onClick={handleBackToRegister} 
                        className="text-white/70 hover:text-white text-[10px] md:text-sm font-black underline transition-colors decoration-2 underline-offset-4 shrink-0 px-2"
                    >
                        {t('stake.registration.form.back_to_form')}
                    </button>
                </div>
                
                <div className="p-4 md:p-8 min-h-[300px] md:min-h-[400px] min-w-0 w-full bg-[#F8F9FA]/30">
                    {lookupLockCountdown > 0 ? (
                        <div className="text-center py-12 md:py-20 bg-red-50/50 rounded border-2 border-red-200 min-w-0 w-full">
                            <Clock className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4 md:mb-6 animate-pulse" />
                            <h3 className="text-lg md:text-2xl font-black text-red-800 mb-1 md:mb-2">{t('stake.registration.form.temp_locked')}</h3>
                            <p className="text-xs md:text-base text-red-600 mb-4 md:mb-6 font-bold">{t('stake.registration.form.too_many_attempts')}</p>
                            <div className="text-4xl md:text-6xl font-black font-mono text-red-900 bg-red-100 py-3 md:py-4 px-6 md:px-8 rounded inline-block shadow-inner border-2 border-red-200">
                                {lookupLockCountdown}s
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleLookup} className="max-w-md mx-auto flex flex-col gap-5 md:gap-6 min-w-0 w-full">
                            <div className="bg-white p-5 md:p-8 rounded border-2 border-indigo-100 shadow-lg space-y-5 min-w-0 w-full">
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-indigo-900 pl-1">{t('stake.registration.form.unit_label')}</label>
                                    <select 
                                        value={lookupUnit} 
                                        onChange={e => setLookupUnit(e.target.value)} 
                                        className="w-full border-2 border-indigo-200 p-3 rounded text-sm bg-white text-black shadow-sm focus:ring-4 focus:ring-indigo-500 outline-none transition-all font-black h-12 md:h-14"
                                        required
                                    >
                                        <option value="" disabled>{tString('stake.registration.form.select_unit_hint')}</option>
                                        {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-indigo-900 pl-1">
                                        {t('stake.registration.form.name_label')}
                                        {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.primary_name_placeholder')} title="Click to edit placeholder key">[P]</span>}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={lookupName} 
                                        onChange={e => setLookupName(e.target.value)} 
                                        placeholder={tAttr('stake.registration.form.primary_name_placeholder')} 
                                        className="w-full border-2 border-indigo-200 p-3 rounded text-sm bg-white text-black shadow-sm focus:ring-4 focus:ring-indigo-500 outline-none transition-all font-black h-12 md:h-14"
                                        required
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-indigo-900 pl-1">
                                        {t('common.password')}
                                        {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.primary_password_placeholder')} title="Click to edit placeholder key">[P]</span>}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={lookupPassword} 
                                        onChange={e => setLookupPassword(e.target.value)} 
                                        placeholder={tAttr('stake.registration.form.primary_password_placeholder')} 
                                        className="w-full border-2 border-indigo-200 p-3 rounded text-sm bg-white text-black shadow-sm focus:ring-4 focus:ring-indigo-500 outline-none transition-all font-black h-12 md:h-14"
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`w-full h-12 md:h-14 rounded font-black text-sm md:text-lg shadow-xl mt-2 md:mt-4 transition-all hover:scale-[1.02] active:scale-[0.95] border-2 flex items-center justify-center gap-2 ${lookupIntent === 'delete' ? 'bg-red-600 text-white border-red-800 hover:bg-red-700 shadow-red-200' : 'bg-orange-600 text-white border-orange-800 hover:bg-orange-700 shadow-orange-200'}`}
                            >
                                {t('stake.registration.form.verify_btn')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LookupSection;
