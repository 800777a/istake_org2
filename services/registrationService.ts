
import { 
    Registration, FamilyGroupInput, RegistrationMemberInput, 
    OrdinanceType, OrdinanceItem, RegStatus, PaymentMethod, DietaryType,
    TripType, FamilyGroup
} from '../types';
import { 
    db, COLL_REGS, COLL_FAMILIES, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
    query, where, onSnapshot, orderBy, limit, writeBatch 
} from './firebaseConfig';
import { getCurrentUser } from './authService';
import { logAction } from './auditService';
import { getSettings } from './settingsService';
import { calculateFeeV2 } from '../utils/billingEngine';

const safeStringify = (obj: any): string => {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        return "[]";
    }
};

export const subscribeToRegistrations = (eventId: string, callback: (regs: Registration[]) => void) => {
    const q = query(collection(db, COLL_REGS), where('event_id', '==', eventId));
    return onSnapshot(q, (snapshot) => {
        const regs: Registration[] = [];
        snapshot.forEach(doc => regs.push(doc.data() as Registration));
        localStorage.setItem('v2_regs', safeStringify(regs)); 
        callback(regs);
    });
};

export const getRegistrations = (eventId: string): Registration[] => {
    try {
        const s = localStorage.getItem('v2_regs');
        if (!s || s === "undefined") return [];
        const all: Registration[] = JSON.parse(s);
        return all.filter(r => r.event_id === eventId);
    } catch (e) {
        return [];
    }
};

export const getUnitRegistrations = (eventId: string, unit: string): Registration[] => {
    const regs = getRegistrations(eventId);
    return regs.filter(r => r.unit === unit);
};

export const calculatePrice = (unit: string, identity: string, trip: string, isStaff: boolean, isFirstTime: boolean): number => {
    const settings = getSettings();
    
    // V320: Check if new billing engine is configured
    if (settings.billingConfig) {
        return calculateFeeV2(
            { unit }, 
            settings.billingConfig, 
            identity, 
            trip
        );
    }

    const config = settings.price_config[unit]?.[identity];
    
    if (!config) return 0; 
    
    let basePrice = 0;
    if (trip === TripType.ROUND_TRIP) basePrice = config.round_trip;
    else if (trip === TripType.ONE_WAY_TO || trip === TripType.ONE_WAY_BACK) basePrice = config.one_way;
    else return 0; 

    if (isFirstTime) return 0;
    if (isStaff) return Math.floor(basePrice / 2);
    
    return basePrice;
};

