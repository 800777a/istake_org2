import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Copy } from 'lucide-react';
import { PaymentMethod, GlobalSettings } from '../../../types';

interface PaymentSectionProps {
    paymentMethod: PaymentMethod | '';
    setPaymentMethod: (val: PaymentMethod) => void;
    transferLast5: string;
    setTransferLast5: (val: string) => void;
    totalDue: number;
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
    availablePaymentMethods,
    settings,
    lang
}) => {
    const { t } = useTranslation();

    const getPaymentMethodLabel = (m: PaymentMethod) => {
        switch (m) {
            case PaymentMethod.CASH: return t('stake.registration.form.payment_methods.cash');
            case PaymentMethod.TRANSFER: return t('stake.registration.form.payment_methods.transfer');
            case PaymentMethod.EXTENDED: return t('stake.registration.form.payment_methods.extended');
            default: return m;
        }
    };

    return (
        <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 mb-6">
            <h3 className="font-bold text-blue-900 mb-4 text-sm flex items-center">
                <CreditCard className="w-5 h-5 mr-2" /> {t('stake.registration.form.payment_info_title')}
            </h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">{t('stake.registration.form.select_hint')}</label>
                        <select 
                            value={paymentMethod} 
                            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} 
                            className={`w-full border rounded h-[38px] px-2 text-xs ${!paymentMethod ? 'text-gray-400' : 'text-black'} bg-white`}
                            required
                        >
                            <option value="" disabled>{t('stake.registration.form.payment_methods_hint', { defaultValue: '請選擇付款方式' })}</option>
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
                                <div>{t('stake.registration.form.account_name_label')}: <span className="font-bold">{settings.bank_info.account_name}</span></div>
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
                                <label className="block text-xs font-bold text-blue-900 mb-1">{t('stake.registration.form.transfer_last_5_label')}</label>
                                <input 
                                    type="text" 
                                    value={transferLast5} 
                                    onChange={e => setTransferLast5(e.target.value)} 
                                    className="w-full border rounded h-[38px] px-2 text-xs bg-white text-black focus:bg-white border-blue-300" 
                                    placeholder={t('stake.registration.form.last_5_placeholder')} 
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
