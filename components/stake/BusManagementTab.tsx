
import React, { useState } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData, GlobalSettings, BusCompany, BusVehicle, BusDriver } from '../../types';
import { updateSettings } from '../../services/settingsService';
import Toast, { ToastType } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import { useBusManagement } from '../../hooks/useBusManagement';
import CompanySection from '../../src/components/stake/bus/CompanySection';
import VehicleSection from '../../src/components/stake/bus/VehicleSection';
import DriverSection from '../../src/components/stake/bus/DriverSection';
import RatingSection from '../../src/components/stake/bus/RatingSection';
import CompanyModal from '../../src/components/stake/bus/CompanyModal';
import VehicleModal from '../../src/components/stake/bus/VehicleModal';
import DriverModal from '../../src/components/stake/bus/DriverModal';

interface BusManagementTabProps {
    currentEvent: EventData | null;
    registrations: any[];
    settings: GlobalSettings;
    onUpdateSettings: (settings: GlobalSettings) => void;
}

import { Settings, Bus, Users, Star, Truck, PlusCircle } from 'lucide-react';

const BusManagementTab: React.FC<BusManagementTabProps> = ({ currentEvent, settings, onUpdateSettings }) => {
    const { t, tString } = useI18n();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const {
        openSections, toggleSection,
        sorts, toggleSort,
        saveSettings
    } = useBusManagement(settings, onUpdateSettings);

    const [modalState, setModalState] = useState<{ type: 'company' | 'vehicle' | 'driver' | null, editing: any | null }>({ type: null, editing: null });

    const handleAdd = (type: 'company' | 'vehicle' | 'driver') => setModalState({ type, editing: null });
    const handleEdit = (type: 'company' | 'vehicle' | 'driver', item: any) => setModalState({ type, editing: item });

    const handleSaveCompany = async (data: any) => {
        let newCompanies = [...(settings.busCompanies || [])];
        if (modalState.editing) {
            newCompanies = newCompanies.map(c => c.id === modalState.editing.id ? { ...c, ...data } : c);
        } else {
            newCompanies.push({ id: Date.now().toString(), ...data, serviceCount: 0, totalRating: 0, avgRating: 0, status: 'normal', notes: '', address: '' });
        }
        await updateSettings({ ...settings, busCompanies: newCompanies });
        onUpdateSettings({ ...settings, busCompanies: newCompanies });
        setModalState({ type: null, editing: null });
        setMsg(t('common.status.success'));
    };

    const handleSaveVehicle = async (data: any) => {
        let newVehicles = [...(settings.busVehicles || [])];
        if (modalState.editing) {
            newVehicles = newVehicles.map(v => v.plate === modalState.editing.plate ? { ...v, ...data } : v);
        } else {
            if (newVehicles.find(v => v.plate === data.plate)) {
                setMsgType('error');
                setMsg(t('bus.alerts.plateExists'));
                return;
            }
            newVehicles.push({ ...data, serviceCount: 0, totalRating: 0, avgRating: 0, status: 'normal', notes: '' });
        }
        await updateSettings({ ...settings, busVehicles: newVehicles });
        onUpdateSettings({ ...settings, busVehicles: newVehicles });
        setModalState({ type: null, editing: null });
        setMsg(t('common.status.success'));
    };

    const handleSaveDriver = async (data: any) => {
        let newDrivers = [...(settings.busDrivers || [])];
        if (modalState.editing) {
            newDrivers = newDrivers.map(d => d.id === modalState.editing.id ? { ...d, ...data } : d);
        } else {
            newDrivers.push({ id: Date.now().toString(), ...data, serviceCount: 0, totalRating: 0, avgRating: 0, status: 'normal', notes: '' });
        }
        await updateSettings({ ...settings, busDrivers: newDrivers });
        onUpdateSettings({ ...settings, busDrivers: newDrivers });
        setModalState({ type: null, editing: null });
        setMsg(t('common.status.success'));
    };

    const handleDelete = (type: 'company' | 'vehicle' | 'driver', item: any) => {
        setConfirmConfig({
            isOpen: true,
            title: t('common.confirm_delete'),
            message: t('common.confirm_delete_msg'),
            onConfirm: async () => {
                let updatedSettings = { ...settings };
                if (type === 'company') updatedSettings.busCompanies = (settings.busCompanies || []).filter(c => c.id !== item.id);
                if (type === 'vehicle') updatedSettings.busVehicles = (settings.busVehicles || []).filter(v => v.plate !== item.plate);
                if (type === 'driver') updatedSettings.busDrivers = (settings.busDrivers || []).filter(d => d.id !== item.id);
                
                await updateSettings(updatedSettings);
                onUpdateSettings(updatedSettings);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setMsg(t('common.status.success'));
            }
        });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} 
                onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
            />

            {/* Main Header conforming to 60-30-10 & RWD rules */}
            <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-6">
                {/* Row 1: Title Row Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded border border-white/10 shadow-inner">
                        <Truck className="text-blue-300" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {t('stake.admin.tabs.bus_management', '特約車隊管理')}
                        </h2>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                            Fleet & Personnel Database Management
                        </p>
                    </div>
                </div>
                
                {/* Row 2: Stats Aligned Right beneath title row */}
                <div className="flex flex-wrap justify-end gap-3">
                    <div className="bg-white/10 border border-white/10 px-5 py-2.5 rounded flex flex-col items-center min-w-[80px] shadow-sm backdrop-blur-sm">
                        <span className="text-[10px] opacity-40 uppercase tracking-widest leading-none mb-2 font-black">車行</span>
                        <span className="text-base font-black leading-none">{(settings.busCompanies || []).length}</span>
                    </div>
                    <div className="bg-white/10 border border-white/10 px-5 py-2.5 rounded flex flex-col items-center min-w-[80px] shadow-sm backdrop-blur-sm">
                        <span className="text-[10px] opacity-40 uppercase tracking-widest leading-none mb-2 font-black">車輛</span>
                        <span className="text-base font-black leading-none">{(settings.busVehicles || []).length}</span>
                    </div>
                    <div className="bg-white/10 border border-white/10 px-5 py-2.5 rounded flex flex-col items-center min-w-[80px] shadow-sm backdrop-blur-sm">
                        <span className="text-[10px] opacity-40 uppercase tracking-widest leading-none mb-2 font-black">司機</span>
                        <span className="text-base font-black leading-none">{(settings.busDrivers || []).length}</span>
                    </div>
                    <div className="bg-blue-600 border border-blue-500 px-5 py-2.5 rounded flex flex-col items-center min-w-[80px] shadow-md">
                        <span className="text-[10px] text-blue-200 uppercase tracking-widest leading-none mb-2 font-black">評分</span>
                        <span className="text-base font-black leading-none">4.8</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <CompanySection 
                    companies={settings.busCompanies || []} isOpen={openSections.company} onToggle={() => toggleSection('company')}
                    onAdd={() => handleAdd('company')} onEdit={(c) => handleEdit('company', c)} onDelete={(c) => handleDelete('company', c)}
                    sortKey={sorts.company.key} isDesc={sorts.company.desc} onSort={(k) => toggleSort('company', k)}
                />

                <VehicleSection 
                    vehicles={settings.busVehicles || []} isOpen={openSections.vehicle} onToggle={() => toggleSection('vehicle')}
                    onAdd={() => handleAdd('vehicle')} onEdit={(v) => handleEdit('vehicle', v)} onDelete={(v) => handleDelete('vehicle', v)}
                    sortKey={sorts.vehicle.key} isDesc={sorts.vehicle.desc} onSort={(k) => toggleSort('vehicle', k)}
                />

                <DriverSection 
                    drivers={settings.busDrivers || []} isOpen={openSections.driver} onToggle={() => toggleSection('driver')}
                    onAdd={() => handleAdd('driver')} onEdit={(d) => handleEdit('driver', d)} onDelete={(d) => handleDelete('driver', d)}
                    sortKey={sorts.driver.key} isDesc={sorts.driver.desc} onSort={(k) => toggleSort('driver', k)}
                />

                <RatingSection 
                    ratings={settings.busRatings || []} isOpen={openSections.rating} onToggle={() => toggleSection('rating')}
                    sortKey={sorts.rating.key} isDesc={sorts.rating.desc} onSort={(k) => toggleSort('rating', k)}
                />
            </div>


            <CompanyModal 
                isOpen={modalState.type === 'company'} onClose={() => setModalState({ type: null, editing: null })}
                onSave={handleSaveCompany} editingCompany={modalState.editing}
            />

            <VehicleModal 
                isOpen={modalState.type === 'vehicle'} onClose={() => setModalState({ type: null, editing: null })}
                onSave={handleSaveVehicle} editingVehicle={modalState.editing}
                companies={settings.busCompanies || []}
            />

            <DriverModal 
                isOpen={modalState.type === 'driver'} onClose={() => setModalState({ type: null, editing: null })}
                onSave={handleSaveDriver} editingDriver={modalState.editing}
                companies={settings.busCompanies || []} vehicles={settings.busVehicles || []}
            />
        </div>
    );
};

export default BusManagementTab;
