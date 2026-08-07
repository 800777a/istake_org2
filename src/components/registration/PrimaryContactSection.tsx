import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { UserCircle } from 'lucide-react';

interface PrimaryContactSectionProps {
    primaryName: string;
    setPrimaryName: (val: string) => void;
    primaryUnit: string;
    setPrimaryUnit: (val: string) => void;
    primaryPassword: string;
    setPrimaryPassword: (val: string) => void;
    primaryContactPhone: string;
    setPrimaryContactPhone: (val: string) => void;
    units: { value: string, label: string }[];
    isRepresentativeMatched: boolean;
    setIsRepresentativeMatched: (val: boolean) => void;
    isPrimaryNameFinished: boolean;
    setIsPrimaryNameFinished: (val: boolean) => void;
    representatives: any[];
    editingFamilyGroupId: string | null;
    members: any[];
    setMembers: (members: any[]) => void;
    personalInfoList: any[];
    errorField?: string | null;
}

const PrimaryContactSection: React.FC<PrimaryContactSectionProps> = ({
    primaryName,
    setPrimaryName,
    primaryUnit,
    setPrimaryUnit,
    primaryPassword,
    setPrimaryPassword,
    primaryContactPhone,
    setPrimaryContactPhone,
    units,
    isRepresentativeMatched,
    setIsRepresentativeMatched,
    isPrimaryNameFinished,
    setIsPrimaryNameFinished,
    representatives,
    editingFamilyGroupId,
    members,
    setMembers,
    personalInfoList,
    errorField
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();

    const handleUnitChange = (val: string) => {
        setPrimaryUnit(val);
        if (val && primaryName.trim()) {
            const matchedRep = representatives.find(r => r.unit === val && r.name === primaryName.trim());
            if (matchedRep) {
                setIsRepresentativeMatched(true);
                setPrimaryContactPhone(matchedRep.phone);
                setPrimaryPassword(matchedRep.password);
            } else {
                setIsRepresentativeMatched(false);
                setPrimaryContactPhone('');
                setPrimaryPassword('');
            }
        } else {
            setIsRepresentativeMatched(false);
            setPrimaryContactPhone('');
            setPrimaryPassword('');
        }
    };

    const handleNameChange = (val: string) => {
        setPrimaryName(val);
        setIsPrimaryNameFinished(false);
        if (primaryUnit && val.trim()) {
            const matchedRep = representatives.find(r => r.unit === primaryUnit && r.name === val.trim());
            if (matchedRep) {
                setIsRepresentativeMatched(true);
                setPrimaryContactPhone(matchedRep.phone);
                setPrimaryPassword(matchedRep.password);
            } else {
                setIsRepresentativeMatched(false);
                setPrimaryContactPhone('');
                setPrimaryPassword('');
            }
        } else {
            setIsRepresentativeMatched(false);
            setPrimaryContactPhone('');
            setPrimaryPassword('');
        }

        if (!editingFamilyGroupId && members.length > 0 && (members[0].name === '' || members[0].name === primaryName)) {
            const newMembers = [...members];
            newMembers[0] = { ...newMembers[0], name: val };
            if (val.trim()) {
                const matchedInfo = personalInfoList.find(p => p.unit === primaryUnit && p.name === val.trim());
                if (matchedInfo) {
                    newMembers[0].birth_date = matchedInfo.birth_date;
                    newMembers[0].identity_id = matchedInfo.identity_id;
                    newMembers[0].is_personal_info_matched = true;
                } else {
                    if (newMembers[0].is_personal_info_matched) {
                        newMembers[0].birth_date = '';
                        newMembers[0].identity_id = '';
                    }
                    newMembers[0].is_personal_info_matched = false;
                }
            } else {
                if (newMembers[0].is_personal_info_matched) {
                    newMembers[0].birth_date = '';
                    newMembers[0].identity_id = '';
                }
                newMembers[0].is_personal_info_matched = false;
            }
            setMembers(newMembers);
        }
    };

    return (
        <div className="bg-[#FFFFFF] overflow-visible border-2 border-red-200 rounded mb-1 shadow-sm min-w-0">
            {/* Level 1: Section Title - Rainbow Depth Level 1 */}
            <div className="bg-red-200 px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center border-b-4 border-red-200 min-w-0">
                <h3 className="font-black text-red-800 text-sm md:text-base flex items-center gap-2 uppercase tracking-tight">
                    <div className="bg-white/60 p-1 rounded shadow-sm">
                        <UserCircle className="w-5 h-5 text-red-700" /> 
                    </div>
                    {t('stake.representatives.primary_contact')}
                </h3>
            </div>
            
            <div className="p-3 md:p-5 space-y-4 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-start min-w-0">
                    <div className="relative min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">{t('stake.registration.form.unit_label')}</label>
                        <select 
                            id="primaryUnit"
                            value={primaryUnit} 
                            onChange={e => handleUnitChange(e.target.value)} 
                            className={`w-full border-2 rounded px-3 py-2 text-sm bg-white text-[#111827] h-10 md:h-12 outline-none transition-all font-black appearance-none cursor-pointer ${errorField === 'primaryUnit' ? 'border-red-500 ring-2 ring-red-100 animate-pulse' : 'border-[#D1D5DB] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB]'}`}
                        >
                            <option value="" disabled>{tString('stake.registration.form.select_unit_hint')}</option>
                            {units.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                            {t('stake.registration.form.name_label')}
                        </label>
                        <input 
                            id="primaryName"
                            type="text" 
                            value={primaryName} 
                            onBlur={() => setIsPrimaryNameFinished(true)} 
                            onChange={e => handleNameChange(e.target.value)} 
                            className={`w-full border-2 rounded px-3 py-2 text-sm bg-white text-[#111827] h-10 md:h-12 outline-none transition-all font-black ${errorField === 'primaryName' ? 'border-red-500 ring-2 ring-red-100 animate-pulse' : 'border-[#D1D5DB] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB]'}`} 
                            placeholder={tAttr('stake.registration.form.real_name_placeholder')} 
                        />
                    </div>
                    
                    {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                        <div className="relative min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                                {t('stake.registration.form.phone_label')}
                            </label>
                            <input 
                                id="primaryContactPhone"
                                type="tel" 
                                maxLength={13}
                                value={primaryContactPhone} 
                                onChange={e => setPrimaryContactPhone(e.target.value.replace(/[^0-9\s()\-]/g, ''))}
                                className={`w-full border-2 rounded px-3 py-2 text-sm bg-white text-[#111827] h-10 md:h-12 outline-none transition-all font-black ${errorField === 'primaryContactPhone' ? 'border-red-500 ring-2 ring-red-100 animate-pulse' : 'border-[#D1D5DB] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB]'}`} 
                                placeholder={tAttr('stake.registration.form.phone_placeholder')} 
                            />
                        </div>
                    )}

                    {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                        <div className="relative min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                                {t('stake.registration.form.password_setup_label')}
                            </label>
                            <input 
                                id="primaryPassword"
                                type="text" 
                                value={primaryPassword} 
                                onChange={e => setPrimaryPassword(e.target.value)} 
                                className={`w-full border-2 rounded px-3 py-2 text-sm bg-white text-[#111827] h-10 md:h-12 outline-none transition-all font-black ${errorField === 'primaryPassword' ? 'border-red-500 ring-2 ring-red-100 animate-pulse' : 'border-[#D1D5DB] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB]'}`} 
                                placeholder={tAttr('stake.registration.form.password_placeholder')} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrimaryContactSection;
