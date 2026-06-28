
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, GlobalSettings, PaymentMethod, RegStatus, TripType } from '../../types';
import { saveSettings, updateRegistrationField, getActiveEvent, updateFamilyPaymentStatus, batchUpdatePaymentStatus } from '../../services/sheetService';
import { Settings, Download, Upload, Save, CheckSquare, Square, DollarSign, Bus, Lock, Unlock, RefreshCw, Check, Zap, XCircle, CheckCircle, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../ConfirmDialog';
import { useStats, useRanks } from '../../hooks/useStats';
import UnitFeeTable from './UnitFeeTable';
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
    const { t } = useTranslation();
    const [isPaymentLocked, setIsPaymentLocked] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{type: 'saveSettings' | 'export' | 'convertCash'} | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [isReconCollapsed, setIsReconCollapsed] = useState(false);
    const [batchConfirm, setBatchConfirm] = useState<{ isOpen: boolean, unit: string, count: number } | null>(null);
    
    // Reconciliation Tool State
    const [matchLast5, setMatchLast5] = useState('');
    const [matchAmount, setMatchAmount] = useState('');

    // Reconciliation Table State
    const [filterUnit, setFilterUnit] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

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

        registrations.filter(r => r.status === RegStatus.NORMAL).forEach(r => {
            if (r.payment_method === PaymentMethod.TRANSFER) {
                expectedTransfer += r.amount_due;
                if (r.is_paid) actualTransfer += r.amount_due;
            } else if (r.payment_method === PaymentMethod.CASH) {
                expectedCash += r.amount_due;
                if (r.is_paid) actualCash += r.amount_due;
            } else if (r.trip_type === TripType.RETAINED) {
                retainedAmount += r.amount_due;
            }
        });

        return { expectedTransfer, actualTransfer, expectedCash, actualCash, retainedAmount };
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
        const unpaidRegs = targetedRegs.filter(r => !r.is_paid && r.amount_due > 0 && r.payment_method !== PaymentMethod.EXTENDED);
        
        if (unpaidRegs.length === 0) return;

        setBatchConfirm({ isOpen: true, unit: unitName, count: unpaidRegs.length });
    };

    const executeBatchPaid = async (unitName: string) => {
        const targetedRegs = (groupedRegs[unitName] || []) as Registration[];
        const unpaidRegs = targetedRegs.filter(r => !r.is_paid && r.amount_due > 0 && r.payment_method !== PaymentMethod.EXTENDED);
        const regIds = unpaidRegs.map(r => r.reg_id);
        await batchUpdatePaymentStatus(regIds, true);
        setToastMsg(t('fee.msg.batch_paid_success', '{{unit}} 全部已收更新成功', { unit: unitName }));
        setTimeout(() => setToastMsg(null), 3000);
        onRefresh();
        setBatchConfirm(null);
    };

    // Calculate Family Groups Data for Matching
    const familyDataMap = useMemo(() => {
        const map = new Map<string, { totalAmount: number, last5: string, members: Registration[] }>();
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
        return map;
    }, [registrations]);

    const handleExportTransferRecords = (onlyUnpaid: boolean) => {
        if (!activeEvent) {
            setToastMsg(t('common.msg.event_info_not_found', '查無活動資訊'));
            setTimeout(() => setToastMsg(null), 3000);
            return;
        }

        const appVer = settings.app_version || 'V212';
        const stakeTitle = settings.stake_name || t('common.chiayi_stake', '嘉義支聯會');
        const eventDate = (activeEvent.event_date || '').replace(/\//g, '-');
        const eventName = activeEvent.event_title || t('common.event', '活動');
        const fileName = `${appVer}_${stakeTitle}_${eventDate}_${eventName}_${t('fee.payment_list', '收款名單')}.txt`;

        const maskNameHelper = (nameStr: string) => {
            if (!nameStr) return "";
            const isEnglish = /^[A-Za-z\s.-]+$/.test(nameStr);
            if (isEnglish) {
                const firstPart = nameStr.trim().split(/\s+/)[0];
                return `${firstPart} Ｏ`;
            } else {
                const cleanName = nameStr.trim();
                if (cleanName.length <= 1) return cleanName;
                if (cleanName.length === 2) return cleanName[0] + "Ｏ";
                const first = cleanName[0];
                const last = cleanName[cleanName.length - 1];
                return `${first}Ｏ${last}`;
            }
        };

        let content = `${activeEvent.event_date || ''} ${eventName}\n${t('fee.payment_list', '收款名單')}\n\n`;

        const unitsOrdered = [...settings.units].sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare);
        unitsOrdered.forEach(unit => {
            const unitRegs = registrations.filter(r => r.unit === unit && r.status === RegStatus.NORMAL);
            if (unitRegs.length === 0) return;

            // Group by family, excluding waitlisted members
            const families: Record<string, Registration[]> = {};
            unitRegs.forEach(r => {
                // If ranks exist, check if person has a rank (not waitlisted)
                const hasRank = vehicleRanks.has(r.reg_id);
                // If there are NO ranks loaded yet, we treat everyone as if they could be on the list
                const isWaitlisted = vehicleRanks.size > 0 ? !hasRank : false;

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
                const masked = maskNameHelper(f.primary.name);
                const statusStr = f.isAllPaid ? t('common.paid_short', '已收') : t('common.unpaid_short', '未收');
                const methodStr = f.method === PaymentMethod.TRANSFER ? t('common.payment.transfer', '轉帳') : (f.method === PaymentMethod.CASH ? t('common.payment.cash', '現金') : f.method);
                content += `${masked} ${methodStr} ${statusStr} ${f.totalDue.toLocaleString()}\n`;
            });
            content += `\n`;
        });

        content += `${t('common.url', '網址')} https://istake.org/\n`;
        content += t('common.customer_service_hint', '如需服務, 系統可留言, 感謝您.');

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
            const result = await updateFamilyPaymentStatus(matchFamilyId, true);
            if (result.success) {
                onRefresh();
                const firstMember = familyDataMap.get(matchFamilyId)?.members[0];
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
        } else if (matchCount > 1) {
            setToastMsg(t('fee.msg.multiple_matches_found', '發現多筆符合資料，請人工確認'));
        } else {
            setToastMsg(t('fee.msg.no_record_found', '查無此資料'));
        }
        
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
        settings.units.forEach(u => groups[u] = []);

        registrations.filter(r => {
            if (r.status !== RegStatus.NORMAL) return false;
            if (filterUnit && r.unit !== filterUnit) return false;
            if (filterName && !r.name.includes(filterName)) return false;
            if (filterPaid === 'paid' && !r.is_paid) return false;
            if (filterPaid === 'unpaid' && r.is_paid) return false;
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
    }, [registrations, filterUnit, filterName, filterPaid, settings.units]);

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            {toastMsg && (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-lg shadow-xl z-[200] font-bold flex items-center animate-fade-in border ${toastMsg.includes('成功') ? 'bg-green-600 text-white border-green-700' : 'bg-black text-yellow-400 border-yellow-500'}`}>
                    {toastMsg.includes('成功') ? <Check className="w-5 h-5 mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                    {toastMsg}
                </div>
            )}

            <ConfirmDialog 
                isOpen={isExportModalOpen}
                title={t('fee.export_selection', '選擇導出名單')}
                message={t('fee.export_scope_confirm', '請選擇要導出的收款名單範圍？')}
                confirmText={t('fee.export_all', '全部名單')}
                cancelText={t('fee.export_unpaid', '未收名單')}
                onConfirm={() => handleExportTransferRecords(false)}
                onCancel={() => handleExportTransferRecords(true)}
            />

            <ConfirmDialog 
                isOpen={!!batchConfirm?.isOpen}
                title={t('fee.batch_update_title', '批次更新')}
                message={t('fee.msg.batch_paid_confirm', '確定要將 {{unit}} 的 {{count}} 筆未收帳目全設為「已收」嗎？', { unit: batchConfirm?.unit, count: batchConfirm?.count })}
                onConfirm={() => batchConfirm && executeBatchPaid(batchConfirm.unit)}
                onCancel={() => setBatchConfirm(null)}
            />

            {/* 4. Detailed Reconciliation Section - Header Controls */}
            <div className="bg-indigo-50 rounded-lg shadow-sm border border-indigo-200 mb-6 overflow-hidden">
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-indigo-100 transition-colors"
                    onClick={() => setIsReconCollapsed(!isReconCollapsed)}
                >
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-indigo-900 text-base">{t('payment_audit')}</h3>
                    </div>
                    {isReconCollapsed ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronUp className="w-5 h-5 text-indigo-400" />}
                </div>

                <AnimatePresence>
                    {!isReconCollapsed && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-indigo-100"
                        >
                            <div className="p-4 space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex gap-2 items-center flex-wrap w-full md:w-auto">
                                        <select 
                                            className="border-2 border-indigo-200 rounded-lg text-sm h-10 px-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                            value={filterUnit} 
                                            onChange={e => setFilterUnit(e.target.value)}
                                        >
                                            <option value="">{t('common.all_units', '所有單位')}</option>
                                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                        <select 
                                            className="border-2 border-indigo-200 rounded-lg text-sm h-10 px-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                            value={filterPaid} 
                                            onChange={e => setFilterPaid(e.target.value as any)}
                                        >
                                            <option value="all">{t('common.all_status', '全部狀態')}</option>
                                            <option value="paid">{t('common.paid_short', '已收')}</option>
                                            <option value="unpaid">{t('common.unpaid_short', '未收')}</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            placeholder={t('common.search_name_placeholder', '搜尋姓名')} 
                                            className="border-2 border-indigo-200 rounded-lg text-sm h-10 px-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold w-full md:w-48" 
                                            value={filterName} 
                                            onChange={e => setFilterName(e.target.value)} 
                                        />
                                        
                                        <button 
                                            onClick={() => setIsPaymentLocked(!isPaymentLocked)} 
                                            className={`flex items-center px-4 h-10 rounded-lg text-sm font-black transition-all border-2 ${isPaymentLocked ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                                        >
                                            {isPaymentLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                                            {isPaymentLocked ? t('fee.locked', '已鎖定') : t('fee.editable', '可編輯')}
                                        </button>

                                        <button 
                                            onClick={() => setIsExportModalOpen(true)}
                                            className="flex items-center px-4 h-10 rounded-lg text-sm font-black transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-md border-2 border-indigo-700"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            {t('fee.payment_list', '收款名單')}
                                        </button>
                                    </div>
                                </div>

                                {/* Match Tool */}
                                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border-2 border-indigo-100 shadow-inner">
                                    <span className="text-sm font-black text-indigo-800">{t('fee.transfer_match', '轉帳比對')}:</span>
                                    <input 
                                        type="number" 
                                        placeholder={t('fee.match_amount_placeholder', '轉帳金額')} 
                                        className="border-2 border-indigo-100 rounded-lg text-sm h-10 px-3 w-40 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                        value={matchAmount} 
                                        onChange={e => setMatchAmount(e.target.value)} 
                                    />
                                    <input 
                                        type="text" 
                                        placeholder={t('fee.last_5_digits_placeholder', '末五碼')} 
                                        className="border-2 border-indigo-100 rounded-lg text-sm h-10 px-3 w-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                        value={matchLast5} 
                                        onChange={e => setMatchLast5(e.target.value)} 
                                    />
                                    <button 
                                        onClick={handleMatch}
                                        disabled={!matchLast5 || !matchAmount}
                                        className="bg-indigo-600 text-white px-5 h-10 rounded-lg text-sm font-black hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-all shadow-md border-2 border-indigo-700"
                                    >
                                        <Zap className="w-4 h-4 mr-2" /> {t('fee.match_and_update', '比對並更新')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Render Individual Unit Blocks - Rainbow Loop */}
            <div className="space-y-6">
                {Object.entries(groupedRegs).map(([unitName, regs], index) => {
                    const typedRegs = regs as Registration[];
                    // Assign Rainbow Theme
                    const theme = RAINBOW_THEMES[index % RAINBOW_THEMES.length];

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
                            theme={theme}
                        />
                    );
                })}
                {Object.keys(groupedRegs).length === 0 && (
                    <div className="text-center py-8 text-gray-400 bg-white border rounded-lg">{t('common.no_data_match', '無符合資料')}</div>
                )}
            </div>
        </div>
    );
};

export default FeeTab;
