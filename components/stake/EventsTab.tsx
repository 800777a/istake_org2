
import React, { useState, useMemo } from 'react';
import { EventData } from '../../types';
import { createEvent, closeEvent, updateEvent, reopenEvent } from '../../services/sheetService';
import { Calendar, Plus, Archive, FileBarChart, AlertCircle, Edit2, Check, X, CreditCard, ArrowUpDown, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import FinalReportModal from '../FinalReportModal';
import { useI18n } from '../../src/contexts/LanguageContext';

interface EventsTabProps {
    events: EventData[];
    currentEvent: EventData | null;
    onRefresh: () => void;
    onSetActive: (eventId: string) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, currentEvent, onRefresh, onSetActive }) => {
    const { t, tString } = useI18n();
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState(t('stake.events.default_title', '聖殿旅行團'));
    const [newEventOrganizer, setNewEventOrganizer] = useState('');
    const [showReportModal, setShowReportModal] = useState<EventData | null>(null);
    
    // Confirm Dialog State
    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDangerous: false
    });
    
    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editOrganizer, setEditOrganizer] = useState('');

    const [sortConfig, setSortConfig] = useState<{ key: keyof EventData, direction: 'asc' | 'desc' } | null>(null);

    const SortIcon = ({ column }: { column: keyof EventData }) => {
        if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const handleSort = (key: keyof EventData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedEvents = useMemo(() => {
        let items = [...events];
        if (sortConfig) {
            items.sort((a, b) => {
                const valA = (a[sortConfig.key] || '').toString();
                const valB = (b[sortConfig.key] || '').toString();
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
        }
        return items;
    }, [events, sortConfig]);

    const handleCreateEvent = async () => {
        if (!newEventDate) return;
        await createEvent(newEventDate, newEventTitle, newEventOrganizer);
        setNewEventDate('');
        setNewEventTitle(t('stake.events.default_title', '聖殿旅行團'));
        setNewEventOrganizer('');
        onRefresh();
    };

    const startEditing = (event: EventData) => {
        setEditingId(event.event_id);
        setEditDate(event.event_date);
        setEditTitle(event.event_title || t('stake.events.default_title', '聖殿旅行團'));
        setEditOrganizer(event.organizer || '');
    };

    const saveEditing = async () => {
        if (!editingId) return;
        const targetEvent = events.find(e => e.event_id === editingId);
        if (targetEvent) {
            const updated = { 
                ...targetEvent, 
                event_date: editDate,
                event_title: editTitle,
                organizer: editOrganizer
            };
            await updateEvent(updated);
            onRefresh();
        }
        setEditingId(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditDate('');
        setEditTitle('');
    };

    const handleStatusChange = async (event: EventData, newValue: string) => {
        // V162: Decoupled Logic. Status only controls text, not registration open/close.
        let newStatus = event.status;
        
        // Map UI values to internal status
        switch (newValue) {
            case 'planning':
                newStatus = 'planning'; // "報名當中" (Text only)
                break;
            case 'confirmed':
                newStatus = 'confirmed'; // "活動成行" (Text only)
                break;
            case 'cancelled':
                newStatus = 'cancelled';
                break;
            default:
                return;
        }

        // Only update status, preserve is_registration_open
        const updated = { ...event, status: newStatus };
        await updateEvent(updated);
        onRefresh();
    };

    const handleCloseEvent = (eventId: string) => {
        setConfirmAction({
            isOpen: true,
            title: t('stake.events.close_confirm_title', '結案確認'),
            message: t('stake.events.close_confirm_msg', '確定要結案此活動嗎？結案後將產生報表且無法再更動資料。'),
            onConfirm: async () => {
                await closeEvent(eventId);
                setConfirmAction({ ...confirmAction, isOpen: false });
                onRefresh();
            },
            isDangerous: true
        });
    };

    const handleReopenEvent = (eventId: string) => {
        setConfirmAction({
            isOpen: true,
            title: t('stake.events.reopen_confirm_title', '還原確認'),
            message: t('stake.events.reopen_confirm_msg', '確定要還原此活動嗎？還原後活動將重新開放資料。'),
            onConfirm: async () => {
                await reopenEvent(eventId);
                setConfirmAction({ ...confirmAction, isOpen: false });
                onRefresh();
            },
            isDangerous: false
        });
    };

    // Helper to map current status to select value
    const getStatusValue = (event: EventData) => {
        if (event.status === 'cancelled') return 'cancelled';
        if (event.status === 'confirmed') return 'confirmed';
        return 'planning'; // Default
    };

    return (
        <div id="events-tab-container" className="space-y-6">
            {/* Create Event Section - Modern Business Style */}
            <div id="create-event-form" className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100 animate-fade-in mb-8">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-900 flex items-center mb-6">
                        <Calendar className="w-6 h-6 mr-3 text-blue-600" /> {t('stake.events.title', '活動建立')}
                    </h3>
                    <div className="flex flex-wrap gap-6 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{t('stake.events.new_date', '新活動日期')}</label>
                            <input 
                                id="new-event-date-input"
                                type="date" 
                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-slate-50 text-slate-900 transition-all"
                                value={newEventDate}
                                onChange={(e) => setNewEventDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-[2] min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{t('stake.events.new_name', '新活動名稱')}</label>
                            <input 
                                id="new-event-title-input"
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-slate-50 text-slate-900 transition-all"
                                value={newEventTitle}
                                onChange={(e) => setNewEventTitle(e.target.value)}
                                placeholder={t('stake.events.title_placeholder', "例如：聖殿旅行團")}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{t('stake.events.organizer', '主辦人')}</label>
                            <input 
                                id="new-event-organizer-input"
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-slate-50 text-slate-900 transition-all"
                                value={newEventOrganizer}
                                onChange={(e) => setNewEventOrganizer(e.target.value)}
                                placeholder={t('stake.events.organizer_placeholder', "主辦人姓名")}
                            />
                        </div>
                        <button 
                            id="create-event-btn"
                            onClick={handleCreateEvent}
                            disabled={!newEventDate}
                            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm shadow-lg shadow-blue-100 transition-all h-[44px] active:scale-95"
                        >
                            <Plus className="w-5 h-5 mr-2" /> {t('stake.events.create_button', '建立活動')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Event List - Enterprise Table */}
            <div id="events-list-container" className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-indigo-100 bg-indigo-900">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <Archive className="w-5 h-5 mr-3 text-indigo-300" /> {t('stake.events.list_title', '活動列表')}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th id="th-event-date" className="p-5 whitespace-nowrap sticky left-0 z-20 bg-slate-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] w-44 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('event_date')}>
                                    <div className="flex items-center text-[10px] uppercase tracking-widest">{t('stake.events.col_date', '活動日期')} <SortIcon column="event_date" /></div>
                                </th>
                                <th id="th-event-title" className="p-5 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('event_title')}>
                                    <div className="flex items-center text-[10px] uppercase tracking-widest">{t('stake.events.col_name', '活動名稱')} <SortIcon column="event_title" /></div>
                                </th>
                                <th id="th-organizer" className="p-5 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('organizer')}>
                                    <div className="flex items-center text-[10px] uppercase tracking-widest">{t('stake.events.col_organizer', '主辦人')} <SortIcon column="organizer" /></div>
                                </th>
                                <th id="th-status" className="p-5 whitespace-nowrap w-52 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                                    <div className="flex items-center text-[10px] uppercase tracking-widest">{t('stake.events.col_status', '活動狀態')} <SortIcon column="status" /></div>
                                </th>
                                <th id="th-actions" className="p-5 text-right whitespace-nowrap text-[10px] uppercase tracking-widest">{t('stake.events.col_actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedEvents.map(event => {
                                const isCurrent = currentEvent?.event_id === event.event_id;
                                const statusValue = getStatusValue(event);
                                const isEditingThis = editingId === event.event_id;

                                return (
                                    <tr key={event.event_id} className={`hover:bg-slate-50/50 transition-colors ${isCurrent ? 'bg-sky-50/30' : ''}`}>
                                        <td className={`p-4 font-medium text-slate-800 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${isCurrent ? 'bg-sky-50/30' : 'bg-white'}`}>
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-date-${event.event_id}`}
                                                    type="date" 
                                                    className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-sky-500"
                                                    value={editDate}
                                                    onChange={e => setEditDate(e.target.value)}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {event.event_date}
                                                    {isCurrent && (
                                                        <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                            {t('stake.events.current_badge', '當前')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-title-${event.event_id}`}
                                                    type="text" 
                                                    className="border border-slate-200 rounded px-2 py-1 text-xs w-full outline-none focus:border-sky-500"
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-semibold text-slate-900">{event.event_title || t('stake.events.default_title', '聖殿旅行團')}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-organizer-${event.event_id}`}
                                                    type="text" 
                                                    className="border border-slate-200 rounded px-2 py-1 text-xs w-full outline-none focus:border-sky-500"
                                                    value={editOrganizer}
                                                    onChange={e => setEditOrganizer(e.target.value)}
                                                    placeholder={t('stake.events.organizer', "主辦人")}
                                                />
                                            ) : (
                                                <span className="text-slate-600">{event.organizer || '-'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 whitespace-nowrap align-middle">
                                            {event.status === 'completed' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        <Archive className="w-3 h-3 mr-1"/> {t('stake.events.status_completed', '已結案')}
                                                    </span>
                                                    <button 
                                                        id={`reopen-btn-${event.event_id}`}
                                                        onClick={(e) => { e.stopPropagation(); handleReopenEvent(event.event_id); }}
                                                        className="text-emerald-600 hover:text-emerald-700 p-1 rounded-full hover:bg-emerald-50 transition-colors"
                                                        title={t('stake.events.reopen_button', '還原')}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative inline-block w-full">
                                                    <select 
                                                        id={`status-select-${event.event_id}`}
                                                        value={statusValue}
                                                        onChange={(e) => handleStatusChange(event, e.target.value)}
                                                        className={`
                                                            w-full appearance-none border rounded-md px-3 py-1.5 pr-8 font-black text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer
                                                            ${statusValue === 'planning' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                            ${statusValue === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                            ${statusValue === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                        `}
                                                    >
                                                        <option value="planning">{tString('stake.events.status_planning', { forceString: true, defaultValue: '規劃中' })}</option>
                                                        <option value="confirmed">{tString('stake.events.status_confirmed', { forceString: true, defaultValue: '活動成行' })}</option>
                                                        <option value="cancelled">{tString('stake.events.status_cancelled', { forceString: true, defaultValue: '已取消' })}</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                                        <ChevronDown size={14} />
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                            {isEditingThis ? (
                                                <div className="flex gap-1 justify-end">
                                                    <button id={`save-edit-btn-${event.event_id}`} onClick={saveEditing} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Check className="w-4 h-4"/></button>
                                                    <button id={`cancel-edit-btn-${event.event_id}`} onClick={cancelEditing} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"><X className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        id={`edit-btn-${event.event_id}`}
                                                        onClick={() => startEditing(event)}
                                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                                                        title={t('common.edit', '編輯')}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {!isCurrent && event.status !== 'completed' && (
                                                        <button 
                                                            id={`set-active-btn-${event.event_id}`}
                                                            onClick={() => onSetActive(event.event_id)}
                                                            className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-200"
                                                        >
                                                            {t('stake.events.set_active_button', '設為當前')}
                                                        </button>
                                                    )}
                                                    {event.status === 'completed' ? (
                                                        <button 
                                                            id={`view-report-btn-${event.event_id}`}
                                                            onClick={() => setShowReportModal(event)}
                                                            className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors border border-sky-200 flex items-center gap-1.5"
                                                        >
                                                            <FileBarChart className="w-3.5 h-3.5" /> {t('stake.events.view_report_button', '查看報表')}
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            id={`close-btn-${event.event_id}`}
                                                            onClick={() => handleCloseEvent(event.event_id)}
                                                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 flex items-center gap-1.5"
                                                        >
                                                            <Archive className="w-3.5 h-3.5" /> {t('stake.events.close_button', '結案')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">{t('stake.events.empty_state', '尚無活動資料')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showReportModal && (
                <FinalReportModal 
                    event={showReportModal} 
                    onClose={() => setShowReportModal(null)} 
                />
            )}

            <ConfirmDialog 
                isOpen={confirmAction.isOpen}
                title={confirmAction.title}
                message={confirmAction.message}
                onConfirm={confirmAction.onConfirm}
                onCancel={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                isDangerous={confirmAction.isDangerous}
                confirmText={confirmAction.isDangerous ? t('stake.events.close_confirm_btn', "確定結案") : t('stake.events.reopen_confirm_btn', "確定還原")}
            />
        </div>
    );
};

export default EventsTab;
