import React, { useState } from 'react';
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
                title="刪除節點"
                message="確定要刪除此教儀時間節點嗎？"
                onConfirm={executeDelete}
                onCancel={() => setDeleteTargetIdx(null)}
                isDangerous={true}
            />

            <div className="rounded-lg border border-indigo-200 shadow-sm overflow-hidden mb-12 animate-fade-in transition-all bg-white/60 backdrop-blur-sm">
                <div 
                    className="w-full px-6 py-4 bg-indigo-900 flex justify-between items-center cursor-pointer hover:bg-indigo-950 transition-all border-b border-indigo-800"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded-lg border border-white/20 shadow-inner">
                            <Clock className="text-blue-300" size={20} />
                        </div>
                        <h4 className="font-bold text-base md:text-lg text-white tracking-tight">聖殿教儀時間安排 (TEMPLE ORDINANCE SCHEDULE)</h4>
                    </div>
                    <div className="text-white opacity-60">
                        {isCollapsed ? <ChevronDown size={22}/> : <ChevronUp size={22}/>}
                    </div>
                </div>
                
                {!isCollapsed && (
                    <div className="p-6 flex flex-col gap-6 bg-white/40">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 p-4 rounded-lg border border-indigo-100 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 shadow-sm">
                                    {config.items?.length || 0} SESSIONS CONFIGURED
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-end items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(config.items || [], null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `temple_schedule_${currentEvent.event_date}.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="h-10 px-5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-sm font-bold hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} /> 匯出資料
                                </button>
                                <div className="flex items-center gap-3 bg-white px-5 h-10 rounded-lg border border-indigo-200 shadow-sm">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">公開發佈</span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePublish();
                                        }}
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${config.isPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <span
                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${config.isPublished ? 'translate-x-5.5' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-lg shadow-sm border border-indigo-100 overflow-hidden bg-white/60">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-indigo-50 font-bold text-indigo-900 border-b border-indigo-100">
                                            <th className="p-4 w-16 text-center border-r border-indigo-100 uppercase tracking-wider text-[11px]">排序</th>
                                            <th className="p-4 w-40 border-r border-indigo-100 uppercase tracking-wider text-[11px]">場次/類別</th>
                                            <th className="p-4 w-32 text-center border-r border-indigo-100 uppercase tracking-wider text-[11px]">開始時間</th>
                                            <th className="p-4 w-32 text-center border-r border-indigo-100 uppercase tracking-wider text-[11px]">結束時間</th>
                                            <th className="p-4 w-28 text-center border-r border-indigo-100 uppercase tracking-wider text-[11px]">需時(分)</th>
                                            <th className="p-4 min-w-[200px] uppercase tracking-wider text-[11px]">詳細備註</th>
                                            <th className="p-4 w-16 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50">
                                        {config.items?.map((item, idx) => {
                                            return (
                                            <tr key={idx} className={`bg-transparent hover:bg-white/60 transition-colors group`}>
                                                <td className="p-2 text-center border-r border-indigo-50 bg-white/20">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <button onClick={() => handleMoveItem(idx, 'up')} className="text-indigo-300 hover:text-indigo-600 transition-all"><ChevronUp size={14}/></button>
                                                        <button onClick={() => handleMoveItem(idx, 'down')} className="text-indigo-300 hover:text-indigo-600 transition-all"><ChevronDown size={14}/></button>
                                                    </div>
                                                </td>
                                                <td className="p-2 border-r border-indigo-50">
                                                    <input className="w-full bg-white/60 border border-indigo-100 rounded-lg px-3 py-2 text-center font-bold text-indigo-700 focus:bg-white outline-none transition-all shadow-sm text-sm" value={item.stopCode || ''} onChange={e => handleItemUpdate(idx, 'stopCode', e.target.value)} placeholder="如：洗禮" />
                                                </td>
                                                <td className="p-2 border-r border-indigo-50">
                                                    <input className="w-full bg-white/60 border border-indigo-100 rounded-lg px-2 py-2 text-center font-bold text-slate-900 focus:bg-white outline-none transition-all shadow-sm text-base" value={item.arrivalTime} onChange={e => handleItemUpdate(idx, 'arrivalTime', e.target.value)} placeholder="00:00" />
                                                </td>
                                                <td className="p-2 border-r border-indigo-50">
                                                    <input className="w-full bg-white/60 border border-indigo-100 rounded-lg px-2 py-2 text-center font-bold text-emerald-600 focus:bg-white outline-none transition-all shadow-sm text-base" value={item.departureTime} onChange={e => handleItemUpdate(idx, 'departureTime', e.target.value)} placeholder="00:00" />
                                                </td>
                                                <td className="p-2 border-r border-indigo-50">
                                                    <input className="w-full bg-indigo-50/50 border border-indigo-100 rounded-lg px-2 py-2 text-center font-bold text-indigo-900 focus:bg-white outline-none transition-all shadow-sm" value={item.stay} onChange={e => handleItemUpdate(idx, 'stay', e.target.value)} placeholder="分" />
                                                </td>
                                                <td className="p-2">
                                                    <input className="w-full bg-white/60 border border-indigo-100 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 focus:bg-white outline-none transition-all shadow-sm" value={item.address || ''} onChange={e => handleItemUpdate(idx, 'address', e.target.value)} placeholder="請輸入相關事項..." />
                                                </td>
                                                <td className="p-2 text-right">
                                                    <button onClick={() => setDeleteTargetIdx(idx)} className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <button 
                                onClick={handleAddItem}
                                className="w-full h-12 bg-white/80 text-indigo-900 hover:bg-indigo-900 hover:text-white text-sm font-bold border-t border-indigo-100 flex justify-center items-center transition-all gap-2"
                            >
                                <Plus size={18} /> 新增教儀場次
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TempleScheduleSection;
