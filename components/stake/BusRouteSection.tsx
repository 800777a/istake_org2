import React from 'react';
import { EventData, BusRoute, RoutePlanItem, BusConfig, GlobalSettings } from '../../types';
import { Bus, Download, Upload, Plus, Trash2, RefreshCw, ChevronUp, ChevronDown, Eye, EyeOff, Map, ArrowRightLeft, Save } from 'lucide-react';
import BusRouteTable from './BusRouteTable';
import { useI18n } from '../../src/contexts/LanguageContext';

interface BusRouteSectionProps {
    busConfig: BusConfig;
    route: any;
    idx: number;
    settings?: GlobalSettings;
    theme: { bg: string; text: string; border: string; hover: string };
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onUpdateField: (field: keyof BusRoute, value: string) => void;
    onTogglePublish: (type: 'outbound' | 'return') => void;
    onUpdateRouteItem: (type: 'outbound' | 'returnTrip', idx: number, field: string, value: string) => void;
    onUpdateRouteItemMultiple: (type: 'outbound' | 'returnTrip', idx: number, updates: Record<string, string>) => void;
    onDeleteRouteRow: (type: 'outbound' | 'returnTrip', idx: number) => void;
    onAddRouteRow: (type: 'outbound' | 'returnTrip') => void;
    onMoveRouteRow: (type: 'outbound' | 'returnTrip', idx: number, direction: 'up' | 'down') => void;
    onReverseRoute: () => void;
    onExport: (type: 'outbound' | 'return') => void;
    onImport: (type: 'outbound' | 'return', e: React.ChangeEvent<HTMLInputElement>) => void;
    onTimeChange: (type: 'outbound' | 'return', field: 'Start' | 'End', value: string) => void;
}

