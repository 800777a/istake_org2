
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, GlobalSettings } from '../../types';
import { Bus, Map, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmDialog from '../ConfirmDialog';
import TempleScheduleSection from './TempleScheduleSection';
import Toast, { ToastType } from '../Toast';
import { useRouteManagement } from '../../hooks/useRouteManagement';
import BusRouteCard from '../../src/components/stake/BusRouteCard';
import SignListCard from '../../src/components/stake/SignListCard';

interface RouteTabProps {
    currentEvent: EventData;
    settings: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

const BUS_THEMES = [
    { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', header: 'bg-orange-100' },
    { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', header: 'bg-yellow-100' },
    { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', header: 'bg-green-100' },
    { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', header: 'bg-cyan-100' },
    { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', header: 'bg-blue-100' },
    { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', header: 'bg-indigo-100' },
    { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', header: 'bg-purple-100' },
];

const SIGN_THEMES = [
    { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', header: 'bg-blue-100' },
    { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', header: 'bg-indigo-100' },
    { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', header: 'bg-purple-100' },
    { bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', header: 'bg-pink-100' },
    { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', header: 'bg-red-100' },
    { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', header: 'bg-orange-100' },
    { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', header: 'bg-green-100' },
];

const RouteTab: React.FC<RouteTabProps> = ({ currentEvent, settings, onUpdateEvent, onPushToEditor }) => {
    const { t } = useTranslation();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const {
        collapsedBuses, toggleBusCollapse,
        collapsedSigns, toggleSignCollapse,
        handleBusRouteFieldUpdate,
        addRouteItem, updateRouteItem, removeRouteItem,
        addSignItem, updateSignItem, removeSignItem
    } = useRouteManagement(currentEvent, onUpdateEvent);

    const busNames = (currentEvent.busConfigs || []).map(bc => bc.name);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <ConfirmDialog isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={() => { confirmConfig.onConfirm(); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} />

            <TempleScheduleSection currentEvent={currentEvent} onUpdateEvent={onUpdateEvent} />

            <section>
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                            <Bus size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">{t('route.bus_plans_title')}</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('route.bus_plans_subtitle')}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {busNames.map((bus, idx) => (
                        <BusRouteCard 
                            key={bus} busName={bus} theme={BUS_THEMES[idx % BUS_THEMES.length]}
                            route={(currentEvent.busRoutes || {})[bus] || { 
                                outboundTitle: '', 
                                returnTitle: '', 
                                outbound: [], 
                                returnTrip: [],
                                outboundRoadSigns: [],
                                returnRoadSigns: []
                            }}
                            isCollapsed={!!collapsedBuses[bus]} onToggleCollapse={() => toggleBusCollapse(bus)}
                            onFieldUpdate={(field, val) => handleBusRouteFieldUpdate(bus, field, val)}
                            onAddItem={(type) => addRouteItem(bus, type)}
                            onUpdateItem={(type, idx, field, val) => updateRouteItem(bus, type, idx, field, val)}
                            onRemoveItem={(type, idx) => removeRouteItem(bus, type, idx)}
                        />
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Map size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">{t('route.road_signs_title')}</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('route.road_signs_subtitle')}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {busNames.map((bus, idx) => (
                        <SignListCard 
                            key={bus} busName={bus} theme={SIGN_THEMES[idx % SIGN_THEMES.length]}
                            signs={(currentEvent.busRoutes || {})[bus] || { 
                                outboundTitle: '', 
                                returnTitle: '', 
                                outbound: [], 
                                returnTrip: [],
                                outboundRoadSigns: [], 
                                returnRoadSigns: [] 
                            }}
                            isCollapsed={!!collapsedSigns[bus]} onToggleCollapse={() => toggleSignCollapse(bus)}
                            onAddItem={(type) => addSignItem(bus, type)}
                            onUpdateItem={(type, idx, field, val) => updateSignItem(bus, type, idx, field, val)}
                            onRemoveItem={(type, idx) => removeSignItem(bus, type, idx)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default RouteTab;
