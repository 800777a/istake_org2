import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Registration, PaymentMethod, TripType } from '../../types';
import ReconciliationRow, { ColorTheme } from './ReconciliationRow';
import { ArrowUpNarrowWide, ArrowDownWideNarrow, CheckCircle, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UnitFeeTableProps {
    unitName: string;
    registrations: Registration[];
    familyDataMap: Map<string, { totalAmount: number, last5: string, members: Registration[] }>;
    primaryContactMap: Map<string, string>;
    onTogglePaid: (r: Registration) => void;
    onBatchPaid: (unitName: string) => void;
    isLocked: boolean;
}

type SortKey = 'representative' | 'total' | 'transfer' | 'last5' | 'name' | 'payment' | 'amount' | 'status';
type SortOrder = 'asc' | 'desc';

const UnitFeeTable: React.FC<UnitFeeTableProps> = ({
    unitName,
    registrations,
    familyDataMap,
    primaryContactMap,
    onTogglePaid,
    onBatchPaid,
    isLocked
}) => {
    const { t } = useI18n();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
        key: 'status',
        order: 'asc'
    });

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.order === 'asc' 
            ? <ArrowUpNarrowWide className="w-3 h-3 ml-1 text-sky-600" /> 
            : <ArrowDownWideNarrow className="w-3 h-3 ml-1 text-sky-600" />;
    };

    const sortedRepresentatives = useMemo(() => {
        // ... (sorting logic remains the same, just removing references to theme if any)
        // Group by family first
        const families = new Map<string, Registration[]>();
        registrations.forEach(r => {
            const fid = r.family_group_id || r.reg_id;
            if (!families.has(fid)) {
                families.set(fid, []);
            }
            families.get(fid)!.push(r);
        });

        // Get representative for each family
        const representatives = Array.from(families.values()).map(members => {
            return members.find(m => m.is_primary_contact) || members[0];
        });

        return representatives.sort((a, b) => {
            const primarySort = () => {
                let valA: any = '';
                let valB: any = '';

                switch (sortConfig.key) {
                    case 'representative':
                        valA = a.primary_contact_name || primaryContactMap.get(a.family_group_id) || '';
                        valB = b.primary_contact_name || primaryContactMap.get(b.family_group_id) || '';
                        return valA.localeCompare(valB, 'zh-Hant');
                    case 'total':
                        valA = familyDataMap.get(a.family_group_id)?.totalAmount || 0;
                        valB = familyDataMap.get(b.family_group_id)?.totalAmount || 0;
                        return valA - valB;
                    case 'transfer':
                        valA = a.payment_method === PaymentMethod.TRANSFER ? (familyDataMap.get(a.family_group_id)?.totalAmount || 0) : 0;
                        valB = b.payment_method === PaymentMethod.TRANSFER ? (familyDataMap.get(b.family_group_id)?.totalAmount || 0) : 0;
                        return valA - valB;
                    case 'last5':
                        valA = familyDataMap.get(a.family_group_id)?.last5 || '';
                        valB = familyDataMap.get(b.family_group_id)?.last5 || '';
                        return valA.localeCompare(valB, 'zh-Hant');
                    case 'payment':
                        const pMap = { 
                            [PaymentMethod.TRANSFER]: 1, 
                            [PaymentMethod.CASH]: 2, 
                            [PaymentMethod.EXTENDED]: 3,
                            [PaymentMethod.EXEMPT]: 4
                        };
                        valA = (pMap as any)[a.payment_method] || 99;
                        valB = (pMap as any)[b.payment_method] || 99;
                        return valA - valB;
                    case 'status':
                        valA = a.is_paid ? 1 : 0;
                        valB = b.is_paid ? 1 : 0;
                        return valA - valB;
                    default:
                        return 0;
                }
            };

            const result = primarySort();
            if (result === 0) {
                return (a.family_group_id || '').localeCompare(b.family_group_id || '');
            }
            return sortConfig.order === 'asc' ? result : -result;
        });
    }, [registrations, sortConfig, familyDataMap, primaryContactMap]);

    // Calculate Unit Stats
    const cashTotal = registrations.filter(r => r.payment_method === PaymentMethod.CASH).reduce((sum, r) => sum + r.amount_due, 0);
    const cashPaid = registrations.filter(r => r.payment_method === PaymentMethod.CASH && r.is_paid).reduce((sum, r) => sum + r.amount_due, 0);
    
    const transferTotal = registrations.filter(r => r.payment_method === PaymentMethod.TRANSFER).reduce((sum, r) => sum + r.amount_due, 0);
    const transferPaid = registrations.filter(r => r.payment_method === PaymentMethod.TRANSFER && r.is_paid).reduce((sum, r) => sum + r.amount_due, 0);

    const hasUnpaidCash = registrations.some(r => !r.is_paid && r.amount_due > 0 && r.payment_method === PaymentMethod.CASH);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-fade-in mb-6">
            {/* Unit Header: Row 1 Title */}
            <div 
                className="bg-indigo-900 text-white p-4 flex justify-between items-center cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/10 rounded-lg border border-white/10">
                        <CheckCircle className="text-blue-300" size={20} />
                    </div>
                    <h3 className="text-base md:text-lg font-bold tracking-tight">
                        {unitName}
                    </h3>
                </div>
                <div className="flex items-center gap-4">
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        {/* Unit Stats & Action Row: Right Aligned */}
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">轉帳:</span>
                                    <span className="text-sm font-bold text-blue-600">${transferPaid.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-400">/ ${transferTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">現金:</span>
                                    <span className="text-sm font-bold text-amber-600">${cashPaid.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-400">/ ${cashTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {hasUnpaidCash && (
                                <div className="flex justify-end">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if (!isLocked) onBatchPaid(unitName); }}
                                        disabled={isLocked}
                                        className={`flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-bold transition-all shadow-sm ${isLocked ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {t('fee.button.cashAllPaid', '批次執行現金全收')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap border-collapse text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th onClick={() => handleSort('representative')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-1">
                                                {t('representative')} 
                                                {getSortIcon('representative')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('payment')} className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center justify-center gap-1">
                                                {t('payment_method_label')} 
                                                {getSortIcon('payment')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('total')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center justify-end gap-1">
                                                {t('total_due_label')} 
                                                {getSortIcon('total')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('status')} className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center justify-center gap-1">
                                                {t('payment_status_label')} 
                                                {getSortIcon('status')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('transfer')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center justify-end gap-1">
                                                {t('transfer_amount_label')} 
                                                {getSortIcon('transfer')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('last5')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-1">
                                                {t('last_5_digits_label')} 
                                                {getSortIcon('last5')}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedRepresentatives.map(reg => {
                                        const group = familyDataMap.get(reg.family_group_id);
                                        return (
                                            <ReconciliationRow 
                                                key={reg.reg_id} 
                                                reg={reg} 
                                                primaryContactName={reg.primary_contact_name || primaryContactMap.get(reg.family_group_id) || reg.name}
                                                familyTotal={group ? group.totalAmount : 0}
                                                familyLast5={group ? group.last5 : ''}
                                                onTogglePaid={onTogglePaid} 
                                                isLocked={isLocked} 
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnitFeeTable;
