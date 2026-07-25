
import { useState, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../src/contexts/LanguageContext';
import { 
    FamilyGroupInput, 
    RegistrationMemberInput, 
    TripType, 
    EventData, 
    IdentityType, 
    OrdinanceType, 
    OrdinanceItem, 
    PaymentMethod, 
    Registration, 
    WeatherInfo, 
    BlacklistItem,
    GlobalSettings,
    DietaryType
} from '../types';
import { isRegistrationClosed } from '../src/utils/registrationUtils';
import { validateIdentityId, calculateAge, determineAgeGroup, validateNameFormat } from '../utils/validation';
import * as sheetService from '../services/sheetService';
import { calculateStats } from './useStats';

export function useRegistrationForm(setIsDirty?: (dirty: boolean) => void) {
    const { t } = useI18n();
    const [mode, setMode] = useState<'register' | 'lookup'>('register');
    const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
    const [settings, setSettings] = useState<GlobalSettings>(sheetService.getSettings());
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    
    const [eventStats, setEventStats] = useState({ capacity: 0, occupied: 0, waiting: 0, remaining: 0 });
    const [ordinanceStats, setOrdinanceStats] = useState<{
        endowment: { capacity: number; occupied: number; waiting: number; remaining: number };
        baptism: { capacity: number; occupied: number; waiting: number; remaining: number };
        sealing: { capacity: number; occupied: number; waiting: number; remaining: number };
    }>({
        endowment: { capacity: 0, occupied: 0, waiting: 0, remaining: 0 },
        baptism: { capacity: 0, occupied: 0, waiting: 0, remaining: 0 },
        sealing: { capacity: 0, occupied: 0, waiting: 0, remaining: 0 }
    });

    const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
    const [personalInfoList, setPersonalInfoList] = useState<any[]>([]);
    const [representatives, setRepresentatives] = useState<any[]>([]);
    
    const [primaryName, setPrimaryName] = useState('');
    const [primaryPassword, setPrimaryPassword] = useState('');
    const [primaryContactPhone, setPrimaryContactPhone] = useState('');
    const [primaryUnit, setPrimaryUnit] = useState(''); 
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [transferLast5, setTransferLast5] = useState('');
    const [needsSelfPaidInsurance, setNeedsSelfPaidInsurance] = useState(false);
    const [members, setMembers] = useState<RegistrationMemberInput[]>([]);
    const hasInitializedMembers = useRef(false);
    
    const [editingFamilyGroupId, setEditingFamilyGroupId] = useState<string | null>(null);
    const [lookupIntent, setLookupIntent] = useState<'edit' | 'delete'>('edit');
    const [lookupUnit, setLookupUnit] = useState('');
    const [lookupName, setLookupName] = useState('');
    const [lookupPassword, setLookupPassword] = useState('');
    const [lookupResults, setLookupResults] = useState<Registration[] | null>(null);
    const [lookupAttempts, setLookupAttempts] = useState(0);
    const [lookupLockCountdown, setLookupLockCountdown] = useState(0);
    const [lockCountdown, setLockCountdown] = useState(0);

    const addMember = () => {
        const defaultBoarding = (sheetService.getSettings().boarding_places || [])[0] || '';
        setMembers((prevMembers) => [
          ...prevMembers,
          {
            temp_id: Date.now().toString(),
            name: '',
            identity_id: '',
            birth_date: '',
            trip_type: TripType.ROUND_TRIP,
            is_staff: false,
            is_new_member: false,
            identity_type: IdentityType.ADULT,
            ordinance_type: OrdinanceType.PROXY, 
            ordinance_item: OrdinanceItem.BAPTISM, 
            boarding_place: defaultBoarding,
            ceremony_session: '', 
            dietary_preference: DietaryType.NO_MEAL, 
          },
        ]);
    };

    useEffect(() => {
        const checkLock = () => {
            const now = Date.now();
            const lockUntilStr = localStorage.getItem('reg_lock_until');
            if (lockUntilStr) {
                const lockUntil = parseInt(lockUntilStr, 10);
                if (lockUntil > now) {
                    setLockCountdown(Math.ceil((lockUntil - now) / 1000));
                } else {
                    setLockCountdown(0);
                    localStorage.removeItem('reg_lock_until'); 
                }
            }
            const lookupLockUntilStr = localStorage.getItem('lookup_lock_until');
            if (lookupLockUntilStr) {
                const lockUntil = parseInt(lookupLockUntilStr, 10);
                if (lockUntil > now) {
                    setLookupLockCountdown(Math.ceil((lockUntil - now) / 1000));
                } else {
                    setLookupLockCountdown(0);
                    setLookupAttempts(0);
                    localStorage.removeItem('lookup_lock_until');
                }
            }
        };
        checkLock();
        const interval = setInterval(checkLock, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let unsubRegs = () => {};
        const unsubEvents = sheetService.subscribeToEvents((events) => {
            const active = events.find(e => e.is_active);
            setActiveEvent(active);
            if(active) {
                 if (unsubRegs) unsubRegs();
                 unsubRegs = sheetService.subscribeToRegistrations(active.event_id, (allRegs) => {
                     const { vehicleStats, ordinanceStats: oStats } = calculateStats(active, allRegs);
                     setEventStats(vehicleStats);
                     setOrdinanceStats(oStats);
                 });
            }
        });
        const unsubSettings = sheetService.subscribeToSettings((cfg) => setSettings(cfg));
        const unsubBlacklist = sheetService.subscribeToBlacklist((list) => setBlacklist(list));
        const unsubPersonalInfo = sheetService.subscribeToPersonalInfo((list) => setPersonalInfoList(list));
        const unsubRepresentatives = sheetService.subscribeToRepresentatives((list) => setRepresentatives(list));

        if (members.length === 0 && !hasInitializedMembers.current) {
            addMember();
            hasInitializedMembers.current = true;
        }
        
        return () => {
            unsubEvents();
            unsubSettings();
            unsubRegs();
            unsubBlacklist();
            unsubPersonalInfo();
            unsubRepresentatives();
        }
    }, [members.length]);

    useEffect(() => {
        if (setIsDirty) setIsDirty(isFormDirty());
    }, [primaryName, primaryPassword, primaryUnit, members, needsSelfPaidInsurance, setIsDirty]);

    const isFormDirty = () => {
        if (primaryName.trim() || primaryPassword.trim() || primaryUnit || needsSelfPaidInsurance) return true;
        if (members.length > 1) return true;
        if (members.length === 1) {
            const m = members[0];
            if (m.name.trim() || m.identity_id.trim()) return true;
        }
        return false;
    };
    const [isRepresentativeMatched, setIsRepresentativeMatched] = useState(false);
    const [isPrimaryNameFinished, setIsPrimaryNameFinished] = useState(false);

    const validateForm = async (): Promise<boolean> => {
        if (!activeEvent) return false; 
        if (isRegistrationClosedCheck()) {
            setMsg({type: 'error', text: t('stake.registration.form.reg_closed_msg')});
            return false;
        }
        if (lockCountdown > 0) return false;
        if (!primaryName || !primaryPassword || !primaryUnit) { setMsg({type: 'error', text: t('stake.registration.form.incomplete_primary_msg')}); return false; } 
        if (!primaryContactPhone || !primaryContactPhone.trim()) {
            setMsg({ type: 'error', text: t('stake.registration.form.missing_phone_msg') });
            return false;
        }
        const primaryNameCheck = validateNameFormat(primaryName);
        if (!primaryNameCheck.isValid) {
            setMsg({ type: 'error', text: `${t('stake.registration.form.name_format_error')}: ${primaryNameCheck.error}` });
            return false;
        }
        if (/^\d+$/.test(primaryName)) {
            setMsg({ type: 'error', text: t('stake.registration.form.name_number_error') });
            return false;
        }
        const blacklistedPrimary = blacklist.find(b => b.name === primaryName.trim());
        if (blacklistedPrimary) {
            setMsg({ type: 'error', text: t('stake.registration.form.blacklist_msg', { name: primaryName, reason: blacklistedPrimary.reason }) });
            return false;
        }
        if (!editingFamilyGroupId) {
            const isPrimaryDup = await sheetService.checkDuplicateNameAsync(activeEvent.event_id, primaryName);
            if (isPrimaryDup) {
                 setMsg({ type: 'error', text: t('stake.registration.form.duplicate_name_msg', { name: primaryName }) });
                 return false;
            }
        }
        const pwdRegex = /(?=.*[A-Za-z])(?=.*\d)/;
        if (!pwdRegex.test(primaryPassword)) {
            setMsg({ type: 'error', text: t('stake.registration.form.password_format_error') });
            return false;
        }
        if (!(settings.units || []).includes(primaryUnit)) {
            setMsg({ type: 'error', text: t('stake.registration.form.invalid_unit_msg') });
            return false;
        }
        if (!paymentMethod) {
            setMsg({ type: 'error', text: t('stake.registration.form.select_payment_msg') });
            return false;
        }
        for (const m of members) { 
            if (!m.name || !m.birth_date || !m.identity_id) { setMsg({ type: 'error', text: t('stake.registration.form.missing_fields_msg') }); return false; } 
            if (!validateIdentityId(m.identity_id)) { 
                setMsg({ type: 'error', text: t('stake.registration.form.id_format_error', { name: m.name }) }); 
                return false; 
            } 
            const nameCheck = validateNameFormat(m.name);
            if (!nameCheck.isValid) {
                setMsg({ type: 'error', text: `${t('stake.registration.form.member_name_error', { name: m.name })}: ${nameCheck.error}` });
                return false;
            }
            if (/^\d+$/.test(m.name)) {
                setMsg({ type: 'error', text: t('stake.registration.form.member_name_number_error', { name: m.name }) });
                return false;
            }
            const blacklistedMember = blacklist.find(b => b.name === m.name.trim());
            if (blacklistedMember) {
                setMsg({ type: 'error', text: t('stake.registration.form.member_blacklist_msg', { name: m.name, reason: blacklistedMember.reason }) });
                return false;
            }
            const [yStr, mStr, dStr] = m.birth_date.split('-');
            const y = parseInt(yStr);
            const month = parseInt(mStr);
            const d = parseInt(dStr);
            const maxDay = new Date(y, month, 0).getDate();
            if (d > maxDay) {
                 setMsg({ type: 'error', text: t('stake.registration.form.invalid_birth_msg', { name: m.name, month, day: d }) });
                 return false;
            }
            const age = calculateAge(m.birth_date, activeEvent.event_date); 
            const group = determineAgeGroup(age); 
            if (!group) { setMsg({ type: 'error', text: t('stake.registration.form.invalid_birth_basic', { name: m.name }) }); return false; } 
            if (m.ordinance_type !== OrdinanceType.NONE && m.ordinance_type !== OrdinanceType.CHILD && m.ordinance_item === OrdinanceItem.NONE) {
                setMsg({ type: 'error', text: t('stake.registration.form.missing_ordinance_msg', { name: m.name }) }); 
                return false; 
            }
            if (!editingFamilyGroupId) {
                const isNameDup = await sheetService.checkDuplicateNameAsync(activeEvent.event_id, m.name);
                if (isNameDup) {
                     setMsg({ type: 'error', text: t('stake.registration.form.member_duplicate_name', { name: m.name }) });
                     return false;
                }
                const isIdDup = await sheetService.checkDuplicateIDAsync(activeEvent.event_id, m.identity_id);
                if (isIdDup) {
                     setMsg({ type: 'error', text: t('stake.registration.form.member_duplicate_id', { name: m.name, id: m.identity_id }) });
                     return false;
                }
            }
        }
        if (activeEvent.status === 'confirmed' && paymentMethod === PaymentMethod.TRANSFER && transferLast5.length > 0 && transferLast5.length !== 5) {
            setMsg({ type: 'error', text: t('stake.registration.form.transfer_last5_error') });
            return false;
        }
        return true;
    };

    const handleLookup = async () => {
        if (!activeEvent) return;
        if (lookupLockCountdown > 0) return;
        if (!lookupName || !lookupPassword || !lookupUnit) {
            setMsg({ type: 'error', text: t('stake.registration.form.incomplete_lookup_msg') });
            return;
        }
        setLoading(true);
        try {
            const results = await sheetService.lookupRegistration(lookupUnit, lookupName, lookupPassword, activeEvent.event_id);
            if (results && results.length > 0) {
                setLookupResults(results);
                setLookupAttempts(0);
            } else {
                setMsg({ type: 'error', text: t('stake.registration.form.lookup_not_found') });
                const newAttempts = lookupAttempts + 1;
                setLookupAttempts(newAttempts);
                if (newAttempts >= 5) {
                    const lockTime = Date.now() + 300 * 1000;
                    localStorage.setItem('lookup_lock_until', lockTime.toString());
                    setLookupLockCountdown(300);
                }
            }
        } catch (e: any) {
            setMsg({ type: 'error', text: e.message || t('stake.registration.form.lookup_error') });
        }
        setLoading(false);
    };

    const startEdit = (reg: Registration) => {
        setMode('register');
        setEditingFamilyGroupId(reg.family_group_id || reg.reg_id);
        setPrimaryName(reg.primary_contact_name || reg.name);
        setPrimaryPassword(reg.phone || '');
        setPrimaryContactPhone(reg.contact_phone || '');
        setPrimaryUnit(reg.unit);
        setPaymentMethod(reg.payment_method || '');
        setTransferLast5(reg.transfer_last_5 || '');
        setNeedsSelfPaidInsurance(!!reg.needs_self_paid_insurance);
        
        sheetService.getFamilyMembers(reg.family_group_id || reg.reg_id, activeEvent!.event_id).then((mList: Registration[]) => {
            if (mList && mList.length > 0) {
                setMembers(mList.map((m: Registration) => ({
                    temp_id: m.reg_id,
                    name: m.name,
                    identity_id: m.identity_id,
                    birth_date: m.birth_date,
                    trip_type: m.trip_type,
                    is_staff: m.is_staff,
                    is_new_member: m.is_new_member,
                    identity_type: m.identity_type,
                    ordinance_type: m.ordinance_type,
                    ordinance_item: m.ordinance_item,
                    boarding_place: m.boarding_place,
                    ceremony_session: m.ceremony_session || '',
                    dietary_preference: m.dietary_preference || DietaryType.NO_MEAL,
                    guardian: m.guardian || '',
                    is_personal_info_matched: true
                })));
            } else {
                setMembers([{
                    temp_id: reg.reg_id,
                    name: reg.name,
                    identity_id: reg.identity_id,
                    birth_date: reg.birth_date,
                    trip_type: reg.trip_type,
                    is_staff: reg.is_staff,
                    is_new_member: reg.is_new_member,
                    identity_type: reg.identity_type,
                    ordinance_type: reg.ordinance_type,
                    ordinance_item: reg.ordinance_item,
                    boarding_place: reg.boarding_place || '',
                    ceremony_session: reg.ceremony_session || '',
                    dietary_preference: reg.dietary_preference || DietaryType.NO_MEAL,
                    guardian: reg.guardian || '',
                    is_personal_info_matched: true
                }]);
            }
        });
    };

    const isRegistrationClosedCheck = () => {
        return isRegistrationClosed(activeEvent || null, eventStats);
    };

    const executeSubmit = async () => {
        if (!activeEvent || !paymentMethod) return;
        setLoading(true); 
        const input: FamilyGroupInput = { 
            primary_name: primaryName, 
            primary_phone: primaryPassword, 
            primary_real_phone: primaryContactPhone, 
            primary_unit: primaryUnit, 
            payment_method: paymentMethod as PaymentMethod, 
            transfer_last_5: paymentMethod === PaymentMethod.TRANSFER ? transferLast5 : '', 
            needs_self_paid_insurance: needsSelfPaidInsurance,
            members, 
        }; 
        let result;
        try {
            if (editingFamilyGroupId) {
                result = await sheetService.updateFamilyRegistration(editingFamilyGroupId, input, activeEvent.event_id);
            } else {
                result = await sheetService.saveFamilyRegistration(input, activeEvent.event_id);
            }
        } catch (e: any) {
            result = { success: false, message: e.message || t('stake.registration.form.unknown_error') };
        }

        setLoading(false); 
        if (result.success) { 
            members.forEach(async (m) => {
               if (m.name.trim() && m.identity_id.trim()) {
                   await sheetService.checkAndAddPersonalInfo(primaryUnit, m.name.trim(), m.birth_date, m.identity_id.trim().toUpperCase());
               }
            });
            if (primaryName.trim() && primaryContactPhone && primaryPassword) {
                await sheetService.checkAndAddRepresentative(primaryUnit, primaryName.trim(), primaryContactPhone, primaryPassword);
            }
            setMsg({ type: 'success', text: editingFamilyGroupId ? t('stake.registration.form.edit_success_msg') : t('stake.registration.form.reg_success_msg') }); 
            handleReset();
            const lockTime = Date.now() + 180 * 1000;
            localStorage.setItem('reg_lock_until', lockTime.toString());
            setLockCountdown(180);
        } else { 
            setMsg({ type: 'error', text: result.message }); 
        } 
    };

    const handleReset = () => {
        setPrimaryName(''); 
        setPrimaryPassword(''); 
        setPrimaryContactPhone(''); 
        setTransferLast5(''); 
        setNeedsSelfPaidInsurance(false);
        setMembers([]); 
        setEditingFamilyGroupId(null);
        setPaymentMethod(''); 
        setTimeout(() => addMember(), 0); 
    };

    const removeMember = (tempId: string) => { 
        if (members.length <= 1) return;
        setMembers(members.filter((m) => m.temp_id !== tempId)); 
    };

    const updateMember = (tempId: string, field: keyof RegistrationMemberInput, value: any) => { 
        setMembers(prev => prev.map((m) => { 
            if (m.temp_id !== tempId) return m; 
            let updatedMember = { ...m, [field]: value }; 
            if (field === 'name' && typeof value === 'string') {
                updatedMember.guardian = ''; 
                if (value.trim()) {
                    const matchedInfo = personalInfoList.find(p => p.unit === (m.unit || primaryUnit) && p.name === value.trim());
                    if (matchedInfo) {
                        updatedMember.birth_date = matchedInfo.birth_date;
                        updatedMember.identity_id = matchedInfo.identity_id;
                        updatedMember.is_personal_info_matched = true;
                    } else {
                        if (m.is_personal_info_matched) {
                            updatedMember.birth_date = '';
                            updatedMember.identity_id = '';
                        }
                        updatedMember.is_personal_info_matched = false;
                    }
                } else {
                    if (m.is_personal_info_matched) {
                        updatedMember.birth_date = '';
                        updatedMember.identity_id = '';
                    }
                    updatedMember.is_personal_info_matched = false;
                }
            }
            if (field === 'ordinance_type') {
                if (value === OrdinanceType.NONE || value === OrdinanceType.CHILD) {
                    updatedMember.ordinance_item = OrdinanceItem.NONE;
                    updatedMember.ceremony_session = '';
                } else if (value === OrdinanceType.PROXY) {
                    updatedMember.ordinance_item = OrdinanceItem.BAPTISM;
                } else if (value === OrdinanceType.LIVING) {
                    updatedMember.ordinance_item = OrdinanceItem.ENDOWMENT;
                }
            }
            if (field === 'is_staff' && !value) { updatedMember.staff_role = undefined; } 
            return updatedMember; 
        })); 
    };

    const updateMemberBirthday = (tempId: string, field: 'year' | 'month' | 'day', val: number) => {
        setMembers(members.map(m => {
            if (m.temp_id !== tempId) return m;
            const current = new Date(m.birth_date);
            let y = isNaN(current.getFullYear()) ? 2000 : current.getFullYear();
            let month = isNaN(current.getMonth()) ? 1 : current.getMonth() + 1;
            let d = isNaN(current.getDate()) ? 1 : current.getDate();
            if (field === 'year') y = val;
            if (field === 'month') month = val;
            if (field === 'day') d = val;
            const newDateStr = `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const updatedMember = { ...m, birth_date: newDateStr };
            if (activeEvent) { 
                const age = calculateAge(newDateStr, activeEvent.event_date); 
                const group = determineAgeGroup(age); 
                if (group) { updatedMember.identity_type = group; } 
            }
            return updatedMember;
        }));
    };

    const calculateMemberPrice = (m: RegistrationMemberInput) => { 
        if (!primaryUnit) return 0; 
        return sheetService.calculatePrice(primaryUnit, m.identity_type, m.trip_type, m.is_staff, m.is_new_member); 
    };
    
    const getTotalFamilyDue = () => {
        const memberPriceTotal = members.reduce((sum, m) => sum + calculateMemberPrice(m), 0);
        if (needsSelfPaidInsurance && activeEvent?.self_paid_insurance_amount) {
            return memberPriceTotal + (members.length * activeEvent.self_paid_insurance_amount);
        }
        return memberPriceTotal;
    };

    return {
        mode, setMode,
        lookupIntent, setLookupIntent,
        activeEvent, settings, loading, setLoading, msg, setMsg, weather,
        eventStats, ordinanceStats, blacklist, personalInfoList, representatives,
        primaryName, setPrimaryName,
        primaryPassword, setPrimaryPassword,
        primaryContactPhone, setPrimaryContactPhone,
        primaryUnit, setPrimaryUnit,
        paymentMethod, setPaymentMethod,
        transferLast5, setTransferLast5,
        needsSelfPaidInsurance, setNeedsSelfPaidInsurance,
        members, setMembers,
        editingFamilyGroupId, setEditingFamilyGroupId,
        lookupUnit, setLookupUnit,
        lookupName, setLookupName,
        lookupPassword, setLookupPassword,
        lookupResults, setLookupResults,
        lookupAttempts, setLookupAttempts,
        lookupLockCountdown,
        lockCountdown,
        addMember,
        isFormDirty,
        validateForm,
        executeSubmit,
        handleReset,
        handleLookup,
        startEdit,
        removeMember,
        updateMember,
        updateMemberBirthday,
        calculateMemberPrice,
        getTotalFamilyDue,
        isRegistrationClosedCheck,
        isRepresentativeMatched, setIsRepresentativeMatched,
        isPrimaryNameFinished, setIsPrimaryNameFinished
    };
}
