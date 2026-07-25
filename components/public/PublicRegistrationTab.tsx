
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Registration, GlobalSettings, PaymentMethod, RegStatus, BusConfig, EventData, TripType, User as UserType } from '../../types';
import { isPaymentOverdue } from '../../src/utils/registrationUtils';
import { Search, User, Globe, ChevronUp, ChevronDown, ArrowUpDown, Lock, Unlock, RotateCcw, Smartphone, CheckCircle2, XCircle, ChevronRight, Layout, Table2, CreditCard, Users, DollarSign, CheckSquare, Home, Bus, LayoutGrid, List } from 'lucide-react';
import { maskName } from '../../utils/validation';
import PaymentInfoModal from '../PaymentInfoModal';
import TimeNodesDisplay from '../../src/components/registration/TimeNodesDisplay';
import { useStats, useRanks } from '../../hooks/useStats';
import { updateRegistrationField, getCurrentUser, batchUpdateCheckIn } from '../../services/sheetService';
import ConfirmDialog from '../ConfirmDialog';

interface PublicRegistrationTabProps {
    registrations: Registration[];
    settings: GlobalSettings;
    eventStatus: string;
    activeEvent?: EventData;
    eventStats?: { capacity: number; occupied: number; waiting: number };
    busConfigs?: BusConfig[];
}

