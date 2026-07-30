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
        <div className={`rounded shadow-sm border overflow-hidden ${theme.bg} ${theme.border}`}>
            {/* Section Header: Collapsible Card Standard */}
            <div 
                className={`w-full px-6 py-4 cursor-pointer select-none transition-colors border-b bg-white/60 backdrop-blur-sm group hover:bg-white/80 ${theme.border}`}
                onClick={onToggleCollapse}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded border shadow-sm bg-white/40 ${theme.text} ${theme.border}`}>
                            <Bus size={20} />
                        </div>
                        <h3 className={`font-bold text-xs md:text-sm lg:text-base ${theme.text}`}>
                            {busName}-行程規劃
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
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>遊覽車公司</span>
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black ${theme.text}`}>{busConfig.company}</span>
                        </div>
                    )}
                    {busConfig.licensePlate && (
                        <div className={`flex flex-col items-end border-l pl-3 ${theme.border}`}>
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>車牌</span>
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black ${theme.text}`}>{busConfig.licensePlate}</span>
                        </div>
                    )}
                    {busConfig.driverName1 && (
                        <div className={`flex flex-col items-end border-l pl-3 ${theme.border}`}>
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black uppercase tracking-wider mb-0.5 opacity-60 ${theme.text}`}>司機</span>
                            <span className={`text-[10px] md:text-xs lg:text-sm font-black ${theme.text}`}>{busConfig.driverName1}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {!isCollapsed && (
                <div className="p-1 flex flex-col gap-1 bg-white/40 backdrop-blur-sm">
                    {/* Outbound & Return Grid - Vertically Stacked */}
                    <div className="flex flex-col gap-4">
                        {/* Outbound Column */}
                        <div className="space-y-1">
                            <div className="flex items-center px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-4 rounded-full ${theme.text.replace('text', 'bg')}`} />
                                    <h4 className={`font-black text-xs md:text-sm lg:text-base ${theme.text}`}>去程路線</h4>
                                </div>
                            </div>
                            
                            {/* Action Row for Outbound */}
                            <div className="flex items-center justify-end gap-2 px-2 pb-1 border-b border-dashed border-gray-100">
                                <button onClick={() => onExport('outbound')} className={`px-2 py-1 flex items-center gap-1 rounded bg-white/60 border border-gray-100 text-[10px] md:text-xs font-bold transition-all ${theme.text} opacity-80 hover:opacity-100`} title="匯出">
                                    <Download size={12}/> 匯出
                                </button>
                                <label className={`px-2 py-1 flex items-center gap-1 rounded bg-white/60 border border-gray-100 text-[10px] md:text-xs font-bold transition-all cursor-pointer ${theme.text} opacity-80 hover:opacity-100`} title="匯入">
                                    <Upload size={12}/> 匯入
                                    <input type="file" className="hidden" accept=".json" onChange={(e) => onImport('outbound', e)}/>
                                </label>
                                <div className={`flex items-center gap-1.5 ml-1 bg-white/60 px-2 py-1 rounded border border-gray-100 shadow-sm ${theme.border}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.text} opacity-60`}>公佈</span>
                                    <button onClick={() => onTogglePublish('outbound')} className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors ${route.isOutboundPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${route.isOutboundPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
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

                        {/* Return Trip Column */}
                        <div className="space-y-1">
                            <div className="flex items-center px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-4 rounded-full ${theme.text.replace('text', 'bg')}`} />
                                    <h4 className={`font-black text-xs md:text-sm lg:text-base ${theme.text}`}>回程路線</h4>
                                </div>
                            </div>

                            {/* Action Row for Return */}
                            <div className="flex items-center justify-end gap-2 px-2 pb-1 border-b border-dashed border-gray-100">
                                <button onClick={onReverseRoute} className={`px-2 py-1 flex items-center gap-1 rounded bg-white/60 border border-gray-100 text-[10px] md:text-xs font-bold transition-all ${theme.text} opacity-80 hover:opacity-100`} title="回程反向">
                                    <RefreshCw size={12}/> 反向
                                </button>
                                <button onClick={() => onExport('return')} className={`px-2 py-1 flex items-center gap-1 rounded bg-white/60 border border-gray-100 text-[10px] md:text-xs font-bold transition-all ${theme.text} opacity-80 hover:opacity-100`} title="匯出">
                                    <Download size={12}/> 匯出
                                </button>
                                <label className={`px-2 py-1 flex items-center gap-1 rounded bg-white/60 border border-gray-100 text-[10px] md:text-xs font-bold transition-all cursor-pointer ${theme.text} opacity-80 hover:opacity-100`} title="匯入">
                                    <Upload size={12}/> 匯入
                                    <input type="file" className="hidden" accept=".json" onChange={(e) => onImport('return', e)}/>
                                </label>
                                <div className={`flex items-center gap-1.5 ml-1 bg-white/60 px-2 py-1 rounded border border-gray-100 shadow-sm ${theme.border}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.text} opacity-60`}>公佈</span>
                                    <button onClick={() => onTogglePublish('return')} className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors ${route.isReturnPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${route.isReturnPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
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
            )}
        </div>
    );
};

export default BusRouteSection;
