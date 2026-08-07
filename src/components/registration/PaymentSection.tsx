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
        <div className="bg-[#FFFFFF] overflow-hidden border-2 border-yellow-200 rounded mb-1 shadow-sm mx-1 md:mx-0 min-w-0">
            {/* Level 1: Section Title - Rainbow Depth Level 1 (Yellow) */}
            <div className="bg-yellow-200 px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center border-b-4 border-yellow-200 min-w-0">
                <h3 className="font-black text-yellow-800 text-sm md:text-base flex items-center gap-2 uppercase tracking-tight">
                    <div className="bg-white/60 p-1 rounded shadow-sm">
                        <CreditCard className="w-5 h-5 text-yellow-700" /> 
                    </div>
                    {t('stake.registration.form.payment_info_title', '付款資訊')}
                </h3>
            </div>

            <div className="p-3 md:p-5 space-y-4 min-w-0">
                {/* V600: Self-paid Insurance Option */}
                {activeEvent?.insurance_type === InsuranceType.SELF_PAID && setNeedsSelfPaidInsurance && (
                    <div className="bg-[#F0F7FF] p-3 md:p-4 rounded border-2 border-indigo-100 mb-2 min-w-0 shadow-inner">
                        <label className="flex items-center cursor-pointer group min-w-0">
                            <input 
                                type="checkbox" 
                                checked={needsSelfPaidInsurance}
                                onChange={e => setNeedsSelfPaidInsurance(e.target.checked)}
                                className="w-5 h-5 md:w-6 md:h-6 text-[#003D79] rounded border-2 border-indigo-200 focus:ring-[#003D79] mr-3 md:mr-4 transition-all shrink-0 cursor-pointer"
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] md:text-sm font-black text-indigo-900 group-hover:text-[#003D79] transition-colors leading-tight uppercase tracking-tight">
                                    {t('stake.registration.form.insurance.self_paid_label', '需要自費投保旅遊平安險嗎？')}
                                </span>
                                <span className="text-[10px] md:text-xs text-indigo-600 font-bold opacity-80 mt-0.5 uppercase tracking-widest">
                                    {t('stake.registration.form.insurance.price_per_person', '每人投保金額')} ${activeEvent.self_paid_insurance_amount || 0}
                                </span>
                            </div>
                        </label>
                        {needsSelfPaidInsurance && memberCount > 0 && (
                            <div className="mt-3 pl-8 md:pl-10 text-[10px] md:text-xs font-black text-pink-600 animate-fade-in flex items-center gap-2 min-w-0">
                                <span className="bg-white px-3 py-1.5 rounded border-2 border-pink-100 truncate shadow-sm">
                                    {t('stake.registration.form.insurance.total_cost', '自費投保總金額')}: {memberCount} {t('人', 'Persons')} x ${activeEvent.self_paid_insurance_amount || 0} = <span className="text-xs md:text-sm underline decoration-double font-black font-mono text-pink-700 ml-1">${memberCount * (activeEvent.self_paid_insurance_amount || 0)}</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-w-0">
                    <div className="min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">{t('stake.registration.form.payment_method_label', '付款方式')}</label>
                        <select 
                            id="paymentMethod"
                            value={paymentMethod} 
                            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} 
                            className={`w-full border-2 rounded h-10 md:h-12 px-3 text-sm transition-all outline-none font-black appearance-none cursor-pointer ${isPaymentError ? 'border-red-500 ring-2 ring-red-100 animate-pulse' : 'border-[#D1D5DB] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB]'} ${!paymentMethod ? 'text-slate-400 italic' : 'text-[#111827]'} bg-white`}
                            required
                        >
                            <option value="" disabled>{tString('stake.registration.form.payment_methods_hint', { defaultValue: '請選擇付款方式' })}</option>
                            {availablePaymentMethods.map(m => <option key={m} value={m} className="text-[#111827] font-black not-italic">
                                {getPaymentMethodLabel(m)}
                            </option>)}
                        </select>
                    </div>
                    
                    <div className="min-w-0">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">{t('stake.registration.form.total_due_label')}</label>
                        <div className="bg-orange-50 h-10 md:h-12 rounded border-2 border-orange-100 flex items-center justify-center shadow-inner">
                            <div className="text-lg md:text-xl font-black text-red-600 font-mono tracking-tighter">
                                ${totalDue}
                            </div>
                        </div>
                    </div>
                </div>
                
                {paymentMethod === PaymentMethod.TRANSFER && (
                    <div className="bg-[#F8FAFC] p-3 md:p-5 rounded border-2 border-slate-200 mt-2 animate-fade-in shadow-inner min-w-0">
                        <div className="text-[10px] md:text-[11px] text-slate-500 mb-4 font-black border-b-2 border-slate-100 pb-2 uppercase tracking-widest">{t('stake.registration.form.transfer_hint')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-w-0">
                            <div className="space-y-4 min-w-0 bg-white p-4 rounded border-2 border-slate-100 shadow-sm">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stake.registration.form.bank_name_label')}</span>
                                    <span className="text-sm font-black text-slate-800 truncate">{settings.bank_info.bank_name}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stake.registration.form.bank_code_label')}</span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg md:text-xl font-black font-mono text-[#003D79]">{settings.bank_info.bank_code}</span>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(settings.bank_info.bank_code)}
                                            className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-[#003D79] transition-all border border-transparent hover:border-blue-100 shrink-0"
                                            title={t('stake.registration.form.copy_bank_code')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stake.registration.form.account_name_label')}</span>
                                    <span className="text-sm font-black text-slate-800 truncate">{settings.bank_info.account_name}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stake.registration.form.account_number_label')}</span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base md:text-xl font-black font-mono text-[#003D79] break-all tracking-tight">{settings.bank_info.account_number}</span>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(settings.bank_info.account_number)}
                                            className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-[#003D79] transition-all border border-transparent hover:border-blue-100 shrink-0"
                                            title={t('stake.registration.form.copy_account')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 md:p-5 rounded border-2 border-yellow-100 flex flex-col justify-center min-w-0 shadow-sm">
                                <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest min-w-0 pl-1">
                                    {t('stake.registration.form.transfer_last_5_label')}
                                </label>
                                <input 
                                    type="text" 
                                    value={transferLast5} 
                                    onChange={e => setTransferLast5(e.target.value)} 
                                    className="w-full border-2 border-[#D1D5DB] rounded h-10 md:h-12 px-3 text-sm bg-white text-[#111827] focus:border-[#EAC100] focus:ring-2 focus:ring-[#FFFBEB] outline-none transition-all placeholder:italic placeholder:text-slate-300 font-black min-w-0" 
                                    placeholder={tAttr('stake.registration.form.last_5_placeholder')} 
                                    maxLength={5} 
                                />
                                <p className="mt-3 text-[10px] text-orange-700 font-black opacity-70 italic leading-tight">
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
