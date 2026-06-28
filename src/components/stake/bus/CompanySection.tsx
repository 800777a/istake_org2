
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Search, ChevronUp, ChevronDown, Truck } from 'lucide-react';
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
    const { t } = useTranslation();
    const [search, setSearch] = React.useState('');

    const filtered = companies.filter(c => c.name1.includes(search) || c.manager.includes(search));

    return (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
                className="px-6 py-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Truck size={20} />
                    </div>
                    <h2 className="font-black text-xl uppercase tracking-tighter italic text-gray-900">{t('bus.company_mgmt')}</h2>
                </div>
                {isOpen ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>

            {isOpen && (
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={t('bus.search_placeholder')}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <button 
                            onClick={onAdd}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                            <Plus size={20}/> {t('bus.add_company')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase tracking-widest border-b">
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => onSort('name1')}>{t('bus.company_name')}</th>
                                    <th className="px-4 py-3">{t('bus.manager')}</th>
                                    <th className="px-4 py-3">{t('bus.phone')}</th>
                                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-3 font-bold text-gray-900">{c.name1}</td>
                                        <td className="px-4 py-3 text-gray-600">{c.manager}</td>
                                        <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(c)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => onDelete(c)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CompanySection;
