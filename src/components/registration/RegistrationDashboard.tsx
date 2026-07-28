import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Bus, BookOpen, AlertCircle, ListOrdered, Clock } from 'lucide-react';
import { Flex } from 'antd';
import { EventData } from '../../../types';
import TimeNodesDisplay from './TimeNodesDisplay';

interface RegistrationDashboardProps {
    activeEvent: EventData | undefined | null;
    eventStats: { capacity: number; occupied: number; waiting: number; remaining: number };
    ordinanceStats?: {
        endowment: { capacity: number; occupied: number; waiting: number; remaining: number };
        baptism: { capacity: number; occupied: number; waiting: number; remaining: number };
        sealing: { capacity: number; occupied: number; waiting: number; remaining: number };
    };
    deadlineDisplay: string;
    isClosed: boolean;
    lang?: 'zh' | 'en';
    onAssignOrdinanceSerials?: () => void;
    onAssignVehicleSerials?: () => void;
    hideSealing?: boolean;
}

const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({
    activeEvent,
    eventStats,
    ordinanceStats,
    deadlineDisplay,
    isClosed,
    lang,
    onAssignOrdinanceSerials,
    onAssignVehicleSerials,
    hideSealing
}) => {
    const { t, tString } = useI18n();
    if (!activeEvent) return null;

    const formatDateTime = (isoString: string) => {
        if (!isoString) return '-';
        try {
            return new Date(isoString).toLocaleString('zh-TW', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return isoString;
        }
    };

    return (
        <div className="space-y-4 mb-6 min-w-0">
            <div className="flex flex-col lg:flex-row gap-4 min-w-0">
                {/* Vehicle Stats Card - Purple Theme (ColorIndex 6) */}
                <div className="flex-1 bg-white overflow-visible rounded shadow-sm border-2 border-purple-100 relative transition-all min-w-0">
                    {/* Level 1: Header */}
                    <div className="bg-purple-50 px-3 py-2 md:px-4 md:py-2 flex justify-between items-center border-b-2 border-purple-100 min-w-0 gap-2">
                        <h3 className="font-black text-purple-900 text-[10px] md:text-sm flex items-center gap-1 md:gap-2 truncate uppercase tracking-widest">
                            <Bus className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-700 shrink-0" /> 
                            {t('stake.registration.form.dashboard.seat_reservation')}
                        </h3>
                        {onAssignVehicleSerials && (
                            <button 
                                onClick={onAssignVehicleSerials}
                                className="bg-purple-600 text-white px-2 py-1.5 md:px-3 md:py-1.5 rounded text-[9px] md:text-xs hover:bg-purple-700 font-black transition-all shadow-md flex items-center active:scale-95 border-2 border-purple-800 shrink-0"
                            >
                                <ListOrdered className="w-3 h-3 mr-1" />
                                {t('stake.registration.form.dashboard.assign_vehicle_numbers')}
                            </button>
                        )}
                    </div>

                    <div className="p-3 md:p-5 space-y-3 text-sm text-slate-700 font-black relative z-10 min-w-0">
                        <div className="flex justify-between items-center group bg-white/50 p-2 md:p-2.5 rounded border-2 border-purple-100 shadow-inner min-w-0 gap-2">
                            <span className="text-[10px] md:text-xs uppercase tracking-wider text-purple-800 opacity-70 truncate">{t('stake.registration.form.dashboard.total_seats')}:</span>
                            <span className="font-black text-sm md:text-lg text-slate-900 shrink-0">{eventStats.capacity} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between items-center group bg-white/50 p-2 md:p-2.5 rounded border-2 border-purple-100 shadow-inner min-w-0 gap-2">
                            <span className="text-[10px] md:text-xs uppercase tracking-wider text-purple-800 opacity-70 truncate">{t('stake.registration.form.dashboard.occupied')}:</span>
                            <span className="font-black text-sm md:text-lg text-slate-900 shrink-0">{eventStats.occupied} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between items-center group bg-white/50 p-2 md:p-2.5 rounded border-2 border-purple-100 shadow-inner min-w-0 gap-2">
                            <span className="text-[10px] md:text-xs uppercase tracking-wider text-purple-800 opacity-70 truncate">{t('stake.registration.form.dashboard.available')}:</span>
                            <span className={`font-black text-sm md:text-lg shrink-0 ${eventStats.remaining > 0 ? "text-green-600" : "text-red-600"}`}>{eventStats.remaining} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between pt-3 mt-1 border-t-2 border-purple-200/50 items-center min-w-0 gap-2">
                            <span className="text-purple-900/60 text-[10px] md:text-xs font-black uppercase tracking-widest truncate">{t('stake.registration.form.dashboard.waitlist')}:</span>
                            <span className={`font-black text-sm md:text-lg shrink-0 ${eventStats.waiting > 0 ? "text-red-600 bg-red-100 px-3 py-0.5 rounded-full shadow-sm border border-red-200" : "text-slate-400"}`}>{eventStats.waiting} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                    </div>
                    
                    <div className="px-3 py-2 md:px-5 md:py-3 bg-purple-100/50 text-[10px] md:text-xs text-purple-900 font-black flex flex-wrap justify-between items-center border-t-2 border-purple-200/30 gap-2 min-w-0">
                        <span className="opacity-70 truncate">{t('stake.registration.form.dashboard.buses_count')}: <span className="text-purple-700 text-xs md:text-sm">{activeEvent.bus_count}</span></span>
                        <span className="opacity-70 truncate">{t('stake.registration.form.dashboard.deadline')}: <span className="text-red-600 text-xs md:text-sm font-black">{deadlineDisplay}</span></span>
                    </div>
                </div>

                {/* Ordinance Stats Card - Blue Theme (ColorIndex 4) */}
                {ordinanceStats && (
                    <div className="flex-1 bg-white overflow-visible rounded shadow-sm border-2 border-blue-100 relative transition-all min-w-0">
                        {/* Level 1: Header */}
                        <div className="bg-blue-50 px-3 py-2 md:px-4 md:py-2 flex justify-between items-center border-b-2 border-blue-100 min-w-0 gap-2">
                            <h3 className="font-black text-blue-900 text-[10px] md:text-sm flex items-center gap-1 md:gap-2 truncate uppercase tracking-widest">
                                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-700 shrink-0" /> 
                                {t('stake.registration.form.dashboard.ordinance_reservation')}
                            </h3>
                            {onAssignOrdinanceSerials && (
                                <button 
                                    onClick={onAssignOrdinanceSerials}
                                    className="bg-blue-600 text-white px-2 py-1.5 md:px-3 md:py-1.5 rounded text-[9px] md:text-xs hover:bg-blue-700 font-black transition-all shadow-md flex items-center active:scale-95 border-2 border-blue-800 shrink-0"
                                >
                                    <ListOrdered className="w-3 h-3 mr-1" />
                                    {t('stake.registration.form.dashboard.assign_ordinance_numbers')}
                                </button>
                            )}
                        </div>
                        
                        <div className="p-2 md:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 relative z-10 min-w-0">
                            {/* Endowment */}
                            <div className="bg-white/60 p-2 md:p-3 rounded border-2 border-blue-100 shadow-sm flex flex-col gap-2 min-w-0">
                                <div className="text-blue-900 text-[9px] md:text-[10px] font-black tracking-tighter md:tracking-[0.2em] uppercase bg-blue-200/50 py-1.5 rounded text-center w-full truncate">{t('stake.registration.form.dashboard.ordinance_endowment')}</div>
                                <div className="space-y-1 md:space-y-2 min-w-0">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.total_seats')}</span>
                                        <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.endowment?.capacity || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.occupied')}</span>
                                        <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.endowment?.occupied || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.available')}</span>
                                        <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.endowment?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.endowment?.remaining || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-auto pt-1 md:pt-2 border-t border-blue-50 flex justify-between items-center gap-2">
                                    <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.waitlist')}</span>
                                    <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.endowment?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-2 rounded" : "text-slate-300"}`}>{ordinanceStats.endowment?.waiting || 0}</span>
                                </div>
                            </div>
                            
                            {/* Baptism */}
                            <div className="bg-white/60 p-2 md:p-3 rounded border-2 border-blue-100 shadow-sm flex flex-col gap-2 min-w-0">
                                <div className="text-blue-900 text-[9px] md:text-[10px] font-black tracking-tighter md:tracking-[0.2em] uppercase bg-blue-200/50 py-1.5 rounded text-center w-full truncate">{t('stake.registration.form.dashboard.ordinance_baptism')}</div>
                                <div className="space-y-1 md:space-y-2 min-w-0">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.total_seats')}</span>
                                        <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.baptism?.capacity || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.occupied')}</span>
                                        <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.baptism?.occupied || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.available')}</span>
                                        <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.baptism?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.baptism?.remaining || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-auto pt-1 md:pt-2 border-t border-blue-50 flex justify-between items-center gap-2">
                                    <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.waitlist')}</span>
                                    <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.baptism?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-2 rounded" : "text-slate-300"}`}>{ordinanceStats.baptism?.waiting || 0}</span>
                                </div>
                            </div>

                            {/* Sealing */}
                            {!hideSealing && (
                                <div className="bg-white/60 p-2 md:p-3 rounded border-2 border-blue-100 shadow-sm flex flex-col gap-2 min-w-0">
                                    <div className="text-blue-900 text-[9px] md:text-[10px] font-black tracking-tighter md:tracking-[0.2em] uppercase bg-blue-200/50 py-1.5 rounded text-center w-full truncate">{t('stake.registration.form.dashboard.ordinance_sealing', '印證')}</div>
                                    <div className="space-y-1 md:space-y-2 min-w-0">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.total_seats')}</span>
                                            <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.sealing?.capacity || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.occupied')}</span>
                                            <span className="font-black text-slate-800 text-[10px] md:text-sm shrink-0">{ordinanceStats.sealing?.occupied || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.available')}</span>
                                            <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.sealing?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.sealing?.remaining || 0}</span>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-1 md:pt-2 border-t border-blue-50 flex justify-between items-center gap-2">
                                        <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter truncate">{t('stake.registration.form.dashboard.waitlist')}</span>
                                        <span className={`font-black text-[10px] md:text-sm shrink-0 ${(ordinanceStats.sealing?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-2 rounded" : "text-slate-300"}`}>{ordinanceStats.sealing?.waiting || 0}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        {isClosed && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded shadow-lg animate-bounce flex items-start">
                <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0 text-red-600" />
                <div>
                    <p className="text-sm md:text-base font-black text-red-700 uppercase tracking-wider">{t('stake.registration.form.dashboard.reg_closed_hint')}</p>
                </div>
            </div>
        )}
        </div>
    );
};

export default RegistrationDashboard;
