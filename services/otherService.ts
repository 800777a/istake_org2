
import { 
    LostItem, EventPhoto, Feedback, Announcement, AuditLog, 
    Incident, Testimony, Comment, BlacklistItem, ExpenseRecord, EventData
} from '../types';
import { 
    db, COLL_REGS, COLL_EVENTS, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, 
    query, where, onSnapshot, orderBy, limit, writeBatch 
} from './firebaseConfig';

const COLL_LOST = 'lost_items';
const COLL_PHOTOS = 'event_photos';
const COLL_FEEDBACK = 'feedback';
const COLL_ANNOUNCEMENTS = 'announcements';
const COLL_INCIDENTS = 'incidents';
const COLL_TESTIMONY = 'testimony';
const COLL_COMMENTS = 'comments';
const COLL_BLACKLIST = 'blacklist';
const COLL_EXPENSES = 'expenses';

export const saveFeedback = async (fb: Feedback) => {
    await addDoc(collection(db, COLL_FEEDBACK), { ...fb, created_at: new Date().toISOString() });
};

export const subscribeToFeedback = (callback: (list: Feedback[]) => void) => {
    const q = query(collection(db, COLL_FEEDBACK), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snap) => {
        const list: Feedback[] = [];
        snap.forEach(d => list.push(d.data() as Feedback));
        callback(list);
    });
};

export const saveLostItem = async (item: LostItem) => {
    await addDoc(collection(db, COLL_LOST), { ...item, created_at: new Date().toISOString() });
};

export const saveEventPhoto = async (eventId: string, photo: EventPhoto) => {
    await addDoc(collection(db, COLL_PHOTOS), { ...photo, event_id: eventId });
};

export const addEventPhoto = saveEventPhoto;

export const likeEventPhoto = async (eventId: string, photoId: string) => {
    const q = query(collection(db, COLL_PHOTOS), where('id', '==', photoId));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const currentLikes = snap.docs[0].data().likes || 0;
        await updateDoc(docRef, { likes: currentLikes + 1 });
    }
};

export const subscribeToPhotos = (callback: (photos: EventPhoto[]) => void) => {
    const q = query(collection(db, COLL_PHOTOS), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
        const photos: EventPhoto[] = [];
        snap.forEach(d => photos.push(d.data() as EventPhoto));
        callback(photos);
    });
};

export const saveTestimony = async (eventId: string, t: Testimony) => {
    await addDoc(collection(db, COLL_TESTIMONY), { ...t, eventId, timestamp: new Date().toISOString() });
};

export const addTestimony = saveTestimony;

export const subscribeToTestimonies = (callback: (list: Testimony[]) => void) => {
    const q = query(collection(db, COLL_TESTIMONY), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
        const list: Testimony[] = [];
        snap.forEach(d => list.push(d.data() as Testimony));
        callback(list);
    });
};

export const saveComment = async (eventId: string, c: Partial<Comment> & { author_name: string; content: string; content_en?: string }) => {
    const id = c.id || `CMT-${Date.now()}`;
    const created_at = c.created_at || new Date().toISOString();
    
    // V042: Save to Firestore
    await setDoc(doc(db, COLL_COMMENTS, id), { ...c, event_id: eventId, id, created_at });
};

export const addComment = saveComment;

export const subscribeToComments = (eventId: string, callback: (list: Comment[]) => void) => {
    const q = query(collection(db, COLL_COMMENTS), where('event_id', '==', eventId));
    return onSnapshot(q, (snap) => {
        const list: Comment[] = [];
        snap.forEach(d => list.push(d.data() as Comment));
        callback(list);
    });
};

/**
 * 訂閱全站留言 (跨月份/活動)
 */
export const subscribeToAllComments = (callback: (list: Comment[]) => void) => {
    const q = query(collection(db, COLL_COMMENTS), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snap) => {
        const list: Comment[] = [];
        snap.forEach(d => list.push(d.data() as Comment));
        callback(list);
    });
};

export const markCommentAsSpam = async (commentId: string) => {
    await updateDoc(doc(db, COLL_COMMENTS, commentId), { is_spam: true });
};

export const deleteCommentByAdmin = async (commentId: string) => {
    await deleteDoc(doc(db, COLL_COMMENTS, commentId));
};

export const toggleTaskStatus = async (eventId: string, taskId: string, unit: string, newStatus: boolean) => {
    const docRef = doc(db, COLL_EVENTS, eventId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data() as EventData;
        const tasks = (data.tasks || []).map(t => {
            if (t.id === taskId) {
                const status = t.status || {};
                status[unit] = newStatus;
                return { ...t, status };
            }
            return t;
        });
        await updateDoc(docRef, { tasks });
    }
};

export const saveIncident = async (incident: Incident) => {
    await addDoc(collection(db, COLL_INCIDENTS), { ...incident, timestamp: new Date().toISOString() });
};

export const saveAnnouncement = async (ann: Announcement) => {
    await addDoc(collection(db, COLL_ANNOUNCEMENTS), { ...ann, created_at: new Date().toISOString() });
};

export const updateUnitStaffInfo = async (eventId: string, unit: string, staffName: string, staffRole: string) => {
    const docRef = doc(db, COLL_EVENTS, eventId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data() as EventData;
        const unitStaffInfo = data.unitStaffInfo || {};
        unitStaffInfo[unit] = { staff: staffName, staffRole: staffRole };
        await updateDoc(docRef, { unitStaffInfo });
    }
};

export const saveTriviaScore = async (eventId: string, score: any) => {
    await addDoc(collection(db, 'trivia_scores'), { ...score, event_id: eventId, timestamp: new Date().toISOString() });
};

export const updateSafetyStatus = async (status: any) => {
    await setDoc(doc(db, 'safety_status', status.id), status, { merge: true });
};

export const addAncestor = async (regId: string, ancestor: any) => {
    const docRef = doc(db, COLL_REGS, regId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        const ancestors = data.ancestors || [];
        await updateDoc(docRef, { ancestors: [...ancestors, ancestor] });
    }
};

export const removeAncestor = async (regId: string, ancestorId: string) => {
    const docRef = doc(db, COLL_REGS, regId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        const ancestors = (data.ancestors || []).filter((a: any) => a.id !== ancestorId);
        await updateDoc(docRef, { ancestors });
    }
};

export const updateAncestorStatus = async (regId: string, ancestorId: string, status: string) => {
    const docRef = doc(db, COLL_REGS, regId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        const ancestors = (data.ancestors || []).map((a: any) => a.id === ancestorId ? { ...a, status } : a);
        await updateDoc(docRef, { ancestors });
    }
};

export const getMemberHistory = async (id: string) => {
    // Return empty array or mock
    return [];
};
