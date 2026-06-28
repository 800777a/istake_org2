
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, Registration, GlobalSettings, BusStop, BusConfig, TripType, RegStatus, RoutePlanItem } from '../../types';
import { updateEvent } from '../../services/eventService';
import { assignSeat, updateRegistrationField } from '../../services/registrationService';
import { Bus, Download, Plus, Trash2, Edit2, Check, X, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';
import Toast, { ToastType } from '../Toast';

interface AssignmentTabProps {
    currentEvent: EventData;
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const StopEditRow: React.FC<{ 
    stop: BusStop, 
    availableStops: RoutePlanItem[],
    onSave: (s: BusStop) => void, 
    onDelete: () => void 
}> = ({ stop, availableStops, onSave, onDelete }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [temp, setTemp] = useState(stop);

    const handleSelectArea = (area: string) => {
        const found = availableStops.find(s => s.area === area);
        if (found) {
            setTemp({
                ...temp,
                location: area,
                code: found.stopCode || '',
                time: found.arrivalTime || ''
            });
        } else {
            setTemp({ ...temp, location: area, code: '', time: '' });
        }
    };

    if (isEditing) {
        return (
            <div className="flex gap-1 items-center mb-1">
                <input 
                    className="w-10 border text-[10px] p-1 rounded font-mono bg-gray-100 text-gray-500 cursor-not-allowed outline-none" 
                    placeholder={t('bus.placeholder.stopCode', '站號')} 
                    value={temp.code} 
                    readOnly 
                />
                <select 
                    className="flex-1 border text-[10px] p-1 rounded bg-white transition-all outline-none border-blue-200 focus:border-blue-500"
                    value={temp.location}
                    onChange={e => handleSelectArea(e.target.value)}
                >
                    <option value="">{t('bus.placeholder.selectLocation', '選擇地名')}</option>
                    {availableStops.map((s, i) => (
                        <option key={`${s.area}-${i}`} value={s.area}>
                            {s.area}
                        </option>
                    ))}
                </select>
                <input 
                    className="w-14 border text-[10px] p-1 rounded bg-gray-100 text-gray-500 cursor-not-allowed outline-none" 
                    placeholder={t('bus.placeholder.arrivalTime', '到達')} 
                    value={temp.time || ''} 
                    readOnly 
                />
                <div className="flex gap-1 pl-1">
                    <button onClick={() => { onSave(temp); setIsEditing(false); }} className="text-green-600 hover:scale-110 transition-transform"><Check className="w-3.5 h-3.5"/></button>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:scale-110 transition-transform"><X className="w-3.5 h-3.5"/></button>
                </div>
            </div>
        );
    }
    return (
        <div className="flex justify-between text-[10px] text-gray-600 mb-1 group items-center py-0.5 border-b border-black/5 hover:bg-black/5 rounded px-1 transition-colors">
            <span className="flex items-center gap-1.5">
                <span className="font-black text-blue-600 bg-blue-50 px-1 rounded-sm w-[24px] text-center">{stop.code}</span>
                <span className="font-bold text-gray-800">{stop.location}</span> 
                {stop.time && <span className="font-black text-red-600 bg-red-50 px-1 rounded-sm">({stop.time})</span>}
            </span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 bg-white px-1 rounded shadow-sm">
                <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:text-blue-700"><Edit2 className="w-3 h-3"/></button>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3"/></button>
            </div>
        </div>
    );
};

const AssignmentTab: React.FC<AssignmentTabProps> = ({ currentEvent, registrations, settings, onRefresh, onPushToEditor }) => {
    const { t } = useTranslation();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [batchUnit, setBatchUnit] = useState('');
    const [batchBus, setBatchBus] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    const [exportTargetBus, setExportTargetBus] = useState<string | null>(null);

    // V300: Extract unique station list from all bus routes for dropdown
    const availableStops = useMemo(() => {
        const allRoutes = Object.values(currentEvent.busRoutes || {});
        const map = new Map<string, RoutePlanItem>();
        
        allRoutes.forEach(route => {
            [...(route.outbound || []), ...(route.returnTrip || [])].forEach(item => {
                if (item.area) {
                    // Always prefer item that has more info or just first occurrence
                    if (!map.has(item.area) || (!map.get(item.area)?.stopCode && item.stopCode)) {
                        map.set(item.area, item);
                    }
                }
            });
        });

        return Array.from(map.values()).sort((a, b) => {
            return (a.area || '').localeCompare(b.area || '', 'zh-Hant');
        });
    }, [currentEvent.busRoutes]);

    // V300: Bus List Export
    const handleExportBusList = (busName: string, shouldMask: boolean = false, toEditor: boolean = false) => {
        const busConfig = currentEvent.busConfigs?.find(c => c.name === busName);
        const stops = busConfig?.stops || [];
        const stopCodes = stops.map(s => s.code);

        // Name Masking Helper
        const maskName = (name: string) => {
            if (!name) return "";
            if (!shouldMask) return name;
            const isEnglish = /^[A-Za-z\s.-]+$/.test(name);
            if (isEnglish) {
                const parts = name.trim().split(/\s+/);
                return parts.length > 0 ? `${parts[0]} Ｏ` : name;
            } else {
                const cleanName = name.trim();
                if (cleanName.length <= 1) return cleanName;
                if (cleanName.length === 2) return cleanName[0] + "Ｏ";
                return `${cleanName[0]}Ｏ${cleanName[cleanName.length - 1]}`;
            }
        };

        const busNormalRiders = registrations.filter(r => 
            (r.bus_assigned === busName || stopCodes.includes(r.bus_assigned || '')) && 
            r.status === RegStatus.NORMAL &&
            r.trip_type !== TripType.SELF_MANAGED &&
            r.trip_type !== TripType.RETAINED
        );

        if (busNormalRiders.length === 0) {
            setMsgType('info');
            setMsg(t('bus.alerts.noRidersForExport', '此車次目前無搭車名單'));
            return;
        }

        const totalOut = busNormalRiders.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO).length;
        const totalIn = busNormalRiders.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK).length;

        // Metadata from settings
        const appVer = settings.app_version || 'V1.0.0';
        const stakeTitle = settings.stake_name || t('common.chiayi_stake', '嘉義支聯會');
        const eventTitle = currentEvent.event_title || t('common.temple_trip', '聖殿之旅');
        const eventDate = currentEvent.event_date.replace(/-/g, '.');

        let content = `${currentEvent.event_date} ${eventTitle}\n`;
        content += `${t('bus.export.company', '車行')}: ${busConfig?.company || ''}\n`;
        content += `${t('bus.export.licensePlate', '車號')}: ${busConfig?.licensePlate || ''}\n`;
        content += `${t('bus.export.driver', '司機')}: ${busConfig?.driverName1 || ''}${busConfig?.driverName2 ? ' / ' + busConfig?.driverName2 : ''}\n`;
        content += `${t('bus.export.phone', '電話')}: ${busConfig?.driverPhone1 || ''}${busConfig?.driverPhone2 ? ' / ' + busConfig?.driverPhone2 : ''}\n`;
        content += `${busName} ${t('bus.export.outbound', '去程')}:${totalOut}${t('common.people', '人')} ${t('bus.export.returnTrip', '回程')}:${totalIn}${t('common.people', '人')}\n\n`;

        // Group by stops
        const stations = stops.length > 0 ? stops : [{ code: busName, location: t('bus.label.unassigned_stop', '未指定站點'), time: '' }];

        stations.forEach(stop => {
            // Filter members for this specific stop
            // Important: use exact match for stop code if stops exist
            const members = busNormalRiders
                .filter(r => r.bus_assigned === stop.code)
                .sort((a, b) => {
                    // Use defined unit order for stable church hierarchy
                    const idxA = settings.units.indexOf(a.unit);
                    const idxB = settings.units.indexOf(b.unit);
                    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
                    if (a.unit !== b.unit) {
                        return a.unit.localeCompare(b.unit, 'zh-TW');
                    }
                    return a.name.localeCompare(b.name, 'zh-TW');
                });
            
            if (members.length === 0 && stops.length > 0) return;

            const sOut = members.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO).length;
            const sIn = members.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK).length;

            content += `${stop.code}:\n`;
            content += `${stop.location} (${stop.time})\n`;
            content += `${t('bus.export.outbound', '去程')}:${sOut}${t('common.people', '人')} ${t('bus.export.returnTrip', '回程')}:${sIn}${t('common.people', '人')}\n`;
            
            members.forEach(m => {
                let pattern = t('common.roundTrip', '來回');
                if (m.trip_type === TripType.ONE_WAY_TO) pattern = t('common.oneWayTo', '去程');
                if (m.trip_type === TripType.ONE_WAY_BACK) pattern = t('common.oneWayBack', '回程');
                content += `${m.unit} ${maskName(m.name)} ${pattern}\n`;
            });
            content += `\n`;
        });

        content += `--------------------------------\n`;
        content += `${t('common.appVersion', '系統版本')}：${appVer}\n`;
        content += `${t('common.stakeTitle', '主辦單位')}：${stakeTitle}\n`;

        const filename = `${appVer}_${stakeTitle}_${eventDate}_${busName}_${t('bus.export.filenameSuffix', '搭車名單')}.txt`;
        
        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
            setExportTargetBus(null);
            return;
        }

        // Add UTF-8 BOM to ensure correct encoding
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setExportTargetBus(null);
    };
    
    // UI Feedback States (Replaces window.alert/confirm)
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [batchConfirmData, setBatchConfirmData] = useState<{count: number, unit: string, target: string} | null>(null);

    const busGroups = useMemo(() => {
        const groups: Record<string, Registration[]> = { unassigned: [] };
        // Init groups for each bus
        currentEvent.busConfigs?.forEach(b => groups[b.name] = []);
        
        // Use a Set to track processed IDs to prevent duplicates in display logic
        const processedIds = new Set<string>();

        registrations.forEach(r => {
            // Ensure unique and ignore CANCELLED
            if (processedIds.has(r.reg_id)) return;
            if (r.status !== RegStatus.NORMAL) return; // FIX: Exclude cancelled
            
            processedIds.add(r.reg_id);

            // Skip Self-Managed and Retained (留用) from bus assignment list
            if (r.trip_type === TripType.SELF_MANAGED || r.trip_type === TripType.RETAINED) return;

            const bus = r.bus_assigned;
            if (bus) {
                // If bus matches a stop code or exact bus name
                const matchedBus = currentEvent.busConfigs?.find(c => c.name === bus || c.stops?.some(s => s.code === bus));
                const targetBusName = matchedBus ? matchedBus.name : (groups[bus] ? bus : 'unassigned');
                
                if (groups[targetBusName]) groups[targetBusName].push(r);
                else groups['unassigned'].push(r);
            } else {
                groups['unassigned'].push(r);
            }
        });

        // Sort unassigned by Unit order then Name
        groups['unassigned'].sort((a, b) => {
             const idxA = settings.units.indexOf(a.unit);
             const idxB = settings.units.indexOf(b.unit);
             if (idxA !== -1 && idxB !== -1) return idxA - idxB;
             if (idxA !== -1) return -1; 
             if (idxB !== -1) return 1;
             return a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name);
        });

        return groups;
    }, [registrations, currentEvent.busConfigs, settings.units]);

    const handleAssignToBus = (regId: string, busNameOrCode: string) => {
        updateRegistrationField(regId, 'bus_assigned', busNameOrCode === 'unassigned' ? '' : busNameOrCode);
        onRefresh();
    };

    const handleBatchBusAssignTrigger = () => {
        if (!batchUnit || !batchBus) return;
        // Filter out cancelled here too for safety
        const targetRegs = registrations.filter(r => 
            r.unit === batchUnit && 
            !r.bus_assigned && 
            r.trip_type !== TripType.SELF_MANAGED && 
            r.trip_type !== TripType.RETAINED && 
            r.status === RegStatus.NORMAL
        );
        
        if (targetRegs.length === 0) {
            setToastMsg(t('bus.alerts.noUnassignedInUnit', '該單位無未分配成員'));
            setTimeout(() => setToastMsg(null), 3000);
            return;
        }
        
        setBatchConfirmData({
            count: targetRegs.length,
            unit: batchUnit,
            target: batchBus
        });
    };

    const executeBatchAssign = () => {
        if (!batchConfirmData) return;
        const { unit, target } = batchConfirmData;
        const targetRegs = registrations.filter(r => 
            r.unit === unit && 
            !r.bus_assigned && 
            r.trip_type !== TripType.SELF_MANAGED && 
            r.trip_type !== TripType.RETAINED && 
            r.status === RegStatus.NORMAL
        );
        
        targetRegs.forEach(r => updateRegistrationField(r.reg_id, 'bus_assigned', target));
        onRefresh();
        setBatchConfirmData(null);
        setToastMsg(t('bus.alerts.batchAssignSuccess', '已成功分配 {{count}} 位成員', { count: targetRegs.length }));
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleResetAllAssignments = () => {
        registrations.forEach(r => updateRegistrationField(r.reg_id, 'bus_assigned', ''));
        onRefresh();
        setShowResetConfirm(false);
    };

    // Stops Handlers
    const handleAddStop = (busName: string) => {
        const newStop: BusStop = { code: `${busName}-S`, location: t('bus.label.new_station', '新站點'), time: '08:00' };
        const newConfigs = (currentEvent.busConfigs || []).map(b => {
            if (b.name === busName) {
                return { ...b, stops: [...(b.stops || []), newStop] };
            }
            return b;
        });
        updateEvent({ ...currentEvent, busConfigs: newConfigs });
    };

    const handleSaveBusStops = (busName: string, stops: BusStop[]) => {
        const newConfigs = (currentEvent.busConfigs || []).map(b => 
            b.name === busName ? { ...b, stops } : b
        );
        updateEvent({ ...currentEvent, busConfigs: newConfigs });
    };

    return (
        <div className="animate-fade-in relative">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />

            <ConfirmDialog 
                isOpen={showResetConfirm}
                title={t('bus.modal.resetAssignmentTitle', '重置分配')}
                message={t('bus.modal.resetAssignmentMsg', '確定要清除所有成員的車輛分配嗎？')}
                onConfirm={handleResetAllAssignments}
                onCancel={() => setShowResetConfirm(false)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!batchConfirmData}
                title={t('bus.modal.batchAssignTitle', '批量分配確認')}
                message={batchConfirmData ? t('bus.modal.batchAssignMsg', '確定將 {{count}} 位 {{unit}} 成員分配至 {{target}} 嗎？', { count: batchConfirmData.count, unit: batchConfirmData.unit, target: batchConfirmData.target }) : ''}
                onConfirm={executeBatchAssign}
                onCancel={() => setBatchConfirmData(null)}
            />

            <ExportChoiceModal 
                isOpen={!!exportTargetBus}
                onClose={() => setExportTargetBus(null)}
                onConfirm={(mask, toEditor) => {
                    if (exportTargetBus) handleExportBusList(exportTargetBus, mask, toEditor);
                }}
            />

            <div className="bg-red-50 rounded-2xl shadow-xl border-4 border-red-100 mb-6 overflow-hidden transition-all duration-300">
                <div className="px-6 py-4 flex justify-between items-center bg-white">
                    <h3 className="font-black text-red-900 flex items-center text-xl uppercase tracking-tighter">
                        <Bus className="w-6 h-6 mr-3 text-red-600" /> {t('bus.title.assignmentSettings', '分車設定')} <span className="ml-2 text-xs font-bold text-gray-400 opacity-50 bg-gray-100 px-2 py-0.5 rounded-full">ASSIGNMENT SETTINGS</span>
                    </h3>
                    <button 
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-600"
                    >
                        {isHeaderExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                    </button>
                </div>
                
                <AnimatePresence>
                    {isHeaderExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-6 py-5 bg-red-50 border-t-2 border-white space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex bg-white p-1 rounded-xl shadow-inner border-2 border-red-100">
                                        <select 
                                            className="bg-transparent text-sm font-black text-gray-900 px-3 py-2 outline-none border-r-2 border-red-50 min-w-[120px]"
                                            value={batchUnit}
                                            onChange={e => setBatchUnit(e.target.value)}
                                        >
                                            <option value="">{t('bus.placeholder.selectUnit', '選擇單位')}</option>
                                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                        <select 
                                            className="bg-transparent text-sm font-black text-gray-900 px-3 py-2 outline-none min-w-[160px]"
                                            value={batchBus}
                                            onChange={e => setBatchBus(e.target.value)}
                                        >
                                            <option value="">{t('bus.placeholder.selectBusOrStop', '選擇車次/站點')}</option>
                                            {(currentEvent?.busConfigs || []).map(b => (
                                                <optgroup key={b.name} label={b.name}>
                                                    <option value={b.name}>{b.name} ({t('bus.label.full_bus', '全車')})</option>
                                                    {(b.stops || []).map(s => (
                                                        <option key={s.code} value={s.code}>{s.code} - {s.location}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={handleBatchBusAssignTrigger}
                                            className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 font-black shadow-lg hover:shadow-red-200 transition-all ml-1"
                                            disabled={!batchUnit || !batchBus}
                                        >
                                            {t('bus.button.batchAssign', '執行批次指派')}
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => setShowResetConfirm(true)}
                                        className="bg-white border-2 border-red-200 text-red-700 px-5 py-3 rounded-xl hover:bg-red-100 flex items-center text-sm font-black shadow-sm transition-all"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" /> {t('bus.button.resetAssignment', '重新分配 (RESET)')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4 snap-x">
                {/* Unassigned Column - Orange */}
                <div className="min-w-full md:min-w-[320px] bg-orange-50 rounded-lg border border-orange-200 flex flex-col h-[500px] md:h-[650px] snap-center shrink-0">
                    <div className="p-4 border-b border-orange-200 bg-orange-100 rounded-t-lg">
                        <h4 className="font-bold text-orange-900 flex justify-between text-base">
                            {t('bus.title.unassignedRiders', '未分配乘客')}
                            <span className="bg-white px-2 rounded-full text-xs py-0.5 border border-orange-200 text-orange-800">{(busGroups['unassigned'] || []).length}</span>
                        </h4>
                    </div>
                    <div className="p-2 overflow-y-auto flex-1 space-y-2">
                        {(busGroups['unassigned'] || []).map((reg: Registration) => (
                            <div key={reg.reg_id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-100">
                                <div className="font-bold text-gray-800 flex justify-between text-xs">
                                    {reg.name}
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                                        {currentEvent?.busConfigs?.map(bus => {
                                            if (bus.stops && bus.stops.length > 0) {
                                                return bus.stops.map(stop => (
                                                    <button 
                                                        key={stop.code}
                                                        onClick={() => handleAssignToBus(reg.reg_id, stop.code)}
                                                        className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-200 mb-1"
                                                        title={stop.location}
                                                    >
                                                        {stop.code}
                                                    </button>
                                                ));
                                            } else {
                                                return (
                                                    <button 
                                                        key={bus.name}
                                                        onClick={() => handleAssignToBus(reg.reg_id, bus.name)}
                                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-200 mb-1"
                                                    >
                                                        {bus.name.charAt(0)}
                                                    </button>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">{reg.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assigned Columns */}
                {Object.keys(busGroups).filter(k => k !== 'unassigned').sort().map(busName => {
                    const busConfig = currentEvent.busConfigs?.find(c => c.name === busName);
                    const navName = busConfig?.navigatorName || '';
                    const passengers = busGroups[busName] || [];
                    
                    const subGroups: Record<string, Registration[]> = {};
                    passengers.forEach((p: Registration) => {
                        const code = p.bus_assigned || t('common.unassigned', '未指定');
                        if (!subGroups[code]) subGroups[code] = [];
                        subGroups[code].push(p);
                    });

                    // Determine Theme based on Bus Name
                    let themeClass = 'bg-white border-gray-200';
                    let headerClass = 'bg-gray-50 border-gray-200';
                    let titleClass = 'text-gray-800';
                    
                    if (busName.includes('A') || busName.includes('C')) {
                        themeClass = 'bg-yellow-50 border-yellow-200';
                        headerClass = 'bg-yellow-100 border-yellow-200';
                        titleClass = 'text-yellow-900';
                    } else if (busName.includes('B') || busName.includes('D')) {
                        themeClass = 'bg-green-50 border-green-200';
                        headerClass = 'bg-green-100 border-green-200';
                        titleClass = 'text-green-900';
                    }

                    return (
                        <div key={busName} className={`min-w-full md:min-w-[320px] rounded-lg border flex flex-col h-[500px] md:h-[650px] shadow-sm snap-center shrink-0 ${themeClass}`}>
                            <div className={`rounded-t-lg border-b ${headerClass}`}>
                                <div className={`p-3 border-b ${headerClass.replace('bg-', 'border-')}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className={`font-bold flex items-center text-base ${titleClass}`}>
                                            <Bus className="w-4 h-4 mr-2" /> {busName}
                                        </h4>
                                        <span className="bg-white/50 px-2 rounded-full text-xs py-0.5 border border-black/10 font-bold">
                                            {passengers.length} / {busConfig?.capacity || 42}
                                        </span>
                                    </div>
                                    
                                    {/* Bus List Export Button (Replaces Navigator Setting) */}
                                    <div className="mb-2">
                                        <button 
                                            onClick={() => setExportTargetBus(busName)}
                                            className="w-full bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-bold hover:bg-blue-700 flex items-center justify-center shadow-sm transition-all"
                                        >
                                            <Download className="w-3 h-3 mr-2" /> {t('bus.button.exportBusList', '匯出搭車名單')}
                                        </button>
                                    </div>
                                </div>

                                {/* Stops Configuration */}
                                <div className="p-2">
                                    <div className="text-[10px] font-bold text-gray-600 mb-1 flex justify-between items-center">
                                        <span>{t('bus.label.stops', '停靠站')}</span>
                                        <button onClick={() => handleAddStop(busName)} className="text-blue-600 hover:text-blue-800 flex items-center">
                                            <Plus className="w-3 h-3 mr-1" />{t('common.add', '新增')}
                                        </button>
                                    </div>
                                    {busConfig?.stops?.map((stop, idx) => (
                                        <StopEditRow 
                                            key={idx} 
                                            stop={stop} 
                                            availableStops={availableStops}
                                            onSave={(newStop) => {
                                                const newStops = [...(busConfig.stops || [])];
                                                newStops[idx] = newStop;
                                                handleSaveBusStops(busName, newStops);
                                            }}
                                            onDelete={() => {
                                                const newStops = [...(busConfig.stops || [])];
                                                newStops.splice(idx, 1);
                                                handleSaveBusStops(busName, newStops);
                                            }}
                                        />
                                    ))}
                                    {(!busConfig?.stops || busConfig.stops.length === 0) && (
                                        <div className="text-[10px] text-gray-400 text-center py-1">{t('bus.status.noStops', '無設定站點')}</div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-2 overflow-y-auto flex-1 space-y-2 bg-white rounded-b-lg">
                                {Object.keys(subGroups).sort().map(code => (
                                    <div key={code} className="mb-2">
                                        <div className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-t flex justify-between border-t border-l border-r border-gray-200">
                                            <span>{code}</span>
                                            {/* Try to find location name */}
                                            <span>{busConfig?.stops?.find(s => s.code === code)?.location}</span>
                                        </div>
                                        <div className="border-l border-r border-b border-gray-200 rounded-b p-1 space-y-1">
                                            {subGroups[code].map(reg => (
                                                <div key={reg.reg_id} className="bg-white p-2 rounded border border-gray-100 hover:border-blue-300 transition-colors relative group flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-xs">{reg.name}</div>
                                                        <div className="text-[10px] text-gray-500">{reg.unit}</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleAssignToBus(reg.reg_id, 'unassigned')}
                                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AssignmentTab;
