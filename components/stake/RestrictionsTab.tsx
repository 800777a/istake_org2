
import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { GlobalSettings, BlacklistItem, Registration, RegStatus } from '../../types';
import { addBlacklistItem, deleteBlacklistItem } from '../../services/sheetService';
import { Shield, Plus, Trash2, User, AlertTriangle, Edit2, Search, Calendar } from 'lucide-react';
import EditMemberModal from '../EditMemberModal';

import ConfirmDialog from '../ConfirmDialog';

interface RestrictionsTabProps {
    settings: GlobalSettings;
    blacklist: BlacklistItem[];
    registrations?: Registration[];
    onRefresh: () => void;
}

// Modern Business Style constants (High-Contrast Theme)
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-6 py-4 flex items-center justify-between cursor-pointer select-none',
    sectionTitle: 'text-sm md:text-base lg:text-lg font-semibold tracking-tight',
    pageTitle: 'text-xl md:text-2xl font-bold tracking-tight text-slate-900',
    bodyText: 'text-sm text-slate-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    btnSecondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    btnDanger: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    input: 'w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all font-bold',
    select: 'w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all cursor-pointer font-bold',
    badge: {
        success: 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 px-2.5 py-0.5 rounded text-[10px]',
        warning: 'bg-amber-100 text-amber-900 font-semibold border border-amber-300 px-2.5 py-0.5 rounded text-[10px]',
        danger: 'bg-rose-100 text-rose-900 font-semibold border border-rose-300 px-2.5 py-0.5 rounded text-[10px]',
        info: 'bg-blue-100 text-blue-900 font-semibold border border-blue-300 px-2.5 py-0.5 rounded text-[10px]'
    }
};

