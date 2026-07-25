
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData, GlobalSettings, StaffContact, ServicePerson } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { Phone, Download, Upload, Plus, ShieldCheck, Edit2, Trash2, Check, X, List, LayoutDashboard, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

import ConfirmDialog from '../ConfirmDialog';
import { RainbowCard } from './fee-config/RainbowCard';
import Toast from '../Toast';

interface CommTabProps {
    currentEvent: EventData;
    settings: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
}

const CommTab: React.FC<CommTabProps> = ({ currentEvent, settings, onUpdateEvent }) => {
    const { t, tString } = useI18n();
    
    // UI States
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<'success' | 'error'>('success');
    const [remountKey, setRemountKey] = useState(0);

    // Orientation handling for RWD reset
    useEffect(() => {
        const handleResize = () => setRemountKey(k => k + 1);
        window.addEventListener('orientationchange', handleResize);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('orientationchange', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 1. Staff List (Service Personnel) States
    const [newServicePerson, setNewServicePerson] = useState<ServicePerson>({ id: '', order: 0, unit: '', calling: '', name: '' });
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [editServiceValues, setEditServiceValues] = useState<ServicePerson | null>(null);

    // 2. Contact Directory States
    const [staffContacts, setStaffContacts] = useState<StaffContact[]>([]);
    const [newContact, setNewContact] = useState<StaffContact>({ id: '', unit: '', position: '', name: '', gender: 'brother', phone: '' });
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Refs for horizontal scrolling
    const wrapperRefs = React.useRef<{[key: string]: HTMLDivElement | null}>({});
    const scrollTable = (key: string, direction: 'left' | 'right') => {
        const wrapper = wrapperRefs.current[key];
        if (wrapper) {
            const amount = direction === 'left' ? -200 : 200;
            wrapper.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    // Confirm Dialog State for Delete Service Person
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    useEffect(() => {
        const manualContacts = currentEvent.staff_directory || [];
        
        // Auto-include service personnel from home page
        const autoContacts = (currentEvent.servicePersonnel || []).map(sp => ({
            id: `AUTO-${sp.id}`, 
            unit: sp.unit,
            position: sp.calling,
            name: sp.name,
            gender: 'brother',
            phone: '', 
            isAuto: true
        }));

        setStaffContacts([...manualContacts, ...autoContacts]);
    }, [currentEvent]);

    // --- Service Personnel Handlers ---
    const sortedServicePersonnel = useMemo(() => {
        return [...(currentEvent.servicePersonnel || [])].sort((a, b) => a.order - b.order);
    }, [currentEvent.servicePersonnel]);

    const handleAddServicePerson = () => {
        const newItem = { ...newServicePerson, id: `SP-${Date.now()}` };
        const newList = [...(currentEvent.servicePersonnel || []), newItem];
        const updated = { ...currentEvent, servicePersonnel: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
        setNewServicePerson({ id: '', order: 0, unit: '', calling: '', name: '' });
    };

    const triggerDeleteServicePerson = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: t('common.delete_confirm', '刪除確認'),
            message: t('comm.msg.delete_service_person_confirm', '確定要刪除此服務同工資料嗎？'),
            onConfirm: () => {
                const newList = (currentEvent.servicePersonnel || []).filter(p => p.id !== id);
                const updated = { ...currentEvent, servicePersonnel: newList };
                updateEvent(updated);
                onUpdateEvent(updated);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const startEditServicePerson = (p: ServicePerson) => {
        setEditingServiceId(p.id);
        setEditServiceValues({ ...p });
    };

    const saveEditServicePerson = () => {
        if (!editServiceValues) return;
        const newList = (currentEvent.servicePersonnel || []).map(p => p.id === editingServiceId ? editServiceValues : p);
        const updated = { ...currentEvent, servicePersonnel: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
        setEditingServiceId(null);
        setEditServiceValues(null);
    };

    const handleImportServicePersonnel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (Array.isArray(data)) {
                    const updated = { ...currentEvent, servicePersonnel: data };
                    updateEvent(updated);
                    onUpdateEvent(updated);
                    setAlertMsg(t('comm.msg.import_success', '同工名單匯入成功'));
                }
            } catch (err) {
                setAlertMsg(t('comm.msg.import_failed', '同工名單匯入失敗'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExportServicePersonnel = () => {
        const blob = new Blob([JSON.stringify(sortedServicePersonnel, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service_personnel_${currentEvent.event_date}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // --- Directory Handlers ---
    const handleAddContact = () => {
        if (!newContact.name) return;
        
        const manualContacts = currentEvent.staff_directory || [];
        
        let newList;
        if (editingContactId && !editingContactId.startsWith('AUTO-')) {
            newList = manualContacts.map(c => c.id === editingContactId ? { ...newContact, id: editingContactId } : c);
            setEditingContactId(null);
        } else {
            const newItem = { ...newContact, id: `CT-${Date.now()}` };
            newList = [...manualContacts, newItem];
        }
        
        setNewContact({ id: '', unit: '', position: '', name: '', gender: 'brother', phone: '' });
        
        const updated = { ...currentEvent, staff_directory: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleEditContact = (contact: StaffContact & { isAuto?: boolean }) => {
        if (contact.isAuto) {
            setAlertMsg(t('comm.msg.auto_imported_hint', '此為自動匯入的「服務同工」資料，請於上方「同工名單」區塊修改。'));
            return;
        }
        setNewContact(contact);
        setEditingContactId(contact.id);
    };

    const handleDeleteContact = (id: string) => {
        if (id.startsWith('AUTO-')) {
            setAlertMsg(t('comm.msg.auto_imported_delete_hint', '此為自動匯入的資料，無法在此刪除。'));
            return;
        }
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        const manualContacts = currentEvent.staff_directory || [];
        const newList = manualContacts.filter(c => c.id !== deleteId);
        const updated = { ...currentEvent, staff_directory: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
        setDeleteId(null);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(staffContacts, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff_contacts_${currentEvent.event_date}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (Array.isArray(data)) {
                    const cleanData = data.filter((d: any) => !d.id?.startsWith('AUTO-'));
                    const updated = { ...currentEvent, staff_directory: cleanData };
                    updateEvent(updated);
                    onUpdateEvent(updated);
                    setAlertMsg(t('comm.msg.directory_import_success', '通訊錄匯入成功'));
                }
            } catch (err) {
                setAlertMsg(t('comm.msg.directory_import_failed', '通訊錄匯入失敗'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div key={remountKey} className={`space-y-6 animate-fade-in pb-20 w-full ${viewMode === 'card' ? 'px-2' : ''}`}>
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                isDangerous={true}
            />

            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}

            {/* Header conforming to Rainbow Depth Level 1 */}
            <div className="bg-indigo-900 text-white p-3 md:p-4 rounded-[8px] shadow-sm flex items-center gap-3 overflow-hidden">
                <Phone className="w-5 h-5 md:w-6 md:h-6 text-indigo-300 shrink-0" />
                <h2 className="text-sm md:text-xl font-black tracking-tight truncate font-title flex-1">
                    {t('comm.tab_title', '通訊與同工聯繫管理')}
                </h2>
            </div>

            {/* ViewMode Switcher Row */}
            <div className="flex justify-end pr-2">
                <div className="flex bg-white p-1 rounded-lg border border-indigo-200 shadow-inner">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[11px] font-bold ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <List size={14} />
                        <span>表格</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('card')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[11px] font-bold ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <LayoutDashboard size={14} />
                        <span>卡片</span>
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Staff List (Service Personnel) - Rainbow: Indigo/Violet */}
                <RainbowCard
                    title={t('comm.staff_list', '服務同工名單')}
                    icon={<ShieldCheck size={18} />}
                    colorIndex={5}
                >
                    <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                            <label className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-indigo-50 cursor-pointer font-bold shadow-sm transition-all active:scale-95">
                                <Upload className="w-3 h-3 mr-1.5"/> {t('common.import', '匯入')}<input type="file" className="hidden" accept=".json" onChange={handleImportServicePersonnel}/>
                            </label>
                            <button 
                                onClick={handleExportServicePersonnel} 
                                className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-indigo-50 font-bold shadow-sm transition-all active:scale-95"
                            >
                                <Download className="w-3 h-3 mr-1.5"/> {t('common.export', '匯出')}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {viewMode === 'table' ? (
                                <div className="space-y-0">
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-white/50 border-b border-slate-200/50 md:hidden">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                            <ArrowUpDown size={10} />
                                            <span>{t('common.scroll_hint', '左右滑動或點擊按鈕')}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => scrollTable('servicePersonnel', 'left')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button 
                                                onClick={() => scrollTable('servicePersonnel', 'right')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div 
                                        ref={el => wrapperRefs.current['servicePersonnel'] = el}
                                        className="dense-table-wrapper"
                                    >
                                        <table className="dense-table">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr className="font-title">
                                                    <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600 w-16">{t('common.order', '序')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600 w-24">{t('common.unit', '單位')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.position', '職位')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.name', '姓名')}</th>
                                                    <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600 w-24">{t('common.actions', '操作')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {sortedServicePersonnel.map(p => (
                                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                                        {editingServiceId === p.id && editServiceValues ? (
                                                            <>
                                                                <td className="px-2 py-2"><input type="number" className="w-full h-8 border rounded px-1 text-center text-xs" value={editServiceValues.order} onChange={e => setEditServiceValues({...editServiceValues, order: parseInt(e.target.value)})} /></td>
                                                                <td className="px-2 py-2">
                                                                    <select className="w-full h-8 border rounded px-1 text-xs" value={editServiceValues.unit} onChange={e => setEditServiceValues({...editServiceValues, unit: e.target.value})}>
                                                                        <option value="">{tString('common.select', '選擇')}</option>
                                                                        {[...settings.units, tString('common.stake', '支聯會')].map(u => <option key={u} value={u}>{u}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-2"><input type="text" className="w-full h-8 border rounded px-2 text-xs" value={editServiceValues.calling} onChange={e => setEditServiceValues({...editServiceValues, calling: e.target.value})} /></td>
                                                                <td className="px-2 py-2"><input type="text" className="w-full h-8 border rounded px-2 text-xs" value={editServiceValues.name} onChange={e => setEditServiceValues({...editServiceValues, name: e.target.value})} /></td>
                                                                <td className="px-2 py-2 text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button onClick={saveEditServicePerson} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"><Check size={16}/></button>
                                                                        <button onClick={() => setEditingServiceId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-all"><X size={16}/></button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 text-center text-[10px] font-black text-slate-400">{p.order}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black border border-indigo-100 whitespace-nowrap">
                                                                        {p.unit}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-slate-500 font-bold">{p.calling}</td>
                                                                <td className="px-4 py-3 text-xs font-black text-slate-900">{p.name}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button onClick={() => startEditServicePerson(p)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-all"><Edit2 size={14}/></button>
                                                                        <button onClick={() => triggerDeleteServicePerson(p.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14}/></button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                                <tr className="bg-indigo-50/30">
                                                    <td className="p-2"><input type="number" placeholder="#" className="w-full h-9 border border-indigo-200 rounded-lg px-1 text-center text-xs bg-white" value={newServicePerson.order} onChange={e => setNewServicePerson({...newServicePerson, order: parseInt(e.target.value)})} /></td>
                                                    <td className="p-2">
                                                        <select className="w-full h-9 border border-indigo-200 rounded-lg px-2 text-xs bg-white" value={newServicePerson.unit} onChange={e => setNewServicePerson({...newServicePerson, unit: e.target.value})}>
                                                            <option value="">{tString('common.unit', '單位')}</option>
                                                            {[...settings.units, tString('common.stake', '支聯會')].map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-2"><input type="text" placeholder={t('common.position', "職位")} className="w-full h-9 border border-indigo-200 rounded-lg px-3 text-xs bg-white" value={newServicePerson.calling} onChange={e => setNewServicePerson({...newServicePerson, calling: e.target.value})} /></td>
                                                    <td className="p-2"><input type="text" placeholder={t('common.name', "姓名")} className="w-full h-9 border border-indigo-200 rounded-lg px-3 text-xs bg-white" value={newServicePerson.name} onChange={e => setNewServicePerson({...newServicePerson, name: e.target.value})} /></td>
                                                    <td className="p-2 text-center">
                                                        <button 
                                                            onClick={handleAddServicePerson} 
                                                            disabled={!newServicePerson.name} 
                                                            className="bg-indigo-600 text-white h-9 px-4 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-1 w-full"
                                                        >
                                                            <Plus size={14} /> {t('common.add', '新增')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                                    {sortedServicePersonnel.map(p => (
                                        <div key={p.id} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-400">#{p.order}</span>
                                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">
                                                            {p.unit}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900">{p.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.calling}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => startEditServicePerson(p)} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                                    <button onClick={() => triggerDeleteServicePerson(p.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Inline Add Card */}
                                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-dashed border-indigo-300 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder={t('common.order', '序')} className="h-8 border rounded-md px-2 text-[11px]" value={newServicePerson.order} onChange={e => setNewServicePerson({...newServicePerson, order: parseInt(e.target.value)})} />
                                            <select className="h-8 border rounded-md px-2 text-[11px] bg-white" value={newServicePerson.unit} onChange={e => setNewServicePerson({...newServicePerson, unit: e.target.value})}>
                                                <option value="">{tString('common.unit', '單位')}</option>
                                                {[...settings.units, tString('common.stake', '支聯會')].map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        <input type="text" placeholder={t('common.position', '職位')} className="w-full h-8 border rounded-md px-2 text-[11px]" value={newServicePerson.calling} onChange={e => setNewServicePerson({...newServicePerson, calling: e.target.value})} />
                                        <input type="text" placeholder={t('common.name', '姓名')} className="w-full h-8 border rounded-md px-2 text-[11px]" value={newServicePerson.name} onChange={e => setNewServicePerson({...newServicePerson, name: e.target.value})} />
                                        <button 
                                            onClick={handleAddServicePerson} 
                                            disabled={!newServicePerson.name}
                                            className="w-full bg-indigo-600 text-white h-8 rounded-md text-[11px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
                                        >
                                            <Plus size={12} /> {t('common.add_personnel', '新增同工')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </RainbowCard>

                {/* 2. Contact Directory Section - Rainbow: Purple */}
                <RainbowCard
                    title={t('comm.directory_management', '通訊錄管理')}
                    icon={<Phone size={18} />}
                    colorIndex={6}
                >
                    <div className="space-y-6">
                        <div className="flex justify-end gap-2">
                            <button onClick={handleExport} className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-indigo-50 font-bold shadow-sm transition-all active:scale-95"><Download className="w-3 h-3 mr-1.5"/>{t('common.export', '匯出')}</button>
                            <label className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-indigo-50 cursor-pointer font-bold shadow-sm transition-all active:scale-95"><Upload className="w-3 h-3 mr-1.5"/>{t('common.import', '匯入')}<input type="file" className="hidden" accept=".json" onChange={handleImport}/></label>
                        </div>

                        <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-200 space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-relaxed">
                                {editingContactId ? t('common.edit_contact', '編輯聯絡資料') : t('comm.add_contact', '新增聯絡人')}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('common.unit', '單位')}</label>
                                    <select className="w-full h-10 border border-slate-200 rounded-lg px-2 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={newContact.unit} onChange={e => setNewContact({...newContact, unit: e.target.value})}>
                                        <option value="">{tString('common.select_unit', '選擇單位')}</option>
                                        {(settings.units || []).map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('common.position', '職稱')}</label>
                                    <input type="text" className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500" value={newContact.position} onChange={e => setNewContact({...newContact, position: e.target.value})} placeholder={tString('comm.position_placeholder', "例如: 主教")} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('common.name', '姓名')}</label>
                                    <input type="text" className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder={tString('common.name', "姓名")} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('common.gender', '性別')}</label>
                                    <select className="w-full h-10 border border-slate-200 rounded-lg px-2 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={newContact.gender} onChange={e => setNewContact({...newContact, gender: e.target.value as any})}>
                                        <option value="brother">{tString('common.gender.brother', '弟兄')}</option>
                                        <option value="sister">{tString('common.gender.sister', '姊妹')}</option>
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('common.phone', '電話')}</label>
                                    <input 
                                        type="tel" 
                                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={newContact.phone} 
                                        onChange={e => setNewContact({...newContact, phone: e.target.value})} 
                                        placeholder="09xx-xxx-xxx" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleAddContact} className="bg-indigo-600 text-white h-10 px-6 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2">
                                    <Plus size={16} /> {editingContactId ? t('common.save_changes', '儲存修改') : t('common.add', '新增聯絡人')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {viewMode === 'table' ? (
                                <div className="space-y-0">
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-white/50 border-b border-slate-200/50 md:hidden">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                            <ArrowUpDown size={10} />
                                            <span>{t('common.scroll_hint', '左右滑動或點擊按鈕')}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => scrollTable('directory', 'left')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button 
                                                onClick={() => scrollTable('directory', 'right')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div 
                                        ref={el => wrapperRefs.current['directory'] = el}
                                        className="dense-table-wrapper"
                                    >
                                        <table className="dense-table">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr className="font-title">
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.unit', '單位')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.position', '職稱')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.name', '姓名')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.gender', '性別')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.phone', '電話')}</th>
                                                    <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600 w-24">{t('common.actions', '操作')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {staffContacts.map((c: any) => (
                                                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.isAuto ? 'bg-slate-50/30' : ''}`}>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600">
                                                            <div className="flex items-center gap-1.5">
                                                                {c.unit}
                                                                {c.isAuto && <span className="bg-slate-200 text-slate-500 px-1 rounded text-[8px] font-black uppercase tracking-tighter">{t('common.auto', '自動')}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-black text-indigo-700">{c.position}</td>
                                                        <td className="px-4 py-3 text-xs font-black text-slate-900">{c.name}</td>
                                                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400">
                                                            {c.gender === 'brother' || c.gender === '弟兄' ? t('common.gender.brother', '弟兄') : t('common.gender.sister', '姊妹')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-slate-500 font-bold tracking-tight">{c.phone || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {!c.isAuto ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button onClick={() => handleEditContact(c)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-all"><Edit2 size={14}/></button>
                                                                    <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14}/></button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 font-black italic">{t('common.read_only', '唯讀')}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {staffContacts.length === 0 && (
                                                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 italic text-[11px]">{t('comm.no_contacts', '尚無聯絡人資料')}</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                                    {staffContacts.map((c: any) => (
                                        <div key={c.id} className={`bg-white p-3 rounded-lg border shadow-sm transition-all hover:shadow-md ${c.isAuto ? 'border-slate-100 bg-slate-50/30' : 'border-indigo-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900">{c.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{c.gender === 'brother' || c.gender === '弟兄' ? t('common.gender.brother', '弟兄') : t('common.gender.sister', '姊妹')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">{c.unit}</span>
                                                        {c.isAuto && <span className="bg-slate-200 text-slate-500 px-1 rounded text-[8px] font-black uppercase tracking-tighter">自動匯入</span>}
                                                    </div>
                                                </div>
                                                {!c.isAuto && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditContact(c)} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1 pt-1 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">{c.position}</p>
                                                <p className="text-xs font-mono font-black text-slate-600">{c.phone || '-'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </RainbowCard>
            </div>
            
            <ConfirmDialog 
                isOpen={!!deleteId}
                title={tString('common.delete_confirm', '刪除確認')}
                message={t('comm.msg.delete_contact_confirm', '確定要刪除此聯絡人嗎？')}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!alertMsg}
                title={tString('common.system_hint', '系統提示')}
                message={alertMsg}
                onConfirm={() => setAlertMsg(null)}
                onCancel={() => setAlertMsg(null)}
                confirmText={t('common.got_it', '知道了')}
            />
        </div>
    );
};

export default CommTab;

