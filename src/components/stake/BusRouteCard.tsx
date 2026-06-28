
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bus, Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BusRoute, RoutePlanItem } from '../../../types';

interface BusRouteCardProps {
    busName: string;
    route: BusRoute;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onFieldUpdate: (field: keyof BusRoute, value: string) => void;
    onAddItem: (type: 'outbound' | 'return') => void;
    onUpdateItem: (type: 'outbound' | 'return', idx: number, field: keyof RoutePlanItem, value: string) => void;
    onRemoveItem: (type: 'outbound' | 'return', idx: number) => void;
    theme: { bg: string, text: string, border: string, header: string };
}

const BusRouteCard: React.FC<BusRouteCardProps> = ({
    busName, route, isCollapsed, onToggleCollapse, onFieldUpdate, onAddItem, onUpdateItem, onRemoveItem, theme
}) => {
    const { t } = useTranslation();

    const renderTripTable = (type: 'outbound' | 'return') => {
        const items = type === 'outbound' ? (route.outbound || []) : (route.returnTrip || []);
        const titleField = type === 'outbound' ? 'outboundTitle' : 'returnTitle';

        return (
            <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-2 mb-2">
                    <input 
                        type="text" 
                        value={route[titleField] || ''} 
                        onChange={(e) => onFieldUpdate(titleField as keyof BusRoute, e.target.value)}
                        placeholder={type === 'outbound' ? t('route.outbound_title_placeholder') : t('route.return_title_placeholder')}
                        className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none font-bold text-sm flex-1"
                    />
                    <button onClick={() => onAddItem(type)} className="p-1 hover:bg-gray-200 rounded text-blue-600">
                        <Plus size={16} />
                    </button>
                </div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-1 w-1/2">{t('route.location')}</th>
                            <th className="text-left py-1 w-1/4">{t('route.time')}</th>
                            <th className="py-1 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                                <td className="py-1">
                                    <input 
                                        type="text" value={item.location} 
                                        onChange={(e) => onUpdateItem(type, idx, 'location', e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    />
                                </td>
                                <td className="py-1">
                                    <input 
                                        type="text" value={item.arrivalTime} 
                                        onChange={(e) => onUpdateItem(type, idx, 'arrivalTime', e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    />
                                </td>
                                <td className="py-1 text-center">
                                    <button onClick={() => onRemoveItem(type, idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={`${theme.bg} rounded-2xl border ${theme.border} overflow-hidden shadow-sm transition-all duration-300`}>
            <div 
                className={`px-4 py-3 flex items-center justify-between cursor-pointer ${theme.header}`}
                onClick={onToggleCollapse}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-white/80 ${theme.text} shadow-sm`}>
                        <Bus size={20} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase tracking-tighter ${theme.text}`}>{busName}</h3>
                        <p className="text-[10px] opacity-60 font-bold uppercase">{t('route.bus_route_plan')}</p>
                    </div>
                </div>
                {isCollapsed ? <ChevronDown size={20} className={theme.text} /> : <ChevronUp size={20} className={theme.text} />}
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="p-4 flex flex-col md:flex-row gap-6">
                            {renderTripTable('outbound')}
                            <div className="w-px bg-gray-200 hidden md:block" />
                            {renderTripTable('return')}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BusRouteCard;