export const saveFamilyRegistration = async (input: FamilyGroupInput, eventId: string) => {
    const familyId = `FAM-${Date.now()}`;
    const batch = writeBatch(db);
    const createdRegs: Registration[] = [];

    const cleanPrimaryName = input.primary_name.trim();
    const cleanPassword = input.primary_phone.trim();

    const familyData: FamilyGroup = {
        id: familyId,
        event_id: eventId,
        primary_name: cleanPrimaryName,
        primary_phone: cleanPassword, 
        contact_phone: input.primary_real_phone || '', 
        primary_unit: input.primary_unit,
        payment_method: input.payment_method,
        transfer_last_5: input.transfer_last_5 || '',
        needs_self_paid_insurance: input.needs_self_paid_insurance || false,
        created_at: new Date().toISOString()
    };
    batch.set(doc(db, COLL_FAMILIES, familyId), familyData);

    let maxSerial = 0;
    let maxEndowmentSerial = 0;
    let maxBaptismSerial = 0;
    const currentRegs = getRegistrations(eventId);
    if (currentRegs && currentRegs.length > 0) {
        maxSerial = Math.max(...currentRegs.map(r => r.serial_number || 0));
        maxEndowmentSerial = Math.max(...currentRegs.map(r => r.endowment_serial_number || 0));
        maxBaptismSerial = Math.max(...currentRegs.map(r => r.baptism_serial_number || 0));
    }

    for (const m of input.members) {
        maxSerial++;

        let endowmentSerial: number | null = null;
        let baptismSerial: number | null = null;
        if (m.ordinance_type === OrdinanceType.PROXY) {
            if (m.ordinance_item === OrdinanceItem.ENDOWMENT) {
                maxEndowmentSerial++;
                endowmentSerial = maxEndowmentSerial;
            } else if (m.ordinance_item === OrdinanceItem.BAPTISM) {
                maxBaptismSerial++;
                baptismSerial = maxBaptismSerial;
            }
        }

        const price = calculatePrice(input.primary_unit, m.identity_type, m.trip_type, m.is_staff, m.is_new_member);
        
        const cleanMemberName = m.name.trim();
        const isPrimary = cleanMemberName === cleanPrimaryName;

        const regId = `R-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        const reg: Registration = {
            reg_id: regId,
            serial_number: maxSerial,
            endowment_serial_number: endowmentSerial ?? undefined,
            baptism_serial_number: baptismSerial ?? undefined,
            event_id: eventId,
            family_group_id: familyId,
            is_primary_contact: isPrimary, 
            primary_contact_name: cleanPrimaryName, 
            name: cleanMemberName,
            phone: cleanPassword, 
            contact_phone: input.primary_real_phone || '', 
            identity_id: m.identity_id,
            birth_date: m.birth_date,
            unit: input.primary_unit,
            identity_type: m.identity_type,
            trip_type: m.trip_type,
            ordinance_type: m.ordinance_type,
            ordinance_item: m.ordinance_item,
            ceremony_session: m.ceremony_session || '',
            is_staff: m.is_staff,
            staff_role: m.staff_role || '', 
            is_new_member: m.is_new_member,
            boarding_place: m.boarding_place || '', 
            payment_method: input.payment_method,
            transfer_last_5: input.transfer_last_5 || '', 
            needs_self_paid_insurance: input.needs_self_paid_insurance || false,
            amount_due: price,
            dietary_preference: m.dietary_preference || DietaryType.NO_MEAL,
            is_paid: false,
            is_checked_in: false,
            status: RegStatus.NORMAL,
            created_at: m.created_at ? m.created_at : new Date().toISOString()
        };
        
        batch.set(doc(db, COLL_REGS, regId), reg);
        createdRegs.push(reg);
    }

    try {
        await batch.commit();
        const currentUser = getCurrentUser();
        const userName = currentUser ? currentUser.name : 'System';
        logAction(userName, '報名', `家庭代表人 ${cleanPrimaryName} 報名 ${input.members.length} 位成員`);
        return { success: true, regs: createdRegs };
    } catch (e: any) {
        console.error("Save Registration Error: ", e);
        return { success: false, message: e.message };
    }
};

export const updateRegistrationField = async (regId: string, field: string, value: any) => {
    await updateDoc(doc(db, COLL_REGS, regId), { [field]: value });
};

export const batchUpdateRegistrationField = async (regIds: string[], field: string, value: any) => {
    const batch = writeBatch(db);
    regIds.forEach(id => {
        batch.update(doc(db, COLL_REGS, id), { [field]: value });
    });
    await batch.commit();
};

export const batchUpdateRegistrationFields = async (updates: { regId: string, data: Record<string, any> }[]) => {
    const batch = writeBatch(db);
    updates.forEach(u => {
        batch.update(doc(db, COLL_REGS, u.regId), u.data);
    });
    await batch.commit();
};

export const deleteRegistration = async (regId: string) => {
    await deleteDoc(doc(db, COLL_REGS, regId));
};

export const updateRegistration = async (reg: Registration) => {
    // Extract only necessary fields to avoid circular structure issues
    const safeReg = {
        reg_id: reg.reg_id,
        serial_number: reg.serial_number,
        endowment_serial_number: reg.endowment_serial_number,
        baptism_serial_number: reg.baptism_serial_number,
        sealing_serial_number: reg.sealing_serial_number,
        event_id: reg.event_id,
        family_group_id: reg.family_group_id,
        is_primary_contact: reg.is_primary_contact,
        primary_contact_name: reg.primary_contact_name,
        name: reg.name,
        phone: reg.phone,
        contact_phone: reg.contact_phone,
        identity_id: reg.identity_id,
        birth_date: reg.birth_date,
        unit: reg.unit,
        identity_type: reg.identity_type,
        meal_item: reg.meal_item,
        room_item: reg.room_item,
        other_item: reg.other_item,
        guardian: reg.guardian,
        trip_type: reg.trip_type,
        ordinance_type: reg.ordinance_type,
        ordinance_item: reg.ordinance_item,
        ceremony_session: reg.ceremony_session,
        is_staff: reg.is_staff,
        staff_role: reg.staff_role,
        is_new_member: reg.is_new_member,
        boarding_place: reg.boarding_place,
        payment_method: reg.payment_method,
        transfer_last_5: reg.transfer_last_5,
        amount_due: reg.amount_due,
        dietary_preference: reg.dietary_preference,
        is_paid: reg.is_paid,
        is_checked_in: reg.is_checked_in,
        is_checked_in_to: reg.is_checked_in_to,
        is_checked_in_back: reg.is_checked_in_back,
        admin_note: reg.admin_note,
        status: reg.status,
        bus_assigned: reg.bus_assigned,
        seat_no: reg.seat_no,
        created_at: reg.created_at,
        has_feedback: reg.has_feedback,
        duty_description: reg.duty_description,
        personal_goal: reg.personal_goal,
        safety_status: reg.safety_status,
        ancestors: reg.ancestors,
        trivia_score: reg.trivia_score
    };
    await updateDoc(doc(db, COLL_REGS, reg.reg_id), safeReg);
};

export const batchUpdatePaymentStatus = async (regIds: string[], isPaid: boolean) => {
    const batch = writeBatch(db);
    regIds.forEach(id => {
        batch.update(doc(db, COLL_REGS, id), { 
            is_paid: isPaid, 
            updated_at: new Date().toISOString() 
        });
    });
    await batch.commit();
};

export const batchUpdateCheckIn = async (eventId: string, unit: string | null, type: 'to' | 'back' | 'both') => {
    try {
        let q = query(collection(db, COLL_REGS), where('event_id', '==', eventId));
        if (unit) {
            q = query(q, where('unit', '==', unit));
        }
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        
        snap.forEach(d => {
            const updates: any = {};
            if (type === 'to' || type === 'both') {
                updates.is_checked_in_to = false;
                updates.is_checked_in = false;
            }
            if (type === 'back' || type === 'both') {
                updates.is_checked_in_back = false;
            }
            if (Object.keys(updates).length > 0) {
                batch.update(d.ref, updates);
            }
        });
        
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("Batch Reset Check-in Error:", e);
        return { success: false, message: e.message };
    }
};

export const cancelSelfRegistration = async (regId: string) => {
    try {
        await updateDoc(doc(db, COLL_REGS, regId), { status: RegStatus.CANCELLED });
        return { success: true, message: '取消成功' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const cancelFamilyRegistration = async (familyId: string) => {
    try {
        const q = query(collection(db, COLL_REGS), where('family_group_id', '==', familyId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.update(d.ref, { status: RegStatus.CANCELLED }));
        await batch.commit();
        return { success: true, message: '整筆取消成功' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const lookupRegistration = async (unit: string, name: string, password: string, eventId: string): Promise<Registration[]> => {
    // Attempt to find by family group primary contact or name+phone matching
    const qFamily = query(collection(db, COLL_FAMILIES), 
        where('event_id', '==', eventId), 
        where('primary_phone', '==', password),
        where('primary_name', '==', name),
        where('primary_unit', '==', unit)
    );
    const snapFamily = await getDocs(qFamily);
    
    if (!snapFamily.empty && snapFamily.docs[0]) {
        const familyId = snapFamily.docs[0].id;
        return getFamilyMembers(familyId, eventId);
    }

    // Fallback: search in registrations directly for primary contacts matching
    const qRegs = query(collection(db, COLL_REGS), 
        where('event_id', '==', eventId), 
        where('phone', '==', password),
        where('name', '==', name),
        where('unit', '==', unit),
        where('is_primary_contact', '==', true)
    );
    const snapRegs = await getDocs(qRegs);
    if (!snapRegs.empty && snapRegs.docs[0]) {
        const familyId = snapRegs.docs[0].data().family_group_id;
        return getFamilyMembers(familyId, eventId);
    }

    return [];
};

export const getFamilyMembers = async (familyId: string, eventId: string): Promise<Registration[]> => {
    const q = query(collection(db, COLL_REGS), 
        where('event_id', '==', eventId), 
        where('family_group_id', '==', familyId)
    );
    const snap = await getDocs(q);
    const members: Registration[] = [];
    snap.forEach(d => members.push(d.data() as Registration));
    return members;
};

export const assignSeat = async (regId: string, seat: string) => {
    await updateRegistrationField(regId, 'seat_number', seat);
};

export const assignMissingSerialNumbers = async (eventId: string, registrations: Registration[]) => {
    try {
        const batch = writeBatch(db);
        let maxSerial = Math.max(0, ...registrations.map(r => r.serial_number || 0));
        let maxEndowment = Math.max(0, ...registrations.map(r => r.endowment_serial_number || 0));
        let maxBaptism = Math.max(0, ...registrations.map(r => r.baptism_serial_number || 0));
        let updatedCount = 0;

        for (const r of registrations) {
            let changed = false;
            const updates: any = {};
            if (!r.serial_number) {
                maxSerial++;
                updates.serial_number = maxSerial;
                changed = true;
            }
            if (r.ordinance_type === OrdinanceType.PROXY) {
                if (r.ordinance_item === OrdinanceItem.ENDOWMENT && !r.endowment_serial_number) {
                    maxEndowment++;
                    updates.endowment_serial_number = maxEndowment;
                    changed = true;
                } else if (r.ordinance_item === OrdinanceItem.BAPTISM && !r.baptism_serial_number) {
                    maxBaptism++;
                    updates.baptism_serial_number = maxBaptism;
                    changed = true;
                }
            }
            if (changed) {
                batch.update(doc(db, COLL_REGS, r.reg_id), updates);
                updatedCount++;
            }
        }
        await batch.commit();
        return { success: true, message: `成功分配 ${updatedCount} 筆編號` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const batchImportRegistrations = async (regs: Registration[], eventId: string) => {
    try {
        const batch = writeBatch(db);
        regs.forEach(r => {
            batch.set(doc(db, COLL_REGS, r.reg_id), { ...r, event_id: eventId });
        });
        await batch.commit();
        return { success: true, count: regs.length };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const batchUpdateSession = async (eventId: string, ordinance: OrdinanceItem, session: string, unitFilter?: string) => {
    try {
        const q = query(collection(db, COLL_REGS), 
            where('event_id', '==', eventId), 
            where('ordinance_item', '==', ordinance),
            where('status', '==', RegStatus.NORMAL)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => {
            const data = d.data() as Registration;
            if (!unitFilter || data.unit === unitFilter) {
                batch.update(d.ref, { ceremony_session: session });
            }
        });
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const subscribeToBlacklist = (callback: (list: any[]) => void) => {
    const q = query(collection(db, 'blacklist'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        callback(list);
    });
};

export const addBlacklistItem = async (item: any) => {
    await addDoc(collection(db, 'blacklist'), { ...item, created_at: new Date().toISOString() });
};

export const deleteBlacklistItem = async (id: string) => {
    await deleteDoc(doc(db, 'blacklist', id));
};

export const batchAddToBlacklist = async (items: any[]) => {
    const batch = writeBatch(db);
    items.forEach(item => {
        const newRef = doc(collection(db, 'blacklist'));
        batch.set(newRef, { ...item, created_at: new Date().toISOString() });
    });
    await batch.commit();
};

export const updateFamilyRegistration = async (familyId: string, input: FamilyGroupInput, eventId: string) => {
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, COLL_FAMILIES, familyId), {
            primary_name: input.primary_name,
            primary_phone: input.primary_phone,
            contact_phone: input.primary_real_phone,
            primary_unit: input.primary_unit,
            payment_method: input.payment_method,
            transfer_last_5: input.transfer_last_5,
            needs_self_paid_insurance: input.needs_self_paid_insurance
        });

        const regs: Registration[] = input.members.map(m => ({
            ...m,
            reg_id: m.temp_id,
            event_id: eventId,
            family_group_id: familyId,
            needs_self_paid_insurance: input.needs_self_paid_insurance
        } as any as Registration));

        regs.forEach(r => batch.set(doc(db, COLL_REGS, r.reg_id), r, { merge: true }));
        await batch.commit();
        return { success: true, regs };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const checkDuplicateNameAsync = async (eventId: string, name: string): Promise<boolean> => {
    const q = query(collection(db, COLL_REGS), where('event_id', '==', eventId), where('name', '==', name), where('status', '==', RegStatus.NORMAL));
    const snap = await getDocs(q);
    return !snap.empty;
};

export const checkDuplicateIDAsync = async (eventId: string, identityId: string): Promise<boolean> => {
    if (!identityId) return false;
    const q = query(collection(db, COLL_REGS), where('event_id', '==', eventId), where('identity_id', '==', identityId), where('status', '==', RegStatus.NORMAL));
    const snap = await getDocs(q);
    return !snap.empty;
};

export const updateFamilyPaymentStatus = async (familyId: string, isPaid: boolean) => {
    try {
        const q = query(collection(db, COLL_REGS), where('family_group_id', '==', familyId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.update(d.ref, { is_paid: isPaid }));
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};
