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
    lang
}) => {
    const { t, tString, tAttr, isEditMode, setActiveKey } = useI18n();

    const getPaymentMethodLabel = (m: PaymentMethod) => {
        switch (m) {
            case PaymentMethod.CASH: return tString('stake.registration.form.payment_methods.cash');
            case PaymentMethod.TRANSFER: return tString('stake.registration.form.payment_methods.transfer');
            case PaymentMethod.EXTENDED: return tString('stake.registration.form.payment_methods.extended');
            default: return m;
        }
    };

    return (
        <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 mb-6">
            <h3 className="font-bold text-blue-900 mb-4 text-sm flex items-center">
                <CreditCard className="w-5 h-5 mr-2" /> {t('stake.registration.form.payment_info_title')}
            </h3>
            <div className="space-y-4">
                {/* V600: Self-paid Insurance Option */}
                {activeEvent?.insurance_type === InsuranceType.SELF_PAID && setNeedsSelfPaidInsurance && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-2">
                        <label className="flex items-center cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={needsSelfPaidInsurance}
                                onChange={e => setNeedsSelfPaidInsurance(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-3"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-indigo-900 group-hover:text-indigo-700 transition-colors">
                                    {t('stake.registration.form.insurance.self_paid_label', '需要自費投保旅遊平安險嗎？')}
                                </span>
                                <span className="text-xs text-indigo-500 font-bold">
                                    {t('stake.registration.form.insurance.price_per_person', '每人投保金額')} ${activeEvent.self_paid_insurance_amount || 0}
                                </span>
                            </div>
                        </label>
                        {needsSelfPaidInsurance && memberCount > 0 && (
                            <div className="mt-2 pl-8 text-xs font-black text-pink-600 animate-fade-in">
                                {t('stake.registration.form.insurance.total_cost', '自費投保總金額')}: {memberCount}人 x ${activeEvent.self_paid_insurance_amount || 0} = <span className="text-sm underline decoration-double">${memberCount * (activeEvent.self_paid_insurance_amount || 0)}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">{t('stake.registration.form.select_hint')}</label>
                        <select 
                            value={paymentMethod} 
                            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} 
                            className={`w-full border rounded h-[38px] px-2 text-xs ${!paymentMethod ? 'text-gray-400' : 'text-black'} bg-white`}
                            required
                        >
                            <option value="" disabled>{tString('stake.registration.form.payment_methods_hint', { defaultValue: '請選擇付款方式' })}</option>
                            {availablePaymentMethods.map(m => <option key={m} value={m} className="text-gray-800">
                                {getPaymentMethodLabel(m)}
                            </option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">{t('stake.registration.form.total_due_label')}</label>
                        <div className="w-full border rounded h-[38px] px-3 font-bold text-red-600 bg-white text-right shadow-inner flex items-center justify-end text-sm">
                            ${totalDue}
                        </div>
                    </div>
                </div>
                
                {paymentMethod === PaymentMethod.TRANSFER && (
                    <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4 animate-fade-in">
                        <div className="text-xs text-blue-900 mb-3 font-bold border-b border-blue-100 pb-2">{t('stake.registration.form.transfer_hint')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 text-xs text-blue-900">
                                <div>{t('stake.registration.form.bank_name_label')}: <span className="font-bold">{settings.bank_info.bank_name}</span></div>
                                <div className="flex items-center">
                                    <span>{t('stake.registration.form.bank_code_label')}: <span className="font-mono font-bold text-xl tracking-wider text-blue-800">{settings.bank_info.bank_code}</span></span>
                                    <button 
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(settings.bank_info.bank_code)}
                                        className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        title={t('stake.registration.form.copy_bank_code')}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                                <div>{t('stake.registration.form.account_name_label')}: <span className="font-bold">{settings.bank_info.account_name}</span></div>
                                <div className="flex items-center">
                                    <span className="mr-1">{t('stake.registration.form.account_number_label')}: </span>
                                    <span className="font-mono font-bold text-xl tracking-wider text-blue-800">{settings.bank_info.account_number}</span>
                                    <button 
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(settings.bank_info.account_number)}
                                        className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        title={t('stake.registration.form.copy_account')}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                {settings.bank_info.contact_phone && (
                                    <div className="flex items-center">
                                        <span>{t('stake.registration.form.contact_phone_label')}: <span className="font-mono font-bold text-xl tracking-wider text-blue-800">{settings.bank_info.contact_phone}</span></span>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(settings.bank_info.contact_phone!)}
                                            className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title={t('stake.registration.form.copy_phone')}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1">
                                    {t('stake.registration.form.transfer_last_5_label')}
                                    {isEditMode && <span className="ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-mono" onClick={() => setActiveKey('stake.registration.form.last_5_placeholder')} title="Click to edit placeholder key">[P]</span>}
                                </label>
                                <input 
                                    type="text" 
                                    value={transferLast5} 
                                    onChange={e => setTransferLast5(e.target.value)} 
                                    className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black focus:bg-white border-blue-300" 
                                    placeholder={tAttr('stake.registration.form.last_5_placeholder')} 
                                    maxLength={5} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSection;
