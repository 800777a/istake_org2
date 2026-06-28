
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Search, ChevronUp, ChevronDown, User } from 'lucide-react';
import { BusDriver } from '../../../../types';

interface DriverSectionProps {
    drivers: BusDriver[];
    onAdd: () => void;
    onEdit: (d: BusDriver) => void;
    onDelete: (d: BusDriver) => void;
    isOpen: boolean;
    onToggle: () => void;
    sortKey: string;
    isDesc: boolean;
    onSort: (key: string) => void;
}

const DriverSection: React.FC<DriverSectionProps> = ({
    drivers, onAdd, onEdit, onDelete, isOpen, onToggle, sortKey, isDesc, onSort
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = React.useState('');

    const filtered = drivers.filter(d => d.name.includes(search) || d.phone.includes(search));

    return (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
                className="px-6 py-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <User size={20} />
                    </div>
                    <h2 className="font-black text-xl uppercase tracking-tighter italic text-gray-900">{t('bus.driver_mgmt')}</h2>
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
                                placeholder={t('bus.search_driver_placeholder')}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <button 
                            onClick={onAdd}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            <Plus size={20}/> {t('bus.add_driver')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase tracking-widest border-b">
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => onSort('name')}>{t('bus.driver_name')}</th>
                                    <th className="px-4 py-3">{t('bus.phone')}</th>
                                    <th className="px-4 py-3">{t('bus.belonging_company')}</th>
                                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {filtered.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-3 font-bold text-gray-900">{d.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.companyName}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(d)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => onDelete(d)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
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

export default DriverSection;
