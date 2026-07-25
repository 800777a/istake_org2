
import React, { useState, useEffect } from 'react';
import { Registration, GlobalSettings, PaymentMethod, TripType } from '../types';
import { updateRegistrationField, calculatePrice, getActiveEvent, batchUpdateRegistrationFields } from '../services/sheetService';
import { X, Copy, CheckCircle, CreditCard, Users, DollarSign, ArrowRight, Wallet } from 'lucide-react';
import Toast, { ToastType } from './Toast';

interface PaymentInfoModalProps {
  currentReg: Registration;
  allRegistrations: Registration[];
  settings: GlobalSettings;
  onClose: () => void;
  onRefresh: () => void;
}

const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({ currentReg, allRegistrations, settings, onClose, onRefresh }) => {
  const [last5, setLast5] = useState('');
  const [phoneLast3, setPhoneLast3] = useState('');
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [helpMsg, setHelpMsg] = useState<{ field: string, content: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<ToastType>('success');

  // V401: Clear inputs whenever the modal opens or focuses on a new registration
    useEffect(() => {
        setLast5('');
        setPhoneLast3('');
    }, [currentReg.reg_id, settings.maintenance_date]); // Use maintenance_date as a proxy for "opening" if needed, but reg_id is best. Also adding a key in parent.

  // Find family members
  const familyMembers = allRegistrations.filter(r => r.family_group_id === currentReg.family_group_id);
  const primaryContact = familyMembers.find(r => r.is_primary_contact) || familyMembers[0];
  
  // V600: Handle Self-paid Insurance in total
  const eventData = getActiveEvent();
  const selfPaidInsuranceTotal = (primaryContact.needs_self_paid_insurance && eventData?.self_paid_insurance_amount) 
    ? (familyMembers.length * eventData.self_paid_insurance_amount)
    : 0;
    
  const totalDue = familyMembers.reduce((sum, r) => sum + r.amount_due, 0) + selfPaidInsuranceTotal;

  const showHelp = (field: string, content: string) => {
      setHelpMsg({ field, content });
      setTimeout(() => setHelpMsg(null), 5000);
  };

  const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopyMsg(`已複製 ${label}`);
      setTimeout(() => setCopyMsg(null), 2000);
  };

  const handleUpdatePayment = async (method: PaymentMethod) => {
      if (primaryContact) {
          // Validation for Transfer
          if (method === PaymentMethod.TRANSFER) {
              if (!last5 || last5.length !== 5) {
                  setMsgType('error');
                  setMsg('轉帳付款必須填寫完整的「轉帳末５碼」');
                  return;
              }
              if (!phoneLast3 || phoneLast3.length !== 3) {
                  setMsgType('error');
                  setMsg('轉帳付款必須填寫完整的「電話末３碼」');
                  return;
              }
              
              // Verify phone last 3 with primaryContact
              const actualPhone = primaryContact.contact_phone || primaryContact.phone || '';
              const cleanedPhone = actualPhone.replace(/[^\d]/g, ''); 
              if (!cleanedPhone.endsWith(phoneLast3)) {
                  setMsgType('error');
                  setMsg('「電話末３碼」核對不正確，請確認「代表人」的連絡電話。');
                  return;
              }
          }

          // Prepare batch updates
          const updates: { regId: string, data: Record<string, any> }[] = [];

          // Update Last 5 digits and phone last 3 for primary contact
          updates.push({ 
              regId: primaryContact.reg_id, 
              data: { 
                  transfer_last_5: last5,
                  payment_method: method 
              } 
          });
          
          if (method === PaymentMethod.EXTENDED) {
              for (const m of familyMembers) {
                  // If it's not the primary contact (already added above), add to updates
                  if (m.reg_id !== primaryContact.reg_id) {
                      updates.push({
                          regId: m.reg_id,
                          data: { payment_method: method, amount_due: 0 }
                      });
                  } else {
                      // Update existing entry for primary contact
                      updates[0].data.amount_due = 0;
                  }
              }
          } else {
              for (const m of familyMembers) {
                  const price = calculatePrice(m.unit, m.identity_type, m.trip_type, m.is_staff, m.is_new_member);
                  if (m.reg_id !== primaryContact.reg_id) {
                      updates.push({
                          regId: m.reg_id,
                          data: { payment_method: method, amount_due: price }
                      });
                  } else {
                      // Update existing entry for primary contact
                      updates[0].data.amount_due = price;
                  }
              }
          }
          
          await batchUpdateRegistrationFields(updates);
          
          onRefresh();
          setMsgType('success');
          setMsg(`已更新付款狀態為：${method}`);
          
          setLast5(''); 
          setPhoneLast3('');
          onClose();
      }
  };

  const maskName = (name: string) => {
      if (!name) return '';
      if (name.length <= 1) return name;
      if (name.length === 2) return name[0] + 'Ｏ';
      // For 3 or more characters, replace middle characters with O
      const first = name[0];
      const last = name[name.length - 1];
      const middle = 'Ｏ'.repeat(name.length - 2);
      return first + middle + last;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in">
      <div className="bg-white w-[600px] max-w-full rounded-none md:rounded-[8px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header - Gold Gradient */}
        <div className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 p-4 text-slate-900 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center">
                <CreditCard className="w-5 h-5 mr-2" /> 付款資訊 (Payment Info)
            </h2>
            <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-6">
            
            {/* 1. Family Summary - Light Red */}
            <div className="bg-red-50 p-4 rounded-none md:rounded-[8px] shadow-sm border border-red-200">
                <div className="flex justify-between items-center mb-2 border-b border-red-200 pb-2">
                    <div className="text-red-800 text-xs font-bold">代表人</div>
                    <div className="text-red-800 text-xs font-bold">應付總額</div>
                </div>
                <div className="flex justify-between items-center">
                    <div className="text-lg font-bold text-red-900 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-red-700" />
                        {maskName(primaryContact.name)}
                    </div>
                    <div className="text-2xl font-black text-red-700 font-mono">
                        ${totalDue.toLocaleString()}
                    </div>
                </div>
                
                {/* Member Details */}
                <div className="mt-3 pt-2 border-t border-dashed border-red-200">
                    <div className="text-xs text-red-400 mb-1">費用明細:</div>
                    <div className="space-y-1">
                        {familyMembers.map(m => (
                            <div key={m.reg_id} className="flex justify-between text-sm">
                                <span className="text-gray-700">{maskName(m.name)}</span>
                                <span className="font-mono text-gray-600">${m.amount_due.toLocaleString()}</span>
                            </div>
                        ))}
                        {selfPaidInsuranceTotal > 0 && (
                            <div className="flex justify-between text-sm border-t border-red-100 pt-1 mt-1">
                                <span className="text-pink-700 font-bold">自費投保總金額 ({familyMembers.length}人)</span>
                                <span className="font-mono text-pink-700 font-bold">${selfPaidInsuranceTotal.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Bank Info & Input - Combined Light Green */}
            <div className="bg-green-50 p-5 rounded-none md:rounded-[8px] border border-green-200">
                <h3 className="font-bold text-green-900 mb-4 text-sm flex items-center border-b border-green-200 pb-2">
                    <DollarSign className="w-4 h-4 mr-1 text-green-700" /> 轉帳帳號
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Bank Info */}
                    <div className="space-y-3 border-b md:border-b-0 md:border-r border-green-200 pb-4 md:pb-0 md:pr-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-green-800 font-bold font-sans">銀行名稱</span>
                            <span className="font-bold text-gray-800 font-sans">{settings.bank_info.bank_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-green-800 font-bold font-sans">銀行代碼</span>
                            <div className="flex items-center">
                                <span className="font-mono font-bold text-green-700 text-sm mr-2">{settings.bank_info.bank_code}</span>
                                <button onClick={() => handleCopy(settings.bank_info.bank_code, '銀行代碼')} className="text-green-400 hover:text-green-700 transition-colors">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-green-800 font-bold font-sans">帳戶名稱</span>
                            <span className="font-bold text-gray-800 font-sans">{settings.bank_info.account_name}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-green-800 font-bold font-sans text-xs">帳戶號碼</span>
                            <div className="flex items-center bg-white p-1.5 rounded border border-green-200 shadow-sm overflow-hidden">
                                <span className="font-mono font-bold text-green-700 text-sm tracking-tight flex-1 truncate whitespace-nowrap overflow-hidden pr-1">{settings.bank_info.account_number}</span>
                                <button onClick={() => handleCopy(settings.bank_info.account_number, '帳戶號碼')} className="text-green-400 hover:text-green-700 transition-colors shrink-0">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {settings.bank_info.contact_phone && (
                            <div className="flex flex-col space-y-1 pt-2 border-t border-green-100">
                                <span className="text-green-800 font-bold font-sans text-xs">連絡電話</span>
                                <div className="flex items-center bg-white p-1.5 rounded border border-green-200 shadow-sm overflow-hidden">
                                    <span className="font-mono font-bold text-green-700 text-sm tracking-tight flex-1 truncate whitespace-nowrap overflow-hidden pr-1">{settings.bank_info.contact_phone}</span>
                                    <button onClick={() => handleCopy(settings.bank_info.contact_phone || '', '連絡電話')} className="text-green-400 hover:text-green-700 transition-colors shrink-0">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        {copyMsg && (
                            <div className="mt-2 text-center text-xs text-green-600 font-bold bg-green-100 py-1 rounded animate-fade-in font-sans">
                                <CheckCircle className="w-3 h-3 inline mr-1" /> {copyMsg}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Inputs (Swapped & Right Aligned) */}
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-green-800 mb-1">轉帳金額</label>
                            <input 
                                type="number" 
                                className="w-full border border-green-300 rounded p-2 text-right font-mono font-bold bg-gray-100 text-[#8B0000] cursor-not-allowed"
                                value={totalDue}
                                readOnly
                            />
                        </div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-green-800">轉帳末５碼</label>
                                <button onClick={() => showHelp('last5', '「請填寫 存摺或網銀帳號 末 5 碼，而非金融卡上的卡號」。')} className="text-indigo-500 hover:text-indigo-700">
                                    <span className="text-xs border rounded-full w-4 h-4 flex items-center justify-center">?</span>
                                </button>
                            </div>
                            <input 
                                type="text" 
                                autoComplete="off"
                                className="w-full border border-green-300 rounded p-2 text-right font-mono font-bold focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900"
                                placeholder="12345"
                                maxLength={5}
                                value={last5}
                                onChange={e => setLast5(e.target.value)}
                            />
                            {helpMsg?.field === 'last5' && (
                                <div className="absolute top-full left-0 right-0 z-20 bg-indigo-900 text-white text-[10px] p-2 rounded shadow-lg mt-1 animate-slide-up">
                                    {helpMsg.content}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-green-800">電話未３碼</label>
                                <button onClick={() => showHelp('phoneLast3', '「請填寫 代表人 行動電話 或 住家電話 未３碼」。')} className="text-indigo-500 hover:text-indigo-700">
                                    <span className="text-xs border rounded-full w-4 h-4 flex items-center justify-center">?</span>
                                </button>
                            </div>
                            <input 
                                type="text" 
                                autoComplete="off"
                                className="w-full border border-green-300 rounded p-2 text-right font-mono font-bold focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900"
                                placeholder="如: 777"
                                maxLength={3}
                                value={phoneLast3}
                                onChange={e => setPhoneLast3(e.target.value)}
                            />
                            {helpMsg?.field === 'phoneLast3' && (
                                <div className="absolute top-full left-0 right-0 z-20 bg-indigo-900 text-white text-[10px] p-2 rounded shadow-lg mt-1 animate-slide-up">
                                    {helpMsg.content}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Action Buttons - 2 Types (Removed Retention and Extended) */}
            <div className="flex flex-col gap-3 pt-2">
                {settings.payment_methods?.includes(PaymentMethod.TRANSFER) && (
                    <button 
                        onClick={() => handleUpdatePayment(PaymentMethod.TRANSFER)}
                        className="flex items-center justify-center h-12 md:h-12 rounded-none md:rounded-[8px] bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md active:scale-95 font-sans w-full"
                    >
                        <ArrowRight className="w-5 h-5 mr-2" />
                        <span className="text-base">轉帳付款</span>
                    </button>
                )}

                {settings.payment_methods?.includes(PaymentMethod.CASH) && (
                    <button 
                        onClick={() => handleUpdatePayment(PaymentMethod.CASH)}
                        className="flex items-center justify-center h-12 md:h-12 rounded-none md:rounded-[8px] bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-md active:scale-95 font-sans w-full"
                    >
                        <Wallet className="w-5 h-5 mr-2" />
                        <span className="text-base">現金付款</span>
                    </button>
                )}
            </div>

        </div>
      </div>
      <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
    </div>
  );
};

export default PaymentInfoModal;
