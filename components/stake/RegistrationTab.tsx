
import React, { useState, useMemo, useEffect } from 'react';
import { Registration, GlobalSettings, RegStatus, PaymentMethod, BlacklistItem, EventData, TripType } from '../../types';
import { deleteRegistration, batchImportRegistrations, subscribeToBlacklist, addBlacklistItem, deleteBlacklistItem, batchAddToBlacklist, assignMissingSerialNumbers } from '../../services/registrationService';
import { updateEvent } from '../../services/eventService';
import { Users, Download, Upload, Trash2, Search, Edit2, Clock, CheckCircle, ShieldAlert, AlertTriangle, UserX, Plus, ListOrdered, Power, Save } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import ExportChoiceModal from '../ExportChoiceModal';
import EditMemberModal from '../EditMemberModal';
import Toast, { ToastType } from '../Toast';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
import { useStats, useRanks } from '../../hooks/useStats';
import RegistrationSwitch from './RegistrationSwitch';
import { useTranslation } from 'react-i18next';

interface RegistrationTabProps {
    registrations: Registration[];
    settings: GlobalSettings;
    currentEventId: string;
    activeEvent: EventData | null;
    onRefresh: () => void;
    onUpdateEvent: (e: EventData) => void;
    onPushToEditor?: (content: string) => void;
}

