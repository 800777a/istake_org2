import React, { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { GlobalSettings, Station, EventData } from '../../types';
import { updateSettings, saveSettings } from '../../services/sheetService';
import { 
    MapPin, Plus, Edit2, Trash2, ChevronDown, ChevronUp, 
    ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, RefreshCw,
    X, Check, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import Toast, { ToastType } from '../Toast';

interface StationDataBlockProps {
    settings: GlobalSettings;
    events: EventData[];
    onUpdateSettings: (settings: GlobalSettings) => void;
}

const StationDataBlock: React.FC<StationDataBlockProps> = ({ settings, events, onUpdateSettings }) => {
    const { t, tString } = useI18n();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Station; direction: 'asc' | 'desc' }>({ key: 'address', direction: 'asc' });
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState<Omit<Station, 'id'>>({
        area: '',
        place: '',
        address: '',
        mapUrl: ''
    });

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    // Initial Migration Logic
    useEffect(() => {
        // Try to load from localStorage first if settings.stations is missing/empty
        const cached = localStorage.getItem('STAKE_STATIONS_CACHE');
        if (cached && (!settings.stations || settings.stations.length === 0)) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    onUpdateSettings({ ...settings, stations: parsed });
                    return;
                }
            } catch (e) {
                console.error("Failed to parse cached stations", e);
            }
        }

        if (!settings.stations || settings.stations.length === 0) {
            const extractedStations: Station[] = [];
            const seenPlaces = new Set<string>();

            events.forEach(event => {
                if (event.busRoutes) {
                    Object.values(event.busRoutes).forEach(route => {
                        const allItems = [...(route.outbound || []), ...(route.returnTrip || [])];
                        allItems.forEach(item => {
                            if (item.location && !seenPlaces.has(item.location)) {
                                seenPlaces.add(item.location);
                                extractedStations.push({
                                    id: `ST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                    area: '', // Area might match location or be empty initially
                                    place: item.location,
                                    address: item.address || '',
                                    mapUrl: item.mapUrl || ''
                                });
                            }
                        });
                    });
                }
            });

            if (extractedStations.length > 0) {
                const updatedSettings = { ...settings, stations: extractedStations };
                updateSettings(updatedSettings);
                onUpdateSettings(updatedSettings);
            }
        }
    }, [events, settings, onUpdateSettings]);

    const handleSort = (key: keyof Station) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStations = useMemo(() => {
        let items = [...(settings.stations || [])];
        items.sort((a, b) => {
            const valA = String(a[sortConfig.key] || '');
            const valB = String(b[sortConfig.key] || '');
            
            // Standard locale comparison for Chinese stroke order approximation
            const cmp = valA.localeCompare(valB, 'zh-Hant');
            return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
        return items;
    }, [settings.stations, sortConfig]);

    const handleOpenAdd = () => {
        setEditingStation(null);
        setFormData({ area: '', place: '', address: '', mapUrl: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (station: Station) => {
        setEditingStation(station);
        setFormData({
            area: station.area,
            place: station.place,
            address: station.address,
            mapUrl: station.mapUrl
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.place) {
            setMsgType('error');
            setMsg(t('station.msg.enter_place_name', '請輸入地點名稱'));
            return;
        }

        const newStations = [...(settings.stations || [])];
        if (editingStation) {
            const idx = newStations.findIndex(s => s.id === editingStation.id);
            if (idx !== -1) {
                newStations[idx] = { ...editingStation, ...formData };
            }
        } else {
            newStations.push({
                id: `ST-${Date.now()}`,
                ...formData
            });
        }

        const updatedSettings = { ...settings, stations: newStations };
        localStorage.setItem('STAKE_STATIONS_CACHE', JSON.stringify(newStations));
        await saveSettings(updatedSettings);
        onUpdateSettings(updatedSettings);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        const newStations = (settings.stations || []).filter(s => s.id !== id);
        localStorage.setItem('STAKE_STATIONS_CACHE', JSON.stringify(newStations));
        const updatedSettings = { ...settings, stations: newStations };
        await saveSettings(updatedSettings);
        onUpdateSettings(updatedSettings);
        setIsConfirmDeleteOpen(null);
    };

    // Rainbow colors for station rows
    const rainbowRows = [
        'bg-red-50/30', 'bg-orange-50/30', 'bg-yellow-50/30', 
        'bg-green-50/30', 'bg-blue-50/30', 'bg-indigo-50/30', 'bg-purple-50/30'
    ];

    const getSortIcon = (key: keyof Station) => {
        if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-300" />;
        return sortConfig.direction === 'asc' ? 
            <ArrowUp className="w-3 h-3 ml-1 text-indigo-500" /> : 
            <ArrowDown className="w-3 h-3 ml-1 text-indigo-500" />;
    };

    return (
        <div className="space-y-6 w-full">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            {/* Header / Title Block */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-6 bg-white rounded border-2 border-indigo-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded text-indigo-600">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{t('station.db_title', '站點資料庫')}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-6 h-6 text-gray-300" /> : <ChevronDown className="w-6 h-6 text-gray-300" />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded border-2 border-indigo-100 overflow-hidden shadow-xl"
                    >
                        <div className="p-6 border-b border-indigo-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-sm font-black text-indigo-900">{t('station.list_title', '站點列表')}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const beforeCount = (settings.stations || []).length;
                                        const seen = new Set();
                                        const unique = (settings.stations || []).filter(s => {
                                            // Identification key based on area, place and address
                                            const key = `${(s.area || '').trim()}-${(s.place || '').trim()}-${(s.address || '').trim()}`;
                                            if (seen.has(key)) return false;
                                            seen.add(key);
                                            return true;
                                        });

                                        if (unique.length < beforeCount) {
                                            const updatedSettings = { ...settings, stations: unique };
                                            localStorage.setItem('STAKE_STATIONS_CACHE', JSON.stringify(unique));
                                            await saveSettings(updatedSettings);
                                            onUpdateSettings(updatedSettings);
                                            setMsg(`已成功刪除 ${beforeCount - unique.length} 筆重複記錄`);
                                            setTimeout(() => setMsg(null), 3000);
                                        } else {
                                            setMsg("未發現重複記錄");
                                            setTimeout(() => setMsg(null), 3000);
                                        }
                                    }}
                                    className="text-[10px] bg-red-50 text-red-600 px-3 py-2 rounded border border-red-100 hover:bg-red-100 font-bold transition-colors flex items-center gap-1 active:scale-95"
                                >
                                    <RefreshCw className="w-3 h-3" /> {t('station.button.cleanup_duplicates', '清理重複')}
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAdd();
                                    }}
                                    className="bg-indigo-600 text-white p-2 px-6 rounded flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm font-black shadow-lg shadow-indigo-100 active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> {t('station.button.add', '新增站點')}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-indigo-200">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead className="sticky top-0 bg-indigo-50/95 backdrop-blur-md z-30">
                                    <tr className="border-b-2 border-indigo-100 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                                        <th onClick={() => handleSort('area')} className="p-3 pl-6 cursor-pointer hover:text-indigo-600 transition-colors whitespace-nowrap sticky left-0 bg-indigo-50/95 z-40 border-r border-indigo-100/50">
                                            <div className="flex items-center">{t('station.col.area', '地點')} {getSortIcon('area')}</div>
                                        </th>
                                        <th onClick={() => handleSort('place')} className="p-3 cursor-pointer hover:text-indigo-600 transition-colors whitespace-nowrap">
                                            <div className="flex items-center">{t('station.col.place', '地名')} {getSortIcon('place')}</div>
                                        </th>
                                        <th onClick={() => handleSort('address')} className="p-3 cursor-pointer hover:text-indigo-600 transition-colors">
                                            <div className="flex items-center">{t('station.col.address', '地址')} {getSortIcon('address')}</div>
                                        </th>
                                        <th className="p-3 whitespace-nowrap">{t('station.col.map', '地圖')}</th>
                                        <th className="p-3 pr-6 text-center whitespace-nowrap">{t('station.col.action', '管理')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sortedStations.map((station, idx) => (
                                        <tr key={station.id} className={`${rainbowRows[idx % rainbowRows.length]} hover:brightness-95 transition-all group`}>
                                            <td className="p-3 pl-6 font-bold text-[11px] text-gray-500 sticky left-0 bg-white/80 backdrop-blur-sm z-20 border-r border-dashed border-indigo-100/30 group-hover:bg-white whitespace-nowrap">{station.area || '-'}</td>
                                            <td className="p-3 font-bold text-[11px] text-gray-500 whitespace-nowrap">{station.place}</td>
                                            <td className="p-3 text-[11px] font-bold text-gray-400" title={station.address}>
                                                {station.address || <span className="text-gray-300 italic">{t('common.status.not_set', '尚未設定')}</span>}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {station.mapUrl ? (
                                                    <a href={station.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-100 rounded text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                        🌐 {t('station.col.map', '地圖')}
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300">{t('common.none', '無')}</span>
                                                )}
                                            </td>
                                            <td className="p-3 pr-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => handleOpenEdit(station)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsConfirmDeleteOpen(station.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                     {sortedStations.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-30">
                                                    <MapPin className="w-16 h-16 text-indigo-300 mb-4" />
                                                    <p className="text-xl font-black text-indigo-900">{t('station.msg.no_data', '資料庫尚無站點')}</p>
                                                    <p className="text-sm font-bold mt-2">{t('station.msg.add_hint', '您可以從上方按鈕新增，或系統自動從行程導入')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Modal for Add/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden border-4 border-indigo-100"
                        >
                            <div className="p-8 pb-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {editingStation ? t('station.button.edit', '編輯站點') : t('station.button.add', '新增站點')}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-400 mt-1">{t('station.form.hint', '請填寫詳細站點資訊以便快速引用')}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-500 ml-1 uppercase tracking-wider">{t('station.form.area_label', '地點 (如: 嘉義)')}</label>
                                            <input 
                                                type="text"
                                                value={formData.area}
                                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                                placeholder={tString('station.form.area_placeholder', '地點簡稱')}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded outline-none transition-all font-black text-gray-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-500 ml-1 uppercase tracking-wider">{t('station.form.place_label', '地名 (如: 教堂)')}</label>
                                            <input 
                                                type="text"
                                                value={formData.place}
                                                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                                                placeholder={tString('station.form.place_placeholder', '完整地名資料')}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded outline-none transition-all font-black text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 ml-1 uppercase tracking-wider">{t('station.col.address', '詳細地址')}</label>
                                        <input 
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder={tString('station.form.address_placeholder', '請輸入完整街道地址')}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded outline-none transition-all font-black text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 ml-1 uppercase tracking-wider">{t('station.form.map_url_label', 'Google 地圖網址')}</label>
                                        <textarea 
                                            value={formData.mapUrl}
                                            onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                                            placeholder={tString('station.form.map_url_placeholder', '貼上分享連結 (https://maps.app.goo.gl/...)')}
                                            rows={2}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded outline-none transition-all font-black text-gray-900 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        {t('common.button.cancel', '取消')}
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-black rounded hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" /> {t('common.button.save_changes', '儲存變更')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Confirm Delete Modal */}
            <AnimatePresence>
                {isConfirmDeleteOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded shadow-2xl w-full max-sm overflow-hidden border-4 border-red-100"
                        >
                            <div className="p-8 text-center space-y-4">
                                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                                    <AlertTriangle className="w-12 h-12" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">{t('station.msg.delete_confirm_title', '刪除站點？')}</h3>
                                    <p className="text-sm font-bold text-gray-400 mt-2 px-4">
                                        {t('station.msg.delete_confirm_text', '此動作無法復原。如果此站點正被行程行程使用，可能會造成連動失效。')}
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsConfirmDeleteOpen(null)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded hover:bg-gray-200 transition-all"
                                    >
                                        {t('common.button.back', '返回')}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(isConfirmDeleteOpen)}
                                        className="flex-1 py-4 bg-red-600 text-white font-black rounded hover:bg-red-700 shadow-xl shadow-red-100 transition-all"
                                    >
                                        {t('common.button.confirm_delete', '確認刪除')}
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

export default StationDataBlock;
