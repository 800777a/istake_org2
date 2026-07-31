
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Registration, GlobalSettings, RegStatus, PaymentMethod, BlacklistItem, EventData, TripType, OrdinanceType, OrdinanceItem, DietaryType } from '../../types';
import { isPaymentOverdue } from '../../src/utils/registrationUtils';
import { deleteRegistration, batchImportRegistrations, subscribeToBlacklist, addBlacklistItem, deleteBlacklistItem, batchAddToBlacklist, assignMissingSerialNumbers } from '../../services/registrationService';
import { maskName } from '../../utils/maskUtils';
import { updateEvent } from '../../services/eventService';
import { Users, Download, Upload, Trash2, Search, Edit2, Clock, CheckCircle, ShieldAlert, AlertTriangle, UserX, Plus, ListOrdered, Power, Save, ChevronUp, ChevronDown, Activity, DollarSign, LayoutList, UserPlus, Info, LayoutDashboard, List, ChevronLeft, ChevronRight, PlusCircle, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RainbowCard, rainbowStyles } from './fee-config/RainbowCard';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';
import EditMemberModal from '../EditMemberModal';
import PaymentInfoModal from '../PaymentInfoModal';
import Toast, { ToastType } from '../Toast';
import { useStats, useRanks } from '../../hooks/useStats';
import { useI18n } from '../../src/contexts/LanguageContext';
import { useRemountOnResize } from '../../hooks/useRemountOnResize';

