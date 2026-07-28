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
        <div className="min-w-full md:min-w-[400px] bg-white rounded shadow-sm border border-slate-200 flex flex-col h-[700px] snap-center shrink-0 overflow-hidden group/bus transition-all hover:border-indigo-300">
            <div className="bg-indigo-900 p-6 border-b border-indigo-950 shrink-0">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded border border-white/10">
                            <Bus className="text-blue-300" size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-base text-white tracking-tight">{busName} {t('common.bus', '號車')}</h4>
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Active Fleet Unit</p>
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

            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">停靠站點與時間</h5>
                    {!isAddingStop ? (
                        <button onClick={() => setIsAddingStop(true)} className="h-8 w-8 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-all flex items-center justify-center">
                            <Plus size={16} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <select 
                                className="h-8 text-[10px] border border-blue-400 rounded px-2 bg-white font-bold text-slate-900 outline-none shadow-sm"
                                onChange={e => {
                                    if (e.target.value) {
                                        const found = availableStops.find(s => s.location === e.target.value);
                                        if (found) {
                                            onAddStop({ 
                                                code: found.stopCode || `${busName}-${(busConfig?.stops?.length || 0) + 1}`, 
                                                location: found.location, 
                                                time: found.arrivalTime || '' 
                                            });
                                            setIsAddingStop(false);
                                        }
                                    }
                                }}
                            >
                                <option value="">選擇站點</option>
                                {availableStops.map(s => (
                                    <option key={s.stopCode} value={s.location}>{s.location}</option>
                                ))}
                            </select>
                            <button onClick={() => setIsAddingStop(false)} className="h-8 w-8 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-all flex items-center justify-center"><X size={14}/></button>
                        </div>
                    )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {(busConfig?.stops || []).map((stop, sIdx) => (
                        <div key={stop.code} className="flex justify-between items-center py-2 px-3 bg-white border border-slate-200 rounded group/stop shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100">{stop.code}</span>
                                <span className="text-xs font-bold text-slate-900">{stop.location}</span>
                                {stop.time && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10}/>{stop.time}</span>}
                            </div>
                            <button 
                                onClick={() => onUpdateStops((busConfig?.stops || []).filter((_, i) => i !== sIdx))}
                                className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/stop:opacity-100"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F0F4F8]/10 custom-scrollbar">
                {(busConfig?.stops || [{ code: busName, location: '全車', time: '' }]).map(stop => {
                    const members = subGroups[stop.code] || [];
                    if (members.length === 0 && stop.code !== busName) return null;
                    return (
                        <div key={stop.code} className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                    {stop.location} ({members.length})
                                </h6>
                            </div>
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.reg_id} className="bg-white p-3 rounded border border-slate-100 shadow-sm flex justify-between items-center group/member">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{m.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{m.unit}</span>
                                        </div>
                                        <button 
                                            onClick={() => onAssign(m.reg_id, 'unassigned')}
                                            className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/member:opacity-100"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {members.length === 0 && <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-slate-200 rounded">無乘車名單</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BusAssignmentCard;
