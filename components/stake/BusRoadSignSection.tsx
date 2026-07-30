import React from 'react';
import { RoadSignItem } from '../../types';
import { Map, Download, Upload, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface BusRoadSignSectionProps {
    busName: string;
    type: 'outbound' | 'return';
    items: RoadSignItem[];
    theme: { bg: string; text: string; border: string; hover: string };
    isPublished: boolean;
    onTogglePublish: () => void;
    onUpdate: (idx: number, field: keyof RoadSignItem, value: any) => void;
    onAdd: () => void;
    onDelete: (idx: number) => void;
    onMove: (idx: number, direction: 'up' | 'down') => void;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BusRoadSignSection: React.FC<BusRoadSignSectionProps> = ({
    busName, type, items, theme, isPublished, onTogglePublish, onUpdate, onAdd, onDelete, onMove, onExport, onImport
}) => {
    return (
        <div className={`rounded border shadow-sm overflow-hidden animate-fade-in h-full flex flex-col bg-white/60 backdrop-blur-sm ${theme.border}`}>
            <div className={`p-4 border-b flex justify-between items-center flex-wrap gap-4 bg-white/40 ${theme.border}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded border shadow-sm bg-white/40 ${theme.text} ${theme.border}`}>
                        <Map size={18} />
                    </div>
                    <h4 className={`font-black text-xs md:text-sm lg:text-base uppercase tracking-tight ${theme.text}`}>
                        {type === 'outbound' ? '去程路標' : '回程路標'}
                    </h4>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <button onClick={onExport} className={`h-8 px-3 rounded text-xs font-bold transition-all flex items-center border bg-white/60 shadow-sm ${theme.text} ${theme.border} ${theme.hover}`}><Download size={14} className="mr-1.5"/>匯出</button>
                        <label className={`h-8 px-3 rounded text-xs font-bold transition-all flex items-center border bg-white/60 shadow-sm cursor-pointer ${theme.text} ${theme.border} ${theme.hover}`}>
                            <Upload size={14} className="mr-1.5"/>匯入
                            <input type="file" className="hidden" accept=".json" onChange={onImport}/>
                        </label>
                    </div>
                    <div className={`flex items-center gap-3 bg-white/60 px-3 py-1 rounded border shadow-sm ${theme.border}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-60`}>公佈</span>
                        <button 
                            onClick={onTogglePublish}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${isPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                    <thead>
                        <tr className={`text-[10px] md:text-xs lg:text-sm font-bold uppercase tracking-wider border-b bg-white/20 ${theme.text} ${theme.border}`}>
                            <th className={`p-2 w-12 text-center border-r ${theme.border}`}>排序</th>
                            <th className={`p-2 w-12 text-center border-r ${theme.border}`}>核對</th>
                            <th className={`p-2 w-12 text-center border-r ${theme.border}`}>編號</th>
                            <th className="p-2 min-w-[300px]">指示內容</th>
                            <th className="p-2 w-12 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y bg-white/10 ${theme.border.replace('border', 'divide')}`}>
                        {(Array.isArray(items) ? items : []).map((sign, sIdx) => {
                            const isChecked = !!sign.checked;
                            return (
                            <tr key={sIdx} className={`${isChecked ? 'opacity-60 grayscale-[0.5]' : 'bg-transparent'} transition-all hover:bg-white/40 group/row`}>
                                <td className={`p-2 text-center border-r bg-white/20 ${theme.border}`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <button onClick={() => onMove(sIdx, 'up')} className={`${theme.text} opacity-40 hover:opacity-100 transition-colors`}><ChevronUp size={14}/></button>
                                        <button onClick={() => onMove(sIdx, 'down')} className={`${theme.text} opacity-40 hover:opacity-100 transition-colors`}><ChevronDown size={14}/></button>
                                    </div>
                                </td>
                                <td className={`p-4 text-center border-r ${theme.border}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked} 
                                        onChange={(e) => onUpdate(sIdx, 'checked', e.target.checked)}
                                        className={`w-5 h-5 rounded cursor-pointer transition-all hover:scale-110 accent-indigo-600`}
                                    />
                                </td>
                                <td className={`p-4 border-r text-center font-bold ${theme.border} ${isChecked ? 'line-through opacity-40' : theme.text}`}>
                                    {sIdx + 1}
                                </td>
                                <td className="p-3">
                                    <textarea 
                                        className={`w-full bg-white/40 border rounded p-2 text-[10px] md:text-xs lg:text-sm font-black outline-none focus:bg-white transition-all shadow-sm min-h-[50px] resize-y ${theme.text} ${theme.border} ${isChecked ? 'line-through italic opacity-40' : ''}`}
                                        value={sign.instruction} 
                                        onChange={(e) => onUpdate(sIdx, 'instruction', e.target.value)}
                                        placeholder="行車指示..."
                                    />
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => onDelete(sIdx)} className={`p-2 rounded transition-all hover:bg-rose-50 text-slate-300 hover:text-rose-600 border border-transparent hover:border-rose-100`}>
                                        <Trash2 size={16} />
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
                className={`w-full h-8 md:h-10 lg:h-12 text-[10px] md:text-xs lg:text-sm font-bold border-t flex justify-center items-center transition-all gap-2 bg-white/60 backdrop-blur-sm ${theme.text} ${theme.border} ${theme.hover}`}
            >
                <Plus size={18} /> 新增行車指示
            </button>
        </div>
    );
};

export default BusRoadSignSection;
