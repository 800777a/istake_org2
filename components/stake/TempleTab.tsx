
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, Registration, GlobalSettings, OrdinanceItem, RegStatus, OrdinanceSessionItem } from '../../types';
import { updateEvent, batchUpdateSession, updateRegistrationField, assignMissingSerialNumbers } from '../../services/sheetService';
import { BookOpen, Download, Zap, Clock, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';
import Toast, { ToastType } from '../Toast';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
import { useStats, useRanks } from '../../hooks/useStats';
import { getGenderFromId } from '../../utils/validation';

interface TempleTabProps {
    currentEvent: EventData;
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onUpdateEvent: (e: EventData) => void;
}

const TempleTab: React.FC<TempleTabProps> = ({ currentEvent, registrations, settings, onRefresh, onUpdateEvent }) => {
    const { t, i18n } = useTranslation();
    const [globalEndowmentTime, setGlobalEndowmentTime] = useState<string>('');
    const [globalBaptismTime, setGlobalBaptismTime] = useState<string>('');
    const [globalSealingTime, setGlobalSealingTime] = useState<string>('');
    
    const [unitEndowmentTime, setUnitEndowmentTime] = useState<Record<string, string>>({});
    const [unitBaptismTime, setUnitBaptismTime] = useState<Record<string, string>>({});
    const [unitSealingTime, setUnitSealingTime] = useState<Record<string, string>>({});
    
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    
    // Collapse State
    const [isEndowmentExpanded, setIsEndowmentExpanded] = useState(true);
    const [isBaptismExpanded, setIsBaptismExpanded] = useState(true);
    const [isSealingExpanded, setIsSealingExpanded] = useState(true);
    
    // Sort State
    const [endowmentSort, setEndowmentSort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'unit', dir: 'asc' });
    const [baptismSort, setBaptismSort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'unit', dir: 'asc' });
    const [sealingSort, setSealingSort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'unit', dir: 'asc' });

    // Config slots (Strictly 24H strings)
    const endowmentSlots = currentEvent.endowmentSettingsV2?.map(s => s.time).filter(t => !!t) || [];
    const baptismSlots = currentEvent.baptismSettingsV2?.map(s => s.time).filter(t => !!t) || [];
    const sealingSlots = currentEvent.sealingSettingsV2?.map(s => s.time).filter(t => !!t) || [];

    const handleAssignSerials = async () => {
        if (!currentEvent.event_id) return;
        const res = await assignMissingSerialNumbers(currentEvent.event_id, registrations);
        if (res.success) {
            setMsgType('success');
            setMsg(res.message);
            onRefresh();
        } else {
            setMsgType('error');
            setMsg(t('stake.temple.alerts.assignSerialFailed', '分配編號失敗: {{error}}', { error: res.message }));
        }
    };

    // Generate 24h options for select (00:00 to 23:55)
    const timeOptions: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) { // 5-minute intervals
            const hour = h.toString().padStart(2, '0');
            const min = m.toString().padStart(2, '0');
            timeOptions.push(`${hour}:${min}`);
        }
    }

    useEffect(() => {
        // Init state from event data if needed, or keep local defaults
        if (currentEvent.endowmentSessions) {
            setUnitEndowmentTime(currentEvent.endowmentSessions.unitAllocations || {});
        }
        // V301: Initialize Sealing allocations if they were added
        // Assuming we follows the same pattern as endowment/baptismSessions
        // Or if the user just wants to handle them via the generic sessions pattern
    }, [currentEvent]);

    const handleBatchSessionUpdate = (ordinance: OrdinanceItem, session: string, unitFilter?: string) => {
        batchUpdateSession(currentEvent.event_id, ordinance, session, unitFilter);
        onRefresh();
        setMsgType('success');
        setMsg(t('stake.temple.alerts.batchUpdateSessionSuccess', '已更新 {{unit}} {{ordinance}} 人員場次為 {{session}}', { 
            unit: unitFilter ? unitFilter : t('common.all', '所有'),
            ordinance: ordinance,
            session: session
        }));
    };

    const handleSessionUpdate = (regId: string, session: string) => {
        updateRegistrationField(regId, 'ceremony_session', session);
        onRefresh();
    };

    const handleExportTempleList = (type: 'Endowment' | 'Baptism' | 'Sealing') => {
        const targetItem = type === 'Endowment' ? OrdinanceItem.ENDOWMENT : (type === 'Baptism' ? OrdinanceItem.BAPTISM : OrdinanceItem.SEALING);
        const list = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === targetItem);
        
        // Sorting Logic: 
        // 1. Session (ceremony_session)
        // 2. Gender (identity_id's 2nd char: 1=Male, 2=Female)
        // 3. Name
        list.sort((a, b) => {
            // 1. Session
            const sessionA = a.ceremony_session || 'ZZZZ';
            const sessionB = b.ceremony_session || 'ZZZZ';
            if (sessionA !== sessionB) return sessionA.localeCompare(sessionB);

            // 2. Gender
            const genderA = getGenderFromId(a.identity_id) || '9';
            const genderB = getGenderFromId(b.identity_id) || '9';
            if (genderA !== genderB) return genderA.localeCompare(genderB);

            // 3. Name
            return a.name.localeCompare(b.name, 'zh-TW');
        });

        // New Export Logic: Output Session, Gender, Name
        let csv = `\uFEFF${t('common.col.session', '場次')},${t('common.col.gender', '性別')},${t('common.col.name', '姓名')}\n`; // Header
        list.forEach(r => {
            const genderStr = getGenderFromId(r.identity_id) === '1' ? t('common.gender.male_label', '弟兄') : t('common.gender.female_label', '姊妹');
            const sessionStr = r.ceremony_session || t('common.status.unassigned', '未指定');
            csv += `${sessionStr},${genderStr},${r.name}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const datePrefix = currentEvent.event_date.replace(/-/g, '_');
        
        // Requirement: 程式版本號_活動日期_恩道門名單.CVS
        // Using version 1.0.2 from package.json
        const appVersion = '1.0.2';
        const typeZh = type === 'Endowment' ? t('stake.temple.export.endowmentSuffix', '恩道門名單') : (type === 'Baptism' ? t('stake.temple.export.baptismSuffix', '洗禮名單') : t('stake.temple.export.sealingSuffix', '印證名單'));
        const filename = `${appVersion}_${datePrefix}_${typeZh}.csv`;
        
        a.download = filename;
        a.click();
    };

    // Helper: Count Genders
        const getGenderCounts = (list: Registration[]) => {
        let male = 0;
        let female = 0;
        list.forEach(r => {
            if (getGenderFromId(r.identity_id) === '1') male++;
            else if (getGenderFromId(r.identity_id) === '2') female++;
        });
        return { male, female };
    };

    const handleSort = (type: 'endowment'|'baptism'|'sealing', key: string) => {
        const currentSort = type === 'endowment' ? endowmentSort : (type === 'baptism' ? baptismSort : sealingSort);
        const setSort = type === 'endowment' ? setEndowmentSort : (type === 'baptism' ? setBaptismSort : setSealingSort);
        
        if (currentSort.key === key) {
            setSort({ key, dir: currentSort.dir === 'asc' ? 'desc' : 'asc' });
        } else {
            setSort({ key, dir: 'asc' });
        }
    };

    const renderSortIcon = (type: 'endowment'|'baptism'|'sealing', key: string) => {
        const currentSort = type === 'endowment' ? endowmentSort : (type === 'baptism' ? baptismSort : sealingSort);
        if (currentSort.key !== key) return null;
        return currentSort.dir === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
    };

    const renderTempleListTable = (targetItem: OrdinanceItem, slots: string[], sortState: { key: string, dir: 'asc'|'desc' }, onHeaderClick: (key: string) => void, typeName: 'endowment'|'baptism'|'sealing') => {
        const list = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === targetItem);
        
        // Sorting Logic
        list.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortState.key === 'unit') {
                valA = settings.units.indexOf(a.unit);
                valB = settings.units.indexOf(b.unit);
                // If unit not in list, put at end
                if (valA === -1) valA = 999;
                if (valB === -1) valB = 999;
            } else if (sortState.key === 'name') {
                valA = a.name;
                valB = b.name;
            } else if (sortState.key === 'gender') {
                valA = getGenderFromId(a.identity_id);
                valB = getGenderFromId(b.identity_id);
            } else if (sortState.key === 'session') {
                valA = a.ceremony_session || '';
                valB = b.ceremony_session || '';
            } else if (sortState.key === 'serial_number') {
                valA = typeName === 'endowment' ? (a.endowment_serial_number || 999999) : (typeName === 'baptism' ? (a.baptism_serial_number || 999999) : (a.sealing_serial_number || 999999));
                valB = typeName === 'endowment' ? (b.endowment_serial_number || 999999) : (typeName === 'baptism' ? (b.baptism_serial_number || 999999) : (b.sealing_serial_number || 999999));
            } else if (sortState.key === 'booking') {
                const checkBookingStatus = (reg: Registration) => {
                     let status = '';
                     if (typeName === 'endowment') {
                         const cap = currentEvent.endowment_capacity || 0;
                         const rank = endowmentRanks.get(reg.reg_id) || 999999;
                         if (cap === 0) status = 'C'; 
                         else if (rank <= cap) status = 'A'; 
                         else status = 'B'; 
                     } else if (typeName === 'baptism') {
                         const cap = currentEvent.baptism_capacity || 0;
                         const rank = baptismRanks.get(reg.reg_id) || 999999;
                         if (cap === 0) status = 'C'; 
                         else if (rank <= cap) status = 'A'; 
                         else status = 'B'; 
                     } else if (typeName === 'sealing') {
                         const cap = currentEvent.sealing_capacity || 0;
                         const rank = sealingRanks.get(reg.reg_id) || 999999;
                         if (cap === 0) status = 'C'; 
                         else if (rank <= cap) status = 'A'; 
                         else status = 'B'; 
                     }
                     return status;
                };
                valA = checkBookingStatus(a);
                valB = checkBookingStatus(b);
            }

            if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <div className="overflow-x-auto max-h-60 md:max-h-full overflow-y-auto">
                <table className="w-full text-xs text-left table-fixed">
                    <thead className="bg-white border-b sticky top-0 z-20">
                        <tr>
                            <th className="p-2 w-10 text-gray-700 bg-white">#</th>
                            <th className="p-2 w-24 text-gray-700 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('unit')}>{t('common.col.unit', '單位')} {renderSortIcon(typeName, 'unit')}</th>
                            <th className="p-2 w-20 text-gray-700 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('serial_number')}>{t('common.col.serialNumber', '編號')} {renderSortIcon(typeName, 'serial_number')}</th>
                            <th className="p-2 w-32 text-gray-700 sticky left-0 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.1)] z-30 cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('name')}>{t('common.col.name', '姓名')} {renderSortIcon(typeName, 'name')}</th>
                            <th className="p-2 w-20 text-gray-700 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('gender')}>{t('common.col.gender', '性別')} {renderSortIcon(typeName, 'gender')}</th>
                            <th className="p-2 w-20 text-gray-700 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('booking')}>{t('common.col.reservation', '預約')} {renderSortIcon(typeName, 'booking')}</th>
                            <th className="p-2 w-32 text-gray-700 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onHeaderClick('session')}>{t('common.col.session', '場次')} {renderSortIcon(typeName, 'session')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {list.map((r, idx) => {
                            const gender = getGenderFromId(r.identity_id) === '1' ? t('common.gender.male_label', '弟兄') : t('common.gender.female_label', '姊妹');
                            let bookingStatus = '';
                            let bookingColor = '';
                            if (typeName === 'endowment') {
                                const cap = currentEvent.endowment_capacity || 0;
                                const rank = endowmentRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位設定'); bookingColor = 'text-gray-400'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); bookingColor = 'text-green-600 bg-green-100 px-1 rounded'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); bookingColor = 'text-orange-600 bg-orange-100 px-1 rounded'; }
                            } else if (typeName === 'baptism') {
                                const cap = currentEvent.baptism_capacity || 0;
                                const rank = baptismRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位設定'); bookingColor = 'text-gray-400'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); bookingColor = 'text-green-600 bg-green-100 px-1 rounded'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); bookingColor = 'text-orange-600 bg-orange-100 px-1 rounded'; }
                            } else if (typeName === 'sealing') {
                                const cap = currentEvent.sealing_capacity || 0;
                                const rank = sealingRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位設定'); bookingColor = 'text-gray-400'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); bookingColor = 'text-green-600 bg-green-100 px-1 rounded'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); bookingColor = 'text-orange-600 bg-orange-100 px-1 rounded'; }
                            }
                            
                            return (
                                <tr key={r.reg_id} className="hover:bg-purple-50">
                                    <td className="p-2 text-gray-500">{idx + 1}</td>
                                    <td className="p-2 text-gray-800">{r.unit}</td>
                                    <td className="p-2 font-mono font-bold text-gray-800 bg-white">
                                        {typeName === 'endowment' 
                                            ? (r.endowment_serial_number || '-') 
                                            : (typeName === 'baptism' ? (r.baptism_serial_number || '-') : (r.sealing_serial_number || '-'))}
                                    </td>
                                    <td className="p-2 font-bold text-gray-800 sticky left-0 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.1)] z-10 group-hover:bg-purple-50">{r.name}</td>
                                    <td className="p-2 text-gray-600">{gender}</td>
                                    <td className="p-2 text-xs font-bold"><span className={bookingColor}>{bookingStatus}</span></td>
                                    <td className="p-2">
                                        <select 
                                            value={r.ceremony_session || ''}
                                            onChange={e => handleSessionUpdate(r.reg_id, e.target.value)}
                                            className="border rounded p-1 text-[10px] text-gray-800 bg-white"
                                        >
                                            <option value="">{t('common.status.unassigned', '未指定')}</option>
                                            {slots.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {list.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">{t('common.status.noData', '尚無資料')}</td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    // List Filtering for Counts
    const endowmentList = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === OrdinanceItem.ENDOWMENT);
    const baptismList = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === OrdinanceItem.BAPTISM);
    
    const endCount = getGenderCounts(endowmentList);
    const bapCount = getGenderCounts(baptismList);

    // Helper component for session settings
    const OrdinanceSettingsTable = ({ 
        title, 
        settings: sessionSettings, 
        ordinance, 
        currentRegs,
        onUpdate 
    }: { 
        title: string, 
        settings: OrdinanceSessionItem[], 
        ordinance: OrdinanceItem,
        currentRegs: Registration[],
        onUpdate: (newSettings: OrdinanceSessionItem[]) => void 
    }) => {
        const data = sessionSettings && sessionSettings.length > 0 ? sessionSettings : [
            { name: t('common.label.sessionN', '場次 {{n}}', { n: 1 }), time: '', capacity: 0 },
            { name: t('common.label.sessionN', '場次 {{n}}', { n: 2 }), time: '', capacity: 0 },
            { name: t('common.label.sessionN', '場次 {{n}}', { n: 3 }), time: '', capacity: 0 },
        ];

        const handleRowChange = (idx: number, field: keyof OrdinanceSessionItem, value: any) => {
            const newList = [...data];
            newList[idx] = { ...newList[idx], [field]: value };
            onUpdate(newList);
        };

        const totalCapacity = data.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0);
        
        // Calculate assigned count from registrations
        const getAssignedCount = (time: string) => {
            if (!time) return 0;
            return currentRegs.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === ordinance && r.ceremony_session === time).length;
        };

        const totalAssigned = data.reduce((sum, s) => sum + getAssignedCount(s.time), 0);

        return (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
                <h4 className="font-bold text-gray-800 text-sm mb-3 text-center">{title}</h4>
                <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-1 border text-center">{t('common.col.session', '場次')}</th>
                            <th className="p-1 border text-center">{t('common.col.time', '時間')}</th>
                            <th className="p-1 border text-center">{t('common.col.seats', '座位')}</th>
                            <th className="p-1 border text-center">{t('common.col.assigned', '指定')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx} className="border-b">
                                <td className="p-1 border">
                                    <input 
                                        type="text" 
                                        className="w-full p-0.5 border-0 text-center focus:ring-0" 
                                        value={row.name} 
                                        onChange={e => handleRowChange(idx, 'name', e.target.value)}
                                    />
                                </td>
                                <td className="p-1 border">
                                    <select 
                                        className="w-full p-0.5 border-0 text-center focus:ring-0 bg-transparent"
                                        value={row.time}
                                        onChange={e => handleRowChange(idx, 'time', e.target.value)}
                                    >
                                        <option value="">-</option>
                                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </td>
                                <td className="p-1 border text-center">
                                    <input 
                                        type="number" 
                                        className="w-10 p-0.5 border-0 text-center focus:ring-0 bg-transparent font-bold" 
                                        value={row.capacity || ''} 
                                        onChange={e => handleRowChange(idx, 'capacity', parseInt(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-1 border text-center font-bold text-blue-600">
                                    {getAssignedCount(row.time)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                            <td colSpan={2} className="p-1 border text-right">{t('common.label.total', '合計')}:</td>
                            <td className="p-1 border text-center">{totalCapacity}</td>
                            <td className="p-1 border text-center text-blue-700">{totalAssigned}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const { vehicleStats, ordinanceStats } = useStats(currentEvent, registrations);
    const { endowmentRanks, baptismRanks, sealingRanks } = useRanks(registrations);

    // Calculate unit-specific ordinance counts for assigned people
    const unitStats = useMemo(() => {
        const stats: Record<string, { end: number, bap: number, seal: number, endWait: number, bapWait: number, sealWait: number }> = {};
        settings.units.forEach(u => stats[u] = { end: 0, bap: 0, seal: 0, endWait: 0, bapWait: 0, sealWait: 0 });
        
        registrations.forEach(r => {
            if (r.status === RegStatus.NORMAL) {
                if (r.ordinance_item === OrdinanceItem.ENDOWMENT) {
                    if (stats[r.unit]) stats[r.unit].end++;
                } else if (r.ordinance_item === OrdinanceItem.BAPTISM) {
                    if (stats[r.unit]) stats[r.unit].bap++;
                } else if (r.ordinance_item === OrdinanceItem.SEALING) {
                    if (stats[r.unit]) stats[r.unit].seal++;
                }
            } else if (r.status === RegStatus.WAITING) {
                if (r.ordinance_item === OrdinanceItem.ENDOWMENT) {
                    if (stats[r.unit]) stats[r.unit].endWait++;
                } else if (r.ordinance_item === OrdinanceItem.BAPTISM) {
                    if (stats[r.unit]) stats[r.unit].bapWait++;
                } else if (r.ordinance_item === OrdinanceItem.SEALING) {
                    if (stats[r.unit]) stats[r.unit].sealWait++;
                }
            }
        });
        return stats;
    }, [registrations, settings.units]);

    // Update settings wrappers
    const updateEndowmentSettings = async (newSettings: OrdinanceSessionItem[]) => {
        const capacity = newSettings.reduce((sum, s) => sum + s.capacity, 0);
        const updated = { ...currentEvent, endowmentSettingsV2: newSettings, endowment_capacity: capacity };
        await updateEvent(updated);
        onUpdateEvent(updated);
    };

    const updateBaptismSettings = async (newSettings: OrdinanceSessionItem[]) => {
        const capacity = newSettings.reduce((sum, s) => sum + s.capacity, 0);
        const updated = { ...currentEvent, baptismSettingsV2: newSettings, baptism_capacity: capacity };
        await updateEvent(updated);
        onUpdateEvent(updated);
    };

    const updateSealingSettings = async (newSettings: OrdinanceSessionItem[]) => {
        const capacity = newSettings.reduce((sum, s) => sum + s.capacity, 0);
        const updated = { ...currentEvent, sealingSettingsV2: newSettings, sealing_capacity: capacity };
        await updateEvent(updated);
        onUpdateEvent(updated);
    };

    return (
        <div className="space-y-12">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <div className="bg-fuchsia-50/50 p-8 rounded-3xl border-2 border-fuchsia-100 shadow-inner">
                <RegistrationDashboard 
                    activeEvent={currentEvent}
                    eventStats={vehicleStats}
                    ordinanceStats={ordinanceStats}
                    deadlineDisplay={currentEvent.registrationDeadline ? new Date(currentEvent.registrationDeadline).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('common.status.notSet', '未設定')}
                    isClosed={currentEvent.status === 'cancelled' || currentEvent.is_registration_open === false}
                    lang={i18n.language.startsWith('zh') ? 'zh' : 'en'}
                    onAssignOrdinanceSerials={handleAssignSerials}
                />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <OrdinanceSettingsTable 
                    title={t('stake.temple.title.endowmentSettings', '恩道門教儀座位設定')}
                    settings={currentEvent.endowmentSettingsV2 || []} 
                    ordinance={OrdinanceItem.ENDOWMENT}
                    currentRegs={registrations}
                    onUpdate={updateEndowmentSettings}
                />
                <OrdinanceSettingsTable 
                    title={t('stake.temple.title.baptismSettings', '洗禮教儀座位設定')}
                    settings={currentEvent.baptismSettingsV2 || []} 
                    ordinance={OrdinanceItem.BAPTISM}
                    currentRegs={registrations}
                    onUpdate={updateBaptismSettings}
                />
                <OrdinanceSettingsTable 
                    title={t('stake.temple.title.sealingSettings', '印證教儀座位設定')}
                    settings={currentEvent.sealingSettingsV2 || []} 
                    ordinance={OrdinanceItem.SEALING}
                    currentRegs={registrations}
                    onUpdate={updateSealingSettings}
                />
            </div>

            {/* Endowment Assignment */}
            <div className="bg-fuchsia-50 p-8 rounded-3xl border-2 border-fuchsia-200 shadow-sm">
                <div className="flex flex-col mb-8 border-b-2 border-fuchsia-100 pb-6">
                    <h4 className="font-black text-fuchsia-900 text-2xl flex items-center mb-4">
                        <Clock className="w-8 h-8 mr-3 text-fuchsia-600" /> {t('stake.temple.title.endowmentAssignment', '恩道門 (Endowment) 場次指派')}
                    </h4>
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="bg-white p-4 rounded-2xl border-2 border-fuchsia-100 flex items-center gap-4 shadow-sm">
                            <span className="text-sm font-black text-fuchsia-700">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                            <TimeSelect value={globalEndowmentTime} onChange={setGlobalEndowmentTime} options={endowmentSlots} placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')} />
                            <button 
                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.ENDOWMENT, globalEndowmentTime)}
                                className="bg-fuchsia-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-fuchsia-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                {t('stake.temple.button.applyToAll', '全體適用')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {settings.units.map(unit => (
                        <div key={unit} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border-2 border-fuchsia-100 shadow-sm group hover:border-fuchsia-300 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-black text-fuchsia-900">{unit}</span>
                                <span className="bg-fuchsia-100 text-fuchsia-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-fuchsia-200">
                                    {unitStats[unit]?.end || 0} {t('common.label.people', '人')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <TimeSelect 
                                        value={unitEndowmentTime[unit] || ''}
                                        onChange={v => setUnitEndowmentTime({...unitEndowmentTime, [unit]: v})}
                                        options={endowmentSlots}
                                        placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')}
                                    />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.ENDOWMENT, unitEndowmentTime[unit], unit)}
                                    className="bg-fuchsia-100 text-fuchsia-700 p-2.5 rounded-xl text-[10px] font-black border-2 border-fuchsia-200 hover:bg-fuchsia-600 hover:text-white transition-all disabled:opacity-30"
                                    disabled={!unitEndowmentTime[unit]}
                                >
                                    {t('common.button.assign', '指定')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Baptism Assignment */}
            <div className="bg-indigo-50 p-8 rounded-3xl border-2 border-indigo-200 shadow-sm">
                <div className="flex flex-col mb-8 border-b-2 border-indigo-100 pb-6">
                    <h4 className="font-black text-indigo-900 text-2xl flex items-center mb-4">
                        <Clock className="w-8 h-8 mr-3 text-indigo-600" /> {t('stake.temple.title.baptismAssignment', '洗禮 (Baptism) 場次指派')}
                    </h4>
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 flex items-center gap-4 shadow-sm">
                            <span className="text-sm font-black text-indigo-700">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                            <TimeSelect value={globalBaptismTime} onChange={setGlobalBaptismTime} options={baptismSlots} placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')} />
                            <button 
                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.BAPTISM, globalBaptismTime)}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                {t('stake.temple.button.applyToAll', '全體適用')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {settings.units.map(unit => (
                        <div key={unit} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-black text-indigo-900">{unit}</span>
                                <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-indigo-200">
                                    {unitStats[unit]?.bap || 0} {t('common.label.people', '人')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <TimeSelect 
                                        value={unitBaptismTime[unit] || ''}
                                        onChange={v => setUnitBaptismTime({...unitBaptismTime, [unit]: v})}
                                        options={baptismSlots}
                                        placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')}
                                    />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.BAPTISM, unitBaptismTime[unit], unit)}
                                    className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl text-[10px] font-black border-2 border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30"
                                    disabled={!unitBaptismTime[unit]}
                                >
                                    {t('common.button.assign', '指定')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sealing Assignment */}
            <div className="bg-teal-50 p-8 rounded-3xl border-2 border-teal-200 shadow-sm">
                <div className="flex flex-col mb-8 border-b-2 border-teal-100 pb-6">
                    <h4 className="font-black text-teal-900 text-2xl flex items-center mb-4">
                        <Clock className="w-8 h-8 mr-3 text-teal-600" /> {t('stake.temple.title.sealingAssignment', '印證 (Sealing) 場次指派')}
                    </h4>
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="bg-white p-4 rounded-2xl border-2 border-teal-100 flex items-center gap-4 shadow-sm">
                            <span className="text-sm font-black text-teal-700">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                            <TimeSelect value={globalSealingTime} onChange={setGlobalSealingTime} options={sealingSlots} placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')} />
                            <button 
                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.SEALING, globalSealingTime)}
                                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-teal-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                {t('stake.temple.button.applyToAll', '全體適用')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {settings.units.map(unit => (
                        <div key={unit} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border-2 border-teal-100 shadow-sm group hover:border-teal-300 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-black text-teal-900">{unit}</span>
                                <span className="bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-teal-200">
                                    {unitStats[unit]?.seal || 0} {t('common.label.people', '人')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <TimeSelect 
                                        value={unitSealingTime[unit] || ''}
                                        onChange={v => setUnitSealingTime({...unitSealingTime, [unit]: v})}
                                        options={sealingSlots}
                                        placeholder={t('stake.temple.placeholder.selectTime', '選擇時間')}
                                    />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.SEALING, unitSealingTime[unit], unit)}
                                    className="bg-teal-100 text-teal-700 p-2.5 rounded-xl text-[10px] font-black border-2 border-teal-200 hover:bg-teal-600 hover:text-white transition-all disabled:opacity-30"
                                    disabled={!unitSealingTime[unit]}
                                >
                                    {t('common.button.assign', '指定')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* List Header Row */}
            <div className="flex flex-col border-b-4 border-fuchsia-100 pb-6 mb-8">
                <h3 className="text-3xl font-black flex items-center text-fuchsia-900">
                    <BookOpen className="w-10 h-10 mr-4 text-fuchsia-600" /> {t('stake.temple.title.ordinanceManagement', '教儀名單座次管理')}
                </h3>
                <p className="text-sm font-bold text-fuchsia-400 mt-2 uppercase tracking-widest flex items-center">
                    <Zap className="w-4 h-4 mr-2" /> {t('stake.temple.subtitle.realtimeAdjustment', '表格內可即時調整場次並連動更新雲端資料')}
                </p>
            </div>
            
            {/* Endowment List */}
            <div className="bg-white rounded-[2.5rem] border-4 border-fuchsia-50 overflow-hidden shadow-sm">
                <div className="p-8 bg-fuchsia-50/50 border-b-2 border-fuchsia-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="font-black text-fuchsia-900 flex items-center text-2xl">
                        <button onClick={() => setIsEndowmentExpanded(!isEndowmentExpanded)} className="mr-4 p-2 bg-white hover:bg-fuchsia-100 rounded-xl shadow-sm transition-all text-fuchsia-600">
                            {isEndowmentExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </button>
                        {t('stake.temple.list.endowmentTitle', '恩道門 (Endowment) 名單')}
                        <span className="ml-4 bg-fuchsia-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-sm">
                            {endowmentList.length} {t('common.label.people', '人')}
                        </span>
                        <div className="hidden lg:flex ml-4 gap-2">
                             <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-fuchsia-600 border border-fuchsia-200">{t('common.gender.male_label', '弟兄')}: {endCount.male}</span>
                             <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-fuchsia-600 border border-fuchsia-200">{t('common.gender.female_label', '姊妹')}: {endCount.female}</span>
                        </div>
                    </div>
                    <button onClick={() => handleExportTempleList('Endowment')} className="w-full md:w-auto bg-white text-fuchsia-700 px-8 py-3.5 rounded-2xl border-2 border-fuchsia-200 text-sm font-black hover:bg-fuchsia-600 hover:text-white hover:border-fuchsia-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] flex items-center justify-center">
                        <Download className="w-5 h-5 mr-3" /> {t('common.button.export', '匯出名冊')}
                    </button>
                </div>
                {isEndowmentExpanded && renderTempleListTable(OrdinanceItem.ENDOWMENT, endowmentSlots, endowmentSort, (key) => handleSort('endowment', key), 'endowment')}
            </div>

            {/* Baptism List */}
            <div className="bg-white rounded-[2.5rem] border-4 border-indigo-50 overflow-hidden shadow-sm">
                <div className="p-8 bg-indigo-50/50 border-b-2 border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="font-black text-indigo-900 flex items-center text-2xl">
                         <button onClick={() => setIsBaptismExpanded(!isBaptismExpanded)} className="mr-4 p-2 bg-white hover:bg-indigo-100 rounded-xl shadow-sm transition-all text-indigo-600">
                            {isBaptismExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </button>
                        {t('stake.temple.list.baptismTitle', '洗禮 (Baptism) 名單')}
                        <span className="ml-4 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-sm">
                            {baptismList.length} {t('common.label.people', '人')}
                        </span>
                        <div className="hidden lg:flex ml-4 gap-2">
                             <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-indigo-600 border border-indigo-200">{t('common.gender.male_label', '弟兄')}: {bapCount.male}</span>
                             <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-indigo-600 border border-indigo-200">{t('common.gender.female_label', '姊妹')}: {bapCount.female}</span>
                        </div>
                    </div>
                    <button onClick={() => handleExportTempleList('Baptism')} className="w-full md:w-auto bg-white text-indigo-700 px-8 py-3.5 rounded-2xl border-2 border-indigo-200 text-sm font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] flex items-center justify-center">
                        <Download className="w-5 h-5 mr-3" /> {t('common.button.export', '匯出名冊')}
                    </button>
                </div>
                {isBaptismExpanded && renderTempleListTable(OrdinanceItem.BAPTISM, baptismSlots, baptismSort, (key) => handleSort('baptism', key), 'baptism')}
            </div>

            {/* Sealing List */}
            <div className="bg-white rounded-[2.5rem] border-4 border-teal-50 overflow-hidden shadow-sm">
                <div className="p-8 bg-teal-50/50 border-b-2 border-teal-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="font-black text-teal-900 flex items-center text-2xl">
                        <button onClick={() => setIsSealingExpanded(!isSealingExpanded)} className="mr-4 p-2 bg-white hover:bg-teal-100 rounded-xl shadow-sm transition-all text-teal-600">
                            {isSealingExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </button>
                        {t('stake.temple.list.sealingTitle', '印證 (Sealing) 名單')}
                        {(() => {
                            const sealList = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === OrdinanceItem.SEALING);
                            const sealCounts = getGenderCounts(sealList);
                            return (
                                <>
                                    <span className="ml-4 bg-teal-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-sm">
                                        {sealList.length} {t('common.label.people', '人')}
                                    </span>
                                    <div className="hidden lg:flex ml-4 gap-2">
                                        <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-teal-600 border border-teal-200">{t('common.gender.male_label', '弟兄')}: {sealCounts.male}</span>
                                        <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-teal-600 border border-teal-200">{t('common.gender.female_label', '姊妹')}: {sealCounts.female}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    <button onClick={() => handleExportTempleList('Sealing')} className="w-full md:w-auto bg-white text-teal-700 px-8 py-3.5 rounded-2xl border-2 border-teal-200 text-sm font-black hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] flex items-center justify-center">
                        <Download className="w-5 h-5 mr-3" /> {t('common.button.export', '匯出名冊')}
                    </button>
                </div>
                {isSealingExpanded && renderTempleListTable(OrdinanceItem.SEALING, sealingSlots, sealingSort, (key) => handleSort('sealing', key), 'sealing')}
            </div>
        </div>
    );
};

// Helper component for time select
const TimeSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: string[], placeholder?: string }) => {
    const { t } = useTranslation();
    return (
        <select 
            className="border rounded-lg p-1 text-xs w-24 bg-white text-gray-800"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            <option value="">{placeholder || t('common.placeholder.select_time', '選擇時間')}</option>
            {options.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
    );
};

export default TempleTab;
