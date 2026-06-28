
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Power, ShieldAlert, Clock } from 'lucide-react';
import { EventData } from '../../types';

interface RegistrationSwitchProps {
    isRegOpen: boolean;
    onToggle: (val: boolean) => void;
    regDeadlineInput: string;
    onDeadlineChange: (val: string) => void;
    isDeadlinePassed: boolean;
    stopCancellation?: boolean; // V180
    onStopCancellationToggle?: (val: boolean) => void; // V180
    paymentDeadlineDays?: number;
    onPaymentDeadlineChange?: (val: number) => void;
}

const RegistrationSwitch: React.FC<RegistrationSwitchProps> = ({ 
    isRegOpen, 
    onToggle, 
    regDeadlineInput, 
    onDeadlineChange,
    isDeadlinePassed,
    stopCancellation = false,
    onStopCancellationToggle,
    paymentDeadlineDays = 0,
    onPaymentDeadlineChange
}) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 space-y-6 shadow-inner">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-black text-purple-900 w-24">{t('stake.reg_switch.label.reg_system', '報名系統')}:</label>
                    <button 
                        onClick={() => onToggle(!isRegOpen)}
                        className={`flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-black transition-all w-full md:w-auto shadow-md border-2 ${isRegOpen ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                    >
                        <Power className="w-4 h-4 mr-2" />
                        {isRegOpen ? t('stake.reg_switch.status.open', '已開放報名') : t('stake.reg_switch.status.closed', '已停止報名')}
                    </button>
                    {isRegOpen && isDeadlinePassed && (
                        <span className="text-xs text-red-600 font-black hidden md:inline ml-2 bg-red-50 border border-red-200 px-3 py-1 rounded-full animate-pulse">
                            ({t('stake.reg_switch.msg.deadline_passed', '期限已過，前台截止')})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-black text-indigo-900 w-24">{t('stake.reg_switch.label.cancellation', '撤銷報名')}:</label>
                    <button 
                        onClick={() => onStopCancellationToggle?.(!stopCancellation)}
                        className={`flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-black transition-all w-full md:w-auto shadow-md border-2 ${stopCancellation ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                    >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        {stopCancellation ? t('common.no', '不可以') : t('common.yes', '可以')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-purple-50">
                <div className="space-y-2">
                    <label className="text-xs font-black text-purple-800 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {t('stake.reg_switch.label.reg_deadline', '報名截止期限')} (Registration Deadline)
                    </label>
                    <input 
                        type="datetime-local" 
                        value={regDeadlineInput} 
                        onChange={e => onDeadlineChange(e.target.value)}
                        className="border-2 border-purple-100 rounded-xl px-4 py-3 text-sm w-full bg-gray-50 text-purple-900 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-red-800 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {t('stake.reg_switch.label.payment_limit', '繳費天數限制')} (Payment Days Limit)
                    </label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="number" 
                            value={paymentDeadlineDays} 
                            onChange={e => onPaymentDeadlineChange?.(parseInt(e.target.value) || 0)}
                            className="border-2 border-red-100 rounded-xl px-4 py-3 text-sm w-full bg-gray-50 text-red-900 focus:bg-white focus:border-red-300 focus:ring-4 focus:ring-red-100 outline-none transition-all font-black text-right"
                        />
                        <span className="text-xs font-black text-gray-400 whitespace-nowrap">{t('common.label.days_unit', { count: paymentDeadlineDays, defaultValue: '{{count}} 天 (0為不限)' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSwitch;
