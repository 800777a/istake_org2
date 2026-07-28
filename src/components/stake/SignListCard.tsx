
import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Map, Plus, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RoadSignItem, BusRoute } from '../../../types';

interface SignListCardProps {
    busName: string;
    signs: BusRoute;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onAddItem: (type: 'outbound' | 'return') => void;
    onUpdateItem: (type: 'outbound' | 'return', idx: number, field: keyof RoadSignItem, value: any) => void;
    onRemoveItem: (type: 'outbound' | 'return', idx: number) => void;
    theme: { bg: string, text: string, border: string, header: string };
}

const SignListCard: React.FC<SignListCardProps> = ({
    busName, signs, isCollapsed, onToggleCollapse, onAddItem, onUpdateItem, onRemoveItem, theme
}) => {
    const { t, tString } = useI18n();

    const renderSignTable = (type: 'outbound' | 'return') => {
        const items = type === 'outbound' ? (signs.outboundRoadSigns || []) : (signs.returnRoadSigns || []);

        return (
            <div className="flex-1 min-w-[300px]">
                <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${theme.text}`}>
                        {type === 'outbound' ? t('route.outbound_signs') : t('route.return_signs')}
                    </h4>
                    <button onClick={() => onAddItem(type)} className="p-1 hover:bg-gray-200 rounded text-blue-600">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="space-y-1">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/50 p-1 rounded border border-transparent hover:border-gray-200 group">
                            <input 
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => onUpdateItem(type, idx, 'checked', e.target.checked)}
                                className="w-3 h-3"
                            />
                            <div className="flex flex-col flex-1 gap-1">
                                <input 
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => onUpdateItem(type, idx, 'label', e.target.value)}
                                    className={`bg-transparent outline-none text-xs font-bold ${item.checked ? 'text-blue-600' : ''}`}
                                    placeholder={t('route.sign_label_placeholder')}
                                />
                                <input 
                                    type="text"
                                    value={item.instruction}
                                    onChange={(e) => onUpdateItem(type, idx, 'instruction', e.target.value)}
                                    className="bg-transparent outline-none text-[10px] text-gray-500"
                                    placeholder={t('route.sign_instruction_placeholder')}
                                />
                            </div>
                            <button onClick={() => onRemoveItem(type, idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-[10px] text-gray-400 italic">{t('common.no_data')}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className={`${theme.bg} rounded border ${theme.border} overflow-hidden shadow-sm transition-all duration-300`}>
            <div 
                className={`px-4 py-3 flex items-center justify-between cursor-pointer ${theme.header}`}
                onClick={onToggleCollapse}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded bg-white/80 ${theme.text} shadow-sm`}>
                        <Map size={20} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase tracking-tighter ${theme.text}`}>{busName}</h3>
                        <p className="text-[10px] opacity-60 font-bold uppercase">{t('route.road_signs')}</p>
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
                            {renderSignTable('outbound')}
                            <div className="w-px bg-gray-200 hidden md:block" />
                            {renderSignTable('return')}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SignListCard;
