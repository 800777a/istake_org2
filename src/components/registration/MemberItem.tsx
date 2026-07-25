
import React, { useState } from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Trash2 } from 'lucide-react';
import Toast, { ToastType } from '../../../components/Toast';
import { RegistrationMemberInput, TripType, OrdinanceType, OrdinanceItem, EventData, GlobalSettings } from '../../../types';
import { getGenderFromId, calculateAge } from '../../../utils/validation';

interface MemberItemProps {
    member: RegistrationMemberInput;
    index: number;
    lang?: 'zh' | 'en';
    activeEvent: EventData;
    settings: GlobalSettings;
    enabledIdentities: string[];
    enabledTripTypes: string[];
    years: number[];
    months: number[];
    days: number[];
    proxyOptions: OrdinanceItem[];
    livingOptions: OrdinanceItem[];
    personalInfoList: import('../../../types').PersonalInfo[];
    primaryUnit: string;
    primaryName: string; // V310: For guardian pre-fill
    onUpdate: (tempId: string, field: keyof RegistrationMemberInput, value: any) => void;
    onUpdateBirthday: (tempId: string, field: 'year' | 'month' | 'day', val: number) => void;
    onDelete: (member: RegistrationMemberInput) => void;
    calculatePrice: (m: RegistrationMemberInput) => number;
    stopCancellation?: boolean;
    forceShowPersonalInfo?: boolean;
}

