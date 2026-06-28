import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoutePlanItem, Station } from '../../types';
import { ChevronUp, ChevronDown, Trash2, Plus, Edit2, Check, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BusRouteTableProps {
    items: RoutePlanItem[];
    stations?: Station[];
    onUpdate: (idx: number, field: string, value: string) => void;
    onUpdateMultiple?: (idx: number, updates: Record<string, string>) => void;
    onDelete: (idx: number) => void;
    onAdd: () => void;
    onMove: (idx: number, direction: 'up' | 'down') => void;
    theme: {
        bg: string;
        text: string;
        border: string;
        header: string;
    };
}

const BusRouteTable: React.FC<BusRouteTableProps> = ({ items, stations = [], onUpdate, onUpdateMultiple, onDelete, onAdd, onMove, theme }) => {
    const { t } = useTranslation();
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<RoutePlanItem | null>(null);

    // Component Theme Mapping
    const cTheme = {
        border: theme.border,
        headBg: theme.header,
        rowEven: theme.bg,
        rowOdd: 'bg-white',
        text: theme.text,
        inputBg: `bg-white/50 focus:ring-current ${theme.text}`,
        textSize: 'text-[10px]'
    };

    // Sort stations by address stroke count approximation
    const sortedOptions = useMemo(() => {
        return [...stations].sort((a, b) => a.address.localeCompare(b.address, 'zh-Hant'));
    }, [stations]);

    const handleStationChange = (idx: number, stationId: string) => {
        const station = stations.find(s => s.id === stationId);
        if (station) {
            const updates = {
                area: station.area,
                location: station.place,
                address: station.address,
                mapUrl: station.mapUrl
            };
            if (onUpdateMultiple) {
                onUpdateMultiple(idx, updates);
            } else {
                onUpdate(idx, 'area', station.area);
                onUpdate(idx, 'location', station.place);
                onUpdate(idx, 'address', station.address);
                onUpdate(idx, 'mapUrl', station.mapUrl);
            }
        }
    };

    const handleAddClick = () => {
        setEditingIdx(-1);
        setEditFormData({ 
            duration: '0', 
            arrivalTime: '', 
            departureTime: '', 
            location: '', 
            area: '', 
            stay: '0', 
            stopCode: '', 
            address: '', 
            mapUrl: '' 
        });
    };

    const handleEditClick = (idx: number, item: RoutePlanItem) => {
        setEditingIdx(idx);
        setEditFormData({ ...item });
    };

    const handleSaveEdit = () => {
        if (editFormData === null) return;

        if (editingIdx === -1) {
            // New station logic
            // We use the existing onAdd prop which parent will handle
            // But we need to pass data. Let's assume onAdd can optionally take data
            // Or we do onAdd() and then find the new index.
            // For now, I'll update onAdd signature in props if I used it.
            onAdd(); 
            // The problem is onAdd in parent is async/immediate.
            // A better way is to pass data to onAdd if we can.
            // I'll adjust RouteTab to support this.
            setTimeout(() => {
                const newIdx = items.length; // after onAdd, it should be items.length
                if (onUpdateMultiple) onUpdateMultiple(newIdx, editFormData as any);
            }, 100);
        } else if (editingIdx !== null) {
            if (onUpdateMultiple) {
                onUpdateMultiple(editingIdx, editFormData as any);
            } else {
                Object.entries(editFormData).forEach(([key, val]) => {
                    onUpdate(editingIdx, key, String(val));
                });
            }
        }
        setEditingIdx(null);
        setEditFormData(null);
    };

    return (
        <div className={`border ${cTheme.border} rounded-xl overflow-hidden shadow-sm relative mb-4`}>
            {/* Top Action Header */}
            <div className={`p-2 border-b ${cTheme.border} ${cTheme.headBg} flex justify-end`}>
                <button 
                    onClick={handleAddClick}
                    className={`p-2 px-4 ${cTheme.text} hover:bg-black/5 rounded-lg text-xs font-black flex items-center group transition-all`}
                >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> {t('bus.route.add_station', '新增站點')}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto min-w-[800px]">
                    <thead className={`${cTheme.headBg} ${cTheme.text} font-black uppercase tracking-wider text-[10px]`}>
                        <tr className={`border-b ${cTheme.border}`}>
                            <th className={`p-2 w-10 text-center ${cTheme.border} border-r whitespace-nowrap`}>#</th>
                            <th className={`p-2 w-16 text-center ${cTheme.border} border-r whitespace-nowrap`}>{t('bus.route.col_stop_code', '站號')}</th>
                            <th className={`p-2 w-16 text-center ${cTheme.border} border-r whitespace-nowrap`}>{t('bus.route.col_arrival', '到達')}</th>
                            <th className={`p-2 w-16 text-center ${cTheme.border} border-r whitespace-nowrap`}>{t('bus.route.col_stay', '停留')}</th>
                            <th className={`p-2 w-16 text-center ${cTheme.border} border-r whitespace-nowrap`}>{t('bus.route.col_departure', '離開')}</th>
                            <th className={`p-2 w-16 text-center ${cTheme.border} border-r whitespace-nowrap`}>{t('bus.route.col_duration', '行駛')}</th>
                            <th className={`p-2 sticky left-0 ${cTheme.headBg} z-20 border-r ${cTheme.border} whitespace-nowrap`}>{t('bus.route.col_area', '地名')}</th>
                            <th className={`p-2 border-r ${cTheme.border} whitespace-nowrap`}>{t('bus.route.col_location', '地點')}</th>
                            <th className={`p-2 border-r ${cTheme.border} whitespace-nowrap`}>{t('bus.route.col_address', '地址')}</th>
                            <th className={`p-2 w-10 text-center border-r ${cTheme.border} whitespace-nowrap`}>{t('bus.route.col_map', '地圖')}</th>
                            <th className="p-2 w-16 text-center whitespace-nowrap">{t('common.actions', '操作')}</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${cTheme.border.replace('border-', 'divide-')}`}>
                        {(Array.isArray(items) ? items : []).map((item, idx) => {
                            const matchedStation = stations.find(s => s.area === item.area && s.place === item.location);
                            
                            return (
                                <tr key={idx} className={`${idx % 2 !== 0 ? cTheme.rowEven : cTheme.rowOdd} bg-opacity-100 transition-colors hover:bg-black/5 group`}>
                                    <td className={`p-1 text-center ${cTheme.border} border-r bg-gray-100/50 whitespace-nowrap`}>
                                        <div className="flex flex-col items-center">
                                            <button onClick={() => onMove(idx, 'up')} className={`${cTheme.text} hover:opacity-70`}><ChevronUp className="w-3 h-3"/></button>
                                            <span className="text-[11px] font-bold">{idx + 1}</span>
                                            <button onClick={() => onMove(idx, 'down')} className={`${cTheme.text} hover:opacity-70`}><ChevronDown className="w-3 h-3"/></button>
                                        </div>
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r whitespace-nowrap text-center`}>
                                        <input 
                                            className={`w-14 border-none bg-transparent p-1 font-bold text-center outline-none text-blue-600 text-[11px]`} 
                                            placeholder={t('bus.route.stop_code_placeholder', "A1")} 
                                            value={item.stopCode || ''} 
                                            onChange={e => onUpdate(idx, 'stopCode', e.target.value)} 
                                        />
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r whitespace-nowrap text-center`}>
                                        <input className={`w-14 border-none bg-transparent p-1 font-bold text-center outline-none ${cTheme.text} text-[11px]`} placeholder="--" value={item.arrivalTime || ''} onChange={e => onUpdate(idx, 'arrivalTime', e.target.value)} />
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r whitespace-nowrap`}>
                                        <input className={`w-14 border-none bg-transparent p-1 font-bold text-center outline-none ${cTheme.text} text-[11px]`} placeholder={t('common.unit.minutes_short', "分")} value={item.stay || '0'} onChange={e => onUpdate(idx, 'stay', e.target.value)} />
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r whitespace-nowrap text-center`}>
                                        <input className={`w-14 border-none bg-transparent p-1 font-bold text-center outline-none ${cTheme.text} text-[11px]`} placeholder="--" value={item.departureTime || ''} onChange={e => onUpdate(idx, 'departureTime', e.target.value)} />
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r whitespace-nowrap`}>
                                        <input className={`w-14 border-none bg-transparent p-1 font-bold text-center outline-none ${cTheme.text} text-[11px]`} placeholder={t('common.unit.minutes_short', "分")} value={item.duration || '0'} onChange={e => onUpdate(idx, 'duration', e.target.value)} />
                                    </td>
                                    <td className={`p-1 sticky left-0 ${idx % 2 !== 0 ? cTheme.rowEven : cTheme.rowOdd} z-10 border-r ${cTheme.border} group-hover:bg-indigo-50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap`}>
                                        <select 
                                            className="w-24 bg-transparent p-1 font-bold text-[11px] outline-none cursor-pointer"
                                            value={matchedStation?.id || ""}
                                            onChange={(e) => handleStationChange(idx, e.target.value)}
                                        >
                                            <option value="">{item.area || '--'}</option>
                                            {sortedOptions.map(s => (
                                                <option key={s.id} value={s.id}>{s.area}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r font-bold text-[11px] text-gray-500 px-3 whitespace-nowrap`}>
                                        {item.location || <span className="text-gray-300 italic">{t('common.not_set', '未設定')}</span>}
                                    </td>
                                    <td className={`p-1 ${cTheme.border} border-r text-[11px] font-bold text-gray-400 px-3 truncate`} title={item.address}>
                                        {item.address || '-'}
                                    </td>
                                    <td className={`p-1 text-center ${cTheme.border} border-r whitespace-nowrap`}>
                                        {item.mapUrl ? (
                                            <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                🌐
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="p-1 px-2 whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Desktop Operations */}
                                            <div className="hidden md:flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => handleEditClick(idx, item)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={t('bus.route.edit_details', '編輯詳細資訊')}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5"/>
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(idx)} 
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title={t('common.delete', '刪除')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>

                                            {/* Mobile Operations Menu */}
                                            <div className="md:hidden">
                                                <button 
                                                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                                    className="p-2 text-gray-400 hover:text-gray-900 rounded-lg bg-gray-50 border border-gray-100"
                                                >
                                                    <Plus className={`w-4 h-4 transition-transform ${editingIdx === idx ? 'rotate-45' : ''}`} />
                                                </button>
                                                
                                                <AnimatePresence>
                                                    {editingIdx === idx && (
                                                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingIdx(null)}>
                                                            <motion.div 
                                                                initial={{ scale: 0.9, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.9, opacity: 0 }}
                                                                className="bg-white rounded-[2rem] shadow-2xl border-4 border-white overflow-hidden min-w-[280px] animate-scale-in" 
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <div className="bg-gray-50 p-5 border-b flex justify-between items-center">
                                                                    <span className="text-sm font-black text-gray-900 uppercase tracking-wider">{t('bus.route.station_number', '站點')} #{idx + 1} {t('common.actions', '操作')}</span>
                                                                    <button onClick={() => setEditingIdx(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
                                                                </div>
                                                                <div className="p-3 grid grid-cols-1 gap-2">
                                                                    <button onClick={() => { handleEditClick(idx, item); }} className="flex items-center gap-4 w-full p-4 text-sm font-bold text-gray-700 hover:bg-indigo-50 rounded-2xl transition-colors">
                                                                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Edit2 size={18} /></div>
                                                                        {t('bus.route.edit_station_details', '編輯站點詳情')}
                                                                    </button>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <button onClick={() => { onMove(idx, 'up'); setEditingIdx(null); }} className="flex flex-col items-center gap-2 p-4 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-2xl transition-colors">
                                                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600"><ChevronUp size={18} /></div>
                                                                            {t('common.move_up', '上移')}
                                                                        </button>
                                                                        <button onClick={() => { onMove(idx, 'down'); setEditingIdx(null); }} className="flex flex-col items-center gap-2 p-4 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-2xl transition-colors">
                                                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600"><ChevronDown size={18} /></div>
                                                                            {t('common.move_down', '下移')}
                                                                        </button>
                                                                    </div>
                                                                    <button onClick={() => { onDelete(idx); setEditingIdx(null); }} className="flex items-center gap-4 w-full p-4 text-sm font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><Trash2 size={18} /></div>
                                                                        {t('bus.route.delete_this_station', '刪除此站')}
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        </div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal to avoid sandbox blocking and provide clean UI */}
            <AnimatePresence>
                {editingIdx !== null && editFormData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border-4 border-white"
                        >
                            <div className="p-6 pb-2 flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-indigo-600" /> {t('bus.route.edit_itinerary_details', '編輯行程詳情')}
                                </h3>
                                <button onClick={() => setEditingIdx(null)} className="p-2 hover:bg-gray-100 rounded-2xl transition-all">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 ml-1">{t('bus.route.col_stop_code', '站號')}</label>
                                        <input 
                                            type="text"
                                            value={editFormData.stopCode || ''}
                                            onChange={e => setEditFormData({...editFormData, stopCode: e.target.value})}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm"
                                            placeholder={t('bus.route.stop_code_placeholder', "A1")}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 ml-1">{t('bus.route.col_area', '地名')}</label>
                                        <input 
                                            type="text"
                                            value={editFormData.area || ''}
                                            onChange={e => setEditFormData({...editFormData, area: e.target.value})}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 ml-1">{t('bus.route.col_location', '地點')}</label>
                                        <input 
                                            type="text"
                                            value={editFormData.location || ''}
                                            onChange={e => setEditFormData({...editFormData, location: e.target.value})}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 ml-1">{t('bus.route.col_address', '地址')}</label>
                                    <input 
                                        type="text"
                                        value={editFormData.address || ''}
                                        onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 ml-1">{t('bus.route.col_map_url', '地圖網址')}</label>
                                    <textarea 
                                        value={editFormData.mapUrl || ''}
                                        onChange={e => setEditFormData({...editFormData, mapUrl: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm h-20 resize-none"
                                        placeholder={t('bus.route.map_url_placeholder', "貼上 Google 地圖分享連結")}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setEditingIdx(null)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all"
                                    >
                                        {t('common.cancel', '取消')}
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> {t('common.confirm_save', '確認儲存')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BusRouteTable;