interface RegistrationTabProps {
    registrations: Registration[];
    settings: GlobalSettings;
    currentEventId: string;
    activeEvent: EventData | null;
    onRefresh: () => void;
    onUpdateEvent: (e: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

// Enterprise Light/High-Contrast Theme definitions
const THEME = {
    canvas: 'bg-[#F8F9FA]',
    card: 'bg-white rounded shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-[#A23400] text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none',
    sectionTitle: 'text-sm md:text-base lg:text-lg font-semibold tracking-tight',
    pageTitle: 'text-base md:text-lg lg:text-xl font-bold tracking-tight',
    bodyText: 'text-sm text-slate-600',
    tableText: 'text-[11px] md:text-xs lg:text-sm text-slate-900',
    btnPrimary: 'bg-[#A23400] hover:bg-[#8B2D00] text-white font-bold rounded transition-all active:scale-95 flex items-center justify-center gap-2 h-10 px-4 text-sm md:h-11 md:px-5 lg:h-10 lg:px-5',
    btnSecondary: 'bg-white hover:bg-orange-50 text-slate-700 border border-slate-200 font-bold rounded transition-all active:scale-95 flex items-center justify-center gap-2 h-10 px-4 text-sm md:h-11 md:px-5 lg:h-10 lg:px-5',
    input: 'w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all h-10 md:h-11 lg:h-10',
    badge: {
        paid: 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 px-2 py-0.5 rounded text-[10px]',
        pending: 'bg-orange-100 text-orange-900 font-bold border border-orange-200 px-2 py-0.5 rounded text-[10px]',
        failed: 'bg-rose-100 text-rose-900 font-bold border border-rose-200 px-2 py-0.5 rounded text-[10px]',
        muted: 'bg-slate-100 text-slate-700 font-bold border border-slate-200 px-2 py-0.5 rounded text-[10px]'
    }
};

const RegistrationTab: React.FC<RegistrationTabProps> = ({ registrations, settings, currentEventId, activeEvent, onRefresh, onUpdateEvent, onPushToEditor }) => {
    const { t, tString, currentLang: langCode } = useI18n();
    
    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = useMemo(() => {
        // Vxxx: Combine all potential sources of unit names
        const billingUnits = settings.billingConfig?.units?.map(u => u.shortName) || [];
        const configUnits = settings.units || [];
        const regUnits = registrations.map(r => r.unit).filter(u => u && String(u).trim() !== '');
        
        // Use Set to unique, then filter out empty/null/whitespace
        const allUnits = Array.from(new Set([...billingUnits, ...configUnits, ...regUnits]))
            .filter(u => u != null && String(u).trim() !== '');
        
        // Sort them: priority to billingUnits order, then configUnits, then alphabetical
        return allUnits.sort((a, b) => {
            const idxBillingA = billingUnits.indexOf(a);
            const idxBillingB = billingUnits.indexOf(b);
            if (idxBillingA !== -1 && idxBillingB !== -1) return idxBillingA - idxBillingB;
            if (idxBillingA !== -1) return -1;
            if (idxBillingB !== -1) return 1;
            
            const idxConfigA = configUnits.indexOf(a);
            const idxConfigB = configUnits.indexOf(b);
            if (idxConfigA !== -1 && idxConfigB !== -1) return idxConfigA - idxConfigB;
            if (idxConfigA !== -1) return -1;
            if (idxConfigB !== -1) return 1;

            return String(a).localeCompare(String(b));
        });
    }, [settings, registrations]);

    const i18n = { language: langCode }; 
    const [searchUnit, setSearchUnit] = useState('');
    const [searchName, setSearchName] = useState('');
    const [editTarget, setEditTarget] = useState<Registration | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    
    const [isStatsOpen, setIsStatsOpen] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
    
    // View mode and RWD
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const remountKey = useRemountOnResize();
    const [selectedPaymentReg, setSelectedPaymentReg] = useState<Registration | null>(null);
    const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const scrollTable = (unit: string, direction: 'left' | 'right') => {
        const wrapper = wrapperRefs.current[unit];
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
    }, []);

    // Sort State
    const [sortKey, setSortKey] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    // Registration Switch State (Shared with BookingTab)
    const [isRegOpen, setIsRegOpen] = useState(activeEvent?.is_registration_open ?? true);
    const [regDeadlineInput, setRegDeadlineInput] = useState(activeEvent?.registrationDeadline || '');
    const [stopCancellation, setStopCancellation] = useState(activeEvent?.stop_cancellation ?? false);

    const handleUpdateRegField = async (field: keyof EventData, value: any) => {
        if (!activeEvent) return;
        const updated = { 
            ...activeEvent, 
            [field]: value
        };
        await updateEvent(updated);
        onUpdateEvent(updated);
        setMsgType('success');
        setMsg(t('stake.registration.settings_updated', '設定已自動更新'));
    };
    
    // Blacklist State
    const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
    const [newBlacklistUnit, setNewBlacklistUnit] = useState('');
    const [newBlacklistName, setNewBlacklistName] = useState('');
    const [newBlacklistReason, setNewBlacklistReason] = useState<'欠費' | '犯規'>('欠費');
    const [blacklistDeleteId, setBlacklistDeleteId] = useState<string | null>(null);

    // Dialog Action
    const [confirmAction, setConfirmAction] = useState<{ type: 'importUnpaidToBlacklist' } | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const { vehicleRanks } = useRanks(registrations);

    useEffect(() => {
        const unsub = subscribeToBlacklist((list) => {
            setBlacklist(list);
        });
        return () => unsub();
    }, []);

    // Filter Logic for List
    const filteredRegs = useMemo(() => {
        return registrations.filter(r => {
            if (r.status === RegStatus.CANCELLED) return false;
            if (r.status === RegStatus.RESTRICTED) return false;
            if (r.status === RegStatus.DELETED) return false;
            if (r.status === RegStatus.RETAINED) return false;
            if (r.status === RegStatus.REFUNDED) return false;
            if (searchUnit && r.unit !== searchUnit) return false;
            if (searchName && !r.name.includes(searchName)) return false;
            return true;
        });
    }, [registrations, searchUnit, searchName]);

    // Build Primary Contact Map
    const primaryContactMap = useMemo(() => {
        const map = new Map<string, string>();
        registrations.forEach(r => {
            if (r.is_primary_contact) {
                map.set(r.family_group_id, r.name);
            }
        });
        return map;
    }, [registrations]);

    // Group by Unit
    const groupedRegs = useMemo(() => {
        const groups: Record<string, Registration[]> = {};
        unitOptions.forEach(u => groups[u] = []);
        
        // Apply Sorting
        const sorted = [...filteredRegs].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';
            
            switch (sortKey) {
                case 'representative':
                    valA = a.primary_contact_name || primaryContactMap.get(a.family_group_id) || '';
                    valB = b.primary_contact_name || primaryContactMap.get(b.family_group_id) || '';
                    break;
                case 'serial_number':
                    valA = Number(a.serial_number) || 0;
                    valB = Number(b.serial_number) || 0;
                    break;
                case 'name':
                    valA = a.name;
                    valB = b.name;
                    break;
                case 'amount_due':
                    valA = a.amount_due;
                    valB = b.amount_due;
                    break;
                case 'is_paid':
                    valA = a.is_paid ? 1 : 0;
                    valB = b.is_paid ? 1 : 0;
                    break;
                default:
                    valA = (a as any)[sortKey] || '';
                    valB = (b as any)[sortKey] || '';
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' 
                    ? valA.localeCompare(valB, 'zh-TW') 
                    : valB.localeCompare(valA, 'zh-TW');
            }
            return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });

        sorted.forEach(r => {
            if (!groups[r.unit]) groups[r.unit] = []; 
            groups[r.unit].push(r);
        });
        
        if (searchUnit || searchName) {
            Object.keys(groups).forEach(key => {
                if (groups[key].length === 0) delete groups[key];
            });
        }
        return groups;
    }, [filteredRegs, unitOptions, searchUnit, searchName, sortKey, sortOrder, primaryContactMap]);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const handleUnitSelect = (val: string) => {
        setSearchUnit(val);
    };

    const handleExportRegistrations = () => {
        const headers = [
            t('stake.registration.csv.id', 'ID'),
            t('stake.registration.csv.unit', '單位'),
            t('stake.registration.csv.representative', '代表人'),
            t('stake.registration.csv.name', '姓名'),
            t('stake.registration.csv.identity', '身分'),
            t('stake.registration.csv.trip', '行程'),
            t('stake.registration.csv.ordinance', '教儀'),
            t('stake.registration.csv.session', '場次'),
            t('stake.registration.csv.bus', '車次'),
            t('stake.registration.csv.payment', '付款方式'),
            t('stake.registration.csv.amount', '金額'),
            t('stake.registration.csv.status', '狀態')
        ].join(',');

        const csvContent = "\uFEFF" 
            + headers + "\n"
            + filteredRegs.map(r => {
                const primaryName = r.primary_contact_name || primaryContactMap.get(r.family_group_id) || t('common.unknown', '未知');
                return `${r.reg_id},${r.unit},${primaryName},${r.name},${r.identity_type},${r.trip_type},${r.ordinance_item},${r.ceremony_session || ''},${r.bus_assigned || ''},${r.payment_method},${r.amount_due},${r.status}`;
            }).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `registrations_full_list_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportList = (shouldMask: boolean, toEditor: boolean = false) => {
        if (!activeEvent) return;

        // Metadata
        const appVer = settings.app_version || 'V205';
        const stakeTitle = settings.stake_name || tString('common.stake_name_default', '嘉義支聯會');
        const eventTitle = activeEvent.event_title || tString('common.event_title_default', '聖殿旅行團');
        const eventDateStr = activeEvent.event_date.replace(/-/g, '');

        let content = `${activeEvent.event_date}\n${eventTitle} ${tString('stake.registration.export.list_suffix', '報名名單')}\n`;

        // Calculate Totals Across All Units
        let totalGo = 0;
        let totalBack = 0;
        let totalSelf = 0;

        const allValidRegs = registrations.filter(r => r.status !== RegStatus.CANCELLED);
        // Vxxx: Include waitlisted members in export, but we can separate them if needed. 
        // For now, let's keep them all to avoid empty list issues.
        const validRegs = allValidRegs; 

        totalGo = validRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO).length;
        totalBack = validRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK).length;
        totalSelf = validRegs.filter(r => r.trip_type === TripType.SELF_MANAGED).length;

        content += `${t('common.trip.outbound', '去程')}:${totalGo}${t('common.unit.people', '人')} ${t('common.trip.return', '回程')}:${totalBack}${t('common.unit.people', '人')} ${t('common.trip.self', '自理')}:${totalSelf}${t('common.unit.people', '人')}\n\n`;

        // Sort units by stroke count using short names from billing config
        const billingUnits = (settings.billingConfig?.units || []).map(u => u.shortName);
        const strokeSorter = new Intl.Collator('zh-Hant-TW-u-co-stroke').compare;
        const sortedUnits = [...billingUnits].sort(strokeSorter);

        sortedUnits.forEach(unit => {
            const unitRegs = validRegs.filter(r => r.unit === unit);
            if (unitRegs.length === 0) return;

            const unitGo = unitRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO).length;
            const unitBack = unitRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK).length;
            const unitSelf = unitRegs.filter(r => r.trip_type === TripType.SELF_MANAGED).length;

            content += `${unit}\n`;
            content += `${t('common.trip.outbound', '去程')}:${unitGo}${t('common.unit.people', '人')} ${t('common.trip.return', '回程')}:${unitBack}${t('common.unit.people', '人')} ${t('common.trip.self', '自理')}:${unitSelf}${t('common.unit.people', '人')}\n`;
            content += `${t('stake.registration.export.col_name', '姓名')} ${t('stake.registration.export.col_trip', '行程')} ${t('stake.registration.export.col_amount', '金額')} ${t('stake.registration.export.col_ordinance', '教儀項目')}\n`;

            // Sort within unit: primary contact first, then by name (stroke order)
            const sortedInUnit = [...unitRegs].sort((a, b) => {
                const repA = a.primary_contact_name || primaryContactMap.get(a.family_group_id) || '';
                const repB = b.primary_contact_name || primaryContactMap.get(b.family_group_id) || '';
                if (repA !== repB) return strokeSorter(repA, repB);
                return strokeSorter(a.name, b.name);
            });

            sortedInUnit.forEach(r => {
                let tripLabel = r.trip_type as string;
                if (r.trip_type === TripType.ROUND_TRIP) tripLabel = tString('common.trip.round_trip', '來回');
                else if (r.trip_type === TripType.ONE_WAY_TO) tripLabel = tString('common.trip.outbound', '去程');
                else if (r.trip_type === TripType.ONE_WAY_BACK) tripLabel = tString('common.trip.return', '回程');
                else if (r.trip_type === TripType.SELF_MANAGED) tripLabel = tString('common.trip.self', '自理');

                const { isWaitingLocal } = getBookingStatus(r);
                const waitlistSuffix = isWaitingLocal ? ` (${tString('common.status.waitlist', '候補')})` : '';
                const masked = maskName(r.name, shouldMask);

                content += `${masked} ${tripLabel} ${r.amount_due} ${r.ordinance_item || ''}${waitlistSuffix}\n`;
            });

            content += `\n`;
        });

        content += `${tString('stake.registration.export.footer_url', '網址 https://istake.org/')} \n${tString('stake.registration.export.footer_msg', '如需服務, 系統可留言, 感謝您.')}`;

        // Construct filename and download
        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
            setIsExportModalOpen(false);
            return;
        }
        
        const filename = `${appVer}_${stakeTitle}_${eventDateStr}_${eventTitle}_${tString('stake.registration.export.list_suffix', '報名名單')}.txt`;
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setIsExportModalOpen(false); // Close modal after work
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMsgType('info');
        setMsg(t('stake.registration.alerts.import_not_implemented', '匯入功能需實作後端邏輯'));
        e.target.value = '';
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        await deleteRegistration(deleteTarget);
        onRefresh();
        setDeleteTarget(null);
    };

    const handleImportUnpaidToBlacklist = () => {
        setConfirmAction({ type: 'importUnpaidToBlacklist' });
    };

    const executeImportUnpaidToBlacklist = async () => {
        const unpaidList = registrations.filter(r => r.status === RegStatus.NORMAL && !r.is_paid && r.amount_due > 0);
        
        // Filter out those already in blacklist (by unit + name combination)
        const newItems = unpaidList.filter(r => !blacklist.some(b => b.unit === r.unit && b.name === r.name));
        
        if (newItems.length === 0) {
            setMsgType('info');
            setMsg(t('stake.registration.alerts.no_unpaid_for_blacklist', '沒有符合條件的新欠費名單 (或已在黑名單中)'));
            setConfirmAction(null);
            return;
        }

        const itemsToAdd = newItems.map(r => ({
            unit: r.unit,
            name: r.name,
            reason: t('stake.registration.blacklist_reason_unpaid', '欠費') as any
        }));

        await batchAddToBlacklist(itemsToAdd);
        setMsgType('success');
        setMsg(t('stake.registration.alerts.blacklist_batch_success', { count: itemsToAdd.length, defaultValue: `已成功將 ${itemsToAdd.length} 位欠費成員加入黑名單。` }));
        setConfirmAction(null);
    };

    const handleAddBlacklistItem = async () => {
        if (!newBlacklistUnit || !newBlacklistName) return;
        await addBlacklistItem({
            unit: newBlacklistUnit,
            name: newBlacklistName,
            reason: newBlacklistReason
        });
        setNewBlacklistUnit('');
        setNewBlacklistName('');
        setNewBlacklistReason(t('stake.registration.blacklist_reason_unpaid', '欠費') as any);
    };

    const executeDeleteBlacklistItem = async () => {
        if (!blacklistDeleteId) return;
        await deleteBlacklistItem(blacklistDeleteId);
        setBlacklistDeleteId(null);
    };

    const handleAssignSerials = async () => {
        if (!currentEventId) return;
        const res = await assignMissingSerialNumbers(currentEventId, registrations);
        if (res.success) {
            setMsgType('success');
            setMsg(res.message);
            onRefresh();
        } else {
            setMsgType('error');
            setMsg(t('stake.registration.alerts.assign_serial_failed', { message: res.message, defaultValue: `分配編號失敗: ${res.message}` }));
        }
    };

    const getMethodBadge = (reg: Registration) => {
        if (reg.payment_method === PaymentMethod.EXTENDED) {
            return <span className={THEME.badge.muted}>{t('stake.registration.badge_extended', '延用')}</span>;
        }
        if (reg.amount_due === 0) return <span className={THEME.badge.muted}>{t('stake.registration.badge_free', '免付')}</span>;
        
        switch (reg.payment_method) {
            case PaymentMethod.CASH:
                return <span className={THEME.badge.pending}>{t('stake.registration.badge_cash', '現金')}</span>;
            case PaymentMethod.TRANSFER:
                return <span className="bg-blue-100 text-blue-900 font-semibold border border-blue-300 px-2 py-0.5 rounded text-[10px]">{t('stake.registration.badge_transfer', '轉帳')}</span>;
            default:
                return <span className={THEME.badge.muted}>{reg.payment_method}</span>;
        }
    };

    const getStatusBadge = (reg: Registration) => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED) return <span className={THEME.badge.muted}>{t('stake.registration.badge_waived', '免收')}</span>;
        
        if (reg.is_paid) {
            return <span className={THEME.badge.paid}>{t('stake.registration.badge_paid', '已收')}</span>;
        } else {
            return <span className={THEME.badge.failed}>{t('stake.registration.badge_unpaid', '未收')}</span>;
        }
    };

    const { vehicleStats: eventStats, ordinanceStats } = useStats(activeEvent, registrations);

    const handleAssignOrdinanceSerials = async () => {
        if (!currentEventId) return;
        const res = await assignMissingSerialNumbers(currentEventId, registrations);
        if (res.success) {
            setMsgType('success');
            setMsg(res.message);
            onRefresh();
        } else {
            setMsgType('error');
            setMsg(t('stake.registration.alerts.assign_ordinance_serial_failed', { message: res.message, defaultValue: `分配教儀編號失敗: ${res.message}` }));
        }
    };

    const getBookingStatus = (reg: Registration) => {
        let bookingStatus = t('common.status.processing', '處理中');
        let bookingColor = 'bg-gray-100 text-gray-600 border-gray-200';
        
        let isWaitingLocal = false;
        
        if (reg.trip_type === TripType.RETAINED) {
            bookingStatus = 'Roll over';
            bookingColor = 'bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-normal';
        } else if (reg.trip_type === TripType.SELF_MANAGED) {
            bookingStatus = t('common.status.no_seat', '無座');
            bookingColor = 'bg-gray-100 text-gray-800 border-gray-200 text-[10px] font-normal';
        } else {
            const capacity = (activeEvent?.busConfigs && activeEvent.busConfigs.length > 0) ? activeEvent.busConfigs.reduce((sum, b) => sum + (b.capacity || 42), 0) : ((activeEvent?.bus_count || 0) * 42);
            const isOverduePayment = isPaymentOverdue(reg, activeEvent);
            const isOverdueReg = activeEvent?.registrationDeadline && new Date(activeEvent.registrationDeadline).getTime() < Date.now();

            const rank = vehicleRanks.get(reg.reg_id);
            if (rank !== undefined) {
                if (rank <= capacity) {
                    if (isOverduePayment) {
                        bookingStatus = t('common.status.overdue_payment', '逾期繳費');
                        bookingColor = 'bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] font-normal';
                    } else {
                        bookingStatus = t('common.status.success', '成功');
                        bookingColor = 'bg-green-100 text-green-800 border-green-200 text-[10px] font-normal';
                    }
                } else {
                    isWaitingLocal = true;
                    if (isOverdueReg) {
                        bookingStatus = t('common.status.waitlist_failed', '候補失敗');
                        bookingColor = 'bg-red-100 text-red-800 border-red-200 text-[10px] font-normal';
                    } else {
                        bookingStatus = t('common.status.waitlist', '候補');
                        bookingColor = 'bg-red-100 text-red-800 border-red-200 text-[10px] font-normal';
                    }
                }
            }
        }
        
        return { bookingStatus, bookingColor, isWaitingLocal };
    };

    const statsOverview = useMemo(() => {
        const active = registrations.filter(r => r.status === RegStatus.NORMAL);
        const paidCount = active.filter(r => r.is_paid).length;
        const total = active.length;
        const amount = active.reduce((sum, r) => sum + r.amount_due, 0);
        return { total, paid: paidCount, unpaid: total - paidCount, amount };
    }, [registrations]);

    const handleAddMember = () => {
        if (!activeEvent) return;
        const newReg: Registration = {
            reg_id: `NEW-${Date.now()}`,
            event_id: activeEvent.event_id,
            family_group_id: `FAM-NEW-${Date.now()}`,
            is_primary_contact: true,
            primary_contact_name: '',
            name: '',
            phone: '',
            identity_id: '',
            birth_date: '',
            unit: unitOptions[0] || '',
            identity_type: '成人',
            trip_type: TripType.ROUND_TRIP,
            ordinance_type: OrdinanceType.PROXY,
            ordinance_item: OrdinanceItem.ENDOWMENT,
            ceremony_session: '',
            payment_method: PaymentMethod.CASH,
            amount_due: 0,
            is_paid: false,
            is_staff: false,
            is_new_member: false,
            is_checked_in: false,
            status: RegStatus.NORMAL,
            created_at: new Date().toISOString()
        };
        setEditTarget(newReg);
    };

    return (
        <div key={remountKey} className={`${THEME.canvas} min-h-screen pb-24 animate-fade-in`}>
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            {/* Level 1: Page Title Header */}
            <div className="bg-[#A23400] text-white px-4 py-5 md:px-6 md:py-6 shadow-lg flex items-center justify-between mx-1 md:mx-4 lg:mx-8 rounded mt-4 border-b-2 border-orange-800/30 font-title">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded border border-white/10">
                        <Users className="text-orange-200" size={20} />
                    </div>
                    <h2 className="text-base md:text-lg lg:text-xl font-black tracking-tight">
                        報名名單 (Registration List)
                    </h2>
                </div>
            </div>

            {/* Level 2: Action Row & View Switcher - Elevated Z-Index and Rainbow Styling */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 border-b-2 border-amber-200 px-4 py-3 sticky top-0 z-[100] shadow-md flex flex-col md:flex-row items-center justify-between gap-4 mx-1 md:mx-4 lg:mx-8 rounded mt-2 font-title min-w-0 overflow-visible">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button 
                        onClick={handleAddMember}
                        className={`h-10 px-4 rounded border-2 border-red-300 shadow-sm bg-red-100 text-red-900 font-bold hover:bg-red-200 transition-all text-sm flex items-center gap-2`}
                    >
                        <PlusCircle size={16} /> {t('common.add_member', '新增成員')}
                    </button>
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className={`h-10 px-4 rounded border-2 border-orange-300 shadow-sm bg-orange-100 text-orange-900 font-bold hover:bg-orange-200 transition-all text-sm flex items-center gap-2`}
                    >
                        <ListOrdered size={16} /> {t('stake.registration.export_txt', '匯出純文字')}
                    </button>
                    <button 
                        onClick={handleExportRegistrations}
                        className={`h-10 px-4 rounded border-2 border-emerald-300 shadow-sm bg-emerald-100 text-emerald-900 font-bold hover:bg-emerald-200 transition-all text-sm flex items-center gap-2`}
                    >
                        <Download size={16} /> CSV 報表
                    </button>
                </div>

                <div className="flex flex-1 items-center gap-2 w-full md:w-auto min-w-0">
                    <div className="relative flex-1 min-w-0 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700 group-focus-within:text-emerald-900" />
                        <input
                            type="text"
                            placeholder="搜尋 個人 (姓名、電話、身分證)..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 bg-emerald-50 border-2 border-emerald-200 rounded text-xs font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all truncate"
                        />
                    </div>
                    
                    <div className="relative w-40 shrink-0 group">
                        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 group-focus-within:text-blue-900" />
                        <select
                            value={searchUnit}
                            onChange={(e) => setSearchUnit(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 bg-blue-50 border-2 border-blue-200 rounded text-xs font-black text-blue-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer truncate"
                        >
                            <option value="">搜尋 單位</option>
                            {unitOptions.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center bg-white/50 rounded p-1 border-2 border-amber-300/30 gap-1 shrink-0">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded border-2 transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-md' : 'bg-blue-50 text-blue-400 border-blue-100 hover:bg-blue-100/50'}`}
                    >
                        <List size={16} />
                        <span className="text-xs font-black">列表</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('card')}
                        className={`px-3 py-1.5 rounded border-2 transition-all flex items-center gap-1.5 ${viewMode === 'card' ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-md' : 'bg-purple-50 text-purple-400 border-purple-100 hover:bg-purple-100/50'}`}
                    >
                        <LayoutDashboard size={16} />
                        <span className="text-xs font-black">卡片</span>
                    </button>
                </div>
            </div>

            {/* Step 1: Statistics Overview (Rainbow: Red) */}
            <div className="px-2 md:px-4 lg:px-8 mt-2">
                <RainbowCard
                    title={t('stake.registration.stats_title', '數據概覽 (Statistics Overview)')}
                    icon={<Activity size={20} />}
                    colorIndex={0}
                    isExpanded={isStatsOpen}
                    onToggle={() => setIsStatsOpen(!isStatsOpen)}
                >
                    <div className="space-y-6">
                        {/* Move Info/Badges here (below title, right aligned) */}
                        <div className="w-full flex justify-end gap-2 px-2">
                             <span className="text-[10px] font-black text-rose-700 bg-white/60 px-3 py-1 rounded-full border border-rose-300 uppercase tracking-widest">
                                Live Metrics
                             </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: '總報名人數', val: statsOverview.total, unit: '人', color: 'text-rose-600', icon: Users },
                                { label: '已繳費人數', val: statsOverview.paid, unit: '人', color: 'text-emerald-600', icon: CheckCircle },
                                { label: '待繳費人數', val: statsOverview.unpaid, unit: '人', color: 'text-amber-600', icon: Clock },
                                { label: '應收總金額', val: statsOverview.amount.toLocaleString(), unit: '元', color: 'text-blue-600', icon: DollarSign }
                            ].map((s, i) => (
                                <div key={i} className="bg-white/40 p-4 rounded shadow-sm border border-white/20 flex items-center gap-3 backdrop-blur-sm">
                                    <div className={`p-2 rounded ${s.color.replace('text-', 'bg-').replace('-600', '-50')}`}>
                                        <s.icon size={18} className={s.color} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{s.label}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-base md:text-lg font-bold text-slate-900">{s.val}</span>
                                            <span className="text-[10px] font-medium text-slate-400">{s.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </RainbowCard>
            </div>

            {editTarget && (
                <EditMemberModal 
                    registration={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={onRefresh}
                    settings={settings}
                    bookingStatus={getBookingStatus(editTarget).bookingStatus}
                />
            )}

            <ExportChoiceModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={(mask, toEditor) => handleExportList(mask, toEditor)}
            />

            <ConfirmDialog 
                isOpen={!!deleteTarget}
                title={t('stake.registration.delete_confirm_title', "刪除報名")}
                message={t('stake.registration.delete_confirm_msg', "確定要刪除此筆報名資料嗎？此操作不可逆。")}
                confirmText={t('common.delete', "刪除")}
                onConfirm={executeDelete}
                onCancel={() => setDeleteTarget(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'importUnpaidToBlacklist'}
                title={t('stake.registration.batch_blacklist_title', "批量傳入黑名單")}
                message={t('stake.registration.batch_blacklist_msg', "確定要將目前名單中所有「未繳費」的成員加入黑名單嗎？\n(限制理由將自動設為「欠費」)")}
                confirmText={t('stake.registration.batch_blacklist_confirm_btn', "確認傳入")}
                onConfirm={executeImportUnpaidToBlacklist}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!blacklistDeleteId}
                title={t('stake.registration.delete_blacklist_title', "刪除黑名單")}
                message={t('stake.registration.delete_blacklist_msg', "確定要將此人從黑名單中移除嗎？")}
                confirmText={t('common.remove', "移除")}
                onConfirm={executeDeleteBlacklistItem}
                onCancel={() => setBlacklistDeleteId(null)}
            />

            {/* Announcement Block */}
            {activeEvent && !activeEvent.is_registration_open && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded shadow-sm flex items-center gap-4 mx-4 md:mx-6">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-900">{t('stake.registration.closed_alert_title', '報名窗口已關閉')}</h4>
                        <p className="text-xs text-amber-700">{t('stake.registration.closed_alert_msg', '窗口目前已鎖定。僅供查看名單。')}</p>
                    </div>
                </div>
            )}

            {/* Main Management Block (Rainbow: Orange) */}
            <div className="px-2 md:px-4 lg:px-8 mt-2">
                <RainbowCard
                    title={t('stake.registration.list_mgmt', '批量處理工具 (Batch Processing Tools)')}
                    icon={<Search size={20} />}
                    colorIndex={1}
                    isExpanded={isFilterOpen}
                    onToggle={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <div className="space-y-6">
                        {/* Advanced Actions Row - Right Aligned */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                            <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase tracking-widest">操作:</span>
                            <button 
                                onClick={handleAssignSerials} 
                                className={`h-9 px-4 text-xs rounded transition-all font-bold shadow-sm border bg-white/60 ${rainbowStyles[1].text} ${rainbowStyles[1].border}`}
                            >
                                分配流水編號
                            </button>
                            <button 
                                onClick={handleAssignOrdinanceSerials} 
                                className={`h-9 px-4 text-xs rounded transition-all font-bold shadow-sm border bg-white/60 ${rainbowStyles[1].text} ${rainbowStyles[1].border}`}
                            >
                                分配教儀編號
                            </button>
                            <button 
                                onClick={handleImportUnpaidToBlacklist} 
                                className={`h-9 px-4 text-xs rounded transition-all font-bold shadow-sm border bg-white/60 ${rainbowStyles[1].text} ${rainbowStyles[1].border}`}
                            >
                                欠費傳入黑名單
                            </button>
                        </div>
                    </div>
                </RainbowCard>
            </div>

            {/* Blacklist Management Card (Rainbow: Yellow) */}
            <div className="px-2 md:px-4 lg:px-8 mt-2">
                <RainbowCard
                    title={t('stake.registration.blacklist_mgmt', '限制/欠費成員黑名單')}
                    icon={<ShieldAlert size={20} />}
                    colorIndex={2}
                    isExpanded={isBlacklistOpen}
                    onToggle={() => setIsBlacklistOpen(!isBlacklistOpen)}
                >
                    <div className="space-y-6">
                        {/* Summary Info - Below Title, Right Aligned */}
                        <div className="w-full flex justify-end px-2">
                            <span className="text-[10px] font-black text-amber-700 bg-white/60 px-3 py-1 rounded-full border border-amber-300 uppercase tracking-widest">
                                {blacklist.length} Records Found
                            </span>
                        </div>

                        {/* Add Blacklist Form */}
                        <div className="bg-white/40 p-5 rounded border border-white/20 shadow-sm space-y-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Plus size={14} className="text-blue-600" />
                                <span className="text-xs font-bold text-slate-700">新增黑名單成員</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <select 
                                        value={newBlacklistUnit} 
                                        onChange={e => setNewBlacklistUnit(e.target.value)}
                                        className={`${THEME.input} h-10 bg-white`}
                                    >
                                        <option value="">{t('stake.registration.select_unit', '選擇單位')}</option>
                                        {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                <input 
                                    type="text" 
                                    placeholder={t('stake.registration.name_placeholder', '姓名')}
                                    value={newBlacklistName}
                                    onChange={e => setNewBlacklistName(e.target.value)}
                                    className={`${THEME.input} h-10 bg-white`}
                                />
                                <select 
                                    value={newBlacklistReason} 
                                    onChange={e => setNewBlacklistReason(e.target.value as any)}
                                    className={`${THEME.input} h-10 bg-white`}
                                >
                                    <option value="欠費">{t('stake.registration.blacklist_reason_unpaid', '欠費')}</option>
                                    <option value="犯規">{t('stake.registration.blacklist_reason_violation', '犯規')}</option>
                                </select>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleAddBlacklistItem} 
                                        className={`h-10 px-6 rounded text-sm font-bold transition-all flex items-center gap-2 border ${rainbowStyles[2].bg} ${rainbowStyles[2].text} ${rainbowStyles[2].border}`}
                                    >
                                        <Plus size={16} /> {t('common.add', '新增')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Blacklist Items */}
                        <div className="overflow-x-auto rounded border border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">{t('stake.registration.csv.unit', '單位')}</th>
                                        <th className="px-4 py-3">{t('stake.registration.csv.name', '姓名')}</th>
                                        <th className="px-4 py-3">{t('stake.registration.blacklist_reason_col', '原因')}</th>
                                        <th className="px-4 py-3 text-center">{t('stake.registration.col_actions', '操作')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {blacklist.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">{item.unit}</td>
                                            <td className="px-4 py-3 font-bold">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.reason === '欠費' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                    {item.reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => setBlacklistDeleteId(item.id!)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors border border-rose-100 bg-white shadow-sm"
                                                    title={t('common.delete', "刪除")}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {blacklist.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                {t('stake.registration.no_blacklist', '目前尚無名單')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </RainbowCard>
            </div>

            {/* Registration Units (Rainbow: Blue onwards) */}
            <div className="px-2 md:px-4 lg:px-8 space-y-2 mt-2">
                {Object.keys(groupedRegs).length === 0 ? (
                    <div className="bg-white p-20 rounded border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-slate-400 animate-pulse">
                        <Users size={64} className="opacity-20" />
                        <p className="font-bold italic">{t('stake.registration.no_data', '查無成員資料')}</p>
                    </div>
                ) : (
                    Object.keys(groupedRegs).sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare).map((unit, unitIdx) => {
                        const regs = groupedRegs[unit];
                        const colorIdx = (unitIdx + 3) % 7;
                        const theme = rainbowStyles[colorIdx];
                        const isCollapsed = collapsedUnits[unit];

                        return (
                            <RainbowCard
                                key={unit}
                                title={`${unit} (${regs.length} ${t('common.unit.people', '人')})`}
                                icon={<Users size={20} />}
                                colorIndex={colorIdx}
                                isExpanded={!isCollapsed}
                                onToggle={() => setCollapsedUnits(prev => ({ ...prev, [unit]: !prev[unit] }))}
                                noPadding={viewMode === 'table'}
                            >
                                <div className="space-y-4">
                                    {viewMode === 'table' ? (
                                        <div className="space-y-0 min-w-0">
                                            {/* 行動端捲動輔助 (Mobile Scroll Assist) - Rule 4.1 Compliance */}
                                            <div className="md:hidden flex items-center justify-between mb-2 text-[10px] text-orange-700 bg-orange-100/50 px-2 py-2 rounded border-2 border-orange-200 font-title shadow-sm backdrop-blur-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="animate-bounce-h text-sm">←</div>
                                                    <span className="font-black">左右滑動檢視完整表格 (Slide to view)</span>
                                                    <div className="animate-bounce-h text-sm">→</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => scrollTable(unit, 'left')} className="bg-white px-3 py-1.5 rounded border-2 border-orange-300 shadow-sm active:scale-90 font-black text-orange-800">左移</button>
                                                    <button onClick={() => scrollTable(unit, 'right')} className="bg-white px-3 py-1.5 rounded border-2 border-orange-300 shadow-sm active:scale-90 font-black text-orange-800">右移</button>
                                                </div>
                                            </div>

                                            {/* 表格水平捲動容器（Shell-Zero 相容關鍵） - Rule 4.1 Compliance */}
                                            <div 
                                                ref={el => wrapperRefs.current[unit] = el}
                                                className="overflow-x-auto overscroll-x-contain -mx-2 px-2 md:-mx-4 md:px-4 lg:mx-0 lg:px-0 custom-scrollbar min-w-0 relative dense-table-wrapper"
                                            >
                                                <table className="min-w-[1200px] w-full [width:max-content] table-auto border-collapse font-body dense-table">
                                                    <thead>
                                                        <tr className={`${theme.header} text-[11px] md:text-sm font-black uppercase tracking-wider text-slate-700`}>
                                                            <th className={`px-2 py-4 md:px-4 md:py-5 text-center w-12 sticky left-0 z-20 ${theme.header} shadow-[2px_0_5px_rgba(0,0,0,0.1)] border-b-2 border-slate-300`}>#</th>
                                                            <th className={`px-2 py-4 md:px-4 md:py-5 text-left cursor-pointer hover:bg-black/5 sticky left-12 z-20 ${theme.header} shadow-[2px_0_5px_rgba(0,0,0,0.1)] border-b-2 border-slate-300`} onClick={() => toggleSort('representative')}>{t('stake.registration.csv.representative', '代表人')}</th>
                                                            <th className={`px-2 py-4 md:px-4 md:py-5 text-left cursor-pointer hover:bg-black/5 sticky left-[80px] md:left-[100px] z-20 ${theme.header} shadow-[2px_0_5px_rgba(0,0,0,0.1)] border-b-2 border-slate-300`} onClick={() => toggleSort('name')}>{t('stake.registration.csv.name', '姓名')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-left cursor-pointer hover:bg-black/5 border-b-2 border-slate-300" onClick={() => toggleSort('identity_type')}>{t('stake.registration.csv.identity', '身分')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-left border-b-2 border-slate-300">{t('stake.registration.csv.trip', '行程')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-left border-b-2 border-slate-300">{t('stake.registration.csv.ordinance', '教儀')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-left border-b-2 border-slate-300">{t('stake.registration.csv.bus', '車次/座號')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-right cursor-pointer hover:bg-black/5 border-b-2 border-slate-300" onClick={() => toggleSort('amount_due')}>{t('stake.registration.csv.amount', '金額')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-center cursor-pointer hover:bg-black/5 border-b-2 border-slate-300" onClick={() => toggleSort('is_paid')}>{t('stake.registration.csv.status', '狀態')}</th>
                                                            <th className="px-2 py-4 md:px-4 md:py-5 text-center border-b-2 border-slate-300">{t('stake.registration.col_actions', '操作')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 bg-white">
                                                        {regs.map((r, idx) => {
                                                            const { bookingStatus, bookingColor } = getBookingStatus(r);
                                                            return (
                                                                <tr key={r.reg_id} className="hover:bg-orange-50/50 transition-colors group">
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-center text-[10px] md:text-xs font-mono text-slate-400 sticky left-0 z-10 bg-white group-hover:bg-orange-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-100">{r.serial_number || idx + 1}</td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-[11px] md:text-sm font-bold text-orange-800 sticky left-12 z-10 bg-white group-hover:bg-orange-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap border-r border-slate-100">{r.primary_contact_name || primaryContactMap.get(r.family_group_id) || '--'}</td>
                                                                    <td 
                                                                        className="px-1 py-3 md:px-4 md:py-4 text-[11px] md:text-sm font-black text-slate-900 sticky left-[80px] md:left-[100px] z-10 bg-white group-hover:bg-orange-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap border-r border-slate-100 cursor-pointer hover:text-blue-600 transition-colors"
                                                                        onClick={() => setSelectedPaymentReg(r)}
                                                                    >
                                                                        {r.name}
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-[11px] md:text-sm text-slate-600 font-medium">{r.identity_type}</td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`px-2 py-0.5 rounded border text-[9px] md:text-[10px] font-black uppercase tracking-tighter ${bookingColor}`}>
                                                                                {bookingStatus}
                                                                            </span>
                                                                            <span className="text-[11px] md:text-sm text-slate-700 font-bold">{r.trip_type}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4">
                                                                        <div className="text-[11px] md:text-sm text-slate-800 font-bold">{r.ordinance_item}</div>
                                                                        <div className="text-[9px] md:text-[10px] text-slate-500 font-medium">{r.ceremony_session || ''}</div>
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[11px] md:text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block w-fit">{r.bus_assigned || '---'}</span>
                                                                            {r.seat_no && <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">座號: {r.seat_no}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-right">
                                                                        <div className="flex flex-col items-end gap-1.5">
                                                                            <span className="text-sm md:text-base font-black text-slate-900 tracking-tight">${r.amount_due}</span>
                                                                            {getMethodBadge(r)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-center">
                                                                        {getStatusBadge(r)}
                                                                    </td>
                                                                    <td className="px-1 py-3 md:px-4 md:py-4 text-center">
                                                                        <div className="flex justify-center gap-1.5 md:gap-3">
                                                                            <button onClick={() => setEditTarget(r)} className="p-2.5 text-orange-700 hover:bg-orange-100 rounded transition-all border-2 border-orange-200 shadow-sm active:scale-90"><Edit2 size={16} /></button>
                                                                            <button onClick={() => setDeleteTarget(r.reg_id)} className="p-2.5 text-rose-700 hover:bg-rose-100 rounded transition-all border-2 border-rose-200 shadow-sm active:scale-90"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Card Mode (Grid) */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {regs.map(r => {
                                                const { bookingStatus, bookingColor } = getBookingStatus(r);
                                                return (
                                                    <motion.div 
                                                        key={r.reg_id}
                                                        layout
                                                        className="bg-white rounded border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                                                    >
                                                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.level1}`}></div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">#{r.serial_number || '--'}</span>
                                                                <h4 
                                                                    className="text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                                                                    onClick={() => setSelectedPaymentReg(r)}
                                                                >
                                                                    {r.name}
                                                                </h4>
                                                                <p className="text-[10px] text-indigo-600 font-bold">{r.unit} • {r.identity_type}</p>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => setEditTarget(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={14} /></button>
                                                                <button onClick={() => setDeleteTarget(r.reg_id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="text-slate-500 font-medium">代表人:</span>
                                                                <span className="text-slate-900 font-bold">{r.primary_contact_name || primaryContactMap.get(r.family_group_id) || '--'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="text-slate-500 font-medium">行程/教儀:</span>
                                                                <span className="text-slate-900 font-bold">{r.trip_type} | {r.ordinance_item || '--'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="text-slate-500 font-medium">狀態:</span>
                                                                <div className="flex gap-1 items-center">
                                                                    <span className={`px-1.5 py-0.5 rounded border ${bookingColor}`}>{bookingStatus}</span>
                                                                    {getStatusBadge(r)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                                                                <span className="text-slate-500 font-medium">應付金額:</span>
                                                                <span className="text-sm font-black text-blue-600">${r.amount_due}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </RainbowCard>
                        );
                    })
                )}
            </div>

            {Object.keys(groupedRegs).length === 0 && (
                <div className="px-4 md:px-6">
                    <div className="bg-white/40 backdrop-blur-sm rounded border border-white/20 py-20 text-center shadow-sm">
                        <div className="bg-white/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">{t('stake.registration.no_matches', '查無任何報名資料')}</p>
                    </div>
                </div>
            )}

            {selectedPaymentReg && (
                <PaymentInfoModal
                    key={`payment-${selectedPaymentReg.reg_id}`}
                    currentReg={selectedPaymentReg}
                    allRegistrations={registrations}
                    settings={settings}
                    onClose={() => setSelectedPaymentReg(null)}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    );
};

export default RegistrationTab;
