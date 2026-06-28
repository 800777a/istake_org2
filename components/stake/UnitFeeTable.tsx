import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, PaymentMethod, TripType } from '../../types';
import ReconciliationRow, { ColorTheme } from './ReconciliationRow';
import { ArrowUpNarrowWide, ArrowDownWideNarrow, CheckCircle, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface UnitFeeTableProps {
    unitName: string;
    registrations: Registration[];
    familyDataMap: Map<string, { totalAmount: number, last5: string, members: Registration[] }>;
    primaryContactMap: Map<string, string>;
    onTogglePaid: (r: Registration) => void;
    onBatchPaid: (unitName: string) => void;
    isLocked: boolean;
    theme: ColorTheme;
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
    isLocked,
    theme
}) => {
    const { t } = useTranslation();
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
            ? <ArrowUpNarrowWide className="w-3 h-3 ml-1 text-blue-600" /> 
            : <ArrowDownWideNarrow className="w-3 h-3 ml-1 text-blue-600" />;
    };

    const sortedRepresentatives = useMemo(() => {
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
                        const pMap = { [PaymentMethod.TRANSFER]: 1, [PaymentMethod.CASH]: 2, [PaymentMethod.EXTENDED]: 3 };
                        valA = pMap[a.payment_method] || 99;
                        valB = pMap[b.payment_method] || 99;
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

    const hasUnpaid = registrations.some(r => !r.is_paid && r.amount_due > 0 && r.payment_method !== PaymentMethod.EXTENDED);

    return (
        <div className={`rounded-lg border shadow-sm overflow-hidden ${theme.bg} ${theme.border} font-sans`}>
            {/* Unit Header with Stats - Requested Format */}
            <div className={`p-3 border-b ${theme.border} ${theme.headerBg} font-bold ${theme.text} flex justify-between items-center`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="mr-1 text-sm">{unitName},</span>
                    
                    <span className={`${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 rounded text-[10px] border ${theme.border} text-blue-800`}>
                        {t('fee.stats.transfer', { paid: transferPaid, total: transferTotal, defaultValue: `轉帳:已收${transferPaid}/應收${transferTotal}` })},
                    </span>

                    <span className={`${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 rounded text-[10px] border ${theme.border} text-purple-800`}>
                        {t('fee.stats.cash', { paid: cashPaid, total: cashTotal, defaultValue: `現金:已收${cashPaid}/應收${cashTotal}` })}
                    </span>
                </div>

                {!isLocked && hasUnpaid && (
                    <button 
                        onClick={() => onBatchPaid(unitName)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <CheckCircle className="w-3 h-3" />
                        {t('fee.button.batchPaid', '全部已收')}
                    </button>
                )}
            </div>

            {/* Table Container - Independent Horizontal Scroll */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className={`font-bold ${theme.text} border-b ${theme.border} ${theme.bg}`}>
                        <tr>
                            <th onClick={() => handleSort('representative')} className={`p-3 w-32 sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${theme.bg} cursor-pointer hover:bg-black/5`}>
                                <div className="flex items-center">{t('representative')} {getSortIcon('representative')}</div>
                            </th>
                            <th onClick={() => handleSort('payment')} className="p-3 text-center w-20 cursor-pointer hover:bg-black/5">
                                <div className="flex items-center justify-center">{t('payment_method_label')} {getSortIcon('payment')}</div>
                            </th>
                            <th onClick={() => handleSort('total')} className="p-3 w-24 text-right cursor-pointer hover:bg-black/5">
                                <div className="flex items-center justify-end">{t('total_due_label')} {getSortIcon('total')}</div>
                            </th>
                            <th onClick={() => handleSort('status')} className="p-3 text-center w-20 cursor-pointer hover:bg-black/5 border-l border-white/20">
                                <div className="flex items-center justify-center">{t('payment_status_label')} {getSortIcon('status')}</div>
                            </th>
                            <th onClick={() => handleSort('transfer')} className="p-3 w-24 text-right cursor-pointer hover:bg-black/5">
                                <div className="flex items-center justify-end">{t('transfer_amount_label')} {getSortIcon('transfer')}</div>
                            </th>
                            <th onClick={() => handleSort('last5')} className="p-3 w-24 cursor-pointer hover:bg-black/5">
                                <div className="flex items-center">{t('last_5_digits_label')} {getSortIcon('last5')}</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}`}>
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
                                    theme={theme}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UnitFeeTable;
