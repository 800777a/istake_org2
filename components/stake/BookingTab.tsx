
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, BusConfig, Registration, TripType, RegStatus, PaymentMethod } from '../../types';
import { updateEvent } from '../../services/eventService';
import { getSettings } from '../../services/settingsService';
import { assignMissingSerialNumbers } from '../../services/registrationService';
import { Download, Upload, Plus, Trash2, Bus, DollarSign, Save, Power, CheckCircle, Users, Settings } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import Toast, { ToastType } from '../Toast';
import RegistrationDashboard from '../../src/components/registration/RegistrationDashboard';
import { useStats } from '../../hooks/useStats';
import RegistrationSwitch from './RegistrationSwitch';

interface BookingTabProps {
    currentEvent: EventData;
    registrations: Registration[]; // Added for stats
    onUpdateEvent: (event: EventData) => void;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const BookingTab: React.FC<BookingTabProps> = ({ currentEvent, registrations, onUpdateEvent, onRefresh, onPushToEditor }) => {
    const { t } = useTranslation();
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

    // Calculate Capacity Stats
    const { busCapacity, currentBusRiders, waitingCount, normalCount } = useMemo(() => {
        const capacity = (currentEvent.busConfigs || []).reduce((sum, bus) => sum + Number(bus.capacity || 0), 0);

        const validRegs = registrations.filter(r => r.status !== RegStatus.CANCELLED);
        // V300: Exclude '留用' (RETAINED) from bus seat counters
        const seatOccupiers = validRegs.filter(r => r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED);
        const normalSeatOccupiers = seatOccupiers.filter(r => r.status === RegStatus.NORMAL);
        const waitingSeatOccupiers = seatOccupiers.filter(r => r.status === RegStatus.WAITING);

        return {
            busCapacity: capacity,
            currentBusRiders: normalSeatOccupiers.length,
            waitingCount: waitingSeatOccupiers.length,
            normalCount: normalSeatOccupiers.length
        };
    }, [registrations, currentEvent]); 

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
        const numericFields: (keyof BusConfig)[] = ['capacity', 'bookingCost', 'driverMealCost', 'parkingCost', 'otherCost'];
        
        const newConfigs = (currentEvent.busConfigs || []).map(b => {
            if (b.name === busName) {
                const updatedBus = { ...b };
                Object.entries(updates).forEach(([key, val]) => {
                    (updatedBus as any)[key] = numericFields.includes(key as any) ? (parseInt(val as any) || 0) : val;
                });
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



    return (
        <div className="p-6 md:p-0 animate-fade-in relative pb-24">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            <ConfirmDialog 
                isOpen={!!deleteTarget}
                title={t('stake.booking.modal.deleteBusTitle', '刪除車輛')}
                message={t('stake.booking.modal.deleteBusMsg', '確定要刪除 {{busName}} 嗎？', { busName: deleteTarget })}
                onConfirm={executeRemoveBus}
                onCancel={() => setDeleteTarget(null)}
                isDangerous={true}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 1. Vehicle Reservation Stats (車輛座位預約) */}
                <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border-2 border-blue-200">
                    <div className="flex items-center mb-6 border-b border-blue-100 pb-4">
                        <h3 className="font-black text-blue-900 flex items-center text-xl">
                            <Users className="w-6 h-6 mr-3 text-blue-700" /> {t('stake.booking.title.vehicleStats', '車輛座位預約')}
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-600">{t('stake.booking.label.totalCapacity', '總容納量')}</span>
                                <span className="font-black text-2xl text-blue-600">{busCapacity} <span className="text-xs">{t('common.seats', '席')}</span></span>
                            </div>
                            <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (currentBusRiders / (busCapacity || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-xl border border-green-100">
                                <div className="text-[10px] font-bold text-green-600 mb-1">{t('stake.booking.label.occupiedRiders', '已佔用人數')}</div>
                                <div className="text-xl font-black text-green-700">{currentBusRiders}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-red-100">
                                <div className="text-[10px] font-bold text-red-600 mb-1">{t('stake.booking.label.waitingCount', '候補人數')}</div>
                                <div className="text-xl font-black text-red-700">{waitingCount}</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold px-1">
                            <span className="text-gray-500">{t('stake.booking.label.normalSeat', '正常位')}: {normalCount}</span>
                            <span className="text-blue-600">{t('stake.booking.label.availableSeats', '可調度')}: {Math.max(0, busCapacity - currentBusRiders)} {t('common.seats', '席')}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Seat Management (車輛座位設定) */}
                <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border-2 border-indigo-200">
                    <div className="flex items-center mb-6 border-b border-indigo-100 pb-4">
                        <h3 className="font-black text-indigo-900 flex items-center text-xl">
                            <Settings className="w-6 h-6 mr-3 text-indigo-700" /> {t('stake.booking.title.seatSettings', '車輛座位設定')}
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                            <label className="text-sm font-black text-indigo-800">{t('stake.booking.label.busCount', '車輛台數')}</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" 
                                    value={busCountInput} 
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        setBusCountInput(val);
                                        handleUpdateField('bus_count', val);
                                    }}
                                    className="border-2 border-indigo-100 rounded-lg px-3 py-2 text-sm w-24 text-right font-black text-indigo-900 focus:ring-2 focus:ring-indigo-300 outline-none"
                                />
                                <span className="text-xs font-bold text-gray-500">{t('bus.label.unitCar', '台')}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                            <label className="text-sm font-black text-indigo-800">{t('stake.booking.label.seatLimited', '座位限制')}</label>
                            <button 
                                onClick={() => {
                                    const val = !isSeatLimited;
                                    setIsSeatLimited(val);
                                    handleUpdateField('is_seat_limited', val);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${isSeatLimited ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' : 'bg-gray-100 text-gray-500 border-gray-200 opacity-60'}`}
                            >
                                {isSeatLimited ? <><CheckCircle className="w-4 h-4" /> {t('common.status.on', '已開啟')}</> : t('common.status.off', '已關閉')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Info Block (訂車設定) */}
            <div className="bg-green-50 p-6 rounded-2xl shadow-sm border-2 border-green-200 mb-6">
                <div className="flex justify-between items-center mb-6 border-b border-green-100 pb-4">
                    <h3 className="font-black text-green-900 flex items-center text-xl">
                        <Bus className="w-7 h-7 mr-3 text-green-700" /> {t('stake.booking.title.bookingSettings', '訂車設定')}
                    </h3>
                    <button 
                        onClick={handleAddBus}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" /> {t('stake.booking.button.addBus', '新增車輛')}
                    </button>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {(currentEvent.busConfigs || []).map((config, i) => (
                        <div key={i} className="border-2 border-green-100 p-6 rounded-2xl bg-white relative shadow-sm hover:shadow-md transition-shadow">
                            <button 
                                onClick={() => handleRemoveBus(config.name)}
                                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title={t('stake.booking.tooltip.removeBus', '移除車輛')}
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>

                            <div className="font-black mb-6 flex items-center text-lg border-b border-gray-50 pb-4 text-green-800">
                                <Bus className="w-6 h-6 mr-3 text-green-600" /> 
                                {t('stake.booking.label.alias', '代稱')}: 
                                <input 
                                    type="text" 
                                    className={`ml-3 border-2 rounded-xl px-3 py-1.5 w-32 font-black outline-none text-lg text-green-900 shadow-inner ${!config.name ? 'border-red-500 bg-red-50 focus:ring-red-300' : 'bg-green-50 border-green-100 focus:ring-green-300'}`}
                                    value={config.name} 
                                    onChange={e => handleBusConfigChange(config.name, { name: e.target.value })}
                                    placeholder={t('common.placeholder.required', '必填')}
                                />
                                {!config.name && <span className="ml-3 text-red-500 text-xs animate-pulse">{t('stake.booking.alerts.aliasRequired', '代稱不可為空')}</span>}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="text-xs font-black text-green-700 uppercase tracking-wider bg-green-50 px-3 py-1 rounded-lg inline-block">{t('stake.booking.title.bookingInfo', '訂車資訊')}</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.busCompany', '遊覽車公司')}</label>
                                            <select 
                                                className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" 
                                                value={config.companyId || ''} 
                                                onChange={e => {
                                                    const comp = (settings.busCompanies || []).find(c => c.id === e.target.value);
                                                    handleBusConfigChange(config.name, { 
                                                        companyId: e.target.value,
                                                        company: comp?.name1 || ''
                                                    });
                                                }}
                                            >
                                                <option value="">{t('bus.placeholder.selectCompany', '選擇車行')}</option>
                                                {(settings.busCompanies || []).map(c => {
                                                    const names = [c.name1, c.name2, c.name3].filter(Boolean).join(' / ');
                                                    return <option key={c.id} value={c.id}>{names}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.licensePlate', '車牌號碼')}</label>
                                            <select 
                                                className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" 
                                                value={config.licensePlate || ''} 
                                                onChange={e => {
                                                    const veh = (settings.busVehicles || []).find(v => v.plate === e.target.value);
                                                    const updates: Partial<BusConfig> = { licensePlate: e.target.value };
                                                    if (veh) updates.capacity = veh.seats;
                                                    handleBusConfigChange(config.name, updates);
                                                }}
                                            >
                                                <option value="">{t('bus.placeholder.selectPlate', '選擇車牌')}</option>
                                                {(settings.busVehicles || []).filter(v => !config.companyId || v.companyId === config.companyId).map(v => (
                                                    <option key={v.plate} value={v.plate}>{v.plate}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.totalSeats', '座位總數')}</label>
                                            <select 
                                                className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-black text-sm"
                                                value={config.capacity || 42} 
                                                onChange={e => {
                                                    const updates: Partial<BusConfig> = { capacity: parseInt(e.target.value) };
                                                    handleBusConfigChange(config.name, updates);
                                                }} 
                                            >
                                                {[20, 25, 30, 42, 43, 45].map(v => <option key={v} value={v}>{v} {t('common.seats', '席')}</option>)}
                                            </select>
                                        </div>

                                        <div className="col-span-2 border-t border-gray-100 my-1"></div>

                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.driverName1', '司機姓名1')}</label>
                                            <select 
                                                className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" 
                                                value={config.driverName1 || ''} 
                                                onChange={e => {
                                                    const dri = (settings.busDrivers || []).find(d => d.name === e.target.value);
                                                    handleBusConfigChange(config.name, {
                                                        driverName1: e.target.value,
                                                        driverPhone1: dri?.phone || ''
                                                    });
                                                }}
                                            >
                                                <option value="">{t('bus.placeholder.driver1', '司機1')}</option>
                                                {(settings.busDrivers || []).filter(d => !config.companyId || d.companyId === config.companyId).map(d => (
                                                    <option key={d.name} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.driverPhone1', '司機電話1')}</label>
                                            <input type="text" className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" value={config.driverPhone1 || ''} onChange={e => handleBusConfigChange(config.name, { driverPhone1: e.target.value })} />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.driverName2', '司機姓名2')}</label>
                                            <select 
                                                className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" 
                                                value={config.driverName2 || ''} 
                                                onChange={e => {
                                                    const dri = (settings.busDrivers || []).find(d => d.name === e.target.value);
                                                    handleBusConfigChange(config.name, {
                                                        driverName2: e.target.value,
                                                        driverPhone2: dri?.phone || ''
                                                    });
                                                }}
                                            >
                                                <option value="">{t('bus.placeholder.driver2', '司機2')}</option>
                                                {(settings.busDrivers || []).filter(d => !config.companyId || d.companyId === config.companyId).map(d => (
                                                    <option key={d.name} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 mb-1 block">{t('stake.booking.label.driverPhone2', '司機電話2')}</label>
                                            <input type="text" className="border-2 border-gray-50 rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-green-200 bg-gray-50 font-bold text-sm" value={config.driverPhone2 || ''} onChange={e => handleBusConfigChange(config.name, { driverPhone2: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 h-full">
                                    <div className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center">
                                        <DollarSign className="w-4 h-4 mr-2" /> {t('stake.booking.title.expenses', '費用支出')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 block mb-1">{t('stake.booking.label.bookingCost', '訂車費用')}</label>
                                            <input type="number" className="border-2 border-white rounded-xl px-3 py-2 w-full font-black text-right text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={config.bookingCost || 0} onChange={e => handleBusConfigChange(config.name, { bookingCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 block mb-1">{t('stake.booking.label.driverMealCost', '司機餐費')}</label>
                                            <input type="number" className="border-2 border-white rounded-xl px-3 py-2 w-full font-black text-right text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={config.driverMealCost || 0} onChange={e => handleBusConfigChange(config.name, { driverMealCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 block mb-1">{t('stake.booking.label.parkingCost', '停車費')}</label>
                                            <input type="number" className="border-2 border-white rounded-xl px-3 py-2 w-full font-black text-right text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={config.parkingCost || 0} onChange={e => handleBusConfigChange(config.name, { parkingCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 block mb-1">{t('stake.booking.label.otherCost', '其他費用')}</label>
                                            <input type="number" className="border-2 border-white rounded-xl px-3 py-2 w-full font-black text-right text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={config.otherCost || 0} onChange={e => handleBusConfigChange(config.name, { otherCost: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-sm font-black text-indigo-900">
                                        <span>{t('stake.booking.label.totalExpenses', '費用合計')}</span>
                                        <span>${( (config.bookingCost || 0) + (config.driverMealCost || 0) + (config.parkingCost || 0) + (config.otherCost || 0) ).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(currentEvent.busConfigs || []).length === 0 && (
                        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border-4 border-dashed border-green-100 font-bold overflow-hidden">
                            <Bus className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            {t('stake.booking.status.noBusConfigs', '目前無車輛設定，請點擊「新增車輛」')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingTab;
