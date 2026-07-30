
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Registration, GlobalSettings, PaymentMethod, RegStatus, BusConfig, EventData, TripType, User as UserType } from '../../types';
import { isPaymentOverdue } from '../../src/utils/registrationUtils';
import { Search, User, Globe, ChevronUp, ChevronDown, ArrowUpDown, Lock, Unlock, RotateCcw, Smartphone, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Layout, Table2, CreditCard, Users, DollarSign, CheckSquare, Home, Bus, LayoutGrid, List } from 'lucide-react';
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
    onRoleChange?: (role: any, subTab?: string) => void;
}

const PublicRegistrationTab: React.FC<PublicRegistrationTabProps> = ({ registrations, settings, eventStatus, activeEvent, eventStats, busConfigs, onRoleChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUnit, setSelectedUnit] = useState<string>('all');
    const [selectedPaymentReg, setSelectedPaymentReg] = useState<Registration | null>(null);
    const [lang, setLang] = useState<'zh' | 'en'>('zh');

    const { vehicleRanks, endowmentRanks, baptismRanks } = useRanks(registrations);

    // Orientation Reset補丁 (Hard Reset)
    const [remountKey, setRemountKey] = useState(0);
    useEffect(() => {
        const handleResize = () => setRemountKey(k => k + 1);
        window.addEventListener('orientationchange', handleResize);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('orientationchange', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

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
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
    };

    const sortData = (data: Registration[]) => {
        if (!sortConfig) return data;
        
        return [...data].sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof Registration] || '';
            let valB: any = b[sortConfig.key as keyof Registration] || '';
            
            // Handle specific fields
            if (sortConfig.key === 'ordinance_item') {
                valA = translateOrdinance(a.ordinance_item);
                valB = translateOrdinance(b.ordinance_item);
            } else if (sortConfig.key === 'trip_type') {
                valA = translateTripType(a.trip_type);
                valB = translateTripType(b.trip_type);
            } else if (sortConfig.key === 'amount_due') {
                valA = Number(a.amount_due || 0);
                valB = Number(b.amount_due || 0);
            } else if (sortConfig.key === 'payment_method') {
                valA = a.payment_method || '';
                valB = b.payment_method || '';
            } else if (sortConfig.key === 'status') {
                valA = a.is_paid ? '已收' : '未收';
                valB = b.is_paid ? '已收' : '未收';
            }
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // 移除行動裝置自動設定預設檢視模式的 useEffect，確保預設皆為 table (列表)
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
    const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
        setStatusMsg({ text, type });
        setTimeout(() => setStatusMsg({ text: '', type: null }), 3000);
    };

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'to' | 'back' | null }>({ isOpen: false, type: null });
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    const UNIT_COLOR_THEMES = [
        { name: 'red', title: 'bg-red-200', header: 'bg-red-100', border: 'border-red-200', content: 'bg-red-50', divide: 'divide-red-200', accent: 'text-red-900', rowHover: 'hover:bg-red-100/30' },
        { name: 'orange', title: 'bg-orange-200', header: 'bg-orange-100', border: 'border-orange-200', content: 'bg-orange-50', divide: 'divide-orange-200', accent: 'text-orange-900', rowHover: 'hover:bg-orange-100/30' },
        { name: 'yellow', title: 'bg-yellow-200', header: 'bg-yellow-100', border: 'border-yellow-200', content: 'bg-yellow-50', divide: 'divide-yellow-200', accent: 'text-yellow-900', rowHover: 'hover:bg-yellow-100/30' },
        { name: 'green', title: 'bg-green-200', header: 'bg-green-100', border: 'border-green-200', content: 'bg-green-50', divide: 'divide-green-200', accent: 'text-green-900', rowHover: 'hover:bg-green-100/30' },
        { name: 'blue', title: 'bg-blue-200', header: 'bg-blue-100', border: 'border-blue-200', content: 'bg-blue-50', divide: 'divide-blue-200', accent: 'text-blue-900', rowHover: 'hover:bg-blue-100/30' },
        { name: 'indigo', title: 'bg-indigo-200', header: 'bg-indigo-100', border: 'border-indigo-200', content: 'bg-indigo-50', divide: 'divide-indigo-200', accent: 'text-indigo-900', rowHover: 'hover:bg-indigo-100/30' },
        { name: 'purple', title: 'bg-purple-200', header: 'bg-purple-100', border: 'border-purple-200', content: 'bg-purple-50', divide: 'divide-purple-200', accent: 'text-purple-900', rowHover: 'hover:bg-purple-100/30' }
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

    const sortedUnits = useMemo(() => {
        // Vxxx: Combine all potential sources of unit names
        const billingUnits = settings?.billingConfig?.units?.map(u => u.shortName) || [];
        const configUnits = settings?.units || [];
        const regUnits = registrations.map(r => r.unit).filter(u => u && String(u).trim() !== '');
        
        // Use Set to unique, then filter out empty/null/whitespace
        const allUnits = Array.from(new Set([...billingUnits, ...configUnits, ...regUnits]))
            .filter(u => u != null && String(u).trim() !== '');
        
        // Sort them: priority to billingUnits order, then configUnits, then alphabetical
        return allUnits.sort((a, b) => {
            const idxBillingA = billingUnits.indexOf(a);
            const idxBillingB = billingUnits.indexOf(b);
            if (idxBillingA !== -1 && idxBillingB !== -1) return idxBillingA - idxBillingB;
            if (idxBillingA !== -1) return -1;
            if (idxBillingB !== -1) return 1;
            
            const idxConfigA = configUnits.indexOf(a);
            const idxConfigB = configUnits.indexOf(b);
            if (idxConfigA !== -1 && idxConfigB !== -1) return idxConfigA - idxConfigB;
            if (idxConfigA !== -1) return -1;
            if (idxConfigB !== -1) return 1;

            return String(a).localeCompare(String(b));
        });
    }, [registrations, settings?.units, settings?.billingConfig?.units]);

    const isWaiting = (reg: Registration) => {
        if (reg.trip_type === TripType.RETAINED || reg.trip_type === TripType.SELF_MANAGED) return false;
        const capacity = vehicleStats?.capacity || 42;
        const rank = vehicleRanks.get(reg.reg_id);
        return rank !== undefined && rank > capacity;
    };

    const handlePaymentClick = (reg: Registration) => {
        // V700: Always allow viewing payment info if it exists
        if (reg) {
            setSelectedPaymentReg(reg);
        }
    };

    const getStopInfo = (code: string | undefined) => {
        if (!code || !busConfigs) return undefined;
        for (const bus of busConfigs) {
            const stop = (bus.stops || []).find(s => s.code === code);
            if (stop) return { code: stop.code, location: stop.location, time: stop.time };
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

    const { vehicleStats, ordinanceStats } = useStats(activeEvent, registrations);

    const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const scroll = (unit: string, direction: 'left' | 'right') => {
        const el = scrollRefs.current[unit];
        if (el) {
            const amount = direction === 'left' ? -200 : 200;
            el.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const shouldShowPayment = activeEvent?.paymentDisplayMode !== 'none';

    return (
        <div key={remountKey} className="flex flex-col w-full min-w-0 bg-[#F8F9FA] relative">
            {/* Dashboard Statistics - Perfectly Matched to Admin Style (Unwrapped) - Rule 3.2 Compliance */}
            <div className="w-full max-w-full px-1 pt-1 shrink-0 space-y-1">
                {/* 1. 車輛座位預約 (Bus Seats) - 複製自後台結構 */}
                <div className="flex flex-col min-w-0">
                    <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-1 rounded-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bus className="w-4 h-4 text-amber-950" />
                            <h2 className="text-sm font-black text-amber-950 uppercase tracking-widest">車輛座位預約</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-white border-x border-b border-amber-200 rounded-b">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate">總座位數</div>
                            <div className="text-xl font-black text-slate-900">{vehicleStats.capacity} <span className="text-[10px] text-slate-400">人</span></div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                            <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1 truncate">預約位數</div>
                            <div className="text-xl font-black text-emerald-900">{(vehicleStats.occupied + vehicleStats.waiting)} <span className="text-[10px] text-slate-400">人</span></div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded border border-amber-100">
                            <div className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-1 truncate">剩餘位數</div>
                            <div className="text-xl font-black text-amber-900">{vehicleStats.remaining} <span className="text-[10px] text-slate-400">人</span></div>
                        </div>
                    </div>
                </div>

                {/* 2. 教儀座位預約 (Ordinance Seats) - 複製自後台結構 */}
                <div className="flex flex-col min-w-0">
                    <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-1 rounded-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-amber-950" />
                            <h2 className="text-sm font-black text-amber-950 uppercase tracking-widest">教儀座位預約</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-white border-x border-b border-amber-200 rounded-b">
                        <div className="bg-blue-50 p-2 rounded border border-blue-100">
                            <div className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1 truncate">洗禮</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-blue-900">{ordinanceStats.baptism.occupied + ordinanceStats.baptism.waiting}</span>
                                <span className="text-[10px] text-slate-400">/ {ordinanceStats.baptism.capacity}</span>
                            </div>
                            <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.baptism.occupied + ordinanceStats.baptism.waiting) / (ordinanceStats.baptism.capacity || 1)) * 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                            <div className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mb-1 truncate">恩道門</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-indigo-900">{ordinanceStats.endowment.occupied + ordinanceStats.endowment.waiting}</span>
                                <span className="text-[10px] text-slate-400">/ {ordinanceStats.endowment.capacity}</span>
                            </div>
                            <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.endowment.occupied + ordinanceStats.endowment.waiting) / (ordinanceStats.endowment.capacity || 1)) * 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-rose-50 p-2 rounded border border-rose-100">
                            <div className="text-[10px] text-rose-600 font-black uppercase tracking-widest mb-1 truncate">印證</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-rose-900">{ordinanceStats.sealing.occupied + ordinanceStats.sealing.waiting}</span>
                                <span className="text-[10px] text-slate-400">/ {ordinanceStats.sealing.capacity}</span>
                            </div>
                            <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.sealing.occupied + ordinanceStats.sealing.waiting) / (ordinanceStats.sealing.capacity || 1)) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Bar - Elevated Z-Index and Rainbow Styling */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 border-b-2 border-amber-200 px-2 md:px-4 py-1.5 md:py-2 sticky top-0 z-[100] shadow-md shrink-0 min-w-0">
                <div className="flex flex-col md:flex-row gap-2 md:items-center justify-between max-w-full min-w-0">
                    <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                        {/* Left Column: Unit Selection */}
                        <div className="relative w-full sm:w-1/3 min-w-0 group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-700 group-focus-within:text-yellow-900" />
                            <select
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="w-full h-8 md:h-10 pl-9 pr-3 bg-yellow-50 border-2 border-yellow-200 rounded text-[10px] md:text-xs font-black text-yellow-900 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">搜尋 單位</option>
                                {sortedUnits.map(unit => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-yellow-400" />
                            </div>
                        </div>

                        {/* Right Column: Personal Search */}
                        <div className="relative w-full sm:w-2/3 min-w-0 group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-700 group-focus-within:text-emerald-900" />
                            <input
                                type="text"
                                placeholder="搜尋 個人"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-8 md:h-10 pl-9 pr-3 bg-emerald-50 border-2 border-emerald-200 rounded text-[10px] md:text-xs font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all truncate"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:pb-0 no-scrollbar min-w-0 shrink-0">
                        <div className="flex bg-white/50 p-1 rounded border-2 border-amber-200 shrink-0 gap-1">
                            {[
                                { id: 'normal', icon: Users, label: '概覽', active: 'bg-red-100 text-red-900 border-red-300', inactive: 'bg-red-50 text-red-400 border-red-100' },
                                { id: 'fee', icon: DollarSign, label: '收費', active: 'bg-orange-100 text-orange-900 border-orange-300', inactive: 'bg-orange-50 text-orange-400 border-orange-100' },
                                { id: 'checkin', icon: CheckSquare, label: '報到', active: 'bg-emerald-100 text-emerald-900 border-emerald-300', inactive: 'bg-emerald-50 text-emerald-400 border-emerald-100' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setDisplayMode(mode.id as any)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 md:px-4 md:py-2 h-8 md:h-10 rounded border-2 text-[10px] md:text-xs font-black transition-all ${
                                        displayMode === mode.id ? mode.active + ' shadow-sm' : mode.inactive
                                    }`}
                                >
                                    <mode.icon className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="whitespace-nowrap">{t(mode.label, mode.label)}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex bg-white/50 p-1 rounded border-2 border-amber-200 shrink-0 gap-1">
                            {[
                                { id: 'table', icon: List, label: '列表', active: 'bg-blue-100 text-blue-900 border-blue-300', inactive: 'bg-blue-50 text-blue-400 border-blue-100' },
                                { id: 'card', icon: LayoutGrid, label: '卡片', active: 'bg-purple-100 text-purple-900 border-purple-300', inactive: 'bg-purple-50 text-purple-400 border-purple-100' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id as any)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 md:px-4 md:py-2 h-8 md:h-10 rounded border-2 text-[10px] md:text-xs font-black transition-all ${
                                        viewMode === mode.id ? mode.active + ' shadow-sm' : mode.inactive
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

            {/* Scrollable Content - Forced outer width constraint - Rule 4.1 Compliance */}
            <div className="flex-1 w-full max-w-full p-0 bg-[#F8F9FA] min-w-0 overflow-hidden">
                <div className="w-full max-w-full flex flex-col gap-2 min-w-0">
                    {sortedUnits.map((unit, index) => {
                        const unitRegs = sortData(registrations.filter(r => {
                            const matchUnit = selectedUnit === 'all' || r.unit === selectedUnit;
                            const matchSearch = r.name.includes(searchTerm) || r.unit.includes(searchTerm) || (r.bus_assigned || '').includes(searchTerm);
                            return r.unit === unit && matchUnit && matchSearch;
                        }));
                        // 如果搜尋狀態下該單位沒有符合條件的人，且不是選中該單位，則隱藏 (避免搜尋時顯示一堆空的)
                        // 但如果是預設狀態或選中該單位，則必須顯示 (滿足使用者 "民雄就算沒資料也要出現" 的要求)
                        if (searchTerm && unitRegs.length === 0 && selectedUnit === 'all') return null;
                        
                        const theme = UNIT_COLOR_THEMES[index % UNIT_COLOR_THEMES.length];
                        const cashTotal = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.payment_method === PaymentMethod.CASH).reduce((sum, r) => sum + (r.amount_due || 0), 0);
                        const transferTotal = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.payment_method === PaymentMethod.TRANSFER).reduce((sum, r) => sum + (r.amount_due || 0), 0);
                        const goCheckedCount = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.is_checked_in_to).length;
                        const backCheckedCount = unitRegs.filter(r => r.status !== RegStatus.CANCELLED && r.is_checked_in_back).length;

                        return (
                            <div key={unit} className={`bg-white border-2 ${theme.border} rounded shadow-sm p-0 mx-0 mt-2 w-full max-w-full animate-in fade-in slide-in-from-bottom-2 overflow-hidden min-w-0`}>
                                {/* Depth 1: Header - Level 1 styling */}
                                <div onClick={() => toggleUnitCollapse(unit)} className={`w-full flex items-center justify-between px-3 py-2.5 ${theme.title} border-b-2 ${theme.border} rounded-t cursor-pointer hover:brightness-95 transition-all min-w-0`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h3 className="font-black text-xs md:text-sm lg:text-base uppercase flex items-center gap-1.5 truncate">
                                            {unit}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {collapsedUnits[unit] ? <ChevronDown className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />}
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {!collapsedUnits[unit] && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }} 
                                            animate={{ height: 'auto', opacity: 1 }} 
                                            exit={{ height: 0, opacity: 0 }} 
                                            className={`${theme.content} overflow-hidden min-w-0 w-full`}
                                        >
                                            {/* Statistics - Compressed for Mobile, Level 2 header style */}
                                            <div className={`px-3 py-2 border-b-2 ${theme.border} flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center min-w-0 w-full bg-white/40`}>
                                                <div className="flex flex-wrap gap-2 w-full sm:w-auto min-w-0">
                                                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border-2 border-black/5 shadow-sm text-[10px] md:text-xs font-black text-slate-600 min-w-0 truncate">
                                                        <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">乘車:{unitRegs.length}人</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border-2 border-black/5 shadow-sm text-[10px] md:text-xs font-black text-emerald-700 min-w-0 truncate">
                                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <span className="truncate">去{goCheckedCount}/回{backCheckedCount}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border-2 border-black/5 shadow-sm text-[10px] md:text-xs font-black text-rose-700 min-w-0 truncate">
                                                        <DollarSign className="w-3.5 h-3.5 text-rose-500 shrink-0" /> <span className="truncate">轉${transferTotal.toLocaleString()} / 現${cashTotal.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-0 md:p-1 w-full max-w-full min-w-0 overflow-hidden">
                                                {unitRegs.length === 0 ? (
                                                    <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded m-2 p-6 text-center">
                                                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">目前尚無報名資料</p>
                                                    </div>
                                                ) : viewMode === 'table' ? (
                                                    <div className="w-full max-w-full min-w-0 flex flex-col overflow-hidden">
                                                        {/* Mobile Scroll Assist */}
                                                        <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-white/50 border-b-2 border-slate-200 min-w-0 w-full">
                                                            <span className="text-[10px] font-black text-slate-400 animate-pulse flex items-center gap-1 truncate">
                                                                <Smartphone className="w-3.5 h-3.5 shrink-0" /> 左右滑動表格
                                                            </span>
                                                            <div className="flex gap-2 shrink-0">
                                                                <button onClick={() => scroll(unit, 'left')} className="p-1.5 bg-white border-2 border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                                                                <button onClick={() => scroll(unit, 'right')} className="p-1.5 bg-white border-2 border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                                                            </div>
                                                        </div>

                                                        {/* 表格水平捲動容器（Shell-Zero 相容關鍵） - Rule 4.1 Compliance */}
                                                        <div 
                                                            ref={el => scrollRefs.current[unit] = el}
                                                            className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar min-w-0 w-full"
                                                        >
                                                            <table className={`min-w-full w-max table-auto border-separate border-spacing-0 ${theme.content} border-2 ${theme.border} rounded shadow-sm`}>
                                                                <thead className={`${theme.header} border-b-2 ${theme.border}`}>
                                                                    <tr className="text-[10px] md:text-xs font-black text-left whitespace-nowrap uppercase tracking-wider">
                                                                        <th className={`px-2 py-4 border-r-2 ${theme.border} text-center w-[40px] ${theme.header}`}>編號</th>
                                                                        <th 
                                                                            onClick={() => handleSort('name')}
                                                                            className={`px-3 py-4 sticky left-0 z-40 ${theme.header} border-r-2 ${theme.border} shadow-[6px_0_12px_rgba(0,0,0,0.15)] w-[100px] md:w-32 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                {t('姓名', 'Name')}
                                                                                {getSortIcon('name')}
                                                                            </div>
                                                                        </th>
                                                                        {displayMode === 'normal' && (
                                                                            <>
                                                                                <th 
                                                                                    onClick={() => handleSort('bus_assigned')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[150px] md:w-44 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        上車地點和時間
                                                                                        {getSortIcon('bus_assigned')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('ordinance_item')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[150px] md:w-44 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        教儀場次
                                                                                        {getSortIcon('ordinance_item')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('trip_type')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[100px] md:w-32 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        {t('行程', 'Trip')}
                                                                                        {getSortIcon('trip_type')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('payment_method')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[80px] md:w-28 text-center cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        付費
                                                                                        {getSortIcon('payment_method')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('amount_due')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[80px] md:w-28 text-right cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-end">
                                                                                        金額
                                                                                        {getSortIcon('amount_due')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('status')}
                                                                                    className={`px-3 py-4 border-r-2 ${theme.border} w-[80px] md:w-28 text-center cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        收費
                                                                                        {getSortIcon('status')}
                                                                                    </div>
                                                                                </th>
                                                                            </>
                                                                        )}
                                                                        {displayMode === 'fee' && (
                                                                            <>
                                                                                <th 
                                                                                    onClick={() => handleSort('payment_method')}
                                                                                    className={`px-3 py-3 text-center border-r-2 ${theme.border} w-[80px] md:w-28 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        付費
                                                                                        {getSortIcon('payment_method')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('amount_due')}
                                                                                    className={`px-3 py-3 text-right border-r-2 ${theme.border} w-[80px] md:w-28 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-end">
                                                                                        金額
                                                                                        {getSortIcon('amount_due')}
                                                                                    </div>
                                                                                </th>
                                                                                <th 
                                                                                    onClick={() => handleSort('status')}
                                                                                    className={`px-3 py-3 text-center border-r-2 ${theme.border} w-[80px] md:w-28 cursor-pointer hover:bg-black/5 transition-colors`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        收費
                                                                                        {getSortIcon('status')}
                                                                                    </div>
                                                                                </th>
                                                                            </>
                                                                        )}
                                                                        {displayMode === 'checkin' && (
                                                                            <>
                                                                                <th className={`px-3 py-3 text-center border-r-2 ${theme.border} w-[70px] md:w-24`}>去程</th>
                                                                                <th className={`px-3 py-3 text-center w-[70px] md:w-24`}>回程</th>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className={`text-[10px] md:text-xs font-bold whitespace-nowrap`}>
                                                                    {unitRegs.map((reg, regIndex) => (
                                                                        <tr key={reg.reg_id} className={`hover:bg-black/5 transition-colors ${reg.status === RegStatus.CANCELLED ? 'opacity-40 grayscale italic' : ''}`}>
                                                                            <td className={`px-2 py-2 border-r-2 border-b-[1px] ${theme.border} text-center text-slate-400 font-mono w-[40px]`}>{regIndex + 1}</td>
                                                                            <td 
                                                                                className={`px-3 py-2 sticky left-0 z-30 ${theme.content} border-r-2 border-b-[1px] ${theme.border} shadow-[6px_0_12px_rgba(0,0,0,0.15)] font-black text-slate-900 cursor-pointer truncate`} 
                                                                                onClick={() => handlePaymentClick(reg)}
                                                                            >
                                                                                {protectNames ? maskName(reg.name) : reg.name}
                                                                            </td>
                                                                            {displayMode === 'normal' && (
                                                                                <>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-slate-700 truncate`}>
                                                                                        {(() => {
                                                                                            const info = getStopInfo(reg.bus_assigned);
                                                                                            if (!info) return '-';
                                                                                            return `${info.code}${info.location}${info.time ? info.time : ''}`;
                                                                                        })()}
                                                                                    </td>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-indigo-700 truncate`}>{translateOrdinance(reg.ordinance_item)}</td>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-emerald-700 truncate`}>{translateTripType(reg.trip_type)}</td>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-center truncate`}>{getMethodBadge(reg)}</td>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-right font-mono text-slate-900 truncate`}>${(reg.amount_due || 0).toLocaleString()}</td>
                                                                                    <td className={`px-3 py-2 border-r-2 border-b-[1px] ${theme.border} text-center truncate`}>{getStatusBadge(reg)}</td>
                                                                                </>
                                                                            )}
                                                                            {displayMode === 'fee' && (
                                                                                <>
                                                                                    <td className={`px-3 py-2 text-center border-r-2 border-b-[1px] ${theme.border} truncate`}>{getMethodBadge(reg)}</td>
                                                                                    <td className={`px-3 py-2 text-right font-mono border-r-2 border-b-[1px] ${theme.border} text-slate-900 truncate`}>${(reg.amount_due || 0).toLocaleString()}</td>
                                                                                    <td className={`px-3 py-2 text-center border-r-2 border-b-[1px] ${theme.border} truncate`}>{getStatusBadge(reg)}</td>
                                                                                </>
                                                                            )}
                                                                            {displayMode === 'checkin' && (
                                                                                <>
                                                                                    <td className={`px-3 py-2 text-center border-r-2 border-b-[1px] ${theme.border}`}>
                                                                                        <button onClick={() => handleToggleCheckIn(reg, 'to')} className={`p-1.5 rounded-full transition-all ${reg.is_checked_in_to ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/50 text-slate-300'} hover:scale-110`}>
                                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className={`px-3 py-2 text-center border-r-2 border-b-[1px] ${theme.border}`}>
                                                                                        <button onClick={() => handleToggleCheckIn(reg, 'back')} className={`p-1.5 rounded-full transition-all ${reg.is_checked_in_back ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/50 text-slate-300'} hover:scale-110`}>
                                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                </>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 min-w-0 w-full">
                                                        {unitRegs.map((reg) => (
                                                            <div key={reg.reg_id} onClick={() => handlePaymentClick(reg)} className={`p-3 rounded border-2 ${theme.border} bg-white shadow-sm flex flex-col gap-2.5 active:scale-[0.98] transition-all min-w-0 w-full`}>
                                                                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-2 min-w-0">
                                                                    <div className="min-w-0"><div className="font-black text-xs md:text-sm text-slate-900 truncate">{protectNames ? maskName(reg.name) : reg.name}</div><div className="text-[10px] font-black text-slate-400 uppercase">{translateIdentityType(reg.identity_type as string)}</div></div>
                                                                    <div className="flex gap-1.5 shrink-0 ml-2">
                                                                        {reg.bus_assigned && <span className="bg-indigo-900 text-white px-2 py-0.5 rounded text-[10px] font-black shrink-0">{reg.bus_assigned.charAt(0)}車</span>}
                                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black shrink-0">{translateTripType(reg.trip_type)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 min-w-0">
                                                                    <div className={`${theme.content} p-2 rounded border-2 ${theme.border} min-w-0`}><div className="text-[10px] text-slate-400 font-black mb-1 uppercase truncate">站別</div><div className="text-[11px] font-bold text-slate-700 truncate">
                                                                        {(() => {
                                                                            const info = getStopInfo(reg.bus_assigned);
                                                                            if (!info) return '-';
                                                                            return `${info.code}${info.location}${info.time ? info.time : ''}`;
                                                                        })()}
                                                                    </div></div>
                                                                    <div className={`${theme.content} p-2 rounded border-2 ${theme.border} min-w-0`}><div className="text-[10px] text-slate-400 font-black mb-1 uppercase truncate">教儀</div><div className="text-[11px] font-bold text-slate-700 truncate">{translateOrdinance(reg.ordinance_item)}</div></div>
                                                                </div>
                                                                {displayMode === 'fee' && (
                                                                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded border-2 border-slate-200 min-w-0 w-full gap-2"><div className="flex items-center gap-2 min-w-0 shrink-0">{getMethodBadge(reg)}<span className="text-xs font-black">${(reg.amount_due || 0).toLocaleString()}</span></div><div className="shrink-0">{getStatusBadge(reg)}</div></div>
                                                                )}
                                                                {displayMode === 'checkin' && (
                                                                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(reg, 'to'); }} className={`flex-1 h-9 rounded font-black text-xs transition-all ${reg.is_checked_in_to ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}`}>去程</button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(reg, 'back'); }} className={`flex-1 h-9 rounded font-black text-xs transition-all ${reg.is_checked_in_back ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}`}>回程</button>
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

            {selectedPaymentReg && (
                <PaymentInfoModal
                    key={`payment-${selectedPaymentReg.reg_id}`}
                    currentReg={selectedPaymentReg}
                    allRegistrations={registrations}
                    settings={settings}
                    onClose={() => setSelectedPaymentReg(null)}
                    onRefresh={() => {}}
                />
            )}

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
