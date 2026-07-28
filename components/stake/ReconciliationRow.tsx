import React from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
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
}

const ReconciliationRow: React.FC<ReconciliationRowProps> = ({ 
    reg, 
    primaryContactName, 
    familyTotal, 
    familyLast5, 
    onTogglePaid, 
    isLocked 
}) => {
    const { t } = useI18n();
    
    // Helper for Payment Method Badge
    const getMethodBadge = () => {
        if (reg.amount_due === 0) {
            return <span className="px-3 py-1 rounded text-[10px] bg-slate-100 text-slate-500 font-black border-2 border-slate-200 whitespace-nowrap">{t('common.status.free', '免付費項目')}</span>;
        }
        switch (reg.payment_method) {
            case PaymentMethod.CASH:
                return <span className="px-3 py-1 rounded text-[10px] bg-amber-100 text-amber-900 font-black border-2 border-amber-200 whitespace-nowrap shadow-sm shadow-amber-100/50">{t('common.payment.cash', '現場收現')}</span>;
            case PaymentMethod.TRANSFER:
                return <span className="px-3 py-1 rounded text-[10px] bg-sky-100 text-sky-900 font-black border-2 border-sky-200 whitespace-nowrap shadow-sm shadow-sky-100/50">{t('common.payment.transfer', '銀行轉帳')}</span>;
            case PaymentMethod.EXTENDED:
                return <span className="px-3 py-1 rounded text-[10px] bg-slate-100 text-slate-700 font-black border-2 border-slate-300 whitespace-nowrap uppercase tracking-widest">{t('common.payment.extended', '舊案延用')}</span>;
            case PaymentMethod.EXEMPT:
                return <span className="px-3 py-1 rounded text-[10px] bg-rose-100 text-rose-900 font-black border-2 border-rose-300 whitespace-nowrap shadow-sm shadow-rose-100/50">{t('common.payment.exempt', '特別免收')}</span>;
            default:
                if (reg.trip_type === TripType.RETAINED) return null;
                return <span className="px-3 py-1 rounded text-[10px] bg-slate-50 text-slate-600 border-2 border-slate-200 whitespace-nowrap font-black uppercase">{reg.payment_method}</span>;
        }
    };

    // Helper for Status Badge
    const getStatusBadge = () => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED || reg.payment_method === PaymentMethod.EXEMPT) {
            return <span className="px-4 py-1.5 rounded text-[10px] bg-slate-100 text-slate-400 font-black border-2 border-slate-200 whitespace-nowrap opacity-50 uppercase tracking-widest">{t('common.status.waived', '免收')}</span>;
        }
        if (reg.is_paid) {
            return <span className="px-4 py-1.5 rounded text-[10px] bg-emerald-100 text-emerald-900 font-black border-2 border-emerald-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all whitespace-nowrap shadow-lg shadow-emerald-900/5 uppercase tracking-widest">{t('common.status.paid', '確認已收')}</span>;
        } else {
            return <span className="px-4 py-1.5 rounded text-[10px] bg-rose-100 text-rose-900 font-black border-2 border-rose-300 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-500 transition-all whitespace-nowrap shadow-lg shadow-rose-900/5 uppercase tracking-widest">{t('common.status.unpaid', '尚未入帳')}</span>;
        }
    };

    // Transfer Amount Display Logic: Show 0 until Paid (Visual Aid)
    const transferAmountDisplay = reg.is_paid ? familyTotal : 0;

    return (
        <tr id={`row-${reg.reg_id}`} className="hover:bg-slate-50 transition-all bg-white border-b-2 border-slate-50 group">
            <td className="px-8 py-6 font-black text-slate-900 sticky left-0 bg-white z-10 border-r-2 border-slate-50 group-hover:bg-slate-50 whitespace-nowrap transition-all text-sm tracking-tight">
                {primaryContactName}
            </td>
            
            {/* Payment Method Column */}
            <td className="px-6 py-6 text-center">
                {getMethodBadge()}
            </td>

            <td className="px-6 py-6 font-mono text-slate-900 text-right font-black text-base">
                ${familyTotal.toLocaleString()}
            </td>
            
            {/* Status Column (Toggle Button) */}
            <td className="px-6 py-6 text-center border-x-2 border-slate-50">
                <button 
                    onClick={() => onTogglePaid(reg)}
                    disabled={isLocked || reg.amount_due === 0}
                    className={`focus:outline-none transition-all active:scale-90 ${isLocked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                >
                    {getStatusBadge()}
                </button>
            </td>

            <td className="px-6 py-6 font-mono text-slate-400 text-right font-bold">
                ${transferAmountDisplay.toLocaleString()}
            </td>
            <td className="px-8 py-6 font-mono text-slate-900 font-black uppercase tracking-widest text-sm">
                {familyLast5 || <span className="text-slate-200">-----</span>}
            </td>
        </tr>
    );
};

export default ReconciliationRow;
