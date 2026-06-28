
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, Registration, RegStatus, GlobalSettings, PersonalInfo } from '../../types';
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

const InsuranceTab: React.FC<InsuranceTabProps> = ({ currentEvent, registrations, settings, onUpdateEvent, onPushToEditor }) => {
    const { t } = useTranslation();
    const [insuranceAmount, setInsuranceAmount] = useState<number>(currentEvent.insuranceCost || 0);
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
    }, [currentEvent.event_id, currentEvent.insuranceCost]);

    const handleCostChange = (val: string) => {
        const amount = parseInt(val) || 0;
        setInsuranceAmount(amount);
        onUpdateEvent({ ...currentEvent, insuranceCost: amount });
        // Real update to server
        updateEvent({ ...currentEvent, insuranceCost: amount });
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
        const filtered = registrations.filter(r => r.status === RegStatus.NORMAL);
        let items = [...filtered];

        if (sortConfig) {
            items.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                switch (sortConfig.key) {
                    case 'unit':
                        const idxA = settings.units.indexOf(a.unit);
                        const idxB = settings.units.indexOf(b.unit);
                        valA = idxA === -1 ? 999 : idxA;
                        valB = idxB === -1 ? 999 : idxB;
                        break;
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
            // Default sort by unit then name
            items.sort((a, b) => {
                const idxA = settings.units.indexOf(a.unit);
                const idxB = settings.units.indexOf(b.unit);
                const cleanIdxA = idxA === -1 ? 999 : idxA;
                const cleanIdxB = idxB === -1 ? 999 : idxB;
                if (cleanIdxA !== cleanIdxB) return cleanIdxA - cleanIdxB;
                return a.name.localeCompare(b.name, 'zh-TW');
            });
        }
        return items;
    }, [registrations, settings.units, sortConfig, personalInfos]);

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
        const eventName = currentEvent.event_title || t('common.temple_trip', '聖殿之旅');
        const filename = `${appVersion}_${headerTitle}_${eventDate}_${eventName}_${t('stake.insurance.list_title', '投保名單')}.xlsx`;
        
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="bg-indigo-50 p-8 rounded-3xl shadow-sm border-2 border-indigo-200 animate-fade-in">
            <div className="flex flex-col mb-10">
                <h3 className="text-2xl font-black mb-4 flex items-center text-indigo-900">
                    <ShieldCheck className="w-8 h-8 mr-3 text-indigo-600" /> {t('stake.insurance.title', '保險資料管理')}
                </h3>
                <div className="flex items-center text-sm font-black text-indigo-500 uppercase tracking-widest">
                    <Calendar className="w-4 h-4 mr-2" /> {t('common.event_date', '活動日期')}：{currentEvent.event_date}
                </div>
            </div>

            {/* Action Block - Rainbow Row Style */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-indigo-100 mb-10">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm border-2 border-indigo-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            {t('stake.insurance.total_insured', '投保總人數')}: {normalRegistrations.length} {t('common.label.people', '人')}
                        </div>

                        <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border-2 border-indigo-100 shadow-inner">
                            <span className="text-sm font-black text-indigo-800">{t('stake.insurance.label.save_fee_setting', '儲存保費設定')}:</span>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-indigo-400 font-black">$</span>
                                <input 
                                    type="number" 
                                    placeholder={t('common.label.amount', '金額')} 
                                    value={insuranceAmount}
                                    onChange={e => handleCostChange(e.target.value)}
                                    className="border-2 border-indigo-200 rounded-lg pl-8 pr-4 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32 bg-white text-indigo-900"
                                />
                            </div>
                        </div>

                        <label className="flex items-center cursor-pointer p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50 hover:bg-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                            <input 
                                type="checkbox" 
                                checked={useROC} 
                                onChange={e => setUseROC(e.target.checked)} 
                                className="mr-3 w-5 h-5 text-indigo-600 rounded-lg border-2 border-indigo-200"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-indigo-800">{t('stake.insurance.toggle_date_format', '日期格式切換')}</span>
                                <span className="text-[10px] text-indigo-400 font-bold">{t('stake.insurance.show_roc_date', '顯示民國生日格式')}</span>
                            </div>
                        </label>
                    </div>

                    <div className="text-sm text-indigo-700 flex items-start bg-indigo-100/50 p-4 rounded-xl border-2 border-indigo-100 font-black leading-relaxed">
                        <Clock className="w-5 h-5 mr-3 mt-0.5 text-indigo-500" />
                        <div>
                            {t('stake.insurance.hint.main', '溫馨提示：系統保險時間預設為活動當日 03:00 起至隔日 03:00 止。')}
                            <br/><span className="opacity-60 text-xs mt-1 block">{t('stake.insurance.hint.sub', '請於活動開始前 72 小時完成最終名冊傳送予保險公司。')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Block - Rainbow Sub-container */}
            <div className="bg-white rounded-3xl border-2 border-indigo-200 overflow-hidden shadow-sm">
                <div className="p-6 bg-indigo-50 border-b-2 border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xl font-black text-indigo-900">{t('stake.insurance.list_title', '投保名單')}</div>
                    <button 
                        onClick={handleExport}
                        className="w-full md:w-auto bg-green-600 text-white px-8 py-3.5 rounded-xl hover:bg-green-700 flex items-center justify-center text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        <Download className="w-5 h-5 mr-3" /> {t('common.button.export_xlsx', '導出 XLSX 名冊')}
                    </button>
                </div>
                <div className="overflow-x-auto max-h-[600px] no-scrollbar">
                    <table className="min-w-full divide-y divide-indigo-100 table-fixed text-sm">
                        <thead className="bg-indigo-50/50 sticky top-0 z-10 shadow-sm text-indigo-900 backdrop-blur-sm">
                            <tr>
                                <th onClick={() => handleSort('unit')} className="px-6 py-4 text-left font-black border-b border-indigo-100 w-32 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center">{t('common.unit', '單位')} <SortIcon col="unit" /></div>
                                </th>
                                <th onClick={() => handleSort('name')} className="px-6 py-4 text-left font-black border-b border-indigo-100 w-32 sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center">{t('common.name', '姓名')} <SortIcon col="name" /></div>
                                </th>
                                <th onClick={() => handleSort('birth_date')} className="px-6 py-4 text-right font-black border-b border-indigo-100 w-40 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center justify-end">{useROC ? t('common.col.birth_date_roc', '民國生日') : t('common.col.birth_date_ad', '西元生日')} <SortIcon col="birth_date" /></div>
                                </th>
                                <th onClick={() => handleSort('identity_id')} className="px-6 py-4 text-left font-black border-b border-indigo-100 w-48 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center">{t('common.col.identity_id', '身分證/居留證')} <SortIcon col="identity_id" /></div>
                                </th>
                                <th onClick={() => handleSort('guardian')} className="px-6 py-4 text-left font-black border-b border-indigo-100 w-40 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center">{t('common.col.guardian', '監護人')} <SortIcon col="guardian" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-indigo-50">
                            {normalRegistrations.map((reg) => (
                                <tr key={reg.reg_id} className="hover:bg-indigo-50 transition-colors group">
                                    <td className="px-6 py-4 text-gray-700 font-bold">{reg.unit}</td>
                                    <td className="px-6 py-4 font-black text-gray-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] group-hover:bg-indigo-50">{reg.name}</td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-right font-black">
                                        {useROC ? toROCDate(reg.birth_date) : reg.birth_date}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono font-black">{reg.identity_id}</td>
                                    <td className="px-6 py-4 text-gray-800 font-black">
                                        {getGuardian(reg)}
                                    </td>
                                </tr>
                            ))}
                            {normalRegistrations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-indigo-200 font-black text-xl italic uppercase tracking-widest opacity-40">
                                        {t('stake.insurance.msg.no_eligible_staff', '暫無符合投保資格的人員')}
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
