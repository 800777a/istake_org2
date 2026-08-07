import React, { useState, useMemo } from 'react';
import { GlobalSettings, EventData, BusRoute, RoadSignItem, RoutePlanItem, BusConfig } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { Bus, Map as MapIcon, Save, ChevronDown, ChevronUp, ArrowRightLeft, FileText, Upload, Download } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import Toast, { ToastType } from '../Toast';
import { useI18n } from '../../src/contexts/LanguageContext';
import BusRouteSection from './BusRouteSection';
import BusRoadSignSection from './BusRoadSignSection';

interface RouteTabProps {
    currentEvent: EventData;
    settings?: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

// Helper to add minutes to HH:mm time string
const addMinutes = (timeStr: string, minutes: number | string | undefined | null): string => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const trimmed = timeStr.trim();
    if (!trimmed) return '';
    const parts = trimmed.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    
    const parsedMins = typeof minutes === 'number' ? minutes : parseInt(String(minutes || '0'), 10);
    const minsToAdd = isNaN(parsedMins) ? 0 : parsedMins;
    
    let totalMins = h * 60 + m + minsToAdd;
    totalMins = ((totalMins % 1440) + 1440) % 1440;
    
    const resH = Math.floor(totalMins / 60);
    const resM = totalMins % 60;
    return `${String(resH).padStart(2, '0')}:${String(resM).padStart(2, '0')}`;
};

// Standard rainbow styles following strict system instructions (Light bg + Dark text & borders)
const rainbowStyles = [
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hover: 'hover:bg-red-200' }, // 紅
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hover: 'hover:bg-orange-200' }, // 橙
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hover: 'hover:bg-amber-200' }, // 黃
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hover: 'hover:bg-emerald-200' }, // 綠
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hover: 'hover:bg-blue-200' }, // 藍
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', hover: 'hover:bg-indigo-200' }, // 靛
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hover: 'hover:bg-purple-200' }, // 紫
];

