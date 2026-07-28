
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
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

// Rainbow sequence themes for unit sections (Light bg + Dark text & borders)
const rainbowThemes = [
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hover: 'hover:bg-red-200', accent: 'bg-red-50' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hover: 'hover:bg-orange-200', accent: 'bg-orange-50' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hover: 'hover:bg-amber-200', accent: 'bg-amber-50' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hover: 'hover:bg-emerald-200', accent: 'bg-emerald-50' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hover: 'hover:bg-blue-200', accent: 'bg-blue-50' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', hover: 'hover:bg-indigo-200', accent: 'bg-indigo-50' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hover: 'hover:bg-purple-200', accent: 'bg-purple-50' },
];

const TempleTab: React.FC<TempleTabProps> = ({ currentEvent, registrations, settings, onRefresh, onUpdateEvent }) => {
    const { t, tString, currentLang: langCode } = useI18n();
    const i18n = { language: langCode }; // Mock i18n object for compatibility
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
                valA = (settings.units || []).indexOf(a.unit);
                valB = (settings.units || []).indexOf(b.unit);
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
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-white/80 border-b border-slate-200 sticky top-0 z-20">
                        <tr className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                            <th className="p-3 w-10">#</th>
                            <th className="p-3 w-24 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('unit')}>{t('common.col.unit', '單位')} {renderSortIcon(typeName, 'unit')}</th>
                            <th className="p-3 w-20 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('serial_number')}>{t('common.col.serialNumber', '編號')} {renderSortIcon(typeName, 'serial_number')}</th>
                            <th className="p-3 w-32 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('name')}>{t('common.col.name', '姓名')} {renderSortIcon(typeName, 'name')}</th>
                            <th className="p-3 w-20 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('gender')}>{t('common.col.gender', '性別')} {renderSortIcon(typeName, 'gender')}</th>
                            <th className="p-3 w-24 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('booking')}>{t('common.col.reservation', '預約')} {renderSortIcon(typeName, 'booking')}</th>
                            <th className="p-3 w-32 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => onHeaderClick('session')}>{t('common.col.session', '場次')} {renderSortIcon(typeName, 'session')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/60">
                        {list.map((r, idx) => {
                            const gender = getGenderFromId(r.identity_id) === '1' ? t('common.gender.male_label', '弟兄') : t('common.gender.female_label', '姊妹');
                            let bookingStatus = '';
                            let badgeClass = '';
                            if (typeName === 'endowment') {
                                const cap = currentEvent.endowment_capacity || 0;
                                const rank = endowmentRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位'); badgeClass = 'bg-slate-50 text-slate-400 border-slate-200'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); badgeClass = 'bg-amber-50 text-amber-700 border-amber-100'; }
                            } else if (typeName === 'baptism') {
                                const cap = currentEvent.baptism_capacity || 0;
                                const rank = baptismRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位'); badgeClass = 'bg-slate-50 text-slate-400 border-slate-200'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); badgeClass = 'bg-amber-50 text-amber-700 border-amber-100'; }
                            } else if (typeName === 'sealing') {
                                const cap = currentEvent.sealing_capacity || 0;
                                const rank = sealingRanks.get(r.reg_id) || 999999;
                                if (cap === 0) { bookingStatus = t('stake.temple.status.noSeatConfig', '無座位'); badgeClass = 'bg-slate-50 text-slate-400 border-slate-200'; }
                                else if (rank <= cap) { bookingStatus = t('common.status.success', '成功'); badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'; }
                                else { bookingStatus = t('common.status.waiting', '候補'); badgeClass = 'bg-amber-50 text-amber-700 border-amber-100'; }
                            }
                            
                            return (
                                <tr key={r.reg_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-slate-400">{idx + 1}</td>
                                    <td className="p-3 text-slate-600">{r.unit}</td>
                                    <td className="p-3 font-mono font-bold text-slate-900">
                                        {typeName === 'endowment' 
                                            ? (r.endowment_serial_number || '-') 
                                            : (typeName === 'baptism' ? (r.baptism_serial_number || '-') : (r.sealing_serial_number || '-'))}
                                    </td>
                                    <td className="p-3 font-bold text-slate-900">{r.name}</td>
                                    <td className="p-3 text-slate-600">{gender}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                            {bookingStatus}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <select 
                                            value={r.ceremony_session || ''}
                                            onChange={e => handleSessionUpdate(r.reg_id, e.target.value)}
                                            className="w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white"
                                        >
                                            <option value="">{tString('common.status.unassigned', '未指定')}</option>
                                            {slots.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                                    {t('common.status.noData', '尚無資料')}
                                </td>
                            </tr>
                        )}
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
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex-1">
                <h4 className="font-bold text-slate-800 text-sm mb-4 text-center">{title}</h4>
                <div className="overflow-hidden rounded border border-slate-200">
                    <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-2 border-r border-slate-200 text-center text-slate-500 font-bold uppercase tracking-wider">{t('common.col.session', '場次')}</th>
                                <th className="p-2 border-r border-slate-200 text-center text-slate-500 font-bold uppercase tracking-wider">{t('common.col.time', '時間')}</th>
                                <th className="p-2 border-r border-slate-200 text-center text-slate-500 font-bold uppercase tracking-wider">{t('common.col.seats', '座位')}</th>
                                <th className="p-2 text-center text-slate-500 font-bold uppercase tracking-wider">{t('common.col.assigned', '指定')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-2 border-r border-slate-200">
                                        <input 
                                            type="text" 
                                            className="w-full p-0.5 border-0 text-center focus:ring-0 bg-transparent text-slate-700 font-medium" 
                                            value={row.name} 
                                            onChange={e => handleRowChange(idx, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 border-r border-slate-200">
                                        <select 
                                            className="w-full p-0.5 border-0 text-center focus:ring-0 bg-transparent text-slate-700"
                                            value={row.time}
                                            onChange={e => handleRowChange(idx, 'time', e.target.value)}
                                        >
                                            <option value="">-</option>
                                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-center">
                                        <input 
                                            type="number" 
                                            className="w-10 p-0.5 border-0 text-center focus:ring-0 bg-transparent font-bold text-slate-900" 
                                            value={row.capacity || ''} 
                                            onChange={e => handleRowChange(idx, 'capacity', parseInt(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="p-2 text-center font-bold text-sky-600">
                                        {getAssignedCount(row.time)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                                <td colSpan={2} className="p-2 text-right border-r border-slate-200 text-slate-500">{t('common.label.total', '合計')}:</td>
                                <td className="p-2 text-center border-r border-slate-200">{totalCapacity}</td>
                                <td className="p-2 text-center text-sky-700">{totalAssigned}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const { vehicleStats, ordinanceStats } = useStats(currentEvent, registrations);
    const { endowmentRanks, baptismRanks, sealingRanks } = useRanks(registrations);

    // Calculate unit-specific ordinance counts for assigned people
    const unitStats = useMemo(() => {
        const stats: Record<string, { end: number, bap: number, seal: number, endWait: number, bapWait: number, sealWait: number }> = {};
        (settings.units || []).forEach(u => stats[u] = { end: 0, bap: 0, seal: 0, endWait: 0, bapWait: 0, sealWait: 0 });
        
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
    }, [registrations, (settings.units || [])]);

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
        <div className="space-y-8">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <div className="bg-slate-50 p-6 rounded border border-slate-200 shadow-sm">
                <RegistrationDashboard 
                    activeEvent={currentEvent}
                    eventStats={vehicleStats}
                    ordinanceStats={ordinanceStats}
                    deadlineDisplay={currentEvent.registrationDeadline ? new Date(currentEvent.registrationDeadline).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('common.status.notSet', '未設定')}
                    isClosed={currentEvent.status === 'cancelled' || currentEvent.is_registration_open === false}
                    lang={langCode.startsWith('zh') ? 'zh' : 'en'}
                    onAssignOrdinanceSerials={handleAssignSerials}
                    hideSealing={true}
                />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <OrdinanceSettingsTable 
                    title={tString('stake.temple.title.endowmentSettings', '恩道門教儀座位設定')}
                    settings={currentEvent.endowmentSettingsV2 || []} 
                    ordinance={OrdinanceItem.ENDOWMENT}
                    currentRegs={registrations}
                    onUpdate={updateEndowmentSettings}
                />
                <OrdinanceSettingsTable 
                    title={tString('stake.temple.title.baptismSettings', '洗禮教儀座位設定')}
                    settings={currentEvent.baptismSettingsV2 || []} 
                    ordinance={OrdinanceItem.BAPTISM}
                    currentRegs={registrations}
                    onUpdate={updateBaptismSettings}
                />
                <OrdinanceSettingsTable 
                    title={tString('stake.temple.title.sealingSettings', '印證教儀座位設定')}
                    settings={currentEvent.sealingSettingsV2 || []} 
                    ordinance={OrdinanceItem.SEALING}
                    currentRegs={registrations}
                    onUpdate={updateSealingSettings}
                />
            </div>

            {/* Endowment Assignment */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsEndowmentExpanded(!isEndowmentExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <Clock className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.title.endowmentAssignment', '恩道門 (Endowment) 場次指派')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isEndowmentExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isEndowmentExpanded && (
                    <div className="p-6 bg-slate-50/40 space-y-6">
                        <div className="flex flex-wrap justify-end gap-3 w-full">
                            <div className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                                <div className="w-32">
                                    <TimeSelect value={globalEndowmentTime} onChange={setGlobalEndowmentTime} options={endowmentSlots} placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')} />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.ENDOWMENT, globalEndowmentTime)}
                                    className="bg-blue-600 text-white px-5 h-10 rounded text-sm font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                >
                                    {t('stake.temple.button.applyToAll', '全體適用')}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {(settings.units || []).map((unit, idx) => {
                                const theme = rainbowThemes[idx % 7];
                                return (
                                    <div key={unit} className={`flex flex-col gap-3 p-4 rounded border shadow-sm transition-all group ${theme.bg} ${theme.border}`}>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-bold ${theme.text}`}>{unit}</span>
                                            <span className={`bg-white/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${theme.text} ${theme.border}`}>
                                                {unitStats[unit]?.end || 0} {t('common.label.people', '人')}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <TimeSelect 
                                                    value={unitEndowmentTime[unit] || ''}
                                                    onChange={v => setUnitEndowmentTime({...unitEndowmentTime, [unit]: v})}
                                                    options={endowmentSlots}
                                                    placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.ENDOWMENT, unitEndowmentTime[unit], unit)}
                                                className={`bg-white/80 px-4 h-10 rounded text-xs font-bold border shadow-sm transition-all active:scale-95 disabled:opacity-30 ${theme.text} ${theme.border} ${theme.hover}`}
                                                disabled={!unitEndowmentTime[unit]}
                                            >
                                                {t('common.button.assign', '指定')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Baptism Assignment */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsBaptismExpanded(!isBaptismExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <Clock className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.title.baptismAssignment', '洗禮 (Baptism) 場次指派')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isBaptismExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isBaptismExpanded && (
                    <div className="p-6 bg-slate-50/40 space-y-6">
                        <div className="flex flex-wrap justify-end gap-3 w-full">
                            <div className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                                <div className="w-32">
                                    <TimeSelect value={globalBaptismTime} onChange={setGlobalBaptismTime} options={baptismSlots} placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')} />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.BAPTISM, globalBaptismTime)}
                                    className="bg-blue-600 text-white px-5 h-10 rounded text-sm font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                >
                                    {t('stake.temple.button.applyToAll', '全體適用')}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {(settings.units || []).map((unit, idx) => {
                                const theme = rainbowThemes[idx % 7];
                                return (
                                    <div key={unit} className={`flex flex-col gap-3 p-4 rounded border shadow-sm transition-all group ${theme.bg} ${theme.border}`}>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-bold ${theme.text}`}>{unit}</span>
                                            <span className={`bg-white/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${theme.text} ${theme.border}`}>
                                                {unitStats[unit]?.bap || 0} {t('common.label.people', '人')}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <TimeSelect 
                                                    value={unitBaptismTime[unit] || ''}
                                                    onChange={v => setUnitBaptismTime({...unitBaptismTime, [unit]: v})}
                                                    options={baptismSlots}
                                                    placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.BAPTISM, unitBaptismTime[unit], unit)}
                                                className={`bg-white/80 px-4 h-10 rounded text-xs font-bold border shadow-sm transition-all active:scale-95 disabled:opacity-30 ${theme.text} ${theme.border} ${theme.hover}`}
                                                disabled={!unitBaptismTime[unit]}
                                            >
                                                {t('common.button.assign', '指定')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Sealing Assignment */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsSealingExpanded(!isSealingExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <Clock className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.title.sealingAssignment', '印證 (Sealing) 場次指派')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isSealingExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isSealingExpanded && (
                    <div className="p-6 bg-slate-50/40 space-y-6">
                        <div className="flex flex-wrap justify-end gap-3 w-full">
                            <div className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('stake.temple.label.batchAssign', '支聯會集體指派')}:</span>
                                <div className="w-32">
                                    <TimeSelect value={globalSealingTime} onChange={setGlobalSealingTime} options={sealingSlots} placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')} />
                                </div>
                                <button 
                                    onClick={() => handleBatchSessionUpdate(OrdinanceItem.SEALING, globalSealingTime)}
                                    className="bg-blue-600 text-white px-5 h-10 rounded text-sm font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                >
                                    {t('stake.temple.button.applyToAll', '全體適用')}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {(settings.units || []).map((unit, idx) => {
                                const theme = rainbowThemes[idx % 7];
                                return (
                                    <div key={unit} className={`flex flex-col gap-3 p-4 rounded border shadow-sm transition-all group ${theme.bg} ${theme.border}`}>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-bold ${theme.text}`}>{unit}</span>
                                            <span className={`bg-white/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${theme.text} ${theme.border}`}>
                                                {unitStats[unit]?.seal || 0} {t('common.label.people', '人')}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <TimeSelect 
                                                    value={unitSealingTime[unit] || ''}
                                                    onChange={v => setUnitSealingTime({...unitSealingTime, [unit]: v})}
                                                    options={sealingSlots}
                                                    placeholder={tString('stake.temple.placeholder.selectTime', '選擇時間')}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleBatchSessionUpdate(OrdinanceItem.SEALING, unitSealingTime[unit], unit)}
                                                className={`bg-white/80 px-4 h-10 rounded text-xs font-bold border shadow-sm transition-all active:scale-95 disabled:opacity-30 ${theme.text} ${theme.border} ${theme.hover}`}
                                                disabled={!unitSealingTime[unit]}
                                            >
                                                {t('common.button.assign', '指定')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* List Header Row */}
            <div className="flex flex-col border-b border-slate-200 pb-4 mb-6">
                <h3 className="text-xl font-bold flex items-center text-slate-900">
                    <BookOpen className="w-6 h-6 mr-3 text-sky-600" /> {t('stake.temple.title.ordinanceManagement', '教儀名單座次管理')}
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-amber-400" /> {t('stake.temple.subtitle.realtimeAdjustment', '表格內可即時調整場次並連動更新雲端資料')}
                </p>
            </div>
            
            {/* Endowment List */}
            <div className={`rounded border shadow-sm overflow-hidden mb-8 ${rainbowThemes[0].bg} ${rainbowThemes[0].border}`}>
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsEndowmentExpanded(!isEndowmentExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <BookOpen className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.list.endowmentTitle', '恩道門 (Endowment) 名單')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isEndowmentExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isEndowmentExpanded && (
                    <div className="p-6 flex flex-col gap-6">
                        <div className="w-full flex flex-wrap justify-end items-center gap-3">
                             <div className="hidden lg:flex gap-2 mr-auto">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm bg-white ${rainbowThemes[0].text} ${rainbowThemes[0].border}`}>
                                    {endowmentList.length} {t('common.label.people', '人')}
                                </span>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm bg-white/60 ${rainbowThemes[0].text} ${rainbowThemes[0].border}`}>{t('common.gender.male_label', '弟兄')}: {endCount.male}</span>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm bg-white/60 ${rainbowThemes[0].text} ${rainbowThemes[0].border}`}>{t('common.gender.female_label', '姊妹')}: {endCount.female}</span>
                            </div>
                            <button onClick={() => handleExportTempleList('Endowment')} className={`h-10 px-5 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 border bg-white/60 shadow-sm ${rainbowThemes[0].text} ${rainbowThemes[0].border} ${rainbowThemes[0].hover}`}>
                                <Download className="w-4 h-4" /> {t('common.button.export', '匯出名冊')}
                            </button>
                        </div>
                        <div className={`rounded border shadow-sm overflow-hidden ${rainbowThemes[0].border}`}>
                            {renderTempleListTable(OrdinanceItem.ENDOWMENT, endowmentSlots, endowmentSort, (key) => handleSort('endowment', key), 'endowment')}
                        </div>
                    </div>
                )}
            </div>

            {/* Baptism List */}
            <div className={`rounded border shadow-sm overflow-hidden mb-8 ${rainbowThemes[4].bg} ${rainbowThemes[4].border}`}>
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsBaptismExpanded(!isBaptismExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <BookOpen className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.list.baptismTitle', '洗禮 (Baptism) 名單')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isBaptismExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isBaptismExpanded && (
                    <div className="p-6 flex flex-col gap-6">
                        <div className="w-full flex flex-wrap justify-end items-center gap-3">
                             <div className="hidden lg:flex gap-2 mr-auto">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm bg-white ${rainbowThemes[4].text} ${rainbowThemes[4].border}`}>
                                    {baptismList.length} {t('common.label.people', '人')}
                                </span>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm bg-white/60 ${rainbowThemes[4].text} ${rainbowThemes[4].border}`}>{t('common.gender.male_label', '弟兄')}: {bapCount.male}</span>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm bg-white/60 ${rainbowThemes[4].text} ${rainbowThemes[4].border}`}>{t('common.gender.female_label', '姊妹')}: {bapCount.female}</span>
                            </div>
                            <button onClick={() => handleExportTempleList('Baptism')} className={`h-10 px-5 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 border bg-white/60 shadow-sm ${rainbowThemes[4].text} ${rainbowThemes[4].border} ${rainbowThemes[4].hover}`}>
                                <Download className="w-4 h-4" /> {t('common.button.export', '匯出名冊')}
                            </button>
                        </div>
                        <div className={`rounded border shadow-sm overflow-hidden ${rainbowThemes[4].border}`}>
                            {renderTempleListTable(OrdinanceItem.BAPTISM, baptismSlots, baptismSort, (key) => handleSort('baptism', key), 'baptism')}
                        </div>
                    </div>
                )}
            </div>

            {/* Sealing List */}
            <div className={`rounded border shadow-sm overflow-hidden mb-8 ${rainbowThemes[6].bg} ${rainbowThemes[6].border}`}>
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsSealingExpanded(!isSealingExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded border border-white/20 shadow-inner">
                            <BookOpen className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">{t('stake.temple.list.sealingTitle', '印證 (Sealing) 名單')}</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isSealingExpanded ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>
                </div>
                
                {isSealingExpanded && (
                    <div className="p-6 flex flex-col gap-6">
                        <div className="w-full flex flex-wrap justify-end items-center gap-3">
                             <div className="hidden lg:flex gap-2 mr-auto">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm bg-white ${rainbowThemes[6].text} ${rainbowThemes[6].border}`}>
                                    {(() => {
                                        const sealList = registrations.filter(r => r.status === RegStatus.NORMAL && r.ordinance_item === OrdinanceItem.SEALING);
                                        return sealList.length;
                                    })()} {t('common.label.people', '人')}
                                </span>
                            </div>
                            <button onClick={() => handleExportTempleList('Sealing')} className={`h-10 px-5 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 border bg-white/60 shadow-sm ${rainbowThemes[6].text} ${rainbowThemes[6].border} ${rainbowThemes[6].hover}`}>
                                <Download className="w-4 h-4" /> {t('common.button.export', '匯出名冊')}
                            </button>
                        </div>
                        <div className={`rounded border shadow-sm overflow-hidden ${rainbowThemes[6].border}`}>
                            {renderTempleListTable(OrdinanceItem.SEALING, sealingSlots, sealingSort, (key) => handleSort('sealing', key), 'sealing')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper component for time select
const TimeSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: string[], placeholder?: string }) => {
    const { tString } = useI18n();
    return (
        <select 
            className="border border-slate-200 rounded p-1.5 text-xs w-full bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            <option value="">{placeholder || tString('common.placeholder.select_time', '選擇時間')}</option>
            {options.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
    );
};

export default TempleTab;
