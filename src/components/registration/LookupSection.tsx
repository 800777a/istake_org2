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
    handleLookup: (e: React.FormEvent, unit: string, name: string, pass: string) => void;
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
        <div className="space-y-4 max-w-2xl mx-auto min-w-0 w-full p-1">
            <div className={`overflow-visible border-2 rounded shadow-xl animate-fade-in bg-[#FFFFFF] min-w-0 w-full ${lookupTheme.border}`}>
                {/* Level 1 Title - Rainbow Depth Level 1 (Indigo) */}
                <div className="bg-[#003D79] text-white px-3 py-2.5 md:px-4 md:py-3 shadow-md flex items-center justify-between border-b-4 border-[#002A55] min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="p-1 bg-white/10 rounded border-2 border-white/20 shrink-0">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-100" />
                        </div>
                        <h3 className="text-sm md:text-base font-black tracking-tight truncate uppercase">
                            {lookupIntent === 'delete' ? t('刪除報名 (Delete)', 'Delete Registration') : t('修改報名 (Modify)', 'Modify Registration')}
                        </h3>
                    </div>
                    <button 
                        onClick={handleBackToRegister} 
                        className="text-white/80 hover:text-white text-[10px] md:text-xs font-black underline transition-colors decoration-2 underline-offset-4 shrink-0 px-2 uppercase tracking-widest"
                    >
                        {t('stake.registration.form.back_to_form')}
                    </button>
                </div>
                
                <div className="p-4 md:p-8 min-h-[300px] md:min-h-[400px] min-w-0 w-full bg-[#F9FAFB]">
                    {lookupLockCountdown > 0 ? (
                        <div className="text-center py-10 md:py-16 bg-red-50/50 rounded border-2 border-red-200 min-w-0 w-full shadow-inner">
                            <div className="bg-white inline-block p-4 rounded-full shadow-lg border-2 border-red-100 mb-4 md:mb-6">
                                <Clock className="w-10 h-10 md:w-14 md:h-14 text-red-500 animate-pulse" />
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-red-800 mb-1 md:mb-2 uppercase tracking-widest">{t('stake.registration.form.temp_locked')}</h3>
                            <p className="text-[10px] md:text-sm text-red-600 mb-4 md:mb-6 font-bold tracking-tight opacity-80">{t('stake.registration.form.too_many_attempts')}</p>
                            <div className="text-4xl md:text-6xl font-black font-mono text-red-900 bg-white py-3 md:py-4 px-8 md:px-12 rounded shadow-lg border-2 border-red-200">
                                {lookupLockCountdown}<span className="text-xl md:text-2xl ml-1">S</span>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={(e) => handleLookup(e, lookupUnit, lookupName, lookupPassword)} className="max-w-sm mx-auto flex flex-col gap-5 md:gap-6 min-w-0 w-full">
                            <div className="bg-white p-5 md:p-6 rounded border-2 border-slate-200 shadow-md space-y-4 min-w-0 w-full">
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-1.5 text-slate-500 pl-1">{t('stake.registration.form.unit_label')}</label>
                                    <select 
                                        value={lookupUnit} 
                                        onChange={e => setLookupUnit(e.target.value)} 
                                        className="w-full border-2 border-[#D1D5DB] px-3 py-2 rounded text-sm bg-white text-[#111827] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB] outline-none transition-all font-black h-10 md:h-12 appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="" disabled>{tString('stake.registration.form.select_unit_hint')}</option>
                                        {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-1.5 text-slate-500 pl-1">
                                        {t('stake.registration.form.name_label')}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={lookupName} 
                                        onChange={e => setLookupName(e.target.value)} 
                                        placeholder={tAttr('stake.registration.form.primary_name_placeholder')} 
                                        className="w-full border-2 border-[#D1D5DB] px-3 py-2 rounded text-sm bg-white text-[#111827] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB] outline-none transition-all font-black h-10 md:h-12"
                                        required
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-1.5 text-slate-500 pl-1">
                                        {t('common.password')}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={lookupPassword} 
                                        onChange={e => setLookupPassword(e.target.value)} 
                                        placeholder={tAttr('stake.registration.form.primary_password_placeholder')} 
                                        className="w-full border-2 border-[#D1D5DB] px-3 py-2 rounded text-sm bg-white text-[#111827] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB] outline-none transition-all font-black h-10 md:h-12"
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`w-full h-11 md:h-12 rounded font-black text-sm md:text-base shadow-lg transition-all active:scale-95 border-2 flex items-center justify-center gap-2 uppercase tracking-widest ${lookupIntent === 'delete' ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100' : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'}`}
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
