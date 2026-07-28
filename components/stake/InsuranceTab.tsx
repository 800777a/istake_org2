
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData, Registration, RegStatus, GlobalSettings, PersonalInfo, InsuranceType } from '../../types';
import { updateEvent, subscribeToSettings, subscribeToPersonalInfo } from '../../services/sheetService';
import { ShieldCheck, Calendar, Clock, Download, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InsuranceTabProps {
    currentEvent: EventData;
    registrations: Registration[];
    settings: GlobalSettings;
    onUpdateEvent: (event: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

// Modern Business Style constants (High-Contrast Theme)
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-6 py-4 flex items-center justify-between cursor-pointer select-none',
    sectionTitle: 'text-sm md:text-base lg:text-lg font-semibold tracking-tight',
    pageTitle: 'text-xl md:text-2xl font-bold tracking-tight text-slate-900',
    bodyText: 'text-sm text-slate-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-all active:scale-95 flex items-center justify-center gap-2',
    btnSecondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded transition-all active:scale-95 flex items-center justify-center gap-2',
    btnTemple: 'bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition-all active:scale-95 flex items-center justify-center gap-2',
    input: 'w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold',
    select: 'w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer font-bold',
    badge: {
        success: 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 px-2.5 py-0.5 rounded text-[10px]',
        warning: 'bg-amber-100 text-amber-900 font-semibold border border-amber-300 px-2.5 py-0.5 rounded text-[10px]',
        danger: 'bg-rose-100 text-rose-900 font-semibold border border-rose-300 px-2.5 py-0.5 rounded text-[10px]',
        info: 'bg-blue-100 text-blue-900 font-semibold border border-blue-300 px-2.5 py-0.5 rounded text-[10px]'
    }
};

const InsuranceTab: React.FC<InsuranceTabProps> = ({ currentEvent, registrations, settings, onUpdateEvent, onPushToEditor }) => {
    const { t, tString } = useI18n();
    const [insuranceAmount, setInsuranceAmount] = useState<number>(currentEvent.insuranceCost || 0);
    const [selfPaidAmount, setSelfPaidAmount] = useState<number>(currentEvent.self_paid_insurance_amount || 0);
    const [insuranceType, setInsuranceType] = useState<InsuranceType>(currentEvent.insurance_type || InsuranceType.GROUP);
    const [useROC, setUseROC] = useState(false);
    const [personalInfos, setPersonalInfos] = useState<PersonalInfo[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        const unsub = subscribeToPersonalInfo(setPersonalInfos);
        return () => unsub();
    }, []);
    
    // Sync insurance amount if currentEvent changes
    useEffect(() => {
        setInsuranceAmount(currentEvent.insuranceCost || 0);
        setSelfPaidAmount(currentEvent.self_paid_insurance_amount || 0);
        setInsuranceType(currentEvent.insurance_type || InsuranceType.GROUP);
    }, [currentEvent.event_id, currentEvent.insuranceCost, currentEvent.self_paid_insurance_amount, currentEvent.insurance_type]);

    const handleCostChange = (val: string) => {
        const amount = parseInt(val) || 0;
        setInsuranceAmount(amount);
        onUpdateEvent({ ...currentEvent, insuranceCost: amount });
        updateEvent({ ...currentEvent, insuranceCost: amount });
    };

    const handleSelfPaidAmountChange = (val: string) => {
        const amount = parseInt(val) || 0;
        setSelfPaidAmount(amount);
        onUpdateEvent({ ...currentEvent, self_paid_insurance_amount: amount });
        updateEvent({ ...currentEvent, self_paid_insurance_amount: amount });
    };

    const handleInsuranceTypeChange = (type: InsuranceType) => {
        setInsuranceType(type);
        onUpdateEvent({ ...currentEvent, insurance_type: type });
        updateEvent({ ...currentEvent, insurance_type: type });
    };

    const toROCDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getFullYear() - 1911}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const calculateAge = (birthDateStr: string) => {
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getGuardian = (reg: Registration) => {
        // V310: Link with PersonalInfo guardian if available
        const info = personalInfos.find(p => p.identity_id === reg.identity_id);
        if (info?.guardian) return info.guardian;
        
        // Fallback to registration guardian or primary contact name for minors
        if (calculateAge(reg.birth_date) < 18) {
            return reg.guardian || reg.primary_contact_name || '-';
        }
        return '';
    };

    // Filter and Sort Registrations
    const normalRegistrations = useMemo(() => {
        let filtered = registrations.filter(r => r.status === RegStatus.NORMAL);
        
        if (insuranceType === InsuranceType.SELF_PAID) {
            filtered = filtered.filter(r => r.needs_self_paid_insurance);
        }

        let items = [...filtered];

        const collator = new Intl.Collator('zh-Hant-TW-u-co-stroke');
        const billingUnits = (settings.billingConfig?.units || []).map(u => u.shortName);

        if (sortConfig) {
            items.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                switch (sortConfig.key) {
                    case 'unit':
                        valA = a.unit;
                        valB = b.unit;
                        return sortConfig.direction === 'asc' 
                            ? collator.compare(valA, valB)
                            : collator.compare(valB, valA);
                    case 'name':
                        valA = a.name;
                        valB = b.name;
                        break;
                    case 'birth_date':
                        valA = a.birth_date;
                        valB = b.birth_date;
                        break;
                    case 'identity_id':
                        valA = a.identity_id;
                        valB = b.identity_id;
                        break;
                    case 'guardian':
                        valA = getGuardian(a);
                        valB = getGuardian(b);
                        break;
                    default:
                        valA = '';
                        valB = '';
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by unit (stroke) then name
            items.sort((a, b) => {
                const unitCmp = collator.compare(a.unit, b.unit);
                if (unitCmp !== 0) return unitCmp;
                return a.name.localeCompare(b.name, 'zh-TW');
            });
        }
        return items;
    }, [registrations, settings.billingConfig?.units, sortConfig, personalInfos, insuranceType]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (!sortConfig || sortConfig.key !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const handleExport = () => {
        // Data format: 單位, 姓名, 西元生日, 身分證/居留證, 監護人
        const data = normalRegistrations.map(r => {
            return {
                [t('common.unit', '單位')]: r.unit,
                [t('common.name', '姓名')]: r.name,
                [t('common.col.birth_date_ad', '西元生日')]: r.birth_date,
                [t('common.col.identity_id', '身分證/居留證')]: r.identity_id,
                [t('common.col.guardian', '監護人')]: getGuardian(r)
            };
        });

        // V300: Add support for pushing to editor as plain text if needed
        if (onPushToEditor) {
            let textContent = `${currentEvent.event_date} ${currentEvent.event_title} ${t('stake.insurance.list_title', '投保名單')}\n\n`;
            textContent += `${t('common.unit', '單位')}\t${t('common.name', '姓名')}\t${t('common.col.birth_date_ad', '西元生日')}\t${t('common.col.identity_id', '身分證/居留證')}\t${t('common.col.guardian', '監護人')}\n`;
            data.forEach(d => {
                textContent += `${d[t('common.unit', '單位')]}\t${d[t('common.name', '姓名')]}\t${d[t('common.col.birth_date_ad', '西元生日')]}\t${d[t('common.col.identity_id', '身分證/居留證')]}\t${d[t('common.col.guardian', '監護人')]}\n`;
            });
            // We just output a small hint that they can also export to XLSX
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('stake.insurance.list_title', '投保名單'));
        
        // Filename: {版本號}_{頁首名稱}_{活動日期}_{活動名稱}_投保名單.xlsx
        const appVersion = settings.app_version || '1.0.2';
        const headerTitle = settings.stake_name || t('common.temple_trip', '聖殿行程');
        const eventDate = currentEvent.event_date.replace(/-/g, '');
        const eventName = currentEvent.event_title || t('common.temple_trip', '聖殿旅行團');
        const filename = `${appVersion}_${headerTitle}_${eventDate}_${eventName}_${t('stake.insurance.list_title', '投保名單')}.xlsx`;
        
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Main Header conforming to 60-30-10 & RWD rules */}
            <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-6">
                {/* Row 1: Title Row Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded border border-white/10 shadow-inner">
                        <ShieldCheck className="text-blue-300" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {t('stake.insurance.title', '保險名錄管理')}
                        </h2>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                            Travel Insurance & Liability Coordination
                        </p>
                    </div>
                </div>
                
                {/* Row 2: Info & Actions Right Aligned beneath title row */}
                <div className="flex flex-wrap justify-end items-center gap-3">
                    <div className={`px-5 py-2 rounded text-[10px] font-black border flex items-center gap-2 uppercase tracking-widest shadow-sm ${insuranceType === InsuranceType.GROUP ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
                        <ShieldCheck size={16} />
                        {insuranceType === InsuranceType.GROUP ? t('stake.insurance.type.group', '團體投保') : t('stake.insurance.type.self_paid', '自費投保')}
                        <span className="opacity-60 ml-2 font-bold">({normalRegistrations.length} 人)</span>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="bg-white text-indigo-900 h-10 px-6 rounded text-xs font-black shadow-lg hover:bg-slate-50 transition-all flex items-center active:scale-95 border border-white/10"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t('common.button.export_xlsx', '導出投保 Excel')}
                    </button>
                </div>
            </div>

            {/* Configuration Controls - Collapsible Sections */}
            <div className={THEME.card}>
                <div className={THEME.header}>
                    <div className="flex items-center gap-3">
                        <Calendar className="text-blue-300" size={20} />
                        <h3 className={THEME.sectionTitle}>
                            {t('stake.insurance.config_title', '投保設定與費率')}
                        </h3>
                    </div>
                </div>
                
                <div className="p-6 bg-[#F0F4F8]/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('stake.insurance.label.insurance_type', '投保方式')}</label>
                            <div className="flex p-1 bg-slate-100 rounded border border-slate-200 shadow-inner">
                                <button 
                                    onClick={() => handleInsuranceTypeChange(InsuranceType.GROUP)}
                                    className={`flex-1 py-2.5 rounded font-black text-[10px] uppercase tracking-widest transition-all ${insuranceType === InsuranceType.GROUP ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tString('stake.insurance.type.group', '團體')}
                                </button>
                                <button 
                                    onClick={() => handleInsuranceTypeChange(InsuranceType.SELF_PAID)}
                                    className={`flex-1 py-2.5 rounded font-black text-[10px] uppercase tracking-widest transition-all ${insuranceType === InsuranceType.SELF_PAID ? 'bg-white text-rose-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tString('stake.insurance.type.self_paid', '自費')}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                {insuranceType === InsuranceType.GROUP ? t('stake.insurance.label.group_fee', '單人團保費率') : t('stake.insurance.label.self_paid_fee', '單人自費費率')}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-bold">$</span>
                                </div>
                                <input 
                                    type="number" 
                                    value={insuranceType === InsuranceType.GROUP ? insuranceAmount : selfPaidAmount}
                                    onChange={e => insuranceType === InsuranceType.GROUP ? handleCostChange(e.target.value) : handleSelfPaidAmountChange(e.target.value)}
                                    className={THEME.input + " pl-10 h-11 text-lg"}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('stake.insurance.toggle_date_format', '生日格式顯示')}</label>
                            <button 
                                onClick={() => setUseROC(!useROC)}
                                className={`w-full h-11 flex items-center justify-center gap-3 rounded border font-bold text-xs transition-all shadow-sm active:scale-95 ${useROC ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                <Clock size={18} />
                                {useROC ? '目前顯示: 民國生日' : '目前顯示: 西元生日'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hint Box */}
            <div className="bg-blue-50 border border-blue-100 rounded p-5 flex items-start gap-4 shadow-sm">
                <Clock className="text-blue-600 mt-0.5 shrink-0" size={24} />
                <div>
                    <h5 className="font-black text-blue-900 text-sm uppercase tracking-wider mb-1.5">{t('stake.insurance.hint.main', '投保作業時程提醒')}</h5>
                    <p className="text-blue-800 text-xs font-medium leading-relaxed opacity-80">
                        {t('stake.insurance.hint.sub', '投保時間預設為活動當日 03:00 起至隔日 03:00 止。請務必於活動開始前 72 小時完成最終名冊傳送予保險公司核保。')}
                    </p>
                </div>
            </div>

            {/* Main Data Table */}
            <div className={THEME.card}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-indigo-600" />
                        {t('stake.insurance.list_title', '投保名單')} 
                    </h3>
                    <span className={THEME.badge.info}>
                        TOTAL: {normalRegistrations.length}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th onClick={() => handleSort('unit')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        {t('common.unit', '報名單位')} <SortIcon col="unit" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        {t('common.name', '姓名')} <SortIcon col="name" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('birth_date')} className="px-6 py-5 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-end gap-1">
                                        {useROC ? t('common.col.birth_date_roc', '民國生日') : t('common.col.birth_date_ad', '西元生日')} <SortIcon col="birth_date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('identity_id')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        {t('common.col.identity_id', '身分證號')} <SortIcon col="identity_id" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('guardian')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        {t('common.col.guardian', '緊急聯繫/監護人')} <SortIcon col="guardian" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {normalRegistrations.map((reg) => (
                                <tr key={reg.reg_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={THEME.badge.info}>
                                            {reg.unit}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{reg.name}</td>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-right font-bold text-xs">
                                        {useROC ? toROCDate(reg.birth_date) : reg.birth_date}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-900 rounded font-bold border border-indigo-100 text-[11px]">
                                            {reg.identity_id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-semibold text-xs">
                                        {getGuardian(reg)}
                                    </td>
                                </tr>
                            ))}
                            {normalRegistrations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <ShieldCheck size={48} className="text-slate-300" />
                                            <p className="font-bold text-slate-400 italic">
                                                {t('stake.insurance.msg.no_eligible_staff', '目前暫無符合投保資格之名單')}
                                            </p>
                                        </div>
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

export default InsuranceTab;
