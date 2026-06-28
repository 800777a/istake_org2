
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Search, ChevronUp, ChevronDown, Bus } from 'lucide-react';
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
    const { t } = useTranslation();
    const [search, setSearch] = React.useState('');

    const filtered = vehicles.filter(v => v.plate.includes(search) || v.companyName.includes(search));

    return (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
                className="px-6 py-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                        <Bus size={20} />
                    </div>
                    <h2 className="font-black text-xl uppercase tracking-tighter italic text-gray-900">{t('bus.vehicle_mgmt')}</h2>
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
                                placeholder={t('bus.search_plate_placeholder')}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                            />
                        </div>
                        <button 
                            onClick={onAdd}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                        >
                            <Plus size={20}/> {t('bus.add_vehicle')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase tracking-widest border-b">
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => onSort('plate')}>{t('bus.plate')}</th>
                                    <th className="px-4 py-3">{t('bus.belonging_company')}</th>
                                    <th className="px-4 py-3">{t('bus.capacity')}</th>
                                    <th className="px-4 py-3">{t('bus.status')}</th>
                                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {filtered.map(v => (
                                    <tr key={v.plate} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-3 font-bold text-gray-900">{v.plate}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.companyName}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.seats}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.status === 'normal' || v.status === 'excellent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {t(`common.status.${v.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(v)} className="p-2 hover:bg-green-50 text-green-600 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => onDelete(v)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
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

export default VehicleSection;
