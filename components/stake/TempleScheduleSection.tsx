import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, RoutePlanItem } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { Clock, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';

interface TempleScheduleSectionProps {
    currentEvent: EventData;
    onUpdateEvent: (event: EventData) => void;
}

// Helper: Add minutes to HH:mm
const addMinutes = (timeStr: string, minutes: number | string): string => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m + (parseInt(String(minutes)) || 0));
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const TempleScheduleSection: React.FC<TempleScheduleSectionProps> = ({ currentEvent, onUpdateEvent }) => {
    const { t } = useTranslation();
    const config = currentEvent.templeConfig || { title: '', startTime: '', endTime: '', items: [], isPublished: false };
    const [deleteTargetIdx, setDeleteTargetIdx] = useState<number | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const updateConfig = (newConfig: any) => {
        const updated = { ...currentEvent, templeConfig: newConfig };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleFieldUpdate = (field: string, value: string) => {
        updateConfig({ ...config, [field]: value });
    };

    const togglePublish = () => {
        updateConfig({ ...config, isPublished: !config.isPublished });
    };

    const handleItemUpdate = (idx: number, field: string, value: string) => {
        const newItems = [...(config.items || [])];
        newItems[idx] = { ...newItems[idx], [field]: value };

        // Auto Calc: If arrivalTime or stay changes -> Update departureTime
        if (field === 'arrivalTime' || field === 'stay') {
            const start = newItems[idx].arrivalTime;
            const stay = newItems[idx].stay || '0';
            if (start) {
                newItems[idx].departureTime = addMinutes(start, stay);
            }
        }
        updateConfig({ ...config, items: newItems });
    };

    const handleAddItem = () => {
        const newItem: RoutePlanItem = {
            arrivalTime: '', stay: '0', departureTime: '', stopCode: '', duration: '0', location: '', address: '', mapUrl: ''
        };
        updateConfig({ ...config, items: [...(config.items || []), newItem] });
    };

    const executeDelete = () => {
        if (deleteTargetIdx === null) return;
        const newItems = [...(config.items || [])];
        newItems.splice(deleteTargetIdx, 1);
        updateConfig({ ...config, items: newItems });
        setDeleteTargetIdx(null);
    };

    const handleMoveItem = (idx: number, direction: 'up' | 'down') => {
        const newItems = [...(config.items || [])];
        if (direction === 'up') {
            if (idx === 0) return;
            [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
        } else {
            if (idx === newItems.length - 1) return;
            [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
        }
        updateConfig({ ...config, items: newItems });
    };

    // Theme: Red
    const theme = {
        border: 'border-red-500',
        bg: 'bg-red-50',
        headBg: 'bg-red-100',
        text: 'text-red-900',
        inputBg: 'bg-white/50 focus:ring-red-900 text-red-900',
    };

    return (
        <>
            <ConfirmDialog 
                isOpen={deleteTargetIdx !== null}
                title={t('temple.msg.delete_node_title', '刪除節點')}
                message={t('temple.msg.delete_node_confirm', '確定要刪除此教儀時間節點嗎？')}
                onConfirm={executeDelete}
                onCancel={() => setDeleteTargetIdx(null)}
                isDangerous={true}
            />

            <div className={`${theme.bg} rounded-lg shadow-sm border ${theme.border} overflow-hidden mb-6`}>
                <div className={`p-0 border-b ${theme.border} ${theme.headBg}`}>
                    <div 
                        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-black/5 transition-colors border-b border-red-200"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <h4 className={`font-bold ${theme.text} text-lg flex items-center`}>
                            <Clock className="w-5 h-5 mr-2" /> {t('ordinance_seat', '教儀安排')}
                        </h4>
                        <div className={theme.text}>
                            {isCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                        </div>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="px-4 py-3 flex items-center justify-end gap-4 bg-red-100/50">
                            <button 
                                onClick={togglePublish}
                                className={`flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-colors border border-red-900 ${config.isPublished ? 'bg-green-600 text-white shadow-md' : 'bg-gray-300 text-gray-700'}`}
                            >
                                {config.isPublished ? <><Eye className="w-4 h-4 mr-1" /> {t('common.published', '已公佈')} (ON)</> : <><EyeOff className="w-4 h-4 mr-1" /> {t('common.unpublished', '未公佈')} (OFF)</>}
                            </button>
                        </div>
                    )}
                </div>
                
                {!isCollapsed && (
                    <div className="p-4 grid gap-4">
                        {/* Config Fields */}
                        <div className="flex flex-col md:flex-row gap-2 items-end">
                            <div className="flex-1 w-full">
                                <label className={`text-xs font-bold ${theme.text} uppercase block mb-1`}>{t('common.label.title', '標題')}</label>
                                <input 
                                    className={`w-full border ${theme.border} rounded p-2 text-sm focus:ring-2 focus:ring-red-900 outline-none bg-white ${theme.text} font-bold`}
                                    value={config.title}
                                    onChange={e => handleFieldUpdate('title', e.target.value)}
                                    placeholder={t('temple.form.title_placeholder', '例如: 台北聖殿教儀時間')}
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className={`border ${theme.border} rounded-lg overflow-x-auto shadow-sm`}>
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className={`border-b ${theme.border} font-bold ${theme.text} ${theme.headBg}`}>
                                    <tr>
                                        <th className={`p-2 w-10 text-center ${theme.border} border-r`}>{t('common.col.sort', '排序')}</th>
                                        <th className={`p-2 w-24 sticky left-0 z-20 ${theme.headBg} ${theme.border} border-r shadow-[1px_0_0_0_rgba(0,0,0,0.1)]`}>{t('common.col.session', '場次')}</th>
                                        <th className={`p-2 w-16 text-center ${theme.border} border-r`}>{t('common.col.duration', '需時')}</th>
                                        <th className={`p-2 min-w-[150px] ${theme.border} border-r`}>{t('common.col.note', '備註')}</th>
                                        <th className="p-2 w-10 text-center">{t('common.col.action', '操作')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-300 font-sans">
                                    {config.items?.map((item, idx) => {
                                        const rowBg = idx % 2 !== 0 ? 'bg-red-50' : 'bg-white';
                                        return (
                                        <tr key={idx} className={`${rowBg} hover:opacity-100`}>
                                            <td className={`p-1 text-center ${theme.border} border-r bg-gray-100/50`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <button onClick={() => handleMoveItem(idx, 'up')} className="text-red-800 hover:text-red-900"><ChevronUp className="w-3 h-3"/></button>
                                                    <button onClick={() => handleMoveItem(idx, 'down')} className="text-red-800 hover:text-red-900"><ChevronDown className="w-3 h-3"/></button>
                                                </div>
                                            </td>
                                            <td className={`p-1 sticky left-0 z-10 ${rowBg} ${theme.border} border-r shadow-[1px_0_0_0_rgba(0,0,0,0.1)]`}>
                                                <input className={`w-full border ${theme.border} rounded p-1 ${theme.inputBg} text-center text-sm font-bold`} value={item.stopCode || ''} onChange={e => handleItemUpdate(idx, 'stopCode', e.target.value)} placeholder={t('common.col.session', '場次')} />
                                            </td>
                                            <td className={`p-1 ${theme.border} border-r`}>
                                                <input className={`w-full border ${theme.border} rounded p-1 ${theme.inputBg} text-center text-sm`} value={item.stay} onChange={e => handleItemUpdate(idx, 'stay', e.target.value)} placeholder={t('common.label.minutes', '分')} />
                                            </td>
                                            <td className={`p-1 ${theme.border} border-r`}>
                                                <input className={`w-full border ${theme.border} rounded p-1 ${theme.inputBg} text-sm`} value={item.address || ''} onChange={e => handleItemUpdate(idx, 'address', e.target.value)} placeholder={t('common.col.note', '備註')} />
                                            </td>
                                            <td className="p-1 text-center bg-gray-100/50">
                                                <button onClick={() => setDeleteTargetIdx(idx)} className="text-red-700 hover:text-red-900"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <button 
                                onClick={handleAddItem}
                                className={`w-full py-2 ${theme.headBg} ${theme.text} hover:bg-red-200 text-xs font-bold border-t ${theme.border} flex justify-center items-center`}
                            >
                                <Plus className="w-3 h-3 mr-1" /> {t('temple.button.add_time_node', '新增時間節點')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TempleScheduleSection;
