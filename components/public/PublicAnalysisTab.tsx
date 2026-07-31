
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, Registration, GlobalSettings, TripType, OrdinanceType, OrdinanceItem, PaymentMethod, InsuranceType, RegStatus } from '../../types';
import { BookOpen, Bus, DollarSign, Activity, TrendingDown, Users, Wallet, ChevronUp, ChevronDown, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRemountOnResize } from '../../hooks/useRemountOnResize';

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

// Refined rainbow themes following strict system instructions (Light bg + Dark text & borders)
const rainbowThemes = [
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hover: 'hover:bg-red-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hover: 'hover:bg-orange-200' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hover: 'hover:bg-amber-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hover: 'hover:bg-emerald-200' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hover: 'hover:bg-blue-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', hover: 'hover:bg-indigo-200' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hover: 'hover:bg-purple-200' },
];

const PublicAnalysisTab: React.FC<PublicAnalysisTabProps> = ({ activeEvent, registrations, settings, allEvents = [] }) => {
    const { t } = useTranslation();
    
    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = useMemo(() => {
        // Vxxx: Combine all potential sources of unit names
        const billingUnits = settings.billingConfig?.units?.map(u => u.shortName) || [];
        const configUnits = settings.units || [];
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
    }, [settings, registrations]);

    // V300: Sorting States for each block
    const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({
        transport: null,
        proxy: null,
        living: null,
        fee: null,
        income: null
    });

    // Collapsible states for blocks
    const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({
        transport: false,
        proxy: false,
        living: false,
        fee: false,
        income: false,
        expenses: false,
        monthly: false,
        yearly: false
    });

    const toggleBlock = (blockId: string) => {
        setCollapsedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }));
    };

    // Orientation Reset補丁 (Hard Reset)
    const remountKey = useRemountOnResize();

    const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scroll = (id: string, direction: 'left' | 'right') => {
        const el = scrollRefs.current[id];
        if (el) {
            const amount = direction === 'left' ? -200 : 200;
            el.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

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
        let busRent = 0;
        let busTax = 0;
        let driverMeal = 0;
        let parking = 0;
        let other = 0;
        
        activeEvent.busConfigs?.forEach(b => {
            busRent += b.bookingCost || 0;
            busTax += b.taxCost || 0;
            driverMeal += b.driverMealCost || 0;
            parking += b.parkingCost || 0;
            other += b.otherCost || 0;
        });
        
        // Vxxx: Calculate insurance based on type
        const selfPaidInsuranceTotal = registrations.filter(r => r.needs_self_paid_insurance).length * (activeEvent.self_paid_insurance_amount || 0);
        const insurance = activeEvent.insurance_type === InsuranceType.SELF_PAID ? selfPaidInsuranceTotal : (activeEvent.insurance_type === InsuranceType.GROUP ? (activeEvent.insuranceCost || 0) : 0);
        
        const internetFee = settings.internet_fee || 0; 
        const total = busRent + busTax + driverMeal + parking + other + insurance + internetFee;

        return { busRent, busTax, driverMeal, parking, other, insurance, selfPaidInsuranceTotal, internetFee, total };
    }, [activeEvent, settings.internet_fee, registrations]);

    // 2. Calculate Unit Statistics
    const { unitStats, totalStats, allIdentityTypes, totalSubsidy } = useMemo(() => {
        const statsMap = new Map<string, UnitStat & { transport: { retained: number } }>();
        const identitySet = new Set<string>();
        
        // Vxxx: Subsidy Calculation logic from SubsidyTab
        const billingConfig = settings.billingConfig;
        const subsidyIdentities = new Set<string>();
        if (billingConfig) {
            (billingConfig.identityPricings || []).forEach(p => {
                if (p.hasSubsidy !== false) {
                    subsidyIdentities.add(p.identity);
                }
            });
        }
        let totalSubsidyAmount = 0;

        // Initialize Map
        unitOptions.forEach(u => {
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
            unit: '合計', // Vxxx: Changed from 支聯會 to 合計
            transport: { bus: 0, self: 0, retained: 0, total: 0 },
            proxy: { [OrdinanceItem.BAPTISM]: 0, [OrdinanceItem.CONFIRMATION]: 0, [OrdinanceItem.INITIATORY]: 0, [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0 },
            living: { [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0, [OrdinanceItem.OBSERVER]: 0, [OrdinanceItem.CHILD]: 0, [OrdinanceItem.NONE]: 0 },
            income: { cash: 0, transfer: 0, retained: 0, total: 0 },
            identities: {}
        };

        registrations.forEach(r => {
            // Vxxx: Skip records without a unit name to avoid "empty row" in stats
            const unitName = String(r.unit || '').trim();
            if (!unitName) return;

            // Collect Identity Types
            identitySet.add(r.identity_type);

            // Get unit stats object
            let u = statsMap.get(unitName);
            if (!u) {
                u = {
                    unit: unitName,
                    transport: { bus: 0, self: 0, retained: 0, total: 0 },
                    proxy: { [OrdinanceItem.BAPTISM]: 0, [OrdinanceItem.CONFIRMATION]: 0, [OrdinanceItem.INITIATORY]: 0, [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0 },
                    living: { [OrdinanceItem.ENDOWMENT]: 0, [OrdinanceItem.SEALING]: 0, [OrdinanceItem.OBSERVER]: 0, [OrdinanceItem.CHILD]: 0, [OrdinanceItem.NONE]: 0 },
                    income: { cash: 0, transfer: 0, retained: 0, total: 0 },
                    identities: {}
                };
                statsMap.set(unitName, u);
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
            const amount = Number(r.amount_due || 0);
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
            u.identities[r.identity_type] = (Number(u.identities[r.identity_type]) || 0) + 1;
            grandTotal.identities[r.identity_type] = (Number(grandTotal.identities[r.identity_type]) || 0) + 1;

            // 5. Subsidy Calculation
            if (billingConfig && r.status === RegStatus.NORMAL && subsidyIdentities.has(r.identity_type)) {
                let baseFee = Number(billingConfig.baseFees['GLOBAL'] || 0);
                let foundInGroup = false;
                if (billingConfig.unitGroups) {
                    for (const [groupName, units] of Object.entries(billingConfig.unitGroups)) {
                        if ((units as string[]).includes(unitName)) {
                            if (billingConfig.baseFees[groupName] !== undefined) {
                                baseFee = Number(billingConfig.baseFees[groupName]);
                                foundInGroup = true;
                                break;
                            }
                        }
                    }
                }
                if (!foundInGroup && billingConfig.baseFees[unitName] !== undefined) {
                    baseFee = Number(billingConfig.baseFees[unitName]);
                }
                const subsidyAmount = baseFee - amount;
                if (subsidyAmount > 0) {
                    totalSubsidyAmount += subsidyAmount;
                }
            }
        });

        // Sort Units
        const sortedUnits = Array.from(statsMap.values()).sort((a, b) => {
            const idxA = unitOptions.indexOf(a.unit);
            const idxB = unitOptions.indexOf(b.unit);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return String(a.unit || '').localeCompare(String(b.unit || ''));
        });

        // Sort Identities for display
        const sortedIdentities = Array.from(identitySet).sort();

        return { unitStats: sortedUnits, totalStats: grandTotal, allIdentityTypes: sortedIdentities, totalSubsidy: totalSubsidyAmount };
    }, [registrations, unitOptions, settings.billingConfig]);

    // Helper to render table
    const renderTable = (
        title: string, 
        icon: React.ReactNode, 
        themeIdx: number,
        columns: { header: string, align?: 'left'|'center'|'right', val: (u: UnitStat) => number | string, sortKey?: string }[],
        blockId: string
    ) => {
        // Rainbow Sequence Mapping: Red (0), Orange (1), Yellow (2), Green (3), Blue (4), Indigo (5), Purple (6)
        const rainbowColors = [
            { title: 'bg-red-200', header: 'bg-red-100', content: 'bg-red-50', accent: 'text-red-800', border: 'border-red-300' },
            { title: 'bg-orange-200', header: 'bg-orange-100', content: 'bg-orange-50', accent: 'text-orange-800', border: 'border-orange-300' },
            { title: 'bg-amber-200', header: 'bg-amber-100', content: 'bg-amber-50', accent: 'text-amber-900', border: 'border-amber-300' },
            { title: 'bg-emerald-200', header: 'bg-emerald-100', content: 'bg-emerald-50', accent: 'text-emerald-800', border: 'border-emerald-300' },
            { title: 'bg-blue-200', header: 'bg-blue-100', content: 'bg-blue-50', accent: 'text-blue-800', border: 'border-blue-300' },
            { title: 'bg-indigo-200', header: 'bg-indigo-100', content: 'bg-indigo-50', accent: 'text-indigo-800', border: 'border-indigo-300' },
            { title: 'bg-purple-200', header: 'bg-purple-100', content: 'bg-purple-50', accent: 'text-purple-800', border: 'border-purple-300' },
        ];
        
        const theme = rainbowColors[themeIdx % 7];
        const config = sortConfigs[blockId];
        const isCollapsed = collapsedBlocks[blockId] === undefined ? false : collapsedBlocks[blockId];

        // V300: Sort logic
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
                    return config.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
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
                <div className="inline-flex flex-col ml-1.5 align-middle opacity-40 group-hover:opacity-100 transition-opacity">
                    <ChevronUp className={`w-3 h-3 -mb-1 ${active && config?.direction === 'asc' ? theme.accent : 'text-slate-400'}`} />
                    <ChevronDown className={`w-3 h-3 ${active && config?.direction === 'desc' ? theme.accent : 'text-slate-400'}`} />
                </div>
            );
        };

        return (
            <div className={`w-full max-w-full min-w-0 rounded border ${theme.border} overflow-hidden flex flex-col h-full bg-white transition-all duration-300 mb-1`}>
                {/* Level 1 Header - 200 depth */}
                <div 
                    className={`w-full flex items-center justify-between p-1 ${theme.title} border-b border-inherit cursor-pointer transition-all hover:opacity-90`}
                    onClick={() => toggleBlock(blockId)}
                >
                    <div className="flex items-center gap-1">
                        <div className={`p-1 rounded bg-white/40 border ${theme.border} shadow-sm ${theme.accent}`}>
                            {React.cloneElement(icon as React.ReactElement, { size: 14 })}
                        </div>
                        <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight">{title}</h4>
                    </div>
                    <div className="text-slate-600 px-1">
                        {isCollapsed ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                    </div>
                </div>

                {!isCollapsed && (
                    <div className={`flex-1 flex flex-col ${theme.content} p-1 gap-1 w-full max-w-full min-w-0`}>
                        {/* Mobile Scroll Assist - Only visible on small screens */}
                        <div className="md:hidden flex items-center justify-between px-1 py-0.5 bg-white/50 border-b border-slate-200 rounded mb-0.5">
                            <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                <Smartphone className="w-3 h-3" /> 左右滑動
                            </span>
                            <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); scroll(blockId, 'left'); }} className="p-0.5 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                                <button onClick={(e) => { e.stopPropagation(); scroll(blockId, 'right'); }} className="p-0.5 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                            </div>
                        </div>
                        <div ref={el => scrollRefs.current[blockId] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar w-full max-w-full min-w-0">
                            <div className="min-w-full inline-block align-middle">
                                <table className="w-full [width:max-content] table-auto text-xs border-collapse">
                                    <thead>
                                        <tr className={`border-b ${theme.header} text-slate-900 ${theme.border}`}>
                                            <th 
                                                className={`px-0.5 py-1 text-left whitespace-nowrap sticky left-0 z-20 ${theme.header} border-r cursor-pointer transition-colors group ${theme.border} font-black`}
                                                onClick={() => onSort('unit')}
                                            >
                                                <div className="flex items-center">
                                                    單位 {renderSortIcon('unit')}
                                                </div>
                                            </th>
                                            {columns.map((col, idx) => (
                                                <th 
                                                    key={idx} 
                                                    className={`px-0.5 py-1 text-${col.align || 'center'} whitespace-nowrap cursor-pointer hover:bg-white/40 transition-colors group border-r last:border-r-0 ${theme.border} font-black`}
                                                    onClick={() => onSort(col.sortKey || col.header)}
                                                >
                                                    <div className={`flex items-center justify-${col.align === 'right' ? 'end' : (col.align === 'center' || !col.align) ? 'center' : 'start'}`}>
                                                        {col.header} {renderSortIcon(col.sortKey || col.header)}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${theme.border.replace('border', 'divide')}`}>
                                        {sortedData.map(u => (
                                            <tr key={u.unit} className={`hover:bg-slate-50/50 transition-colors group border-b ${theme.border}`}>
                                                <td className={`px-0.5 py-1 font-black text-slate-900 sticky left-0 z-10 bg-white border-r ${theme.border} whitespace-nowrap shadow-[2px_0_5px_0_rgba(0,0,0,0.05)]`}>{u.unit}</td>
                                                {columns.map((col, idx) => (
                                                    <td key={idx} className={`px-0.5 py-1 text-${col.align || 'center'} font-bold text-slate-800 border-r last:border-r-0 ${theme.border} whitespace-nowrap`}>
                                                        {col.align === 'right' && typeof col.val(u) === 'number' ? `$${(col.val(u) as number).toLocaleString()}` : col.val(u)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                            <tr className={`font-black border-t-2 bg-slate-100/50 ${theme.accent} ${theme.border}`}>
                                                <td className={`px-0.5 py-1 sticky left-0 z-10 bg-slate-100 border-r ${theme.border} whitespace-nowrap shadow-[2px_0_5px_0_rgba(0,0,0,0.05)]`}>合計</td>
                                                {columns.map((col, idx) => (
                                                    <td key={idx} className={`px-0.5 py-1 text-${col.align || 'center'} border-r last:border-r-0 ${theme.border} whitespace-nowrap`}>
                                                    {col.align === 'right' && typeof col.val(totalStats) === 'number' ? `$${(col.val(totalStats) as number).toLocaleString()}` : col.val(totalStats)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div key={remountKey} className="p-1 gap-1 flex flex-col pb-12 animate-fade-in w-full max-w-full min-w-0 bg-[#F8F9FA]">
            {/* Grid Layout for Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                
                {/* 1. Transport */}
                {renderTable(
                    '交通安排', 
                    <Bus />, 
                    0, 
                    [
                        { header: '搭車', sortKey: 'bus', val: u => u.transport.bus },
                        { header: '自理', sortKey: 'self', val: u => u.transport.self },
                        { header: '留用', sortKey: 'retained', val: u => (u as any).transport.retained || 0 },
                        { header: '合計', sortKey: 'total', val: u => u.transport.total }
                    ],
                    'transport'
                )}

                {/* 2. Proxy Ordinances */}
                {renderTable(
                    '代替教儀', 
                    <BookOpen />, 
                    1, 
                    [
                        { header: '洗禮', sortKey: OrdinanceItem.BAPTISM, val: u => u.proxy[OrdinanceItem.BAPTISM] || 0 },
                        { header: '證實', sortKey: OrdinanceItem.CONFIRMATION, val: u => u.proxy[OrdinanceItem.CONFIRMATION] || 0 },
                        { header: '先行禮', sortKey: OrdinanceItem.INITIATORY, val: u => u.proxy[OrdinanceItem.INITIATORY] || 0 }, 
                        { header: '恩道門', sortKey: OrdinanceItem.ENDOWMENT, val: u => u.proxy[OrdinanceItem.ENDOWMENT] || 0 },
                        { header: '印證', sortKey: OrdinanceItem.SEALING, val: u => u.proxy[OrdinanceItem.SEALING] || 0 },
                    ],
                    'proxy'
                )}

                {/* 3. Living Ordinances */}
                {renderTable(
                    '活人其他', 
                    <Activity />, 
                    2, 
                    [
                        { header: '恩道門', sortKey: OrdinanceItem.ENDOWMENT, val: u => u.living[OrdinanceItem.ENDOWMENT] || 0 },
                        { header: '印證', sortKey: OrdinanceItem.SEALING, val: u => u.living[OrdinanceItem.SEALING] || 0 },
                        { header: '觀禮', sortKey: OrdinanceItem.OBSERVER, val: u => u.living[OrdinanceItem.OBSERVER] || 0 },
                        { header: '兒童', sortKey: OrdinanceItem.CHILD, val: u => u.living[OrdinanceItem.CHILD] || 0 },
                        { header: '不參加', sortKey: OrdinanceItem.NONE, val: u => u.living[OrdinanceItem.NONE] || 0 },
                    ],
                    'living'
                )}

                {/* 4. Fee Breakdown */}
                {renderTable(
                    '身份收費', 
                    <Users />, 
                    3, 
                    allIdentityTypes.map(identity => ({
                        header: identity,
                        val: u => u.identities[identity] || 0
                    })),
                    'fee'
                )}

                {/* 5. Income */}
                {renderTable(
                    '車資收入明細', 
                    <DollarSign />, 
                    4, 
                    [
                        { header: '轉帳', align: 'right', sortKey: 'transfer', val: u => u.income.transfer },
                        { header: '現金', align: 'right', sortKey: 'cash', val: u => u.income.cash },
                        { header: '合計', align: 'right', sortKey: 'total', val: u => u.income.total },
                    ],
                    'income'
                )}

                {/* 6. Expenses */}
                <div className="w-full max-w-full min-w-0 rounded border border-indigo-300 overflow-hidden flex flex-col h-full bg-white transition-all duration-300 mb-1">
                    <div 
                        className="w-full p-1 bg-indigo-200 flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b border-indigo-300"
                        onClick={() => toggleBlock('expenses')}
                    >
                        <div className="flex items-center gap-1">
                            <div className="p-1 rounded bg-white/40 border border-indigo-300 shadow-sm text-indigo-800">
                                <TrendingDown size={14}/>
                            </div>
                            <h4 className="font-bold text-xs md:text-sm text-slate-900 tracking-tight">費用支出</h4>
                        </div>
                        <div className="text-slate-600 px-1">
                            {collapsedBlocks.expenses ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                        </div>
                    </div>
                    
                    {!collapsedBlocks.expenses && (
                        <div className="flex-1 flex flex-col bg-indigo-50 p-1 gap-1 w-full max-w-full min-w-0">
                            <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar w-full min-w-0">
                                <div className="min-w-full inline-block align-middle">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-indigo-100 border-b border-indigo-300 text-slate-900">
                                                <th className="px-0.5 py-1 text-left font-black border-r border-indigo-300 whitespace-nowrap uppercase tracking-wider">項目</th>
                                                <th className="px-0.5 py-1 text-right font-black whitespace-nowrap uppercase tracking-wider">金額</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-300">
                                            {[
                                                { label: '網路系統費', val: expenses.internetFee },
                                                { label: '租車費', val: expenses.busRent },
                                                { label: '所得稅', val: expenses.busTax },
                                                { label: '保險費', val: expenses.insurance },
                                                { label: '司機餐費', val: expenses.driverMeal },
                                                { label: '停車費', val: expenses.parking },
                                                { label: '其他費用', val: expenses.other },
                                            ].map((item, i) => (
                                                <tr key={i} className={`hover:bg-slate-50/50 transition-colors border-b border-indigo-300 last:border-b-0`}>
                                                    <td className="px-0.5 py-1 font-black text-slate-900 border-r border-indigo-300 whitespace-nowrap">{item.label}</td>
                                                    <td className="px-0.5 py-1 text-right font-black text-slate-900 whitespace-nowrap">${item.val.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-indigo-100/50 font-black border-t-2 border-indigo-300">
                                                <td className="px-0.5 py-1 text-slate-900 border-r border-indigo-300 whitespace-nowrap">支出合計</td>
                                                <td className="px-0.5 py-1 text-right text-indigo-900 whitespace-nowrap">${expenses.total.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* 當月統計 (Monthly Stats) - Purple (6) */}
            <div className={`rounded border border-purple-300 overflow-hidden bg-white transition-all duration-300 mb-1`}>
                <div 
                    className="w-full p-1 bg-purple-200 flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b border-purple-300"
                    onClick={() => toggleBlock('monthly')}
                >
                    <div className="flex items-center gap-1">
                        <div className="p-1 rounded bg-white/40 border border-purple-300 shadow-sm text-purple-800">
                            <Activity size={14}/>
                        </div>
                        <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight uppercase">本次活動總結</h4>
                    </div>
                    <div className="text-slate-600 px-1">
                        {collapsedBlocks.monthly ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                    </div>
                </div>

                {!collapsedBlocks.monthly && (
                    <div className="flex flex-col bg-purple-50 p-1 gap-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                            <div className="space-y-1 bg-white p-1 rounded border border-purple-300 shadow-sm">
                                <h5 className="font-black text-purple-900 border-b border-purple-300 pb-1 mb-1 text-[10px] md:text-xs">人數統計</h5>
                                {[
                                    { label: '總數', val: totalStats.transport.total, unit: '人' },
                                    { label: '搭車', val: totalStats.transport.bus, unit: '人' },
                                    { label: '自理', val: totalStats.transport.self, unit: '人' },
                                    { label: '留用', val: totalStats.transport.retained, unit: '人' },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-purple-200/30 py-0.5">
                                        <span className="font-black text-slate-900 text-[10px]">{row.label}：</span>
                                        <span className="font-black text-slate-900 text-xs">{row.val}{row.unit}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1 bg-white p-1 rounded border border-purple-300 shadow-sm">
                                <h5 className="font-black text-purple-900 border-b border-purple-300 pb-1 mb-1 text-[10px] md:text-xs">收入統計</h5>
                                {[
                                    { label: '車資收入', val: totalStats.income.total },
                                    { label: '自付保費', val: expenses.selfPaidInsuranceTotal },
                                    { label: '收入合計', val: totalStats.income.total + expenses.selfPaidInsuranceTotal, highlight: true },
                                ].map((row, i) => (
                                    <div key={i} className={`flex justify-between items-center border-b border-purple-200/30 py-0.5 ${row.highlight ? 'mt-1 pt-1 border-t border-purple-300' : ''}`}>
                                        <span className="font-black text-slate-900 text-[10px]">{row.label}：</span>
                                        <span className={`font-black ${row.highlight ? 'text-xs text-indigo-800' : 'text-slate-900 text-[11px]'}`}>${row.val.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1 bg-white p-1 rounded border border-purple-300 shadow-sm">
                                <h5 className="font-black text-purple-900 border-b border-purple-300 pb-1 mb-1 text-[10px] md:text-xs">收支對帳</h5>
                                {[
                                    { label: '支出總計', val: expenses.total },
                                    { label: '收支差額', val: Math.max(0, expenses.total - (totalStats.income.total + expenses.selfPaidInsuranceTotal)), isDiff: true },
                                    { label: '對象補助', val: totalSubsidy, isSubsidy: true },
                                ].map((row, i) => {
                                    const isNegative = row.isDiff && (expenses.total - (totalStats.income.total + expenses.selfPaidInsuranceTotal) > 0);
                                    return (
                                        <div key={i} className="flex justify-between items-center border-b border-purple-200/30 py-0.5">
                                            <span className="font-black text-slate-900 text-[10px]">{row.label}：</span>
                                            <span className={`font-black text-xs ${isNegative || row.isSubsidy ? 'text-rose-600' : 'text-slate-900'}`}>
                                                ${row.val.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div className="mt-2 p-1 bg-indigo-900 rounded text-center shadow-sm">
                                    <span className="text-[8px] text-indigo-300 font-bold block uppercase tracking-widest">最終活動補助金額</span>
                                    <span className="text-sm font-black text-white">${Math.max(0, expenses.total - (totalStats.income.total + expenses.selfPaidInsuranceTotal)).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 年度統計 (Yearly Stats) - Red (0) */}
            <div className="rounded border border-red-300 overflow-hidden bg-white transition-all duration-300">
                <div 
                    className="w-full p-1 bg-red-200 flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b border-red-200"
                    onClick={() => toggleBlock('yearly')}
                >
                    <div className="flex items-center gap-1">
                        <div className="p-1 rounded bg-white/40 border border-red-300 shadow-sm text-red-800">
                            <TrendingDown size={14}/>
                        </div>
                        <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight uppercase">{yearlyStats.year} 年度累積</h4>
                    </div>
                    <div className="text-slate-600 px-1">
                        {collapsedBlocks.yearly ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                    </div>
                </div>

                {!collapsedBlocks.yearly && (
                    <div className="flex flex-col bg-red-50 p-1 gap-1">
                        <div className="w-full flex justify-end">
                            <span className="text-[10px] font-black text-red-800 bg-white/60 px-2 py-0.5 rounded-full border border-red-300 shadow-sm">
                                年度活動次數：{yearlyStats.count} 次
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                            <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1">
                                <table className="w-full text-xs border-collapse bg-white rounded border border-red-300 shadow-sm overflow-hidden">
                                    <thead>
                                        <tr className="bg-red-100 border-b border-red-300 text-slate-900">
                                            <th colSpan={2} className="px-0.5 py-1 text-left font-black uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <Activity size={12} className="text-red-600" />
                                                    年度總計
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-300">
                                        {[
                                            { label: '總人數', val: yearlyStats.totals.attendance, unit: '人' },
                                            { label: '總車資', val: yearlyStats.totals.revenue, isMoney: true },
                                            { label: '總支出', val: yearlyStats.totals.expense, isMoney: true },
                                            { label: '總補助', val: yearlyStats.totals.subsidy, isMoney: true, highlight: true },
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-red-300 last:border-b-0">
                                                <td className="px-0.5 py-1 font-black text-slate-900 border-r border-red-300 whitespace-nowrap">{row.label}</td>
                                                <td className={`px-0.5 py-1 text-right font-black whitespace-nowrap ${row.highlight ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    {row.isMoney ? `$${row.val.toLocaleString()}` : `${row.val.toLocaleString()} ${row.unit}`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1">
                                <table className="w-full text-xs border-collapse bg-white rounded border border-amber-300 shadow-sm overflow-hidden">
                                    <thead>
                                        <tr className="bg-amber-100 border-b border-amber-300 text-slate-900">
                                            <th colSpan={2} className="px-0.5 py-1 text-left font-black uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <Activity size={12} className="text-amber-600" />
                                                    平均數據
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-300">
                                        {[
                                            { label: '均人數', val: yearlyStats.avgs.attendance, unit: '人' },
                                            { label: '均車資', val: yearlyStats.avgs.revenue, isMoney: true },
                                            { label: '均支出', val: yearlyStats.avgs.expense, isMoney: true },
                                            { label: '均補助', val: yearlyStats.avgs.subsidy, isMoney: true, highlight: true },
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-amber-300 last:border-b-0">
                                                <td className="px-0.5 py-1 font-black text-slate-900 border-r border-amber-300 whitespace-nowrap">{row.label}</td>
                                                <td className={`px-0.5 py-1 text-right font-black whitespace-nowrap ${row.highlight ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    {row.isMoney ? `$${row.val.toLocaleString()}` : `${row.val.toLocaleString()} ${row.unit}`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicAnalysisTab;
