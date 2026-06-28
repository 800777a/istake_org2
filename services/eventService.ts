
import { EventData, WeatherInfo } from '../types';
import { 
    db, COLL_EVENTS, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
    query, where, onSnapshot, orderBy, writeBatch 
} from './firebaseConfig';

const safeStringify = (obj: any): string => {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        return "[]";
    }
};

export const subscribeToEvents = (callback: (events: EventData[]) => void) => {
    const q = query(collection(db, COLL_EVENTS), orderBy('event_date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const events: EventData[] = [];
        snapshot.forEach(doc => events.push(doc.data() as EventData));
        localStorage.setItem('v2_events', safeStringify(events)); 
        callback(events);
    });
};

export const getActiveEvent = (): EventData | undefined => {
    try {
        const s = localStorage.getItem('v2_events');
        if (!s || s === "undefined") return undefined;
        const events: EventData[] = JSON.parse(s);
        return events.find(e => e.is_active);
    } catch (e) {
        return undefined;
    }
};

export const getEvents = (): EventData[] => {
    try {
        const s = localStorage.getItem('v2_events');
        return s ? JSON.parse(s) : [];
    } catch (e) {
        return [];
    }
};

export const saveEvent = async (event: EventData) => {
    const id = event.event_id || `EVT-${Date.now()}`;
    const docRef = doc(db, COLL_EVENTS, id);
    await setDoc(docRef, { ...event, event_id: id }, { merge: true });
};

export async function createEvent(event: EventData): Promise<void>;
export async function createEvent(date: string, title: string, organizer: string): Promise<void>;
export async function createEvent(dateOrEvent: string | EventData, title?: string, organizer?: string): Promise<void> {
    if (typeof dateOrEvent === 'object') {
        await saveEvent(dateOrEvent);
    } else {
        const id = `EVT-${Date.now()}`;
        await saveEvent({
            event_id: id,
            event_date: dateOrEvent,
            event_title: title || '',
            organizer: organizer || '',
            status: 'planning',
            is_active: false,
            bus_count: 0
        } as EventData);
    }
}

export async function updateEvent(event: EventData): Promise<void>;
export async function updateEvent(eventId: string, date: string, title: string, organizer: string): Promise<void>;
export async function updateEvent(idOrEvent: string | EventData, date?: string, title?: string, organizer?: string): Promise<void> {
    if (typeof idOrEvent === 'object') {
        await updateDoc(doc(db, COLL_EVENTS, idOrEvent.event_id), idOrEvent as any);
    } else {
        await updateDoc(doc(db, COLL_EVENTS, idOrEvent), {
            event_date: date,
            event_title: title,
            organizer: organizer
        });
    }
}

export const closeEvent = async (eventId: string) => {
    await updateDoc(doc(db, COLL_EVENTS, eventId), { is_active: false });
};

export const reopenEvent = async (eventId: string) => {
    await updateDoc(doc(db, COLL_EVENTS, eventId), { is_active: true });
};

export const setCurrentEvent = async (eventId: string) => {
    try {
        const q = query(collection(db, COLL_EVENTS));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach((d: any) => {
            batch.update(d.ref, { is_active: d.id === eventId });
        });
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getWeatherForecast = (date: string, area: string): WeatherInfo => {
    return { 
        temp_low: 25,
        temp_high: 30,
        rainProb: 10,
        condition: 'sunny'
    };
};
