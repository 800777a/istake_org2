
import { AuditLog } from '../types';
import { db, COLL_LOGS, collection, addDoc, query, orderBy, limit, onSnapshot } from './firebaseConfig';
import { getCurrentUser } from './authService';

export const logAction = (user: string, action: string, details: string, extra?: { account?: string, password?: string }) => {
    const currentUser = getCurrentUser();
    const password = extra?.password || (currentUser && currentUser.name === user ? currentUser.password : '');
    const account = extra?.account || (currentUser?.username || '');

    const log: AuditLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user,
        account: account,
        action,
        details,
        password: password || '' 
    };
    addDoc(collection(db, COLL_LOGS), log);
};

export const subscribeToLogs = (callback: (logs: AuditLog[]) => void) => {
    const q = query(collection(db, COLL_LOGS), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
        const logs: AuditLog[] = [];
        snap.forEach(d => logs.push(d.data() as AuditLog));
        callback(logs);
    });
};
