
import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Registration, EventData, GlobalSettings, ServicePerson, Volunteer, PersonalInfo } from '../../types';
import { updateEvent, updateUnitStaffInfo } from '../../services/sheetService';
import { ShieldCheck, Upload, Download, Users, UserCheck, Bus, Badge, Edit2, Trash2, Plus, Check, X, HeartHandshake, ArrowUp, UserPlus, ChevronDown, ChevronUp, FileOutput, Save, LayoutDashboard, List, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { maskName } from '../../utils/validation';
import { useEffect, useRef } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';
import { RainbowCard } from './fee-config/RainbowCard';

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
    const { t, tString } = useI18n();
    
    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = useMemo(() => {
        return settings.billingConfig?.units?.map(u => u.shortName) || settings.units || [];
    }, [settings]);

    // Updated Role Definitions
    const TEMPLE_WORKER_ROLES = [
        { key: 'A', label: tString('staff.role.A', 'A.協調員 (恩道門後的弟兄)') },
        { key: 'B', label: tString('staff.role.B', 'B.洗禮記錄員 (恩道門後的弟兄)') },
        { key: 'C', label: tString('staff.role.C', 'C.證實記錄員 (恩道門後的弟兄)') },
        { key: 'D', label: tString('staff.role.D', 'D.證實者 (長老以上的聖職)') },
        { key: 'E', label: tString('staff.role.E', 'E.發衣服 (恩道門後的姐妹)') },
        { key: 'F', label: tString('staff.role.F', 'F.發毛巾 (成年姐妹)') },
        { key: 'G', label: tString('staff.role.G', 'G.照顧兒童 (成人)') },
        { key: 'H', label: tString('staff.role.H', 'H.照顧兒童 (與G為夫妻或同性別的成人)') },
        { key: 'I', label: tString('staff.role.I', 'I.施洗者1 (祭司以上的聖職)') }, 
        { key: 'J', label: tString('staff.role.J', 'J.施洗者2 (祭司以上的聖職)') },
        { key: 'K', label: tString('staff.role.K', 'K.領車 (成人)') },
        { key: 'L', label: tString('staff.role.L', 'L.領車 (成人)') },
        { key: 'M', label: tString('staff.role.M', 'M.領車 (成人)') },
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

    const [remountKey, setRemountKey] = useState(0);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // 捲動控制函數
    const scrollTable = (sectionId: string, direction: 'left' | 'right') => {
        const wrapper = wrapperRefs.current[sectionId];
        if (wrapper) {
            const scrollAmount = 200;
            wrapper.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Auto-switch to card view on very small screens (portrait mobile)
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                setViewMode('card');
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Orientation change hard reset
    useEffect(() => {
        const handleResize = () => setRemountKey(k => k + 1);
        window.addEventListener('orientationchange', handleResize);
        return () => window.removeEventListener('orientationchange', handleResize);
    }, []);

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
        const eventTitle = currentEvent.event_title || t('common.temple_trip', '聖殿旅行團');
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

            <ExportChoiceModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={(mask, toEditor) => handleExportStaffTextList(mask, toEditor)}
            />

            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}

            {/* Header conforming to Rainbow Depth Level 1 */}
            <div className="bg-indigo-900 text-white p-3 md:p-4 rounded shadow-sm flex items-center gap-3 overflow-hidden">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-300 shrink-0" />
                <h2 className="text-sm md:text-xl font-black tracking-tight truncate font-title flex-1">
                    {t('staff.tab_title', '主辦行政與同工管理')}
                </h2>
            </div>

            {/* Action Row - Level 2 */}
            <div className="bg-indigo-100/50 p-2 rounded border border-indigo-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={handleSaveFile} 
                        className="bg-white text-indigo-700 h-9 px-3 rounded text-[11px] font-bold border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center active:scale-95 shadow-sm"
                    >
                        <Save className="w-4 h-4 mr-1.5" />
                        {t('common.save_file', '存檔')}
                    </button>
                    <label className="bg-white text-indigo-700 h-9 px-3 rounded text-[11px] font-bold border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center cursor-pointer active:scale-95 shadow-sm">
                        <Upload className="w-4 h-4 mr-1.5" />
                        {t('common.load_file', '讀取')}
                        <input type="file" className="hidden" accept=".json" onChange={handleImportWorkers}/>
                    </label>
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="bg-blue-600 text-white h-9 px-3 rounded text-[11px] font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center active:scale-95 border border-blue-500/50"
                    >
                        <FileOutput className="w-4 h-4 mr-1.5"/>
                        {t('common.export', '導出')}
                    </button>
                </div>

                {/* ViewMode Switcher - Right Aligned */}
                <div className="flex bg-white p-1 rounded border border-indigo-200 shadow-inner">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-[11px] font-bold ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <List size={14} />
                        <span>表格</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('card')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-[11px] font-bold ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <LayoutDashboard size={14} />
                        <span>卡片</span>
                    </button>
                </div>
            </div>

            <div className="space-y-6">

                {/* 1. Administrative Roles (Rainbow: Indigo/Violet) */}
                <RainbowCard
                    title={t('staff.delegation_list', '聖殿教儀及行政職責')}
                    icon={<ShieldCheck size={18} />}
                    colorIndex={5}
                    isExpanded={isWorkersExpanded}
                    onToggle={() => setIsWorkersExpanded(!isWorkersExpanded)}
                >
                    <div className={`p-1 ${viewMode === 'card' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4'}`}>
                        {TEMPLE_WORKER_ROLES.map(role => {
                            const existingData = currentEvent.temple_workers?.[role.key] || { name: '', unit: '' };
                            const worker = typeof existingData === 'string' ? { name: existingData, unit: '' } : existingData;
                            const hasWorker = !!worker.name;
                            
                            return (
                                <div key={role.key} className={`flex flex-col gap-1.5 p-3 rounded border transition-all ${hasWorker ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-relaxed">
                                        {role.label}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className={`w-20 md:w-24 shrink-0 flex items-center justify-center rounded border text-[11px] font-black h-9 transition-all ${hasWorker ? 'bg-indigo-50 border-indigo-100 text-indigo-900' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                            {worker.unit || '-'}
                                        </div>
                                        <div className={`flex-1 flex items-center justify-between px-3 rounded border text-xs h-9 transition-all ${hasWorker ? 'bg-white border-indigo-500 text-slate-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 italic'}`}>
                                            <span className="truncate">{worker.name || t('staff.awaiting_application', '待申請')}</span>
                                            {worker.name && (
                                                <button 
                                                    onClick={() => triggerClearWorker(role.key)}
                                                    className="text-slate-300 hover:text-rose-500 p-1.5 rounded hover:bg-rose-50 transition-all ml-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </RainbowCard>

                {/* 2. Volunteers Section (Rainbow: Green) */}
                <RainbowCard
                    title={t('staff.apply_for_service', '志願者申請管理')}
                    icon={<HeartHandshake size={18} />}
                    colorIndex={3}
                >
                    <div className="space-y-4">
                        {/* Add Form */}
                        <div className="bg-indigo-50/50 p-3 md:p-4 rounded border border-indigo-100 space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('staff.manual_add_volunteer', '手動新增志願者')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400">{t('common.unit', '單位')}</label>
                                    <select 
                                        className="w-full h-10 border border-slate-200 rounded px-3 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newVolunteer.unit}
                                        onChange={(e) => setNewVolunteer({...newVolunteer, unit: e.target.value})}
                                    >
                                        <option value="">{tString('common.select_unit', '選擇單位')}</option>
                                        {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400">{t('common.name', '姓名')}</label>
                                    <input 
                                        type="text"
                                        className="w-full h-10 border border-slate-200 rounded px-3 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder={tString('common.placeholder.input_name', '輸入姓名')}
                                        value={newVolunteer.name}
                                        onChange={(e) => setNewVolunteer({...newVolunteer, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400">{t('staff.role_to_apply', '申請職務')}</label>
                                    <select 
                                        className="w-full h-10 border border-slate-200 rounded px-3 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newVolunteer.roleKey}
                                        onChange={(e) => setNewVolunteer({...newVolunteer, roleKey: e.target.value})}
                                    >
                                        <option value="">{tString('staff.placeholder.select_role', '選擇職務')}</option>
                                        {TEMPLE_WORKER_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    onClick={handleAddVolunteer}
                                    className="bg-indigo-600 text-white h-10 px-6 rounded font-bold text-xs shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} /> {t('common.add', '新增')}
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
                                                onClick={() => scrollTable('volunteers', 'left')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button 
                                                onClick={() => scrollTable('volunteers', 'right')}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div 
                                        ref={el => wrapperRefs.current['volunteers'] = el}
                                        className="dense-table-wrapper"
                                    >
                                        <table className="dense-table">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr className="font-title">
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.unit', '單位')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.name', '姓名')}</th>
                                                    <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('staff.assigned_role', '申請職務')}</th>
                                                    <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600 w-32">{t('common.actions', '操作')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {(currentEvent.volunteers || []).map(v => {
                                                    const roleLabel = TEMPLE_WORKER_ROLES.find(r => r.key === v.roleKey)?.label || v.roleKey;
                                                    return (
                                                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black border border-indigo-100">
                                                                    {v.unit}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 font-black text-slate-900 text-xs">{v.name}</td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs">{roleLabel}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => handlePromoteVolunteer(v)}
                                                                        className="bg-emerald-600 text-white h-8 px-3 rounded hover:bg-emerald-700 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                                                    >
                                                                        <Check size={14} /> {t('common.confirm', '錄用')}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteVolunteer(v.id)}
                                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-100 transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {(currentEvent.volunteers || []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="py-12 text-center text-slate-400 italic text-[11px]">
                                                            {t('staff.msg.no_volunteer_data', '目前尚無待審核的志願申請')}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                                    {(currentEvent.volunteers || []).map(v => {
                                        const roleLabel = TEMPLE_WORKER_ROLES.find(r => r.key === v.roleKey)?.label || v.roleKey;
                                        return (
                                            <div key={v.id} className="bg-white p-3 rounded border border-indigo-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-black text-slate-900">{v.name}</span>
                                                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">
                                                                {v.unit}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{roleLabel}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteVolunteer(v.id)}
                                                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={() => handlePromoteVolunteer(v)}
                                                    className="w-full bg-emerald-600 text-white h-9 rounded font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                                >
                                                    <Check size={16} /> {t('common.confirm', '錄用此位志願者')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </RainbowCard>

                {/* 3. Potential Workers List (Rainbow: Indigo/Blue) */}
                <RainbowCard
                    title={t('staff.service_list', '潛在同工候選名單')}
                    icon={<UserPlus size={18} />}
                    colorIndex={4}
                >
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <span className="bg-indigo-50 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-100 uppercase tracking-widest">
                                {t('staff.service_list_hint', '顯示身分為工作人員之名單')}
                            </span>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="space-y-0">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-white/50 border-b border-slate-200/50 md:hidden">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                        <ArrowUpDown size={10} />
                                        <span>{t('common.scroll_hint', '左右滑動或點擊按鈕')}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => scrollTable('serviceList', 'left')}
                                            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button 
                                            onClick={() => scrollTable('serviceList', 'right')}
                                            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-90"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div 
                                    ref={el => wrapperRefs.current['serviceList'] = el}
                                    className="dense-table-wrapper"
                                >
                                    <table className="dense-table">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr className="font-title">
                                                <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.unit', '單位')}</th>
                                                <th className="px-4 py-3 text-left font-black text-[11px] md:text-xs text-slate-600">{t('common.name', '姓名')}</th>
                                                <th className="px-4 py-3 text-center font-black text-[11px] md:text-xs text-slate-600">{t('staff.service_qualification', '資格')}</th>
                                                <th className="px-4 py-3 text-right font-black text-[11px] md:text-xs text-slate-600">{t('staff.assigned_role_with_promotion', '快速委派職務')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {serviceList.map(reg => (
                                                <tr key={reg.reg_id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-slate-600 text-xs">{reg.unit}</td>
                                                    <td className="px-4 py-3 font-black text-slate-900 text-xs">{reg.name}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-blue-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black shadow-sm uppercase tracking-widest border border-blue-500">
                                                            {getQualification(reg.name, reg.unit)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <select 
                                                            className="w-full max-w-[200px] h-9 border border-slate-200 rounded px-3 text-[11px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            onChange={(e) => handleDelegateFromList(reg, e.target.value)}
                                                            value={assignedRolesMap[reg.reg_id] || ""}
                                                        >
                                                            <option value="">{tString('staff.placeholder.select_service_item', '選擇職務')}</option>
                                                            {TEMPLE_WORKER_ROLES.map(role => {
                                                                const currentAssigned = currentEvent.temple_workers?.[role.key];
                                                                const assignedName = typeof currentAssigned === 'object' ? currentAssigned?.name : currentAssigned;
                                                                return (
                                                                    <option key={role.key} value={role.key}>
                                                                        {role.label} {assignedName ? `(${tString('staff.label.already_assigned_simple', '已派')}: ${assignedName})` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                            {serviceList.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-slate-400 italic text-[11px]">
                                                        {t('staff.msg.no_eligible_service_staff', '查無符合同工資格之人員')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                                {serviceList.map(reg => (
                                    <div key={reg.reg_id} className="bg-white p-3 rounded border border-indigo-100 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900">{reg.name}</span>
                                                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">
                                                        {reg.unit}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">{t('staff.service_qualification', '教儀資格')}:</span>
                                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm uppercase tracking-widest">
                                                        {getQualification(reg.name, reg.unit)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('staff.assigned_role_with_promotion', '快速委派職務')}</label>
                                            <select 
                                                className="w-full h-9 border border-slate-200 rounded px-3 text-[11px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                onChange={(e) => handleDelegateFromList(reg, e.target.value)}
                                                value={assignedRolesMap[reg.reg_id] || ""}
                                            >
                                                <option value="">{tString('staff.placeholder.select_service_item', '選擇委派職務')}</option>
                                                {TEMPLE_WORKER_ROLES.map(role => {
                                                    const currentAssigned = currentEvent.temple_workers?.[role.key];
                                                    const assignedName = typeof currentAssigned === 'object' ? currentAssigned?.name : currentAssigned;
                                                    return (
                                                        <option key={role.key} value={role.key}>
                                                            {role.label} {assignedName ? `(${tString('staff.label.already_assigned_simple', '已派')}: ${assignedName})` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                                {serviceList.length === 0 && (
                                    <div className="bg-white p-12 rounded border border-indigo-100 text-center text-xs font-bold text-slate-400 italic">
                                        {t('staff.msg.no_eligible_service_staff', '查無符合同工資格之人員')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </RainbowCard>
        </div>
    </div>
);

};

export default StaffTab;
