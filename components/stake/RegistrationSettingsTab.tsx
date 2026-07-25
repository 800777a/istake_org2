
import React, { useState } from 'react';
import { Power, Bus, BookOpen, CheckCircle, ListOrdered, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { EventData, GlobalSettings } from '../../types';
import RegistrationSwitch from './RegistrationSwitch';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
import TimeNodesDisplay from '../../src/components/registration/TimeNodesDisplay';
import { useI18n } from '../../src/contexts/LanguageContext';
import RegistrationEngineSettings from './RegistrationEngineSettings';

interface RegistrationSettingsTabProps {
    activeEvent: EventData | null;
    settings: GlobalSettings;
    eventStats: { capacity: number; occupied: number; waiting: number; remaining: number };
    ordinanceStats?: {
        endowment: { capacity: number; occupied: number; waiting: number; remaining: number };
        baptism: { capacity: number; occupied: number; waiting: number; remaining: number };
        sealing: { capacity: number; occupied: number; waiting: number; remaining: number };
    };
    onUpdateEvent: (e: EventData) => void;
    onAssignVehicleSerials: () => void;
    onAssignOrdinanceSerials: () => void;
}

// Modern Business Style constants (High-Contrast Theme)
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-6 py-4 flex items-center justify-between cursor-pointer select-none',
    sectionTitle: 'text-sm md:text-base lg:text-lg font-semibold tracking-tight',
    pageTitle: 'text-xl md:text-2xl font-bold tracking-tight text-slate-900',
    bodyText: 'text-sm text-slate-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    btnSecondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    btnTemple: 'bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    input: 'w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all',
    badge: {
        success: 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 px-2.5 py-0.5 rounded text-[10px]',
        warning: 'bg-amber-100 text-amber-900 font-semibold border border-amber-300 px-2.5 py-0.5 rounded text-[10px]',
        danger: 'bg-rose-100 text-rose-900 font-semibold border border-rose-300 px-2.5 py-0.5 rounded text-[10px]',
        info: 'bg-blue-100 text-blue-900 font-semibold border border-blue-300 px-2.5 py-0.5 rounded text-[10px]'
    }
};

