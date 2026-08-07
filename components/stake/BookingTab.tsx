
import React, { useState, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData, BusConfig, Registration, TripType, RegStatus, PaymentMethod } from '../../types';
import { updateEvent } from '../../services/eventService';
import { getSettings } from '../../services/settingsService';
import { assignMissingSerialNumbers } from '../../services/registrationService';
import { Download, Upload, Plus, Trash2, Bus, DollarSign, Save, Power, CheckCircle, Users, Settings, CreditCard } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import Toast, { ToastType } from '../Toast';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
import { useStats, calculateStats } from '../../hooks/useStats';
import RegistrationSwitch from './RegistrationSwitch';

interface BookingTabProps {
    currentEvent: EventData;
    registrations: Registration[]; // Added for stats
    onUpdateEvent: (event: EventData) => void;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const BookingTab: React.FC<BookingTabProps> = ({ currentEvent, registrations, onUpdateEvent, onRefresh, onPushToEditor }) => {
    const { t, tString } = useI18n();
    const settings = getSettings(); 
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    // Seat Management State
    const [busCountInput, setBusCountInput] = useState(currentEvent.bus_count || 0);
    const [deadlineInput, setDeadlineInput] = useState(currentEvent.paymentDeadlineDays || 0);
    const [regDeadlineInput, setRegDeadlineInput] = useState(currentEvent.registrationDeadline || '');
    const [isRegOpen, setIsRegOpen] = useState(currentEvent.is_registration_open ?? true);
    const [stopCancellation, setStopCancellation] = useState(currentEvent.stop_cancellation ?? false);
    const [isSeatLimited, setIsSeatLimited] = useState(currentEvent.is_seat_limited ?? false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // Immediate update helper
    const handleUpdateField = async (field: keyof EventData, value: any) => {
        const updated = { ...currentEvent, [field]: value };
        await updateEvent(updated);
        onUpdateEvent(updated);
        setMsgType('success');
        setMsg(t('stake.booking.alerts.settingAutoUpdated', '設定已自動更新'));
    };


    // Handle Config Save
    const handleUpdateConfig = async () => {
        const updated = { 
            ...currentEvent, 
            bus_count: busCountInput, 
            paymentDeadlineDays: deadlineInput,
            registrationDeadline: regDeadlineInput,
            is_registration_open: isRegOpen,
            is_seat_limited: isSeatLimited
        };
        await updateEvent(updated);
        onUpdateEvent(updated);
        setStatusMsg(t('stake.booking.alerts.settingSaved', '設定已儲存'));
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleBusConfigChange = (busName: string, updates: Partial<BusConfig>) => {
        const numericFields: (keyof BusConfig)[] = ['capacity', 'bookingCost', 'taxCost', 'driverMealCost', 'parkingCost', 'otherCost'];
        
        const newConfigs = (currentEvent.busConfigs || []).map(b => {
            if (b.name === busName) {
                const updatedBus = { ...b };
                Object.entries(updates).forEach(([key, val]) => {
                    (updatedBus as any)[key] = numericFields.includes(key as any) ? (parseInt(val as any) || 0) : val;
                });

                // Vxxx: Auto-calculate tax if rent (bookingCost) changed
                if ('bookingCost' in updates) {
                    updatedBus.taxCost = Math.round((updatedBus.bookingCost || 0) * 0.05);
                }

                return updatedBus;
            }
            return b;
        });
        
        const updated = { ...currentEvent, busConfigs: newConfigs };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleAddBus = () => {
        const currentCount = currentEvent.busConfigs?.length || 0;
        const newBusName = `${String.fromCharCode(65 + currentCount)}${t('bus.label.car', '車')}`; // A車, B車...
        const newBus: BusConfig = {
            name: newBusName,
            capacity: 42,
            bookingCost: 0,
            taxCost: 0,
            driverMealCost: 0,
            parkingCost: 0,
            otherCost: 0
        };
        const newConfigs = [...(currentEvent.busConfigs || []), newBus];
        const updated = { ...currentEvent, busConfigs: newConfigs };
        updateEvent(updated);
        onUpdateEvent(updated);
    };

    const handleRemoveBus = (busName: string) => {
        setDeleteTarget(busName);
    };

    const executeRemoveBus = () => {
        if (!deleteTarget) return;
        const newConfigs = (currentEvent.busConfigs || []).filter(b => b.name !== deleteTarget);
        const updated = { ...currentEvent, busConfigs: newConfigs };
        updateEvent(updated);
        onUpdateEvent(updated);
        setDeleteTarget(null);
    };

    const handleExport = () => {
        const data = currentEvent.busConfigs || [];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bus_configs_${currentEvent.event_date}.json`;
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
                    const updated = { ...currentEvent, busConfigs: data };
                    updateEvent(updated);
                    onUpdateEvent(updated);
                    setMsgType('success');
                    setMsg(t('stake.booking.alerts.importSuccess', '匯入成功'));
                }
            } catch (err) {
                setMsgType('error');
                setMsg(t('stake.booking.alerts.importFailed', '匯入失敗'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Check if deadline passed
    const isDeadlinePassed = regDeadlineInput && new Date(regDeadlineInput) < new Date();

    const { vehicleStats: eventStats, ordinanceStats } = useStats(currentEvent, registrations);

    const { busCapacity, currentBusRiders, waitingCount } = {
        busCapacity: eventStats.capacity,
        currentBusRiders: eventStats.occupied,
        waitingCount: eventStats.waiting
    }; 

    const handleAssignOrdinanceSerials = async () => {
        if (!currentEvent.event_id) return;
        const res = await assignMissingSerialNumbers(currentEvent.event_id, registrations);
        if (res.success) {
            setMsgType('success');
            setMsg(res.message);
            onRefresh();
        } else {
            setMsgType('error');
            setMsg(t('stake.booking.alerts.assignOrdinanceFailed', '分配教儀編號失敗: {{error}}', { error: res.message }));
        }
    };

    // Helper function to format a raw date string (e.g. YYYY-MM-DD) with Chinese weekday if available
    const formatDateWithWeekday = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('星期') || dateStr.includes('週') || dateStr.includes('周')) {
            return dateStr;
        }
        const match = dateStr.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
                const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const formattedDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                return `${formattedDate} ${weekdays[d.getDay()]}`;
            }
        }
        return dateStr;
    };

    // Vxxx: Local state for invoice fields to fix IME issues
    const [invoiceForm, setInvoiceForm] = useState<{ [key: string]: string }>({
        invoice_title: currentEvent.invoice_title || '',
        invoice_vat: currentEvent.invoice_vat || '',
        invoice_organizer: currentEvent.invoice_organizer || '',
        invoice_phone: currentEvent.invoice_phone || '',
        invoice_vehicles: currentEvent.invoice_vehicles || '',
        invoice_payment_terms: currentEvent.invoice_payment_terms || '',
        invoice_date: formatDateWithWeekday(currentEvent.invoice_date || currentEvent.event_date || ''),
        invoice_name: currentEvent.invoice_name || currentEvent.event_title || '',
    });

    // Sync local form when currentEvent changes (e.g. after save or from server)
    React.useEffect(() => {
        setInvoiceForm({
            invoice_title: currentEvent.invoice_title || '',
            invoice_vat: currentEvent.invoice_vat || '',
            invoice_organizer: currentEvent.invoice_organizer || '',
            invoice_phone: currentEvent.invoice_phone || '',
            invoice_vehicles: currentEvent.invoice_vehicles || '',
            invoice_payment_terms: currentEvent.invoice_payment_terms || '',
            invoice_date: formatDateWithWeekday(currentEvent.invoice_date || currentEvent.event_date || ''),
            invoice_name: currentEvent.invoice_name || currentEvent.event_title || '',
        });
    }, [
        currentEvent.invoice_title, 
        currentEvent.invoice_vat, 
        currentEvent.invoice_organizer, 
        currentEvent.invoice_phone,
        currentEvent.invoice_vehicles,
        currentEvent.invoice_payment_terms,
        currentEvent.invoice_date,
        currentEvent.invoice_name,
        currentEvent.event_date,
        currentEvent.event_title
    ]);

    const handleLocalInvoiceChange = (field: string, value: string) => {
        setInvoiceForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSyncInvoiceField = async (field: keyof EventData) => {
        let val = invoiceForm[field as string];
        if (field === 'invoice_date' && val) {
            val = formatDateWithWeekday(val);
            setInvoiceForm(prev => ({ ...prev, invoice_date: val }));
        }
        if (val !== currentEvent[field]) {
            await handleUpdateInvoiceField(field, val);
        }
    };

    // Dashboard block
    const handleUpdateInvoiceField = async (field: keyof EventData, value: any) => {
        const updated = { ...currentEvent, [field]: value };
        await updateEvent(updated);
        onUpdateEvent(updated);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24 text-sm">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            <ConfirmDialog 
                isOpen={!!deleteTarget}
                title={tString('stake.booking.modal.deleteBusTitle', '刪除車輛')}
                message={t('stake.booking.modal.deleteBusMsg', '確定要刪除 {{busName}} 嗎？', { busName: deleteTarget })}
                onConfirm={executeRemoveBus}
                onCancel={() => setDeleteTarget(null)}
                isDangerous={true}
            />

            {/* Main Header conforming to 60-30-10 & RWD rules */}
            <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-6">
                {/* Row 1: Title Row Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded border border-white/10 shadow-inner">
                        <Bus className="text-blue-300" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {t('stake.booking.title.bookingSettings', '訂車作業')}
                        </h2>
                    </div>
                </div>
            </div>
            
            {/* Row 2: Actions Aligned Right beneath title row - moved out of block */}
            <div className="flex flex-wrap justify-end gap-3 mt-[-1rem]">
                <button 
                    onClick={handleExport}
                    className="h-10 px-4 bg-slate-100 text-slate-700 rounded text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-all flex items-center active:scale-95 shadow-sm"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {t('common.export', '導出')}
                </button>
                <label className="h-10 px-4 bg-slate-100 text-slate-700 rounded text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-all flex items-center active:scale-95 cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4 mr-2" />
                    {t('common.load_file', '導入')}
                    <input type="file" className="hidden" accept=".json" onChange={handleImport}/>
                </label>
                <button 
                    onClick={handleAddBus}
                    className="h-10 px-6 bg-blue-600 text-white rounded text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('stake.booking.button.addBus', '新增車輛')}
                </button>
            </div>

            {/* Dashboard Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Seat Occupancy Block */}
                <div className="lg:col-span-2 bg-white rounded shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded text-blue-600 shadow-inner">
                                <Users size={20} />
                            </div>
                            <h3 className="text-base font-black text-slate-900 tracking-widest uppercase">
                                {t('stake.booking.title.vehicleStats', '座位預約監控')}
                            </h3>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mr-3">{t('stake.booking.label.totalCapacity', '總容納量')}</span>
                            <span className="text-2xl font-black text-blue-600 tracking-tighter">{busCapacity}</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 flex-1 bg-white">
                        <div className="relative">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                                    {t('stake.booking.label.occupiedRiders', '已佔用席位')}
                                </span>
                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{Math.round((currentBusRiders / (busCapacity || 1)) * 100)}% OCCUPIED</span>
                            </div>
                            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 shadow-inner p-0.5">
                                <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-1000 shadow-md relative" 
                                    style={{ width: `${Math.min(100, (currentBusRiders / (busCapacity || 1)) * 100)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-slate-50 p-5 rounded border border-slate-200 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t('stake.booking.label.occupiedRiders', '正式名單')}</div>
                                <div className="text-2xl font-black text-slate-900 tracking-tighter">{currentBusRiders}</div>
                            </div>
                            <div className="bg-amber-50 p-5 rounded border border-amber-200 shadow-sm">
                                <div className="text-[10px] font-black text-amber-600 mb-2 uppercase tracking-widest">{t('stake.booking.label.waitingCount', '候補名單')}</div>
                                <div className="text-2xl font-black text-amber-700 tracking-tighter">{waitingCount}</div>
                            </div>
                            <div className="bg-emerald-50 p-5 rounded border border-emerald-200 shadow-sm">
                                <div className="text-[10px] font-black text-emerald-600 mb-2 uppercase tracking-widest">{t('stake.booking.label.availableSeats', '剩餘空位')}</div>
                                <div className="text-2xl font-black text-emerald-700 tracking-tighter">{Math.max(0, busCapacity - currentBusRiders)}</div>
                            </div>
                            <div className="bg-indigo-900 p-5 rounded shadow-lg border border-indigo-800">
                                <div className="text-[10px] font-black text-indigo-200 mb-2 uppercase tracking-widest">{t('stake.booking.label.busCount', '營運台數')}</div>
                                <div className="text-2xl font-black text-white tracking-tighter">{currentEvent.busConfigs?.length || 0}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fleet Settings Block */}
                <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded text-indigo-600 shadow-inner">
                            <Settings size={20} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 tracking-widest uppercase">
                            {t('stake.booking.title.seatSettings', '營運規範')}
                        </h3>
                    </div>

                    <div className="p-8 space-y-8 flex-1 bg-white">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t('stake.booking.label.busCount', '計畫用車總量')}</label>
                            <div className="flex items-center gap-3 h-12">
                                <input 
                                    type="number" 
                                    value={busCountInput} 
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        setBusCountInput(val);
                                        handleUpdateField('bus_count', val);
                                    }}
                                    className="flex-1 h-full bg-slate-50 border border-slate-200 rounded px-5 text-lg font-black text-indigo-950 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-inner"
                                />
                                <span className="text-xs font-black text-slate-400 px-3 uppercase tracking-widest">{t('bus.label.unitCar', '台')}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-5 bg-[#F0F4F8] rounded border border-slate-200 shadow-sm">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 mb-1 tracking-tight">{t('stake.booking.label.seatLimited', '座位硬上限')}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cap Reg by Capacity</p>
                            </div>
                            <div 
                                className={`w-14 h-7 rounded-full p-1.5 cursor-pointer transition-all duration-500 shadow-inner ${isSeatLimited ? 'bg-blue-600' : 'bg-slate-300'}`}
                                onClick={() => {
                                    const val = !isSeatLimited;
                                    setIsSeatLimited(val);
                                    handleUpdateField('is_seat_limited', val);
                                }}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-500 transform ${isSeatLimited ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Invoice Info Block */}
            <div className="bg-white rounded shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded text-emerald-600 shadow-inner">
                        <CreditCard size={20} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 tracking-widest uppercase">
                        發票資訊
                    </h3>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">發票抬頭</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_title} 
                                onChange={e => handleLocalInvoiceChange('invoice_title', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_title')}
                                placeholder="請輸入公司名稱"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">統一編號</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_vat} 
                                onChange={e => handleLocalInvoiceChange('invoice_vat', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_vat')}
                                placeholder="8位數字"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">主辦姓名</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_organizer} 
                                onChange={e => handleLocalInvoiceChange('invoice_organizer', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_organizer')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">連絡電話</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_phone} 
                                onChange={e => handleLocalInvoiceChange('invoice_phone', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_phone')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">預訂車輛</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_vehicles} 
                                onChange={e => handleLocalInvoiceChange('invoice_vehicles', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_vehicles')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">付款條件</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_payment_terms} 
                                onChange={e => handleLocalInvoiceChange('invoice_payment_terms', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_payment_terms')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">活動日期</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_date} 
                                onChange={e => handleLocalInvoiceChange('invoice_date', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_date')}
                                placeholder="例如: 2026-08-15 星期六"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">活動名稱</label>
                            <input 
                                type="text" 
                                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded px-4 text-sm font-bold outline-none transition-all shadow-inner" 
                                value={invoiceForm.invoice_name} 
                                onChange={e => handleLocalInvoiceChange('invoice_name', e.target.value)} 
                                onBlur={() => handleSyncInvoiceField('invoice_name')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bus Configuration List */}
            <div className="space-y-8">
                {(currentEvent.busConfigs || []).map((config, i) => (
                    <div key={i} className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden group/bus transition-all duration-300 hover:border-blue-400 hover:shadow-xl">
                        {/* Bus Title Row */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-900 rounded text-white shadow-lg group-hover/bus:scale-110 transition-transform duration-300">
                                    <Bus size={22} />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stake.booking.label.alias', '車輛代稱')}</span>
                                    <input 
                                        type="text" 
                                        className={`h-10 text-xl font-black bg-white border border-slate-200 rounded focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all px-4 w-32 shadow-inner ${!config.name ? 'text-rose-500 border-rose-500' : 'text-slate-900'}`}
                                        value={config.name} 
                                        onChange={e => handleBusConfigChange(config.name, { name: e.target.value })}
                                        placeholder="EX: A車"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveBus(config.name)}
                                className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all active:scale-90 border border-transparent hover:border-rose-100"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                {/* Basic Info Section */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3 border-l-4 border-blue-600 pl-4 py-1">
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('stake.booking.title.bookingInfo', '訂車資訊')}</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.busCompany', '配合遊覽車公司')}</label>
                                            <select 
                                                className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded px-4 text-sm font-black outline-none cursor-pointer transition-all shadow-inner" 
                                                value={config.companyId || ''} 
                                                onChange={e => {
                                                    const comp = (settings.busCompanies || []).find(c => c.id === e.target.value);
                                                    handleBusConfigChange(config.name, { 
                                                        companyId: e.target.value,
                                                        company: comp?.name1 || ''
                                                    });
                                                }}
                                            >
                                                <option value="">{tString('bus.placeholder.selectCompany', '請選擇合作車行')}</option>
                                                {(settings.busCompanies || []).map(c => {
                                                    const names = [c.name1, c.name2, c.name3].filter(Boolean).join(' / ');
                                                    return <option key={c.id} value={c.id}>{names}</option>;
                                                })}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.licensePlate', '車牌號碼')}</label>
                                            <select 
                                                className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded px-4 text-sm font-black outline-none cursor-pointer transition-all shadow-inner" 
                                                value={config.licensePlate || ''} 
                                                onChange={e => {
                                                    const veh = (settings.busVehicles || []).find(v => v.plate === e.target.value);
                                                    const updates: Partial<BusConfig> = { licensePlate: e.target.value };
                                                    if (veh) updates.capacity = veh.seats;
                                                    handleBusConfigChange(config.name, updates);
                                                }}
                                            >
                                                <option value="">{tString('bus.placeholder.selectPlate', '選擇車牌')}</option>
                                                {(settings.busVehicles || []).filter(v => !config.companyId || v.companyId === config.companyId).map(v => (
                                                    <option key={v.plate} value={v.plate}>{v.plate}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.totalSeats', '座位配置總數')}</label>
                                            <div className="relative h-12">
                                                <input 
                                                    type="number"
                                                    className="w-full h-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded px-4 text-sm font-black outline-none transition-all shadow-inner"
                                                    value={config.capacity || ''} 
                                                    onChange={e => {
                                                        const updates: Partial<BusConfig> = { capacity: parseInt(e.target.value) || 0 };
                                                        handleBusConfigChange(config.name, updates);
                                                    }} 
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">Seats</span>
                                            </div>
                                        </div>

                                        {/* Driver Info */}
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-slate-200">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.driverName1', '主駕司機姓名')}</label>
                                                <select 
                                                    className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded px-4 text-sm font-black outline-none cursor-pointer transition-all shadow-inner" 
                                                    value={config.driverName1 || ''} 
                                                    onChange={e => {
                                                        const dri = (settings.busDrivers || []).find(d => d.name === e.target.value);
                                                        handleBusConfigChange(config.name, {
                                                            driverName1: e.target.value,
                                                            driverPhone1: dri?.phone || ''
                                                        });
                                                    }}
                                                >
                                                    <option value="">{tString('bus.placeholder.driver1', '選擇司機')}</option>
                                                    {(settings.busDrivers || []).filter(d => !config.companyId || d.companyId === config.companyId).map(d => (
                                                        <option key={d.name} value={d.name}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.driverPhone1', '司機聯繫電話')}</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded px-4 text-sm font-black outline-none transition-all shadow-inner" 
                                                    value={config.driverPhone1 || ''} 
                                                    onChange={e => handleBusConfigChange(config.name, { driverPhone1: e.target.value })} 
                                                    placeholder="0912-345-678" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Info Section */}
                                <div className="bg-[#F0F4F8] rounded p-8 border border-slate-200 flex flex-col shadow-inner relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <DollarSign size={120} className="text-indigo-900" />
                                    </div>
                                    <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 py-1 mb-8 relative z-10">
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('stake.booking.title.expenses', '訂車費用')}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.bookingCost', '租車費用')}</label>
                                            <input type="number" className="w-full h-12 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded px-5 text-right font-black text-slate-900 outline-none transition-all shadow-sm" value={config.bookingCost || 0} onChange={e => handleBusConfigChange(config.name, { bookingCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">所得稅扣繳 (5%)</label>
                                            <input type="number" className="w-full h-12 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded px-5 text-right font-black text-slate-900 outline-none transition-all shadow-sm" value={config.taxCost || 0} onChange={e => handleBusConfigChange(config.name, { taxCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.driverMealCost', '司機餐費')}</label>
                                            <input type="number" className="w-full h-12 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded px-5 text-right font-black text-slate-900 outline-none transition-all shadow-sm" value={config.driverMealCost || 0} onChange={e => handleBusConfigChange(config.name, { driverMealCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.parkingCost', '路費/停車費')}</label>
                                            <input type="number" className="w-full h-12 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded px-5 text-right font-black text-slate-900 outline-none transition-all shadow-sm" value={config.parkingCost || 0} onChange={e => handleBusConfigChange(config.name, { parkingCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stake.booking.label.otherCost', '雜項支出')}</label>
                                            <input type="number" className="w-full h-12 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded px-5 text-right font-black text-slate-900 outline-none transition-all shadow-sm" value={config.otherCost || 0} onChange={e => handleBusConfigChange(config.name, { otherCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-8 border-t-2 border-indigo-100 flex justify-between items-center relative z-10">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('stake.booking.label.totalExpenses', '費用合計')}</div>
                                        </div>
                                        <div className="text-4xl font-black text-indigo-900 tracking-tighter flex items-baseline">
                                            <span className="text-xl mr-2 text-indigo-400">$</span>
                                            {( (config.bookingCost || 0) + (config.taxCost || 0) + (config.driverMealCost || 0) + (config.parkingCost || 0) + (config.otherCost || 0) ).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(currentEvent.busConfigs || []).length === 0 && (
                    <div className="bg-white rounded border-4 border-dashed border-slate-100 p-20 text-center group hover:border-blue-100 transition-all duration-500 shadow-sm">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-inner">
                            <Bus className="text-slate-200" size={48} />
                        </div>
                        <h4 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('stake.booking.status.noBusConfigs', '目前尚無營運車輛')}</h4>
                        <p className="text-sm text-slate-300 font-bold tracking-tight">請點擊上方「新增車輛」按鈕開始規劃車隊</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingTab;
