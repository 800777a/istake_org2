
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings, BlacklistItem, Registration, RegStatus } from '../../types';
import { addBlacklistItem, deleteBlacklistItem } from '../../services/sheetService';
import { Shield, Plus, Trash2, User, AlertTriangle, Edit2, Search } from 'lucide-react';
import EditMemberModal from '../EditMemberModal';

import ConfirmDialog from '../ConfirmDialog';

interface RestrictionsTabProps {
    settings: GlobalSettings;
    blacklist: BlacklistItem[];
    registrations?: Registration[];
    onRefresh: () => void;
}

const RestrictionsTab: React.FC<RestrictionsTabProps> = ({ settings, blacklist, registrations = [], onRefresh }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [reason, setReason] = useState<'unpaid' | 'violation' | '欠費' | '犯規'>('unpaid');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Registration | null>(null);

    const restrictedRegs = useMemo(() => {
        return registrations.filter(r => r.status === RegStatus.RESTRICTED);
    }, [registrations]);

    const handleAdd = async () => {
        if (!name.trim() || !unit) return;
        setIsSaving(true);
        try {
            await addBlacklistItem({
                name: name.trim(),
                unit,
                reason: reason as any
            });
            setName('');
            setUnit('');
            setReason('unpaid');
            onRefresh();
        } catch (e) {
            setAlertMsg(t('stake.restrictions.add_failed', '新增失敗'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsSaving(true);
        try {
            await deleteBlacklistItem(deleteId);
            setDeleteId(null);
            onRefresh();
        } catch (e) {
            setAlertMsg(t('stake.restrictions.delete_failed', '刪除失敗'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-20">
            <div className="bg-rose-50 p-8 rounded-3xl shadow-sm border-2 border-rose-200">
                <div className="flex flex-col mb-8">
                    <h3 className="font-black text-rose-900 text-3xl flex items-center mb-6">
                        <Shield className="w-10 h-10 mr-4 text-rose-700" /> {t('stake.restrictions.tab_title', '限制名單管理 (黑名單)')}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-rose-200 px-6 py-2 rounded-xl text-sm font-black text-rose-900 border-2 border-rose-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                            {t('stake.restrictions.current_count', '目前列管人員: {{count}} 人', { count: blacklist.length })}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border-2 border-rose-100 mb-10 shadow-[inner_0_2px_4px_rgba(0,0,0,0.05)]">
                    <h4 className="text-sm font-black text-rose-800 mb-6 uppercase tracking-wider flex items-center">
                        <Plus className="w-4 h-4 mr-2" /> {t('stake.restrictions.add_title', '新增限制人員')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <label className="block text-xs font-black text-rose-800 mb-3 uppercase opacity-70">{t('stake.restrictions.field_name', '姓名')}</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-rose-50 rounded-xl text-base font-bold bg-rose-50/30 text-gray-800 focus:border-rose-300 focus:bg-white outline-none transition-all shadow-inner" 
                                    placeholder={t('stake.restrictions.name_placeholder', "人員姓名")}
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-rose-800 mb-3 uppercase opacity-70">{t('stake.restrictions.field_unit', '所屬單位')}</label>
                            <select 
                                className="w-full border-2 border-rose-50 rounded-xl px-4 py-3.5 text-base font-bold bg-rose-50/30 text-gray-800 focus:border-rose-300 focus:bg-white outline-none transition-all shadow-inner cursor-pointer"
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                            >
                                <option value="">{t('stake.restrictions.select_unit_placeholder', '選擇單位...')}</option>
                                {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-rose-800 mb-3 uppercase opacity-70">{t('stake.restrictions.field_reason', '限制原因')}</label>
                            <select 
                                className="w-full border-2 border-rose-50 rounded-xl px-4 py-3.5 text-base font-bold bg-rose-50/30 text-gray-800 focus:border-rose-300 focus:bg-white outline-none transition-all shadow-inner cursor-pointer"
                                value={reason}
                                onChange={e => setReason(e.target.value as any)}
                            >
                                <option value="unpaid">{t('stake.restrictions.reason_unpaid_full', '欠費 (尚未繳清活動費用)')}</option>
                                <option value="violation">{t('stake.restrictions.reason_violation_full', '犯規 (違反活動規範)')}</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={isSaving || !name || !unit}
                        className="w-full bg-rose-600 text-white font-black py-4 rounded-xl hover:bg-rose-700 flex items-center justify-center disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-lg"
                    >
                        <Plus className="w-6 h-6 mr-3" /> {t('stake.restrictions.add_btn', '將此人加入限制名單')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blacklist.map(item => (
                        <div key={item.id} className="bg-white border-2 border-rose-50 rounded-2xl p-6 shadow-sm relative group hover:border-rose-300 transition-all hover:shadow-md">
                            <button 
                                onClick={() => setDeleteId(item.id)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-rose-100"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="bg-rose-100 p-3 rounded-2xl shadow-inner">
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-xl text-gray-900 mb-1">{item.name}</h4>
                                    <div className="text-sm font-bold text-gray-500 mb-4">{item.unit}</div>
                                    <div className="bg-rose-50 text-rose-700 text-xs font-black px-3 py-1.5 rounded-lg border border-rose-100 inline-flex items-center shadow-sm">
                                        {t('stake.restrictions.reason_label', '原因')}: {
                                            item.reason === 'unpaid' || item.reason === '欠費' ? t('stake.restrictions.reason_unpaid', '欠費') :
                                            item.reason === 'violation' || item.reason === '犯規' ? t('stake.restrictions.reason_violation', '犯規') :
                                            item.reason
                                        }
                                    </div>
                                    <div className="mt-4 text-[10px] text-gray-400 font-bold flex items-center uppercase tracking-widest">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-200 mr-1.5"></div>
                                        {t('stake.restrictions.created_at_label', '列管日期')}: {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {blacklist.length === 0 && (
                        <div className="col-span-full py-20 text-center text-rose-300 bg-white/40 rounded-3xl border-4 border-dashed border-rose-100 font-black text-xl">
                            <Shield className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            {t('stake.restrictions.no_data', '目前無限制人員資料')}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl shadow-sm border-2 border-slate-200 mt-8">
                <h3 className="font-black text-slate-900 text-2xl flex items-center mb-6">
                    <User className="w-8 h-8 mr-4 text-slate-700" /> {t('stake.restrictions.restricted_regs_title', '活動限制人員 (由報名移動)')}
                </h3>
                
                <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-4">{t('stake.restrictions.col_unit', '單位')}</th>
                                    <th className="px-6 py-4">{t('stake.restrictions.col_name', '姓名')}</th>
                                    <th className="px-6 py-4">{t('stake.restrictions.col_identity', '收費項目')}</th>
                                    <th className="px-6 py-4">{t('stake.restrictions.col_amount', '應繳')}</th>
                                    <th className="px-6 py-4 text-center">{t('stake.restrictions.col_actions', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {restrictedRegs.map(r => (
                                    <tr key={r.reg_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-700">{r.unit}</td>
                                        <td className="px-6 py-4 font-black">{r.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{r.identity_type}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">${r.amount_due}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setEditTarget(r)}
                                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-blue-600"
                                                title={t('stake.restrictions.edit_btn', "編輯成員資料")}
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {restrictedRegs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                                            {t('stake.restrictions.no_restricted_regs', '目前報名名單中無限制人員')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editTarget && (
                <EditMemberModal 
                    registration={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={onRefresh}
                    settings={settings}
                />
            )}

            <ConfirmDialog 
                isOpen={!!deleteId}
                title={t('stake.restrictions.remove_confirm_title', "移除黑名單")}
                message={t('stake.restrictions.remove_confirm_msg', "確定要將此人員從黑名單中移除嗎？")}
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
                isDangerous={true}
                confirmText={t('stake.restrictions.remove_confirm_btn', "確定移除")}
            />

            <ConfirmDialog 
                isOpen={!!alertMsg}
                title={t('common.tip', "提示")}
                message={alertMsg}
                onConfirm={() => setAlertMsg(null)}
                onCancel={() => setAlertMsg(null)}
                confirmText={t('common.got_it', "知道了")}
            />
        </div>
    );
};

export default RestrictionsTab;
