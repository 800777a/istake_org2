
import React, { useMemo, useState } from 'react';
import { Registration, RegStatus, TripType, PaymentMethod, User, GlobalSettings } from '../types';
import { ArrowRightCircle, ArrowLeftCircle } from 'lucide-react';
import { updateRegistrationField } from '../services/sheetService';
import PaymentInfoModal from './PaymentInfoModal';
import Toast, { ToastType } from './Toast';

interface SharedRegistrationListProps {
    registrations: Registration[];
    unitName: string;
    currentUser: User | null;
    settings: GlobalSettings;
    allRegistrations?: Registration[];
    isLockedPayment?: boolean;
    isLockedCheckInTo?: boolean;
    isLockedCheckInBack?: boolean;
    isEventClosed?: boolean;
    onRefresh: () => void;
}

const SharedRegistrationList: React.FC<SharedRegistrationListProps> = ({ 
    registrations, 
    unitName, 
    currentUser, 
    settings,
    allRegistrations = [],
    isLockedPayment = false,
    isLockedCheckInTo = false,
    isLockedCheckInBack = false,
    isEventClosed = false,
    onRefresh 
}) => {
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [selectedPaymentReg, setSelectedPaymentReg] = useState<Registration | null>(null);
    
    // Filter Valid
    const validRegs = registrations.filter(r => r.status === RegStatus.NORMAL);

    // Calculate Stats
    const stats = useMemo(() => {
        let expectedTransfer = 0;
        let actualTransfer = 0;
        let expectedCash = 0;
        let actualCash = 0;
        let retainedAmount = 0; // For '留用'

        validRegs.forEach(r => {
            if (r.payment_method === PaymentMethod.TRANSFER) {
                expectedTransfer += r.amount_due;
                if (r.is_paid) actualTransfer += r.amount_due;
            } else if (r.payment_method === PaymentMethod.CASH) {
                expectedCash += r.amount_due;
                if (r.is_paid) actualCash += r.amount_due;
            } else if (r.trip_type === TripType.RETAINED) {
                retainedAmount += r.amount_due; // Assume retained is always "paid/handled" internally, or just track amount
            }
        });

        return { expectedTransfer, actualTransfer, expectedCash, actualCash, retainedAmount };
    }, [validRegs]);

    const isStakeAdmin = currentUser?.role === 'stake_admin';

    const handleTogglePayment = (reg: Registration) => {
        if (isLockedPayment || isEventClosed) return;
        
        // V114: Transfer permission check
        if (reg.payment_method === PaymentMethod.TRANSFER && !isStakeAdmin) {
            setMsgType('error');
            setMsg('轉帳狀態僅主辦人可變更');
            return;
        }

        const newVal = !reg.is_paid;
        updateRegistrationField(reg.reg_id, 'is_paid', newVal);
        onRefresh();
    };

    const handleToggleCheckIn = (reg: Registration, type: 'to' | 'back') => {
        if (isEventClosed) return;
        if (type === 'to' && isLockedCheckInTo) return;
        if (type === 'back' && isLockedCheckInBack) return;

        const field = type === 'to' ? 'is_checked_in_to' : 'is_checked_in_back';
        const newVal = !reg[field];
        
        updateRegistrationField(reg.reg_id, field, newVal);
        // Also update legacy is_checked_in for compatibility if needed
        if (type === 'to') updateRegistrationField(reg.reg_id, 'is_checked_in', newVal);
        
        onRefresh();
    };

    return (
        <div className="space-y-4">
            {/* Stats Block */}
            <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <div className="text-blue-600 font-bold mb-1">應收轉帳</div>
                        <div className="text-base font-bold text-gray-800">${stats.expectedTransfer.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-100 p-2 rounded border border-blue-200">
                        <div className="text-blue-800 font-bold mb-1">實收轉帳</div>
                        <div className="text-base font-bold text-blue-900">${stats.actualTransfer.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                        <div className="text-green-600 font-bold mb-1">應收現金</div>
                        <div className="text-base font-bold text-gray-800">${stats.expectedCash.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-100 p-2 rounded border border-green-200">
                        <div className="text-green-800 font-bold mb-1">實收現金</div>
                        <div className="text-base font-bold text-green-900">${stats.actualCash.toLocaleString()}</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded border border-orange-100">
                        <div className="text-orange-600 font-bold mb-1">留用金額</div>
                        <div className="text-base font-bold text-orange-800">${stats.retainedAmount.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow-sm border overflow-hidden max-h-[600px] overflow-y-auto">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-50 border-b text-gray-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 font-bold sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">姓名</th>
                                <th className="p-3 font-bold bg-gray-50">教儀/場次</th>
                                <th className="p-3 font-bold bg-gray-50">收費</th>
                                <th className="p-3 font-bold text-right bg-gray-50">車資</th>
                                <th className="p-3 font-bold text-center bg-gray-50">付款(狀態)</th>
                                <th className="p-3 font-bold bg-gray-50">行程</th>
                                <th className="p-3 font-bold text-center bg-gray-50">去程點名</th>
                                <th className="p-3 font-bold text-center bg-gray-50">回程點名</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {validRegs.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-8 text-gray-400">尚無資料</td></tr>
                            ) : (
                                validRegs.map(reg => (
                                    <tr key={reg.reg_id} className="hover:bg-gray-50">
                                        <td 
                                            className="p-3 font-bold text-gray-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] cursor-pointer hover:text-blue-600 transition-colors"
                                            onClick={() => setSelectedPaymentReg(reg)}
                                        >
                                            {reg.name} {reg.bus_assigned && <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded border border-indigo-100">{reg.bus_assigned}</span>}
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            {reg.ordinance_item}
                                            {reg.ceremony_session && <span className="text-xs text-purple-600 ml-1">({reg.ceremony_session})</span>}
                                        </td>
                                        <td className="p-3 text-gray-500 text-xs">{reg.identity_type}</td>
                                        <td className="p-3 font-mono font-medium text-right text-gray-700">${reg.amount_due}</td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleTogglePayment(reg)} 
                                                disabled={isLockedPayment || isEventClosed || (reg.payment_method === PaymentMethod.TRANSFER && !isStakeAdmin)} 
                                                className={`text-xs font-bold transition-colors ${reg.is_paid ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'} ${(isLockedPayment || isEventClosed || (reg.payment_method === PaymentMethod.TRANSFER && !isStakeAdmin)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {reg.payment_method}({reg.is_paid ? '已繳' : '未繳'})
                                            </button>
                                        </td>
                                        <td className="p-3 text-gray-600">{reg.trip_type}</td>
                                        <td className="p-3 text-center">
                                            {(reg.trip_type === TripType.ROUND_TRIP || reg.trip_type === TripType.ONE_WAY_TO) && (
                                                <button onClick={() => handleToggleCheckIn(reg, 'to')} disabled={isLockedCheckInTo} className={`p-2 rounded-full transition-colors ${reg.is_checked_in_to ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'} ${isLockedCheckInTo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-200'}`}><ArrowRightCircle className="w-6 h-6" /></button>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {(reg.trip_type === TripType.ROUND_TRIP || reg.trip_type === TripType.ONE_WAY_BACK) && (
                                                <button onClick={() => handleToggleCheckIn(reg, 'back')} disabled={isLockedCheckInBack} className={`p-2 rounded-full transition-colors ${reg.is_checked_in_back ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'} ${isLockedCheckInBack ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-200'}`}><ArrowLeftCircle className="w-6 h-6" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />

            {selectedPaymentReg && (
                <PaymentInfoModal
                    key={`payment-${selectedPaymentReg.reg_id}`}
                    currentReg={selectedPaymentReg}
                    allRegistrations={allRegistrations.length > 0 ? allRegistrations : registrations}
                    settings={settings}
                    onClose={() => setSelectedPaymentReg(null)}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    );
};

export default SharedRegistrationList;
