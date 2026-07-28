
import React, { useState } from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Trash2 } from 'lucide-react';
import Toast, { ToastType } from '../../../components/Toast';
import { RegistrationMemberInput, TripType, OrdinanceType, OrdinanceItem, EventData, GlobalSettings } from '../../../types';
import { getGenderFromId, calculateAge, validateNameFormat, validateIdentityId } from '../../../utils/validation';

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
    errorField?: string | null;
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
    forceShowPersonalInfo,
    errorField
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('error');

    const [isNameFinished, setIsNameFinished] = useState(false);

    const [isGuardianVisible, setIsGuardianVisible] = useState(false);

    const nameCheck = validateNameFormat(member.name);
    const isEnglishName = nameCheck.isValid && nameCheck.isEnglish;

    const isNameError = errorField === `member-${index}-name`;
    const isBirthError = errorField === `member-${index}-birth`;
    const isIdError = errorField === `member-${index}-id`;

    // Check if personal info matches
    const isMatched = !!member.name.trim() && personalInfoList.some(p => p.unit === primaryUnit && p.name === member.name.trim());
    
    // Helper to extract date parts correctly
    const getDateParts = () => {
        if (!member.birth_date) return { year: '', month: '', day: '' };
        const parts = member.birth_date.split('-');
        if (parts.length === 3) {
            return {
                year: parseInt(parts[0]) || '',
                month: parseInt(parts[1]) || '',
                day: parseInt(parts[2]) || ''
            };
        }
        return { year: '', month: '', day: '' };
    };

    const { year: birthYear, month: birthMonth, day: birthDay } = getDateParts();

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
        <div className="bg-white overflow-visible border-2 border-orange-200 rounded shadow-sm relative transition-all hover:shadow-md animate-fade-in min-w-0">
            {/* Level 2: Member Header */}
            <div className="bg-orange-100 px-3 py-3 md:px-6 md:py-4 flex items-center justify-between border-b-2 border-orange-200/50 gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] md:text-sm font-black border-2 border-white shadow-sm shrink-0">
                        {index + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
                        {/* 姓名已在下方姓名欄顯示，此處移除 */}
                    </div>
                </div>
                
                <button 
                    type="button" 
                    onClick={() => onDelete(member)} 
                    disabled={stopCancellation}
                    className={`transition-all p-2 rounded border-2 shrink-0 ${stopCancellation ? 'text-slate-200 border-transparent cursor-not-allowed' : 'text-slate-400 border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-90'}`}
                    title={stopCancellation ? t('stake.registration.form.insured_cannot_cancel') : t('stake.registration.form.delete_member_tooltip')}
                >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
            </div>
            
            <div className="p-3 md:p-6 space-y-4 md:space-y-6 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 min-w-0">
                    <div className="min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">
                            {t('stake.registration.form.name_label')}
                        </label>
                        <input 
                            id={`member-${index}-name`}
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
                            className={`w-full border-2 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 outline-none transition-all font-black ${isNameError ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-orange-200 focus:ring-orange-500'}`}
                            placeholder={tAttr('stake.registration.form.real_name_placeholder')}
                        />
                    </div>
                    {!!member.name.trim() && (isNameFinished || forceShowPersonalInfo || isEnglishName) && (!isMatched || isEnglishName) && (
                        <>
                            <div className="min-w-0">
                                <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.birth_date_label')}</label>
                                <div className={`flex gap-1 p-1 rounded border-2 transition-all min-w-0 ${isBirthError ? 'border-red-500 ring-4 ring-red-200 animate-pulse bg-red-50' : 'border-orange-200 bg-white'}`}>
                                    <select 
                                        id={`member-${index}-birth`}
                                        className="border-2 border-orange-100 rounded h-11 px-1 text-[11px] flex-[1.5] min-w-0 bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none font-black"
                                        value={birthYear}
                                        onChange={e => onUpdateBirthday(member.temp_id, 'year', parseInt(e.target.value))}
                                        onBlur={handleCheckGuardian}
                                    >
                                        <option value="" disabled>{tString('stake.registration.form.year_label', { forceString: true })}</option>
                                        {years.map(y => <option key={y} value={y}>{y}{tString('stake.registration.form.year_label', { forceString: true })}</option>)}
                                    </select>
                                    <select 
                                        className="border-2 border-orange-100 rounded h-11 px-1 text-[11px] flex-1 min-w-0 bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none font-black"
                                        value={birthMonth}
                                        onChange={e => onUpdateBirthday(member.temp_id, 'month', parseInt(e.target.value))}
                                        onBlur={handleCheckGuardian}
                                    >
                                        <option value="" disabled>{tString('stake.registration.form.month_label', { forceString: true })}</option>
                                        {months.map(m => <option key={m} value={m}>{m}{tString('stake.registration.form.month_label', { forceString: true })}</option>)}
                                    </select>
                                    <select 
                                        className="border-2 border-orange-100 rounded h-11 px-1 text-[11px] flex-1 min-w-0 bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none font-black"
                                        value={birthDay}
                                        onChange={e => onUpdateBirthday(member.temp_id, 'day', parseInt(e.target.value))}
                                        onBlur={handleCheckGuardian}
                                    >
                                        <option value="" disabled>{tString('stake.registration.form.day_label', { forceString: true })}</option>
                                        {days.map(d => <option key={d} value={d}>{d}{tString('stake.registration.form.day_label', { forceString: true })}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">
                                    {t('stake.registration.form.id_label')}
                                </label>
                                <input 
                                    id={`member-${index}-id`}
                                    type="text" 
                                    value={member.identity_id} 
                                    onChange={e => onUpdate(member.temp_id, 'identity_id', e.target.value.toUpperCase())} 
                                    className={`w-full border-2 rounded h-11 md:h-12 px-3 text-sm uppercase bg-white text-black focus:ring-4 outline-none transition-all font-black font-mono ${isIdError ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-orange-200 focus:ring-orange-500'}`}
                                    placeholder={tAttr('stake.registration.form.id_placeholder')}
                                    maxLength={15}
                                />
                            </div>
                        </>
                    )}
                </div>

                {isGuardianVisible && (
                    <div className="animate-fade-in pt-1">
                        <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">
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
                            className="w-full border-2 border-orange-200 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                            placeholder={tAttr('stake.registration.form.guardian_placeholder')}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-w-0">
                    <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.ordinance_participation')}</label>
                            <select 
                                value={member.ordinance_type} 
                                onChange={e => {
                                    onUpdate(member.temp_id, 'ordinance_type', e.target.value as OrdinanceType);
                                }}
                                className="w-full border-2 border-orange-200 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                            >
                                {[OrdinanceType.PROXY, OrdinanceType.LIVING, OrdinanceType.CHILD, OrdinanceType.NONE].map(tOrdinance => (
                                    <option key={tOrdinance} value={tOrdinance}>
                                        {translateOrdinance(tOrdinance)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">
                                {(member.ordinance_type === OrdinanceType.CHILD || member.ordinance_type === OrdinanceType.NONE) 
                                    ? t('stake.registration.form.participating_activity') 
                                    : t('stake.registration.form.ordinance_item')}
                            </label>
                            {(member.ordinance_type === OrdinanceType.CHILD || member.ordinance_type === OrdinanceType.NONE) ? (
                                <select 
                                    value={member.ordinance_item} 
                                    onChange={e => onUpdate(member.temp_id, 'ordinance_item', e.target.value)} 
                                    className="w-full border-2 border-orange-200 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                                >
                                    {['不會參加', '聖殿廣場導覽', '家譜中心導覽', '其他活動'].map(opt => (
                                        <option key={opt} value={opt}>{translateOrdinance(opt)}</option>
                                    ))}
                                </select>
                            ) : (
                                <select 
                                    value={member.ordinance_item} 
                                    onChange={e => onUpdate(member.temp_id, 'ordinance_item', e.target.value as OrdinanceItem)} 
                                    className="w-full border-2 border-orange-200 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                                >
                                    {(member.ordinance_type === OrdinanceType.PROXY ? proxyOptions : livingOptions).map(opt => (
                                        <option key={opt} value={opt}>{translateOrdinance(opt)}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        
                        {serviceOptions.length > 0 && (
                            <div className="min-w-0">
                                <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.qualification_label')}</label>
                                <select 
                                    value={member.service_qualification || ''} 
                                    onChange={e => onUpdate(member.temp_id, 'service_qualification', e.target.value)} 
                                    className="w-full border-2 border-orange-200 rounded h-11 md:h-12 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                                >
                                    <option value="">{tString('stake.registration.form.select_hint')}</option>
                                    {serviceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.trip_label')}</label>
                            <select 
                                value={member.trip_type}
                                onChange={e => onUpdate(member.temp_id, 'trip_type', e.target.value as TripType)}
                                className="w-full border-2 border-orange-200 rounded h-11 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black"
                            >
                                {enabledTripTypes.map(tTrip => <option key={tTrip} value={tTrip}>{translateTripType(tTrip)}</option>)}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.identity_label')}</label>
                            <select value={member.identity_type} onChange={e => onUpdate(member.temp_id, 'identity_type', e.target.value)} className="w-full border-2 border-orange-200 rounded h-11 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-orange-500 outline-none transition-all font-black">
                                {enabledIdentities.map(tIden => <option key={tIden} value={tIden}>{translateIdentityType(tIden)}</option>)}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-[10px] md:text-[11px] font-black text-orange-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.fee_label')}</label>
                            <div className="bg-orange-50 h-11 md:h-12 rounded border-2 border-orange-200 flex items-center justify-center shadow-inner">
                                <div className="text-lg md:text-xl font-black text-red-600 font-mono tracking-tighter">
                                    ${calculatePrice(member)}
                                </div>
                            </div>
                        </div>
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
