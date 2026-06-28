
import React, { useMemo, useState } from 'react';
import { EventData, Registration, GlobalSettings, TripType, OrdinanceType, OrdinanceItem, PaymentMethod } from '../../types';
import { BookOpen, Bus, DollarSign, Activity, TrendingDown, Users, Wallet, ChevronUp, ChevronDown } from 'lucide-react';

interface PublicAnalysisTabProps {
    activeEvent: EventData;
    registrations: Registration[];
    settings: GlobalSettings;
    allEvents?: EventData[];
}

type UnitStat = {
    unit: string;
    // Transport
    transport: { bus: number; self: number; total: number };
    // Proxy
    proxy: { [key in OrdinanceItem]?: number };
    // Living
    living: { [key in OrdinanceItem]?: number };
    // Income Breakdown
    income: { cash: number; transfer: number; retained: number; total: number };
    // Identity Breakdown (Fee Types)
    identities: Record<string, number>;
};

// V300: Sort Configuration Type
type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

const PublicAnalysisTab: React.FC<PublicAnalysisTabProps> = ({ activeEvent, registrations, settings, allEvents = [] }) => {
    
    // V300: Sorting States for each block
    const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({
        transport: null,
        proxy: null,
        living: null,
        fee: null,
        income: null
    });

    // Yearly Stats Calculation
    const yearlyStats = useMemo(() => {
        const currentYear = new Date().getFullYear().toString();
        const yearEvents = allEvents.filter(e => e.event_date.startsWith(currentYear));
        const count = yearEvents.length;
        
        const totals = {
            attendance: 0,
            bus: 0,
            self: 0,
            revenue: 0,
            expense: 0,
            subsidy: 0
        };

        yearEvents.forEach(e => {
            totals.attendance += e.attendance_total || 0;
            totals.bus += e.attendance_bus || 0;
            totals.self += e.attendance_self || 0;
            totals.revenue += e.revenue_fare || 0;
            totals.expense += e.expense_total || 0;
            totals.subsidy += e.church_subsidy || 0;
        });

        const avgs = {
            attendance: count > 0 ? Math.round(totals.attendance / count) : 0,
            bus: count > 0 ? Math.round(totals.bus / count) : 0,
            self: count > 0 ? Math.round(totals.self / count) : 0,
            revenue: count > 0 ? Math.round(totals.revenue / count) : 0,
            expense: count > 0 ? Math.round(totals.expense / count) : 0,
            subsidy: count > 0 ? Math.round(totals.subsidy / count) : 0
        };

        return { count, totals, avgs, year: currentYear };
    }, [allEvents]);

    // 1. Calculate Expenses (From Event Data)
    const expenses = useMemo(() => {
        let busBooking = 0;
        let driverMeal = 0;
        let parking = 0;
        let other = 0;
        
        activeEvent.busConfigs?.forEach(b => {
            busBooking += b.bookingCost || 0;
            driverMeal += b.driverMealCost || 0;
            parking += b.parkingCost || 0;
            other += b.otherCost || 0;
        });
        
        const insurance = activeEvent.insuranceCost || 0;
        const internetFee = settings.internet_fee || 0; 
        const total = driverMeal + parking + other + insurance + internetFee;

        return { busBooking, driverMeal, parking, other, insurance, internetFee, total };
    }, [activeEvent, settings.internet_fee]);

    // 2. Calculate Unit Statistics
    const { unitStats, totalStats, allIdentityTypes } = useMemo(() => {
        const statsMap = new Map<string, UnitStat & { transport: { retained: number } }>();
        const identitySet = new Set<string>();
        
        // Initialize Map
        settings.units.forEach(u => {
            statsMap.set(u, {
                unit: u,
                transport: { bus: 0, self: 0, retained: 0, total: 0 },
                proxy: { [OrdinanceItem.BAPTISM]: 0, [OrdinanceItem.CONFIRMATION]: 0, [OrdinanceItem.INITIATORY]: 0, [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0 },
                living: { [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0, [OrdinanceItem.OBSERVER]: 0, [OrdinanceItem.CHILD]: 0, [OrdinanceItem.NONE]: 0 },
                income: { cash: 0, transfer: 0, retained: 0, total: 0 },
                identities: {}
            });
        });

        // "Total" row object
        const grandTotal: UnitStat & { transport: { retained: number } } = {
            unit: '支聯會',
            transport: { bus: 0, self: 0, retained: 0, total: 0 },
            proxy: { [OrdinanceItem.BAPTISM]: 0, [OrdinanceItem.CONFIRMATION]: 0, [OrdinanceItem.INITIATORY]: 0, [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0 },
            living: { [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0, [OrdinanceItem.OBSERVER]: 0, [OrdinanceItem.CHILD]: 0, [OrdinanceItem.NONE]: 0 },
            income: { cash: 0, transfer: 0, retained: 0, total: 0 },
            identities: {}
        };

        registrations.forEach(r => {
            // Collect Identity Types
            identitySet.add(r.identity_type);

            // Get unit stats object
            let u = statsMap.get(r.unit);
            if (!u) {
                u = {
                    unit: r.unit,
                    transport: { bus: 0, self: 0, retained: 0, total: 0 },
                    proxy: { [OrdinanceItem.BAPTISM]: 0, [OrdinanceItem.CONFIRMATION]: 0, [OrdinanceItem.INITIATORY]: 0, [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0 },
                    living: { [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0, [OrdinanceItem.OBSERVER]: 0, [OrdinanceItem.CHILD]: 0, [OrdinanceItem.NONE]: 0 },
                    income: { cash: 0, transfer: 0, retained: 0, total: 0 },
                    identities: {}
                };
                statsMap.set(r.unit, u);
            }

            // 1. Transport
            if (r.trip_type === TripType.SELF_MANAGED) {
                u.transport.self++;
                grandTotal.transport.self++;
            } else if (r.trip_type === TripType.RETAINED) {
                u.transport.retained++;
                grandTotal.transport.retained++;
            } else {
                u.transport.bus++;
                grandTotal.transport.bus++;
            }
            u.transport.total++;
            grandTotal.transport.total++;

            // 2. Ordinances
            if (r.ordinance_type === OrdinanceType.PROXY) {
                const item = r.ordinance_item;
                if (u.proxy[item] !== undefined) {
                    u.proxy[item] = (u.proxy[item] || 0) + 1;
                    grandTotal.proxy[item] = (grandTotal.proxy[item] || 0) + 1;
                }
            } else if (r.ordinance_type === OrdinanceType.LIVING) {
                const item = r.ordinance_item;
                if (u.living[item] !== undefined) {
                    u.living[item] = (u.living[item] || 0) + 1;
                    grandTotal.living[item] = (grandTotal.living[item] || 0) + 1;
                }
            } else if (r.ordinance_type === OrdinanceType.CHILD) {
                u.living[OrdinanceItem.CHILD] = (u.living[OrdinanceItem.CHILD] || 0) + 1;
                grandTotal.living[OrdinanceItem.CHILD] = (grandTotal.living[OrdinanceItem.CHILD] || 0) + 1;
            } else {
                // OrdinanceType.NONE (不參加)
                u.living[OrdinanceItem.NONE] = (u.living[OrdinanceItem.NONE] || 0) + 1;
                grandTotal.living[OrdinanceItem.NONE] = (grandTotal.living[OrdinanceItem.NONE] || 0) + 1;
            }

            // 3. Income Breakdown
            const amount = r.amount_due;
            u.income.total += amount;
            grandTotal.income.total += amount;

            if (r.payment_method === PaymentMethod.CASH) {
                u.income.cash += amount;
                grandTotal.income.cash += amount;
            } else if (r.payment_method === PaymentMethod.TRANSFER) {
                u.income.transfer += amount;
                grandTotal.income.transfer += amount;
            }

            // 4. Identity Breakdown
            u.identities[r.identity_type] = (u.identities[r.identity_type] || 0) + 1;
            grandTotal.identities[r.identity_type] = (grandTotal.identities[r.identity_type] || 0) + 1;
        });

        // Sort Units
        const sortedUnits = Array.from(statsMap.values()).sort((a, b) => {
            const idxA = settings.units.indexOf(a.unit);
            const idxB = settings.units.indexOf(b.unit);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return a.unit.localeCompare(b.unit);
        });

        // Sort Identities for display
        const sortedIdentities = Array.from(identitySet).sort();

        return { unitStats: sortedUnits, totalStats: grandTotal, allIdentityTypes: sortedIdentities };
    }, [registrations, settings.units]);

    // Helper to render table
    const renderTable = (
        title: string, 
        icon: React.ReactNode, 
        theme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'yellow',
        columns: { header: string, align?: 'left'|'center'|'right', val: (u: UnitStat) => number | string, sortKey?: string }[],
        blockId: string
    ) => {
        const themeStyles = {
            blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', headBg: 'bg-blue-100', headBorder: 'border-blue-200' },
            green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', headBg: 'bg-green-100', headBorder: 'border-green-200' },
            purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', headBg: 'bg-purple-100', headBorder: 'border-purple-200' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', headBg: 'bg-orange-100', headBorder: 'border-orange-200' },
            red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', headBg: 'bg-red-100', headBorder: 'border-red-200' },
            indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', headBg: 'bg-indigo-100', headBorder: 'border-indigo-200' },
            yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', headBg: 'bg-yellow-100', headBorder: 'border-yellow-200' },
        }[theme];

        const config = sortConfigs[blockId];

        // V300: Sort logic (excluding "支聯會" which is in totalStats)
        const sortedData = useMemo(() => {
            if (!config) return unitStats;
            return [...unitStats].sort((a, b) => {
                let valA: any = 0;
                let valB: any = 0;
                
                const col = columns.find(c => c.sortKey === config.key || c.header === config.key);
                if (col) {
                    valA = col.val(a);
                    valB = col.val(b);
                } else if (config.key === 'unit') {
                    valA = a.unit;
                    valB = b.unit;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return config.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                
                return config.direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
            });
        }, [unitStats, config, columns]);

        const onSort = (key: string) => {
            setSortConfigs(prev => {
                const current = prev[blockId];
                if (current?.key === key) {
                    if (current.direction === 'asc') return { ...prev, [blockId]: { key, direction: 'desc' } };
                    return { ...prev, [blockId]: null };
                }
                return { ...prev, [blockId]: { key, direction: 'asc' } };
            });
        };

        const renderSortIcon = (key: string) => {
            const active = config?.key === key;
            return (
                <div className="inline-flex flex-col ml-1 align-middle">
                    <ChevronUp className={`w-3 h-3 -mb-1 ${active && config?.direction === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                    <ChevronDown className={`w-3 h-3 ${active && config?.direction === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                </div>
            );
        };

        return (
            <div className={`${themeStyles.bg} rounded-xl shadow-sm border ${themeStyles.border} overflow-hidden flex flex-col h-full`}>
                <div className={`p-3 ${themeStyles.headBg} border-b ${themeStyles.headBorder} flex items-center`}>
                    <span className={`mr-2 ${themeStyles.text}`}>{icon}</span>
                    <h3 className={`font-bold ${themeStyles.text} text-base`}>{title}</h3>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead className={`${themeStyles.bg} text-gray-700 font-bold border-b ${themeStyles.headBorder}`}>
                            <tr>
                                <th 
                                    className={`p-2 text-left w-20 sticky left-0 z-10 ${themeStyles.bg} border-r border-black/5 cursor-pointer hover:bg-gray-100 transition-colors`}
                                    onClick={() => onSort('unit')}
                                >
                                    單位
                                    {renderSortIcon('unit')}
                                </th>
                                {columns.map((col, idx) => (
                                    <th 
                                        key={idx} 
                                        className={`p-2 text-${col.align || 'center'} cursor-pointer hover:bg-gray-100 transition-colors`}
                                        onClick={() => onSort(col.sortKey || col.header)}
                                    >
                                        <div className={`flex items-center justify-${col.align === 'right' ? 'end' : (col.align === 'center' || !col.align) ? 'center' : 'start'}`}>
                                            {col.header}
                                            {renderSortIcon(col.sortKey || col.header)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                            {sortedData.map(u => (
                                <tr key={u.unit} className="hover:bg-white/50 transition-colors">
                                    <td className={`p-2 font-bold text-gray-700 sticky left-0 z-10 ${themeStyles.bg} border-r border-black/5`}>{u.unit}</td>
                                    {columns.map((col, idx) => (
                                        <td key={idx} className={`p-2 text-${col.align || 'center'} text-gray-800`}>
                                            {col.align === 'right' && typeof col.val(u) === 'number' ? `$${(col.val(u) as number).toLocaleString()}` : col.val(u)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {/* Total Row - "支聯會" only */}
                            <tr className={`${themeStyles.headBg} font-bold`}>
                                <td className={`p-2 text-gray-900 sticky left-0 z-10 ${themeStyles.headBg} border-r border-black/5 border-t border-black/10`}>支聯會</td>
                                {columns.map((col, idx) => (
                                    <td key={idx} className={`p-2 text-${col.align || 'center'} text-gray-900 border-t border-black/10`}>
                                        {col.align === 'right' && typeof col.val(totalStats) === 'number' ? `$${(col.val(totalStats) as number).toLocaleString()}` : col.val(totalStats)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-8 animate-fade-in">
            {/* Grid Layout for Blocks - Adjusted to handle more blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Transport (Red) */}
                {renderTable(
                    '交通安排', 
                    <Bus className="w-5 h-5"/>, 
                    'red', 
                    [
                        { header: '搭車', sortKey: 'bus', val: u => u.transport.bus },
                        { header: '自理', sortKey: 'self', val: u => u.transport.self },
                        { header: '留用', sortKey: 'retained', val: u => (u as any).transport.retained || 0 },
                        { header: '合計', sortKey: 'total', val: u => u.transport.total }
                    ],
                    'transport'
                )}

                {/* 2. Proxy Ordinances (Orange) */}
                {renderTable(
                    '代替教儀', 
                    <BookOpen className="w-5 h-5"/>, 
                    'orange', 
                    [
                        { header: '洗禮', sortKey: OrdinanceItem.BAPTISM, val: u => u.proxy[OrdinanceItem.BAPTISM] || 0 },
                        { header: '證實', sortKey: OrdinanceItem.CONFIRMATION, val: u => u.proxy[OrdinanceItem.CONFIRMATION] || 0 },
                        { header: '先行禮', sortKey: OrdinanceItem.INITIATORY, val: u => u.proxy[OrdinanceItem.INITIATORY] || 0 }, 
                        { header: '恩道門', sortKey: OrdinanceItem.ENDOWMENT, val: u => u.proxy[OrdinanceItem.ENDOWMENT] || 0 },
                        { header: '印證', sortKey: OrdinanceItem.SEALING, val: u => u.proxy[OrdinanceItem.SEALING] || 0 },
                    ],
                    'proxy'
                )}

                {/* 3. Living Ordinances (Yellow) */}
                {renderTable(
                    '活人其他', 
                    <Activity className="w-5 h-5"/>, 
                    'yellow', 
                    [
                        { header: '恩道門', sortKey: OrdinanceItem.ENDOWMENT, val: u => u.living[OrdinanceItem.ENDOWMENT] || 0 },
                        { header: '印證', sortKey: OrdinanceItem.SEALING, val: u => u.living[OrdinanceItem.SEALING] || 0 },
                        { header: '觀禮', sortKey: OrdinanceItem.OBSERVER, val: u => u.living[OrdinanceItem.OBSERVER] || 0 },
                        { header: '兒童', sortKey: OrdinanceItem.CHILD, val: u => u.living[OrdinanceItem.CHILD] || 0 },
                        { header: '不參加', sortKey: OrdinanceItem.NONE, val: u => u.living[OrdinanceItem.NONE] || 0 },
                    ],
                    'living'
                )}

                {/* 4. Fee Breakdown (Green) */}
                {renderTable(
                    '收費分別', 
                    <Users className="w-5 h-5"/>, 
                    'green', 
                    allIdentityTypes.map(identity => ({
                        header: identity,
                        val: u => u.identities[identity] || 0
                    })),
                    'fee'
                )}

                {/* 5. Income (Blue) */}
                {renderTable(
                    '車資收入', 
                    <DollarSign className="w-5 h-5"/>, 
                    'blue', 
                    [
                        { header: '轉帳', align: 'right', sortKey: 'transfer', val: u => u.income.transfer },
                        { header: '現金', align: 'right', sortKey: 'cash', val: u => u.income.cash },
                        { header: '合計', align: 'right', sortKey: 'total', val: u => u.income.total },
                    ],
                    'income'
                )}

                {/* 6. Expenses (Indigo) */}
                <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 overflow-hidden flex flex-col h-full">
                    <div className="p-3 bg-indigo-100 border-b border-indigo-200 flex items-center">
                        <TrendingDown className="mr-2 text-indigo-900 w-5 h-5"/>
                        <h3 className="font-bold text-indigo-900 text-base">費用支出</h3>
                    </div>
                    <div className="p-4 flex-1">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-indigo-200">
                                <tr>
                                    <td className="py-2 text-gray-700">網路費</td>
                                    <td className="py-2 text-right text-indigo-700">${expenses.internetFee.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-700">保險費</td>
                                    <td className="py-2 text-right text-indigo-700">${expenses.insurance.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-700">司機餐費</td>
                                    <td className="py-2 text-right text-indigo-700">${expenses.driverMeal.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-700">停車費</td>
                                    <td className="py-2 text-right text-indigo-700">${expenses.parking.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-700">其他費用</td>
                                    <td className="py-2 text-right text-indigo-700">${expenses.other.toLocaleString()}</td>
                                </tr>
                                <tr className="bg-indigo-100/50 font-bold">
                                    <td className="py-2 text-indigo-900">支出合計</td>
                                    <td className="py-2 text-right text-indigo-900">${expenses.total.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            
            {/* 當月統計 (Monthly Stats) - Violet/Purple Theme */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center mb-8 border-b-2 border-purple-100 pb-4">
                    <Activity className="w-6 h-6 mr-3 text-purple-600" />
                    <h3 className="text-xl font-black text-purple-900">當月統計</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-base">
                    {/* Part 1: Attendance */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">活動人數：</span>
                            <span className="font-black text-purple-900">{totalStats.transport.total} 人</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">搭車人數：</span>
                            <span className="font-black text-purple-900">{totalStats.transport.bus} 人</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">自理人數：</span>
                            <span className="font-black text-purple-900">{totalStats.transport.self} 人</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">留用人數：</span>
                            <span className="font-black text-purple-900">{totalStats.transport.retained} 人</span>
                        </div>
                    </div>

                    {/* Part 2: Revenue & Expenses */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">車資收入：</span>
                            <span className="font-black text-purple-900">${totalStats.income.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">費用支出：</span>
                            <span className="font-black text-purple-900">${expenses.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">結算繳回：</span>
                            <span className={`font-black ${totalStats.income.total - expenses.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.max(0, totalStats.income.total - expenses.total).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Part 3: Booking & Subsidies */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">訂車總數：</span>
                            <span className="font-black text-purple-900">{(activeEvent.busConfigs || []).length} 台</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">訂車費用：</span>
                            <span className="font-black text-purple-900">${expenses.busBooking.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <span className="font-bold text-purple-700">教會補助：</span>
                            <span className="font-black text-red-600">${Math.max(0, expenses.busBooking - (totalStats.income.total - expenses.total)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 年度統計 (Yearly Stats) - Red Theme (Start cycle again) */}
            <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center mb-8 border-b-2 border-red-100 pb-4">
                    <Activity className="w-6 h-6 mr-3 text-red-600" />
                    <h3 className="text-xl font-black text-red-900">{yearlyStats.year} 年度統計 ({yearlyStats.count} 次活動)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-base">
                    {/* Left: Totals */}
                    <div className="bg-white/80 p-6 rounded-2xl border border-red-100 shadow-sm">
                        <h4 className="font-bold text-red-900 mb-4 border-b border-red-200 pb-2 flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> 合計 (Total)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center border-b border-red-100 pb-1">
                                <span className="text-red-700 font-medium">總人數：</span>
                                <span className="font-bold text-red-900">{yearlyStats.totals.attendance} 人</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-red-100 pb-1">
                                <span className="text-red-700 font-medium">總車資：</span>
                                <span className="font-bold text-red-900">${yearlyStats.totals.revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-red-100 pb-1">
                                <span className="text-red-700 font-medium">總支出：</span>
                                <span className="font-bold text-red-900">${yearlyStats.totals.expense.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-red-100 pb-1">
                                <span className="text-red-700 font-medium">總補助：</span>
                                <span className="font-bold text-red-600">${yearlyStats.totals.subsidy.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Averages - Orange theme for variety */}
                    <div className="bg-orange-50/80 p-6 rounded-2xl border border-orange-100 shadow-sm">
                        <h4 className="font-bold text-orange-900 mb-4 border-b border-orange-200 pb-2 flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> 平均 (Avg)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center border-b border-orange-100 pb-1">
                                <span className="text-orange-700 font-medium">平均人數：</span>
                                <span className="font-bold text-orange-900">{yearlyStats.avgs.attendance} 人</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-orange-100 pb-1">
                                <span className="text-orange-700 font-medium">平均車資：</span>
                                <span className="font-bold text-orange-900">${yearlyStats.avgs.revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-orange-100 pb-1">
                                <span className="text-orange-700 font-medium">平均支出：</span>
                                <span className="font-bold text-orange-900">${yearlyStats.avgs.expense.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-orange-100 pb-1">
                                <span className="text-orange-700 font-medium">平均補助：</span>
                                <span className="font-bold text-red-600">${yearlyStats.avgs.subsidy.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicAnalysisTab;
