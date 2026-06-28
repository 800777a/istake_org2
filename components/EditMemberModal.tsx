
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, GlobalSettings, IdentityType, TripType, OrdinanceType, OrdinanceItem, PaymentMethod, RegStatus } from '../types';
import { updateRegistration, deleteRegistration } from '../services/sheetService';
import { X, Save, Shield, Trash2, FileSearch, RefreshCw, UserCheck, AlertTriangle, User } from 'lucide-react';

interface EditMemberModalProps {
  registration: Registration;
  onClose: () => void;
  onSave: () => void;
  settings: GlobalSettings;
  bookingStatus?: string;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ registration, onClose, onSave, settings, bookingStatus }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Registration>({ ...registration });
  const [isSaving, setIsSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RegStatus | 'HARD_DELETE' | null>(null);

  const handleChange = (field: keyof Registration, value: any) => {
    setFormData(prev => {
        const newData = { ...prev, [field]: value };
        if (field === 'ordinance_type') {
            if (value === OrdinanceType.NONE || value === OrdinanceType.CHILD) {
                newData.ordinance_item = OrdinanceItem.NONE;
            }
        }
        return newData;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await updateRegistration(formData);
        onSave();
        onClose();
    } finally {
        setIsSaving(false);
    }
  };

  const handleStatusChange = (newStatus: RegStatus | 'HARD_DELETE') => {
    setPendingStatus(newStatus);
  };

  const confirmAction = async () => {
    if (!pendingStatus) return;
    setIsSaving(true);
    try {
        if (pendingStatus === 'HARD_DELETE') {
            await deleteRegistration(formData.reg_id);
        } else {
            await updateRegistration({ ...formData, status: pendingStatus });
        }
        onSave();
        onClose();
    } finally {
        setIsSaving(false);
        setPendingStatus(null);
    }
  };

  const enabledIdentities = settings.active_identities && settings.active_identities.length > 0 
    ? settings.active_identities 
    : [...Object.values(IdentityType), ...(settings.custom_identities || [])];

  const isSpecialStatus = [RegStatus.RESTRICTED, RegStatus.DELETED, RegStatus.RETAINED, RegStatus.REFUNDED].includes(formData.status);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in text-sans">
      <div className="bg-white w-[600px] max-w-full rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-4 border-white/50">
        
        {/* Internal custom confirmation overlay to avoid sandbox block */}
        {pendingStatus && (
            <div className="absolute inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm text-center border-4 border-yellow-400">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-gray-900 mb-2 font-sans">{t('common.confirm_action', '確認執行操作？')}</h4>
                    <p className="text-sm text-gray-600 mb-6 font-bold leading-relaxed">
                        {pendingStatus === RegStatus.RESTRICTED && t('stake.edit_member.confirm_restricted', "即將將此成員移至「限制名單」。")}
                        {pendingStatus === RegStatus.DELETED && t('stake.edit_member.confirm_deleted', "即將將此成員移至「刪除名單」。")}
                        {pendingStatus === RegStatus.RETAINED && t('stake.edit_member.confirm_retained', "即將將此成員移至「留用名單」。")}
                        {pendingStatus === RegStatus.REFUNDED && t('stake.edit_member.confirm_refunded', "即將將此成員移至「退款名單」。")}
                        {pendingStatus === RegStatus.NORMAL && t('stake.edit_member.confirm_normal', "即將將此成員移回「報名名單」。")}
                        {pendingStatus === 'HARD_DELETE' && t('stake.edit_member.confirm_hard_delete', "確定要「完全刪除」此筆資料嗎？此操作不可恢復！")}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setPendingStatus(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95">{t('common.cancel', '取消')}</button>
                        <button onClick={confirmAction} className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-xl font-black text-sm hover:bg-yellow-700 transition-all active:scale-95 shadow-lg shadow-yellow-600/20">{t('common.confirm', '確定')}</button>
                    </div>
                </div>
            </div>
        )}

        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-yellow-50 to-orange-50">
          <h3 className="font-black text-xl text-gray-800 flex items-center">
            <User className="w-6 h-6 mr-2 text-yellow-600" />
            {t('stake.edit_member.title', '編輯成員資料')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('common.unit', '單位')}</label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.unit} onChange={e => handleChange('unit', e.target.value)}>
                        {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('common.name', '姓名')}</label>
                    <input type="text" className="w-full border rounded p-2 text-sm" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.ordinance_type', '教儀性質')}</label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.ordinance_type} onChange={e => handleChange('ordinance_type', e.target.value as OrdinanceType)}>
                        <option value={OrdinanceType.PROXY}>{OrdinanceType.PROXY}</option>
                        <option value={OrdinanceType.CHILD}>{OrdinanceType.CHILD}</option>
                        <option value={OrdinanceType.LIVING}>{OrdinanceType.LIVING}</option>
                        <option value={OrdinanceType.NONE}>{OrdinanceType.NONE}</option>
                    </select>
                </div>
                {formData.ordinance_type !== OrdinanceType.NONE && formData.ordinance_type !== OrdinanceType.CHILD ? (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.ordinance_item', '教儀項目')}</label>
                        <select className="w-full border rounded p-2 text-sm" value={formData.ordinance_item} onChange={e => handleChange('ordinance_item', e.target.value as OrdinanceItem)}>
                            {Object.values(OrdinanceItem).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.activity', '活動項目 (Activity)')}</label>
                        <select className="w-full border rounded p-2 text-sm" value={formData.ordinance_item} onChange={e => handleChange('ordinance_item', e.target.value as OrdinanceItem)}>
                            {[
                                t('registration.activity.square_tour', '聖殿廣場導覽'), 
                                t('registration.activity.history_tour', '家譜中心導覽'), 
                                t('registration.activity.other', '其他活動'), 
                                t('registration.activity.skip', '略過')
                            ].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.trip', '行程')}</label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.trip_type} onChange={e => handleChange('trip_type', e.target.value as TripType)}>
                        {Object.values(TripType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.identity', '收費(身分)')}</label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.identity_type} onChange={e => handleChange('identity_type', e.target.value)}>
                        {enabledIdentities.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.fee', '車資(金額)')}</label>
                    <input type="number" className="w-full border rounded p-2 text-sm" value={formData.amount_due} onChange={e => handleChange('amount_due', parseInt(e.target.value) || 0)} />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.seat', '車位')}</label>
                    <input type="text" className="w-full border bg-gray-50 rounded p-2 text-sm font-mono text-gray-500" value={bookingStatus || t('registration.seat.processing', '處理中 / 候補')} disabled />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('registration.field.payment_method', '付款方式')}</label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.payment_method} onChange={e => handleChange('payment_method', e.target.value as PaymentMethod)}>
                        {Object.values(PaymentMethod).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                    <input 
                        type="checkbox" 
                        id="is_paid"
                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" 
                        checked={formData.is_paid} 
                        onChange={e => handleChange('is_paid', e.target.checked)} 
                    />
                    <label htmlFor="is_paid" className="text-sm font-bold text-gray-700 cursor-pointer">{t('registration.field.is_paid', '已收取費用 (已收)')}</label>
                </div>
            </div>
        </div>

        <div className="p-6 border-t bg-gray-50/50 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2.5">
                {!isSpecialStatus ? (
                    <>
                        <button onClick={() => handleStatusChange(RegStatus.RESTRICTED)} disabled={isSaving} className="px-4 py-2.5 bg-red-50 text-red-700 border-2 border-red-100 rounded-xl font-black text-xs flex items-center hover:bg-red-100 transition-all active:scale-95">
                            <Shield className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.restricted', '限制')}
                        </button>
                        <button onClick={() => handleStatusChange(RegStatus.DELETED)} disabled={isSaving} className="px-4 py-2.5 bg-orange-50 text-orange-700 border-2 border-orange-100 rounded-xl font-black text-xs flex items-center hover:bg-orange-100 transition-all active:scale-95">
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.deleted', '刪除')}
                        </button>
                        <button onClick={() => handleStatusChange(RegStatus.RETAINED)} disabled={isSaving} className="px-4 py-2.5 bg-yellow-50 text-yellow-700 border-2 border-yellow-100 rounded-xl font-black text-xs flex items-center hover:bg-yellow-100 transition-all active:scale-95">
                            <FileSearch className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.retained', '留用')}
                        </button>
                        <button onClick={() => handleStatusChange(RegStatus.REFUNDED)} disabled={isSaving} className="px-4 py-2.5 bg-green-50 text-green-700 border-2 border-green-100 rounded-xl font-black text-xs flex items-center hover:bg-green-100 transition-all active:scale-95">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.refunded', '退款')}
                        </button>
                        <button disabled className="px-4 py-2.5 bg-gray-50 text-gray-300 border-2 border-gray-100 rounded-xl font-black text-xs flex items-center opacity-40 cursor-not-allowed">
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.normal', '報名')}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => handleStatusChange('HARD_DELETE')} disabled={isSaving} className="px-4 py-2.5 bg-red-50 text-red-700 border-2 border-red-100 rounded-xl font-black text-xs flex items-center hover:bg-red-100 transition-all active:scale-95">
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('common.hard_delete', '完全刪除')}
                        </button>
                        <button onClick={() => handleStatusChange(RegStatus.NORMAL)} disabled={isSaving} className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-xl font-black text-xs flex items-center hover:bg-indigo-100 transition-all active:scale-95">
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" /> {t('common.status.normal', '報名')}
                        </button>
                        <div className="ml-auto px-4 py-2 bg-gray-200 text-gray-500 rounded-xl font-black text-[10px] flex items-center uppercase tracking-widest shadow-inner">
                            {t('common.current_status', '目前狀態')}: {formData.status}
                        </div>
                    </>
                )}
            </div>
            
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-200/50">
                <button onClick={onClose} disabled={isSaving} className="px-6 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-400 font-black text-sm hover:bg-gray-50 transition-all active:scale-95">{t('common.cancel', '取消')}</button>
                <button onClick={handleSave} disabled={isSaving} className="px-10 py-2.5 bg-yellow-600 text-white rounded-xl font-black text-sm flex items-center hover:bg-yellow-700 shadow-lg shadow-yellow-600/20 transition-all active:scale-95 active:shadow-none">
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? t('common.processing', "處理中...") : t('common.save', "儲存")}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
