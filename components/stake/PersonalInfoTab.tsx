import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { PersonalInfo, Registration, EventData, OrdinanceItem } from '../../types';
import * as sheetService from '../../services/sheetService';
import { Trash2, Search, PlusCircle, X, ChevronDown, ChevronUp, ArrowUpDown, Edit2, Users, Contact, List, LayoutDashboard, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { getGenderFromId, calculateAge } from '../../utils/validation';
import { motion, AnimatePresence } from 'motion/react';
import { RainbowCard } from './fee-config/RainbowCard';

interface PersonalInfoTabProps {
    units: string[];
    registrations: Registration[];
    currentEvent?: EventData | null;
}

// Enterprise Light/High-Contrast Theme definitions
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded-[8px] shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none',
    tableText: 'text-[11px] md:text-xs lg:text-sm text-slate-900',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 h-10 px-4 text-sm md:h-11 md:px-5 lg:h-10 lg:px-5',
    input: 'w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-10 md:h-11 lg:h-10'
};

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ units, registrations, currentEvent }) => {
    const { t, tString } = useI18n();
    const [infos, setInfos] = useState<PersonalInfo[]>([]);
    const [searchUnit, setSearchUnit] = useState('');
    const [searchName, setSearchName] = useState('');
    
    // View mode and RWD
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [remountKey, setRemountKey] = useState(0);
    const wrapperRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

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

    useEffect(() => {
        const handleResize = () => setRemountKey(k => k + 1);
        window.addEventListener('orientationchange', handleResize);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('orientationchange', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Auto-switch to card view on very small screens (portrait mobile)
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                setViewMode('card');
            }
        };
        checkMobile();
    }, []);

    // Form state/Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formUnit, setFormUnit] = useState('');
    const [formName, setFormName] = useState('');
    const [formBirth, setFormBirth] = useState('');
    const [formIdentity, setFormIdentity] = useState('');
    const [formService, setFormService] = useState('');
    const [formGuardian, setFormGuardian] = useState('');

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PersonalInfo, direction: 'asc' | 'desc' }>({ key: 'unit', direction: 'asc' });
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | '' }>({ text: '', type: '' });
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const unsub = sheetService.subscribeToPersonalInfo(setInfos);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);
    
    const gender = getGenderFromId(formIdentity);
    const age = (formBirth && currentEvent) ? calculateAge(formBirth, currentEvent.event_date) : 0;

    const getServiceOptions = () => {
        const options: { value: string, label: string }[] = [{ value: '', label: t('common.unspecified', '（不指定/無）') }];
        if (gender === '1') { // Male
            if (age >= 18) {
                options.push(
                    { value: '沒有', label: t('common.none', '沒有') },
                    { value: '祭司', label: t('stake.personal_info.service_priest', '祭司') },
                    { value: '長老', label: t('stake.personal_info.service_elder', '長老') },
                    { value: '已做過恩道門', label: t('stake.personal_info.service_endowment', '已做過恩道門') }
                );
            } else if (age >= 16) {
                options.push(
                    { value: '沒有', label: t('common.none', '沒有') },
                    { value: '祭司', label: t('stake.personal_info.service_priest', '祭司') }
                );
            }
        } else if (gender === '2') { // Female
            if (age >= 18) {
                options.push(
                    { value: '沒有', label: t('common.none', '沒有') },
                    { value: '已做過恩道門', label: t('stake.personal_info.service_endowment', '已做過恩道門') }
                );
            }
        }
        return options;
    };

    const serviceOptions = getServiceOptions();

    const filteredInfos = infos.filter(i => {
        const matchUnit = !searchUnit || i.unit === searchUnit;
        const matchName = !searchName || i.name.includes(searchName);
        return matchUnit && matchName;
    });

    const sortedInfos = [...filteredInfos].sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toString();
        const valB = (b[sortConfig.key] || '').toString();
        
        const strokeSorter = new Intl.Collator('zh-Hant-TW-u-co-stroke').compare;
        let res = 0;
        if (sortConfig.key === 'unit') {
            res = strokeSorter(valA, valB);
        } else {
            res = strokeSorter(valA, valB);
        }
        return sortConfig.direction === 'asc' ? res : -res;
    });

    // Group by unit
    const groupedByUnit = sortedInfos.reduce((acc, info) => {
        if (!acc[info.unit]) acc[info.unit] = [];
        acc[info.unit].push(info);
        return acc;
    }, {} as Record<string, PersonalInfo[]>);

    const sortedUnits = Object.keys(groupedByUnit).sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare);

    const toggleSort = (key: keyof PersonalInfo) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleUnitCollapse = (unit: string) => {
        setCollapsedUnits(prev => ({
            ...prev,
            [unit]: !prev[unit]
        }));
    };

    const resetForm = () => {
        setEditingId(null);
        setFormUnit('');
        setFormName('');
        setFormBirth('');
        setFormIdentity('');
        setFormService('');
        setFormGuardian('');
        setIsFormOpen(false);
    };

    const handleEdit = (info: PersonalInfo) => {
        setEditingId(info.id);
        setFormUnit(info.unit);
        setFormName(info.name);
        setFormBirth(info.birth_date);
        setFormIdentity(info.identity_id);
        setFormService(info.service_qualification || '');
        setFormGuardian(info.guardian || '');
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!formUnit || !formName || !formBirth || !formIdentity) {
            setMessage({ text: t('stake.personal_info.fill_all_fields', '請填寫完整資訊'), type: 'error' });
            return;
        }

        try {
            await sheetService.setPersonalInfo({
                id: editingId || undefined,
                unit: formUnit,
                name: formName,
                birth_date: formBirth,
                identity_id: formIdentity,
                service_qualification: formService,
                guardian: formGuardian
            });
            setMessage({ text: editingId ? t('stake.personal_info.update_success', '修改成功') : t('stake.personal_info.add_success', '新增成功'), type: 'success' });
            resetForm();
        } catch (error) {
            setMessage({ text: t('stake.personal_info.save_failed', '儲存失敗'), type: 'error' });
        }
    };

    const handleDelete = async () => {
        if(deleteId) {
            await sheetService.deletePersonalInfo(deleteId);
            setDeleteId(null);
            setMessage({ text: t('stake.personal_info.delete_success', '刪除成功'), type: 'success' });
        }
    };

    const SortIcon = ({ column }: { column: keyof PersonalInfo }) => (
        <div onClick={(e) => { e.stopPropagation(); toggleSort(column); }} className="inline-flex items-center cursor-pointer hover:text-indigo-600 transition-colors ml-1">
            {sortConfig.key === column ? (
                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
                <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
        </div>
    );

    return (
        <div key={remountKey} className={`space-y-6 animate-fade-in pb-20 ${THEME.canvas} min-h-screen`}>
            <AnimatePresence>
                {message.text && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-2xl border font-bold flex items-center ${
                            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                    >
                        {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Level 1: Page Title Header (Indigo 900) */}
            <div className="bg-indigo-900 text-white p-4 rounded-[12px] shadow-lg flex items-center justify-between overflow-hidden">
                <div className="flex items-center gap-3">
                    <Contact className="w-6 h-6 text-indigo-300" />
                    <h2 className="text-sm md:text-xl font-black tracking-tight font-title">
                        {t('stake.personal_info.tab_title', '成員名單')}
                    </h2>
                </div>
            </div>

            {/* Level 2: Two-Column Action Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 md:px-0">
                {/* Left Column: Add Member Button */}
                <div className="flex-1 md:max-w-xs">
                    <button 
                        onClick={() => { resetForm(); setIsFormOpen(true); }} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] font-black shadow-md transition-all flex items-center justify-center gap-2 h-12 px-6 text-sm md:text-base active:scale-[0.98]"
                    >
                        <UserPlus size={20} />
                        <span>{t('stake.personal_info.add_member_btn', '新增成員')}</span>
                    </button>
                </div>

                {/* Right Column: View Mode Selectors in a single block */}
                <div className="flex bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-indigo-100 shadow-sm self-end md:self-auto">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-black ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <List size={16} />
                        <span>{t('common.view_mode.table', '表格')}</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('card')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-black ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <LayoutDashboard size={16} />
                        <span>{t('common.view_mode.card', '卡片')}</span>
                    </button>
                </div>
            </div>

            {/* Level 3: Search Filters (Orange Theme - Rainbow Depth 1) */}
            <div className="px-1 md:px-0">
                <RainbowCard
                    title={t('stake.personal_info.search_filters', '篩選成員條件')}
                    icon={<Search size={18} />}
                    colorIndex={1}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stake.personal_info.search_by_unit', '依單位搜尋')}</label>
                            <select 
                                value={searchUnit} 
                                onChange={e => setSearchUnit(e.target.value)} 
                                className={THEME.input}
                            >
                                <option value="">{tString('stake.personal_info.all_units', '全部單位')}</option>
                                {(units || []).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stake.personal_info.search_by_name', '依姓名搜尋')}</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder={t('stake.personal_info.search_placeholder', "輸入搜尋關鍵字...")}
                                    value={searchName} 
                                    onChange={e => setSearchName(e.target.value)} 
                                    className={`${THEME.input} pl-9`} 
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    </div>
                </RainbowCard>
            </div>

            <div className="space-y-6">
                {sortedUnits.length === 0 ? (
                    <div className={THEME.card + " p-12 text-center"}>
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <h4 className="text-sm font-bold text-slate-900">{t('stake.personal_info.no_results', '目前沒有符合的資料')}</h4>
                    </div>
                ) : (
                    sortedUnits.map((unit, uIdx) => {
                        const isCollapsed = collapsedUnits[unit] ?? false;
                        return (
                            <RainbowCard
                                key={unit}
                                title={unit}
                                icon={<Users size={18} />}
                                colorIndex={(uIdx + 2) % 7}
                                isExpanded={!isCollapsed}
                                onToggle={() => toggleUnitCollapse(unit)}
                                noPadding={viewMode === 'table'} // 表格模式下移除外層 Padding，數據極大化
                                extra={
                                    <span className="text-[10px] font-black text-slate-500 bg-white/60 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-widest">
                                        {groupedByUnit[unit].length} {t('common.unit.members', '位成員')}
                                    </span>
                                }
                            >
                                <div className="space-y-0">
                                    {viewMode === 'table' ? (
                                        <div className="space-y-0">
                                            {/* Shell-Zero Mobile Scroll Hint (Level 2 Rainbow Depth) */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-white/50 border-b border-slate-100 md:hidden">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                    <ArrowUpDown size={12} className="animate-bounce-v" />
                                                    <span>{t('common.scroll_hint', '左右滑動查看資料')}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => scrollTable(unit, 'left')}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm active:scale-90"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => scrollTable(unit, 'right')}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm active:scale-90"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div 
                                                ref={el => wrapperRefs.current[unit] = el}
                                                className="dense-table-wrapper p-1 md:p-1" // 最小套殼 4px (p-1)
                                            >
                                                <table className="dense-table font-body">
                                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1">
                                                                    {t('stake.personal_info.col_name', '姓名')}
                                                                    <SortIcon column="name" />
                                                                </div>
                                                            </th>
                                                            <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1">
                                                                    {t('stake.personal_info.col_birth', '西元生日')}
                                                                    <SortIcon column="birth_date" />
                                                                </div>
                                                            </th>
                                                            <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1">
                                                                    {t('stake.personal_info.col_identity', '身分證/居留證')}
                                                                    <SortIcon column="identity_id" />
                                                                </div>
                                                            </th>
                                                            <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1">
                                                                    {t('stake.personal_info.col_guardian', '監護人')}
                                                                    <SortIcon column="guardian" />
                                                                </div>
                                                            </th>
                                                            <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1">
                                                                    {t('stake.personal_info.col_service', '服務資格')}
                                                                    <SortIcon column="service_qualification" />
                                                                </div>
                                                            </th>
                                                            <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600 w-24 uppercase tracking-widest">
                                                                {t('stake.personal_info.col_actions', '操作')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {groupedByUnit[unit].map((info, idx) => (
                                                            <tr key={`${info.id}-${unit}-${idx}`} className="hover:bg-indigo-50/30 transition-colors group">
                                                                <td className="px-4 py-2.5 font-black text-slate-900 text-[11px] md:text-xs lg:text-sm">{info.name}</td>
                                                                <td className="px-4 py-2.5 text-slate-600 text-[11px] md:text-xs lg:text-sm tabular-nums">{info.birth_date}</td>
                                                                <td className="px-4 py-2.5 text-slate-600 text-[11px] md:text-xs lg:text-sm font-mono tracking-tight">{info.identity_id}</td>
                                                                <td className="px-4 py-2.5 text-slate-600 text-[11px] md:text-xs lg:text-sm">{info.guardian || '-'}</td>
                                                                <td className="px-4 py-2.5">
                                                                    {info.service_qualification ? (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black border border-indigo-100 bg-indigo-50 text-indigo-700 uppercase tracking-tighter">
                                                                            {info.service_qualification}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-xs">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button 
                                                                            onClick={() => handleEdit(info)} 
                                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100 bg-white shadow-sm active:scale-90"
                                                                            title={tString('common.edit', "編輯")}
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setDeleteId(info.id)} 
                                                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 bg-white shadow-sm active:scale-90" 
                                                                            title={tString('common.delete', "刪除")}
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
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1 md:p-4 font-body">
                                            {groupedByUnit[unit].map((info, idx) => (
                                                <div key={`${info.id}-${unit}-${idx}`} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-900">{info.name}</span>
                                                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">{unit}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleEdit(info)} 
                                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm transition-all"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeleteId(info.id)} 
                                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-100 shadow-sm transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                                            <span className="text-[10px] text-slate-400 font-bold">{t('stake.personal_info.col_birth', '西元生日')}</span>
                                                            <span className="text-[11px] font-black text-slate-700">{info.birth_date}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                                            <span className="text-[10px] text-slate-400 font-bold">ID</span>
                                                            <span className="text-[11px] font-black text-slate-700 font-mono tracking-tight">{info.identity_id}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                                            <span className="text-[10px] text-slate-400 font-bold">{t('stake.personal_info.col_guardian', '監護人')}</span>
                                                            <span className="text-[11px] font-black text-slate-700">{info.guardian || '-'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                                            <span className="text-[10px] text-slate-400 font-bold">{t('stake.personal_info.col_service', '服務資格')}</span>
                                                            {info.service_qualification ? (
                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                    {info.service_qualification}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-black text-slate-400">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </RainbowCard>
                        );
                    })
                )}
            </div>

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-indigo-100"
                        >
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <h3 className="text-xl font-black flex items-center">
                                    {editingId ? <Edit2 className="w-6 h-6 mr-3" /> : <PlusCircle className="w-6 h-6 mr-3" />}
                                    {editingId ? t('stake.personal_info.edit_title', '編輯成員') : t('stake.personal_info.add_title', '新增成員')}
                                </h3>
                                <button onClick={resetForm} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
                                    <X className="w-7 h-7"/>
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_unit', '單位 (Unit)')}</label>
                                            <select 
                                                value={formUnit} 
                                                onChange={e => setFormUnit(e.target.value)} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none" 
                                                required
                                            >
                                                <option value="" disabled>{tString('stake.personal_info.select_unit_placeholder', '請選擇單位')}</option>
                                                {(units || []).map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_name', '姓名 (Name)')}</label>
                                            <input 
                                                type="text" 
                                                value={formName} 
                                                onChange={e => setFormName(e.target.value)} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none" 
                                                placeholder={t('stake.personal_info.name_placeholder', "請輸入姓名")}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_birth', '西元生日 (Birth date)')}</label>
                                            <input 
                                                type="date" 
                                                value={formBirth} 
                                                onChange={e => setFormBirth(e.target.value)} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none uppercase" 
                                                required 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_identity', '身分證/居留證 (ID)')}</label>
                                            <input 
                                                type="text" 
                                                value={formIdentity} 
                                                onChange={e => setFormIdentity(e.target.value.toUpperCase())} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none uppercase font-mono" 
                                                placeholder={t('stake.personal_info.identity_placeholder', "請輸入 ID")}
                                                required 
                                                maxLength={10} 
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_guardian', '監護人 (Guardian)')}</label>
                                            <input 
                                                type="text" 
                                                value={formGuardian} 
                                                onChange={e => setFormGuardian(e.target.value)} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none" 
                                                placeholder={t('stake.personal_info.guardian_placeholder', "小於18歲時需輸入監護人姓名")}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.field_service', '服務資格 (Service Qualification)')}</label>
                                            <select 
                                                value={formService} 
                                                onChange={e => setFormService(e.target.value)} 
                                                className="w-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-indigo-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                                            >
                                                {serviceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        type="button" 
                                        onClick={resetForm} 
                                        className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all"
                                    >
                                        {t('common.cancel', '取消')}
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                    >
                                        {t('common.confirm_save', '確認儲存')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog 
                isOpen={!!deleteId}
                title={t('stake.personal_info.delete_confirm_title', "刪除成員確認")}
                message={t('stake.personal_info.delete_confirm_msg', "確定要刪除這位成員嗎？刪除後無法恢復。")}
                confirmText={t('stake.personal_info.delete_confirm_btn', "確定刪除")}
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
                isDangerous={true}
            />
        </div>
    );
};

export default PersonalInfoTab;
