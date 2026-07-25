
import React from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { Plus, Trash2, Edit2, Search, ChevronUp, ChevronDown, Truck, Star, PlusCircle } from 'lucide-react';
import { BusCompany, GlobalSettings } from '../../../../types';

interface CompanySectionProps {
    companies: BusCompany[];
    onAdd: () => void;
    onEdit: (c: BusCompany) => void;
    onDelete: (c: BusCompany) => void;
    isOpen: boolean;
    onToggle: () => void;
    sortKey: string;
    isDesc: boolean;
    onSort: (key: string) => void;
}

const CompanySection: React.FC<CompanySectionProps> = ({
    companies, onAdd, onEdit, onDelete, isOpen, onToggle, sortKey, isDesc, onSort
}) => {
    const { t, tString } = useI18n();
    const [search, setSearch] = React.useState('');

    const filtered = companies.filter(c => c.name1.includes(search) || c.manager.includes(search));

    return (
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {/* Block Title Row */}
            <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100 bg-slate-50/30"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded-lg text-white">
                        <Truck size={18} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none">{t('bus.company_mgmt')}</h2>
                    </div>
                </div>
                <div className={`p-1.5 rounded-md transition-all ${isOpen ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
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
                                placeholder="搜尋車行名稱、負責人..."
                                className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-medium transition-all text-slate-900 focus:bg-white focus:border-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={onAdd}
                            className="bg-blue-600 text-white h-10 px-6 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            <PlusCircle size={18}/> {t('bus.add_company')}
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('name1')}>{t('bus.company_name')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{t('bus.manager')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">{t('bus.service_count', '服務總次')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">{t('bus.avg_rating', '平均評分')}</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{c.name1}</td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">{c.manager}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">{c.serviceCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-1 rounded border border-amber-100 inline-flex">
                                                <Star size={14} className="fill-amber-400 text-amber-400" />
                                                <span className="font-bold text-amber-900">{c.avgRating?.toFixed(1) || '0.0'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"><Edit2 size={16}/></button>
                                                <button onClick={() => onDelete(c)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-90"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
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

export default CompanySection;
