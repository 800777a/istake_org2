
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, EventData, GlobalSettings, ServicePerson, Volunteer, PersonalInfo } from '../../types';
import { updateEvent, updateUnitStaffInfo } from '../../services/sheetService';
import { ShieldCheck, Upload, Download, Users, UserCheck, Bus, Badge, Edit2, Trash2, Plus, Check, X, HeartHandshake, ArrowUp, UserPlus, ChevronDown, ChevronUp, FileOutput, Save } from 'lucide-react';
import { maskName } from '../../utils/validation';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';

import Toast, { ToastType } from '../Toast';

interface StaffTabProps {
    currentEvent: EventData;
    registrations: Registration[];
    personalInfo: PersonalInfo[];
    settings: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

const StaffTab: React.FC<StaffTabProps> = ({ currentEvent, registrations, personalInfo, settings, onUpdateEvent, onPushToEditor }) => {
    const { t } = useTranslation();
    
    // Updated Role Definitions
    const TEMPLE_WORKER_ROLES = [
        { key: 'A', label: t('staff.role.A', 'A.協調員 (恩道門後的弟兄)') },
        { key: 'B', label: t('staff.role.B', 'B.洗禮記錄員 (恩道門後的弟兄)') },
        { key: 'C', label: t('staff.role.C', 'C.證實記錄員 (恩道門後的弟兄)') },
        { key: 'D', label: t('staff.role.D', 'D.證實者 (長老以上的聖職)') },
        { key: 'E', label: t('staff.role.E', 'E.發衣服 (恩道門後的姐妹)') },
        { key: 'F', label: t('staff.role.F', 'F.發毛巾 (成年姐妹)') },
        { key: 'G', label: t('staff.role.G', 'G.照顧兒童 (成人)') },
        { key: 'H', label: t('staff.role.H', 'H.照顧兒童 (與G為夫妻或同性別的成人)') },
        { key: 'I', label: t('staff.role.I', 'I.施洗者1 (祭司以上的聖職)') }, 
        { key: 'J', label: t('staff.role.J', 'J.施洗者2 (祭司以上的聖職)') },
        { key: 'K', label: t('staff.role.K', 'K.領車 (成人)') },
        { key: 'L', label: t('staff.role.L', 'L.領車 (成人)') },
        { key: 'M', label: t('staff.role.M', 'M.領車 (成人)') },
    ];

    // Staff Member Identities (Using raw values for filtering to match DB/Sheet)
    const STAFF_IDENTITY_FILTERS = [
        '服務人員',
        '服務人員-青少年',
        '工作人員',
        '工作人員-青少年',
        '聖殿工作人員'
    ];

    // Helper to get qualification from personal info
    const getQualification = (name: string, unit: string) => {
        const info = personalInfo.find(p => p.name === name && p.unit === unit);
        return info?.service_qualification || '-';
    };

    // Filter registrations for Service List
    const serviceList = useMemo(() => {
        return registrations.filter(reg => STAFF_IDENTITY_FILTERS.includes(reg.identity_type || ''));
    }, [registrations]);

    // Role assignment mapping for the dropdown: reg_id -> roleKey
    const assignedRolesMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (!currentEvent.temple_workers) return map;

        Object.entries(currentEvent.temple_workers).forEach(([roleKey, workerData]) => {
            const worker = typeof workerData === 'object' ? workerData : { name: workerData, unit: '' };
            if (worker.name) {
                // Match by name and unit (since we don't have ID in temple_workers)
                const matchedReg = registrations.find(r => r.name === worker.name && r.unit === worker.unit);
                if (matchedReg) {
                    map[matchedReg.reg_id] = roleKey;
                }
            }
        });
        return map;
    }, [currentEvent.temple_workers, registrations]);

    // Volunteer State
    const [newVolunteer, setNewVolunteer] = useState<Volunteer>({ id: '', unit: '', name: '', roleKey: '' });

    // Confirm Dialog State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isWorkersExpanded, setIsWorkersExpanded] = useState(true);

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    // Handlers
    const handleSaveFile = () => {
        const data = currentEvent.temple_workers || {};
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanDate = currentEvent.event_date.replace(/-/g, '');
        a.href = url;
        a.download = `${settings.app_version || '1.0.2'}_${settings.stake_name || t('common.temple_trip', '聖殿行程')}_${cleanDate}_${t('staff.delegation_list_save', '委派名單_存檔')}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImportWorkers = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (Array.isArray(data)) {
                    const newWorkers: Record<string, any> = {};
                    data.forEach((item: any) => {
                        if (item.role) {
                            newWorkers[item.role] = { name: item.name, unit: item.unit };
                        }
                    });
                    const updated = { ...currentEvent, temple_workers: newWorkers };
                    updateEvent(updated);
                    onUpdateEvent(updated);
                } else {
                    const updated = { ...currentEvent, temple_workers: data };
                    updateEvent(updated);
                    onUpdateEvent(updated);
                }
                setMsgType('success');
                setMsg(t('common.import_success', '匯入成功'));
            } catch (err) {
                setMsgType('error');
                setMsg(t('common.import_fail', '匯入失敗'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const triggerClearWorker = (roleKey: string) => {
        setConfirmConfig({
            isOpen: true,
            title: t('common.confirm.clear_title', '清空確認'),
            message: t('staff.msg.confirm_clear_role', '確定要清空此職務的指派人員嗎？'),
            onConfirm: () => {
                const currentWorkers = currentEvent.temple_workers || {};
                const newWorkers = {
                    ...currentWorkers,
                    [roleKey]: { name: '', unit: '' }
                };
                const updated = { ...currentEvent, temple_workers: newWorkers };
                updateEvent(updated);
                onUpdateEvent(updated);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Volunteer Handlers
    const handleAddVolunteer = () => {
        if (!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey) return;
        const newItem = { ...newVolunteer, id: `VOL-${Date.now()}` };
        const newList = [...(currentEvent.volunteers || []), newItem];
        const updated = { ...currentEvent, volunteers: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
        // Reset Unit and Name, reset Role
        setNewVolunteer({ id: '', unit: '', name: '', roleKey: '' });
    };

    const handlePromoteVolunteer = (volunteer: Volunteer) => {
        // 1. Update the worker slot
        const currentWorkers = currentEvent.temple_workers || {};
        
        const newWorkers = {
            ...currentWorkers,
            [volunteer.roleKey]: { name: volunteer.name, unit: volunteer.unit }
        };

        // 2. Remove from volunteer list
        const newVolunteers = (currentEvent.volunteers || []).filter(v => v.id !== volunteer.id);

        // 3. Save both
        const updated = { ...currentEvent, temple_workers: newWorkers, volunteers: newVolunteers };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleDelegateFromList = (reg: Registration, roleKey: string) => {
        if (!roleKey) return;
        
        const currentWorkers = currentEvent.temple_workers || {};
        const newWorkers = {
            ...currentWorkers,
            [roleKey]: { name: reg.name, unit: reg.unit }
        };

        const updated = { ...currentEvent, temple_workers: newWorkers };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleDeleteVolunteer = (id: string) => {
        const newList = (currentEvent.volunteers || []).filter(v => v.id !== id);
        const updated = { ...currentEvent, volunteers: newList };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const maskNameWithO = (name: string) => {
        if (!name) return '';
        if (name.length <= 1) return name;
        if (name.length === 2) return name[0] + 'Ｏ';
        return name[0] + 'Ｏ' + name.substring(2);
    };

    const handleExportStaffTextList = (shouldMask: boolean = false, toEditor: boolean = false) => {
        const workers: { unit: string; name: string; role: string }[] = [];
        TEMPLE_WORKER_ROLES.forEach(role => {
            const data = currentEvent.temple_workers?.[role.key];
            if (data) {
                const worker = typeof data === 'object' ? data : { name: data, unit: '' };
                if (worker.name) {
                    workers.push({
                        unit: worker.unit || t('common.unknown', '未知'),
                        name: shouldMask ? maskNameWithO(worker.name) : worker.name,
                        role: role.label.split('.')[1] || role.label // Extract just the role name without letter
                    });
                }
            }
        });

        // Sort by unit ascending
        workers.sort((a, b) => a.unit.localeCompare(b.unit, 'zh-Hant'));

        const eventDate = currentEvent.event_date;
        const eventTitle = currentEvent.event_title || t('common.temple_trip', '聖殿之旅');
        const stakeName = settings.stake_name || t('common.temple_trip', '聖殿行程');
        const appVersion = settings.app_version || '1.0.2';

        let content = `${eventDate}\n${eventTitle} ${t('staff.service_list', '服務名單')}\n\n${t('common.unit', '單位')} ${t('common.name', '姓名')} ${t('staff.assigned_role', '擔任')}\n`;
        workers.forEach(w => {
            content += `${w.unit} ${w.name} ${w.role}\n`;
        });
        content += `\n${t('common.url', '網址')} https://istake.org/ \n${t('common.customer_service_hint', '如需服務, 系統可留言, 感謝您.')}`;

        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
            setIsExportModalOpen(false);
            return;
        }

        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanDate = eventDate.replace(/-/g, '');
        a.href = url;
        a.download = `${appVersion}_${stakeName}_${cleanDate}_${eventTitle}_${t('staff.service_list', '服務名單')}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        setIsExportModalOpen(false);
    };

    const handleExportSimpleList = (filename: string, data: any) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_export.json`;
        a.click();
        window.URL.revokeObjectURL(url);
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

            <ExportChoiceModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={(mask, toEditor) => handleExportStaffTextList(mask, toEditor)}
            />

            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}

            {/* 3. Temple Workers - Yellow Container (Renamed to Staff List) */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-500 overflow-hidden">
                <div 
                    className="flex justify-between items-center mb-4 cursor-pointer hover:opacity-80"
                    onClick={() => setIsWorkersExpanded(!isWorkersExpanded)}
                >
                    <h3 className="text-base font-bold flex items-center text-yellow-900"><Badge className="w-5 h-5 mr-2 text-yellow-700"/> {t('staff.delegation_list', '委派名單')}</h3>
                    <div className="text-yellow-600">
                        {isWorkersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>

                {isWorkersExpanded && (
                    <div className="animate-fade-in">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <button 
                                onClick={handleSaveFile} 
                                className="bg-white border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-xs flex items-center hover:bg-yellow-100 font-bold transition-all"
                            >
                                <Save className="w-3.5 h-3.5 mr-1.5 text-yellow-600"/> {t('common.save_file', '存檔')}
                            </button>
                            <label className="bg-white border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-xs flex items-center hover:bg-yellow-100 cursor-pointer font-bold transition-all">
                                <Upload className="w-3.5 h-3.5 mr-1.5 text-yellow-600"/> {t('common.load_file', '讀檔')}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportWorkers}/>
                            </label>
                            <button 
                                onClick={() => setIsExportModalOpen(true)}
                                className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-xs flex items-center hover:bg-yellow-700 font-bold shadow-sm transition-all ml-auto"
                            >
                                <FileOutput className="w-3.5 h-3.5 mr-1.5"/> {t('common.export', '輸出')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {TEMPLE_WORKER_ROLES.map(role => {
                                const existingData = currentEvent.temple_workers?.[role.key] || { name: '', unit: '' };
                                const worker = typeof existingData === 'string' ? { name: existingData, unit: '' } : existingData;
                                const hasWorker = !!worker.name;
                                
                                return (
                                    <div key={role.key} className="flex flex-col">
                                        <label className="text-xs font-bold text-gray-500 mb-1">{role.label}</label>
                                        <div className="flex gap-2">
                                            {/* Changed to Read-Only Display with Conditional Style */}
                                            <div className={`w-1/3 border rounded-lg p-2 text-xs font-bold h-[34px] flex items-center ${hasWorker ? 'bg-red-50 border-red-500 text-black' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                                {worker.unit || '-'}
                                            </div>
                                            <div className={`w-2/3 border rounded-lg p-2 text-xs h-[34px] flex items-center justify-between ${hasWorker ? 'bg-red-50 border-red-500 text-black font-bold' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                                <span>{worker.name || t('staff.awaiting_application', '待志願者申請')}</span>
                                                {worker.name && (
                                                    <button 
                                                        onClick={() => triggerClearWorker(role.key)}
                                                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                                                        title={t('common.clear', '清空')}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Volunteers Section - Green Theme */}
            <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold flex items-center text-green-900">
                        <HeartHandshake className="w-5 h-5 mr-2 text-green-700"/> {t('staff.apply_for_service', '申請服務')}
                    </h3>
                </div>

                {/* Add Form - Mobile Optimized */}
                <div className="flex flex-col md:flex-row gap-2 mb-4 bg-white p-3 rounded-lg border border-green-200 items-end">
                    <div className="w-full md:flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">{t('common.unit', '單位')}</label>
                        <select 
                            className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-green-300 outline-none"
                            value={newVolunteer.unit}
                            onChange={e => setNewVolunteer({...newVolunteer, unit: e.target.value})}
                        >
                            <option value="">{t('common.please_select', '請選擇')}</option>
                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">{t('common.name', '姓名')}</label>
                        <input 
                            type="text" 
                            className="w-full border rounded p-2 text-xs focus:ring-2 focus:ring-green-300 outline-none"
                            placeholder={t('common.placeholder.enter_name', '輸入姓名')}
                            value={newVolunteer.name}
                            onChange={e => setNewVolunteer({...newVolunteer, name: e.target.value})}
                        />
                    </div>
                    <div className="w-full md:flex-[2]">
                        <label className="text-[10px] text-gray-500 block mb-1">{t('staff.assigned_role', '擔任')}</label>
                        <select 
                            className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-green-300 outline-none"
                            value={newVolunteer.roleKey}
                            onChange={e => setNewVolunteer({...newVolunteer, roleKey: e.target.value})}
                        >
                            <option value="">{t('common.please_select', '請選擇')}</option>
                            {TEMPLE_WORKER_ROLES.map(role => (
                                <option key={role.key} value={role.key}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handleAddVolunteer}
                        disabled={!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey}
                        className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50 font-bold h-[34px] flex items-center justify-center"
                    >
                        <Plus className="w-3 h-3 mr-1" /> {t('common.apply', '申請')}
                    </button>
                </div>

                {/* Volunteer List */}
                <div className="overflow-x-auto bg-white rounded-lg border border-green-200">
                    <table className="w-full text-xs text-left"><thead className="bg-green-100 text-green-900 font-bold border-b border-green-200"><tr>
                                <th className="p-2 pl-4 w-24">{t('common.unit', '單位')}</th>
                                <th className="p-2 w-32">{t('common.name', '姓名')}</th>
                                <th className="p-2">{t('staff.assigned_role', '擔任職務')}</th>
                                <th className="p-2 w-32 text-center">{t('common.actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                            {(currentEvent.volunteers || []).map(v => {
                                const roleLabel = TEMPLE_WORKER_ROLES.find(r => r.key === v.roleKey)?.label || v.roleKey;
                                return (
                                    <tr key={v.id} className="hover:bg-green-50/50">
                                        <td className="p-2 pl-4 text-green-800 font-bold">{v.unit}</td>
                                        <td className="p-2 text-gray-800 font-medium">{v.name}</td>
                                        <td className="p-2 text-gray-600">{roleLabel}</td>
                                        <td className="p-2 flex justify-center gap-2">
                                            <button 
                                                onClick={() => handlePromoteVolunteer(v)}
                                                className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 border border-green-200 flex items-center font-bold"
                                                title={t('staff.tooltip.promote_to_worker', '確認並填入上方')}
                                            >
                                                <ArrowUp className="w-3 h-3 mr-1" /> {t('common.confirm', '確認')}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVolunteer(v.id)}
                                                className="bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-100"
                                                title={t('common.delete', '刪除')}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(currentEvent.volunteers || []).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-400">{t('staff.msg.no_volunteer_data', '目前無志願工作資料')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Service List (服務名單) - Blue Theme */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold flex items-center text-blue-900">
                        <UserPlus className="w-5 h-5 mr-2 text-blue-700"/> {t('staff.service_list', '服務名單')}
                    </h3>
                    <div className="text-[10px] text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                        {t('staff.service_list_hint', '顯示身分為「服務/工作人員、聖殿工作人員」之報名名單')}
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg border border-blue-200 max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left sticky-header">
                        <thead className="bg-blue-100 text-blue-900 font-bold border-b border-blue-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 pl-4 w-28 text-center sticky left-0 bg-blue-100 z-20">{t('common.unit', '單位')}</th>
                                <th className="p-3 w-32 text-center sticky left-28 bg-blue-100 z-20 border-r border-blue-200">{t('common.name', '姓名')}</th>
                                <th className="p-3 w-32 text-center">{t('staff.service_qualification', '服務資格')}</th>
                                <th className="p-3 w-32 text-center">{t('registration.label.identity_type', '報名身分')}</th>
                                <th className="p-3 text-right">{t('staff.assigned_role_with_promotion', '擔任 (委派至上方)')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                            {serviceList.map(reg => (
                                <tr key={reg.reg_id} className="hover:bg-blue-50/50">
                                    <td className="p-3 pl-4 text-blue-800 font-bold text-center sticky left-0 bg-white group-hover:bg-blue-50 transition-colors">{reg.unit}</td>
                                    <td className="p-3 text-gray-800 font-black text-center sticky left-28 bg-white group-hover:bg-blue-50 transition-colors border-r border-blue-200">{reg.name}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] border border-indigo-100 font-bold">
                                            {getQualification(reg.name, reg.unit)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{reg.identity_type}</span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <select 
                                            className="border rounded p-1.5 text-[10px] bg-white focus:ring-2 focus:ring-blue-300 outline-none w-full max-w-[200px] font-bold"
                                            onChange={(e) => handleDelegateFromList(reg, e.target.value)}
                                            value={assignedRolesMap[reg.reg_id] || ""}
                                        >
                                            <option value="">{t('staff.placeholder.select_service_item', '選擇服務項目...')}</option>
                                            {TEMPLE_WORKER_ROLES.map(role => {
                                                const currentAssigned = currentEvent.temple_workers?.[role.key];
                                                const assignedName = typeof currentAssigned === 'object' ? currentAssigned?.name : currentAssigned;
                                                return (
                                                    <option key={role.key} value={role.key}>
                                                        {role.label} {assignedName ? t('staff.label.already_assigned', '(已派: {{name}})', { name: assignedName }) : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {serviceList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        {t('staff.msg.no_eligible_service_staff', '目前的報名名單中無符合條件的服務人員')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffTab;
