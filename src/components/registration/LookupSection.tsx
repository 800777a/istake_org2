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
    settings
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
        <div className={`${lookupTheme.bg} p-6 rounded-lg border ${lookupTheme.border} min-h-[400px]`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold ${lookupTheme.text}`}>
                    {lookupIntent === 'delete' ? '刪除' : '編輯'}
                </h3>
                <button onClick={handleBackToRegister} className={`${lookupTheme.text} text-xs underline hover:opacity-80`}>{t('stake.registration.form.back_to_form')}</button>
            </div>
            
            {lookupLockCountdown > 0 ? (
                <div className="text-center py-10">
                    <Clock className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-red-800 mb-2">{t('stake.registration.form.temp_locked')}</h3>
                    <p className="text-red-600 mb-4">{t('stake.registration.form.too_many_attempts')}</p>
                    <div className="text-4xl font-mono font-bold text-red-900">{lookupLockCountdown}s</div>
                </div>
            ) : (
                <form onSubmit={handleLookup} className="flex flex-col gap-4 mb-6">
                    <div>
                        <label className={`block text-xs font-bold ${lookupTheme.label} mb-1`}>{t('stake.registration.form.unit_label')}</label>
                        <select 
                            value={lookupUnit} 
                            onChange={e => setLookupUnit(e.target.value)} 
                            className={`w-full border p-2 rounded-lg text-xs bg-white text-black shadow-sm focus:ring-2 outline-none ${lookupTheme.border} ${lookupTheme.ring}`}
                            required
                        >
                            <option value="" disabled>{tString('stake.registration.form.select_unit_hint')}</option>
                            {(settings.units || []).map((u: string) => <option key={u} value={u}>{tString(u)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-xs font-bold ${lookupTheme.label} mb-1`}>
                            {t('stake.registration.form.name_label')}
                            {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.primary_name_placeholder')} title="Click to edit placeholder key">[P]</span>}
                        </label>
                        <input 
                            type="text" 
                            value={lookupName} 
                            onChange={e => setLookupName(e.target.value)} 
                            placeholder={tAttr('stake.registration.form.primary_name_placeholder')} 
                            className={`w-full border p-2 rounded-lg text-xs bg-white text-black shadow-sm focus:ring-2 outline-none ${lookupTheme.border} ${lookupTheme.ring}`}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-bold ${lookupTheme.label} mb-1`}>
                            {t('common.password')}
                            {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.primary_password_placeholder')} title="Click to edit placeholder key">[P]</span>}
                        </label>
                        <input 
                            type="text" 
                            value={lookupPassword} 
                            onChange={e => setLookupPassword(e.target.value)} 
                            placeholder={tAttr('stake.registration.form.primary_password_placeholder')} 
                            className={`w-full border p-2 rounded-lg text-xs bg-white text-black shadow-sm focus:ring-2 outline-none ${lookupTheme.border} ${lookupTheme.ring}`}
                            required 
                        />
                    </div>
                    <button type="submit" className={`w-full py-3 rounded-lg font-bold shadow mt-2 border ${lookupTheme.button} ${lookupTheme.border}`}>
                        {t('stake.registration.form.verify_btn')}
                    </button>
                </form>
            )}
        </div>
    );
};

export default LookupSection;
