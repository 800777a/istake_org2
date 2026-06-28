
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isLogExpanded, setIsLogExpanded] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<EventData> | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof EventData; direction: 'asc' | 'desc' } | null>({
        key: 'event_date',
        direction: 'desc'
    });

    const rainbowColors = [
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', accent: 'bg-red-600', shadow: 'shadow-red-900/20', btn: 'bg-red-600 shadow-[4px_4px_0px_0px_rgba(153,27,27,1)]' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', accent: 'bg-orange-600', shadow: 'shadow-orange-900/20', btn: 'bg-orange-600 shadow-[4px_4px_0px_0px_rgba(154,52,18,1)]' },
        { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', accent: 'bg-yellow-600', shadow: 'shadow-yellow-900/20', btn: 'bg-yellow-600 shadow-[4px_4px_0px_0px_rgba(133,77,14,1)]' },
        { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', accent: 'bg-green-600', shadow: 'shadow-green-900/20', btn: 'bg-green-600 shadow-[4px_4px_0px_0px_rgba(22,101,52,1)]' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', accent: 'bg-blue-600', shadow: 'shadow-blue-900/20', btn: 'bg-blue-600 shadow-[4px_4px_0px_0px_rgba(30,64,175,1)]' },
        { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', accent: 'bg-indigo-600', shadow: 'shadow-indigo-900/20', btn: 'bg-indigo-600 shadow-[4px_4px_0px_0px_rgba(49,46,129,1)]' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', accent: 'bg-purple-600', shadow: 'shadow-purple-900/20', btn: 'bg-purple-600 shadow-[4px_4px_0px_0px_rgba(107,33,168,1)]' },
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

    const renderEventTable = (yearEvents: EventData[], color: any) => {
        const stats = calculateStats(yearEvents);
        
        return (
            <div className={`overflow-x-auto rounded-3xl border-2 ${color.border} bg-white shadow-inner mb-6`}>
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className={`${color.bg} border-b-2 ${color.border}`}>
                            {COLUMNS.map((col, idx) => (
                                <th 
                                    key={col.key} 
                                    className={`p-5 font-black ${color.text} text-[10px] uppercase tracking-widest cursor-pointer hover:bg-black/5 transition-colors group ${idx === 0 ? `sticky left-0 ${color.bg} z-20` : ''}`}
                                    onClick={() => handleSort(col.key as any)}
                                >
                                    <div className="flex items-center justify-center">
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 ml-2 opacity-30 group-hover:opacity-100" />
                                    </div>
                                </th>
                            ))}
                            <th className={`p-5 font-black ${color.text} text-[10px] uppercase tracking-widest text-center`}>{t('common.actions', '操作')}</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y-2 ${color.bg.replace('50', '100')}`}>
                        {yearEvents.map(event => (
                            <tr key={event.event_id} className="hover:bg-black/5 transition-colors group/row">
                                <td className={`p-5 font-black text-gray-900 text-center sticky left-0 bg-white group-hover/row:bg-gray-50 z-10`}>{event.event_date}</td>
                                <td className="p-5 font-bold text-gray-800 text-center">{event.event_title}</td>
                                <td className="p-5 font-bold text-gray-600 text-center">{event.organizer || '-'}</td>
                                <td className="p-5 font-bold text-gray-900 text-center">{event.attendance_total || 0}</td>
                                <td className="p-5 font-bold text-indigo-600 text-center">{event.attendance_bus || 0}</td>
                                <td className="p-5 font-bold text-green-600 text-center">{event.attendance_self || 0}</td>
                                <td className="p-5 font-bold text-orange-600 text-center">{event.attendance_retained || 0}</td>
                                <td className="p-5 font-black text-red-600 text-right">${(event.revenue_fare || 0).toLocaleString()}</td>
                                <td className="p-5 font-black text-red-600 text-right">${(event.expense_total || 0).toLocaleString()}</td>
                                <td className="p-5 font-black text-green-700 text-right">${(event.settlement_returned || 0).toLocaleString()}</td>
                                <td className="p-5 font-bold text-gray-900 text-center">{event.bus_total || 0}</td>
                                <td className="p-5 font-black text-red-600 text-right">${(event.bus_booking_fee || 0).toLocaleString()}</td>
                                <td className="p-5 font-black text-red-800 text-right">${(event.church_subsidy || 0).toLocaleString()}</td>
                                <td className="p-5 text-gray-600 text-sm italic truncate max-w-[150px]" title={event.event_notes}>{event.event_notes || '-'}</td>
                                <td className="p-5 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => { setEditingEvent(event); setIsModalOpen(true); }}
                                            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-all border-2 border-transparent hover:border-indigo-200"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(event.event_id)}
                                            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all border-2 border-transparent hover:border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {stats && (
                        <tfoot className={`border-t-4 ${color.border} ${color.bg}`}>
                            <tr className="font-black text-gray-900 text-sm uppercase">
                                <td className={`p-5 text-center sticky left-0 ${color.bg} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`} colSpan={3}>{t('common.total', '合計')} (Total)</td>
                                <td className="p-5 text-center">{Math.round(stats.totals.attendance_total)}</td>
                                <td className="p-5 text-center text-indigo-600">{Math.round(stats.totals.attendance_bus)}</td>
                                <td className="p-5 text-center text-green-600">{Math.round(stats.totals.attendance_self)}</td>
                                <td className="p-5 text-center text-orange-600">{Math.round(stats.totals.attendance_retained)}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.totals.revenue_fare).toLocaleString()}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.totals.expense_total).toLocaleString()}</td>
                                <td className="p-5 text-right text-green-700">${Math.round(stats.totals.settlement_returned).toLocaleString()}</td>
                                <td className="p-5 text-center">{Math.round(stats.totals.bus_total)}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.totals.bus_booking_fee).toLocaleString()}</td>
                                <td className="p-5 text-right text-red-800">${Math.round(stats.totals.church_subsidy).toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                            <tr className="font-black text-gray-600 text-sm uppercase">
                                <td className={`p-5 text-center sticky left-0 ${color.bg} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`} colSpan={3}>{t('common.average', '平均')} (Avg)</td>
                                <td className="p-5 text-center">{Math.round(stats.averages.attendance_total)}</td>
                                <td className="p-5 text-center text-indigo-600">{Math.round(stats.averages.attendance_bus)}</td>
                                <td className="p-5 text-center text-green-600">{Math.round(stats.averages.attendance_self)}</td>
                                <td className="p-5 text-center text-orange-600">{Math.round(stats.averages.attendance_retained)}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.averages.revenue_fare).toLocaleString()}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.averages.expense_total).toLocaleString()}</td>
                                <td className="p-5 text-right text-green-700">${Math.round(stats.averages.settlement_returned).toLocaleString()}</td>
                                <td className="p-5 text-center">{Math.round(stats.averages.bus_total)}</td>
                                <td className="p-5 text-right text-red-600">${Math.round(stats.averages.bus_booking_fee).toLocaleString()}</td>
                                <td className="p-5 text-right text-red-800">${Math.round(stats.averages.church_subsidy).toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
            {/* Title Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center">
                    <div className="w-3 h-10 bg-indigo-500 rounded-full mr-6 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('history.title', '歷史數據中心')} / <span className="text-indigo-500 text-lg">History Center</span></h2>
                        <p className="text-gray-500 font-bold mt-1">{t('history.subtitle', '管理並回顧過去所有的聖殿之旅記錄')}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={onRefresh}
                        className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-500 transition-all active:scale-95 border border-gray-100"
                    >
                        <RefreshCw className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-500 transition-all active:scale-95 border border-gray-100"
                    >
                        {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-12"
                    >
                        {eventsByYear.map((yearGroup, yearIndex) => {
                            const color = rainbowColors[yearIndex % rainbowColors.length];
                            return (
                                <div key={yearGroup.year} className={`${color.bg} border-2 ${color.border} rounded-[2.5rem] p-8 shadow-sm ${color.shadow}`}>
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center">
                                            <div className={`w-2 h-8 ${color.accent} rounded-full mr-4 shadow-md`} />
                                            <h3 className={`text-2xl font-black ${color.text}`}>{yearGroup.year} {t('common.year', '年')}</h3>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setEditingEvent({
                                                    event_id: `HIST-${Date.now()}`,
                                                    event_date: `${yearGroup.year}-01-01`,
                                                    event_title: '',
                                                    organizer: '',
                                                    attendance_total: 0,
                                                    attendance_bus: 0,
                                                    attendance_self: 0,
                                                    attendance_retained: 0,
                                                    revenue_fare: 0,
                                                    expense_total: 0,
                                                    settlement_returned: 0,
                                                    bus_total: 0,
                                                    bus_booking_fee: 0,
                                                    church_subsidy: 0,
                                                    event_notes: ''
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            className={`${color.btn} text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95`}
                                        >
                                            <Plus className="w-5 h-5 mr-2" /> {t('history.button.add_record', '新增記錄')}
                                        </button>
                                    </div>

                                    {renderEventTable(yearGroup.events, color)}

                                    {/* Mobile Card View */}
                                    <div className="lg:hidden space-y-4">
                                        {yearGroup.events.map(event => (
                                            <div key={event.event_id} className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm">
                                                <div className="flex justify-between items-start mb-6 border-b-2 border-gray-50 pb-4">
                                                    <div>
                                                        <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">{event.event_date}</span>
                                                        <h4 className="text-xl font-black text-gray-900 mt-1">{event.event_title}</h4>
                                                        <p className="text-sm font-bold text-gray-500 mt-1">{t('history.col.organizer', '主辦人')}: {event.organizer || '-'}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setEditingEvent(event); setIsModalOpen(true); }} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600"><Edit2 className="w-5 h-5"/></button>
                                                        <button onClick={() => handleDelete(event.event_id)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                    {COLUMNS.slice(3).map(col => (
                                                        <div key={col.key} className="flex flex-col">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{col.label}</span>
                                                            <span className={`text-sm font-black ${col.isMoney ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {col.isMoney ? `$${((event as any)[col.key] as number || 0).toLocaleString()}` : ((event as any)[col.key] || 0)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isModalOpen && editingEvent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b-4 border-gray-100 flex justify-between items-center bg-gray-50">
                                <div className="flex items-center">
                                    <div className="w-2 h-8 bg-indigo-500 rounded-full mr-4" />
                                    <h3 className="text-2xl font-black text-gray-900">{editingEvent.event_id?.startsWith('HIST-') ? t('history.title.add_history', '新增歷史記錄') : t('history.title.edit_history', '編輯歷史記錄')}</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 text-gray-500 rounded-2xl transition-all"><X className="w-6 h-6"/></button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Basic Info */}
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">{t('history.group.basic', '基本資訊')}</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">{t('history.col.event_date', '活動日期')}</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input 
                                                        type="date"
                                                        value={editingEvent.event_date}
                                                        onChange={e => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">{t('history.col.event_title', '活動標題')}</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input 
                                                        type="text"
                                                        value={editingEvent.event_title}
                                                        onChange={e => setEditingEvent({ ...editingEvent, event_title: e.target.value })}
                                                        placeholder={t('history.placeholder.title', '例如：2023年6月聖殿之旅')}
                                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">{t('history.col.organizer', '主辦人')}</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input 
                                                        type="text"
                                                        value={editingEvent.organizer}
                                                        onChange={e => setEditingEvent({ ...editingEvent, organizer: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Stats */}
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">{t('history.group.attendance', '出席統計')}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: 'attendance_total', label: t('history.col.attendance_total', '總人數'), icon: Users, color: 'text-gray-900' },
                                                { key: 'attendance_bus', label: t('history.col.attendance_bus', '搭車人數'), icon: Bus, color: 'text-indigo-600' },
                                                { key: 'attendance_self', label: t('history.col.attendance_self', '自理人數'), icon: Users, color: 'text-green-600' },
                                                { key: 'attendance_retained', label: t('history.col.attendance_retained', '留用人數'), icon: History, color: 'text-orange-600' }
                                            ].map(stat => (
                                                <div key={stat.key}>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{stat.label}</label>
                                                    <div className="relative">
                                                        <stat.icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${stat.color}`} />
                                                        <input 
                                                            type="number"
                                                            value={(editingEvent as any)[stat.key]}
                                                            onChange={e => setEditingEvent({ ...editingEvent, [stat.key]: parseInt(e.target.value) || 0 })}
                                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black focus:border-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Financial Stats */}
                                    <div className="md:col-span-2 space-y-6">
                                        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">{t('history.group.finance', '財務數據')}</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {[
                                                { key: 'revenue_fare', label: t('history.col.revenue_fare', '車資收入'), icon: DollarSign },
                                                { key: 'expense_total', label: t('history.col.expense_total', '費用支出'), icon: Wallet },
                                                { key: 'settlement_returned', label: t('history.col.settlement_returned', '結算繳回'), icon: Landmark },
                                                { key: 'bus_total', label: t('history.col.bus_total', '訂車總數'), icon: Bus, noMoney: true },
                                                { key: 'bus_booking_fee', label: t('history.col.bus_booking_fee', '訂車費用'), icon: DollarSign },
                                                { key: 'church_subsidy', label: t('history.col.church_subsidy', '教會補助'), icon: DollarSign }
                                            ].map(stat => (
                                                <div key={stat.key}>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{stat.label}</label>
                                                    <div className="relative">
                                                        <stat.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        {!stat.noMoney && <span className="absolute left-8 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>}
                                                        <input 
                                                            type="number"
                                                            value={(editingEvent as any)[stat.key]}
                                                            onChange={e => setEditingEvent({ ...editingEvent, [stat.key]: parseInt(e.target.value) || 0 })}
                                                            className={`w-full ${stat.noMoney ? 'pl-10' : 'pl-12'} pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black focus:border-indigo-500 outline-none`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">{t('history.col.event_notes', '活動備註')}</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                            <textarea 
                                                value={editingEvent.event_notes || ''}
                                                onChange={e => setEditingEvent({ ...editingEvent, event_notes: e.target.value })}
                                                rows={3}
                                                placeholder={t('history.placeholder.notes', '輸入活動備註或補充說明...')}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 border-t-4 border-white flex justify-end gap-4">
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-4 bg-white text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all border-2 border-gray-100"
                                >
                                    {t('common.cancel', '取消')}
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(49,46,129,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center"
                                >
                                    <Save className="w-5 h-5 mr-2" /> {t('common.save_record', '儲存記錄')}
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
