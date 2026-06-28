import React from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, PaymentMethod, TripType } from '../../types';

// Theme Definition (Shared interface)
export interface ColorTheme {
    bg: string;
    border: string;
    text: string;
    headerBg: string;
    rowHover: string;
    lightText: string;
    badgeBg: string;
    badgeText: string;
}

interface ReconciliationRowProps {
    reg: Registration;
    primaryContactName: string;
    familyTotal: number;
    familyLast5: string;
    onTogglePaid: (r: Registration) => void;
    isLocked: boolean;
    theme: ColorTheme;
}

const ReconciliationRow: React.FC<ReconciliationRowProps> = ({ 
    reg, 
    primaryContactName, 
    familyTotal, 
    familyLast5, 
    onTogglePaid, 
    isLocked, 
    theme 
}) => {
    const { t } = useTranslation();
    
    // Helper for Payment Method Badge
    const getMethodBadge = () => {
        if (reg.amount_due === 0) {
            // Amount is 0 -> User does not need to pay -> "免付"
            return <span className="px-2 py-1 rounded text-[10px] bg-gray-100 text-gray-500 font-bold border border-gray-200 whitespace-nowrap">{t('common.status.free', '免付')}</span>;
        }
        switch (reg.payment_method) {
            case PaymentMethod.CASH:
                return <span className="px-2 py-1 rounded text-[10px] bg-yellow-100 text-yellow-800 font-bold border border-yellow-200 whitespace-nowrap">{t('common.payment.cash', '現金')}</span>;
            case PaymentMethod.TRANSFER:
                return <span className="px-2 py-1 rounded text-[10px] bg-blue-100 text-blue-800 font-bold border border-blue-200 whitespace-nowrap">{t('common.payment.transfer', '轉帳')}</span>;
            case PaymentMethod.EXTENDED:
                return <span className="px-2 py-1 rounded text-[10px] bg-gray-200 text-gray-700 font-bold border border-gray-300 whitespace-nowrap">{t('common.payment.extended', '延用')}</span>;
            default:
                if (reg.trip_type === TripType.RETAINED) return null;
                return <span className="px-2 py-1 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">{reg.payment_method}</span>;
        }
    };

    // Helper for Trip Badge
    const getTripBadge = () => {
        if (reg.trip_type === TripType.RETAINED) {
            return <span className="px-2 py-1 rounded text-[10px] bg-purple-100 text-purple-900 font-bold border border-purple-300 whitespace-nowrap">{t('common.trip.retained', '留用')}</span>;
        }
        if (reg.trip_type === TripType.SELF_MANAGED) {
            return <span className="px-2 py-1 rounded text-[10px] bg-blue-50 text-blue-800 border-blue-200 whitespace-nowrap">{t('common.trip.self_managed', '自理')}</span>;
        }
        return <span className="px-2 py-1 rounded text-[10px] bg-green-50 text-green-800 border-green-200 whitespace-nowrap">{t('common.status.success', '成功')}</span>;
    };

    // Helper for Status Badge
    const getStatusBadge = () => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED) {
            // Amount is 0 or Extended -> Organizer does not need to receive -> "免收"
            return <span className="px-2 py-1 rounded text-[10px] bg-gray-100 text-gray-500 font-bold border border-gray-200 whitespace-nowrap">{t('common.status.waived', '免收')}</span>;
        }
        if (reg.is_paid) {
            return <span className="px-2 py-1 rounded text-[10px] bg-green-100 text-green-800 font-bold border border-green-200 hover:bg-green-200 transition-colors whitespace-nowrap">{t('common.status.paid', '已收')}</span>;
        } else {
            return <span className="px-2 py-1 rounded text-[10px] bg-red-100 text-red-800 font-bold border border-red-200 hover:bg-red-200 transition-colors whitespace-nowrap">{t('common.status.unpaid', '未收')}</span>;
        }
    };

    // Transfer Amount Display Logic: Show 0 until Paid (Visual Aid)
    const transferAmountDisplay = reg.is_paid ? familyTotal : 0;

    return (
        <tr id={`row-${reg.reg_id}`} className={`${theme.rowHover} transition-colors bg-white border-b ${theme.border}`}>
            <td className="p-3 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] whitespace-nowrap">
                {primaryContactName}
            </td>
            
            {/* Payment Method Column */}
            <td className="p-3 text-center">
                {getMethodBadge()}
            </td>

            <td className={`p-3 font-mono text-gray-800 text-right font-bold opacity-70`}>${familyTotal.toLocaleString()}</td>
            
            {/* Status Column (Toggle Button) */}
            <td className="p-3 text-center border-l border-gray-100">
                <button 
                    onClick={() => onTogglePaid(reg)}
                    disabled={isLocked || reg.amount_due === 0}
                    className={`focus:outline-none ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {getStatusBadge()}
                </button>
            </td>

            <td className={`p-3 font-mono text-gray-800 text-right opacity-70`}>${transferAmountDisplay.toLocaleString()}</td>
            <td className={`p-3 font-mono text-gray-900 font-bold opacity-70`}>{familyLast5 || '-'}</td>
        </tr>
    );
};

export default ReconciliationRow;
