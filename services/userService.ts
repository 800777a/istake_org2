
import { User } from '../types';
import { 
    db, COLL_USERS, collection, doc, setDoc, updateDoc, getDocs, query, where, onSnapshot, writeBatch 
} from './firebaseConfig';

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    const q = query(collection(db, COLL_USERS));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ ...doc.data() } as User));
        callback(users);
    });
};

export const saveUser = async (user: User) => {
    // Use username as the direct document ID for consistency and deduplication
    const docRef = doc(db, COLL_USERS, user.username);
    await setDoc(docRef, { ...user, updated_at: new Date().toISOString() }, { merge: true });
};

export const deleteUser = async (username: string) => {
    const docRef = doc(db, COLL_USERS, username);
    await updateDoc(docRef, { deleted: true, updated_at: new Date().toISOString() });
};

export const migrateToCloud = async (localData: any, onProgress?: (msg: string) => void) => {
    try {
        if (onProgress) onProgress('正在準備遷移資料...');
        const batch = writeBatch(db);
        
        // Example migration logic
        if (localData.users) {
            localData.users.forEach((u: User) => {
                batch.set(doc(db, COLL_USERS, u.username), u);
            });
        }
        
        await batch.commit();
        if (onProgress) onProgress('遷移完成！');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const subscribeToPersonalInfo = (callback: (list: any[]) => void) => {
    const q = query(collection(db, 'personal_info'));
    return onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.deleted) {
                list.push({ id: doc.id, ...data });
            }
        });
        callback(list);
    });
};

export const setPersonalInfo = async (info: any) => {
    await setDoc(doc(db, 'personal_info', info.identity_id), info);
};

export const deletePersonalInfo = async (id: string) => {
    await setDoc(doc(db, 'personal_info', id), { deleted: true });
};

export const checkAndAddPersonalInfo = async (unit: string, name: string, birthDate: string, identityId: string) => {
    if (!identityId) return;
    const cleanUnit = (unit || '').trim();
    const cleanName = (name || '').trim();
    const cleanBirth = (birthDate || '').trim();
    const cleanId = identityId.trim().toUpperCase();

    await setPersonalInfo({
        identity_id: cleanId,
        name: cleanName,
        birth_date: cleanBirth,
        unit: cleanUnit,
        updated_at: new Date().toISOString()
    });
};

export const subscribeToRepresentatives = (callback: (list: any[]) => void) => {
    const q = query(collection(db, 'representatives'));
    return onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.deleted) {
                list.push({ id: doc.id, ...data });
            }
        });
        callback(list);
    });
};

export const setRepresentative = async (info: any) => {
    await setDoc(doc(db, 'representatives', info.name), info);
};

export const deleteRepresentative = async (name: string) => {
    await setDoc(doc(db, 'representatives', name), { deleted: true });
};

export const checkAndAddRepresentative = async (unit: string, name: string, phone: string, password?: string) => {
    if (!name) return;
    const cleanUnit = (unit || '').trim();
    const cleanName = name.trim();
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '').trim();

    await setRepresentative({
        name: cleanName,
        phone: cleanPhone,
        password: cleanPassword,
        unit: cleanUnit,
        updated_at: new Date().toISOString()
    });
};
