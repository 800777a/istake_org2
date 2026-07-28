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
        <div className="bg-red-50 overflow-visible border-2 border-red-200 rounded mb-2 shadow-sm min-w-0">
            {/* Level 1: Section Title */}
            <div className="bg-red-200 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center border-b-2 border-red-300/30 min-w-0">
                <h3 className="font-black text-red-900 text-sm md:text-lg flex items-center gap-2 uppercase tracking-tighter">
                    <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-red-700" /> {t('stake.representatives.primary_contact')}
                </h3>
            </div>
            
            <div className="p-3 md:p-6 space-y-4 min-w-0">
                <div className={`grid grid-cols-1 gap-3 md:gap-4 min-w-0 ${(isRepresentativeMatched || !primaryName.trim()) ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                    <div className="relative min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-red-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.unit_label')}</label>
                        <select 
                            id="primaryUnit"
                            value={primaryUnit} 
                            onChange={e => handleUnitChange(e.target.value)} 
                            className={`w-full border-2 rounded p-2 text-sm bg-white text-black h-11 focus:ring-4 outline-none transition-all font-black ${errorField === 'primaryUnit' ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-red-200 focus:ring-red-500'}`}
                        >
                            <option value="" disabled>{tString('stake.registration.form.select_unit_hint')}</option>
                            {units.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] md:text-[11px] font-black text-red-900 mb-1.5 uppercase tracking-wider">
                            {t('stake.registration.form.name_label')}
                        </label>
                        <input 
                            id="primaryName"
                            type="text" 
                            value={primaryName} 
                            onBlur={() => setIsPrimaryNameFinished(true)} 
                            onChange={e => handleNameChange(e.target.value)} 
                            className={`w-full border-2 rounded p-2 text-sm bg-white text-black h-11 focus:ring-4 outline-none transition-all font-black ${errorField === 'primaryName' ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-red-200 focus:ring-red-500'}`} 
                            placeholder={tAttr('stake.registration.form.real_name_placeholder')} 
                        />
                    </div>
                    
                    {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                        <div className="relative min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-red-900 mb-1.5 uppercase tracking-wider">
                                {t('stake.registration.form.phone_label')}
                            </label>
                            <input 
                                id="primaryContactPhone"
                                type="tel" 
                                maxLength={13}
                                value={primaryContactPhone} 
                                onChange={e => setPrimaryContactPhone(e.target.value.replace(/[^0-9\s()\-]/g, ''))}
                                className={`w-full border-2 rounded p-2 text-sm bg-white text-black h-11 focus:ring-4 outline-none transition-all font-black ${errorField === 'primaryContactPhone' ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-red-200 focus:ring-red-500'}`} 
                                placeholder={tAttr('stake.registration.form.phone_placeholder')} 
                            />
                        </div>
                    )}
                </div>

                {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                    <div className="pt-2 relative min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-red-900 mb-1.5 uppercase tracking-wider">
                            {t('stake.registration.form.password_setup_label')}
                        </label>
                        <input 
                            id="primaryPassword"
                            type="text" 
                            value={primaryPassword} 
                            onChange={e => setPrimaryPassword(e.target.value)} 
                            className={`w-full border-2 rounded p-2 text-sm bg-white text-black h-11 focus:ring-4 outline-none transition-all font-black ${errorField === 'primaryPassword' ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-red-200 focus:ring-red-500'}`} 
                            placeholder={tAttr('stake.registration.form.password_placeholder')} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrimaryContactSection;