const RestrictionsTab: React.FC<RestrictionsTabProps> = ({ settings, blacklist, registrations = [], onRefresh }) => {
    const { t, tString } = useI18n();
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
        <div className="space-y-6 animate-fade-in relative pb-20">
            {/* Main Header conforming to 60-30-10 & RWD rules */}
            <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-lg flex flex-col gap-6">
                {/* Row 1: Title Row Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-lg border border-white/10 shadow-inner">
                        <Shield className="text-rose-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {t('stake.restrictions.tab_title', '限制名單管理')}
                        </h2>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                            Security & Compliance Control Center
                        </p>
                    </div>
                </div>
                
                {/* Row 2: Info Aligned Right beneath title row */}
                <div className="flex justify-end items-center gap-3">
                    <div className="bg-rose-600/20 border border-rose-500/30 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-300 shadow-inner flex items-center gap-3">
                        <AlertTriangle size={14} className="text-rose-400" />
                        {t('stake.restrictions.current_count', '目前列管人員: {{count}} 人', { count: blacklist.length })}
                    </div>
                </div>
            </div>

            {/* Add New Section */}
            <div className={THEME.card}>
                <div className={THEME.header}>
                    <div className="flex items-center gap-3">
                        <Plus className="text-rose-400" size={20} />
                        <h3 className={THEME.sectionTitle}>{t('stake.restrictions.add_title', '新增限制人員')}</h3>
                    </div>
                </div>
                
                <div className="p-6 bg-[#F0F4F8]/10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">{t('stake.restrictions.field_name', '姓名')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input 
                                    type="text" 
                                    className={THEME.input + " pl-10 h-11"} 
                                    placeholder={t('stake.restrictions.name_placeholder', "人員姓名")}
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">{t('stake.restrictions.field_unit', '所屬單位')}</label>
                            <select 
                                className={THEME.select + " h-11"}
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                            >
                                <option value="">{tString('stake.restrictions.select_unit_placeholder', '選擇單位...')}</option>
                                {(settings.units || []).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">{t('stake.restrictions.field_reason', '限制原因')}</label>
                            <select 
                                className={THEME.select + " h-11"}
                                value={reason}
                                onChange={e => setReason(e.target.value as any)}
                            >
                                <option value="unpaid">{tString('stake.restrictions.reason_unpaid_full', '欠費 (尚未繳清活動費用)')}</option>
                                <option value="violation">{tString('stake.restrictions.reason_violation_full', '犯規 (違反活動規範)')}</option>
                            </select>
                        </div>
                    </div>
                    {/* Actions Aligned Right beneath title row */}
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleAdd}
                            disabled={isSaving || !name || !unit}
                            className={THEME.btnDanger + " h-12 px-10 text-base md:h-11 md:px-8 md:text-sm shadow-lg disabled:opacity-50"}
                        >
                            <Plus className="w-5 h-5" /> {t('stake.restrictions.add_btn', '將此人加入限制名單')}
                        </button>
                    </div>
                </div>
            </div>

            {/* List Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-widest">
                        <AlertTriangle size={20} className="text-rose-600" />
                        列管人員清單
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blacklist.map(item => (
                        <div key={item.id} className="bg-white border-2 border-slate-100 rounded-lg p-6 shadow-sm relative group hover:border-rose-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <button 
                                onClick={() => setDeleteId(item.id)}
                                className="absolute top-4 right-4 p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm bg-white border border-slate-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-start gap-5">
                                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-inner">
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-lg text-slate-900 mb-0.5 truncate">{item.name}</h4>
                                    <div className="text-[10px] font-black text-slate-400 mb-4 tracking-[0.2em] uppercase">{item.unit}</div>
                                    <div className="flex flex-col gap-2.5">
                                        <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-rose-200 uppercase tracking-widest inline-flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                            {t('stake.restrictions.reason_label', '原因')}: {
                                                item.reason === 'unpaid' || item.reason === '欠費' ? t('stake.restrictions.reason_unpaid', '欠費') :
                                                item.reason === 'violation' || item.reason === '犯規' ? t('stake.restrictions.reason_violation', '犯規') :
                                                item.reason
                                            }
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-2 pl-1">
                                            <Calendar size={14} className="opacity-50" />
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {blacklist.length === 0 && (
                        <div className="col-span-full py-24 text-center text-slate-400 font-black bg-[#F0F4F8]/50 rounded-lg border-2 border-dashed border-slate-200 uppercase tracking-widest">
                            <Shield size={64} className="mx-auto mb-4 opacity-5" />
                            {t('stake.restrictions.no_data', '目前無限制人員資料')}
                        </div>
                    )}
                </div>
            </div>

            {/* Restricted Registrations Table */}
            <div className={THEME.card}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
                        <User size={20} className="text-slate-600" />
                        {t('stake.restrictions.restricted_regs_title', '活動限制人員 (由報名移動)')}
                    </h3>
                    <span className={THEME.badge.danger}>
                        RESTRICTED
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-6 py-5">{t('stake.restrictions.col_unit', '單位')}</th>
                                <th className="px-6 py-5">{t('stake.restrictions.col_name', '姓名')}</th>
                                <th className="px-6 py-5">{t('stake.restrictions.col_identity', '收費項目')}</th>
                                <th className="px-6 py-5 text-right">{t('stake.restrictions.col_amount', '應繳')}</th>
                                <th className="px-6 py-5 text-center">{t('stake.restrictions.col_actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {restrictedRegs.map(r => (
                                <tr key={r.reg_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={THEME.badge.info}>{r.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-900">{r.name}</td>
                                    <td className="px-6 py-4 text-slate-500 font-medium text-xs tracking-tight">{r.identity_type}</td>
                                    <td className="px-6 py-4 font-mono font-black text-rose-600 text-right text-base">${r.amount_due}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setEditTarget(r)}
                                            className="p-2.5 hover:bg-slate-200 rounded-lg transition-all text-blue-600 shadow-sm bg-white border border-slate-100 active:scale-90"
                                            title={t('stake.restrictions.edit_btn', "編輯成員資料")}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {restrictedRegs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <User size={48} className="text-slate-300" />
                                            <p className="font-bold text-slate-400 italic uppercase tracking-widest">
                                                {t('stake.restrictions.no_restricted_regs', '目前報名名單中無限制人員')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
