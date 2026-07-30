import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData, Registration, GlobalSettings, BusStop, TripType, RegStatus, RoutePlanItem } from '../../types';
import { updateEvent } from '../../services/eventService';
import { updateRegistrationField, batchUpdateRegistrationField } from '../../services/registrationService';
import { Bus, Download, Plus, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Save, Search, Users, Activity, CheckCircle, Users2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';
import Toast, { ToastType } from '../Toast';
import BusAssignmentCard from './BusAssignmentCard';

interface AssignmentTabProps {
    currentEvent: EventData;
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const AssignmentTab: React.FC<AssignmentTabProps> = ({ currentEvent, registrations, settings, onRefresh, onPushToEditor }) => {
    const { t, tString } = useI18n();
    
    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = useMemo(() => {
        return settings.billingConfig?.units?.map(u => u.shortName) || settings.units || [];
    }, [settings]);

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [batchUnit, setBatchUnit] = useState('');
    const [batchBus, setBatchBus] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isToolsExpanded, setIsToolsExpanded] = useState(true);
    const [exportTargetBus, setExportTargetBus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [batchConfirmData, setBatchConfirmData] = useState<{count: number, unit: string, target: string} | null>(null);

    const stats = useMemo(() => {
        const assigned = registrations.filter(r => 
            r.bus_assigned && 
            r.status === RegStatus.NORMAL && 
            r.trip_type !== TripType.SELF_MANAGED && 
            r.trip_type !== TripType.RETAINED
        ).length;
        const capacity = (currentEvent.busConfigs || []).reduce((acc, bus) => acc + (bus.capacity || 0), 0);
        return { totalAssigned: assigned, totalCapacity: capacity };
    }, [registrations, currentEvent.busConfigs]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateEvent(currentEvent);
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

    const getAvailableStopsForBus = useCallback((busName: string) => {
        const route = currentEvent.busRoutes?.[busName];
        if (!route) return [];
        
        const outboundItems = Array.isArray(route.outbound) ? route.outbound : [];
        const returnItems = Array.isArray(route.returnTrip) ? route.returnTrip : [];
        
        // Use a Map with stopCode as key to ensure all unique stops are included
        const map = new Map<string, RoutePlanItem>();
        
        // Process outbound stops
        outboundItems.forEach(item => {
            if (item.stopCode) {
                map.set(item.stopCode, { ...item, arrivalTime: item.arrivalTime || item.departureTime });
            }
        });
        
        // Process return stops
        returnItems.forEach(item => {
            if (item.stopCode) {
                map.set(item.stopCode, { ...item, arrivalTime: item.arrivalTime || item.departureTime });
            }
        });
        
        return Array.from(map.values()).sort((a, b) => (a.stopCode || '').localeCompare(b.stopCode || ''));
    }, [currentEvent.busRoutes]);

    const filteredRegistrations = useMemo(() => {
        if (!searchQuery) return registrations;
        const q = searchQuery.toLowerCase();
        return registrations.filter(r => 
            r.name.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q) || r.bus_assigned?.toLowerCase().includes(q)
        );
    }, [registrations, searchQuery]);

    const busGroups = useMemo(() => {
        const groups: Record<string, Registration[]> = { unassigned: [] };
        currentEvent.busConfigs?.forEach(b => groups[b.name] = []);
        const processedIds = new Set<string>();
        filteredRegistrations.forEach(r => {
            if (processedIds.has(r.reg_id) || r.status !== RegStatus.NORMAL || r.trip_type === TripType.SELF_MANAGED || r.trip_type === TripType.RETAINED) return;
            processedIds.add(r.reg_id);
            const bus = r.bus_assigned;
            if (bus) {
                const matchedBus = currentEvent.busConfigs?.find(c => c.name === bus || c.stops?.some(s => s.code === bus));
                const targetBusName = matchedBus ? matchedBus.name : (groups[bus] ? bus : 'unassigned');
                if (groups[targetBusName]) groups[targetBusName].push(r);
                else groups['unassigned'].push(r);
            } else groups['unassigned'].push(r);
        });
        groups['unassigned'].sort((a, b) => {
             const idxA = unitOptions.indexOf(a.unit);
             const idxB = unitOptions.indexOf(b.unit);
             if (idxA !== -1 && idxB !== -1) return idxA - idxB;
             return a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name);
        });
        return groups;
    }, [filteredRegistrations, currentEvent.busConfigs, unitOptions]);

    const handleAssignToBus = (regId: string, busNameOrCode: string) => {
        updateRegistrationField(regId, 'bus_assigned', busNameOrCode === 'unassigned' ? '' : busNameOrCode);
        onRefresh();
    };

    const handleBatchAssign = () => {
        if (!batchUnit || !batchBus) return;
        const targetRegs = registrations.filter(r => r.unit === batchUnit && !r.bus_assigned && r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED && r.status === RegStatus.NORMAL);
        if (targetRegs.length === 0) {
            setMsgType('info');
            setMsg('該單位無未分配成員');
            return;
        }
        setBatchConfirmData({ count: targetRegs.length, unit: batchUnit, target: batchBus });
    };

    const executeBatchAssign = async () => {
        if (!batchConfirmData) return;
        const { unit, target } = batchConfirmData;
        const targetRegs = registrations.filter(r => r.unit === unit && !r.bus_assigned && r.status === RegStatus.NORMAL);
        if (targetRegs.length > 0) {
            await batchUpdateRegistrationField(targetRegs.map(r => r.reg_id), 'bus_assigned', target);
            onRefresh();
        }
        setBatchConfirmData(null);
        setMsgType('success');
        setMsg(`已成功指派 ${targetRegs.length} 位成員`);
    };

    const handleExportBusList = (busName: string, shouldMask: boolean = false, toEditor: boolean = false) => {
        const busConfig = currentEvent.busConfigs?.find(c => c.name === busName);
        const stops = busConfig?.stops || [];
        const stopCodes = stops.map(s => s.code);
        const maskName = (name: string) => {
            if (!name || !shouldMask) return name;
            const cleanName = name.trim();
            if (cleanName.length <= 1) return cleanName;
            if (cleanName.length === 2) return cleanName[0] + "Ｏ";
            return `${cleanName[0]}Ｏ${cleanName[cleanName.length - 1]}`;
        };
        const riders = registrations.filter(r => (r.bus_assigned === busName || stopCodes.includes(r.bus_assigned || '')) && r.status === RegStatus.NORMAL && r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED);
        if (riders.length === 0) return;
        let content = `【${busName}號車 搭車名單】\n發車日期: ${currentEvent.event_date}\n\n`;
        const stations = stops.length > 0 ? stops : [{ code: busName, location: '全車', time: '' }];
        stations.forEach(stop => {
            const members = riders.filter(r => r.bus_assigned === stop.code);
            if (members.length === 0) return;
            content += `${stop.location} (${stop.time})\n`;
            members.forEach(m => content += `${m.unit} ${maskName(m.name)}\n`);
            content += `\n`;
        });
        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
        } else {
            const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `搭車名單_${busName}.txt`; a.click();
        }
        setExportTargetBus(null);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-fade-in relative text-sm">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <ConfirmDialog isOpen={showResetConfirm} title="重置分配" message="確定要清除所有成員的車輛分配嗎？" onConfirm={async () => { await batchUpdateRegistrationField(registrations.map(r => r.reg_id), 'bus_assigned', ''); onRefresh(); setShowResetConfirm(false); }} onCancel={() => setShowResetConfirm(false)} isDangerous={true} />
            <ConfirmDialog isOpen={!!batchConfirmData} title="批量分配確認" message={batchConfirmData ? `確定將 ${batchConfirmData.count} 位 ${batchConfirmData.unit} 成員分配至 ${batchConfirmData.target} 嗎？` : ''} onConfirm={executeBatchAssign} onCancel={() => setBatchConfirmData(null)} />
            <ExportChoiceModal isOpen={!!exportTargetBus} onClose={() => setExportTargetBus(null)} onConfirm={(mask, toEditor) => { if (exportTargetBus) handleExportBusList(exportTargetBus, mask, toEditor); }} />

            <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded border border-white/10">
                        <Bus className="text-blue-300" size={24} />
                    </div>
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                        {t('bus.title.assignmentSettings', '分車作業系統')}
                    </h2>
                </div>
                <div className="flex justify-end items-center gap-3">
                    <p className="hidden md:block text-xs text-indigo-200 font-medium uppercase tracking-wider opacity-60 mr-auto">Fleet Distribution & Passenger Logistics</p>
                    <button onClick={() => setIsToolsExpanded(!isToolsExpanded)} className="h-10 px-5 bg-white/10 text-white rounded text-xs font-bold shadow-sm hover:bg-white/20 transition-all flex items-center gap-2">
                        {isToolsExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        {isToolsExpanded ? '收合工具' : '展開工具'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
                <div className="w-full px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100" onClick={() => setIsToolsExpanded(!isToolsExpanded)}>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2"><Users2 size={18} className="text-blue-600" />批量指派與重置工具</h3>
                    <div className="text-slate-400">{isToolsExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                </div>
                <AnimatePresence>
                    {isToolsExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-6 flex flex-col gap-6 bg-[#F0F4F8]/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">選擇單位</label>
                                        <select className="w-full bg-white border border-slate-200 text-sm font-medium p-3 rounded outline-none focus:border-blue-500 transition-all shadow-sm" value={batchUnit} onChange={e => setBatchUnit(e.target.value)}>
                                            <option value="">選擇單位</option>
                                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">指派目標</label>
                                        <select className="w-full bg-white border border-slate-200 text-sm font-medium p-3 rounded outline-none focus:border-blue-500 transition-all shadow-sm" value={batchBus} onChange={e => setBatchBus(e.target.value)}>
                                            <option value="">選擇目標車次/站點</option>
                                            {(currentEvent?.busConfigs || []).map(b => (
                                                <optgroup key={b.name} label={b.name} className="font-bold text-indigo-900 bg-indigo-50">
                                                    <option value={b.name}>{b.name} (全車分配)</option>
                                                    {(b.stops || []).map(s => <option key={s.code} value={s.code}>{s.code} - {s.location}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end items-center gap-3">
                                    <button onClick={() => setShowResetConfirm(true)} className="h-10 px-5 bg-white border border-rose-200 text-rose-600 rounded text-xs font-bold shadow-sm hover:bg-rose-50 transition-all flex items-center gap-2"><RefreshCw size={16} /> 重置分配</button>
                                    <button onClick={handleBatchAssign} disabled={!batchUnit || !batchBus} className="h-10 px-6 bg-blue-600 text-white rounded text-xs font-bold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"><Check size={16} /> 執行指派</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: '總乘車人數', val: stats.totalAssigned, unit: '人', color: 'text-blue-600', icon: Users },
                    { label: '總座位數', val: stats.totalCapacity, unit: '席', color: 'text-slate-900', icon: Bus },
                    { label: '剩餘座位', val: stats.totalCapacity - stats.totalAssigned, unit: '席', color: (stats.totalCapacity - stats.totalAssigned < 0 ? 'text-rose-600' : 'text-amber-600'), icon: Activity },
                    { label: '分配完成度', val: Math.round((stats.totalAssigned / Math.max(1, stats.totalCapacity)) * 100), unit: '%', color: 'text-indigo-600', icon: CheckCircle }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded shadow-sm border border-slate-200 flex items-center gap-3">
                        <div className={`p-2 rounded ${s.color.replace('text-', 'bg-').replace('-600', '-50')}`}><s.icon size={18} className={s.color} /></div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{s.label}</span>
                            <div className="flex items-baseline gap-1"><span className={`text-lg font-bold ${s.color}`}>{s.val}</span><span className="text-[10px] font-medium text-slate-400">{s.unit}</span></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="快速搜尋成員姓名、單位..." className="w-full bg-slate-50 border border-slate-200 text-sm font-medium pl-11 pr-4 py-3 rounded outline-none focus:border-indigo-500 transition-all shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 w-full md:w-auto">
                        <button onClick={handleSave} disabled={isSaving} className={`h-11 px-6 rounded text-xs font-bold shadow-md transition-all flex items-center gap-2 ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            <Save size={16} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? '儲存中...' : '保存設定'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-row gap-8 overflow-x-auto pb-12 snap-x custom-scrollbar">
                <div className="min-w-full md:min-w-[400px] bg-white rounded shadow-sm border border-slate-200 flex flex-col h-[700px] snap-center shrink-0 overflow-hidden">
                    <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                        <h4 className="font-bold text-white text-base flex items-center gap-2"><AlertCircle className="text-amber-400" size={18} /> 未指派名單</h4>
                        <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">{(busGroups['unassigned'] || []).length}</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-[#F0F4F8]/20 custom-scrollbar">
                        {(busGroups['unassigned'] || []).map((reg) => (
                            <div key={reg.reg_id} className="bg-white p-4 rounded shadow-sm border border-slate-100 hover:border-blue-400 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col"><span className="font-bold text-slate-900 text-sm">{reg.name}</span><span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit mt-1">{reg.unit}</span></div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {(currentEvent?.busConfigs || []).map(bus => (
                                        <div key={bus.name} className="flex flex-wrap gap-1 items-center bg-slate-50 p-1 rounded border border-slate-100">
                                            <button 
                                                onClick={() => handleAssignToBus(reg.reg_id, bus.name)} 
                                                className="h-8 px-2.5 bg-indigo-600 text-white text-[10px] font-black rounded hover:bg-indigo-700 transition-all shadow-sm"
                                                title={`${bus.name} 全車指派`}
                                            >
                                                {bus.name}
                                            </button>
                                            {(bus.stops || []).map(stop => (
                                                <button 
                                                    key={stop.code} 
                                                    onClick={() => handleAssignToBus(reg.reg_id, stop.code)} 
                                                    className="h-7 px-2 bg-white text-slate-600 text-[9px] font-bold rounded border border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all"
                                                    title={`${stop.code} - ${stop.location}`}
                                                >
                                                    {stop.code}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {Object.keys(busGroups).filter(k => k !== 'unassigned').sort().map(busName => (
                    <BusAssignmentCard 
                        key={busName} busName={busName} busConfig={currentEvent.busConfigs?.find(c => c.name === busName)}
                        passengers={busGroups[busName] || []} availableStops={getAvailableStopsForBus(busName)}
                        onExport={() => setExportTargetBus(busName)}
                        onAddStop={(stop) => {
                            const newConfigs = (currentEvent.busConfigs || []).map(b => b.name === busName ? { ...b, stops: [...(b.stops || []), stop] } : b);
                            updateEvent({ ...currentEvent, busConfigs: newConfigs });
                        }}
                        onUpdateStops={(stops) => {
                            const newConfigs = (currentEvent.busConfigs || []).map(b => b.name === busName ? { ...b, stops } : b);
                            updateEvent({ ...currentEvent, busConfigs: newConfigs });
                        }}
                        onAssign={handleAssignToBus}
                    />
                ))}
            </div>
        </div>
    );
};

export default AssignmentTab;
