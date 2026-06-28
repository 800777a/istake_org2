
import React, { useState, useMemo } from 'react';
import { EventData } from '../../types';
import { createEvent, closeEvent, updateEvent, reopenEvent } from '../../services/sheetService';
import { Calendar, Plus, Archive, FileBarChart, AlertCircle, Edit2, Check, X, CreditCard, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import FinalReportModal from '../FinalReportModal';
import { useTranslation } from 'react-i18next';

interface EventsTabProps {
    events: EventData[];
    currentEvent: EventData | null;
    onRefresh: () => void;
    onSetActive: (eventId: string) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, currentEvent, onRefresh, onSetActive }) => {
    const { t } = useTranslation();
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState(t('stake.events.default_title', '聖殿之旅'));
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
        setNewEventTitle(t('stake.events.default_title', '聖殿之旅'));
        setNewEventOrganizer('');
        onRefresh();
    };

    const startEditing = (event: EventData) => {
        setEditingId(event.event_id);
        setEditDate(event.event_date);
        setEditTitle(event.event_title || t('stake.events.default_title', '聖殿之旅'));
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
            {/* Create Event Section - Red Theme */}
            <div id="create-event-form" className="bg-red-50 p-6 rounded-2xl shadow-sm border-2 border-red-200 animate-fade-in mb-8">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-red-900 flex items-center mb-4">
                        <Calendar className="w-6 h-6 mr-3" /> {t('stake.events.title', '活動設定')}
                    </h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-black text-red-800 mb-2 uppercase opacity-70">{t('stake.events.new_date', '新活動日期')}</label>
                            <input 
                                id="new-event-date-input"
                                type="date" 
                                className="w-full border-2 border-red-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-300 outline-none bg-white text-gray-900 shadow-sm"
                                value={newEventDate}
                                onChange={(e) => setNewEventDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-[2] min-w-[200px]">
                            <label className="block text-xs font-black text-red-800 mb-2 uppercase opacity-70">{t('stake.events.new_name', '新活動名稱')}</label>
                            <input 
                                id="new-event-title-input"
                                type="text" 
                                className="w-full border-2 border-red-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-300 outline-none bg-white text-gray-900 shadow-sm"
                                value={newEventTitle}
                                onChange={(e) => setNewEventTitle(e.target.value)}
                                placeholder={t('stake.events.title_placeholder', "例如：聖殿之旅")}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-black text-red-800 mb-2 uppercase opacity-70">{t('stake.events.organizer', '主辦人')}</label>
                            <input 
                                id="new-event-organizer-input"
                                type="text" 
                                className="w-full border-2 border-red-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-300 outline-none bg-white text-gray-900 shadow-sm"
                                value={newEventOrganizer}
                                onChange={(e) => setNewEventOrganizer(e.target.value)}
                                placeholder={t('stake.events.organizer_placeholder', "主辦人姓名")}
                            />
                        </div>
                        <button 
                            id="create-event-btn"
                            onClick={handleCreateEvent}
                            disabled={!newEventDate}
                            className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-black hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none h-[52px]"
                        >
                            <Plus className="w-5 h-5 mr-2" /> {t('stake.events.create_button', '建立活動')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Event List - Orange Header */}
            <div id="events-list-container" className="bg-orange-50 rounded-2xl shadow-sm border-2 border-orange-200 overflow-hidden animate-fade-in">
                <div className="p-6 border-b-2 border-orange-200 bg-orange-100">
                    <h3 className="text-xl font-black text-orange-900 flex items-center">
                        <Archive className="w-6 h-6 mr-3" /> {t('stake.events.list_title', '活動列表')}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-red-50 text-red-900 font-bold border-b-2 border-red-100">
                            <tr>
                                <th id="th-event-date" className="p-4 whitespace-nowrap sticky left-0 z-20 bg-red-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-40 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => handleSort('event_date')}>
                                    <div className="flex items-center">{t('stake.events.col_date', '活動日期')} <SortIcon column="event_date" /></div>
                                </th>
                                <th id="th-event-title" className="p-4 whitespace-nowrap cursor-pointer hover:bg-red-100 transition-colors" onClick={() => handleSort('event_title')}>
                                    <div className="flex items-center">{t('stake.events.col_name', '活動名稱')} <SortIcon column="event_title" /></div>
                                </th>
                                <th id="th-organizer" className="p-4 whitespace-nowrap cursor-pointer hover:bg-red-100 transition-colors" onClick={() => handleSort('organizer')}>
                                    <div className="flex items-center">{t('stake.events.col_organizer', '主辦人')} <SortIcon column="organizer" /></div>
                                </th>
                                <th id="th-status" className="p-4 whitespace-nowrap w-40 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => handleSort('status')}>
                                    <div className="flex items-center">{t('stake.events.col_status', '活動狀態')} <SortIcon column="status" /></div>
                                </th>
                                <th id="th-actions" className="p-4 text-right whitespace-nowrap">{t('stake.events.col_actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sortedEvents.map(event => {
                                const isCurrent = currentEvent?.event_id === event.event_id;
                                const statusValue = getStatusValue(event);
                                const isEditingThis = editingId === event.event_id;

                                return (
                                    <tr key={event.event_id} className={`hover:bg-red-50/20 transition-colors ${isCurrent ? 'bg-red-50/50' : ''}`}>
                                        <td className={`p-4 font-bold text-gray-800 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] ${isCurrent ? 'bg-red-50' : 'bg-white'}`}>
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-date-${event.event_id}`}
                                                    type="date" 
                                                    className="border rounded px-2 py-1 text-xs"
                                                    value={editDate}
                                                    onChange={e => setEditDate(e.target.value)}
                                                />
                                            ) : (
                                                <div className="flex items-center">
                                                    {event.event_date}
                                                    {isCurrent && <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm">{t('stake.events.current_badge', '當前')}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-title-${event.event_id}`}
                                                    type="text" 
                                                    className="border rounded px-2 py-1 text-xs w-full"
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-bold text-gray-800">{event.event_title || t('stake.events.default_title', '聖殿之旅')}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditingThis ? (
                                                <input 
                                                    id={`edit-organizer-${event.event_id}`}
                                                    type="text" 
                                                    className="border rounded px-2 py-1 text-xs w-full"
                                                    value={editOrganizer}
                                                    onChange={e => setEditOrganizer(e.target.value)}
                                                    placeholder={t('stake.events.organizer', "主辦人")}
                                                />
                                            ) : (
                                                <span className="text-gray-600 font-bold">{event.organizer || '-'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 whitespace-nowrap align-middle">
                                            {event.status === 'completed' ? (
                                                <div className="flex gap-2">
                                                    <span className="flex items-center text-gray-500 font-bold px-3 py-2 bg-gray-100 rounded-lg w-fit">
                                                        <Archive className="w-4 h-4 mr-2"/> {t('stake.events.status_completed', '已結案')}
                                                    </span>
                                                    <button 
                                                        id={`reopen-btn-${event.event_id}`}
                                                        onClick={(e) => { e.stopPropagation(); handleReopenEvent(event.event_id); }}
                                                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center relative z-50"
                                                    >
                                                        <Check className="w-3 h-3 mr-1" /> {t('stake.events.reopen_button', '還原')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <select 
                                                        id={`status-select-${event.event_id}`}
                                                        value={statusValue}
                                                        onChange={(e) => handleStatusChange(event, e.target.value)}
                                                        className={`
                                                            appearance-none border rounded-lg px-3 py-2 pr-8 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer
                                                            ${statusValue === 'planning' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                            ${statusValue === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                                            ${statusValue === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                                        `}
                                                    >
                                                        <option value="planning">{t('stake.events.status_planning', '報名當中')}</option>
                                                        <option value="confirmed">{t('stake.events.status_confirmed', '活動成行')}</option>
                                                        <option value="cancelled">{t('stake.events.status_cancelled', '活動取消')}</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2 whitespace-nowrap align-top">
                                            {isEditingThis ? (
                                                <div className="flex gap-1 justify-end">
                                                    <button id={`save-edit-btn-${event.event_id}`} onClick={saveEditing} className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200"><Check className="w-4 h-4"/></button>
                                                    <button id={`cancel-edit-btn-${event.event_id}`} onClick={cancelEditing} className="bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200"><X className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button 
                                                        id={`edit-btn-${event.event_id}`}
                                                        onClick={() => startEditing(event)}
                                                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold transition-colors inline-flex items-center"
                                                    >
                                                        <Edit2 className="w-3 h-3 mr-1" /> {t('common.edit', '編輯')}
                                                    </button>
                                                    {!isCurrent && event.status !== 'completed' && (
                                                        <button 
                                                            id={`set-active-btn-${event.event_id}`}
                                                            onClick={() => onSetActive(event.event_id)}
                                                            className="text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                        >
                                                            {t('stake.events.set_active_button', '設為當前')}
                                                        </button>
                                                    )}
                                                    {event.status === 'completed' ? (
                                                        <button 
                                                            id={`view-report-btn-${event.event_id}`}
                                                            onClick={() => setShowReportModal(event)}
                                                            className="text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center inline-flex"
                                                        >
                                                            <FileBarChart className="w-3 h-3 mr-1" /> {t('stake.events.view_report_button', '查看報表')}
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            id={`close-btn-${event.event_id}`}
                                                            onClick={() => handleCloseEvent(event.event_id)}
                                                            className="text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center inline-flex"
                                                        >
                                                            <Archive className="w-3 h-3 mr-1" /> {t('stake.events.close_button', '結案')}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        {t('stake.events.empty_state', '尚無活動資料')}
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
