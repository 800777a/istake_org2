import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Registration, GlobalSettings, RegStatus } from '../../types';
import { Edit2, Search, User, ChevronDown, ChevronUp, Users, DollarSign, Activity } from 'lucide-react';
import EditMemberModal from '../EditMemberModal';
import { motion, AnimatePresence } from 'motion/react';

interface SpecializedRegistrationListProps {
    status: RegStatus;
    title: string;
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
    header?: React.ReactNode;
}

const SpecializedRegistrationList: React.FC<SpecializedRegistrationListProps> = ({ status, title, registrations, settings, onRefresh, onPushToEditor, header }) => {
    const { t, tString } = useI18n();
    const [searchName, setSearchName] = useState('');
    const [editTarget, setEditTarget] = useState<Registration | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const filteredRegs = useMemo(() => {
        return registrations.filter(r => r.status === status && (searchName === '' || r.name.includes(searchName)));
    }, [registrations, status, searchName]);

    const getStatusTheme = () => {
        switch(status) {
            case RegStatus.DELETED: 
                return { 
                    bg: 'bg-rose-50/30', 
                    border: 'border-rose-200', 
                    text: 'text-rose-900',
                    iconBg: 'bg-rose-500',
                    badge: 'bg-rose-100 text-rose-800 border-rose-200'
                };
            case RegStatus.RETAINED: 
                return { 
                    bg: 'bg-indigo-50/30', 
                    border: 'border-indigo-200', 
                    text: 'text-indigo-900',
                    iconBg: 'bg-indigo-600',
                    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
                };
            case RegStatus.REFUNDED: 
                return { 
                    bg: 'bg-amber-50/30', 
                    border: 'border-amber-200', 
                    text: 'text-amber-900',
                    iconBg: 'bg-amber-600',
                    badge: 'bg-amber-100 text-amber-800 border-amber-200'
                };
            case RegStatus.RESTRICTED: 
                return { 
                    bg: 'bg-slate-50/30', 
                    border: 'border-slate-200', 
                    text: 'text-slate-900',
                    iconBg: 'bg-slate-600',
                    badge: 'bg-slate-100 text-slate-800 border-slate-200'
                };
            default: 
                return { 
                    bg: 'bg-gray-50/30', 
                    border: 'border-gray-200', 
                    text: 'text-gray-900',
                    iconBg: 'bg-gray-600',
                    badge: 'bg-gray-100 text-gray-800 border-gray-200'
                };
        }
    };

    const theme = getStatusTheme();

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {header}
            {editTarget && (
                <EditMemberModal 
                    registration={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={onRefresh}
                    settings={settings}
                />
            )}

            {/* Main Section Container */}
            <div className={`rounded-lg shadow-sm border overflow-hidden bg-white ${theme.border}`}>
                {/* Header Row: Title Only - Conforming to independent row rule */}
                <div 
                    className="bg-indigo-900 text-white px-6 py-4 flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 bg-white/10 rounded-lg border border-white/10`}>
                            <Users className="text-blue-300" size={20} />
                        </div>
                        <h2 className="text-base md:text-lg lg:text-xl font-bold tracking-tight">
                            {title}
                        </h2>
                    </div>
                    {isCollapsed ? <ChevronDown size={22} className="text-white/60" /> : <ChevronUp size={22} className="text-white/60" />}
                </div>

                <AnimatePresence initial={false}>
                    {!isCollapsed && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {/* Actions Row: Aligned Right beneath title row */}
                            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${theme.badge}`}>
                                        {filteredRegs.length} {t('common.unit.people', '人')}
                                    </span>
                                </div>
                                <div className="relative w-full max-w-xs ml-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder={tString('common.search_name_placeholder', '搜尋姓名...')} 
                                        value={searchName}
                                        onChange={e => setSearchName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-10 pr-4 h-10 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="overflow-x-auto rounded-lg border border-slate-100 shadow-sm">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 uppercase tracking-widest text-[10px]">{t('common.col.unit', '單位')}</th>
                                                <th className="px-6 py-4 uppercase tracking-widest text-[10px]">{t('common.col.name', '姓名')}</th>
                                                <th className="px-6 py-4 uppercase tracking-widest text-[10px]">{t('common.col.identity', '收費項目')}</th>
                                                <th className="px-6 py-4 uppercase tracking-widest text-[10px]">{t('common.col.trip', '行程')}</th>
                                                <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-right">{t('common.col.amount_due', '應繳')}</th>
                                                <th className="px-6 py-4 text-center uppercase tracking-widest text-[10px]">{t('common.col.action', '操作')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredRegs.map((r, idx) => (
                                                <tr key={r.reg_id} className={`hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                                                    <td className="px-6 py-4 font-bold text-slate-500 text-xs">{r.unit}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg ${theme.badge} flex items-center justify-center font-bold text-xs border`}>
                                                                {r.name.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-slate-900">{r.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">{r.identity_type}</td>
                                                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">{r.trip_type}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-right text-slate-800">${r.amount_due.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button 
                                                            onClick={() => setEditTarget(r)}
                                                            className="p-2 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 rounded-lg transition-all text-blue-600 active:scale-90"
                                                            title={tString('common.button.edit_member', '編輯成員資料')}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredRegs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium italic bg-slate-50/20">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Users className="w-8 h-8 opacity-20" />
                                                            {t('common.status.no_data', '目前無資料')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

};

export default SpecializedRegistrationList;
