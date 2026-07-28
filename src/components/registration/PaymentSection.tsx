import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { CreditCard, Copy } from 'lucide-react';
import { PaymentMethod, GlobalSettings, EventData, InsuranceType } from '../../../types';

interface PaymentSectionProps {
    paymentMethod: PaymentMethod | '';
    setPaymentMethod: (val: PaymentMethod) => void;
    transferLast5: string;
    setTransferLast5: (val: string) => void;
    totalDue: number;
    needsSelfPaidInsurance?: boolean;
    setNeedsSelfPaidInsurance?: (val: boolean) => void;
    memberCount?: number;
    activeEvent?: EventData;
    availablePaymentMethods: PaymentMethod[];
    settings: GlobalSettings;
    lang?: 'zh' | 'en';
    errorField?: string | null;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
    paymentMethod,
    setPaymentMethod,
    transferLast5,
    setTransferLast5,
    totalDue,
    needsSelfPaidInsurance,
    setNeedsSelfPaidInsurance,
    memberCount = 0,
    activeEvent,
    availablePaymentMethods,
    settings,
    lang,
    errorField
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();

    const isPaymentError = errorField === 'paymentMethod';

    React.useEffect(() => {
        // 預設為轉帳 (Transfer)
        if (!paymentMethod && availablePaymentMethods.includes(PaymentMethod.TRANSFER)) {
            setPaymentMethod(PaymentMethod.TRANSFER);
        }
    }, [availablePaymentMethods, paymentMethod, setPaymentMethod]);

    const getPaymentMethodLabel = (m: PaymentMethod) => {
        switch (m) {
            case PaymentMethod.CASH: return tString('stake.registration.form.payment_methods.cash');
            case PaymentMethod.TRANSFER: return tString('stake.registration.form.payment_methods.transfer');
            case PaymentMethod.EXTENDED: return tString('stake.registration.form.payment_methods.extended');
            default: return m;
        }
    };

