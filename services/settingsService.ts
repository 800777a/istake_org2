
import { GlobalSettings } from '../types';
import { db, COLL_SETTINGS, doc, setDoc, onSnapshot } from './firebaseConfig';
import { getEffectiveBankInfo, DEFAULT_BANK_INFO } from '../utils/bankInfo';

export const subscribeToSettings = (callback: (settings: GlobalSettings) => void) => {
    const docRef = doc(db, COLL_SETTINGS, 'global');
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data() as GlobalSettings;
            
            // Ensure all required fields exist by merging with DEFAULT_SETTINGS
            const merged = { ...DEFAULT_SETTINGS, ...data };
            
            // Critical array guards
            if (!merged.units || !Array.isArray(merged.units)) merged.units = [];
            if (!merged.boarding_places || !Array.isArray(merged.boarding_places)) merged.boarding_places = [];
            if (!merged.sessions || !Array.isArray(merged.sessions)) merged.sessions = [];
            if (!merged.staff_roles || !Array.isArray(merged.staff_roles)) merged.staff_roles = [];
            if (!merged.payment_methods || !Array.isArray(merged.payment_methods)) merged.payment_methods = ['現金', '轉帳'];

            // Apply effective bank info logic
            merged.bank_info = getEffectiveBankInfo(merged.bank_info);

            localStorage.setItem('v2_settings', JSON.stringify(merged));
            callback(merged);
        } else {
            // Handle case where doc doesn't exist yet
            callback(DEFAULT_SETTINGS);
        }
    });
};

const DEFAULT_SETTINGS: GlobalSettings = {
    stake_name: '聖殿旅行團',
    temple_name: '台北聖殿',
    units: [],
    boarding_places: [],
    bank_info: DEFAULT_BANK_INFO,
    sessions: [],
    staff_roles: [],
    price_config: {},
    payment_methods: ['現金', '轉帳']
};

export const getSettings = (): GlobalSettings => {
    try {
        const s = localStorage.getItem('v2_settings');
        if (!s) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(s);
        
        // Ensure all required arrays/objects exist by merging with DEFAULT_SETTINGS
        const merged = { ...DEFAULT_SETTINGS, ...parsed };

        // Ensure critical arrays are not null/undefined even if they exist in parsed
        if (!merged.units || !Array.isArray(merged.units)) merged.units = DEFAULT_SETTINGS.units || [];
        if (!merged.boarding_places || !Array.isArray(merged.boarding_places)) merged.boarding_places = DEFAULT_SETTINGS.boarding_places || [];
        if (!merged.sessions || !Array.isArray(merged.sessions)) merged.sessions = DEFAULT_SETTINGS.sessions || [];
        if (!merged.staff_roles || !Array.isArray(merged.staff_roles)) merged.staff_roles = DEFAULT_SETTINGS.staff_roles || [];
        if (!merged.payment_methods || !Array.isArray(merged.payment_methods)) merged.payment_methods = DEFAULT_SETTINGS.payment_methods || ['現金', '轉帳'];

        // V601: Force replace old placeholders strictly using central utility
        merged.bank_info = getEffectiveBankInfo(merged.bank_info);

        return merged;
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = async (settings: GlobalSettings) => {
    try {
        await setDoc(doc(db, COLL_SETTINGS, 'global'), settings);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const updateSettings = async (settings: GlobalSettings) => {
    return await saveSettings(settings);
};
