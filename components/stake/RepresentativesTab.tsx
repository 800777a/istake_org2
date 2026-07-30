import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Representative, Registration, GlobalSettings } from '../../types';
import { setRepresentative, deleteRepresentative, getSettings, subscribeToRepresentatives } from '../../services/sheetService';
import { Trash2, Edit2, Plus, Search, ArrowUpDown, X, ChevronUp, ChevronDown, CheckCircle, ShieldAlert, Users, MapPin, List, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

interface RepresentativesTabProps {
    event_id: string;
}

// Enterprise Light/High-Contrast Theme definitions
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none',
    tableText: 'text-[11px] md:text-xs lg:text-sm text-slate-900',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-all active:scale-95 flex items-center justify-center gap-2 h-10 px-4 text-sm md:h-11 md:px-5 lg:h-10 lg:px-5',
    input: 'w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-10 md:h-11 lg:h-10'
};

// Rainbow sequence themes (Red, Orange, Yellow, Green, Blue, Indigo, Purple)
// 4-level depth: 200 (Title), 100 (Header), 200 (Border), 50 (Content)
const rainbowThemes = [
    { name: 'red', level1: 'bg-red-200', level2: 'bg-red-100', level3: 'border-red-200', level4: 'bg-red-50', text: 'text-red-900', btn: 'bg-red-600' },
    { name: 'orange', level1: 'bg-orange-200', level2: 'bg-orange-100', level3: 'border-orange-200', level4: 'bg-orange-50', text: 'text-orange-900', btn: 'bg-orange-600' },
    { name: 'yellow', level1: 'bg-yellow-200', level2: 'bg-yellow-100', level3: 'border-yellow-200', level4: 'bg-yellow-50', text: 'text-yellow-900', btn: 'bg-yellow-600' },
    { name: 'green', level1: 'bg-green-200', level2: 'bg-green-100', level3: 'border-green-200', level4: 'bg-green-50', text: 'text-green-900', btn: 'bg-green-600' },
    { name: 'blue', level1: 'bg-blue-200', level2: 'bg-blue-100', level3: 'border-blue-200', level4: 'bg-blue-50', text: 'text-blue-900', btn: 'bg-blue-600' },
    { name: 'indigo', level1: 'bg-indigo-200', level2: 'bg-indigo-100', level3: 'border-indigo-200', level4: 'bg-indigo-50', text: 'text-indigo-900', btn: 'bg-indigo-600' },
    { name: 'purple', level1: 'bg-purple-200', level2: 'bg-purple-100', level3: 'border-purple-200', level4: 'bg-purple-50', text: 'text-purple-900', btn: 'bg-purple-600' },
];

