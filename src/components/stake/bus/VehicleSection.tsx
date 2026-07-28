
import React from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { Plus, Trash2, Edit2, Search, ChevronUp, ChevronDown, Bus, Star, PlusCircle } from 'lucide-react';
import { BusVehicle } from '../../../../types';

interface VehicleSectionProps {
    vehicles: BusVehicle[];
    onAdd: () => void;
    onEdit: (v: BusVehicle) => void;
    onDelete: (v: BusVehicle) => void;
    isOpen: boolean;
    onToggle: () => void;
    sortKey: string;
    isDesc: boolean;
    onSort: (key: string) => void;
}

const VehicleSection: React.FC<VehicleSectionProps> = ({
    vehicles, onAdd, onEdit, onDelete, isOpen, onToggle, sortKey, isDesc, onSort
}) => {
    const { t, tString } = useI18n();
    const [search, setSearch] = React.useState('');

    const filtered = vehicles.filter(v => v.plate.includes(search) || v.companyName.includes(search));

    return (
        <section className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {/* Block Title Row */}
            <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100 bg-slate-50/30"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded text-white">
                        <Bus size={18} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none">{t('bus.vehicle_mgmt')}</h2>
                    </div>
                </div>
                <div className={`p-1.5 rounded transition-all ${isOpen ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </div>
            </div>

            {isOpen && (
                <div className="p-6 space-y-6">
                    {/* Action Row: Right Aligned Controls */}
                    <div className="flex flex-col md:flex-row justify-end gap-4">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="搜尋車牌號碼、所屬車行..."
                                className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded outline-none text-sm font-medium transition-all text-slate-900 focus:bg-white focus:border-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={onAdd}
                            className="bg-blue-600 text-white h-10 px-6 rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            <PlusCircle size={18}/> {t('bus.add_vehicle')}
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-slate-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('plate')}>{t('bus.plate')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{t('bus.belonging_company')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{t('bus.capacity')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">{t('bus.service_count', '服務次數')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">{t('bus.avg_rating', '平均評分')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{t('bus.status')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filtered.map(v => (
                                    <tr key={v.plate} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{v.plate}</td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">{v.companyName}</td>
                                        <td className="px-6 py-4 font-bold text-slate-600">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] border border-slate-200">{v.seats} 補位</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100">{v.serviceCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-1 rounded border border-amber-100 inline-flex">
                                                <Star size={14} className="fill-amber-400 text-amber-400" />
                                                <span className="font-bold text-amber-900">{v.avgRating?.toFixed(1) || '0.0'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${v.status === 'normal' || v.status === 'excellent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {t(`common.status.${v.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(v)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all active:scale-90"><Edit2 size={16}/></button>
                                                <button onClick={() => onDelete(v)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all active:scale-90"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                            {t('common.status.no_data', '目前無資料')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
};

export default VehicleSection;
