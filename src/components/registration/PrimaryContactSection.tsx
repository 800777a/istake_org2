import React from 'react';
import { useTranslation } from 'react-i18next';
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
    personalInfoList
}) => {
    const { t } = useTranslation();

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
        <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200 mb-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-red-900 text-lg flex items-center">
                    <UserCircle className="w-7 h-7 mr-2 text-red-700" /> {t('stake.representatives.primary_contact')}
                </h3>
            </div>
            
            <div className={`grid grid-cols-1 gap-4 mb-4 ${(isRepresentativeMatched || !primaryName.trim()) ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                <div>
                    <label className="block text-xs font-bold text-red-900 mb-1">{t('stake.registration.form.unit_label')}</label>
                    <select 
                        value={primaryUnit} 
                        onChange={e => handleUnitChange(e.target.value)} 
                        className="w-full border rounded p-2 text-xs bg-white text-black"
                    >
                        <option value="" disabled>{t('stake.registration.form.select_unit_hint')}</option>
                        {units.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-red-900 mb-1">{t('stake.registration.form.name_label')}</label>
                    <input type="text" value={primaryName} onBlur={() => setIsPrimaryNameFinished(true)} onChange={e => handleNameChange(e.target.value)} className="w-full border rounded p-2 text-xs bg-white text-black" placeholder={t('stake.registration.form.real_name_placeholder')} />
                </div>
                
                {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                    <div>
                        <label className="block text-xs font-bold text-red-900 mb-1">{t('stake.registration.form.phone_label')}</label>
                        <input 
                            type="tel" 
                            maxLength={13}
                            value={primaryContactPhone} 
                            onChange={e => setPrimaryContactPhone(e.target.value.replace(/[^0-9\s()\-]/g, ''))}
                            className="w-full border rounded p-2 text-xs bg-white text-black" 
                            placeholder={t('stake.registration.form.phone_placeholder')} 
                        />
                    </div>
                )}
            </div>

            {(!isRepresentativeMatched && isPrimaryNameFinished && primaryName.trim() !== '') && (
                <div>
                    <label className="block text-xs font-bold text-red-900 mb-1">{t('stake.registration.form.password_setup_label')}</label>
                    <input type="text" value={primaryPassword} onChange={e => setPrimaryPassword(e.target.value)} className="w-full border rounded p-2 text-xs bg-white text-black" placeholder={t('stake.registration.form.password_placeholder')} />
                </div>
            )}
        </div>
    );
};

export default PrimaryContactSection;