    return (
        <div className="bg-yellow-50 overflow-hidden border border-yellow-200 rounded mb-6 shadow-sm mx-1 md:mx-0 min-w-0">
            {/* Level 1: Section Title */}
            <div className="bg-yellow-200 px-3 py-3 md:px-4 md:py-4 flex justify-between items-center border-b-2 border-yellow-300/30 min-w-0">
                <h3 className="font-black text-yellow-900 text-sm md:text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-yellow-700" /> {t('stake.registration.form.payment_info_title', '付款資訊')}
                </h3>
            </div>

            <div className="p-3 md:p-6 space-y-4 min-w-0">
                {/* V600: Self-paid Insurance Option */}
                {activeEvent?.insurance_type === InsuranceType.SELF_PAID && setNeedsSelfPaidInsurance && (
                    <div className="bg-indigo-100 p-3 md:p-4 rounded border-2 border-indigo-200/50 mb-2 min-w-0">
                        <label className="flex items-center cursor-pointer group min-w-0">
                            <input 
                                type="checkbox" 
                                checked={needsSelfPaidInsurance}
                                onChange={e => setNeedsSelfPaidInsurance(e.target.checked)}
                                className="w-6 h-6 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 mr-4 transition-all shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] md:text-sm font-black text-indigo-900 group-hover:text-indigo-700 transition-colors leading-tight">
                                    {t('stake.registration.form.insurance.self_paid_label', '需要自費投保旅遊平安險嗎？')}
                                </span>
                                <span className="text-[10px] md:text-xs text-indigo-600 font-bold opacity-80 mt-0.5">
                                    {t('stake.registration.form.insurance.price_per_person', '每人投保金額')} ${activeEvent.self_paid_insurance_amount || 0}
                                </span>
                            </div>
                        </label>
                        {needsSelfPaidInsurance && memberCount > 0 && (
                            <div className="mt-3 pl-10 text-[10px] md:text-xs font-black text-pink-600 animate-fade-in flex items-center gap-2 min-w-0">
                                <span className="bg-pink-100 px-2 py-1 rounded border border-pink-200 truncate">
                                    {t('stake.registration.form.insurance.total_cost', '自費投保總金額')}: {memberCount}人 x ${activeEvent.self_paid_insurance_amount || 0} = <span className="text-xs md:text-sm underline decoration-double font-black font-mono">${memberCount * (activeEvent.self_paid_insurance_amount || 0)}</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-w-0">
                    <div className="min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-yellow-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.payment_method_label', '付款方式')}</label>
                        <select 
                            id="paymentMethod"
                            value={paymentMethod} 
                            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} 
                            className={`w-full border-2 rounded h-11 px-3 text-sm transition-all focus:ring-4 outline-none font-black ${isPaymentError ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : 'border-yellow-200 focus:ring-yellow-500'} ${!paymentMethod ? 'text-gray-400 italic' : 'text-black'} bg-white`}
                            required
                        >
                            <option value="" disabled>{tString('stake.registration.form.payment_methods_hint', { defaultValue: '請選擇付款方式' })}</option>
                            {availablePaymentMethods.map(m => <option key={m} value={m} className="text-gray-800 font-bold not-italic">
                                {getPaymentMethodLabel(m)}
                            </option>)}
                        </select>
                    </div>
                    
                    <div className="min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-yellow-900 mb-1.5 uppercase tracking-wider">{t('stake.registration.form.total_due_label')}</label>
                        <div className="bg-white p-3 rounded border-2 border-yellow-200 flex flex-col items-center justify-center shadow-inner h-11">
                            <div className="text-lg md:text-xl font-black text-red-600 font-mono tracking-tighter">
                                ${totalDue}
                            </div>
                        </div>
                    </div>
                </div>
                
                {paymentMethod === PaymentMethod.TRANSFER && (
                    <div className="bg-white p-3 md:p-4 rounded border-2 border-yellow-200 mt-2 animate-fade-in shadow-sm min-w-0">
                        <div className="text-[10px] md:text-[11px] text-yellow-900 mb-4 font-black border-b-2 border-yellow-100 pb-2 uppercase tracking-widest">{t('stake.registration.form.transfer_hint')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-w-0">
                            <div className="space-y-3 min-w-0">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('stake.registration.form.bank_name_label')}</span>
                                    <span className="text-sm font-black text-slate-800 truncate">{settings.bank_info.bank_name}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('stake.registration.form.bank_code_label')}</span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xl font-black font-mono text-indigo-700">{settings.bank_info.bank_code}</span>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(settings.bank_info.bank_code)}
                                            className="p-1.5 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-200 shrink-0"
                                            title={t('stake.registration.form.copy_bank_code')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('stake.registration.form.account_name_label')}</span>
                                    <span className="text-sm font-black text-slate-800 truncate">{settings.bank_info.account_name}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('stake.registration.form.account_number_label')}</span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base md:text-xl font-black font-mono text-indigo-700 break-all">{settings.bank_info.account_number}</span>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(settings.bank_info.account_number)}
                                            className="p-1.5 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-200 shrink-0"
                                            title={t('stake.registration.form.copy_account')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50/50 p-4 rounded border-2 border-yellow-100 flex flex-col justify-center min-w-0">
                                <label className="block text-[10px] md:text-[11px] font-black text-yellow-900 mb-2 uppercase tracking-wider min-w-0">
                                    {t('stake.registration.form.transfer_last_5_label')}
                                    {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.last_5_placeholder')} title="Click to edit placeholder key">[P]</span>}
                                </label>
                                <input 
                                    type="text" 
                                    value={transferLast5} 
                                    onChange={e => setTransferLast5(e.target.value)} 
                                    className="w-full border-2 border-yellow-200 rounded h-11 px-3 text-sm bg-white text-black focus:ring-4 focus:ring-yellow-500 outline-none transition-all placeholder:italic placeholder:text-slate-300 font-black min-w-0" 
                                    placeholder={tAttr('stake.registration.form.last_5_placeholder')} 
                                    maxLength={5} 
                                />
                                <p className="mt-2 text-[10px] text-yellow-700 font-black opacity-70 italic leading-tight">
                                    * {t('stake.registration.form.transfer_hint_short', '請輸入轉帳帳號末五碼以利核對')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSection;
