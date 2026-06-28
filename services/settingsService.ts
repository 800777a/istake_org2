
import { GlobalSettings } from '../types';
import { db, COLL_SETTINGS, doc, setDoc, onSnapshot } from './firebaseConfig';

export const subscribeToSettings = (callback: (settings: GlobalSettings) => void) => {
    const docRef = doc(db, COLL_SETTINGS, 'global');
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as GlobalSettings;
            localStorage.setItem('v2_settings', JSON.stringify(data));
            callback(data);
        }
    });
};

export const getSettings = (): GlobalSettings => {
    try {
        const s = localStorage.getItem('v2_settings');
        return s ? JSON.parse(s) : {} as GlobalSettings;
    } catch (e) {
        return {} as GlobalSettings;
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
