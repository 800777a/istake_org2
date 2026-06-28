
import { useState } from 'react';
import { GlobalSettings, BusCompany, BusVehicle, BusDriver } from '../types';

export function useBusManagement(settings: GlobalSettings, onUpdateSettings: (settings: GlobalSettings) => void) {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        company: true,
        vehicle: true,
        driver: true,
        rating: true
    });

    const toggleSection = (s: string) => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

    const [sorts, setSorts] = useState<Record<string, { key: string, desc: boolean }>>({
        company: { key: 'id', desc: false },
        vehicle: { key: 'plate', desc: false },
        driver: { key: 'name', desc: false },
        rating: { key: 'eventDate', desc: true }
    });

    const toggleSort = (section: string, key: string) => {
        setSorts(prev => ({
            ...prev,
            [section]: { key, desc: prev[section].key === key ? !prev[section].desc : false }
        }));
    };

    const saveSettings = (updated: GlobalSettings) => {
        onUpdateSettings(updated);
    };

    return {
        openSections, toggleSection,
        sorts, toggleSort,
        saveSettings
    };
}
