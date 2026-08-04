import React, { useState } from 'react';
import { Registration, BusConfig, RoutePlanItem, BusStop, RegStatus, TripType } from '../../types';
import { Bus, Download, Plus, CheckCircle, Clock, Edit2, Trash2, Check, X } from 'lucide-react';
import { useI18n } from '../../src/contexts/LanguageContext';

interface BusAssignmentCardProps {
    busName: string;
    busConfig?: BusConfig;
    passengers: Registration[];
    availableStops: RoutePlanItem[];
    onExport: () => void;
    onAddStop: (stop: BusStop) => void;
    onUpdateStops: (stops: BusStop[]) => void;
    onAssign: (regId: string, stopCode: string) => void;
}

const BusAssignmentCard: React.FC<BusAssignmentCardProps> = ({
    busName, busConfig, passengers, availableStops, onExport, onAddStop, onUpdateStops, onAssign
}) => {
    const { t, tString } = useI18n();
    const capacity = busConfig?.capacity || 0;
    const occupancy = passengers.length;
    const isOver = occupancy > capacity;
    const [isAddingStop, setIsAddingStop] = useState(false);

    const subGroups: Record<string, Registration[]> = {};
    passengers.forEach((p) => {
        const code = p.bus_assigned || 'unassigned';
        if (!subGroups[code]) subGroups[code] = [];
        subGroups[code].push(p);
    });

    return (
        <div className="min-w-full md:min-w-[400px] bg-white rounded shadow-sm border border-slate-200 flex flex-col h-[700px] snap-center shrink-0 overflow-hidden group/bus transition-all hover:border-blue-300">
            <div className="bg-orange-600 p-2 border-b border-orange-700 shrink-0">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded border border-white/10">
                            <Bus className="text-white" size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-base text-white tracking-tight">{busName}</h4>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold ${isOver ? 'text-rose-400' : 'text-white'}`}>{occupancy}</span>
                        <span className="text-[10px] font-bold text-indigo-300">/ {capacity}</span>
                    </div>
                </div>
                <button 
                    onClick={onExport}
                    className="w-full h-10 bg-white text-indigo-900 rounded text-xs font-bold hover:bg-blue-50 flex items-center justify-center shadow-md transition-all active:scale-95 uppercase tracking-widest gap-2"
                >
                    <Download size={14} className="text-blue-600" /> 
                    匯出搭車名單
                </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
                <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">停靠站點與時間</h5>
                </div>
                
                {/* 停靠站點與時間 下拉選單 */}
                <div className="w-full">
                    <select 
                        className="w-full h-8 text-xs border border-blue-300 rounded px-2 bg-white font-bold text-slate-900 outline-none shadow-sm cursor-pointer hover:border-blue-500 transition-all"
                        value=""
                        onChange={e => {
                            if (e.target.value) {
                                const found = availableStops.find(s => s.stopCode === e.target.value);
                                if (found) {
                                    const cleanLoc = found.location || found.area || '';
                                    onAddStop({ 
                                        code: found.stopCode || `${busName}-${(busConfig?.stops?.length || 0) + 1}`, 
                                        location: cleanLoc, 
                                        time: found.arrivalTime || '' 
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">選擇/新增停靠站點與時間...</option>
                        {availableStops.map(s => {
                            const cleanLoc = s.location || s.area || '';
                            return (
                                <option key={s.stopCode} value={s.stopCode}>
                                    {s.stopCode} - {cleanLoc} {s.arrivalTime ? `(${s.arrivalTime})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* 已加入之站點列表 */}
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                    {(busConfig?.stops || []).sort((a, b) => a.code.localeCompare(b.code, undefined, {numeric: true})).map((stop) => {
                        const matched = availableStops.find(s => s.stopCode === stop.code);
                        const cleanLoc = matched?.location || matched?.area || stop.location || '';
                        return (
                            <div key={stop.code} className="flex justify-between items-center py-1.5 px-2.5 bg-white border border-slate-200 rounded group/stop shadow-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">{stop.code}</span>
                                    <span className="text-xs font-bold text-slate-900 truncate">{cleanLoc}</span>
                                    {stop.time && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"><Clock size={10}/>{stop.time}</span>}
                                </div>
                                <button 
                                    onClick={() => onUpdateStops((busConfig?.stops || []).filter(s => s.code !== stop.code))}
                                    className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/stop:opacity-100 shrink-0 ml-1"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F0F4F8]/10 custom-scrollbar">
                {/* 1. 全車列表 (直接指派到車次的人員) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-100 rounded">
                        <h6 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            全車 ({subGroups[busName]?.length || 0})
                        </h6>
                    </div>
                    <div className="space-y-2">
                        {(subGroups[busName] || []).map(m => (
                            <div key={m.reg_id} className="bg-white p-3 rounded border border-slate-100 shadow-sm flex justify-between items-center group/member">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-sm font-bold text-slate-900 truncate">
                                        <span className="text-blue-600 mr-2">[{m.unit}]</span>
                                        {m.name}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => onAssign(m.reg_id, 'unassigned')}
                                    className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/member:opacity-100 shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {(!subGroups[busName] || subGroups[busName].length === 0) && (
                            <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-slate-200 rounded">
                                無全車指派人員
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. 各停靠站列表 */}
                {(busConfig?.stops || []).sort((a, b) => a.code.localeCompare(b.code, undefined, {numeric: true})).map(stop => {
                    const members = subGroups[stop.code] || [];
                    if (members.length === 0) return null;
                    const matched = availableStops.find(s => s.stopCode === stop.code);
                    const cleanLoc = matched?.location || matched?.area || stop.location || '';
                    return (
                        <div key={stop.code} className="space-y-2">
                            <div className="flex items-center justify-between px-2 py-1 bg-slate-50 border border-slate-100 rounded">
                                <h6 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                    {cleanLoc} ({members.length})
                                </h6>
                            </div>
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.reg_id} className="bg-white p-3 rounded border border-slate-100 shadow-sm flex justify-between items-center group/member">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-sm font-bold text-slate-900 truncate">
                                                <span className="text-blue-600 mr-2">[{m.unit}]</span>
                                                {m.name}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => onAssign(m.reg_id, 'unassigned')}
                                            className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/member:opacity-100 shrink-0"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BusAssignmentCard;