// Rainbow Themes Definition
const RAINBOW_THEMES = [
    { name: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', headerBg: 'bg-red-100', rowHover: 'group-hover:bg-red-50', badge: 'text-red-800 bg-red-100 border-red-200', highlight: 'text-red-700', divide: 'divide-red-200' },
    { name: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', headerBg: 'bg-orange-100', rowHover: 'group-hover:bg-orange-50', badge: 'text-orange-800 bg-orange-100 border-orange-200', highlight: 'text-orange-700', divide: 'divide-orange-200' },
    { name: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', headerBg: 'bg-yellow-100', rowHover: 'group-hover:bg-yellow-50', badge: 'text-yellow-800 bg-yellow-100 border-yellow-200', highlight: 'text-yellow-700', divide: 'divide-yellow-200' },
    { name: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', headerBg: 'bg-green-100', rowHover: 'group-hover:bg-green-50', badge: 'text-green-800 bg-green-100 border-green-200', highlight: 'text-green-700', divide: 'divide-green-200' },
    { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', headerBg: 'bg-blue-100', rowHover: 'group-hover:bg-blue-50', badge: 'text-blue-800 bg-blue-100 border-blue-200', highlight: 'text-blue-700', divide: 'divide-blue-200' },
    { name: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', headerBg: 'bg-indigo-100', rowHover: 'group-hover:bg-indigo-50', badge: 'text-indigo-800 bg-indigo-100 border-indigo-200', highlight: 'text-indigo-700', divide: 'divide-indigo-200' },
    { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', headerBg: 'bg-purple-100', rowHover: 'group-hover:bg-purple-50', badge: 'text-purple-800 bg-purple-100 border-purple-200', highlight: 'text-purple-700', divide: 'divide-purple-200' },
];

const RegistrationTab: React.FC<RegistrationTabProps> = ({ registrations, settings, currentEventId, activeEvent, onRefresh, onUpdateEvent, onPushToEditor }) => {
    const { t, i18n } = useTranslation();
    const [searchUnit, setSearchUnit] = useState('');
    const [searchName, setSearchName] = useState('');
    const [editTarget, setEditTarget] = useState<Registration | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    
    // Sort State
    const [sortKey, setSortKey] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Retained Management State
    const [pendingRetainedImport, setPendingRetainedImport] = useState<Registration[] | null>(null);
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
    const [confirmAction, setConfirmAction] = useState<{ type: 'exportRetained' | 'importUnpaidToBlacklist' } | null>(null);
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
        settings.units.forEach(u => groups[u] = []);
        
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
    }, [filteredRegs, settings.units, searchUnit, searchName, sortKey, sortOrder, primaryContactMap]);

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
        const stakeTitle = settings.stake_name || t('common.stake_name_default', '嘉義支聯會');
        const eventTitle = activeEvent.event_title || t('common.event_title_default', '聖殿之旅');
        const eventDateStr = activeEvent.event_date.replace(/-/g, '');

        // Name Masking Helper
        const maskName = (name: string) => {
            if (!name) return "";
            if (!shouldMask) return name; // Skip masking if chosen
            const isEnglish = /^[A-Za-z\s.-]+$/.test(name);
            if (isEnglish) {
                const firstPart = name.trim().split(/\s+/)[0];
                return `${firstPart} Ｏ`;
            } else {
                // Chinese names
                const cleanName = name.trim();
                if (cleanName.length <= 1) return cleanName;
                if (cleanName.length === 2) return cleanName[0] + "Ｏ";
                const first = cleanName[0];
                const last = cleanName[cleanName.length - 1];
                return `${first}Ｏ${last}`;
            }
        };

        let content = `${activeEvent.event_date}\n${eventTitle} ${t('stake.registration.export.list_suffix', '報名名單')}\n`;

        // Calculate Totals Across All Units
        let totalGo = 0;
        let totalBack = 0;
        let totalSelf = 0;

        const allValidRegs = registrations.filter(r => r.status !== RegStatus.CANCELLED);
        const validRegs = allValidRegs.filter(r => !getBookingStatus(r).isWaitingLocal);

        totalGo = validRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO).length;
        totalBack = validRegs.filter(r => r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK).length;
        totalSelf = validRegs.filter(r => r.trip_type === TripType.SELF_MANAGED).length;

        content += `${t('common.trip.outbound', '去程')}:${totalGo}${t('common.unit.people', '人')} ${t('common.trip.return', '回程')}:${totalBack}${t('common.unit.people', '人')} ${t('common.trip.self', '自理')}:${totalSelf}${t('common.unit.people', '人')}\n\n`;

        // Sort units by stroke count
        const strokeSorter = new Intl.Collator('zh-Hant-TW-u-co-stroke').compare;
        const sortedUnits = [...settings.units].sort(strokeSorter);

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
                if (r.trip_type === TripType.ROUND_TRIP) tripLabel = t('common.trip.round_trip', '來回');
                else if (r.trip_type === TripType.ONE_WAY_TO) tripLabel = t('common.trip.outbound', '去程');
                else if (r.trip_type === TripType.ONE_WAY_BACK) tripLabel = t('common.trip.return', '回程');
                else if (r.trip_type === TripType.SELF_MANAGED) tripLabel = t('common.trip.self', '自理');

                const { isWaitingLocal } = getBookingStatus(r);
                const waitlistSuffix = isWaitingLocal ? ` ${t('common.status.waitlist', '候補')}` : '';
                const masked = maskName(r.name);

                content += `${masked} ${tripLabel} ${r.amount_due} ${r.ordinance_item || ''}${waitlistSuffix}\n`;
            });

            content += `\n`;
        });

        content += `${t('stake.registration.export.footer_url', '網址 https://istake.org/')} \n${t('stake.registration.export.footer_msg', '如需服務, 系統可留言, 感謝您.')}`;

        // Construct filename and download
        if (toEditor && onPushToEditor) {
            onPushToEditor(content);
            setIsExportModalOpen(false);
            return;
        }
        
        const filename = `${appVer}_${stakeTitle}_${eventDateStr}_${eventTitle}_${t('stake.registration.export.list_suffix', '報名名單')}.txt`;
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

    // --- Retained Management Handlers ---

    const handleExportRetained = () => {
        setConfirmAction({ type: 'exportRetained' });
    };

    const executeExportRetained = () => {
        const retainedList = registrations.filter(r => r.trip_type === TripType.RETAINED && r.status === RegStatus.NORMAL);
        if (retainedList.length === 0) {
            setMsgType('info');
            setMsg(t('stake.registration.alerts.no_retained_to_export', '目前無「Roll over」成員可匯出'));
            setConfirmAction(null);
            return;
        }

        const json = JSON.stringify(retainedList, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `retained_members_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setConfirmAction(null);
    };

    const handleImportRetainedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (Array.isArray(data)) {
                    setPendingRetainedImport(data);
                } else {
                    setMsgType('error');
                    setMsg(t('stake.registration.alerts.invalid_json_array', '格式錯誤：需為 JSON 陣列'));
                }
            } catch (err) {
                setMsgType('error');
                setMsg(t('stake.registration.alerts.file_read_failed', '檔案讀取失敗'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const executeImportRetained = async () => {
        if (!pendingRetainedImport) return;
        const result = await batchImportRegistrations(pendingRetainedImport, currentEventId);
        if (result.success) {
            setMsgType('success');
            setMsg(t('stake.registration.alerts.import_success', { count: result.count, defaultValue: `成功匯入 ${result.count} 筆資料。\n付款狀態已設為「延用」且「已繳」。` }));
            onRefresh();
        } else {
            setMsgType('error');
            setMsg(t('stake.registration.alerts.import_failed', { message: result.message, defaultValue: `匯入失敗: ${result.message}` }));
        }
        setPendingRetainedImport(null);
    };

    // --- Blacklist Handlers ---

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
        if (reg.amount_due === 0) return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-bold border border-gray-200">{t('stake.registration.badge_free', '免付')}</span>;
        
        switch (reg.payment_method) {
            case PaymentMethod.CASH:
                return <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 font-bold border border-yellow-200">{t('stake.registration.badge_cash', '現金')}</span>;
            case PaymentMethod.TRANSFER:
                return <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold border border-blue-200">{t('stake.registration.badge_transfer', '轉帳')}</span>;
            case 'RETAINED' as any: 
                return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold border border-purple-200">Roll over</span>;
            case PaymentMethod.EXTENDED:
                return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 font-bold border border-gray-300">{t('stake.registration.badge_extended', '延用')}</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200">{reg.payment_method}</span>;
        }
    };

    const getStatusBadge = (reg: Registration) => {
        if (reg.amount_due === 0 || reg.payment_method === PaymentMethod.EXTENDED) return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-bold border border-gray-200">{t('stake.registration.badge_waived', '免收')}</span>;
        
        if (reg.is_paid) {
            return <span className="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-bold border border-green-200">{t('stake.registration.badge_paid', '已收')}</span>;
        } else {
            return <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold border border-red-200">{t('stake.registration.badge_unpaid', '未收')}</span>;
        }
    };

    // Calculate retained count for display
    const retainedCount = registrations.filter(r => r.trip_type === TripType.RETAINED && r.status === RegStatus.NORMAL).length;

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
            const isOverduePayment = !reg.is_paid && activeEvent?.paymentDeadlineDays && new Date(reg.created_at).getTime() + (activeEvent.paymentDeadlineDays * 86400000) < Date.now();
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

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            {editTarget && (
                <EditMemberModal 
                    registration={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={onRefresh}
                    settings={settings}
                    bookingStatus={getBookingStatus(editTarget).bookingStatus}
                />
            )}

            {/* Export Selection Modal */}
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
                isOpen={confirmAction?.type === 'exportRetained'}
                title={t('stake.registration.export_retained_title', "匯出 Roll over 名單")}
                message={t('stake.registration.export_retained_msg', { count: retainedCount, defaultValue: `確定要匯出所有「Roll over」成員的資料嗎？(共 ${retainedCount} 人)\n此檔案可用於下次活動匯入。` })}
                confirmText={t('stake.registration.export_retained_btn', "匯出存檔")}
                onConfirm={executeExportRetained}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmDialog 
                isOpen={!!pendingRetainedImport}
                title={t('stake.registration.import_retained_title', "匯入 Roll over 名單")}
                message={t('stake.registration.import_retained_msg', { count: pendingRetainedImport?.length, defaultValue: `讀取到 ${pendingRetainedImport?.length} 筆資料。\n確定要匯入並重建為本次活動的「Roll over」名單嗎？\n匯入後付款狀態將自動設為「Roll over / 已繳」。` })}
                confirmText={t('stake.registration.import_retained_confirm_btn', "確認匯入")}
                onConfirm={executeImportRetained}
                onCancel={() => setPendingRetainedImport(null)}
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

            {activeEvent && (
                <>
                    {/* Announcement Block - Blue */}
                    {!isRegOpen && (
                        <div id="reg-closed-alert" className="bg-blue-600 border border-blue-700 text-white p-6 rounded-2xl shadow-lg mb-8 animate-fade-in ring-4 ring-blue-500/20">
                            <div className="flex items-start gap-4">
                                <div className="bg-white/20 p-2 rounded-xl mt-1">
                                    <ShieldAlert className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="space-y-2">
                                        <p className="text-lg font-black leading-tight tracking-wide">
                                            {t('stake.registration.contact_organizer', '如有任何報名問題，請連繫主辦人。')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <RegistrationDashboard 
                        activeEvent={activeEvent}
                        eventStats={eventStats}
                        ordinanceStats={ordinanceStats}
                        deadlineDisplay={activeEvent.registrationDeadline ? new Date(activeEvent.registrationDeadline).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US') : t('stake.registration.not_set', '未設定')}
                        isClosed={activeEvent.status === 'cancelled' || activeEvent.is_registration_open === false}
                        lang={i18n.language as any}
                        onAssignOrdinanceSerials={handleAssignOrdinanceSerials}
                        onAssignVehicleSerials={handleAssignSerials}
                    />

                    {/* 1. Registration Switch Block - RED */}
                    <div id="reg-switch-block" className="bg-red-50 p-6 rounded-2xl shadow-sm border-2 border-red-200 mb-8 animate-fade-in">
                        <div className="flex flex-col mb-6 border-b border-red-100 pb-4">
                            <h3 className="font-black text-red-900 flex items-center text-xl">
                                <Power className="w-6 h-6 mr-3 text-red-700" /> {t('stake.registration.system_switch', '報名系統開關')}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            {msg && (
                                <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-lg border border-green-200 flex items-center font-black animate-pulse">
                                    <CheckCircle className="w-4 h-4 mr-2" /> {msg}
                                </div>
                            )}
                        </div>
                        <RegistrationSwitch 
                            isRegOpen={isRegOpen}
                            onToggle={(val) => {
                                setIsRegOpen(val);
                                handleUpdateRegField('is_registration_open', val);
                            }}
                            regDeadlineInput={regDeadlineInput}
                            onDeadlineChange={(val) => {
                                setRegDeadlineInput(val);
                                handleUpdateRegField('registrationDeadline', val);
                            }}
                            isDeadlinePassed={regDeadlineInput ? new Date(regDeadlineInput) < new Date() : false}
                            stopCancellation={stopCancellation}
                            onStopCancellationToggle={(val) => {
                                setStopCancellation(val);
                                handleUpdateRegField('stop_cancellation', val);
                            }}
                            paymentDeadlineDays={activeEvent.paymentDeadlineDays || 0}
                            onPaymentDeadlineChange={(val) => {
                                handleUpdateRegField('paymentDeadlineDays', val);
                            }}
                        />
                    </div>
                </>
            )}

            {/* Retained Management Block - Orange */}
            <div id="retained-mgmt-block" className="bg-orange-50 p-6 rounded-2xl shadow-sm border-2 border-orange-200 mb-8 animate-fade-in">
                <div className="flex flex-col mb-6 border-b border-orange-100 pb-4">
                    <h3 className="font-black text-orange-900 flex items-center text-xl">
                        <Clock className="w-6 h-6 mr-3 text-orange-700" /> {t('stake.registration.retained_mgmt', '留用管理 (Roll over Management)')}
                        <span className="ml-4 text-xs bg-orange-200 text-orange-900 px-3 py-1 rounded-xl border border-orange-300 font-black">
                            {t('stake.registration.retained_count_badge', { count: retainedCount, defaultValue: `目前累積 Roll over: ${retainedCount} 人` })}
                        </span>
                    </h3>
                </div>
                <div className="flex gap-4 flex-wrap">
                    <button 
                        id="export-retained-btn"
                        onClick={handleExportRetained}
                        className="bg-white border-2 border-orange-200 text-orange-900 px-6 py-3 rounded-xl text-sm flex items-center hover:bg-orange-100 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        <Download className="w-4 h-4 mr-2"/> {t('stake.registration.export_retained_btn_text', '匯出 Roll over 名單')}
                    </button>
                    <label id="import-retained-label" className="bg-white border-2 border-orange-200 text-orange-900 px-6 py-3 rounded-xl text-sm flex items-center hover:bg-orange-100 cursor-pointer font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                        <Upload className="w-4 h-4 mr-2"/> {t('stake.registration.import_retained_btn_text', '匯入 Roll over 名單')}
                        <input type="file" className="hidden" accept=".json" onChange={handleImportRetainedChange}/>
                    </label>
                </div>
                <div className="mt-2 text-xs text-indigo-800/70 font-bold leading-relaxed bg-white/50 p-4 rounded-xl border border-indigo-100">
                    {t('stake.registration.retained_desc', '💡 說明：當活動結束時，可將「留用」名單匯出存檔。在下次活動開始時，使用匯入功能讀取該檔案，系統會自動建立新的報名資料，並將付款方式設為「延用」，且標記為已繳費。')}
                </div>
            </div>

            {/* Header & Search - Yellow */}
            <div id="list-mgmt-block" className="bg-yellow-50 p-6 rounded-2xl shadow-sm border-2 border-yellow-200 mb-8 animate-fade-in">
                <div className="flex flex-col mb-8 border-b border-yellow-100 pb-4">
                    <h3 className="font-black text-yellow-900 flex items-center text-2xl">
                        <Users className="w-8 h-8 mr-3 text-yellow-700" /> {t('stake.registration.list_mgmt', '名單管理')}
                    </h3>
                </div>
                <div className="flex gap-4 flex-wrap mb-6">
                    <button id="export-full-csv-btn" onClick={handleExportRegistrations} className="bg-red-50 border-2 border-red-200 text-red-900 px-5 py-2.5 rounded-xl text-sm flex items-center hover:bg-red-100 font-black shadow-[3px_3px_0px_0px_rgba(185,28,28,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"><Download className="w-4 h-4 mr-2"/> {t('stake.registration.export_full_csv', '完整名單 CSV')}</button>
                    <label id="import-json-label" className="bg-orange-50 border-2 border-orange-200 text-orange-900 px-5 py-2.5 rounded-xl text-sm flex items-center hover:bg-orange-100 cursor-pointer font-black shadow-[3px_3px_0px_0px_rgba(194,65,12,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"><Upload className="w-4 h-4 mr-2"/> {t('stake.registration.import_json', '匯入資料 JSON')}<input type="file" className="hidden" accept=".json" onChange={handleImportFileChange}/></label>
                    <button id="export-txt-btn" onClick={() => setIsExportModalOpen(true)} className="bg-yellow-50 border-2 border-yellow-200 text-yellow-900 px-6 py-2.5 rounded-xl text-sm flex items-center hover:bg-yellow-100 font-black shadow-[4px_4px_0px_0px_rgba(161,98,7,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"><ListOrdered className="w-5 h-5 mr-2"/> {t('stake.registration.export_txt', '導出 txt 名單')}</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 p-6 rounded-2xl border border-violet-100">
                    <div className="flex flex-col col-span-1 md:col-span-2">
                        <label className="text-xs font-black text-violet-800 mb-2 uppercase opacity-70">{t('stake.registration.unit_filter_label', '單位篩選 (點擊切換):')}</label>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                id="all-units-btn"
                                onClick={() => handleUnitSelect('')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${searchUnit === '' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200' : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'}`}
                            >
                                {t('stake.registration.all_units', '全部單位')}
                            </button>
                            {settings.units.map((u, idx) => {
                                const theme = RAINBOW_THEMES[idx % RAINBOW_THEMES.length];
                                const isActive = searchUnit === u;
                                return (
                                    <button 
                                        key={u}
                                        id={`unit-filter-btn-${u}`}
                                        onClick={() => handleUnitSelect(u)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${isActive ? `${theme.headerBg} ${theme.text} ${theme.border} shadow-md ring-4 ring-indigo-500/5 scale-105` : `${theme.bg} ${theme.text} ${theme.border} opacity-60 hover:opacity-100`}`}
                                    >
                                        {u}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="hidden lg:flex flex-col">
                        <label className="text-xs font-black text-violet-800 mb-2 uppercase opacity-70">{t('stake.registration.unit_select_label', '單位選擇 (下拉清單):')}</label>
                        <select 
                            id="unit-search-select"
                            value={searchUnit}
                            onChange={e => handleUnitSelect(e.target.value)}
                            className="border-2 border-violet-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-900 w-full"
                        >
                            <option value="">{t('stake.registration.show_all_units', '顯示全部單位')}</option>
                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className="text-xs font-black text-violet-800 mb-2 uppercase opacity-70">{t('stake.registration.search_name_label', '搜尋成員姓名:')}</label>
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                                id="name-search-input"
                                type="text" 
                                placeholder={t('stake.registration.search_placeholder', "輸入關鍵字搜尋...")}
                                value={searchName}
                                onChange={e => setSearchName(e.target.value)}
                                className="pl-12 pr-4 py-3 border-2 border-violet-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-300 w-full text-gray-900 bg-white shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table - Rainbow Themes Loop */}
            {Object.entries(groupedRegs).map(([unitName, regs], index) => {
                const typedRegs = regs as Registration[];
                const cashTotal = typedRegs
                    .filter(r => r.payment_method === PaymentMethod.CASH && r.status !== RegStatus.CANCELLED)
                    .reduce((sum, r) => sum + r.amount_due, 0);
                const transferTotal = typedRegs
                    .filter(r => r.payment_method === PaymentMethod.TRANSFER && r.status !== RegStatus.CANCELLED)
                    .reduce((sum, r) => sum + r.amount_due, 0);
                
                // V300: Stats according to new request
                const goCount = typedRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_TO) && r.status !== RegStatus.CANCELLED).length;
                const backCount = typedRegs.filter(r => (r.trip_type === TripType.ROUND_TRIP || r.trip_type === TripType.ONE_WAY_BACK) && r.status !== RegStatus.CANCELLED).length;
                const selfCount = typedRegs.filter(r => r.trip_type === TripType.SELF_MANAGED && r.status !== RegStatus.CANCELLED).length;

                // Select Theme based on index
                const theme = RAINBOW_THEMES[index % RAINBOW_THEMES.length];

                return (
                    <div key={unitName} className={`rounded-lg shadow-sm border ${theme.bg} ${theme.border} overflow-hidden mb-4`}>
                        {/* Unit Header with Independent Row for Title */}
                        <div className={`px-4 py-3 border-b ${theme.border} ${theme.headerBg} flex flex-col gap-2`}>
                            <div className={`font-black text-lg ${theme.text} mb-1 border-b border-white/30 pb-1`}>
                                {unitName}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs bg-white px-2 py-0.5 rounded border ${theme.border} font-black ${theme.highlight} shadow-sm`}>
                                    {t('stake.registration.unit_stats_trip', { go: goCount, back: backCount, self: selfCount, defaultValue: `(去程:${goCount}人,回程:${backCount}人,自理:${selfCount}人)` })}
                                </span>

                                <span className={`text-xs bg-white px-2 py-0.5 rounded border ${theme.border} font-black text-blue-800 shadow-sm`}>
                                    {t('stake.registration.unit_stats_transfer', { amount: transferTotal.toLocaleString(), defaultValue: `(轉帳:${transferTotal.toLocaleString()})` })}
                                </span>

                                <span className={`text-xs font-black ${theme.text} bg-white px-2 py-0.5 rounded border ${theme.border} shadow-sm`}>
                                    {t('stake.registration.unit_stats_cash', { amount: cashTotal.toLocaleString(), defaultValue: `(現金:${cashTotal.toLocaleString()})` })}
                                </span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left whitespace-nowrap">
                                <thead className={`${theme.headerBg} border-b ${theme.border} ${theme.text} font-bold sticky top-0 z-10`}>
                                    <tr>
                                        <th id={`th-rep-${unitName}`} className={`p-3 sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] ${theme.headerBg} cursor-pointer hover:underline underline-offset-4 decoration-2`} onClick={() => toggleSort('representative')}>
                                            {t('stake.registration.col_representative', '代表人')} {sortKey === 'representative' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-serial-${unitName}`} className="p-3 cursor-pointer hover:underline" onClick={() => toggleSort('serial_number')}>
                                            {t('stake.registration.col_serial', '編號')} {sortKey === 'serial_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-name-${unitName}`} className="p-3 cursor-pointer hover:underline" onClick={() => toggleSort('name')}>
                                            {t('stake.registration.col_name', '姓名')} {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-ord-type-${unitName}`} className="p-3 text-center cursor-pointer hover:underline" onClick={() => toggleSort('ordinance_type')}>
                                            {t('stake.registration.col_ordinance_type', '教儀性質')} {sortKey === 'ordinance_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-ord-item-${unitName}`} className="p-3 cursor-pointer hover:underline" onClick={() => toggleSort('ordinance_item')}>
                                            {t('stake.registration.col_ordinance_item', '教儀項目')} {sortKey === 'ordinance_item' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-trip-${unitName}`} className="p-3 cursor-pointer hover:underline" onClick={() => toggleSort('trip_type')}>
                                            {t('stake.registration.col_trip', '行程')} {sortKey === 'trip_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-identity-${unitName}`} className="p-3 cursor-pointer hover:underline" onClick={() => toggleSort('identity_type')}>
                                            {t('stake.registration.col_identity', '身分')} {sortKey === 'identity_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-payment-${unitName}`} className="p-3 text-center cursor-pointer hover:underline" onClick={() => toggleSort('payment_method')}>
                                            {t('stake.registration.col_payment', '付款')} {sortKey === 'payment_method' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-amount-${unitName}`} className="p-3 text-right cursor-pointer hover:underline" onClick={() => toggleSort('amount_due')}>
                                            {t('stake.registration.col_amount', '金額')} {sortKey === 'amount_due' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-is-paid-${unitName}`} className="p-3 text-center cursor-pointer hover:underline" onClick={() => toggleSort('is_paid')}>
                                            {t('stake.registration.col_receipt', '收款')} {sortKey === 'is_paid' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th id={`th-booking-${unitName}`} className="p-3 text-center">{t('stake.registration.col_booking', '車位')}</th>
                                        <th id={`th-actions-${unitName}`} className="p-3 text-center">{t('stake.registration.col_actions', '操作')}</th>
                                    </tr>
                                </thead>
                                {/* Updated divide-y color to match theme border */}
                                <tbody className={`divide-y ${theme.divide} bg-white`}>
                                    {typedRegs.map(reg => {
                                        const { bookingStatus, bookingColor, isWaitingLocal } = getBookingStatus(reg);

                                        return (
                                        <tr key={reg.reg_id} id={`reg-row-${reg.reg_id}`} className={`transition-colors group ${theme.rowHover} ${isWaitingLocal ? 'bg-red-50' : ''}`}>
                                            <td className={`p-3 font-medium sticky left-0 bg-white ${theme.rowHover} z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-gray-600`}>
                                                {reg.primary_contact_name || primaryContactMap.get(reg.family_group_id) || t('stake.registration.unknown', '未知')}
                                            </td>
                                            <td className="p-3 font-mono font-bold text-gray-800 text-center">{reg.serial_number || '-'}</td>
                                            <td className="p-3 font-bold text-gray-800">
                                                {reg.name}
                                                {isWaitingLocal && <span className="ml-1 text-[8px] bg-red-600 text-white px-1 rounded">{t('stake.registration.waitlist_badge', '候補')}</span>}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-normal border whitespace-nowrap ${
                                                    reg.ordinance_type === '代替' ? 'bg-green-100 text-green-800 border-green-200' :
                                                    reg.ordinance_type === '活人' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    'bg-gray-100 text-gray-800 border-gray-200'
                                                }`}>
                                                    {reg.ordinance_type ? (
                                                        reg.ordinance_type === '活人' ? t('common.ordinance.living', '活人') :
                                                        reg.ordinance_type === '代替' ? t('common.ordinance.proxy', '代替') :
                                                        reg.ordinance_type
                                                    ) : t('common.ordinance.none', '不參加')}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-800">{reg.ordinance_item}</td>
                                            <td className="p-3 text-gray-800">{reg.trip_type}</td>
                                            <td className="p-3 text-gray-500 text-xs">{reg.identity_type}</td>
                                            
                                            {/* Payment Method */}
                                            <td className="p-3 text-center">
                                                {getMethodBadge(reg)}
                                            </td>
                                            
                                            {/* Amount */}
                                            <td className="p-3 text-right font-mono text-gray-800">${reg.amount_due}</td>
                                            
                                            {/* Receipt Status */}
                                            <td className="p-3 text-center">
                                                {getStatusBadge(reg)}
                                            </td>

                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs border whitespace-nowrap ${bookingColor}`}>
                                                    {bookingStatus}
                                                </span>
                                            </td>

                                            <td className="p-3 text-center flex gap-1 justify-center">
                                                <button onClick={() => setEditTarget(reg)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title={t('common.edit', "編輯")}>
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(reg.reg_id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title={t('common.delete', "刪除")}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
            {Object.keys(groupedRegs).length === 0 && (
                <div id="no-matches-msg" className="text-center py-8 text-gray-400 bg-white border rounded-lg">{t('stake.registration.no_matches', '無符合資料')}</div>
            )}
        </div>
    );
};

export default RegistrationTab;