export const RepresentativesTab: React.FC<RepresentativesTabProps> = ({ event_id }) => {
    const { t, tString } = useI18n();
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
    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [remountKey, setRemountKey] = useState(0);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // 捲動控制函數
    const scrollTable = (unit: string, direction: 'left' | 'right') => {
        const wrapper = wrapperRefs.current[unit];
        if (wrapper) {
            const scrollAmount = 200;
            wrapper.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Auto-switch to card view on very small screens (portrait mobile)
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                // Portrait mobile: default to card view
                setViewMode('card');
            }
        };
        checkMobile();
    }, []);

    useEffect(() => {
        const handleRotation = () => setRemountKey(prev => prev + 1);
        window.addEventListener('orientationchange', handleRotation);
        window.addEventListener('resize', handleRotation);
        return () => {
            window.removeEventListener('orientationchange', handleRotation);
            window.removeEventListener('resize', handleRotation);
        };
    }, []);

    useEffect(() => {
        let active = true;
        let unsubReps: (() => void) | undefined;

        const load = async () => {
            const setts = await getSettings();
            if (active) setSettings(setts);
        };
        load();

        unsubReps = subscribeToRepresentatives((data) => {
            if (active) {
                setReps(data);
                setLoading(false);
            }
        });

        return () => {
            active = false;
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

    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = React.useMemo(() => {
        return settings?.billingConfig?.units?.map(u => u.shortName) || settings?.units || [];
    }, [settings]);

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
        <div key={remountKey} className="w-full">
            <div className={`w-full ${THEME.canvas} min-h-screen py-2 md:py-4 space-y-2`}>
                <ConfirmDialog 
                    isOpen={!!confirmAction}
                    title={t('common.delete_confirm_title', "確認刪除")}
                    message={t('common.delete_confirm_msg', "確定要刪除這筆代表資料嗎？此操作無法復原。")}
                    onConfirm={confirmDelete}
                    onCancel={() => setConfirmAction(null)}
                />

                {/* Title Section - Level 1 Rainbow Depth (Title Only) */}
                <div className="bg-indigo-900 text-white p-3 md:p-4 rounded shadow-sm flex items-center gap-3 overflow-hidden">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-indigo-300 shrink-0" />
                    <h2 className="text-sm md:text-xl font-black tracking-tight truncate font-title flex-1">
                        {t('stake.reps.tab_title', '代表名單')}
                    </h2>
                </div>

                {/* Action Block - Level 2 Optimization (Buttons moved here) */}
                <div className="bg-indigo-100/50 p-2 rounded border border-indigo-200 flex items-center justify-between gap-2">
                    <button 
                        onClick={() => {
                            setEditingRep({ unit: unitOptions[0] || '' });
                            setIsEditing(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-sm transition-all flex items-center justify-center gap-2 h-9 px-4 text-xs md:h-10 md:px-5 md:text-sm active:scale-95"
                    >
                        <Plus size={16} />
                        <span>{t('stake.reps.add_title', '新增代表')}</span>
                    </button>

                    <div className="flex bg-white p-1 rounded border border-indigo-200 shadow-inner">
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-[11px] font-bold ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <List size={14} />
                            <span>表格</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-[11px] font-bold ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <LayoutDashboard size={14} />
                            <span>卡片</span>
                        </button>
                    </div>
                </div>

            {/* Modal for Adding/Editing */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => { setIsEditing(false); setEditingRep({}); }} />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded w-full max-w-lg overflow-hidden shadow-xl flex flex-col border border-slate-200"
                        >
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                                        <Plus size={20} />
                                    </div>
                                    <h3 className="text-sm md:text-base font-bold text-slate-900">
                                        {editingRep.id ? t('stake.reps.edit_title', '編輯代表') : t('stake.reps.add_title', '新增代表')}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => { setIsEditing(false); setEditingRep({}); }} 
                                    className="p-2 hover:bg-slate-100 text-slate-400 rounded transition-colors"
                                >
                                    <X className="w-5 h-5"/>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.field_unit', '單位')}</label>
                                        <select 
                                            value={editingRep.unit || ''}
                                            onChange={e => setEditingRep({...editingRep, unit: e.target.value})}
                                            className={THEME.input}
                                        >
                                            <option value="" disabled>{tString('stake.reps.select_unit_placeholder', '選擇單位')}</option>
                                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.field_name', '姓名')}</label>
                                        <input 
                                            type="text"
                                            value={editingRep.name || ''}
                                            onChange={e => setEditingRep({...editingRep, name: e.target.value})}
                                            className={THEME.input}
                                            placeholder={t('stake.reps.name_placeholder', "請輸入姓名")}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.field_phone', '電話')}</label>
                                        <input 
                                            type="tel"
                                            value={editingRep.phone || ''}
                                            onChange={e => setEditingRep({...editingRep, phone: e.target.value})}
                                            className={THEME.input}
                                            placeholder={t('stake.reps.phone_placeholder', "請輸入電話")}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.field_password', '密碼')}</label>
                                        <input 
                                            type="text"
                                            value={editingRep.password || ''}
                                            onChange={e => setEditingRep({...editingRep, password: e.target.value})}
                                            className={THEME.input}
                                            placeholder={t('stake.reps.password_placeholder', "請輸入預設密碼")}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button onClick={() => { setIsEditing(false); setEditingRep({}); }} className="flex-1 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded font-bold text-xs tracking-wider h-10">{t('common.cancel', '取消')}</button>
                                    <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs tracking-wider h-10">{t('common.confirm_save', '確認儲存')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {msg && (
                <div className={`mx-2 p-3 rounded border flex items-center shadow-sm animate-fade-in ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <div className="mr-3">
                        {msg.type === 'success' ? <CheckCircle size={18} className="text-emerald-600" /> : <ShieldAlert size={18} className="text-rose-600" />}
                    </div>
                    <span className="text-xs md:text-sm font-bold">{msg.text}</span>
                </div>
            )}

            {/* Filter Section */}
            <div className={THEME.card}>
                <div 
                    className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <div className="flex items-center gap-2 font-title">
                        <Search size={18} className="text-indigo-600" />
                        <h3 className="text-xs md:text-sm font-black text-slate-900">{t('stake.reps.search_filters', '篩選代表條件')}</h3>
                    </div>
                    <div>
                        {isFilterOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.search_by_unit', '依單位篩選')}</label>
                                     <select 
                                        value={searchUnit} 
                                        onChange={e => setSearchUnit(e.target.value)} 
                                        className={THEME.input}
                                     >
                                         <option value="">{tString('stake.reps.all_units', '全部單位')}</option>
                                         { unitOptions.map(u => <option key={u} value={u}>{u}</option>) }
                                     </select>
                                </div>
                                <div className="space-y-1">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stake.reps.search_by_name', '依姓名搜尋')}</label>
                                     <div className="relative">
                                        <input 
                                            type="text" 
                                            value={searchName} 
                                            onChange={e => setSearchName(e.target.value)} 
                                            className={`${THEME.input} pl-9`} 
                                            placeholder={t('stake.reps.search_placeholder', "輸入代表姓名...")} 
                                        />
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                     </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Data Grid Section with dynamic Rainbow sequence coloring */}
            <div className="space-y-4">
                {units.length === 0 ? (
                    <div className="bg-white rounded shadow-sm border border-slate-200 p-12 text-center">
                        <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{t('stake.reps.no_data', '查與代表資料')}</h4>
                    </div>
                ) : (
                    units.map((unit, uIdx) => {
                        const theme = rainbowThemes[uIdx % rainbowThemes.length];
                        const isCollapsed = collapsedUnits[unit] ?? false;

                        return (
                            <div key={unit} className={`rounded border ${theme.level3} overflow-hidden shadow-md transition-all hover:shadow-lg mb-6`}>
                                {/* Collapsible Title Row - Level 1 Rainbow Depth */}
                                <div 
                                    onClick={() => toggleUnitCollapse(unit)}
                                    className={`w-full px-4 py-3 cursor-pointer select-none border-b ${theme.level3} ${theme.level1} flex items-center justify-between transition-all`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded ${theme.btn} flex items-center justify-center text-white shadow-sm`}>
                                            <MapPin size={18} />
                                        </div>
                                        <div>
                                            <h3 className={`text-sm md:text-base font-black ${theme.text} font-title`}>
                                                {unit}
                                            </h3>
                                            <span className={`text-[10px] ${theme.text} opacity-70 font-bold uppercase tracking-wider font-body`}>
                                                {groupedByUnit[unit].length} {t('stake.reps.count_label', '位代表')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={theme.text}>
                                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                                    </div>
                                </div>
                                
                                <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className={`${theme.level4} p-0 md:p-1`}>
                                                {/* Mobile Scroll Control - Level 2 Action Row */}
                                                {viewMode === 'table' && (
                                                    <div className="flex items-center justify-between px-2 py-1.5 bg-white/50 border-b border-slate-200/50 md:hidden">
                                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                                            <ArrowUpDown size={10} />
                                                            <span>{t('common.scroll_hint', '左右滑動或點擊按鈕')}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => scrollTable(unit, 'left')}
                                                                className={`w-8 h-8 rounded-full bg-white border ${theme.level3} flex items-center justify-center text-slate-600 shadow-sm active:scale-90`}
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => scrollTable(unit, 'right')}
                                                                className={`w-8 h-8 rounded-full bg-white border ${theme.level3} flex items-center justify-center text-slate-600 shadow-sm active:scale-90`}
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {viewMode === 'table' ? (
                                                    /* Shell-Zero Horizontal Scroll Table Container */
                                                    <div 
                                                        ref={el => wrapperRefs.current[unit] = el}
                                                        key={remountKey}
                                                        className="dense-table-wrapper"
                                                    >
                                                        <table className="dense-table font-body">
                                                                    <thead>
                                                                        <tr className={`border-b ${theme.level3} ${theme.level2} font-title`}>
                                                                            <th className={`px-4 py-2 font-black text-[11px] md:text-xs text-slate-600 text-left`}>
                                                                                {t('stake.reps.col_name', '姓名')}
                                                                            </th>
                                                                            <th className={`px-4 py-2 font-black text-[11px] md:text-xs text-slate-600 text-left`}>
                                                                                {t('stake.reps.col_phone', '聯絡電話')}
                                                                            </th>
                                                                            <th className={`px-4 py-2 font-black text-[11px] md:text-xs text-slate-600 text-left`}>
                                                                                {t('stake.reps.col_password', '密碼')}
                                                                            </th>
                                                                            <th className={`px-4 py-2 font-black text-[11px] md:text-xs text-slate-600 text-center w-24`}>
                                                                                {t('common.actions', '操作')}
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {groupedByUnit[unit].map((r, idx) => (
                                                                    <tr key={`${r.id}-${unit}-${idx}`} className="bg-white hover:bg-slate-50 transition-colors font-body">
                                                                        <td className="px-4 py-2">
                                                                            <span className={`font-black text-slate-900 text-[11px] md:text-xs lg:text-sm whitespace-nowrap`}>
                                                                                {r.name}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <span className="font-black text-slate-900 text-[11px] md:text-xs lg:text-sm whitespace-nowrap">
                                                                                {r.phone}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <span className="font-black text-slate-900 text-[11px] md:text-xs lg:text-sm whitespace-nowrap">
                                                                                {r.password}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingRep(r); setIsEditing(true); }}
                                                                                    className={`p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors border border-indigo-100 bg-white shadow-sm`}
                                                                                    title={t('common.edit', '編輯')}
                                                                                >
                                                                                    <Edit2 size={14} />
                                                                                </button>
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', repId: r.id }); }}
                                                                                    className={`p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors border border-rose-100 bg-white shadow-sm`}
                                                                                    title={t('common.delete', '刪除')}
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    /* Micro Card View for Mobile Optimization */
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 font-body">
                                                        {groupedByUnit[unit].map((r, idx) => (
                                                            <div key={`${r.id}-${unit}-${idx}`} className="bg-white border border-slate-100 rounded p-3 shadow-sm flex flex-col gap-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-black text-slate-900">{r.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{unit}</span>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setEditingRep(r); setIsEditing(true); }}
                                                                            className={`p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors border border-indigo-100 bg-white shadow-sm`}
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', repId: r.id }); }}
                                                                            className={`p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors border border-rose-100 bg-white shadow-sm`}
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                                    <div className="flex flex-col bg-slate-50 p-1.5 rounded">
                                                                        <span className="text-[9px] text-slate-400 font-bold">{t('stake.reps.col_phone', '聯絡電話')}</span>
                                                                        <span className="text-xs font-black text-slate-700">{r.phone}</span>
                                                                    </div>
                                                                    <div className="flex flex-col bg-slate-50 p-1.5 rounded">
                                                                        <span className="text-[9px] text-slate-400 font-bold">{t('stake.reps.col_password', '密碼')}</span>
                                                                        <span className="text-xs font-black text-slate-700">{r.password}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
    </div>
    );
};

export default RepresentativesTab;