const RegistrationSettingsTab: React.FC<RegistrationSettingsTabProps> = ({
    activeEvent,
    settings,
    eventStats,
    ordinanceStats,
    onUpdateEvent,
    onAssignVehicleSerials,
    onAssignOrdinanceSerials
}) => {
    const { t, tString } = useI18n();
    const [msg, setMsg] = useState<string | null>(null);
    const [isRegSwitchExpanded, setIsRegSwitchExpanded] = useState(true);
    const [isGroupIndicatorExpanded, setIsGroupIndicatorExpanded] = useState(true);

    if (!activeEvent) return null;

    const groupGate = activeEvent.engineConfig?.groupGate || { maxGroups: 1, minCapacity: 30, maxCapacity: 42 };
    const maxGroups = Number(groupGate.maxGroups) || 1;
    const minCap = Number(groupGate.minCapacity) || 30;
    const maxCap = Number(groupGate.maxCapacity) || 42;
    // 使用 occupied + waiting 來代表總報名人數，確保包含候補人員
    const totalOccupied = (Number(eventStats.occupied) || 0) + (Number(eventStats.waiting) || 0);

    const groupData = [];
    let remainingCount = totalOccupied;
    for (let i = 1; i <= maxGroups; i++) {
        const count = Math.min(remainingCount, maxCap);
        remainingCount = Math.max(0, remainingCount - count);
        groupData.push({
            id: i,
            count,
            min: minCap,
            max: maxCap,
            isCompleted: count >= minCap
        });
    }

    const deadline = activeEvent.engineConfig?.timeNodes?.groupFormationDeadline;
    const showYear = activeEvent.engineConfig?.timeNodes?.showYear;

    const formatDeadline = (val: string | undefined) => {
        if (!val) return '未設定';
        return new Date(val).toLocaleString('zh-TW', {
            year: showYear ? 'numeric' : undefined,
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleUpdateRegField = async (field: keyof EventData, value: any) => {
        const updated = { 
            ...activeEvent, 
            [field]: value
        };
        onUpdateEvent(updated);
        setMsg(t('stake.registration.settings_updated', '設定已自動更新'));
        setTimeout(() => setMsg(null), 3000);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div>
                    <h2 className={THEME.pageTitle}>{t('stake.admin.tabs.registration.settings', '報名設定')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{activeEvent.event_title} - {t('stake.registration.settings_subtitle', '管理車輛成團與教儀名額預約狀態')}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                    {msg && (
                        <div className={`${THEME.badge.success} flex items-center gap-2 px-4 h-9 animate-pulse`}>
                            <CheckCircle className="w-4 h-4" /> {msg}
                        </div>
                    )}
                </div>
            </div>

            {/* 1. Seat Reservation Grid (2-Column) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Vehicle Seat Reservation */}
                <div className={THEME.card}>
                    {/* Collapsible Header */}
                    <div 
                        className={THEME.header}
                        onClick={() => setIsRegSwitchExpanded(!isRegSwitchExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <Bus className="w-5 h-5 text-blue-300" /> 
                            <h3 className={THEME.sectionTitle}>
                                {t('stake.registration.settings.vehicle_reservation', '車輛座位預約')}
                            </h3>
                        </div>
                        {isRegSwitchExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {isRegSwitchExpanded && (
                        <div className="p-6 space-y-6 bg-[#F0F4F8]/20 border-t border-slate-100">
                            {/* Actions beneath title row - Right Aligned */}
                            <div className="flex flex-col items-end gap-4">
                                <div className="flex flex-wrap items-center justify-between w-full">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">規則摘要</div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={THEME.badge.info}>{t('common.label.min_cap', '成團人數')}: {minCap} ~ {maxCap}</span>
                                            <span className={THEME.badge.warning}>{t('common.col.deadline', '截止時間')}: {formatDeadline(deadline)}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onAssignVehicleSerials}
                                        className={`${THEME.btnPrimary} h-10 px-5 text-sm shrink-0`}
                                    >
                                        <ListOrdered className="w-4 h-4" />
                                        {t('stake.registration.form.dashboard.assign_vehicle_numbers', '指派車序')}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-6">
                                {groupData.map((group) => (
                                    <div key={group.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white group hover:border-blue-400 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 flex items-center justify-center bg-indigo-900 rounded-lg text-white font-bold text-sm shadow-md">
                                                {group.id}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{t('common.label.group', '第 {{n}} 團', { n: group.id })}</div>
                                                <div className="text-xs text-slate-500 font-medium">{t('common.label.registrations', '已報名')}: <span className="text-slate-900 font-bold">{group.count}</span> {t('common.label.people', '人')}</div>
                                            </div>
                                        </div>
                                        <span className={group.isCompleted ? THEME.badge.success : THEME.badge.warning}>
                                            {group.isCompleted ? t('common.status.formed', '已經成團') : t('common.status.pending', '尚未成團')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ordinance Seat Reservation */}
                {ordinanceStats && (
                    <div className={THEME.card}>
                        <div 
                            className={THEME.header}
                            onClick={() => setIsGroupIndicatorExpanded(!isGroupIndicatorExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-amber-300" /> 
                                <h3 className={THEME.sectionTitle}>
                                    {t('stake.registration.form.dashboard.ordinance_reservation')}
                                </h3>
                            </div>
                            {isGroupIndicatorExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        
                        {isGroupIndicatorExpanded && (
                            <div className="p-6 space-y-6 bg-[#F0F4F8]/20 border-t border-slate-100">
                                {/* Actions beneath title row - Right Aligned */}
                                <div className="flex justify-end w-full">
                                    <button 
                                        onClick={onAssignOrdinanceSerials}
                                        className={`${THEME.btnSecondary} h-10 px-5 text-sm shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50`}
                                    >
                                        <ListOrdered className="w-4 h-4" />
                                        {t('stake.registration.form.dashboard.assign_ordinance_numbers', '指派教儀編號')}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-6">
                                    {/* Endowment */}
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col gap-4 group hover:border-amber-400 transition-all shadow-sm">
                                        <div className="text-indigo-900 text-[10px] font-bold tracking-widest uppercase border-b border-slate-100 pb-2 flex justify-between items-center">
                                            {t('stake.registration.form.dashboard.ordinance_endowment')}
                                            <TrendingUp className="w-3 h-3 text-amber-500" />
                                        </div>
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.endowment?.capacity || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.occupied')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.endowment?.occupied || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.available')}:</span>
                                                <span className={`font-bold text-sm ${(ordinanceStats.endowment?.remaining || 0) > 0 ? "text-emerald-600" : "text-rose-500"}`}>{ordinanceStats.endowment?.remaining || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                                <span className={`font-bold text-[11px] font-mono ${(ordinanceStats.endowment?.waiting || 0) > 0 ? "bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100" : "text-slate-300"}`}>{ordinanceStats.endowment?.waiting || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Baptism */}
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col gap-4 group hover:border-amber-400 transition-all shadow-sm">
                                        <div className="text-indigo-900 text-[10px] font-bold tracking-widest uppercase border-b border-slate-100 pb-2 flex justify-between items-center">
                                            {t('stake.registration.form.dashboard.ordinance_baptism')}
                                            <TrendingUp className="w-3 h-3 text-amber-500" />
                                        </div>
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.baptism?.capacity || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.occupied')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.baptism?.occupied || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.available')}:</span>
                                                <span className={`font-bold text-sm ${(ordinanceStats.baptism?.remaining || 0) > 0 ? "text-emerald-600" : "text-rose-500"}`}>{ordinanceStats.baptism?.remaining || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                                <span className={`font-bold text-[11px] font-mono ${(ordinanceStats.baptism?.waiting || 0) > 0 ? "bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100" : "text-slate-300"}`}>{ordinanceStats.baptism?.waiting || 0}</span>
                                            </div>
                                        </div>
                                    </div>
            
                                    {/* Sealing */}
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col gap-4 group hover:border-amber-400 transition-all shadow-sm">
                                        <div className="text-indigo-900 text-[10px] font-bold tracking-widest uppercase border-b border-slate-100 pb-2 flex justify-between items-center">
                                            {t('stake.registration.form.dashboard.ordinance_sealing', '印證')}
                                            <TrendingUp className="w-3 h-3 text-amber-500" />
                                        </div>
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.sealing?.capacity || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.occupied')}:</span>
                                                <span className="font-bold text-slate-900 text-sm">{ordinanceStats.sealing?.occupied || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <span className="text-slate-500 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.available')}:</span>
                                                <span className={`font-bold text-sm ${(ordinanceStats.sealing?.remaining || 0) > 0 ? "text-emerald-600" : "text-rose-500"}`}>{ordinanceStats.sealing?.remaining || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                                <span className={`font-bold text-[11px] font-mono ${(ordinanceStats.sealing?.waiting || 0) > 0 ? "bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100" : "text-slate-300"}`}>{ordinanceStats.sealing?.waiting || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Registration Engine (New Complex Section) - Renamed to 報名細項設定 */}
            <RegistrationEngineSettings 
                activeEvent={activeEvent}
                settings={settings}
                onUpdateEvent={onUpdateEvent}
                colorIndex={3}
            />

        </div>
    );
};

export default RegistrationSettingsTab;
