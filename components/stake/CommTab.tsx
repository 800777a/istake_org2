
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, GlobalSettings, StaffContact, ServicePerson } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { Phone, Download, Upload, Plus, ShieldCheck, Edit2, Trash2, Check, X } from 'lucide-react';

import ConfirmDialog from '../ConfirmDialog';

interface CommTabProps {
    currentEvent: EventData;
    settings: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
}

const CommTab: React.FC<CommTabProps> = ({ currentEvent, settings, onUpdateEvent }) => {
    const { t } = useTranslation();
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
        <div className="space-y-6 animate-fade-in relative">
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                isDangerous={true}
            />

            {/* 1. Staff List (Service Personnel) - Moved from StaffTab */}
            <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-200">
                <div className="flex justify-between items-center mb-4 border-b border-red-200 pb-2">
                    <h3 className="text-base font-bold flex items-center text-red-900">
                        <ShieldCheck className="w-5 h-5 mr-2" /> {t('comm.staff_list', '同工名單')}
                    </h3>
                    <div className="flex gap-2">
                        <label className="bg-white border border-red-200 text-red-800 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-red-100 cursor-pointer font-bold">
                            <Upload className="w-3 h-3 mr-1"/> {t('common.import', '匯入')}<input type="file" className="hidden" accept=".json" onChange={handleImportServicePersonnel}/>
                        </label>
                        <button 
                            onClick={handleExportServicePersonnel} 
                            className="bg-white border border-red-200 text-red-800 px-3 py-1.5 rounded-lg text-xs flex items-center hover:bg-red-100 font-bold"
                        >
                            <Download className="w-3 h-3 mr-1"/> {t('common.export', '匯出')}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto mb-4">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-red-100 text-red-900 font-bold border-b border-red-200">
                            <tr>
                                <th className="p-2 w-16 text-center">{t('common.order', '順序')}</th>
                                <th className="p-2 w-24">{t('common.unit', '單位')}</th>
                                <th className="p-2 w-32">{t('common.position', '職位')}</th>
                                <th className="p-2">{t('common.name', '姓名')}</th>
                                <th className="p-2 w-20 text-right">{t('common.actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                            {sortedServicePersonnel.map(p => (
                                <tr key={p.id} className="hover:bg-red-50">
                                    {editingServiceId === p.id && editServiceValues ? (
                                        <>
                                            <td className="p-2"><input type="number" className="w-full border rounded p-1 text-center" value={editServiceValues.order} onChange={e => setEditServiceValues({...editServiceValues, order: parseInt(e.target.value)})} /></td>
                                            <td className="p-2">
                                                <select className="w-full border rounded p-1" value={editServiceValues.unit} onChange={e => setEditServiceValues({...editServiceValues, unit: e.target.value})}>
                                                    <option value="">{t('common.select', '選擇')}</option>
                                                    {[...settings.units, t('common.stake', '支聯會')].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><input type="text" className="w-full border rounded p-1" value={editServiceValues.calling} onChange={e => setEditServiceValues({...editServiceValues, calling: e.target.value})} /></td>
                                            <td className="p-2"><input type="text" className="w-full border rounded p-1" value={editServiceValues.name} onChange={e => setEditServiceValues({...editServiceValues, name: e.target.value})} /></td>
                                            <td className="p-2 text-right">
                                                <button onClick={saveEditServicePerson} className="text-green-600 mr-2"><Check className="w-4 h-4"/></button>
                                                <button onClick={() => setEditingServiceId(null)} className="text-gray-400"><X className="w-4 h-4"/></button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-2 text-center text-gray-600">{p.order}</td>
                                            <td className="p-2 font-bold text-gray-800">{p.unit}</td>
                                            <td className="p-2 text-gray-600">{p.calling}</td>
                                            <td className="p-2 font-bold text-red-900">{p.name}</td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => startEditServicePerson(p)} className="text-blue-500 hover:text-blue-700 mr-2"><Edit2 className="w-3 h-3"/></button>
                                                <button onClick={() => triggerDeleteServicePerson(p.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            <tr className="bg-white">
                                <td className="p-2"><input type="number" placeholder="#" className="w-full border rounded p-1 text-center text-xs" value={newServicePerson.order} onChange={e => setNewServicePerson({...newServicePerson, order: parseInt(e.target.value)})} /></td>
                                <td className="p-2">
                                    <select className="w-full border rounded p-1 text-xs" value={newServicePerson.unit} onChange={e => setNewServicePerson({...newServicePerson, unit: e.target.value})}>
                                        <option value="">{t('common.unit', '單位')}</option>
                                        {[...settings.units, t('common.stake', '支聯會')].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </td>
                                <td className="p-2"><input type="text" placeholder={t('common.position', "職位")} className="w-full border rounded p-1 text-xs" value={newServicePerson.calling} onChange={e => setNewServicePerson({...newServicePerson, calling: e.target.value})} /></td>
                                <td className="p-2"><input type="text" placeholder={t('common.name', "姓名")} className="w-full border rounded p-1 text-xs" value={newServicePerson.name} onChange={e => setNewServicePerson({...newServicePerson, name: e.target.value})} /></td>
                                <td className="p-2 text-right">
                                    <button onClick={handleAddServicePerson} disabled={!newServicePerson.name} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50 font-bold">{t('common.add', '新增')}</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Contact Directory Section */}
            <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-purple-900 flex items-center text-base">
                        <Phone className="w-5 h-5 mr-2 text-purple-700" /> {t('comm.directory_management', '通訊錄管理')}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="bg-white border border-purple-200 text-purple-800 px-2 py-1 rounded text-xs flex items-center hover:bg-purple-100 font-bold"><Download className="w-3 h-3 mr-1"/>{t('common.export', '匯出')}</button>
                        <label className="bg-white border border-purple-200 text-purple-800 px-2 py-1 rounded text-xs flex items-center hover:bg-purple-100 cursor-pointer font-bold"><Upload className="w-3 h-3 mr-1"/>{t('common.import', '匯入')}<input type="file" className="hidden" accept=".json" onChange={handleImport}/></label>
                        <button onClick={handleAddContact} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center">
                            <Plus className="w-4 h-4 mr-1" /> {editingContactId ? t('common.save_changes', '儲存修改') : t('comm.add_contact', '新增聯絡人')}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-purple-100 mb-6 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('common.unit', '單位')}</label>
                        <select className="w-full border rounded p-2 text-xs bg-white text-gray-900" value={newContact.unit} onChange={e => setNewContact({...newContact, unit: e.target.value})}>
                            <option value="">{t('common.select_unit', '選擇單位')}</option>
                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('common.position', '職稱')}</label>
                        <input type="text" className="w-full border rounded p-2 text-xs text-gray-900" value={newContact.position} onChange={e => setNewContact({...newContact, position: e.target.value})} placeholder={t('comm.position_placeholder', "例如: 主教")} />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('common.name', '姓名')}</label>
                        <input type="text" className="w-full border rounded p-2 text-xs text-gray-900" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder={t('common.name', "姓名")} />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('common.gender', '性別')}</label>
                        <select className="w-full border rounded p-2 text-xs bg-white text-gray-900" value={newContact.gender} onChange={e => setNewContact({...newContact, gender: e.target.value as any})}>
                            <option value="brother">{t('common.gender.brother', '弟兄')}</option>
                            <option value="sister">{t('common.gender.sister', '姊妹')}</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('common.phone', '電話')}</label>
                        <input 
                            type="tel" 
                            pattern="[0-9]*"
                            inputMode="numeric"
                            className="w-full border rounded p-2 text-xs text-gray-900" 
                            value={newContact.phone} 
                            onChange={e => setNewContact({...newContact, phone: e.target.value})} 
                            placeholder="09xx-xxx-xxx" 
                        />
                    </div>
                </div>

                <div className="overflow-x-auto border border-purple-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-purple-100 border-b border-purple-200 font-bold text-purple-900">
                            <tr>
                                <th className="p-3">{t('common.unit', '單位')}</th>
                                <th className="p-3">{t('common.position', '職稱')}</th>
                                <th className="p-3">{t('common.name', '姓名')}</th>
                                <th className="p-3">{t('common.gender', '性別')}</th>
                                <th className="p-3">{t('common.phone', '電話')}</th>
                                <th className="p-3 text-right">{t('common.actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-100 bg-white">
                            {staffContacts.map((c: any) => (
                                <tr key={c.id} className={`hover:bg-purple-50 ${c.isAuto ? 'bg-gray-50/50' : ''}`}>
                                    <td className="p-3 text-gray-900">
                                        {c.unit}
                                        {c.isAuto && <span className="ml-2 text-[8px] bg-gray-200 text-gray-500 px-1 rounded">{t('common.auto', '自動')}</span>}
                                    </td>
                                    <td className="p-3 font-bold text-purple-800">{c.position}</td>
                                    <td className="p-3 font-bold text-gray-900">{c.name}</td>
                                    <td className="p-3 text-gray-700">{c.gender === 'brother' || c.gender === '弟兄' ? t('common.gender.brother', '弟兄') : t('common.gender.sister', '姊妹')}</td>
                                    <td className="p-3 font-mono text-gray-600">{c.phone || '-'}</td>
                                    <td className="p-3 text-right">
                                        {!c.isAuto && (
                                            <>
                                                <button onClick={() => handleEditContact(c)} className="text-blue-600 hover:text-blue-800 mr-3 font-bold">{t('common.edit', '編輯')}</button>
                                                <button onClick={() => handleDeleteContact(c.id)} className="text-red-500 hover:text-red-700 font-bold">{t('common.delete', '刪除')}</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {staffContacts.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('comm.no_contacts', '尚無聯絡人資料')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ConfirmDialog 
                isOpen={!!deleteId}
                title={t('common.delete_confirm', '刪除確認')}
                message={t('comm.msg.delete_contact_confirm', '確定要刪除此聯絡人嗎？')}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!alertMsg}
                title={t('common.system_hint', '系統提示')}
                message={alertMsg}
                onConfirm={() => setAlertMsg(null)}
                onCancel={() => setAlertMsg(null)}
                confirmText={t('common.got_it', '知道了')}
            />
        </div>
    );
};

export default CommTab;

