import React, { useState } from 'react';
import { GlobalSettings, EventData, BusRoute, RoadSignItem } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { Bus, Map, Save, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import Toast, { ToastType } from '../Toast';
import { useI18n } from '../../src/contexts/LanguageContext';
import TempleScheduleSection from './TempleScheduleSection';
import BusRouteSection from './BusRouteSection';
import BusRoadSignSection from './BusRoadSignSection';

interface RouteTabProps {
    currentEvent: EventData;
    settings?: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

// Helper to add minutes to HH:mm time string
const addMinutes = (timeStr: string, minutes: number | string): string => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m + (parseInt(String(minutes)) || 0));
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

    const syncAndSave = (event: EventData) => {
        if (!event.busRoutes || !event.busConfigs) {
            updateEvent(event);
            onUpdateEvent(event);
            return;
        }
        const newBusConfigs = event.busConfigs.map(config => {
            const route = event.busRoutes![config.name];
            if (!route) return config;
            const stops = (route.outbound || [])
                .filter(item => item.stopCode)
                .map(item => ({
                    code: item.stopCode!,
                    location: item.location,
                    time: item.arrivalTime
                }));
            return { ...config, stops };
        });
        const syncedEvent = { ...event, busConfigs: newBusConfigs };
        updateEvent(syncedEvent);
        onUpdateEvent(syncedEvent);
    };

    const recalculateTimes = (items: any[], startTime: string): any[] => {
        const safeItems = Array.isArray(items) ? items : [];
        if (!startTime || safeItems.length === 0) return safeItems;
        let currentTime = startTime;
        return safeItems.map((item, idx) => {
            const newItem = { ...item };
            newItem.arrivalTime = idx === 0 ? startTime : currentTime;
            const stayMins = parseInt(item.stay || '0');
            newItem.departureTime = addMinutes(newItem.arrivalTime, stayMins);
            const durationMins = parseInt(item.duration || '0');
            currentTime = addMinutes(newItem.departureTime, durationMins);
            return newItem;
        });
    };

    const handleUpdateRouteItem = (busName: string, type: 'outbound' | 'returnTrip', idx: number, field: string, value: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
        newList[idx] = { ...newList[idx], [field]: value };
        if (['stay', 'duration', 'arrivalTime'].includes(field) || idx === 0) {
             const startTime = type === 'outbound' 
                ? (currentRoute.outboundStartTime || (newList[0]?.arrivalTime)) 
                : (currentRoute.returnStartTime || (newList[0]?.arrivalTime));
             if (startTime) newList = recalculateTimes(newList, startTime);
        }
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
    };

    const handleUpdateRouteItemMultiple = (busName: string, type: 'outbound' | 'returnTrip', idx: number, updates: Record<string, string>) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        let newList = [...(Array.isArray(currentRoute[type]) ? currentRoute[type] : [])];
        newList[idx] = { ...newList[idx], ...updates };
        const startTime = type === 'outbound' 
            ? (currentRoute.outboundStartTime || (newList[0]?.arrivalTime)) 
            : (currentRoute.returnStartTime || (newList[0]?.arrivalTime));
        if (startTime) newList = recalculateTimes(newList, startTime);
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
    };

    const handleAddRouteRow = (busName: string, type: 'outbound' | 'returnTrip') => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        const prefix = type === 'outbound' ? 'A' : 'B';
        const newListBase = Array.isArray(currentRoute[type]) ? currentRoute[type] : [];
        const newItem = { arrivalTime: '', stay: '0', departureTime: '', stopCode: `${prefix}${newListBase.length + 1}`, duration: '0', location: '', address: '', mapUrl: '' };
        let newList = [...newListBase, newItem];
        const startTime = type === 'outbound' ? currentRoute.outboundStartTime : currentRoute.returnStartTime;
        if (startTime) newList = recalculateTimes(newList, startTime);
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
                const startTime = type === 'outbound' ? currentRoute.outboundStartTime : currentRoute.returnStartTime;
                if (startTime) newList = recalculateTimes(newList, startTime);
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
        const startTime = type === 'outbound' ? currentRoute.outboundStartTime : currentRoute.returnStartTime;
        if (startTime) newList = recalculateTimes(newList, startTime);
        syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, [type]: newList } } });
    };

    const handleReverseRoute = (busName: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outbound: [], returnTrip: [] };
        if (currentRoute.returnTrip?.length > 0) {
            setConfirmConfig({
                isOpen: true, title: '回程反向', message: '回程已有資料。確定要覆蓋並執行「回程反向」嗎？',
                onConfirm: () => {
                    closeDialog();
                    const outbound = Array.isArray(currentRoute.outbound) ? currentRoute.outbound : [];
                    const reversed = [...outbound].reverse().map((item, idx) => ({
                        ...item, stopCode: `B${idx + 1}`, stay: idx === 0 || idx === outbound.length - 1 ? '0' : item.stay,
                        duration: idx === outbound.length - 1 ? '0' : outbound[outbound.length - idx - 2]?.duration || '0'
                    }));
                    syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, returnTrip: reversed } } });
                }
            });
        } else {
            const outbound = Array.isArray(currentRoute.outbound) ? currentRoute.outbound : [];
            const reversed = [...outbound].reverse().map((item, idx) => ({
                ...item, stopCode: `B${idx + 1}`, stay: idx === 0 || idx === outbound.length - 1 ? '0' : item.stay,
                duration: idx === outbound.length - 1 ? '0' : outbound[outbound.length - idx - 2]?.duration || '0'
            }));
            syncAndSave({ ...currentEvent, busRoutes: { ...routes, [busName]: { ...currentRoute, returnTrip: reversed } } });
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
            updatedRoute[listKey] = recalculateTimes(updatedRoute[listKey] as any[], value);
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

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-fade-in relative text-sm">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm} onCancel={closeDialog} isDangerous={true}
            />

            {/* Main Header conforming to Bright Modern Business style */}
            <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-lg flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-lg border border-white/10 shadow-sm">
                        <Map className="w-6 h-6 text-blue-300" />
                    </div>
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                        {t('route.title', '路線規劃系統')}
                    </h2>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider opacity-80">
                        Fleet Logistics & Strategic Path Optimization
                    </p>
                    <div className="flex justify-end">
                        <button 
                            onClick={handleSave} disabled={isSaving}
                            className={`h-12 md:h-11 lg:h-10 px-6 rounded-lg text-base md:text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 ${isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            <Save size={18} className={isSaving ? 'animate-spin' : ''} /> 
                            {isSaving ? t('common.saving', '同步雲端中...') : t('common.save', '保存路線設定')}
                        </button>
                    </div>
                </div>
            </div>

            <TempleScheduleSection currentEvent={currentEvent} onUpdateEvent={onUpdateEvent} />

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
                        />

                        {/* 行車指示/路標 - Collapsible Card Standard */}
                        <div className={`rounded-lg border shadow-sm overflow-hidden ${theme.bg} ${theme.border}`}>
                            <div 
                                className={`w-full px-6 py-4 cursor-pointer select-none transition-colors border-b bg-white/60 backdrop-blur-sm group hover:bg-white/80 ${theme.border}`}
                                onClick={() => toggleSignCollapse(busName)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg border shadow-sm bg-white/40 ${theme.text} ${theme.border}`}>
                                            <Map size={20} />
                                        </div>
                                        <h3 className={`font-bold text-sm md:text-base lg:text-lg ${theme.text}`}>
                                            {busName} {t('common.bus', '號車')} - 路標指示 (DRIVER ROAD SIGNS)
                                        </h3>
                                    </div>
                                    <div className={theme.text}>
                                        {isSignCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                    </div>
                                </div>

                                {/* Info and buttons moved below title row and right-aligned */}
                                <div className="w-full flex justify-end items-center gap-3 mt-3">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmConfig({
                                                isOpen: true, title: '回程反向 (路標)', message: `確定要將「${busName}去程」的指示內容，反向複製到「回程」嗎？這將覆蓋現有的回程資料。`,
                                                onConfirm: () => {
                                                    closeDialog();
                                                    const outbound = route.outboundRoadSigns || [];
                                                    const reversed = outbound.map((i: any) => i.instruction).reverse().map((inst: string) => ({ label: '', instruction: inst, checked: false }));
                                                    syncAndSave({ ...currentEvent, busRoutes: { ...currentEvent.busRoutes, [busName]: { ...route, returnRoadSigns: reversed } } });
                                                }
                                            });
                                        }} 
                                        className={`h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border bg-white/60 shadow-sm ${theme.text} ${theme.border} ${theme.hover}`}
                                    >
                                        <ArrowRightLeft size={14} /> 回程反向 (路標)
                                    </button>
                                </div>
                            </div>

                            {!isSignCollapsed && (
                                <div className="p-6 bg-white/40 backdrop-blur-sm flex flex-col gap-6">
                                    <div className="grid lg:grid-cols-2 gap-8">
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
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {(currentEvent.busConfigs || []).length === 0 && (
                <div className="text-center py-24 bg-white rounded-lg border-2 border-dashed border-slate-200 shadow-inner group transition-all hover:border-indigo-300">
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
