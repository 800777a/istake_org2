import React from 'react';
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
    return (
        <div className="w-full">
            <div className="overflow-x-auto custom-scrollbar border-2 border-slate-200 rounded">
                <table className="w-full text-[10px] md:text-xs lg:text-sm text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className={`font-bold uppercase tracking-wider text-[10px] md:text-xs lg:text-sm border-b-2 bg-white/60 ${theme.text} ${theme.border}`}>
                            <th className={`p-4 w-16 text-center border-r-2 ${theme.border}`}>排序</th>
                            <th className={`p-4 w-24 text-center border-r-2 ${theme.border}`}>站點代碼</th>
                            <th className={`p-4 w-20 text-center border-r-2 ${theme.border}`}>停留(分)</th>
                            <th className={`p-4 w-20 text-center border-r-2 ${theme.border}`}>行車(分)</th>
                            <th className={`p-4 min-w-[150px] border-r-2 ${theme.border}`}>停留地點</th>
                            <th className={`p-4 min-w-[200px] border-r-2 ${theme.border}`}>詳細地址</th>
                            <th className={`p-4 min-w-[200px] border-r-2 ${theme.border}`}>Google Maps</th>
                            <th className="p-4 w-16 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y-2 ${theme.border.replace('border', 'divide')}`}>
                        {(Array.isArray(items) ? items : []).map((item, idx) => {
                            const autoStopCode = `${busPrefix}${idx + 1}`;
                            
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
                                    <input className={`w-full bg-white/40 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} value={item.stay || ''} onChange={e => onUpdate(idx, 'stay', e.target.value)} />
                                </td>
                                <td className={`p-1 border-r-2 ${theme.border}`}>
                                    <input className={`w-full bg-white/40 border-2 rounded px-1 py-1.5 text-center font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm ${theme.text} ${theme.border}`} placeholder="分" value={item.duration} onChange={e => onUpdate(idx, 'duration', e.target.value)} />
                                </td>
                                <td className={`p-2 border-r-2 ${theme.border}`}>
                                    <select 
                                        className={`w-full bg-white/80 border-2 rounded px-1 py-1.5 font-black focus:bg-white outline-none transition-all shadow-sm text-[10px] md:text-xs lg:text-sm cursor-pointer ${theme.text} ${theme.border}`}
                                        value={item.location || ''}
                                        onChange={e => {
                                            const selected = stations.find(s => s.area === e.target.value);
                                            if (selected && onUpdateMultiple) {
                                                onUpdateMultiple(idx, {
                                                    location: selected.area,
                                                    address: selected.address,
                                                    mapUrl: selected.mapUrl || ''
                                                });
                                            } else if (selected) {
                                                onUpdate(idx, 'location', selected.area);
                                                onUpdate(idx, 'address', selected.address);
                                                if (selected.mapUrl) onUpdate(idx, 'mapUrl', selected.mapUrl);
                                            }
                                        }}
                                    >
                                        <option value="">選擇地點</option>
                                        {stations.map((s, si) => (
                                            <option key={si} value={s.area}>{s.area}</option>
                                        ))}
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
                className={`w-full h-8 md:h-10 lg:h-12 text-[10px] md:text-xs lg:text-sm font-bold border-t flex justify-center items-center transition-all gap-2 bg-white/60 backdrop-blur-sm ${theme.text} ${theme.border} hover:bg-white/80`}
            >
                <Plus size={18} /> 新增行程節點
            </button>
        </div>
    );
};

export default BusRouteTable;
