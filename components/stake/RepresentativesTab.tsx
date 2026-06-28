import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Representative, Registration, GlobalSettings } from '../../types';
import { setRepresentative, deleteRepresentative, getSettings, subscribeToRegistrations } from '../../services/sheetService';
import { Trash2, Edit2, Plus, Search, ArrowUpDown, X, ChevronUp, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

interface RepresentativesTabProps {
    event_id: string;
}

const rainbowColors = [
    { header: 'bg-red-100 border-red-200 text-red-900', rowHover: 'hover:bg-red-50', sticky: 'bg-red-50/90', divide: 'divide-red-200', bg: 'bg-red-50', border: 'border-red-200' },
    { header: 'bg-orange-100 border-orange-200 text-orange-900', rowHover: 'hover:bg-orange-50', sticky: 'bg-orange-50/90', divide: 'divide-orange-200', bg: 'bg-orange-50', border: 'border-orange-200' },
    { header: 'bg-yellow-100 border-yellow-200 text-yellow-900', rowHover: 'hover:bg-yellow-50', sticky: 'bg-yellow-50/90', divide: 'divide-yellow-200', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { header: 'bg-green-100 border-green-200 text-green-900', rowHover: 'hover:bg-green-50', sticky: 'bg-green-50/90', divide: 'divide-green-200', bg: 'bg-green-50', border: 'border-green-200' },
    { header: 'bg-blue-100 border-blue-200 text-blue-900', rowHover: 'hover:bg-blue-50', sticky: 'bg-blue-50/90', divide: 'divide-blue-200', bg: 'bg-blue-50', border: 'border-blue-200' },
    { header: 'bg-indigo-100 border-indigo-200 text-indigo-900', rowHover: 'hover:bg-indigo-50', sticky: 'bg-indigo-50/90', divide: 'divide-indigo-200', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { header: 'bg-purple-100 border-purple-200 text-purple-900', rowHover: 'hover:bg-purple-50', sticky: 'bg-purple-50/90', divide: 'divide-purple-200', bg: 'bg-purple-50', border: 'border-purple-200' },
];

export const RepresentativesTab: React.FC<RepresentativesTabProps> = ({ event_id }) => {
    const { t } = useTranslation();
    const [reps, setReps] = useState<Representative[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<GlobalSettings | null>(null);

    const [searchUnit, setSearchUnit] = useState<string>('');
    const [searchName, setSearchName] = useState<string>('');

    const [isEditing, setIsEditing] = useState(false);
    const [editingRep, setEditingRep] = useState<Partial<Representative>>({});
    
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete', repId: string } | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof Representative; direction: 'asc' | 'desc' }>({ key: 'unit', direction: 'asc' });
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let unsubReps: (() => void) | undefined;
        let unsubRegs: (() => void) | undefined;

        const load = async () => {
            const setts = await getSettings();
            setSettings(setts);
        }
        load();

        import('../../services/sheetService').then(mod => {
            unsubReps = mod.subscribeToRepresentatives((data) => {
                setReps(data);
                setLoading(false);
            });
        });

        return () => {
            if (unsubReps) unsubReps();
        };
    }, []);

    const handleSort = (key: keyof Representative) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleUnitCollapse = (unit: string) => {
        setCollapsedUnits(prev => ({
            ...prev,
            [unit]: !prev[unit]
        }));
    };

    const sortedData = [...reps].sort((a, b) => {
        const strokeSorter = new Intl.Collator('zh-Hant-TW-u-co-stroke').compare;
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        const res = strokeSorter(valA.toString(), valB.toString());
        return sortConfig.direction === 'asc' ? res : -res;
    });

    const filtered = sortedData.filter(r => {
        if (searchUnit && r.unit !== searchUnit) return false;
        if (searchName && !r.name.includes(searchName)) return false;
        return true;
    });

    // Group by unit
    const groupedByUnit = filtered.reduce((acc, rep) => {
        if (!acc[rep.unit]) acc[rep.unit] = [];
        acc[rep.unit].push(rep);
        return acc;
    }, {} as Record<string, Representative[]>);

    const units = Object.keys(groupedByUnit).sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare);

    const handleSave = async () => {
        if (!editingRep.unit || !editingRep.name || !editingRep.phone || !editingRep.password) {
            setMsg({ type: 'error', text: t('stake.reps.all_fields_required', '單位、姓名、電話、密碼 為必填') });
            return;
        }
        try {
            await setRepresentative(editingRep);
            setMsg({ type: 'success', text: t('common.save_success', '存檔成功') });
            setIsEditing(false);
            setEditingRep({});
        } catch (e: any) {
            setMsg({ type: 'error', text: e.message });
        }
    };

    const confirmDelete = async () => {
        if (!confirmAction) return;
        try {
            await deleteRepresentative(confirmAction.repId);
            setMsg({ type: 'success', text: t('common.delete_success', '刪除成功') });
        } catch (e: any) {
            setMsg({ type: 'error', text: e.message });
        }
        setConfirmAction(null);
    };

    return (
        <div className="p-6 animate-fade-in relative pb-24">
            <ConfirmDialog 
                isOpen={!!confirmAction}
                title={t('common.delete_confirm_title', "確認刪除")}
                message={t('common.delete_confirm_msg', "確定要刪除這筆代表資料嗎？此操作無法復原。")}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmAction(null)}
            />

            {/* Modal for Adding/Editing */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-2 border-indigo-100"
                        >
                            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                                <h3 className="font-black flex items-center">
                                    <Plus className="w-5 h-5 mr-2" />
                                    {editingRep.id ? t('stake.reps.edit_title', '編輯代表') : t('stake.reps.add_title', '新增代表')}
                                </h3>
                                <button onClick={() => { setIsEditing(false); setEditingRep({}); }} className="text-white hover:bg-white/20 p-1 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-1 tracking-widest uppercase">{t('stake.reps.field_unit', '單位 (Unit)')}</label>
                                        <select 
                                            value={editingRep.unit || ''}
                                            onChange={e => setEditingRep({...editingRep, unit: e.target.value})}
                                            className="w-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 rounded-xl p-3 text-sm font-bold transition-all"
                                        >
                                            <option value="" disabled>{t('stake.reps.select_unit_placeholder', '選擇單位')}</option>
                                            {settings?.units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-1 tracking-widest uppercase">{t('stake.reps.field_name', '姓名 (Name)')}</label>
                                        <input 
                                            type="text"
                                            value={editingRep.name || ''}
                                            onChange={e => setEditingRep({...editingRep, name: e.target.value})}
                                            className="w-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 rounded-xl p-3 text-sm font-bold transition-all"
                                            placeholder={t('stake.reps.name_placeholder', "請輸入姓名")}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-1 tracking-widest uppercase">{t('stake.reps.field_phone', '電話 (Phone)')}</label>
                                        <input 
                                            type="tel"
                                            value={editingRep.phone || ''}
                                            onChange={e => setEditingRep({...editingRep, phone: e.target.value})}
                                            className="w-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 rounded-xl p-3 text-sm font-bold transition-all"
                                            placeholder={t('stake.reps.phone_placeholder', "請輸入電話")}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-1 tracking-widest uppercase">{t('stake.reps.field_password', '密碼 (Password)')}</label>
                                        <input 
                                            type="text"
                                            value={editingRep.password || ''}
                                            onChange={e => setEditingRep({...editingRep, password: e.target.value})}
                                            className="w-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 rounded-xl p-3 text-sm font-bold transition-all"
                                            placeholder={t('stake.reps.password_placeholder', "請輸入預設密碼")}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => { setIsEditing(false); setEditingRep({}); }} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">{t('common.cancel', '取消')}</button>
                                    <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">{t('common.confirm_save', '確認儲存')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-black flex items-center">
                    <Search className="w-8 h-8 mr-3 text-indigo-600" />
                    {t('stake.reps.tab_title', '代表名單')}
                </h2>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setEditingRep({ unit: settings?.units[0] || '' });
                            setIsEditing(true);
                        }}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center text-sm font-black transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {t('stake.reps.add_title', '新增代表')}
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`p-4 mb-6 rounded-xl border-2 font-bold flex items-center ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl mb-8 shadow-sm border-2 border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.reps.search_by_unit', '依單位搜尋')}</label>
                         <select value={searchUnit} onChange={e => setSearchUnit(e.target.value)} className="w-full border-2 border-gray-100 focus:border-indigo-500 rounded-xl p-3 text-sm font-bold bg-gray-50 transition-all">
                             <option value="">{t('stake.reps.all_units', '全部單位')}</option>
                             {settings?.units.map(u => <option key={u} value={u}>{u}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.reps.search_by_name', '依姓名搜尋')}</label>
                         <div className="relative">
                            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full border-2 border-gray-100 focus:border-indigo-500 rounded-xl p-3 pl-10 text-sm font-bold bg-gray-50 transition-all" placeholder={t('stake.reps.search_placeholder', "輸入搜尋關鍵字...")} />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                         </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {units.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden">
                        <div className="p-12 text-center text-gray-400 font-bold">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            {t('stake.reps.no_data', '尚無代表資料。')}
                        </div>
                    </div>
                ) : (
                    units.map((unit, uIdx) => {
                        const style = rainbowColors[uIdx % rainbowColors.length];
                        const isCollapsed = collapsedUnits[unit];
                        return (
                            <div key={unit} className={`bg-white rounded-3xl shadow-sm border-2 ${style.border} overflow-hidden animate-fade-in`}>
                                <div 
                                    onClick={() => toggleUnitCollapse(unit)}
                                    className={`${style.header} p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-all`}
                                >
                                    <h3 className="font-black text-sm tracking-widest uppercase flex items-center">
                                        <div className={`p-1 rounded-md bg-white/20 mr-2 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                        {unit} ({groupedByUnit[unit].length})
                                    </h3>
                                    <div className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
                                        {isCollapsed ? t('common.click_to_expand', '點擊展開') : t('common.click_to_collapse', '點擊收合')}
                                    </div>
                                </div>
                                
                                <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-sm border-collapse min-w-[800px]">
                                                    <thead className={`${style.bg} border-b-2 ${style.border}`}>
                                                        <tr>
                                                            <th onClick={() => handleSort('unit')} className="p-4 text-left font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors w-[20%]">
                                                                <div className="flex items-center">
                                                                    {t('stake.reps.col_unit', '單位')} {sortConfig.key === 'unit' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                                                                    {sortConfig.key !== 'unit' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                                                                </div>
                                                            </th>
                                                            <th onClick={() => handleSort('name')} className={`p-4 text-left font-black text-gray-400 uppercase tracking-wider sticky left-0 ${style.bg} z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:text-indigo-600 transition-colors w-[20%]`}>
                                                                <div className="flex items-center">
                                                                    {t('stake.reps.col_name', '姓名')} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                                                                    {sortConfig.key !== 'name' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                                                                </div>
                                                            </th>
                                                            <th onClick={() => handleSort('phone')} className="p-4 text-left font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors w-[25%]">
                                                                <div className="flex items-center">
                                                                    {t('stake.reps.col_phone', '電話')} {sortConfig.key === 'phone' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                                                                    {sortConfig.key !== 'phone' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                                                                </div>
                                                            </th>
                                                            <th onClick={() => handleSort('password')} className="p-4 text-left font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors w-[20%]">
                                                                <div className="flex items-center">
                                                                    {t('stake.reps.col_password', '密碼')} {sortConfig.key === 'password' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                                                                    {sortConfig.key !== 'password' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                                                                </div>
                                                            </th>
                                                            <th className="p-4 text-right font-black text-gray-400 uppercase tracking-wider w-[15%]">{t('common.actions', '操作')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {groupedByUnit[unit].map(r => (
                                                            <tr key={r.id} className={`${style.rowHover} transition-colors group`}>
                                                                <td className="p-4 font-bold text-gray-600">{r.unit}</td>
                                                                <td className={`p-4 font-black text-gray-900 sticky left-0 ${style.bg} group-hover:bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors`}>{r.name}</td>
                                                                <td className="p-4 font-black text-indigo-600 tracking-tighter">{r.phone}</td>
                                                                <td className="p-4 font-bold text-gray-400 font-mono text-xs">{r.password}</td>
                                                                <td className="p-4 text-right space-x-2">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setEditingRep(r); setIsEditing(true); }}
                                                                        className="text-indigo-400 p-2 hover:bg-indigo-100 hover:text-indigo-600 rounded-xl transition-all"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', repId: r.id }); }}
                                                                        className="text-red-300 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default RepresentativesTab;
