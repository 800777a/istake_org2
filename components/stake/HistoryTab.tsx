
import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData } from '../../types';
import { updateEvent, deleteDoc, doc, db, collection, query, where, getDocs } from '../../services/sheetService';
import { 
    History, ChevronDown, ChevronUp, Plus, Edit2, Trash2, 
    Calendar, User, Users, Bus, DollarSign, Wallet, FileText,
    ArrowUpDown, Save, X, RefreshCw, MapPin, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RegStatus, TripType } from '../../types';
import { message, Modal } from 'antd';

interface HistoryTabProps {
    events: EventData[];
    onRefresh: () => void;
    onPushToEditor: (content: string) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ events, onRefresh, onPushToEditor }) => {
    const { t, tString } = useI18n();
    const [isExpanded, setIsExpanded] = useState(true);
    // Track collapsed state for each year
    const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({});

    const toggleYearCollapse = (year: string) => {
        setCollapsedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<EventData> | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof EventData; direction: 'asc' | 'desc' } | null>({
        key: 'event_date',
        direction: 'desc'
    });

// Refined rainbow themes following strict system instructions (Light bg + Dark text & borders)
const rainbowThemes = [
    {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        btnHover: 'hover:bg-indigo-200',
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        accent: 'text-indigo-600'
    },
    {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-300',
        btnHover: 'hover:bg-emerald-200',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        accent: 'text-emerald-600'
    },
    {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        btnHover: 'hover:bg-blue-200',
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        accent: 'text-blue-600'
    },
    {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        btnHover: 'hover:bg-purple-200',
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        accent: 'text-purple-600'
    },
    {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
        btnHover: 'hover:bg-amber-200',
        badge: 'bg-amber-50 text-amber-900 border-amber-200',
        accent: 'text-amber-700'
    },
    {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        btnHover: 'hover:bg-orange-200',
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        accent: 'text-orange-600'
    },
    {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        btnHover: 'hover:bg-red-200',
        badge: 'bg-red-50 text-red-800 border-red-200',
        accent: 'text-red-600'
    }
];

    // V410: Column Definitions
    const COLUMNS = [
        { key: 'event_date', label: t('history.col.event_date', '活動日期'), icon: Calendar },
        { key: 'event_title', label: t('history.col.event_title', '活動名稱'), icon: FileText },
        { key: 'organizer', label: t('history.col.organizer', '主辦人'), icon: User },
        { key: 'attendance_total', label: t('history.col.attendance_total', '活動人數'), icon: Users },
        { key: 'attendance_bus', label: t('history.col.attendance_bus', '搭車人數'), icon: Bus },
        { key: 'attendance_self', label: t('history.col.attendance_self', '自理人數'), icon: Users },
        { key: 'attendance_retained', label: t('history.col.attendance_retained', '留用人數'), icon: Users },
        { key: 'revenue_fare', label: t('history.col.revenue_fare', '車資收入'), icon: DollarSign, isMoney: true },
        { key: 'expense_total', label: t('history.col.expense_total', '費用支出'), icon: Wallet, isMoney: true },
        { key: 'settlement_returned', label: t('history.col.settlement_returned', '結算繳回'), icon: Landmark, isMoney: true },
        { key: 'bus_total', label: t('history.col.bus_total', '訂車總數'), icon: Bus },
        { key: 'bus_booking_fee', label: t('history.col.bus_booking_fee', '訂車費用'), icon: DollarSign, isMoney: true },
        { key: 'church_subsidy', label: t('history.col.church_subsidy', '教會補助'), icon: DollarSign, isMoney: true },
        { key: 'event_notes', label: t('history.col.event_notes', '備註'), icon: FileText },
    ];

    const sortedEvents = useMemo(() => {
        const completed = events.filter(e => e.status === 'completed' || (e as any).is_historical);
        if (!sortConfig) return completed;

        return [...completed].sort((a, b) => {
            const valA = a[sortConfig.key] ?? '';
            const valB = b[sortConfig.key] ?? '';
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [events, sortConfig]);

    const eventsByYear = useMemo(() => {
        const groups: Record<string, EventData[]> = {};
        sortedEvents.forEach(event => {
            const year = event.event_date ? event.event_date.split('-')[0] : 'Other';
            if (!groups[year]) groups[year] = [];
            groups[year].push(event);
        });
        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(year => ({
            year,
            events: groups[year]
        }));
    }, [sortedEvents]);

    const calculateStats = (yearEvents: EventData[]) => {
        if (yearEvents.length === 0) return null;
        
        const numericKeys = [
            'attendance_total', 'attendance_bus', 'attendance_self', 'attendance_retained',
            'revenue_fare', 'expense_total', 'settlement_returned', 'bus_total',
            'bus_booking_fee', 'church_subsidy'
        ];

        const totals: Record<string, number> = {};
        numericKeys.forEach(key => {
            totals[key] = yearEvents.reduce((sum, event) => sum + ((event as any)[key] || 0), 0);
        });

        const averages: Record<string, number> = {};
        numericKeys.forEach(key => {
            averages[key] = totals[key] / yearEvents.length;
        });

        return { totals, averages };
    };

    const handleSort = (key: keyof EventData) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleSave = async () => {
        if (!editingEvent?.event_date || !editingEvent?.event_title) return;
        
        try {
            await updateEvent({
                ...editingEvent,
                status: 'completed',
                is_active: false,
                is_historical: true // Custom flag for manual entries
            } as EventData);
            setIsModalOpen(false);
            setEditingEvent(null);
            onRefresh();
        } catch (error) {
            console.error("Save history failed:", error);
        }
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: t('history.msg.confirm_delete', '確定要刪除這筆歷史記錄嗎？'),
            okText: t('common.confirm', '確定'),
            cancelText: t('common.cancel', '取消'),
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteDoc(doc(db, 'events', id));
                    message.success(t('common.deleted_success', '刪除成功'));
                    onRefresh();
                } catch (error) {
                    console.error("Delete history failed:", error);
                    message.error(t('common.delete_failed', '刪除失敗'));
                }
            }
        });
    };

    const renderEventTable = (yearEvents: EventData[], theme: any) => {
        const stats = calculateStats(yearEvents);
        
        return (
            <div className={`overflow-x-auto rounded border shadow-sm mb-6 ${theme.bg}`}>
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className={`${theme.bg} border-b ${theme.border}`}>
                            {COLUMNS.map((col, idx) => (
                                <th 
                                    key={col.key} 
                                    className={`p-4 font-bold ${theme.text} text-[11px] uppercase tracking-wider cursor-pointer hover:bg-black/5 transition-colors group ${idx === 0 ? `sticky left-0 ${theme.bg} z-20` : ''}`}
                                    onClick={() => handleSort(col.key as any)}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                                    </div>
                                </th>
                            ))}
                            <th className={`p-4 font-bold ${theme.text} text-[11px] uppercase tracking-wider text-center`}>{t('common.actions', '操作')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white/60 divide-y divide-slate-100">
                        {yearEvents.map(event => (
                            <tr key={event.event_id} className={`hover:bg-white transition-colors group/row`}>
                                <td className={`p-4 font-bold text-slate-900 text-center sticky left-0 bg-white group-hover/row:bg-slate-50 z-10 text-sm`}>{event.event_date}</td>
                                <td className="p-4 font-semibold text-slate-800 text-center text-sm">{event.event_title}</td>
                                <td className="p-4 text-slate-600 text-center text-sm">{event.organizer || '-'}</td>
                                <td className="p-4 font-bold text-slate-900 text-center text-sm">{event.attendance_total || 0}</td>
                                <td className="p-4 font-bold text-indigo-600 text-center text-sm">{event.attendance_bus || 0}</td>
                                <td className="p-4 font-bold text-emerald-600 text-center text-sm">{event.attendance_self || 0}</td>
                                <td className="p-4 font-bold text-orange-600 text-center text-sm">{event.attendance_retained || 0}</td>
                                <td className="p-4 font-bold text-slate-700 text-right text-sm">${(event.revenue_fare || 0).toLocaleString()}</td>
                                <td className="p-4 font-bold text-slate-700 text-right text-sm">${(event.expense_total || 0).toLocaleString()}</td>
                                <td className="p-4 font-bold text-emerald-700 text-right text-sm">${(event.settlement_returned || 0).toLocaleString()}</td>
                                <td className="p-4 font-bold text-slate-900 text-center text-sm">{event.bus_total || 0}</td>
                                <td className="p-4 font-bold text-slate-700 text-right text-sm">${(event.bus_booking_fee || 0).toLocaleString()}</td>
                                <td className="p-4 font-bold text-indigo-700 text-right text-sm">${(event.church_subsidy || 0).toLocaleString()}</td>
                                <td className="p-4 text-slate-500 text-xs italic truncate max-w-[150px]" title={event.event_notes}>{event.event_notes || '-'}</td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => { setEditingEvent(event); setIsModalOpen(true); }}
                                            className={`p-2 ${theme.text} ${theme.btnHover} rounded border ${theme.border} bg-white shadow-sm transition-all active:scale-95`}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(event.event_id)}
                                            className={`p-2 ${theme.text} ${theme.btnHover} rounded border ${theme.border} bg-white shadow-sm transition-all active:scale-95`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {stats && (
                        <tfoot className={`border-t ${theme.border} ${theme.bg}`}>
                            <tr className={`font-bold ${theme.text} text-xs uppercase`}>
                                <td className={`p-4 text-center sticky left-0 ${theme.bg} z-10 border-r ${theme.border}`} colSpan={3}>{t('common.total', '合計')}</td>
                                <td className="p-4 text-center">{Math.round(stats.totals.attendance_total)}</td>
                                <td className="p-4 text-center">{Math.round(stats.totals.attendance_bus)}</td>
                                <td className="p-4 text-center">{Math.round(stats.totals.attendance_self)}</td>
                                <td className="p-4 text-center">{Math.round(stats.totals.attendance_retained)}</td>
                                <td className="p-4 text-right">${Math.round(stats.totals.revenue_fare).toLocaleString()}</td>
                                <td className="p-4 text-right">${Math.round(stats.totals.expense_total).toLocaleString()}</td>
                                <td className="p-4 text-right">${Math.round(stats.totals.settlement_returned).toLocaleString()}</td>
                                <td className="p-4 text-center">{Math.round(stats.totals.bus_total)}</td>
                                <td className="p-4 text-right">${Math.round(stats.totals.bus_booking_fee).toLocaleString()}</td>
                                <td className="p-4 text-right">${Math.round(stats.totals.church_subsidy).toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header & Control Center - Standardized for Bright Modern Style */}
            <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-4">
                {/* Row 1: Title Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded border border-white/10">
                        <History className="text-blue-300" size={24} />
                    </div>
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                        {t('history.title', '歷史活動資料庫')}
                    </h2>
                </div>
                
                {/* Row 2: Subtitle & Actions Right Aligned */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider opacity-80">
                        Event Statistics & Financial Settlement Records
                    </p>
                    <div className="flex justify-end items-center gap-3">
                        <button 
                            onClick={() => { setEditingEvent({}); setIsModalOpen(true); }}
                            className="bg-blue-600 text-white rounded font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 h-12 px-6 text-base md:h-11 md:px-5 md:text-sm lg:h-10 lg:px-5 lg:text-sm active:scale-95"
                        >
                            <Plus size={18} />
                            {t('history.btn.add_manual', '補登歷史活動')}
                        </button>
                        <button 
                            onClick={onRefresh}
                            className="bg-white/10 text-white p-2 rounded border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center h-12 w-12 md:h-11 md:w-11 lg:h-10 lg:w-10 active:scale-95"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Time-based Archive Sections */}
            <div className="space-y-6">
                {eventsByYear.map((yearGroup, yearIdx) => {
                    const theme = rainbowThemes[yearIdx % rainbowThemes.length];
                    const stats = calculateStats(yearGroup.events);
                    // Default to expanded (false in collapsed state)
                    const isCollapsed = collapsedYears[yearGroup.year] ?? false;
                    
                    return (
                        <div key={yearGroup.year} className="animate-fade-in border rounded bg-white shadow-sm overflow-hidden">
                            {/* Collapsible Card Header Standard */}
                            <div 
                                onClick={() => toggleYearCollapse(yearGroup.year)}
                                className={`w-full p-4 cursor-pointer select-none border-b ${theme.border} bg-white group hover:bg-slate-50 transition-colors`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded ${theme.bg} ${theme.text} border ${theme.border}`}>
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${theme.text} text-sm md:text-base lg:text-lg`}>
                                            {yearGroup.year} 年度回顧
                                        </h3>
                                    </div>
                                    <div className={theme.text}>
                                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                                    </div>
                                </div>
                                
                                {/* Info and buttons moved below title and right-aligned */}
                                <div className="w-full flex justify-end items-center gap-3 mt-3">
                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${theme.badge}`}>
                                        {yearGroup.events.length} {t('common.unit.events', '場活動')}
                                    </span>
                                </div>
                            </div>

                            <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="p-4 bg-[#F0F4F8]/30"
                                    >
                                        {/* Year Stats Grid - Bright Modern Cards */}
                                        {stats && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                                <div className="bg-white p-5 rounded border border-slate-100 shadow-sm group hover:border-indigo-400 transition-all">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">年度總人數</p>
                                                    <div className="flex items-end justify-between">
                                                        <h4 className="text-2xl font-bold text-slate-900 tabular-nums">
                                                            {stats.totals.attendance_total.toLocaleString()}
                                                        </h4>
                                                        <Users className="w-6 h-6 text-slate-200" />
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded border border-slate-100 shadow-sm group hover:border-emerald-400 transition-all">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">車資總收入</p>
                                                    <div className="flex items-end justify-between">
                                                        <h4 className="text-2xl font-bold text-emerald-600 tabular-nums">
                                                            ${stats.totals.revenue_fare.toLocaleString()}
                                                        </h4>
                                                        <Wallet className="w-6 h-6 text-emerald-100" />
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded border border-slate-100 shadow-sm group hover:border-rose-400 transition-all">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">年度總支出</p>
                                                    <div className="flex items-end justify-between">
                                                        <h4 className="text-2xl font-bold text-rose-600 tabular-nums">
                                                            ${stats.totals.expense_total.toLocaleString()}
                                                        </h4>
                                                        <DollarSign className="w-6 h-6 text-rose-100" />
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded border border-slate-100 shadow-sm group hover:border-amber-400 transition-all">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">平均每場人數</p>
                                                    <div className="flex items-end justify-between">
                                                        <h4 className="text-2xl font-bold text-amber-600 tabular-nums">
                                                            {Math.round(stats.averages.attendance_total)}
                                                        </h4>
                                                        <RefreshCw className="w-6 h-6 text-amber-100" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {renderEventTable(yearGroup.events, theme)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Manual Entry Modal - Bright Corporate Style */}
            <AnimatePresence>
                {isModalOpen && editingEvent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-blue-50 rounded">
                                        <Save className="text-blue-600" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                                            {editingEvent?.event_id?.startsWith('HIST-') ? t('history.modal.add_title', '補登歷史資料') : t('history.modal.edit_title', '編輯歷史記錄')}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Manual Data Archiving System</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-slate-100 text-slate-400 rounded transition-all active:scale-90"><X className="w-6 h-6"/></button>
                            </div>
                            
                            <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Basic Info */}
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{t('history.group.basic', '基本活動資訊')}</h4>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">{t('history.col.event_date', '活動日期')}</label>
                                                <div className="relative group">
                                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                                    <input 
                                                        type="date"
                                                        value={editingEvent.event_date || ''}
                                                        onChange={e => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded font-black focus:border-blue-500 focus:bg-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">{t('history.col.event_title', '活動標題')}</label>
                                                <div className="relative group">
                                                    <FileText className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                                    <input 
                                                        type="text"
                                                        value={editingEvent.event_title || ''}
                                                        onChange={e => setEditingEvent({ ...editingEvent, event_title: e.target.value })}
                                                        placeholder={tString('history.placeholder.title', '例如：2023年6月聖殿旅行團')}
                                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded font-black focus:border-blue-500 focus:bg-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">{t('history.col.organizer', '主辦負責人')}</label>
                                                <div className="relative group">
                                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                                    <input 
                                                        type="text"
                                                        value={editingEvent.organizer || ''}
                                                        onChange={e => setEditingEvent({ ...editingEvent, organizer: e.target.value })}
                                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded font-black focus:border-blue-500 focus:bg-white transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Stats */}
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{t('history.group.attendance', '參與人數統計')}</h4>
                                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-8 rounded border border-slate-100">
                                            {[
                                                { key: 'attendance_total', label: t('history.col.attendance_total', '總人數'), icon: Users, color: 'text-slate-900' },
                                                { key: 'attendance_bus', label: t('history.col.attendance_bus', '搭車人數'), icon: Bus, color: 'text-indigo-600' },
                                                { key: 'attendance_self', label: t('history.col.attendance_self', '自理人數'), icon: Users, color: 'text-emerald-600' },
                                                { key: 'attendance_retained', label: t('history.col.attendance_retained', '留用人數'), icon: History, color: 'text-amber-600' }
                                            ].map(stat => (
                                                <div key={stat.key}>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{stat.label}</label>
                                                    <div className="relative group">
                                                        <stat.icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${stat.color} opacity-40 group-focus-within:opacity-100 transition-opacity`} />
                                                        <input 
                                                            type="number"
                                                            value={(editingEvent as any)[stat.key] || 0}
                                                            onChange={e => setEditingEvent({ ...editingEvent, [stat.key]: parseInt(e.target.value) || 0 })}
                                                            className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded font-black focus:border-blue-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Financial Stats */}
                                    <div className="md:col-span-2 space-y-8">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{t('history.group.finance', '財務收支明細')}</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-8 rounded border border-slate-100">
                                            {[
                                                { key: 'revenue_fare', label: t('history.col.revenue_fare', '車資收入'), icon: DollarSign, accent: 'text-emerald-600' },
                                                { key: 'expense_total', label: t('history.col.expense_total', '費用支出'), icon: Wallet, accent: 'text-rose-600' },
                                                { key: 'settlement_returned', label: t('history.col.settlement_returned', '結算繳回'), icon: Landmark, accent: 'text-blue-600' },
                                                { key: 'bus_total', label: t('history.col.bus_total', '訂車總數'), icon: Bus, accent: 'text-slate-600', noMoney: true },
                                                { key: 'bus_booking_fee', label: t('history.col.bus_booking_fee', '訂車費用'), icon: DollarSign, accent: 'text-rose-600' },
                                                { key: 'church_subsidy', label: t('history.col.church_subsidy', '教會補助'), icon: DollarSign, accent: 'text-indigo-600' }
                                            ].map(stat => (
                                                <div key={stat.key}>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{stat.label}</label>
                                                    <div className="relative group">
                                                        <stat.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                                        {!stat.noMoney && <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500">$</span>}
                                                        <input 
                                                            type="number"
                                                            value={(editingEvent as any)[stat.key] || 0}
                                                            onChange={e => setEditingEvent({ ...editingEvent, [stat.key]: parseInt(e.target.value) || 0 })}
                                                            className={`w-full ${stat.noMoney ? 'pl-10' : 'pl-12'} pr-4 py-4 bg-white border-2 border-slate-100 rounded font-black focus:border-blue-500 outline-none transition-all ${stat.accent}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">{t('history.col.event_notes', '活動備註事項')}</label>
                                        <div className="relative group">
                                            <MessageSquare className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <textarea 
                                                value={editingEvent.event_notes || ''}
                                                onChange={e => setEditingEvent({ ...editingEvent, event_notes: e.target.value })}
                                                rows={4}
                                                placeholder={tString('history.placeholder.notes', '輸入活動備註或補充說明...')}
                                                className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-100 rounded font-black focus:border-blue-500 focus:bg-white transition-all outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-6">
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-10 py-5 bg-white text-slate-400 rounded font-black text-sm hover:bg-slate-100 transition-all border-2 border-slate-100 active:scale-95"
                                >
                                    {t('common.cancel', '取消')}
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-14 py-5 bg-blue-600 text-white rounded font-black text-sm shadow-xl hover:shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center"
                                >
                                    <Save className="w-5 h-5 mr-3" /> {t('common.save_record', '儲存歷史記錄 (SAVE)')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HistoryTab;

const Landmark: React.FC<any> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="3" y1="22" x2="21" y2="22" />
    <line x1="6" y1="18" x2="6" y2="11" />
    <line x1="10" y1="18" x2="10" y2="11" />
    <line x1="14" y1="18" x2="14" y2="11" />
    <line x1="18" y1="18" x2="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </svg>
);
