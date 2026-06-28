
import { User } from '../types';
import { db, COLL_USERS, collection, query, where, getDocs } from './firebaseConfig';

export const login = async (username: string, password: string): Promise<User | null> => {
    const q = query(collection(db, COLL_USERS), where('username', '==', username), where('password', '==', password));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        const user = snapshot.docs[0].data() as User;
        updateCurrentSession(user);
        return user;
    }
    return null;
};

export const updateCurrentSession = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
};

export const getCurrentUser = (): User | null => {
    const u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
};

export const logout = () => {
    localStorage.removeItem('currentUser');
};
