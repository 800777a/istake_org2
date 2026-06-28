
import React, { useState, useMemo, useEffect } from 'react';
import { Registration, GlobalSettings, PaymentMethod, RegStatus, BusConfig, EventData, TripType, User as UserType } from '../../types';
import { Search, User, Globe, ChevronUp, ChevronDown, ArrowUpDown, ArrowRightCircle, ArrowLeftCircle, Lock, Unlock, RotateCcw, Smartphone, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { maskName } from '../../utils/validation';
import PaymentInfoModal from '../PaymentInfoModal';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
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
    const [searchUnit, setSearchUnit] = useState('');
    const [searchName, setSearchName] = useState('');
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

    const allStats = useMemo(() => {
        const activeRegs = registrations.filter(r => r.status !== RegStatus.CANCELLED);
        const cash = activeRegs.reduce((sum, r) => sum + (r.payment_method === PaymentMethod.CASH ? (r.amount_due || 0) : 0), 0);
        const retained = activeRegs.reduce((sum, r) => sum + (r.trip_type === TripType.RETAINED ? (r.amount_due || 0) : 0), 0);
        const transfer = activeRegs.reduce((sum, r) => sum + (r.payment_method === PaymentMethod.TRANSFER ? (r.amount_due || 0) : 0), 0);
        
        return {
            go: activeRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO)).length,
            back: activeRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK)).length,
            self: activeRegs.filter(r => r.trip_type === TripType.SELF_MANAGED).length,
            goChecked: activeRegs.filter(r => r.is_checked_in_to).length,
            backChecked: activeRegs.filter(r => r.is_checked_in_back).length,
            transfer,
            cash,
            retained,
            total: cash + retained
        };
    }, [registrations]);

    // Status / Alert state
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
    const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
        setStatusMsg({ text, type });
        setTimeout(() => setStatusMsg({ text: '', type: null }), 3000);
    };

    // Confirm Logic
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'to' | 'back' | null }>({ isOpen: false, type: null });

    // Expand/Collapse state for units
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    const toggleUnitCollapse = (unit: string) => {
        setCollapsedUnits(prev => ({
            ...prev,
            [unit]: !prev[unit]
        }));
    };

    // Initial check-in triggers
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

    const [resetLoading, setResetLoading] = useState<string | null>(null);

    const executeGlobalReset = async (type: 'to' | 'back') => {
        if (!activeEvent?.event_id) return;
        
        setResetLoading(type);
        setConfirmState({ isOpen: false, type: null });
        
        try {
            const confirmMsg = type === 'to' ? '去程' : '回程';
            const result = await batchUpdateCheckIn(activeEvent.event_id, null, type);
            if (result.success) {
                showStatus(t(`全域${confirmMsg}報到資料已重置`, `Global ${type} check-in reset`), 'success');
            } else {
                showStatus(t(`重置失敗: ${result.message}`, `Reset failed: ${result.message}`), 'error');
                console.error('Reset failure:', result);
            }
        } catch (error) {
            console.error('Global reset error:', error);
            showStatus(t('重置發生意外錯誤', 'Unexpected error during reset'), 'error');
        } finally {
            setResetLoading(null);
        }
    };

    const handleGlobalReset = (type: 'to' | 'back') => {
        setConfirmState({ isOpen: true, type });
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

    // Dicts for specific ENums/values
    const translateTripType = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = {
            '來回': 'Round Trip',
            '去程': 'Go Only',
            '回程': 'Back Only',
            '自行前往': 'Self-Guided',
            '自行': 'Self-Guided',
            '自理': 'Make your own way'
        };
        return dict[val] || val;
    };

    const translateIdentityType = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = {
            '成人': 'Adult',
            '敬老': 'Senior',
            '學生': 'Student',
            '青少': 'Youth',
            '嬰兒': 'Infant',
            '單身': 'Single',
            '團體': 'Group',
            '工作人員': 'Staff',
            '首次參加': 'First Time',
            '延用': 'Extended',
            '傳教': 'Missionary'
        };
        return dict[val] || val;
    };

    const translateOrdinance = (val: string) => {
        if (lang === 'zh') return val;
        const dict: Record<string, string> = {
            '洗禮': 'Baptism',
            '證實': 'Confirmation',
            '先行禮': 'Initiatory',
            '恩道門': 'Endowment',
            '印證': 'Sealing',
            '不作教儀': 'None',
            '專職傳教士': 'Missionary'
        };
        return dict[val] || val;
    };

    // Sort Units based on settings
    const distinctUnits = Array.from(new Set(registrations.map(r => r.unit))) as string[];
    const sortedUnits = distinctUnits.sort((a, b) => {
        const idxA = settings.units.indexOf(a);
        const idxB = settings.units.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const handleUnitSelect = (unit: string) => {
        setSearchUnit(unit);
        if (unit) {
            setTimeout(() => {
                const el = document.getElementById(`unit-header-${unit}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    };

    const handleNameSearch = () => {
        if (!searchName.trim()) return;
        const target = registrations.find(r => r.name.includes(searchName.trim()));
        if (target) {
            setTimeout(() => {
                const el = document.getElementById(`reg-row-${target.reg_id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-yellow-200');
                    setTimeout(() => el.classList.remove('bg-yellow-200'), 2000);
                }
            }, 100);
        } else {
            showStatus(t('查詢無此資料', 'No matching data found'), 'info');
        }
    };

    const isWaiting = (reg: Registration) => {
        if (reg.trip_type === TripType.RETAINED || reg.trip_type === TripType.SELF_MANAGED) return false;
        
        const capacity = vehicleStats?.capacity || ((activeEvent?.busConfigs && activeEvent.busConfigs.length > 0) ? activeEvent.busConfigs.reduce((sum, b) => sum + (b.capacity || 42), 0) : ((activeEvent?.bus_count || 0) * 42));
        const rank = vehicleRanks.get(reg.reg_id);
        
        if (rank !== undefined && rank > capacity) return true;
        return false;
    };

    const handlePaymentClick = (reg: Registration) => {
        if (eventStatus === 'confirmed' || eventStatus === 'planning') {
            if (isWaiting(reg)) {
                showStatus(t('候補狀態暫不開放編輯付款資料', 'Waiting list participants cannot edit payment info yet'), 'info');
                return;
            }
            setSelectedPaymentReg(reg);
        }
    };

    // Helper to find stop location for tooltip
    const getStopInfo = (code: string | undefined): { code: string; location: string; time?: string } | undefined => {
        if (!code || !busConfigs) return undefined;
        // Iterate all buses to find the stop code
        for (const bus of busConfigs) {
            const stop = (bus.stops || []).find(s => s.code === code);
            if (stop) return { code: stop.code, location: stop.location, time: stop.time };
            if (bus.name === code) return { code: bus.name, location: t(`整車 (${bus.name})`, `Full Bus (${bus.name})`), time: undefined };
        }
        return undefined;
    };

    const getMethodBadge = (reg: Registration) => {
        if (reg.amount_due === 0) return <span className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-500 font-bold border border-gray-200 font-sans">{t('免付', 'Free')}</span>;
        
        switch (reg.payment_method) {
            case PaymentMethod.CASH:
                return <span className="px-2 py-0.5 rounded text-sm bg-yellow-100 text-yellow-800 font-bold border border-yellow-200 font-sans">{t('現金', 'Cash')}</span>;
            case PaymentMethod.TRANSFER:
                return <span className="px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-700 font-bold border border-blue-200 font-sans">{t('轉帳', 'Transfer')}</span>;
            case PaymentMethod.EXTENDED:
                return <span className="px-2 py-0.5 rounded text-sm bg-gray-200 text-gray-700 font-bold border border-gray-300 font-sans">{t('延用', 'Extended')}</span>;
            default:
                if (reg.trip_type === TripType.RETAINED) {
                    return <span className="px-2 py-0.5 rounded text-sm bg-purple-100 text-purple-700 font-bold border border-purple-200 font-sans">{t('留用', 'Roll over')}</span>;
                }
                return <span className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-500 border border-gray-200 font-sans">{reg.payment_method}</span>;
        }
    };

    const getStatusBadge = (reg: Registration) => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED) 
            return <span className="px-2 py-0.5 rounded text-sm bg-gray-200 text-gray-700 font-bold border border-gray-300 font-sans">{t('免收', 'Free')}</span>;
        
        if (reg.is_paid) {
            return <span className="px-2 py-0.5 rounded text-sm bg-green-100 text-green-700 font-bold border border-green-200 font-sans">{t('已收', 'Paid')}</span>;
        } else {
            return <span className="px-2 py-0.5 rounded text-sm bg-red-100 text-red-700 font-bold border border-red-200 font-sans">{t('未收', 'Unpaid')}</span>;
        }
    };

    const rainbowColors = [
        { header: 'bg-red-100 border-red-200 text-red-900', rowHover: 'hover:bg-red-50', sticky: 'bg-red-50/90', divide: 'divide-red-200' },
        { header: 'bg-orange-100 border-orange-200 text-orange-900', rowHover: 'hover:bg-orange-50', sticky: 'bg-orange-50/90', divide: 'divide-orange-200' },
        { header: 'bg-yellow-100 border-yellow-200 text-yellow-900', rowHover: 'hover:bg-yellow-50', sticky: 'bg-yellow-50/90', divide: 'divide-yellow-200' },
        { header: 'bg-green-100 border-green-200 text-green-900', rowHover: 'hover:bg-green-50', sticky: 'bg-green-50/90', divide: 'divide-green-200' },
        { header: 'bg-blue-100 border-blue-200 text-blue-900', rowHover: 'hover:bg-blue-50', sticky: 'bg-blue-50/90', divide: 'divide-blue-200' },
        { header: 'bg-indigo-100 border-indigo-200 text-indigo-900', rowHover: 'hover:bg-indigo-50', sticky: 'bg-indigo-50/90', divide: 'divide-indigo-200' },
        { header: 'bg-purple-100 border-purple-200 text-purple-900', rowHover: 'hover:bg-purple-50', sticky: 'bg-purple-50/90', divide: 'divide-purple-200' },
    ];

    const isClosed = eventStatus === 'cancelled' || (activeEvent?.is_registration_open === false);
    
    // V310: Determine if payment info should be shown/editable
    const shouldShowPayment = useMemo(() => {
        if (!activeEvent) return false;
        const mode = activeEvent.paymentDisplayMode || 'forced';
        if (mode === 'none') return false;
        if (mode === 'confirmed_only' && activeEvent.status !== 'confirmed') return false;
        return true;
    }, [activeEvent]);

    const deadlineDisplay = activeEvent?.registrationDeadline 
        ? new Date(activeEvent.registrationDeadline).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '未設定';

    const { vehicleStats, ordinanceStats } = useStats(activeEvent, registrations);

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {selectedPaymentReg && (
                <PaymentInfoModal 
                    key={`${selectedPaymentReg.reg_id}-${Date.now()}`}
                    currentReg={selectedPaymentReg}
                    allRegistrations={registrations}
                    settings={settings}
                    onClose={() => setSelectedPaymentReg(null)}
                    onRefresh={() => {}} 
                />
            )}

            {activeEvent && vehicleStats && (
                <RegistrationDashboard 
                    activeEvent={activeEvent}
                    eventStats={vehicleStats}
                    ordinanceStats={ordinanceStats}
                    deadlineDisplay={deadlineDisplay}
                    isClosed={isClosed}
                    lang={lang}
                />
            )}

            {/* Search Block - Red */}
            <div className="bg-red-50 border border-red-500 rounded-lg p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="font-bold text-red-900 flex items-center shrink-0">
                            <User className="w-4 h-4 mr-2" /> 
                            {t('名單', 'Registration')}
                        </div>
                        <button 
                            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                            className="flex items-center justify-center bg-white border border-red-300 text-red-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-100 shadow-sm transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5 mr-1" />
                            {lang === 'zh' ? '中文/ENG' : 'ENG/中文'}
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <select value={searchUnit} onChange={e => handleUnitSelect(e.target.value)} className="border border-red-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 w-full md:w-40 bg-white text-red-900 font-bold">
                            <option value="">{t('搜尋單位', 'Search Unit')}</option>
                            {settings.units.map(u => <option key={u} value={u}>{t(u, u)}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-red-900" />
                                <input type="text" placeholder={t('搜尋姓名', 'Search Name')} value={searchName} onChange={e => setSearchName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNameSearch()} className="pl-9 pr-4 py-2 border border-red-500 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-300 w-full md:w-48 text-red-900 placeholder-red-300" />
                            </div>
                            <button onClick={handleNameSearch} className="bg-white border border-red-500 text-red-900 px-3 py-2 rounded-full text-xs font-bold hover:bg-red-100 whitespace-nowrap shadow-sm touch-manipulation">{t('搜尋', 'Search')}</button>
                        </div>
                    </div>
                </div>
                {shouldShowPayment && (eventStatus === 'confirmed' || eventStatus === 'planning') && (
                    <div className="mt-3 pt-2 border-t border-red-200 text-sm font-bold text-red-700 text-center">
                        * {t('點擊下方 姓名 可編輯 付款方式', 'Click on a Name below to edit Payment Method')} *
                    </div>
                )}
            </div>
            
            {/* Global Operation Area - Only for Stake Admin */}
            {currentUser?.role === 'stake_admin' && (
                <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-yellow-100 p-2 rounded-lg">
                                <Smartphone className="w-5 h-5 text-yellow-700" />
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-yellow-900 leading-tight">主辦管理控制</h4>
                                <p className="text-[10px] text-yellow-700 font-medium">全域報到重置與鎖定功能</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <button 
                                type="button"
                                disabled={resetLoading !== null}
                                onClick={() => handleGlobalReset('to')} 
                                className={`flex-1 md:flex-none border border-yellow-400 bg-white hover:bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center ${resetLoading === 'to' ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${resetLoading === 'to' ? 'animate-spin' : ''}`} /> 去程重置
                            </button>
                            <button 
                                type="button"
                                disabled={resetLoading !== null}
                                onClick={() => handleGlobalReset('back')} 
                                className={`flex-1 md:flex-none border border-yellow-400 bg-white hover:bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center ${resetLoading === 'back' ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${resetLoading === 'back' ? 'animate-spin' : ''}`} /> 回程重置
                            </button>
                            <button 
                                type="button"
                                onClick={() => setGlobalLockTo(!globalLockTo)} 
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center ${globalLockTo ? 'bg-red-500 text-white border-red-600' : 'bg-white border-yellow-400 text-yellow-800'}`}
                            >
                                {globalLockTo ? <Lock className="w-3.5 h-3.5 mr-1.5" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />} 
                                {globalLockTo ? '去程已鎖' : '鎖定去程'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setGlobalLockBack(!globalLockBack)} 
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center ${globalLockBack ? 'bg-red-500 text-white border-red-600' : 'bg-white border-yellow-400 text-yellow-800'}`}
                            >
                                {globalLockBack ? <Lock className="w-3.5 h-3.5 mr-1.5" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />} 
                                {globalLockBack ? '回程已鎖' : '鎖定回程'}
                            </button>
                        </div>

                        {/* Stats Data Area - Moved to a new line for better visibility */}
                        <div className="w-full mt-4 pt-3 border-t border-yellow-200 flex flex-wrap gap-2 text-sm md:text-base font-bold">
                            <div className="bg-white/80 px-2.5 py-1.5 rounded border border-yellow-300 text-yellow-900 shadow-sm">
                                (去程:{allStats.go}人,回程:{allStats.back}人,自理:{allStats.self}人)
                            </div>
                            <div className="bg-blue-50/80 px-2.5 py-1.5 rounded border border-blue-200 text-blue-800 shadow-sm text-center">
                                (去程報到:{allStats.goChecked}人,回程報到:{allStats.backChecked}人)
                            </div>
                            <div className="bg-purple-50/80 px-2.5 py-1.5 rounded border border-purple-200 text-purple-800 shadow-sm text-center">
                                (轉帳: {allStats.transfer.toLocaleString().replace('NT$', '')})
                            </div>
                            <div className="bg-green-50/80 px-2.5 py-1.5 rounded border border-green-200 text-green-800 shadow-sm text-center">
                                (現金: {allStats.cash.toLocaleString().replace('NT$', '')})
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Container - Split by Unit for Better Scrolling on Mobile */}
            <div className="space-y-6">
                {sortedUnits.map((unit, index) => {
                    const unitRegs = registrations.filter(r => r.unit === unit);
                    if (unitRegs.length === 0) return null;
                    
                    const colorTheme = rainbowColors[index % rainbowColors.length];

                    // Calculate Totals
                    const cashTotal = unitRegs
                        .filter(r => r.payment_method === PaymentMethod.CASH && r.status !== RegStatus.CANCELLED)
                        .reduce((sum, r) => sum + r.amount_due, 0);
                    const transferTotal = unitRegs
                        .filter(r => r.payment_method === PaymentMethod.TRANSFER && r.status !== RegStatus.CANCELLED)
                        .reduce((sum, r) => sum + r.amount_due, 0);

                    // V300: Calculate Trip Counts - Exclude 'RETAINED' (留用) as they won't take the bus
                    const goCount = unitRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO) && r.status !== RegStatus.CANCELLED).length;
                    const backCount = unitRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK) && r.status !== RegStatus.CANCELLED).length;
                    const selfCount = unitRegs.filter(r => r.trip_type === TripType.SELF_MANAGED && r.status !== RegStatus.CANCELLED).length;

                    // Calculate Checked-in Counters
                    const goCheckedCount = unitRegs.filter(r => r.is_checked_in_to && r.status !== RegStatus.CANCELLED).length;
                    const backCheckedCount = unitRegs.filter(r => r.is_checked_in_back && r.status !== RegStatus.CANCELLED).length;

                    // Support Sorting
                                                    let sortedUnitRegs = [...unitRegs];
                                                    if (sortConfig) {
                                                        const primarySort = (a: Registration, b: Registration) => {
                                                            let valA: any = '';
                                                            let valB: any = '';
                                                            
                                                            switch (sortConfig.key) {
                                                                case 'serial':
                                                                    valA = a.serial_number || 0;
                                                                    valB = b.serial_number || 0;
                                                                    return (valA < valB ? -1 : (valA > valB ? 1 : 0));
                                                                case 'name':
                                                                    return (a.name || '').localeCompare(b.name || '', 'zh-Hant');
                                                                case 'ordinance':
                                                                    valA = (a.ordinance_item || '') + (a.ceremony_session || '');
                                                                    valB = (b.ordinance_item || '') + (b.ceremony_session || '');
                                                                    return valA.localeCompare(valB, 'zh-Hant');
                                                                case 'trip':
                                                                    valA = a.trip_type || '';
                                                                    valB = b.trip_type || '';
                                                                    return valA.localeCompare(valB, 'zh-Hant');
                                                                case 'category':
                                                                    valA = a.identity_type || '';
                                                                    valB = b.identity_type || '';
                                                                    return valA.localeCompare(valB, 'zh-Hant');
                                                                case 'payment':
                                                                    const getPaymentOrder = (r: Registration) => {
                                                                        if (r.amount_due === 0) return 0;
                                                                        const pMap = { [PaymentMethod.TRANSFER]: 1, [PaymentMethod.CASH]: 2, [PaymentMethod.EXTENDED]: 3 };
                                                                        return pMap[r.payment_method] || 99;
                                                                    };
                                                                    return getPaymentOrder(a) - getPaymentOrder(b);
                                                                case 'amount':
                                                                    return (a.amount_due || 0) - (b.amount_due || 0);
                                                                case 'receipt':
                                                                    return (a.is_paid ? 1 : 0) - (b.is_paid ? 1 : 0);
                                                                default:
                                                                    return 0;
                                                            }
                                                        };

                                                        sortedUnitRegs.sort((a, b) => {
                                                            const res = primarySort(a, b);
                                                            if (res === 0) {
                                                                // Secondary Sort: Keep families together
                                                                return (a.family_group_id || '').localeCompare(b.family_group_id || '');
                                                            }
                                                            return sortConfig.direction === 'asc' ? res : -res;
                                                        });
                                                    }

                    return (
                        <div key={unit} className={`bg-white rounded-xl shadow-sm border ${colorTheme.header.split(' ')[1]} overflow-hidden`}>
                            {/* Unit Header with Flex Wrap - Requested Format */}
                            <div id={`unit-header-${unit}`} className={`${colorTheme.header} p-3 border-b flex flex-wrap items-center gap-2 text-sm`}>
                                <button 
                                    onClick={() => toggleUnitCollapse(unit)}
                                    className="p-1 hover:bg-black/5 rounded-md transition-colors mr-1"
                                >
                                    {collapsedUnits[unit] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                                <h3 className="font-bold text-base mr-1">{t(unit, unit)}</h3>
                                
                                <span className={`text-sm font-sans bg-white px-2 py-1 rounded border font-bold shadow-sm ${colorTheme.header.split(' ')[1]} ${colorTheme.header.split(' ')[2]}`}>
                                    {t(`(去程:${goCount}人,回程:${backCount}人,自理:${selfCount}人)`, `(Go:${goCount},Back:${backCount},Self:${selfCount})`)}
                                </span>

                                <span className={`text-sm font-sans bg-white px-2 py-1 rounded border font-bold shadow-sm ${colorTheme.header.split(' ')[1]} text-blue-700 flex items-center`}>
                                    {t(`(轉帳:${transferTotal.toLocaleString().replace('NT$', '')})`, `(Transfer:${transferTotal.toLocaleString()})`)}
                                </span>

                                <span className={`text-sm font-sans bg-white px-2 py-1 rounded border font-bold shadow-sm ${colorTheme.header.split(' ')[1]} text-gray-800 flex items-center`}>
                                    {t(`(現金:${cashTotal.toLocaleString().replace('NT$', '')})`, `(Cash:${cashTotal.toLocaleString()})`)}
                                </span>
                            </div>
                            
                            {/* Scrollable Table Area */}
                            {!collapsedUnits[unit] && (
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className={`${colorTheme.sticky} border-b ${colorTheme.header.split(' ')[2]} font-bold`}>
                                        <tr>
                                            <th onClick={() => handleSort('serial')} className="p-3 w-16 text-center text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center justify-center">{t('編號', 'No.')} {getSortIcon('serial')}</div>
                                            </th>
                                            <th onClick={() => handleSort('name')} className={`p-3 w-24 sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r ${colorTheme.header.split(' ')[1]} ${colorTheme.sticky} text-sm font-bold font-sans cursor-pointer hover:bg-black/5`}>
                                                <div className="flex items-center">{t('姓名', 'Name')} {getSortIcon('name')}</div>
                                            </th>
                                            <th className="p-3 w-40 text-sm font-bold font-sans">{t('上車地點和時間', 'Boarding Info')}</th>
                                            <th onClick={() => handleSort('ordinance')} className="p-3 w-32 text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center">{t('教儀場次', 'Ordinance Session')} {getSortIcon('ordinance')}</div>
                                            </th>
                                            <th onClick={() => handleSort('trip')} className="p-3 w-20 text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center">{t('行程', 'Trip')} {getSortIcon('trip')}</div>
                                            </th>
                                            <th onClick={() => handleSort('category')} className="p-3 w-24 text-left text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center">{t('收費', 'Category')} {getSortIcon('category')}</div>
                                            </th>
                                            <th onClick={() => handleSort('payment')} className="p-3 w-24 text-center text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center justify-center">{t('付款', 'Payment')} {getSortIcon('payment')}</div>
                                            </th>
                                            <th onClick={() => handleSort('amount')} className="p-3 text-right w-20 text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center justify-end">{t('金額', 'Amount')} {getSortIcon('amount')}</div>
                                            </th>
                                            <th onClick={() => handleSort('receipt')} className="p-3 w-24 text-center text-sm font-bold font-sans cursor-pointer hover:bg-black/5">
                                                <div className="flex items-center justify-center">{t('收款', 'Receipt')} {getSortIcon('receipt')}</div>
                                            </th>
                                            <th className="p-3 w-24 text-center text-sm font-bold font-sans">{t(`去程報到:${goCheckedCount}人`, `Go Check:${goCheckedCount}`)}</th>
                                            <th className="p-3 w-24 text-center text-sm font-bold font-sans">{t(`回程報到:${backCheckedCount}人`, `Back Check:${backCheckedCount}`)}</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${colorTheme.divide}`}>
                                        {sortedUnitRegs.map(reg => {
                                            // 判斷車位狀態邏輯
                                            let bookingStatus = '處理中';
                                            let bookingColor = 'bg-gray-100 text-gray-500';
                                            
                                            if (reg.trip_type === TripType.RETAINED) {
                                                bookingStatus = '留用';
                                                bookingColor = 'bg-purple-100 text-purple-900 border-purple-300';
                                            } else if (reg.trip_type === TripType.SELF_MANAGED) {
                                                bookingStatus = '自理';
                                                bookingColor = 'bg-blue-50 text-blue-800 border-blue-200';
                                            } else {
                                                const capacity = vehicleStats?.capacity || ((activeEvent?.busConfigs && activeEvent.busConfigs.length > 0) ? activeEvent.busConfigs.reduce((sum, b) => sum + (b.capacity || 42), 0) : ((activeEvent?.bus_count || 0) * 42));
                                                const isOverduePayment = !reg.is_paid && activeEvent?.paymentDeadlineDays && new Date(reg.created_at).getTime() + (activeEvent.paymentDeadlineDays * 86400000) < Date.now();
                                                const isOverdueReg = activeEvent?.registrationDeadline && new Date(activeEvent.registrationDeadline).getTime() < Date.now();
                                                const rank = vehicleRanks.get(reg.reg_id);
                                                
                                                if (rank !== undefined) {
                                                    if (rank <= capacity) {
                                                        if (isOverduePayment) {
                                                            bookingStatus = '逾期繳費';
                                                            bookingColor = 'bg-yellow-100 text-yellow-800';
                                                        } else {
                                                            bookingStatus = '成功';
                                                            bookingColor = 'bg-green-100 text-green-700';
                                                        }
                                                    } else {
                                                        if (isOverdueReg) {
                                                            bookingStatus = '候補失敗';
                                                            bookingColor = 'bg-red-100 text-red-700';
                                                        } else {
                                                            bookingStatus = '候補';
                                                            bookingColor = 'bg-orange-100 text-orange-700';
                                                        }
                                                    }
                                                }
                                            }

                                            let ordStatusInfo = null;
                                            if (reg.ordinance_type === '代替') {
                                                if (reg.ordinance_item === '恩道門' && activeEvent?.endowment_capacity !== undefined) {
                                                    const rank = endowmentRanks.get(reg.reg_id);
                                                    if (rank) {
                                                        if (activeEvent.endowment_capacity > 0 && rank > activeEvent.endowment_capacity) {
                                                            ordStatusInfo = <span className="ml-1 text-sm text-orange-600 font-bold">(候補)</span>;
                                                        } else if (activeEvent.endowment_capacity > 0) {
                                                            const successText = reg.ceremony_session && reg.ceremony_session.trim() !== '' ? `(${reg.ceremony_session})` : '(成功)';
                                                            ordStatusInfo = <span className="ml-1 text-sm text-green-600 font-bold">{successText}</span>;
                                                        }
                                                    }
                                                }
                                                if (reg.ordinance_item === '洗禮' && activeEvent?.baptism_capacity !== undefined) {
                                                    const rank = baptismRanks.get(reg.reg_id);
                                                    if (rank) {
                                                        if (activeEvent.baptism_capacity > 0 && rank > activeEvent.baptism_capacity) {
                                                            ordStatusInfo = <span className="ml-1 text-sm text-orange-600 font-bold">(候補)</span>;
                                                        } else if (activeEvent.baptism_capacity > 0) {
                                                            const successText = reg.ceremony_session && reg.ceremony_session.trim() !== '' ? `(${reg.ceremony_session})` : '(成功)';
                                                            ordStatusInfo = <span className="ml-1 text-sm text-green-600 font-bold">{successText}</span>;
                                                        }
                                                    }
                                                }
                                            }

                                            return (
                                            <tr key={reg.reg_id} id={`reg-row-${reg.reg_id}`} className={`${colorTheme.rowHover} transition-colors`}>
                                                <td className="p-3 text-center font-mono font-bold text-gray-500 text-sm">{reg.serial_number || '-'}</td>
                                                <td 
                                                    className={`p-3 font-sans font-bold text-gray-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r border-gray-50 text-sm ${shouldShowPayment && (eventStatus === 'confirmed' || eventStatus === 'planning') && !isWaiting(reg) ? 'cursor-pointer text-blue-600 underline decoration-dotted' : ''}`}
                                                    onClick={() => shouldShowPayment && handlePaymentClick(reg)}
                                                >
                                                    {maskName(reg.name)}
                                                    {bookingStatus === '候補' && <span className="ml-1 text-xs bg-red-600 text-white px-1 justify-center rounded align-top font-sans">{t('候補', 'Waiting')}</span>}
                                                </td>

                                                {/* NEW Merged Boarding Info Column */}
                                                <td className="p-3 text-sm font-sans">
                                                    {reg.trip_type === TripType.SELF_MANAGED ? (
                                                        <span className="px-2 py-0.5 rounded text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                                                            {t('自理', 'Self')}
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {(() => {
                                                                const stopInfo = getStopInfo(reg.bus_assigned);
                                                                if (stopInfo) {
                                                                    return (
                                                                        <span className="font-sans text-sm text-gray-900 font-bold bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100 w-fit font-sans">
                                                                            {stopInfo.code} {stopInfo.location}
                                                                            {stopInfo.time && (
                                                                                <span className="text-red-700 ml-1">({stopInfo.time})</span>
                                                                            )}
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className={`px-2 py-0.5 rounded text-sm font-bold border border-transparent w-fit ${bookingColor} font-sans`}>
                                                                        {t(bookingStatus, bookingStatus)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-3 font-sans text-sm font-bold text-gray-900">
                                                    <span className="bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100 font-sans">
                                                        {translateOrdinance(reg.ordinance_item)}
                                                        {ordStatusInfo}
                                                    </span>
                                                </td>
                                                
                                                <td className="p-3 text-sm font-sans">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold font-sans ${
                                                        reg.trip_type === '來回' ? 'bg-gray-200 text-gray-800' :
                                                        reg.trip_type === '去程' ? 'bg-red-100 text-red-800' :
                                                        reg.trip_type === '回程' ? 'bg-green-100 text-green-800' :
                                                        reg.trip_type === TripType.SELF_MANAGED ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                                                        reg.trip_type === TripType.RETAINED ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {translateTripType(reg.trip_type)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm text-gray-500 font-sans">{translateIdentityType(reg.identity_type as string)}</td>
                                                
                                                <td className="p-3 text-center">
                                                    {getMethodBadge(reg)}
                                                </td>

                                                <td className="p-3 text-right font-mono font-bold text-gray-800 text-sm">${reg.amount_due}</td>
                                                
                                                <td className="p-3 text-center">
                                                    {getStatusBadge(reg)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {(reg.trip_type === TripType.ROUND_TRIP || reg.trip_type === TripType.ONE_WAY_TO) && (
                                                        <button 
                                                            onClick={() => handleToggleCheckIn(reg, 'to')} 
                                                            disabled={globalLockTo || eventStatus === 'cancelled'} 
                                                            className={`p-1.5 rounded-full transition-colors ${reg.is_checked_in_to ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'} ${(globalLockTo || eventStatus === 'cancelled') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-200 active:scale-95'}`}
                                                            title={reg.is_checked_in_to ? "已報到" : "點擊報到"}
                                                        >
                                                            <Smartphone className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {(reg.trip_type === TripType.ROUND_TRIP || reg.trip_type === TripType.ONE_WAY_BACK) && (
                                                        <button 
                                                            onClick={() => handleToggleCheckIn(reg, 'back')} 
                                                            disabled={globalLockBack || eventStatus === 'cancelled'} 
                                                            className={`p-1.5 rounded-full transition-colors ${reg.is_checked_in_back ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'} ${(globalLockBack || eventStatus === 'cancelled') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-200 active:scale-95'}`}
                                                            title={reg.is_checked_in_back ? "已報到" : "點擊報到"}
                                                        >
                                                            <Smartphone className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Confirm Dialog for Global Resets */}
            <ConfirmDialog 
                isOpen={confirmState.isOpen}
                title={t('確認全域重置', 'Confirm Global Reset')}
                message={t(
                    `確定要【全域重置】所有人的 ${confirmState.type === 'to' ? '去程' : '回程'} 報到資料嗎？此動作無法復原。`,
                    `Are you sure you want to RESET ALL ${confirmState.type} check-in data? This action cannot be undone.`
                )}
                confirmText={t('確定重置', 'Reset Now')}
                cancelText={t('取消', 'Cancel')}
                onConfirm={() => confirmState.type && executeGlobalReset(confirmState.type)}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
                isDangerous={true}
            />

            {/* Status Message Overlay */}
            {statusMsg.type && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-bottom-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md ${
                        statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                        {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                         statusMsg.type === 'error' ? <XCircle className="w-4 h-4 text-red-600" /> :
                         <Smartphone className="w-4 h-4 text-blue-600" />}
                        <span className="text-sm font-bold">{statusMsg.text}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicRegistrationTab;