const BusRouteSection: React.FC<BusRouteSectionProps> = ({
    busConfig, route, idx, settings, theme, isCollapsed, onToggleCollapse, onUpdateField, onTogglePublish,
    onUpdateRouteItem, onUpdateRouteItemMultiple, onDeleteRouteRow, onAddRouteRow, onMoveRouteRow,
    onReverseRoute, onExport, onImport, onTimeChange
}) => {
    const { t } = useI18n();
    const busName = busConfig.name;

    const lastOutboundDeparture = route.outbound?.length > 0 ? route.outbound[route.outbound.length-1].departureTime : '';
    const lastReturnDeparture = route.returnTrip?.length > 0 ? route.returnTrip[route.returnTrip.length-1].departureTime : '';

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${theme.bg} ${theme.border}`}>
            {/* Section Header: Collapsible Card Standard */}
            <div 
                className={`w-full px-6 py-4 cursor-pointer select-none transition-colors border-b bg-white/60 backdrop-blur-sm group hover:bg-white/80 ${theme.border}`}
                onClick={onToggleCollapse}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg border shadow-sm bg-white/40 ${theme.text} ${theme.border}`}>
                            <Bus size={20} />
                        </div>
                        <h3 className={`font-bold text-sm md:text-base lg:text-lg ${theme.text}`}>
                            {busName} {t('common.bus', '號車')} - {t('route.subtitle.schedule', '行程規劃')}
                        </h3>
                    </div>
                    <div className={theme.text}>
                        {isCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                </div>

                {/* Info and buttons moved below title row and right-aligned */}
                <div className="w-full flex flex-wrap justify-end items-center gap-3 mt-3">
                    {busConfig.company && (
                        <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>遊覽車公司</span>
                            <span className={`text-sm font-bold ${theme.text}`}>{busConfig.company}</span>
                        </div>
                    )}
                    {busConfig.licensePlate && (
                        <div className={`flex flex-col items-end border-l pl-3 ${theme.border}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>車牌號碼</span>
                            <span className={`text-sm font-bold ${theme.text}`}>{busConfig.licensePlate}</span>
                        </div>
                    )}
                    {busConfig.driverName1 && (
                        <div className={`flex flex-col items-end border-l pl-3 ${theme.border}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>司機</span>
                            <span className={`text-sm font-bold ${theme.text}`}>{busConfig.driverName1}</span>
                        </div>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const stakeName = settings?.stake_name || '嘉義支聯會';
                            const fileName = `行程安排_${busName}.txt`;
                            const outboundText = (Array.isArray(route.outbound) ? route.outbound : []).map((i: any) => `${i.departureTime || i.arrivalTime} ${i.location}`).join('\n');
                            const returnText = (Array.isArray(route.returnTrip) ? route.returnTrip : []).map((i: any) => `${i.departureTime || i.arrivalTime} ${i.location}`).join('\n');
                            const text = `【${busName}號車 行程規劃】\n\n[去程]\n${outboundText}\n\n[回程]\n${returnText}`;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            a.click();
                        }}
                        className={`h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border bg-white/60 shadow-sm ${theme.text} ${theme.border} ${theme.hover}`}
                    >
                        <Download size={14} /> 匯出文字
                    </button>
                </div>
            </div>
            
            {!isCollapsed && (
                <div className="p-6 bg-white/40 backdrop-blur-sm flex flex-col gap-6">
                    {/* Outbound & Return Grid */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Outbound Column */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-6 rounded-full ${theme.text.replace('text', 'bg')}`} />
                                    <h4 className={`font-bold ${theme.text}`}>去程 (OUTBOUND)</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onExport('outbound')} className={`p-2 transition-all ${theme.text} opacity-60 hover:opacity-100`}><Download size={16}/></button>
                                    <label className={`p-2 transition-all cursor-pointer ${theme.text} opacity-60 hover:opacity-100`}>
                                        <Upload size={16}/>
                                        <input type="file" className="hidden" accept=".json" onChange={(e) => onImport('outbound', e)}/>
                                    </label>
                                    <div className={`flex items-center gap-2 ml-2 bg-white/60 px-3 py-1 rounded-lg border shadow-sm ${theme.border}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>公佈</span>
                                        <button onClick={() => onTogglePublish('outbound')} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${route.isOutboundPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${route.isOutboundPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={`bg-white/60 p-4 rounded-lg border shadow-sm space-y-4 ${theme.border}`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>發車時間</label>
                                        <input type="time" className={`w-full h-10 bg-white/80 border rounded-lg px-3 font-bold outline-none focus:bg-white transition-all ${theme.text} ${theme.border}`} value={route.outboundStartTime || ''} onChange={e => onTimeChange('outbound', 'Start', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>預計抵達</label>
                                        <input type="time" className={`w-full h-10 bg-white/80 border rounded-lg px-3 font-bold outline-none focus:bg-white transition-all ${theme.text} ${theme.border}`} value={route.outboundEndTime || ''} onChange={e => onTimeChange('outbound', 'End', e.target.value)} />
                                    </div>
                                </div>
                                <BusRouteTable 
                                    items={route.outbound || []} 
                                    stations={settings?.stations} 
                                    busPrefix="A"
                                    onUpdate={(idx, f, v) => onUpdateRouteItem('outbound', idx, f, v)}
                                    onUpdateMultiple={(idx, u) => onUpdateRouteItemMultiple('outbound', idx, u)}
                                    onDelete={(idx) => onDeleteRouteRow('outbound', idx)}
                                    onAdd={() => onAddRouteRow('outbound')}
                                    onMove={(idx, d) => onMoveRouteRow('outbound', idx, d)}
                                    theme={{ bg: 'bg-white/40', text: theme.text, border: theme.border, header: 'bg-white/60' }}
                                />
                            </div>
                        </div>

                        {/* Return Trip Column */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-6 rounded-full ${theme.text.replace('text', 'bg')}`} />
                                    <h4 className={`font-bold ${theme.text}`}>回程 (RETURN)</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={onReverseRoute} className={`p-2 transition-all ${theme.text} opacity-60 hover:opacity-100`} title="回程反向"><RefreshCw size={16}/></button>
                                    <button onClick={() => onExport('return')} className={`p-2 transition-all ${theme.text} opacity-60 hover:opacity-100`}><Download size={16}/></button>
                                    <label className={`p-2 transition-all cursor-pointer ${theme.text} opacity-60 hover:opacity-100`}>
                                        <Upload size={16}/>
                                        <input type="file" className="hidden" accept=".json" onChange={(e) => onImport('return', e)}/>
                                    </label>
                                    <div className={`flex items-center gap-2 ml-2 bg-white/60 px-3 py-1 rounded-lg border shadow-sm ${theme.border}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>公佈</span>
                                        <button onClick={() => onTogglePublish('return')} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${route.isReturnPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${route.isReturnPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={`bg-white/60 p-4 rounded-lg border shadow-sm space-y-4 ${theme.border}`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>發車時間</label>
                                        <input type="time" className={`w-full h-10 bg-white/80 border rounded-lg px-3 font-bold outline-none focus:bg-white transition-all ${theme.text} ${theme.border}`} value={route.returnStartTime || ''} onChange={e => onTimeChange('return', 'Start', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>預計抵達</label>
                                        <input type="time" className={`w-full h-10 bg-white/80 border rounded-lg px-3 font-bold outline-none focus:bg-white transition-all ${theme.text} ${theme.border}`} value={route.returnEndTime || ''} onChange={e => onTimeChange('return', 'End', e.target.value)} />
                                    </div>
                                </div>
                                <BusRouteTable 
                                    items={route.returnTrip || []} 
                                    stations={settings?.stations} 
                                    busPrefix="B"
                                    onUpdate={(idx, f, v) => onUpdateRouteItem('returnTrip', idx, f, v)}
                                    onUpdateMultiple={(idx, u) => onUpdateRouteItemMultiple('returnTrip', idx, u)}
                                    onDelete={(idx) => onDeleteRouteRow('returnTrip', idx)}
                                    onAdd={() => onAddRouteRow('returnTrip')}
                                    onMove={(idx, d) => onMoveRouteRow('returnTrip', idx, d)}
                                    theme={{ bg: 'bg-white/40', text: theme.text, border: theme.border, header: 'bg-white/60' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusRouteSection;