const PublicRegistrationTab: React.FC<PublicRegistrationTabProps> = ({ registrations, settings, eventStatus, activeEvent, eventStats, busConfigs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPaymentReg, setSelectedPaymentReg] = useState<Registration | null>(null);
    const [lang, setLang] = useState<'zh' | 'en'>('zh');

    const { vehicleRanks, endowmentRanks, baptismRanks } = useRanks(registrations);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    useEffect(() => {
        setCurrentUser(getCurrentUser());
    }, []);

    // Global Lock states
    const [globalLockTo, setGlobalLockTo] = useState(false);
    const [globalLockBack, setGlobalLockBack] = useState(false);

    const [isAdminExpanded, setIsAdminExpanded] = useState(true);
    const [protectNames, setProtectNames] = useState(true);
    const [displayMode, setDisplayMode] = useState<'normal' | 'fee' | 'checkin'>('normal');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    // 行動裝置自動設定預設檢視模式
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        if (isMobile) {
            setViewMode('card');
        } else {
            setViewMode('table');
        }
    }, []);

    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
    const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
        setStatusMsg({ text, type });
        setTimeout(() => setStatusMsg({ text: '', type: null }), 3000);
    };

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'to' | 'back' | null }>({ isOpen: false, type: null });
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    const UNIT_COLOR_THEMES = [
        { name: 'red', title: 'bg-red-200', header: 'bg-red-100 text-red-800', border: 'border-red-200', content: 'bg-red-50', divide: 'divide-red-200', rowHover: 'hover:bg-red-100/30', accent: 'text-red-800', sticky: 'bg-red-50/95' },
        { name: 'orange', title: 'bg-orange-200', header: 'bg-orange-100 text-orange-800', border: 'border-orange-200', content: 'bg-orange-50', divide: 'divide-orange-200', rowHover: 'hover:bg-orange-100/30', accent: 'text-orange-800', sticky: 'bg-orange-50/95' },
        { name: 'amber', title: 'bg-amber-200', header: 'bg-amber-100 text-amber-900', border: 'border-amber-200', content: 'bg-amber-50', divide: 'divide-amber-200', rowHover: 'hover:bg-amber-100/30', accent: 'text-amber-900', sticky: 'bg-amber-50/95' },
        { name: 'emerald', title: 'bg-emerald-200', header: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200', content: 'bg-emerald-50', divide: 'divide-emerald-200', rowHover: 'hover:bg-emerald-100/30', accent: 'text-emerald-800', sticky: 'bg-emerald-50/95' },
        { name: 'blue', title: 'bg-blue-200', header: 'bg-blue-100 text-blue-800', border: 'border-blue-200', content: 'bg-blue-50', divide: 'divide-blue-200', rowHover: 'hover:bg-blue-100/30', accent: 'text-blue-800', sticky: 'bg-blue-50/95' },
        { name: 'indigo', title: 'bg-indigo-200', header: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-200', content: 'bg-indigo-50', divide: 'divide-indigo-200', rowHover: 'hover:bg-indigo-100/30', accent: 'text-indigo-800', sticky: 'bg-indigo-50/95' },
        { name: 'purple', title: 'bg-purple-200', header: 'bg-purple-100 text-purple-800', border: 'border-purple-200', content: 'bg-purple-50', divide: 'divide-purple-200', rowHover: 'hover:bg-purple-100/30', accent: 'text-purple-800', sticky: 'bg-purple-50/95' }
    ];

    const toggleUnitCollapse = (unit: string) => {
        setCollapsedUnits(prev => ({ ...prev, [unit]: !prev[unit] }));
    };

    const handleToggleCheckIn = async (reg: Registration, type: 'to' | 'back') => {
        if (eventStatus === 'cancelled') return;
        if (type === 'to' && globalLockTo) return;
        if (type === 'back' && globalLockBack) return;

        const field = type === 'to' ? 'is_checked_in_to' : 'is_checked_in_back';
        const newVal = !reg[field];
        
        try {
            await updateRegistrationField(reg.reg_id, field, newVal);
            if (type === 'to') await updateRegistrationField(reg.reg_id, 'is_checked_in', newVal);
        } catch (error) {
            console.error('Failed to update check-in:', error);
            showStatus(t('報到更新失敗', 'Check-in update failed'), 'error');
        }
    };

    const executeGlobalReset = async (type: 'to' | 'back') => {
        if (!activeEvent?.event_id) return;
        setConfirmState({ isOpen: false, type: null });
        try {
            const confirmMsg = type === 'to' ? '去程' : '回程';
            const result = await batchUpdateCheckIn(activeEvent.event_id, null, type);
            if (result.success) {
                showStatus(t(`全域${confirmMsg}報到資料已重置`, `Global ${type} check-in reset`), 'success');
            } else {
                showStatus(t(`重置失敗: ${result.message}`, `Reset failed: ${result.message}`), 'error');
            }
        } catch (error) {
            console.error('Global reset error:', error);
            showStatus(t('重置發生意外錯誤', 'Unexpected error during reset'), 'error');
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const t = (zh: string, en: string) => lang === 'zh' ? zh : en;

    const translateTripType = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = { '來回': 'Round Trip', '去程': 'Go Only', '回程': 'Back Only', '自行前往': 'Self-Guided', '自行': 'Self-Guided', '自理': 'Make own way' };
        return dict[val] || val;
    };

    const translateIdentityType = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = { '成人': 'Adult', '敬老': 'Senior', '學生': 'Student', '青少': 'Youth', '嬰兒': 'Infant', '工作人員': 'Staff' };
        return dict[val] || val;
    };

    const translateOrdinance = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = { '洗禮': 'Baptism', '證實': 'Confirmation', '先行禮': 'Initiatory', '恩道門': 'Endowment', '印證': 'Sealing', '不作教儀': 'None' };
        return dict[val] || val;
    };

    const distinctUnits = Array.from(new Set(registrations.map(r => r.unit))) as string[];
    const sortedUnits = distinctUnits.sort((a, b) => {
        const idxA = (settings.units || []).indexOf(a);
        const idxB = (settings.units || []).indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
    });

    const isWaiting = (reg: Registration) => {
        if (reg.trip_type === TripType.RETAINED || reg.trip_type === TripType.SELF_MANAGED) return false;
        const capacity = vehicleStats?.capacity || 42;
        const rank = vehicleRanks.get(reg.reg_id);
        return rank !== undefined && rank > capacity;
    };

    const handlePaymentClick = (reg: Registration) => {
        if (eventStatus === 'confirmed' || eventStatus === 'planning') {
            if (isWaiting(reg)) return;
            setSelectedPaymentReg(reg);
        }
    };

    const getStopInfo = (code: string | undefined) => {
        if (!code || !busConfigs) return undefined;
        for (const bus of busConfigs) {
            const stop = (bus.stops || []).find(s => s.code === code);
            if (stop) return { code: stop.code, location: stop.location };
        }
        return undefined;
    };

    const getMethodBadge = (reg: Registration) => {
        if (reg.payment_method === PaymentMethod.EXTENDED) return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 font-bold border border-gray-300">延用</span>;
        if (reg.amount_due === 0) return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-bold border border-gray-200">免付</span>;
        const colors = reg.payment_method === PaymentMethod.CASH ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-blue-100 text-blue-700 border-blue-200';
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors}`}>{reg.payment_method}</span>;
    };

    const getStatusBadge = (reg: Registration) => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED) return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 font-bold border border-gray-300">免收</span>;
        const colors = reg.is_paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors}`}>{reg.is_paid ? '已收' : '未收'}</span>;
    };

    const { vehicleStats } = useStats(activeEvent, registrations);

    const shouldShowPayment = activeEvent?.paymentDisplayMode !== 'none';

    return (
        <div className="flex flex-col w-full h-full bg-[#F0F4F8] min-h-screen relative">
            {/* Mobile Header - Drastically lowered Z-Index and compressed padding */}
            <header className="lg:hidden bg-indigo-900 text-white px-3 py-2 flex items-center justify-between sticky top-0 z-[5] shadow-md shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 rounded-md">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-[11px] md:text-xs font-black tracking-tight">{t('報名名單查詢', 'Registration Query')}</h1>
                        <p className="text-[8px] md:text-[9px] text-indigo-300 font-bold">{activeEvent?.event_title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                        className="p-1.5 bg-white/10 rounded-md hover:bg-white/20 transition-all border border-white/10"
                    >
                        {viewMode === 'table' ? <LayoutGrid className="w-3 h-3" /> : <List className="w-3 h-3" />}
                    </button>
                    <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="p-1.5 bg-indigo-700 rounded-md border border-indigo-600">
                        <Globe className="w-3 h-3" />
                    </button>
                </div>
            </header>

            {/* Main Action Bar - Drastically lowered Z-Index (z-1) and compressed height */}
            <div className="bg-white border-b border-slate-200 px-3 md:px-4 py-1.5 md:py-2 sticky top-0 lg:top-0 z-[2] shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row gap-2 md:items-center justify-between max-w-full">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                        <input
                            type="text"
                            placeholder={t('搜尋姓名、單位、車別...', 'Search...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-8 md:h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-md text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:pb-0 no-scrollbar">
                        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0">
                            {[
                                { id: 'normal', icon: Users, label: '概覽' },
                                { id: 'fee', icon: DollarSign, label: '費用' },
                                { id: 'checkin', icon: CheckSquare, label: '報到' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setDisplayMode(mode.id as any)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 md:px-4 md:py-2 h-8 md:h-10 rounded-md text-[10px] md:text-xs font-black transition-all ${
                                        displayMode === mode.id ? 'bg-white text-indigo-900 shadow-sm border border-slate-200' : 'text-slate-500'
                                    }`}
                                >
                                    <mode.icon className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="whitespace-nowrap">{t(mode.label, mode.label)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content - Forced outer scrollability and width constraint */}
            <div className="flex-1 w-full max-w-full overflow-x-auto overflow-y-auto p-1.5 md:p-3 bg-[#F0F4F8]">
                <div className="w-full max-w-full flex flex-col gap-2 md:gap-4">
                    {sortedUnits.map((unit, index) => {
                        const unitRegs = registrations.filter(r => r.unit === unit && (r.name.includes(searchTerm) || r.unit.includes(searchTerm) || (r.bus_assigned || '').includes(searchTerm)));
                        if (unitRegs.length === 0) return null;
                        
                        const theme = UNIT_COLOR_THEMES[index % UNIT_COLOR_THEMES.length];
                        const cashTotal = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.payment_method === PaymentMethod.CASH).reduce((sum, r) => sum + (r.amount_due || 0), 0);
                        const transferTotal = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.payment_method === PaymentMethod.TRANSFER).reduce((sum, r) => sum + (r.amount_due || 0), 0);
                        const goCheckedCount = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.is_checked_in_to).length;
                        const backCheckedCount = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.is_checked_in_back).length;

                        return (
                            <div key={unit} className={`bg-white border ${theme.border} rounded-[8px] shadow-sm p-0 m-1 md:m-0 w-full max-w-full animate-in fade-in slide-in-from-bottom-2 overflow-x-auto`}>
                                {/* Depth 1: Header */}
                                <div onClick={() => toggleUnitCollapse(unit)} className={`w-full flex items-center justify-between px-3 py-2 ${theme.title} border-b ${theme.border} rounded-t-[7px] cursor-pointer hover:brightness-95 transition-all`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1 h-5 rounded-full ${theme.accent.replace('text', 'bg')}`}></div>
                                        <h3 className="font-black text-xs md:text-sm lg:text-base uppercase flex items-center gap-1.5">
                                            {unit}
                                            <span className="text-[10px] font-bold opacity-60 bg-black/5 px-1.5 py-0.5 rounded-full">{unitRegs.length} P</span>
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {collapsedUnits[unit] ? <ChevronDown className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />}
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {!collapsedUnits[unit] && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className={`${theme.content} overflow-x-auto`}>
                                            {/* Statistics - Compressed for Mobile */}
                                            <div className={`px-3 py-2 border-b ${theme.border} flex flex-col md:flex-row gap-2 justify-between items-start md:items-center`}>
                                                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                                    <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-md border border-black/5 shadow-sm text-[10px] md:text-xs font-bold text-slate-600">
                                                        <Bus className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> 乘車:{unitRegs.length}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-md border border-black/5 shadow-sm text-[10px] md:text-xs font-bold text-emerald-700">
                                                        <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" /> 去{goCheckedCount}/回{backCheckedCount}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-md border border-black/5 shadow-sm text-[10px] md:text-xs font-bold text-rose-700">
                                                        <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" /> 轉${transferTotal.toLocaleString()} / 現${cashTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-1 md:p-2 w-full max-w-full">
                                                {viewMode === 'table' ? (
                                                    <div className="w-full max-w-full overflow-x-auto custom-scrollbar shadow-inner bg-black/5 p-1 rounded-md">
                                                        <table className={`w-full min-w-[1200px] table-auto border-collapse ${theme.content} rounded-md border ${theme.border}`}>
                                                            <thead className={`${theme.header} border-b ${theme.border}`}>
                                                                <tr className="text-[10px] md:text-xs lg:text-sm font-black text-left whitespace-nowrap">
                                                                    <th className={`px-1 py-1 sticky left-0 z-20 ${theme.header} border-r ${theme.border} shadow-[1px_0_3px_rgba(0,0,0,0.05)]`}>{t('姓名', 'Name')}</th>
                                                                    {displayMode === 'normal' && (
                                                                        <>
                                                                            <th className={`px-1 py-1 border-r ${theme.border}`}>{t('車別', 'Bus')}</th>
                                                                            <th className={`px-1 py-1 border-r ${theme.border}`}>{t('站別', 'Stop')}</th>
                                                                            <th className={`px-1 py-1 border-r ${theme.border}`}>{t('教儀', 'Ordinance')}</th>
                                                                            <th className={`px-1 py-1 border-r ${theme.border}`}>{t('行程', 'Trip')}</th>
                                                                        </>
                                                                    )}
                                                                    {displayMode === 'fee' && (
                                                                        <>
                                                                            <th className={`px-1 py-1 text-center border-r ${theme.border}`}>方式</th>
                                                                            <th className={`px-1 py-1 text-right border-r ${theme.border}`}>金額</th>
                                                                            <th className={`px-1 py-1 text-center border-r ${theme.border}`}>狀態</th>
                                                                        </>
                                                                    )}
                                                                    {displayMode === 'checkin' && (
                                                                        <>
                                                                            <th className={`px-1 py-1 text-center border-r ${theme.border}`}>去程</th>
                                                                            <th className={`px-1 py-1 text-center`}>回程</th>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            </thead>
                                                            <tbody className={`divide-y ${theme.border} text-[10px] md:text-xs lg:text-sm font-bold whitespace-nowrap`}>
                                                                {unitRegs.map((reg) => (
                                                                    <tr key={reg.reg_id} className={`hover:bg-black/5 transition-colors ${reg.status === RegStatus.CANCELLED ? 'opacity-40 grayscale italic' : ''}`}>
                                                                        <td className={`px-1 py-1 sticky left-0 z-10 ${theme.content} border-r ${theme.border} shadow-[1px_0_3px_rgba(0,0,0,0.05)] font-black text-slate-900 cursor-pointer`} onClick={() => handlePaymentClick(reg)}>
                                                                            {protectNames ? maskName(reg.name) : reg.name}
                                                                        </td>
                                                                        {displayMode === 'normal' && (
                                                                            <>
                                                                                <td className={`px-1 py-1 border-r ${theme.border}`}>{reg.bus_assigned ? <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px]">{reg.bus_assigned.charAt(0)}車</span> : '-'}</td>
                                                                                <td className={`px-1 py-1 border-r ${theme.border} text-slate-700`}>{getStopInfo(reg.bus_assigned)?.location || '-'}</td>
                                                                                <td className={`px-1 py-1 border-r ${theme.border} text-indigo-700`}>{translateOrdinance(reg.ordinance_item)}</td>
                                                                                <td className={`px-1 py-1 border-r ${theme.border} text-emerald-700`}>{translateTripType(reg.trip_type)}</td>
                                                                            </>
                                                                        )}
                                                                        {displayMode === 'fee' && (
                                                                            <>
                                                                                <td className={`px-1 py-1 text-center border-r ${theme.border}`}>{getMethodBadge(reg)}</td>
                                                                                <td className={`px-1 py-1 text-right font-mono border-r ${theme.border} text-slate-900`}>${(reg.amount_due || 0).toLocaleString()}</td>
                                                                                <td className={`px-1 py-1 text-center border-r ${theme.border}`}>{getStatusBadge(reg)}</td>
                                                                            </>
                                                                        )}
                                                                        {displayMode === 'checkin' && (
                                                                            <>
                                                                                <td className={`px-1 py-1 text-center border-r ${theme.border}`}>
                                                                                    <button onClick={() => handleToggleCheckIn(reg, 'to')} className={`p-1 rounded-full transition-all ${reg.is_checked_in_to ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/50 text-slate-300'} hover:scale-110`}>
                                                                                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                                                                                    </button>
                                                                                </td>
                                                                                <td className={`px-1 py-1 text-center`}>
                                                                                    <button onClick={() => handleToggleCheckIn(reg, 'back')} className={`p-1 rounded-full transition-all ${reg.is_checked_in_back ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/50 text-slate-300'} hover:scale-110`}>
                                                                                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                                                                                    </button>
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-2 p-2 md:hidden">
                                                        {unitRegs.map((reg) => (
                                                            <div key={reg.reg_id} onClick={() => handlePaymentClick(reg)} className={`p-3 rounded-lg border ${theme.border} bg-white shadow-sm flex flex-col gap-2.5 active:scale-[0.98] transition-all`}>
                                                                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                                                    <div><div className="font-black text-xs text-slate-900">{protectNames ? maskName(reg.name) : reg.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{translateIdentityType(reg.identity_type as string)}</div></div>
                                                                    <div className="flex gap-1.5">
                                                                        {reg.bus_assigned && <span className="bg-indigo-900 text-white px-2 py-0.5 rounded text-[10px] font-black">{reg.bus_assigned.charAt(0)}車</span>}
                                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">{translateTripType(reg.trip_type)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className={`${theme.content} p-2 rounded-md border ${theme.border}`}><div className="text-[10px] text-slate-400 font-black mb-1 uppercase">站別</div><div className="text-[11px] font-bold text-slate-700 truncate">{getStopInfo(reg.bus_assigned)?.location || '-'}</div></div>
                                                                    <div className={`${theme.content} p-2 rounded-md border ${theme.border}`}><div className="text-[10px] text-slate-400 font-black mb-1 uppercase">教儀</div><div className="text-[11px] font-bold text-slate-700">{translateOrdinance(reg.ordinance_item)}</div></div>
                                                                </div>
                                                                {displayMode === 'fee' && (
                                                                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-200"><div className="flex items-center gap-2">{getMethodBadge(reg)}<span className="text-xs font-black">${(reg.amount_due || 0).toLocaleString()}</span></div>{getStatusBadge(reg)}</div>
                                                                )}
                                                                {displayMode === 'checkin' && (
                                                                    <div className="flex gap-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(reg, 'to'); }} className={`flex-1 h-9 rounded-md font-black text-xs transition-all ${reg.is_checked_in_to ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>去程</button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(reg, 'back'); }} className={`flex-1 h-9 rounded-md font-black text-xs transition-all ${reg.is_checked_in_back ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>回程</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDialog 
                isOpen={confirmState.isOpen}
                title="確認重置"
                message={`確定要重置 ${confirmState.type === 'to' ? '去程' : '回程'} 報到資料嗎？`}
                confirmText="確定重置"
                cancelText="取消"
                onConfirm={() => confirmState.type && executeGlobalReset(confirmState.type)}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
                isDangerous={true}
            />

            {statusMsg.type && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-bottom-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span className="text-sm font-bold">{statusMsg.text}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicRegistrationTab;
