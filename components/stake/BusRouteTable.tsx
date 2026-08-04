import React, { useMemo } from 'react';
import { RoutePlanItem } from '../../types';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

interface BusRouteTableProps {
    items: RoutePlanItem[];
    stations?: any[]; // From settings.stations
    busPrefix: string; // "A", "B", etc.
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

const BusRouteTable: React.FC<BusRouteTableProps> = ({ items, stations = [], busPrefix, onUpdate, onUpdateMultiple, onDelete, onAdd, onMove, theme }) => {
    const effectiveStations = useMemo(() => {
        if (stations && stations.length > 0) return stations;
        try {
            const cached = localStorage.getItem('STAKE_STATIONS_CACHE');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Error loading STAKE_STATIONS_CACHE in BusRouteTable", e);
        }
        return [];
    }, [stations]);

    return (
        <div className="w-full">
            <div className="overflow-x-auto custom-scrollbar border-2 border-slate-200 rounded">
                <table className="w-full text-[10px] md:text-xs lg:text-sm text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className={`font-bold uppercase tracking-wider text-[10px] md:text-xs lg:text-sm border-b-2 bg-white/60 ${theme.text} ${theme.border}`}>
                            <th className={`p-4 w-16 text-center border-r-2 ${theme.border}`}>排序</th>
                            <th className={`p-4 w-24 text-center border-r-2 ${theme.border}`}>站號</th>
                            <th className={`p-4 w-24 text-center border-r-2 ${theme.border}`}>到達</th>
                            <th className={`p-4 w-20 text-center border-r-2 ${theme.border}`}>停留</th>
                            <th className={`p-4 w-24 text-center border-r-2 ${theme.border}`}>離開</th>
                            <th className={`p-4 w-20 text-center border-r-2 ${theme.border}`}>行車</th>
                            <th className={`p-4 min-w-[150px] border-r-2 ${theme.border}`}>地點</th>
                            <th className={`p-4 min-w-[200px] border-r-2 ${theme.border}`}>地址</th>
                            <th className={`p-4 min-w-[200px] border-r-2 ${theme.border}`}>Google Maps</th>
                            <th className="p-4 w-16 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y-2 ${theme.border.replace('border', 'divide')}`}>
                        {(Array.isArray(items) ? items : []).map((item, idx) => {
                            const autoStopCode = `${busPrefix}${idx + 1}`;
                            
                            const matchedStation = effectiveStations.find(s => 
                                (item.stationId && s.id === item.stationId) ||
                                (item.location && (
                                    s.id === item.location || 
                                    s.place === item.location || 
                                    s.area === item.location || 
                                    `${s.area} - ${s.place}` === item.location ||
                                    `${s.area} ${s.place}` === item.location
                                ))
                            );

                            const selectValue = matchedStation ? matchedStation.id : (item.location ? `custom:${item.location}` : '');

                            return (
                            <tr key={idx} className={`bg-transparent hover:bg-white/40 transition-colors group border-b ${theme.border}`}>
                                <td className={`p-2 text-center border-r-2 bg-white/20 ${theme.border}`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <button onClick={() => onMove(idx, 'up')} className={`${theme.text} opacity-40 hover:opacity-100 transition-all`}><ChevronUp size={14}/></button>
                                        <button onClick={() => onMove(idx, 'down')} className={`${theme.text} opacity-40 hover:opacity-100 transition-all`}><ChevronDown size={14}/></button>
                                    </div>
                                </td>
                                <td className={`p-2 border-r-2 ${theme.border}`}>
                                    <input 
                                        className={`w-full bg-white/60 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} 
                                        value={item.stopCode || ''} 
                                        placeholder={autoStopCode}
                                        onChange={e => onUpdate(idx, 'stopCode', e.target.value)} 
                                    />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input 
                                        type="text"
                                        className={`w-full bg-white/40 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} 
                                        value={item.arrivalTime || ''} 
                                        placeholder="HH:mm"
                                        onChange={e => onUpdate(idx, 'arrivalTime', e.target.value)} 
                                    />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input 
                                        type="text"
                                        className={`w-full bg-white/40 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} 
                                        placeholder="分"
                                        value={item.stay || ''} 
                                        onChange={e => onUpdate(idx, 'stay', e.target.value)} 
                                    />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input 
                                        type="text"
                                        className={`w-full bg-slate-50/50 border-2 rounded px-1 py-1.5 text-center font-black outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm text-slate-500 ${theme.border}`} 
                                        value={item.departureTime || ''} 
                                        placeholder="HH:mm"
                                        readOnly
                                    />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input 
                                        type="text"
                                        className={`w-full bg-white/40 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} 
                                        placeholder="分" 
                                        value={item.duration || ''} 
                                        onChange={e => onUpdate(idx, 'duration', e.target.value)} 
                                    />
                                </td>
                                <td className={`p-2 border-r-2 ${theme.border}`}>
                                    <select 
                                        className={`w-full bg-white/80 border-2 rounded px-1 py-1.5 font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm cursor-pointer ${theme.text} ${theme.border}`}
                                        value={selectValue}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (!val) {
                                                if (onUpdateMultiple) {
                                                    onUpdateMultiple(idx, { location: '', area: '', address: '', mapUrl: '', stationId: '' });
                                                } else {
                                                    onUpdate(idx, 'location', '');
                                                }
                                                return;
                                            }
                                            if (val.startsWith('custom:')) return;
                                            
                                            const selected = effectiveStations.find(s => s.id === val);
                                            if (selected) {
                                                const areaName = selected.area || selected.place || '';
                                                const placeName = selected.place || selected.area || '';
                                                if (onUpdateMultiple) {
                                                    onUpdateMultiple(idx, {
                                                        area: areaName,
                                                        location: placeName,
                                                        address: selected.address || '',
                                                        mapUrl: selected.mapUrl || '',
                                                        stationId: selected.id
                                                    });
                                                } else {
                                                    onUpdate(idx, 'area', areaName);
                                                    onUpdate(idx, 'location', placeName);
                                                    onUpdate(idx, 'address', selected.address || '');
                                                    if (selected.mapUrl) onUpdate(idx, 'mapUrl', selected.mapUrl);
                                                    onUpdate(idx, 'stationId', selected.id);
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">選擇地點</option>
                                        {!matchedStation && item.location && (
                                            <option value={`custom:${item.location}`}>
                                                {item.location}
                                            </option>
                                        )}
                                        {[...effectiveStations]
                                            .sort((a, b) => (a.area || a.place || '').localeCompare(b.area || b.place || '', 'zh-Hant'))
                                            .map((s, si) => {
                                                const label = s.area ? (s.place && s.place !== s.area ? `${s.area} (${s.place})` : s.area) : (s.place || `站點 ${si + 1}`);
                                                return (
                                                    <option key={s.id || si} value={s.id}>
                                                        {label}
                                                    </option>
                                                );
                                            })
                                        }
                                    </select>
                                </td>
                                <td className={`p-2 border-r-2 ${theme.border}`}>
                                    <input className={`w-full bg-white/60 border-2 rounded px-2 py-1.5 text-[10px] md:text-xs lg:text-sm font-medium focus:bg-white outline-none transition-all shadow-sm text-slate-600 ${theme.border}`} value={item.address || ''} onChange={e => onUpdate(idx, 'address', e.target.value)} />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input className={`w-full bg-white/60 border-2 rounded px-2 py-1.5 text-[9px] font-medium focus:bg-white outline-none transition-all shadow-sm text-blue-600 ${theme.border}`} value={item.mapUrl || ''} onChange={e => onUpdate(idx, 'mapUrl', e.target.value)} placeholder="https://..." />
                                </td>
                                <td className="p-1 text-right">
                                    <button onClick={() => onDelete(idx)} className="text-slate-300 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded border border-transparent hover:border-rose-100">
                                        <Trash2 size={14}/>
                                    </button>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <button 
                onClick={onAdd}
                className={`w-auto h-8 px-4 text-[10px] md:text-xs lg:text-sm font-bold border flex justify-center items-center transition-all gap-2 bg-white shadow-sm ${theme.text} ${theme.border} hover:bg-white/80 mx-auto mt-2 rounded`}
            >
                <Plus size={18} /> 新增時間節點
            </button>
        </div>
    );
};

export default BusRouteTable;
