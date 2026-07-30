
import { initializeApp } from "firebase/app";
import { 
    initializeFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
    query, where, onSnapshot, orderBy, limit, writeBatch, arrayUnion, arrayRemove,
    persistentLocalCache, persistentMultipleTabManager, setLogLevel
} from "firebase/firestore";

// Suppress benign Firestore SDK internal clock-skew info logs
setLogLevel("error");

const firebaseConfig = {
    apiKey: "AIzaSyA50_rXJ3gBnu4oYLG5nzNxlDL67Xgcwrg",
    authDomain: "temple-trip-system.firebaseapp.com",
    projectId: "temple-trip-system",
    storageBucket: "temple-trip-system.firebasestorage.app",
    messagingSenderId: "911056587841",
    appId: "1:911056587841:web:5555c06f2386ac1141cac0",
    measurementId: "G-GPY82064XN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
});

// Collections
export const COLL_EVENTS = 'events';
export const COLL_REGS = 'registrations';
export const COLL_FAMILIES = 'family_groups'; 
export const COLL_SETTINGS = 'settings';
export const COLL_USERS = 'users';
export const COLL_LOGS = 'audit_logs';
export const COLL_EXPENSES = 'expenses';
export const COLL_FEEDBACK = 'feedback';
export const COLL_BLACKLIST = 'blacklist';
export const COLL_PERSONAL_INFO = 'personal_info';
export const COLL_REPRESENTATIVES = 'representatives';
export const COLL_COMMENTS = 'comments';
export const COLL_TRANSLATIONS = 'translations';

// Export Firestore functions
export { 
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
    query, where, onSnapshot, orderBy, limit, writeBatch, arrayUnion, arrayRemove 
};