const MemberItem: React.FC<MemberItemProps> = ({
    member,
    index,
    lang,
    activeEvent,
    settings,
    enabledIdentities,
    enabledTripTypes,
    years,
    months,
    days,
    proxyOptions,
    livingOptions,
    personalInfoList,
    primaryUnit,
    primaryName,
    onUpdate,
    onUpdateBirthday,
    onDelete,
    calculatePrice,
    stopCancellation,
    forceShowPersonalInfo
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('error');

    const [isNameFinished, setIsNameFinished] = useState(false);

    const [isGuardianVisible, setIsGuardianVisible] = useState(false);

    // Check if personal info matches
    const isMatched = !!member.name.trim() && personalInfoList.some(p => p.unit === primaryUnit && p.name === member.name.trim());

    const translateTripType = (val: string) => {
        const keyMap: Record<string, string> = {
            '來回': 'round_trip',
            '去程': 'go_only',
            '回程': 'back_only',
            '自行前往': 'self_guided',
            '自行': 'self_guided',
            '自理': 'self_guided',
            '留用': 'roll_over'
        };
        const key = keyMap[val] || val;
        return tString(`stake.registration.form.trips.${key}`);
    };

    const translateIdentityType = (val: string) => {
        const keyMap: Record<string, string> = {
            '成人': 'adult',
            '敬老': 'senior',
            '學生': 'student',
            '青少': 'youth',
            '嬰兒': 'infant',
            '單身': 'single',
            '團體': 'group',
            '工作人員': 'staff',
            '首次參加': 'first_time',
            '延用': 'extended',
            '傳教': 'missionary'
        };
        const key = keyMap[val] || val;
        return tString(`stake.registration.form.identities.${key}`);
    };

    const translateOrdinance = (val: string) => {
        const keyMap: Record<string, string> = {
            '洗禮': 'baptism',
            '證實': 'confirmation',
            '先行禮': 'initiatory',
            '恩道門': 'endowment',
            '印證': 'sealing',
            '觀禮': 'witness',
            '不作教儀': 'none',
            '專職傳教士': 'missionary',
            '代做': 'proxy',
            '代替': 'proxy',
            '兒童': 'child',
            '活人': 'living',
            '不會': 'none',
            '不會參加': 'no_participation',
            '聖殿廣場導覽': 'temple_square_tour',
            '家譜中心導覽': 'family_history_tour',
            '其他活動': 'other_activities'
        };
        const key = keyMap[val] || val;
        return tString(`stake.registration.form.ordinances.${key}`);
    };

    let birthYear: number | '' = '';
    let birthMonth: number | '' = '';
    let birthDay: number | '' = '';
    
    if (member.birth_date) {
        const parts = member.birth_date.split('-');
        if (parts.length === 3) {
            birthYear = parseInt(parts[0]) || '';
            birthMonth = parseInt(parts[1]) || '';
            birthDay = parseInt(parts[2]) || '';
        } else {
            const birth = new Date(member.birth_date);
            if (!isNaN(birth.getFullYear())) {
                birthYear = birth.getFullYear();
                birthMonth = birth.getMonth() + 1;
                birthDay = birth.getDate();
            }
        }
    }

    const gender = getGenderFromId(member.identity_id);
    const age = member.birth_date ? calculateAge(member.birth_date, activeEvent.event_date) : 0;

    const personInDb = personalInfoList.find(p => p.unit === primaryUnit && p.name === member.name.trim());
    const dbService = personInDb?.service_qualification || '';

    // V320: Guardian logic triggered by interactions
    const handleCheckGuardian = () => {
        if (!member.birth_date) return;
        
        const age = calculateAge(member.birth_date, activeEvent.event_date);
        const personInDb = personalInfoList.find(p => p.unit === primaryUnit && p.name === member.name.trim());
        
        if (age >= 18) {
            if (member.guardian) onUpdate(member.temp_id, 'guardian', '');
            setIsGuardianVisible(false);
        } else if (age >= 0 && age < 18) {
             if (personInDb?.guardian && personInDb.guardian.trim()) {
                 if (member.guardian !== personInDb.guardian) {
                     onUpdate(member.temp_id, 'guardian', personInDb.guardian);
                 }
                 setIsGuardianVisible(false);
             } else {
                 setIsGuardianVisible(true);
                 if (!member.guardian && primaryName && primaryName !== member.name.trim()) {
                     onUpdate(member.temp_id, 'guardian', primaryName);
                 }
             }
        }
    };

    const showServiceQualification = () => {
        if (dbService === '已做過恩道門') return false;
        
        if (gender === '1') { // Male
             if (age >= 18) {
                 // Show if Empty, None, Priest, or Elder
                 return dbService === '' || dbService === '沒有' || dbService === '祭司' || dbService === '長老';
             } else if (age >= 16) {
                 // Show if Empty or None
                 return dbService === '' || dbService === '沒有';
             }
        } else if (gender === '2') { // Female
             if (age >= 18) {
                 // Show if Empty or None
                 return dbService === '' || dbService === '沒有';
             }
        }
        return false;
    };
    
    const getServiceOptions = (): { value: string, label: string }[] => {
        if (!showServiceQualification()) return [];

        if (gender === '1') { // Male
            if (age >= 18) {
                return [
                    { value: '沒有', label: tString('stake.registration.form.ordinances.none') },
                    { value: '祭司', label: '祭司' },
                    { value: '長老', label: '長老' },
                    { value: '已做過恩道門', label: '已做過恩道門' }
                ];
            } else if (age >= 16) {
                return [
                    { value: '沒有', label: tString('stake.registration.form.ordinances.none') },
                    { value: '祭司', label: '祭司' }
                ];
            }
        } else if (gender === '2') { // Female
            if (age >= 18) {
                return [
                    { value: '沒有', label: tString('stake.registration.form.ordinances.none') },
                    { value: '已做過恩道門', label: '已做過恩道門' }
                ];
            }
        }
        return [];
    };

    const serviceOptions = getServiceOptions();

    return (
        <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200 relative">
            <div className="flex items-center mb-4">
                <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold mr-3">
                    {index + 1}
                </div>
                <div className="flex-1 border-b border-green-200"></div>
                
                <button 
                    type="button" 
                    onClick={() => onDelete(member)} 
                    disabled={stopCancellation}
                    className={`ml-3 transition-colors p-1 ${stopCancellation ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}
                    title={stopCancellation ? t('stake.registration.form.insured_cannot_cancel') : t('stake.registration.form.delete_member_tooltip')}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">
                        {t('stake.registration.form.name_label')}
                        {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.real_name_placeholder')} title="Click to edit placeholder key">[P]</span>}
                    </label>
                    <input 
                        type="text" 
                        value={member.name} 
                        onChange={e => { 
                            onUpdate(member.temp_id, 'name', e.target.value);
                            setIsNameFinished(false);
                            // V320: Clear guardian and hide field when name changes
                            if (member.guardian) onUpdate(member.temp_id, 'guardian', '');
                            setIsGuardianVisible(false);
                        }} 
                        onBlur={() => {
                            setIsNameFinished(true);
                            handleCheckGuardian();
                        }}
                        className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black underline-offset-4 focus:ring-2 focus:ring-green-400 outline-none transition-all"
                        placeholder={tAttr('stake.registration.form.real_name_placeholder')}
                    />
                </div>
                {!!member.name.trim() && (isNameFinished || forceShowPersonalInfo) && !isMatched && (
                    <>
                        <div>
                            <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.birth_date_label')}</label>
                            <div className="flex gap-2">
                                <select 
                                    className="border rounded h-[38px] px-2 text-xs flex-1 bg-white text-black"
                                    value={birthYear}
                                    onChange={e => onUpdateBirthday(member.temp_id, 'year', parseInt(e.target.value))}
                                    onBlur={handleCheckGuardian}
                                >
                                    <option value="" disabled>{tString('stake.registration.form.year_label', { forceString: true })}</option>
                                    {years.map(y => <option key={y} value={y}>{y}{tString('stake.registration.form.year_label', { forceString: true })}</option>)}
                                </select>
                                <select 
                                    className="border rounded h-[38px] px-2 text-xs w-20 bg-white text-black"
                                    value={birthMonth}
                                    onChange={e => onUpdateBirthday(member.temp_id, 'month', parseInt(e.target.value))}
                                    onBlur={handleCheckGuardian}
                                >
                                    <option value="" disabled>{tString('stake.registration.form.month_label', { forceString: true })}</option>
                                    {months.map(m => <option key={m} value={m}>{m}{tString('stake.registration.form.month_label', { forceString: true })}</option>)}
                                </select>
                                <select 
                                    className="border rounded h-[38px] px-2 text-xs w-20 bg-white text-black"
                                    value={birthDay}
                                    onChange={e => onUpdateBirthday(member.temp_id, 'day', parseInt(e.target.value))}
                                    onBlur={handleCheckGuardian}
                                >
                                    <option value="" disabled>{tString('stake.registration.form.day_label', { forceString: true })}</option>
                                    {days.map(d => <option key={d} value={d}>{d}{tString('stake.registration.form.day_label', { forceString: true })}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-green-900 font-bold mb-1">
                                {t('stake.registration.form.id_label')}
                                {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.id_placeholder')} title="Click to edit placeholder key">[P]</span>}
                            </label>
                            <input 
                                type="text" 
                                value={member.identity_id} 
                                onChange={e => onUpdate(member.temp_id, 'identity_id', e.target.value.toUpperCase())} 
                                className="w-full border rounded h-[38px] px-2 text-xs uppercase bg-white text-black"
                                placeholder={tAttr('stake.registration.form.id_placeholder')}
                                maxLength={10}
                            />
                        </div>
                    </>
                )}
            </div>

            {isGuardianVisible && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 animate-fade-in">
                    <div>
                        <label className="block text-xs text-green-900 font-bold mb-1">
                            {t('stake.registration.form.guardian_label')}
                            {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.guardian_placeholder')} title="Click to edit placeholder key">[P]</span>}
                        </label>
                        <input 
                            type="text"
                            value={member.guardian || ''}
                            onChange={e => onUpdate(member.temp_id, 'guardian', e.target.value)}
                            onBlur={() => {
                                if (member.guardian && member.guardian === member.name.trim()) {
                                    onUpdate(member.temp_id, 'guardian', '');
                                    setMsg(t('stake.registration.form.guardian_error'));
                                }
                            }}
                            className="w-full border border-green-200 rounded h-[38px] px-2 text-xs bg-white text-black focus:ring-2 focus:ring-green-300 outline-none"
                            placeholder={tAttr('stake.registration.form.guardian_placeholder')}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.ordinance_participation')}</label>
                    <select 
                        value={member.ordinance_type} 
                        onChange={e => {
                            onUpdate(member.temp_id, 'ordinance_type', e.target.value as OrdinanceType);
                        }}
                        className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black focus:ring-1 focus:ring-green-500 outline-none"
                    >
                        {[OrdinanceType.PROXY, OrdinanceType.LIVING, OrdinanceType.CHILD, OrdinanceType.NONE].map(tOrdinance => (
                            <option key={tOrdinance} value={tOrdinance}>
                                {translateOrdinance(tOrdinance)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">
                        {(member.ordinance_type === OrdinanceType.CHILD || member.ordinance_type === OrdinanceType.NONE) 
                            ? t('stake.registration.form.participating_activity') 
                            : t('stake.registration.form.ordinance_item')}
                    </label>
                    {(member.ordinance_type === OrdinanceType.CHILD || member.ordinance_type === OrdinanceType.NONE) ? (
                        <select 
                            value={member.ordinance_item} 
                            onChange={e => onUpdate(member.temp_id, 'ordinance_item', e.target.value)} 
                            className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black focus:ring-1 focus:ring-green-500 outline-none"
                        >
                            {['不會參加', '聖殿廣場導覽', '家譜中心導覽', '其他活動'].map(opt => (
                                <option key={opt} value={opt}>{translateOrdinance(opt)}</option>
                            ))}
                        </select>
                    ) : (
                        <select 
                            value={member.ordinance_item} 
                            onChange={e => onUpdate(member.temp_id, 'ordinance_item', e.target.value as OrdinanceItem)} 
                            className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black focus:ring-1 focus:ring-green-500 outline-none"
                        >
                            {(member.ordinance_type === OrdinanceType.PROXY ? proxyOptions : livingOptions).map(opt => (
                                <option key={opt} value={opt}>{translateOrdinance(opt)}</option>
                            ))}
                        </select>
                    )}
                </div>
                
                {serviceOptions.length > 0 && (
                    <div>
                        <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.qualification_label')}</label>
                        <select 
                            value={member.service_qualification || ''} 
                            onChange={e => onUpdate(member.temp_id, 'service_qualification', e.target.value)} 
                            className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black"
                        >
                            <option value="">{tString('stake.registration.form.select_hint')}</option>
                            {serviceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.trip_label')}</label>
                    <select 
                        value={member.trip_type}
                        onChange={e => onUpdate(member.temp_id, 'trip_type', e.target.value as TripType)}
                        className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black"
                    >
                        {enabledTripTypes.map(tTrip => <option key={tTrip} value={tTrip}>{translateTripType(tTrip)}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.identity_label')}</label>
                    <select value={member.identity_type} onChange={e => onUpdate(member.temp_id, 'identity_type', e.target.value)} className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black">
                        {enabledIdentities.map(tIden => <option key={tIden} value={tIden}>{translateIdentityType(tIden)}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-green-900 font-bold mb-1">{t('stake.registration.form.fee_label')}</label>
                    <div className="w-full border rounded h-[38px] px-3 bg-white text-right font-bold text-red-500 flex items-center justify-end text-sm">
                        ${calculatePrice(member)}
                    </div>
                </div>
            </div>
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
        </div>
    );
};

export default MemberItem;
