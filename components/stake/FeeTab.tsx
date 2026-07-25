
import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { Registration, GlobalSettings, PaymentMethod, RegStatus, TripType } from '../../types';
import { saveSettings, updateRegistrationField, getActiveEvent, updateFamilyPaymentStatus, batchUpdatePaymentStatus } from '../../services/sheetService';
import { Settings, Download, Upload, Save, CheckSquare, Square, DollarSign, Bus, Lock, Unlock, RefreshCw, Check, Zap, XCircle, CheckCircle, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../ConfirmDialog';
import { useStats, useRanks } from '../../hooks/useStats';
import { maskName } from '../../utils/maskUtils';
import UnitFeeTable from './UnitFeeTable';
import ExportChoiceModal from '../ExportChoiceModal';
import { ColorTheme } from './ReconciliationRow';

interface FeeTabProps {
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const RAINBOW_THEMES: ColorTheme[] = [
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', headerBg: 'bg-red-100', rowHover: 'hover:bg-red-50', lightText: 'text-red-700', badgeBg: 'bg-white', badgeText: 'text-red-800' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', headerBg: 'bg-orange-100', rowHover: 'hover:bg-orange-50', lightText: 'text-orange-700', badgeBg: 'bg-white', badgeText: 'text-orange-800' },
    { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', headerBg: 'bg-yellow-100', rowHover: 'hover:bg-yellow-50', lightText: 'text-yellow-700', badgeBg: 'bg-white', badgeText: 'text-yellow-800' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', headerBg: 'bg-green-100', rowHover: 'hover:bg-green-50', lightText: 'text-green-700', badgeBg: 'bg-white', badgeText: 'text-green-800' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', headerBg: 'bg-blue-100', rowHover: 'hover:bg-blue-50', lightText: 'text-blue-700', badgeBg: 'bg-white', badgeText: 'text-blue-800' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', headerBg: 'bg-indigo-100', rowHover: 'hover:bg-indigo-50', lightText: 'text-indigo-700', badgeBg: 'bg-white', badgeText: 'text-indigo-800' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', headerBg: 'bg-purple-100', rowHover: 'hover:bg-purple-50', lightText: 'text-purple-700', badgeBg: 'bg-white', badgeText: 'text-purple-800' },
];

const FeeTab: React.FC<FeeTabProps> = ({ registrations, settings, onRefresh, onPushToEditor }) => {
    const { t, tString } = useI18n();
    const [isPaymentLocked, setIsPaymentLocked] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{type: 'saveSettings' | 'export' | 'convertCash'} | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [isReconCollapsed, setIsReconCollapsed] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [batchConfirm, setBatchConfirm] = useState<{ isOpen: boolean, unit: string, count: number } | null>(null);
    
    // Reconciliation Tool State
    const [matchLast5, setMatchLast5] = useState('');
    const [matchAmount, setMatchAmount] = useState('');

    // Reconciliation Table State
    const [filterUnit, setFilterUnit] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid' | 'exempt'>('all');
    const [matchConfirmData, setMatchConfirmData] = useState<{ familyId: string, info: string } | null>(null);

    // Get Active Event for Bus Configs (Parking Cost)
    const activeEvent = getActiveEvent();

    const { vehicleRanks } = useRanks(registrations);

    // Calculate Finance Summary (Stats Block)
    const stats = useMemo(() => {
        let expectedTransfer = 0;
        let actualTransfer = 0;
        let expectedCash = 0;
        let actualCash = 0;
        let retainedAmount = 0;
        let exemptCount = 0;

        const eventData = getActiveEvent();
        const selfPaidInsuranceAmt = eventData?.self_paid_insurance_amount || 0;

        registrations.filter(r => r.status === RegStatus.NORMAL).forEach(r => {
            let amountWithInsurance = r.amount_due;
            
            // Primary contact carries the insurance flag for the whole family
            if (r.is_primary_contact && r.needs_self_paid_insurance) {
                const familyCount = registrations.filter(f => f.family_group_id === r.family_group_id && f.status === RegStatus.NORMAL).length;
                amountWithInsurance += (familyCount * selfPaidInsuranceAmt);
            }

            if (r.payment_method === PaymentMethod.TRANSFER) {
                expectedTransfer += amountWithInsurance;
                if (r.is_paid) actualTransfer += amountWithInsurance;
            } else if (r.payment_method === PaymentMethod.CASH) {
                expectedCash += amountWithInsurance;
                if (r.is_paid) actualCash += amountWithInsurance;
            } else if (r.trip_type === TripType.RETAINED) {
                retainedAmount += amountWithInsurance;
            }
            
            if (r.payment_method === PaymentMethod.EXEMPT) {
                exemptCount++;
            }
        });

        return { expectedTransfer, actualTransfer, expectedCash, actualCash, retainedAmount, exemptCount };
    }, [registrations]);

    // Calculate Cash Recovery Data
    const cashRecoveryData = useMemo(() => {
        const busMap: Record<string, { totalCash: number, navigator: string, units: Record<string, { total: number }> }> = {};
        
        registrations.filter(r => r.status === RegStatus.NORMAL && r.payment_method === PaymentMethod.CASH).forEach(r => {
            const bus = r.bus_assigned || '未分車';
            if (!busMap[bus]) busMap[bus] = { totalCash: 0, navigator: '', units: {} };
            
            if (!busMap[bus].units[r.unit]) busMap[bus].units[r.unit] = { total: 0 };
            
            busMap[bus].totalCash += r.amount_due;
            busMap[bus].units[r.unit].total += r.amount_due;
        });

        return Object.entries(busMap).map(([busName, data]) => {
            const config = activeEvent?.busConfigs?.find(b => b.name === busName);
            return {
                busName, 
                totalCash: data.totalCash,
                navigator: config?.navigatorName || '未指定', 
                units: data.units
            };
        });
    }, [registrations, activeEvent]);

    const handleTogglePaid = async (reg: Registration) => {
        if (isPaymentLocked) return;
        setToastMsg(t('common.updating', '更新中...'));
        try {
            await updateFamilyPaymentStatus(reg.family_group_id, !reg.is_paid);
            onRefresh();
            setToastMsg(t('fee.msg.payment_status_updated', '繳費狀態已更新'));
        } catch (error) {
            console.error('Update payment failed:', error);
            setToastMsg(t('common.update_failed', '更新失敗'));
        }
        setTimeout(() => setToastMsg(null), 2000);
    };

    const handleBatchPaid = async (unitName: string) => {
        if (isPaymentLocked) return;
        const targetedRegs = (groupedRegs[unitName] || []) as Registration[];
        const unpaidCashRegs = targetedRegs.filter(r => !r.is_paid && r.amount_due > 0 && r.payment_method === PaymentMethod.CASH);
        
        if (unpaidCashRegs.length === 0) return;

        setBatchConfirm({ isOpen: true, unit: unitName, count: unpaidCashRegs.length });
    };

    const executeBatchPaid = async (unitName: string) => {
        const targetedRegs = (groupedRegs[unitName] || []) as Registration[];
        const unpaidCashRegs = targetedRegs.filter(r => !r.is_paid && r.amount_due > 0 && r.payment_method === PaymentMethod.CASH);
        const regIds = unpaidCashRegs.map(r => r.reg_id);
        await batchUpdatePaymentStatus(regIds, true);
        setToastMsg(t('fee.msg.batch_paid_success', '{{unit}} 現金已收更新成功', { unit: unitName }));
        setTimeout(() => setToastMsg(null), 3000);
        onRefresh();
        setBatchConfirm(null);
    };

    // Calculate Family Groups Data for Matching
    const familyDataMap = useMemo(() => {
        const map = new Map<string, { totalAmount: number, last5: string, members: Registration[] }>();
        const eventData = getActiveEvent();
        const insuranceAmt = eventData?.self_paid_insurance_amount || 0;

        registrations.filter(r => r.status === RegStatus.NORMAL).forEach(r => {
            const fid = r.family_group_id;
            if (!map.has(fid)) {
                map.set(fid, { totalAmount: 0, last5: '', members: [] });
            }
            const group = map.get(fid)!;
            group.members.push(r);
            group.totalAmount += r.amount_due;
            if (r.transfer_last_5) group.last5 = r.transfer_last_5;
        });

        // Add insurance to total amount for families that need it
        for (const group of map.values()) {
            const primary = group.members.find(m => m.is_primary_contact) || group.members[0];
            if (primary?.needs_self_paid_insurance) {
                group.totalAmount += (group.members.length * insuranceAmt);
            }
        }

        return map;
    }, [registrations]);

    const handleExportTransferRecords = (shouldMask: boolean, toEditor: boolean = false, scope: 'all' | 'unpaid' = 'all') => {
        if (!activeEvent) {
            setToastMsg(t('common.msg.event_info_not_found', '查無活動資訊'));
            setTimeout(() => setToastMsg(null), 3000);
            return;
        }

        const onlyUnpaid = scope === 'unpaid';
        const appVer = settings.app_version || 'V212';
        const stakeTitle = settings.stake_name || t('common.chiayi_stake', '嘉義支聯會');
        const eventDate = (activeEvent.event_date || '').replace(/\//g, '-');
        const eventName = activeEvent.event_title || t('common.event', '活動');
        const fileName = `${appVer}_${stakeTitle}_${eventDate}_${eventName}_${t('fee.payment_list', '收款名單')}.txt`;

        let content = `${activeEvent.event_date || ''} ${eventName}\n${t('fee.payment_list', '收款名單')}\n\n`;

        const billingUnits = (settings.billingConfig?.units || []).map(u => u.shortName);
        const unitsOrdered = [...billingUnits].sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare);
        unitsOrdered.forEach(unit => {
            const unitRegs = registrations.filter(r => r.unit === unit && r.status === RegStatus.NORMAL);
            if (unitRegs.length === 0) return;

            // Group by family, excluding waitlisted members
            const families: Record<string, Registration[]> = {};
            unitRegs.forEach(r => {
                // If ranks exist, check if person has a rank (not waitlisted)
                // Vxxx: But we must check IF they need a seat. SELF_MANAGED don't have ranks but are NOT waitlisted.
                const needsSeat = r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED;
                const hasRank = vehicleRanks.has(r.reg_id);
                
                // Waitlisted only if they NEED a seat but don't have a rank
                const isWaitlisted = needsSeat && vehicleRanks.size > 0 && !hasRank;

                if (!isWaitlisted) {
                    if (!families[r.family_group_id]) families[r.family_group_id] = [];
                    families[r.family_group_id].push(r);
                }
            });

            const familySummaries = Object.values(families).map(members => {
                const primary = members.find(m => m.is_primary_contact) || members[0];
                const totalDue = members.reduce((sum, m) => sum + m.amount_due, 0);
                const paidMembers = members.filter(m => m.is_paid && m.amount_due > 0);
                const dueMembers = members.filter(m => m.amount_due > 0);
                
                let isAllPaid = false;
                if (dueMembers.length === 0) {
                    isAllPaid = true;
                } else if (primary.is_paid) {
                    isAllPaid = true;
                } else if (paidMembers.length >= dueMembers.length) {
                    isAllPaid = true;
                }

                return { primary, totalDue, isAllPaid, method: primary.payment_method };
            });

            // Filter by unpaid if requested
            const filteredFamilies = onlyUnpaid ? familySummaries.filter(f => !f.isAllPaid) : familySummaries;
            if (filteredFamilies.length === 0) return;

            content += `${unit}\n`;
            filteredFamilies.forEach(f => {
                const masked = maskName(f.primary.name, shouldMask);
                const statusStr = f.isAllPaid ? t('common.paid_short', '已收') : t('common.unpaid_short', '未收');
                const methodStr = f.method === PaymentMethod.TRANSFER ? t('common.payment.transfer', '轉帳') : (f.method === PaymentMethod.CASH ? t('common.payment.cash', '現金') : f.method);
                content += `${masked} ${methodStr} ${statusStr} ${f.totalDue.toLocaleString()}\n`;
            });
            content += `\n`;
        });

        content += `${t('common.url', '網址')} https://istake.org/\n`;
        content += t('common.customer_service_hint', '如需服務, 系統可留言, 感謝您.');

        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
            setToastMsg(t('fee.msg.payment_list_push_success', '已傳送至文書處理'));
        } else {
            // Use UTF-8 BOM for correct character display in Windows Notepad
            const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setToastMsg(t('fee.msg.payment_list_download_success', '收款名單下載成功'));
        }
        
        setTimeout(() => setToastMsg(null), 3000);
        setIsExportModalOpen(false);
    };

    const handleMatch = async () => {
        if (!matchLast5 || !matchAmount) return;
        const amount = parseInt(matchAmount);
        
        let matchFamilyId: string | null = null;
        let matchCount = 0;

        for (const [fid, data] of familyDataMap.entries()) {
            if (data.totalAmount === amount && data.last5 === matchLast5) {
                if (data.members.some(m => m.payment_method === PaymentMethod.TRANSFER)) {
                    matchFamilyId = fid;
                    matchCount++;
                }
            }
        }

        if (matchFamilyId && matchCount === 1) {
            const familyMembers = familyDataMap.get(matchFamilyId)?.members || [];
            const primaryName = familyMembers.find(m => m.is_primary_contact)?.name || familyMembers[0]?.name || '';
            const unit = familyMembers[0]?.unit || '';
            setMatchConfirmData({ 
                familyId: matchFamilyId, 
                info: `${unit} ${primaryName} (${amount.toLocaleString()})` 
            });
        } else if (matchCount > 1) {
            setToastMsg(t('fee.msg.multiple_matches_found', '發現多筆符合資料，請人工確認'));
            setTimeout(() => setToastMsg(null), 3000);
        } else {
            setToastMsg(t('fee.msg.no_record_found', '查無此資料'));
            setTimeout(() => setToastMsg(null), 3000);
        }
    };

    const confirmMatchUpdate = async () => {
        if (!matchConfirmData) return;
        const result = await updateFamilyPaymentStatus(matchConfirmData.familyId, true);
        if (result.success) {
            onRefresh();
            const firstMember = familyDataMap.get(matchConfirmData.familyId)?.members[0];
            if (firstMember) {
                const element = document.getElementById(`row-${firstMember.reg_id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-green-100');
                    setTimeout(() => element.classList.remove('bg-green-100'), 2000);
                }
            }
            setToastMsg(t('fee.msg.match_success', '比對成功！已將全家更新為「已收」'));
        } else {
            setToastMsg(t('common.update_failed', '更新失敗'));
        }
        setMatchConfirmData(null);
        setMatchAmount('');
        setMatchLast5('');
        setTimeout(() => setToastMsg(null), 3000);
    };

    const primaryContactMap = useMemo(() => {
        const map = new Map<string, string>();
        registrations.forEach(r => {
            if (r.is_primary_contact) {
                map.set(r.family_group_id, r.name);
            }
        });
        return map;
    }, [registrations]);

    // Filter and Group Logic
    const groupedRegs = useMemo<Record<string, Registration[]>>(() => {
        const groups: Record<string, Registration[]> = {};
        const billingUnits = (settings.billingConfig?.units || []).map(u => u.shortName);
        const strokeSorter = new Intl.Collator('zh-Hant-TW-u-co-stroke').compare;
        const sortedUnits = [...billingUnits].sort(strokeSorter);
        
        sortedUnits.forEach(u => groups[u] = []);

        registrations.filter(r => {
            if (r.status !== RegStatus.NORMAL) return false;
            if (filterUnit && r.unit !== filterUnit) return false;
            if (filterName && !r.name.includes(filterName)) return false;
            
            const isWaived = r.amount_due === 0 || r.payment_method === PaymentMethod.EXTENDED || r.payment_method === PaymentMethod.EXEMPT;
            
            if (filterPaid === 'paid' && !r.is_paid) return false;
            if (filterPaid === 'unpaid' && (r.is_paid || isWaived)) return false;
            if (filterPaid === 'exempt' && !isWaived) return false;
            return true;
        }).forEach(r => {
            if (!groups[r.unit]) groups[r.unit] = [];
            groups[r.unit].push(r);
        });

        if (filterUnit || filterName || filterPaid !== 'all') {
            Object.keys(groups).forEach(k => {
                if (groups[k].length === 0) delete groups[k];
            });
        }
        return groups;
    }, [registrations, filterUnit, filterName, filterPaid, settings.billingConfig?.units]);

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            {toastMsg && (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[200] font-black flex items-center animate-fade-in border-2 ${toastMsg.includes('成功') ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-amber-400 border-slate-700'}`}>
                    {toastMsg.includes('成功') ? <CheckCircle className="w-6 h-6 mr-3" /> : <XCircle className="w-6 h-6 mr-3" />}
                    {toastMsg}
                </div>
            )}

            <ExportChoiceModal 
                isOpen={isExportModalOpen}
                showScopeSelector={true}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={(mask, toEditor, scope) => handleExportTransferRecords(mask, toEditor, scope)}
            />

            <ConfirmDialog 
                isOpen={!!matchConfirmData}
                title={tString('fee.match_confirm_title', '自動對帳確認')}
                message={t('fee.match_confirm_msg', '比對成功，對象：{{info}}，是否將狀態改為「已收」？', { info: matchConfirmData?.info })}
                onConfirm={confirmMatchUpdate}
                onCancel={() => setMatchConfirmData(null)}
            />

            <ConfirmDialog 
                isOpen={!!batchConfirm?.isOpen}
                title={tString('fee.batch_update_title', '批次收款確認')}
                message={t('fee.msg.batch_paid_confirm', '確定要將 {{unit}} 的 {{count}} 筆「現金」未收帳目全設為「已收」嗎？', { unit: batchConfirm?.unit, count: batchConfirm?.count })}
                onConfirm={() => batchConfirm && executeBatchPaid(batchConfirm.unit)}
                onCancel={() => setBatchConfirm(null)}
            />

            {/* Header & Global Financial Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div 
                    className="bg-indigo-900 p-4 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                >
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <DollarSign size={20} className="text-blue-300" />
                        {t('stake.admin.tabs.payment_audit', '財務收款對帳中心')}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider hidden sm:inline">Financial Audit Control</span>
                        {isHeaderCollapsed ? <ChevronDown size={20} className="text-white" /> : <ChevronUp size={20} className="text-white" />}
                    </div>
                </div>

                {!isHeaderCollapsed && (
                    <div className="p-6 bg-[#F0F4F8]/30">
                        <div className="flex flex-col items-end gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm min-w-[160px]">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">轉帳實收</div>
                                    <div className="text-xl font-bold text-slate-900">${stats.actualTransfer.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm min-w-[160px]">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">現金實收</div>
                                    <div className="text-xl font-bold text-slate-900">${stats.actualCash.toLocaleString()}</div>
                                </div>
                                <div className="bg-blue-600 p-4 rounded-lg shadow-md min-w-[160px]">
                                    <div className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1">應收總額</div>
                                    <div className="text-xl font-bold text-white">${(stats.expectedTransfer + stats.expectedCash).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reconciliation Control Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div 
                    className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-200"
                    onClick={() => setIsReconCollapsed(!isReconCollapsed)}
                >
                    <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        {t('stake.admin.tabs.payment_audit', '智慧對帳與篩選工具')}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Automated Audit Tools</span>
                        {isReconCollapsed ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronUp size={20} className="text-slate-400" />}
                    </div>
                </div>

                <AnimatePresence>
                    {!isReconCollapsed && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="p-6 space-y-8 bg-[#F0F4F8]/10">
                                <div className="flex flex-col items-end gap-6">
                                    {/* Auto Match Row */}
                                    <div className="w-full space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('fee.receive_audit', '自動化轉帳查收工具')}</span>
                                        </div>
                                        <div className="flex flex-wrap justify-end items-center gap-3">
                                            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input 
                                                    type="number" 
                                                    placeholder="金額" 
                                                    className="w-full pl-9 pr-3 h-10 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" 
                                                    value={matchAmount} 
                                                    onChange={e => setMatchAmount(e.target.value)} 
                                                />
                                            </div>
                                            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
                                                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input 
                                                    type="text" 
                                                    placeholder="帳號末五碼" 
                                                    className="w-full pl-9 pr-3 h-10 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none uppercase" 
                                                    value={matchLast5} 
                                                    onChange={e => setMatchLast5(e.target.value)} 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleMatch}
                                                disabled={!matchLast5 || !matchAmount}
                                                className="h-10 px-6 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-30 transition-all flex items-center gap-2"
                                            >
                                                <RefreshCw size={14} />
                                                執行查收
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsExportModalOpen(true)}
                                            className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
                                        >
                                            <FileText size={16} className="text-rose-500" />
                                            導出名單
                                        </button>
                                        <button 
                                            onClick={() => setIsPaymentLocked(!isPaymentLocked)} 
                                            className={`h-10 px-4 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isPaymentLocked ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-600 text-white shadow-emerald-200'}`}
                                        >
                                            {isPaymentLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                            {isPaymentLocked ? '系統已鎖定' : '編輯模式中'}
                                        </button>
                                    </div>
                                </div>

                                {/* Filters Area */}
                                <div className="pt-6 border-t border-slate-200 space-y-4">
                                    <div className="flex flex-col items-end gap-4">
                                        <div className="flex flex-wrap justify-end gap-2 w-full">
                                            <button 
                                                onClick={() => setFilterUnit('')}
                                                className={`h-9 px-4 rounded-lg text-xs font-bold transition-all border ${filterUnit === '' ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                {t('common.all_units', '所有單位')}
                                            </button>
                                            {(settings.billingConfig?.units || []).map(u => u.shortName).sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare).map((u) => (
                                                <button 
                                                    key={u}
                                                    onClick={() => setFilterUnit(u)}
                                                    className={`h-9 px-4 rounded-lg text-xs font-bold transition-all border ${filterUnit === u ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {u}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3 w-full">
                                            <select 
                                                className="h-10 bg-white border border-slate-200 rounded-lg px-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500" 
                                                value={filterPaid} 
                                                onChange={e => setFilterPaid(e.target.value as any)}
                                            >
                                                <option value="all">所有收款狀態</option>
                                                <option value="paid">{tString('common.paid_short', '已實收')}</option>
                                                <option value="unpaid">{tString('common.unpaid_short', '待收款')}</option>
                                                <option value="exempt">免收/特殊項</option>
                                            </select>
                                            <div className="relative min-w-[200px]">
                                                <input 
                                                    type="text" 
                                                    placeholder="搜尋姓名..." 
                                                    className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500" 
                                                    value={filterName} 
                                                    onChange={e => setFilterName(e.target.value)} 
                                                />
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Units Rendering */}
            <div className="space-y-16">
                {Object.entries(groupedRegs).map(([unitName, regs]) => {
                    const typedRegs = regs as Registration[];
                    return (
                        <UnitFeeTable 
                            key={unitName}
                            unitName={unitName}
                            registrations={typedRegs}
                            familyDataMap={familyDataMap}
                            primaryContactMap={primaryContactMap}
                            onTogglePaid={handleTogglePaid}
                            onBatchPaid={handleBatchPaid}
                            isLocked={isPaymentLocked}
                        />
                    );
                })}
                {Object.keys(groupedRegs).length === 0 && (
                    <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-24 text-center group hover:border-indigo-200 transition-all">
                        <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                            <DollarSign className="text-slate-200" size={48} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-300 uppercase tracking-widest mb-2">{t('common.no_data_match', '查無符合條件之帳目')}</h4>
                        <p className="text-slate-400 font-bold">請嘗試調整篩選條件或重新搜尋</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeeTab;
