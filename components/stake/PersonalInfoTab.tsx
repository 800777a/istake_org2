import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonalInfo, Registration, EventData, OrdinanceItem } from '../../types';
import * as sheetService from '../../services/sheetService';
import { Trash2, Search, PlusCircle, X, ChevronDown, ChevronUp, ArrowUpDown, Edit2 } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { getGenderFromId, calculateAge } from '../../utils/validation';
import { motion, AnimatePresence } from 'motion/react';

interface PersonalInfoTabProps {
    units: string[];
    registrations: Registration[];
    currentEvent?: EventData | null;
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

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ units, registrations, currentEvent }) => {
    const { t } = useTranslation();
    const [infos, setInfos] = useState<PersonalInfo[]>([]);
    const [searchUnit, setSearchUnit] = useState('');
    const [searchName, setSearchName] = useState('');
    
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
        <div className="p-6 animate-fade-in relative pb-24">
            <AnimatePresence>
                {message.text && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl border-2 font-bold flex items-center ${
                            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                    >
                        {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-black flex items-center tracking-tight text-gray-900 border-l-8 border-indigo-600 pl-4">
                    {t('stake.personal_info.tab_title', '成員名單')}
                </h2>
                <button 
                    onClick={() => { resetForm(); setIsFormOpen(true); }} 
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 font-black hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center"
                >
                    <PlusCircle className="w-5 h-5 mr-2" /> {t('stake.personal_info.add_member_btn', '新增成員')}
                </button>
            </div>

            <div className="bg-white p-6 rounded-3xl mb-8 shadow-sm border-2 border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.search_by_unit', '依單位搜尋')}</label>
                         <select 
                            value={searchUnit} 
                            onChange={e => setSearchUnit(e.target.value)} 
                            className="w-full border-2 border-gray-100 focus:border-indigo-500 rounded-2xl p-3.5 text-sm font-bold bg-gray-50/50 transition-all outline-none"
                        >
                             <option value="">{t('stake.personal_info.all_units', '全部單位')}</option>
                             {units.map(u => <option key={u} value={u}>{u}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-xs font-black text-gray-400 mb-2 tracking-widest uppercase">{t('stake.personal_info.search_by_name', '依姓名搜尋')}</label>
                         <div className="relative">
                            <input 
                                type="text" 
                                placeholder={t('stake.personal_info.search_placeholder', "輸入搜尋關鍵字...")}
                                value={searchName} 
                                onChange={e => setSearchName(e.target.value)} 
                                className="w-full border-2 border-gray-100 focus:border-indigo-500 rounded-2xl p-3.5 pl-11 text-sm font-bold bg-gray-50/50 transition-all outline-none" 
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                         </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {sortedUnits.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden text-center p-20 font-bold text-gray-300">
                        <Search className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        {t('stake.personal_info.no_results', '目前沒有符合的資料')}
                    </div>
                ) : (
                    sortedUnits.map((unit, uIdx) => {
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
                                                <table className="w-full text-sm border-collapse min-w-[900px]">
                                                    <thead className={`${style.bg} border-b-2 ${style.border}`}>
                                                        <tr>
                                                            <th className="p-4 text-left font-black text-gray-400 uppercase tracking-wider w-[15%]">
                                                                <div className="flex items-center">{t('stake.personal_info.col_unit', '單位')} <SortIcon column="unit" /></div>
                                                            </th>
                                                            <th className={`p-4 text-left font-black text-gray-400 uppercase tracking-wider sticky left-0 ${style.bg} z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] w-[15%]`}>
                                                                <div className="flex items-center">{t('stake.personal_info.col_name', '姓名')} <SortIcon column="name" /></div>
                                                            </th>
                                                            <th className="p-4 text-left font-black text-gray-400 uppercase tracking-wider w-[15%]">
                                                                <div className="flex items-center">{t('stake.personal_info.col_birth', '西元生日')} <SortIcon column="birth_date" /></div>
                                                            </th>
                                                            <th className="p-4 text-left font-black text-gray-400 uppercase tracking-wider w-[20%]">
                                                                <div className="flex items-center">{t('stake.personal_info.col_identity', '身分證/居留證')} <SortIcon column="identity_id" /></div>
                                                            </th>
                                                            <th className="p-4 text-left font-black text-gray-400 uppercase tracking-wider w-[20%]">
                                                                <div className="flex items-center">{t('stake.personal_info.col_guardian', '監護人')} <SortIcon column="guardian" /></div>
                                                            </th>
                                                            <th className="p-4 text-left font-black text-gray-400 uppercase tracking-wider w-[20%]">
                                                                <div className="flex items-center">{t('stake.personal_info.col_service', '服務資格')} <SortIcon column="service_qualification" /></div>
                                                            </th>
                                                            <th className="p-4 text-right font-black text-gray-400 uppercase tracking-wider w-[15%]">{t('stake.personal_info.col_actions', '操作')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {groupedByUnit[unit].map(info => (
                                                            <tr key={info.id} className={`${style.rowHover} transition-colors group`}>
                                                                <td className="p-4 font-bold text-gray-500">{info.unit}</td>
                                                                <td className={`p-4 font-black text-gray-900 sticky left-0 ${style.bg} group-hover:bg-white z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] transition-colors`}>{info.name}</td>
                                                                <td className="p-4 font-bold text-gray-600 tabular-nums">{info.birth_date}</td>
                                                                <td className="p-4 font-black text-indigo-600 font-mono tracking-tighter tabular-nums">{info.identity_id}</td>
                                                                <td className="p-4 font-bold text-gray-600">{info.guardian || '-'}</td>
                                                                <td className="p-4">
                                                                    <span className="px-3 py-1 bg-white/50 border-2 border-indigo-50 text-indigo-900 rounded-full text-[11px] font-black uppercase whitespace-nowrap">
                                                                        {info.service_qualification || t('common.none', '無')}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-right space-x-2">
                                                                    <button 
                                                                        onClick={() => handleEdit(info)} 
                                                                        className="text-indigo-400 p-2.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-2xl transition-all"
                                                                        title={t('common.edit', "編輯")}
                                                                    >
                                                                        <Edit2 className="w-5 h-5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setDeleteId(info.id)} 
                                                                        className="text-red-300 p-2.5 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all" 
                                                                        title={t('common.delete', "刪除")}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
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
                                                <option value="" disabled>{t('stake.personal_info.select_unit_placeholder', '請選擇單位')}</option>
                                                {units.map(u => <option key={u} value={u}>{u}</option>)}
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