const RouteTab: React.FC<RouteTabProps> = ({ currentEvent, settings, onUpdateEvent }) => {
    const { t } = useI18n();
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [isSaving, setIsSaving] = useState(false);
    const [collapsedBuses, setCollapsedBuses] = useState<Record<string, boolean>>({});
    const [collapsedSigns, setCollapsedSigns] = useState<Record<string, boolean>>({});

    const toggleBusCollapse = (busName: string) => setCollapsedBuses(prev => ({ ...prev, [busName]: !prev[busName] }));
    const toggleSignCollapse = (busName: string) => setCollapsedSigns(prev => ({ ...prev, [busName]: !prev[busName] }));
    const closeDialog = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    const effectiveStations = useMemo(() => {
        if (currentEvent?.busStops && currentEvent.busStops.length > 0) {
            return currentEvent.busStops;
        }
        if (settings?.stations && settings.stations.length > 0) {
            return settings.stations;
        }
        try {
            const cached = localStorage.getItem('STAKE_STATIONS_CACHE');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Error reading STAKE_STATIONS_CACHE", e);
        }
        return [];
    }, [currentEvent?.busStops, settings?.stations]);

    const syncAndSave = (event: EventData) => {
        if (!event.busRoutes || !event.busConfigs) {
            updateEvent(event);
            onUpdateEvent(event);
            return;
        }

        const getStopDisplayLocation = (item: RoutePlanItem) => {
            if (item.area && item.area.trim()) return item.area.trim();
            if (effectiveStations && effectiveStations.length > 0) {
                const st = effectiveStations.find(s => 
                    (item.stationId && s.id === item.stationId) ||
                    s.id === item.location ||
                    s.place === item.location ||
                    s.area === item.location
                );
                if (st && st.area && st.area.trim()) return st.area.trim();
            }
            return item.location || '';
        };

        const newBusConfigs = event.busConfigs.map(config => {
            const route = event.busRoutes![config.name];
            if (!route) return config;
            
            const outboundStops: { code: string, location: string, time: string }[] = (route.outbound || [])
                .filter(item => item.stopCode)
                .map(item => ({
                    code: item.stopCode!,
                    location: getStopDisplayLocation(item),
                    time: item.arrivalTime || ''
                }));
                
            const returnStops: { code: string, location: string, time: string }[] = (route.returnTrip || [])
                .filter(item => item.stopCode)
                .map(item => ({
                    code: item.stopCode!,
                    location: getStopDisplayLocation(item),
                    time: item.arrivalTime || ''
                }));
            
            // Combine both, avoiding duplicates based on code
            const stopMap = new Map<string, { code: string, location: string, time: string }>();
            [...outboundStops, ...returnStops].forEach(s => stopMap.set(s.code, s));
            const stops = Array.from(stopMap.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
            
            return { ...config, stops };
        });
        const syncedEvent = { ...event, busConfigs: newBusConfigs };
        updateEvent(syncedEvent);
        onUpdateEvent(syncedEvent);
    };

    const recalculateTimes = (items: any[]): any[] => {
        const safeItems = Array.isArray(items) ? items : [];
        if (safeItems.length === 0) return safeItems;
        
        const newItems = [...safeItems];
        for (let i = 0; i < newItems.length; i++) {
            const item = { ...newItems[i] };
            
            // 1. If not first row, arrivalTime = prev departureTime + prev duration (time from prev stop to current stop)
            if (i > 0) {
                const prev = newItems[i - 1];
                if (prev.departureTime && String(prev.departureTime).trim() !== '') {
                    item.arrivalTime = addMinutes(prev.departureTime, prev.duration);
                }
            }
            
            // 2. departureTime = arrivalTime + stay
            if (item.arrivalTime && String(item.arrivalTime).trim() !== '') {
                item.departureTime = addMinutes(item.arrivalTime, item.stay);
            } else {
                item.departureTime = '';
            }
            
            newItems[i] = item;
        }
        return newItems;
    };

    const handleUpdateRouteItem = (busName: string, type: 'outbound' | 'returnTrip', idx: number, field: string, value: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
        newList[idx] = { ...newList[idx], [field]: value };
        
        // Recalculate all times if relevant fields changed
        if (['arrivalTime', 'stay', 'duration'].includes(field)) {
            newList = recalculateTimes(newList);
        }
        
        let updatedRoute = { ...currentRoute, [type]: newList };
        
        // Sync start time if first row arrival time changed
        if (idx === 0 && field === 'arrivalTime') {
            const key = type === 'outbound' ? 'outboundStartTime' : 'returnStartTime';
            updatedRoute = { ...updatedRoute, [key]: value };
        }
        
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const handleUpdateRouteItemMultiple = (busName: string, type: 'outbound' | 'returnTrip', idx: number, updates: Record<string, string>) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
        newList[idx] = { ...newList[idx], ...updates };
        
        newList = recalculateTimes(newList);
        
        let updatedRoute = { ...currentRoute, [type]: newList };
        
        if (idx === 0 && updates.arrivalTime) {
            const key = type === 'outbound' ? 'outboundStartTime' : 'returnStartTime';
            updatedRoute = { ...updatedRoute, [key]: updates.arrivalTime };
        }
            
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const handleAddRouteRow = (busName: string, type: 'outbound' | 'returnTrip') => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        const prefix = type === 'outbound' ? 'A' : 'B';
        const newListBase = Array.isArray(currentRoute[type]) ? currentRoute[type] : [];
        const newItem = { 
            arrivalTime: '', stay: '0', departureTime: '', 
            stopCode: `${prefix}${newListBase.length + 1}`, 
            duration: '0', location: '', area: '', address: '', mapUrl: '', stationId: '' 
        };
        let newList = [...newListBase, newItem];
        newList = recalculateTimes(newList);
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
    };

    const handleDeleteRouteRow = (busName: string, type: 'outbound' | 'returnTrip', idx: number) => {
        setConfirmConfig({
            isOpen: true, title: '刪除節點', message: '確定要刪除此行程節點嗎？',
            onConfirm: () => {
                closeDialog();
                const routes = currentEvent.busRoutes || {};
                const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
                let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
                newList.splice(idx, 1);
                newList = recalculateTimes(newList);
                syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
            }
        });
    };

    const handleMoveRouteRow = (busName: string, type: 'outbound' | 'returnTrip', idx: number, direction: 'up' | 'down') => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
        if (direction === 'up' && idx > 0) [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        else if (direction === 'down' && idx < newList.length - 1) [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
        newList = recalculateTimes(newList);
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
    };

    const handleReverseRoute = (busName: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        const performReverse = () => {
            const outbound = Array.isArray(currentRoute.outbound) ? currentRoute.outbound : [];
            let reversed = [...outbound].reverse().map((item, idx) => ({
                ...item,
                stopCode: `B${idx + 1}`,
                stay: idx === 0 || idx === outbound.length - 1 ? '0' : item.stay,
                duration: idx === outbound.length - 1 ? '0' : outbound[outbound.length - idx - 2]?.duration || '0'
            }));
            reversed = recalculateTimes(reversed);
            syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, returnTrip: reversed } } });
        };

        if (currentRoute.returnTrip?.length > 0) {
            setConfirmConfig({
                isOpen: true,
                title: '反向',
                message: '回程已有資料。確定要覆蓋並執行「反向」嗎？',
                onConfirm: () => {
                    closeDialog();
                    performReverse();
                }
            });
        } else {
            performReverse();
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await syncAndSave(currentEvent);
            setMsgType('success');
            setMsg(t('common.saveSuccess', '設定已同步至雲端'));
        } catch (e) {
            setMsgType('error');
            setMsg(t('common.saveError', '同步失敗，請稍後再試'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setMsg(null), 3000);
        }
    };

    const handleTimeChange = (busName: string, type: 'outbound' | 'return', field: 'Start' | 'End', value: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        const key = `${type}${field}Time` as keyof BusRoute;
        const updatedRoute = { ...currentRoute, [key]: value };
        
        if (field === 'Start') {
            const listKey = type === 'outbound' ? 'outbound' : 'returnTrip';
            let list = [...(Array.isArray(updatedRoute[listKey]) ? updatedRoute[listKey] : [])];
            if (list.length > 0) {
                list[0] = { ...list[0], arrivalTime: value };
                list = recalculateTimes(list);
            }
            updatedRoute[listKey] = list;
        }
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const handleImportRoute = (busName: string, type: 'outbound' | 'return', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                const listKey = type === 'outbound' ? 'outbound' : 'returnTrip';
                const routes = currentEvent.busRoutes || {};
                const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
                syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [listKey]: data } } });
                alert('匯入成功');
            } catch (err) { alert('匯入失敗'); }
        };
        reader.readAsText(file);
    };

    // --- ROAD SIGN HANDLERS ---
    const handleUpdateBusSign = (busName: string, type: 'outbound' | 'return', idx: number, field: keyof RoadSignItem, value: any) => {
        const routes = (currentEvent.busRoutes || {}) as Record<string, any>;
        const route = routes[busName] || { outboundRoadSigns: [], returnRoadSigns: [] };
        const listKey = type === 'outbound' ? 'outboundRoadSigns' : 'returnRoadSigns';
        const currentList = [...(Array.isArray(route[listKey]) ? route[listKey] : [])];
        currentList[idx] = { ...currentList[idx], [field]: value };
        if (field === 'checked' && value === true) {
            for (let i = 0; i < idx; i++) if (currentList[i]) currentList[i] = { ...currentList[i], checked: true };
        } else if (field === 'checked' && value === false) {
            for (let i = idx + 1; i < currentList.length; i++) if (currentList[i]) currentList[i] = { ...currentList[i], checked: false };
        }
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...route, [listKey]: currentList } } });
    };

    const handleAddBusSign = (busName: string, type: 'outbound' | 'return') => {
        const routes = (currentEvent.busRoutes || {}) as Record<string, any>;
        const route = routes[busName] || { outboundRoadSigns: [], returnRoadSigns: [] };
        const listKey = type === 'outbound' ? 'outboundRoadSigns' : 'returnRoadSigns';
        const currentList = [...(Array.isArray(route[listKey]) ? route[listKey] : []), { label: '', instruction: '', checked: false }];
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...route, [listKey]: currentList } } });
    };

    const handleDeleteBusSign = (busName: string, type: 'outbound' | 'return', idx: number) => {
        const routes = (currentEvent.busRoutes || {}) as Record<string, any>;
        const route = routes[busName] || { outboundRoadSigns: [], returnRoadSigns: [] };
        const listKey = type === 'outbound' ? 'outboundRoadSigns' : 'returnRoadSigns';
        const currentList = [...(Array.isArray(route[listKey]) ? route[listKey] : [])];
        currentList.splice(idx, 1);
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...route, [listKey]: currentList } } });
    };

    const handleMoveBusSign = (busName: string, type: 'outbound' | 'return', idx: number, direction: 'up' | 'down') => {
        const routes = (currentEvent.busRoutes || {}) as Record<string, any>;
        const route = routes[busName] || { outboundRoadSigns: [], returnRoadSigns: [] };
        const listKey = type === 'outbound' ? 'outboundRoadSigns' : 'returnRoadSigns';
        const currentList = [...(Array.isArray(route[listKey]) ? route[listKey] : [])];
        if (direction === 'up' && idx > 0) [currentList[idx - 1], currentList[idx]] = [currentList[idx], currentList[idx - 1]];
        else if (direction === 'down' && idx < currentList.length - 1) [currentList[idx], currentList[idx + 1]] = [currentList[idx + 1], currentList[idx]];
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...route, [listKey]: currentList } } });
    };

    const handleImportBusSigns = (busName: string, type: 'outbound' | 'return', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const items = JSON.parse(evt.target?.result as string);
                const listKey = type === 'outbound' ? 'outboundRoadSigns' : 'returnRoadSigns';
                const routes = (currentEvent.busRoutes || {}) as Record<string, any>;
                const route = routes[busName] || {};
                syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...route, [listKey]: items } } });
                alert('匯入成功');
            } catch (err) { alert('匯入失敗'); }
        };
        reader.readAsText(file);
    };

    const handlePrintBusInquiry = (busConfig: BusConfig, route: any) => {
        const busName = busConfig.name || '車輛';

        const getStopInfo = (item: any) => {
            const matchedStation = effectiveStations.find(s => 
                (item.stationId && s.id === item.stationId) ||
                (item.location && (
                    s.id === item.location || 
                    s.place === item.location || 
                    s.area === item.location || 
                    `${s.area} - ${s.place}` === item.location ||
                    `${s.area} ${s.place}` === item.location
                ))
            );

            const area = item.area || matchedStation?.area || '';
            const place = item.location || matchedStation?.place || '';
            let displayName = '';
            if (area && place && area !== place) {
                if (place.includes(area)) {
                    displayName = place;
                } else if (area.includes(place)) {
                    displayName = area;
                } else {
                    displayName = `${area}-${place}`;
                }
            } else {
                displayName = area || place || item.location || '';
            }

            const address = item.address || matchedStation?.address || '';
            const mapUrl = item.mapUrl || matchedStation?.mapUrl || '';
            const arrivalTime = item.arrivalTime || item.departureTime || '';

            return {
                arrivalTime,
                displayName,
                address,
                mapUrl
            };
        };

        const outboundItems = (Array.isArray(route?.outbound) ? route.outbound : []).map(getStopInfo);
        const returnItems = (Array.isArray(route?.returnTrip) ? route.returnTrip : []).map(getStopInfo);

        let text = `${busName} 詢價單\n\n`;

        text += `發票抬頭：${currentEvent.invoice_title || ''}\n`;
        text += `統一編號：${currentEvent.invoice_vat || ''}\n`;
        text += `主辦姓名：${currentEvent.invoice_organizer || ''}\n`;
        text += `連絡電話：${currentEvent.invoice_phone || ''}\n`;
        text += `預訂車輛：${currentEvent.invoice_vehicles || ''}\n`;
        text += `付款條件：${currentEvent.invoice_payment_terms || ''}\n\n`;

        const actDate = currentEvent.invoice_date || currentEvent.event_date || '';
        const actName = currentEvent.invoice_name || currentEvent.event_title || '';
        text += `活動日期：${actDate}\n`;
        text += `活動名稱：${actName}\n\n`;

        text += `去程\n`;
        outboundItems.forEach((item: { arrivalTime: string; displayName: string; address: string; mapUrl: string }) => {
            if (item.displayName) {
                text += `${item.arrivalTime ? item.arrivalTime + ' ' : ''}${item.displayName}\n`;
            }
        });
        text += `\n`;

        text += `回程\n`;
        returnItems.forEach((item: { arrivalTime: string; displayName: string; address: string; mapUrl: string }) => {
            if (item.displayName) {
                text += `${item.arrivalTime ? item.arrivalTime + ' ' : ''}${item.displayName}\n`;
            }
        });
        text += `\n`;

        text += `地名, 地址, 地圖\n`;
        const seenNames = new Set<string>();
        const allStops = [...outboundItems, ...returnItems];

        allStops.forEach((item: { arrivalTime: string; displayName: string; address: string; mapUrl: string }) => {
            if (!item.displayName) return;
            if (seenNames.has(item.displayName)) return;
            seenNames.add(item.displayName);

            text += `${item.displayName}\n`;
            if (item.address) text += `${item.address}\n`;
            if (item.mapUrl) text += `${item.mapUrl}\n`;
            text += `\n`;
        });

        const fileName = `${busName}_詢價單.txt`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-fade-in relative text-sm">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm} onCancel={closeDialog} isDangerous={true}
            />

            {/* Main Header conforming to Bright Modern Business style */}
            <div className="bg-[#004B97] text-white p-2 md:p-3 rounded shadow-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 rounded border border-white/10 shadow-sm">
                            <MapIcon className="w-5 h-5 text-blue-300" />
                        </div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-black tracking-tight">
                            行程路線
                        </h2>
                    </div>
                </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap items-center justify-end gap-2 p-1 bg-white/60 backdrop-blur-sm rounded border border-slate-200 shadow-sm">
                <button
                    onClick={() => {
                        const stakeName = settings?.stake_name || '嘉義支聯會';
                        const eventDate = currentEvent.event_date || '';
                        const fileName = `行程規劃_${eventDate}.txt`;
                        let fullText = `【行程規劃 - ${eventDate}】\n\n`;
                        
                        (currentEvent.busConfigs || []).forEach(bus => {
                            const busName = bus.name;
                            const route = currentEvent.busRoutes?.[busName];
                            if (route) {
                                fullText += `--- ${busName} 號車 ---\n`;
                                fullText += `[去程]\n`;
                                fullText += (Array.isArray(route.outbound) ? route.outbound : []).map((i: any) => `${i.departureTime || i.arrivalTime} ${i.location}`).join('\n');
                                fullText += `\n\n[回程]\n`;
                                fullText += (Array.isArray(route.returnTrip) ? route.returnTrip : []).map((i: any) => `${i.departureTime || i.arrivalTime} ${i.location}`).join('\n');
                                fullText += `\n\n`;
                            }
                        });
                        
                        const blob = new Blob([fullText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                    }}
                    className="h-9 px-4 rounded text-xs font-black transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-2"
                >
                    <FileText size={14} /> 印詢價單
                </button>
            </div>

            {(currentEvent.busConfigs || []).map((busConfig, idx) => {
                const busName = busConfig.name;
                const isBusCollapsed = collapsedBuses[busName];
                const isSignCollapsed = collapsedSigns[busName];
                const route = (currentEvent.busRoutes?.[busName] || { outbound: [], returnTrip: [] }) as any;
                const theme = rainbowStyles[idx % rainbowStyles.length];
                
                if (!busName) return null;

                return (
                    <div key={busName} className="space-y-8 animate-fade-in mb-12">
                        {/* 行程安排 */}
                        <BusRouteSection 
                            busConfig={busConfig} route={route} idx={idx} settings={settings}
                            stations={effectiveStations}
                            theme={theme}
                            isCollapsed={isBusCollapsed} onToggleCollapse={() => toggleBusCollapse(busName)}
                            onUpdateField={(f, v) => syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, [f]: v } } })}
                            onTogglePublish={(type) => {
                                const f = type === 'outbound' ? 'isOutboundPublished' : 'isReturnPublished';
                                syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, [f]: !route[f] } } });
                            }}
                            onUpdateRouteItem={(t, i, f, v) => handleUpdateRouteItem(busName, t, i, f, v)}
                            onUpdateRouteItemMultiple={(t, i, u) => handleUpdateRouteItemMultiple(busName, t, i, u)}
                            onDeleteRouteRow={(t, i) => handleDeleteRouteRow(busName, t, i)}
                            onAddRouteRow={(t) => handleAddRouteRow(busName, t)}
                            onMoveRouteRow={(t, i, d) => handleMoveRouteRow(busName, t, i, d)}
                            onReverseRoute={() => handleReverseRoute(busName)}
                            onExport={(type) => {
                                const data = type === 'outbound' ? route.outbound : route.returnTrip;
                                const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = `route_${busName}_${type}.json`; a.click();
                            }}
                            onImport={(t, e) => handleImportRoute(busName, t, e)}
                            onTimeChange={(t, f, v) => handleTimeChange(busName, t, f, v)}
                            onPrintInquiry={() => handlePrintBusInquiry(busConfig, route)}
                        />

                        {/* 行車指示/路標 - Collapsible Card Standard */}
                        <div className={`rounded border shadow-sm overflow-hidden ${theme.bg} ${theme.border}`}>
                            <div 
                                className={`w-full px-6 py-4 cursor-pointer select-none transition-colors border-b bg-white/60 backdrop-blur-sm group hover:bg-white/80 ${theme.border}`}
                                onClick={() => toggleSignCollapse(busName)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded border shadow-sm bg-white/40 ${theme.text} ${theme.border}`}>
                                            <MapIcon size={20} />
                                        </div>
                                        <h3 className={`font-bold text-xs md:text-sm lg:text-base ${theme.text}`}>
                                            {busName}路標
                                        </h3>
                                    </div>
                                    <div className={theme.text}>
                                        {isSignCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                    </div>
                                </div>
                            </div>

                            {!isSignCollapsed && (
                                <div className="p-1 flex flex-col gap-2 bg-white/40 backdrop-blur-sm">
                                    <div className="p-1 grid lg:grid-cols-2 gap-4">
                                        <BusRoadSignSection busName={busName} type="outbound" items={route.outboundRoadSigns || []}
                                            theme={theme}
                                            isPublished={!!route.isOutboundRoadSignsPublished}
                                            onTogglePublish={() => syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, isOutboundRoadSignsPublished: !route.isOutboundRoadSignsPublished } } })}
                                            onUpdate={(i, f, v) => handleUpdateBusSign(busName, 'outbound', i, f, v)}
                                            onAdd={() => handleAddBusSign(busName, 'outbound')}
                                            onDelete={(i) => handleDeleteBusSign(busName, 'outbound', i)}
                                            onMove={(i, d) => handleMoveBusSign(busName, 'outbound', i, d)}
                                            onExport={() => {
                                                const blob = new Blob([JSON.stringify(route.outboundRoadSigns || [], null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url; a.download = `${busName}_signs_outbound.json`; a.click();
                                            }}
                                            onImport={(e) => handleImportBusSigns(busName, 'outbound', e)}
                                        />
                                        <BusRoadSignSection busName={busName} type="return" items={route.returnRoadSigns || []}
                                            theme={theme}
                                            isPublished={!!route.isReturnRoadSignsPublished}
                                            onTogglePublish={() => syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, isReturnRoadSignsPublished: !route.isReturnRoadSignsPublished } } })}
                                            onUpdate={(i, f, v) => handleUpdateBusSign(busName, 'return', i, f, v)}
                                            onAdd={() => handleAddBusSign(busName, 'return')}
                                            onDelete={(i) => handleDeleteBusSign(busName, 'return', i)}
                                            onMove={(i, d) => handleMoveBusSign(busName, 'return', i, d)}
                                            onExport={() => {
                                                const blob = new Blob([JSON.stringify(route.returnRoadSigns || [], null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url; a.download = `${busName}_signs_return.json`; a.click();
                                            }}
                                            onImport={(e) => handleImportBusSigns(busName, 'return', e)}
                                            onReverse={() => {
                                                setConfirmConfig({
                                                    isOpen: true, title: '反向', message: `確定要將「${busName}去程」的指示內容，反向複製到「回程」嗎？這將覆蓋現有的回程資料。`,
                                                    onConfirm: () => {
                                                        closeDialog();
                                                        const outbound = route.outboundRoadSigns || [];
                                                        const reversed = outbound.map((i: any) => i.instruction).reverse().map((inst: string) => ({ label: '', instruction: inst, checked: false }));
                                                        syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, returnRoadSigns: reversed } } });
                                                    }
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {(currentEvent.busConfigs || []).length === 0 && (
                <div className="text-center py-24 bg-white rounded border-2 border-dashed border-slate-200 shadow-inner group transition-all hover:border-indigo-300">
                    <div className="p-6 bg-slate-50 w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-100">
                        <Bus className="w-8 h-8 text-slate-300 group-hover:text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400 mb-2">目前無車輛規劃資料</h3>
                    <p className="text-slate-400 text-sm font-medium max-w-md mx-auto">請先在車輛管理中新增車輛</p>
                </div>
            )}
        </div>
    );
};

export default RouteTab;
