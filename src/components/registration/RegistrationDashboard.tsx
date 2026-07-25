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
}

const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({
    activeEvent,
    eventStats,
    ordinanceStats,
    deadlineDisplay,
    isClosed,
    lang,
    onAssignOrdinanceSerials,
    onAssignVehicleSerials
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
        <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Vehicle Stats Card */}
                <div className="flex-1 bg-white p-5 rounded-none md:rounded-[8px] shadow-sm border border-purple-100 relative overflow-hidden transition-all hover:shadow-md">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.03]">
                        <Bus className="w-32 h-32 text-purple-900" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="font-bold text-purple-900 text-lg flex items-center">
                            <Bus className="w-5 h-5 mr-2 text-purple-600" /> 
                            {t('stake.registration.form.dashboard.seat_reservation')}
                        </h3>
                        {onAssignVehicleSerials && (
                            <button 
                                onClick={onAssignVehicleSerials}
                                className="bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs hover:bg-purple-100 font-bold transition-colors shadow-sm flex items-center"
                            >
                                <ListOrdered className="w-3 h-3 mr-1" />
                                {t('stake.registration.form.dashboard.assign_vehicle_numbers')}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2.5 text-sm text-gray-600 font-medium relative z-10">
                        <div className="flex justify-between items-center group">
                            <span>{t('stake.registration.form.dashboard.total_seats')}:</span>
                            <span className="font-bold text-base text-gray-900 group-hover:text-purple-700 transition-colors">{eventStats.capacity} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span>{t('stake.registration.form.dashboard.occupied')}:</span>
                            <span className="font-bold text-base text-gray-900 group-hover:text-purple-700 transition-colors">{eventStats.occupied} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span>{t('stake.registration.form.dashboard.available')}:</span>
                            <span className={`font-bold text-base ${eventStats.remaining > 0 ? "text-green-600" : "text-red-600"}`}>{eventStats.remaining} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                        <div className="flex justify-between pt-3 mt-1 border-t border-purple-50 items-center">
                            <span className="text-gray-500 text-sm">{t('stake.registration.form.dashboard.waitlist')}:</span>
                            <span className={`font-bold text-base ${eventStats.waiting > 0 ? "text-red-600 bg-red-50 px-2 py-0.5 rounded-full" : "text-gray-500"}`}>{eventStats.waiting} {t('stake.registration.form.dashboard.unit_person')}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-50 text-xs text-red-900 font-bold flex justify-between items-center relative z-10">
                        <span>{t('stake.registration.form.dashboard.buses_count')}{activeEvent.bus_count}</span>
                        <span>{t('stake.registration.form.dashboard.deadline')}{deadlineDisplay}</span>
                    </div>
                </div>

                {/* Ordinance Stats Card */}
                {ordinanceStats && (
                    <div className="flex-1 bg-white p-5 rounded-none md:rounded-[8px] shadow-sm border border-blue-100 relative overflow-hidden transition-all hover:shadow-md">
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03]">
                            <BookOpen className="w-32 h-32 text-blue-900" />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="font-bold text-blue-900 text-lg flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-blue-600" /> 
                                {t('stake.registration.form.dashboard.ordinance_reservation')}
                            </h3>
                            {onAssignOrdinanceSerials && (
                                <button 
                                    onClick={onAssignOrdinanceSerials}
                                    className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 font-bold transition-colors shadow-sm flex items-center"
                                >
                                    <ListOrdered className="w-3 h-3 mr-1" />
                                    {t('stake.registration.form.dashboard.assign_ordinance_numbers')}
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-medium relative z-10">
                            {/* Endowment */}
                            <div className="relative h-full flex flex-col gap-3 pb-3 md:pb-0 border-b md:border-b-0 border-blue-50">
                                <div className="hidden md:block absolute right-[-12px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-100 to-transparent"></div>
                                <div className="text-blue-800 text-[10px] font-bold tracking-wider uppercase bg-blue-50 inline-block px-1 py-0.5 rounded-md text-center w-full">{t('stake.registration.form.dashboard.ordinance_endowment')}</div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.endowment?.capacity || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.occupied')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.endowment?.occupied || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.available')}:</span>
                                        <span className={`font-bold text-xs ${(ordinanceStats.endowment?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.endowment?.remaining || 0}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-1 mt-1 border-t border-blue-50 items-center">
                                    <span className="text-gray-400 text-[10px]">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                    <span className={`font-bold text-[10px] ${(ordinanceStats.endowment?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-1 py-0.5 rounded" : "text-gray-400"}`}>{ordinanceStats.endowment?.waiting || 0}</span>
                                </div>
                            </div>
                            
                            {/* Baptism */}
                            <div className="relative h-full flex flex-col gap-3 pb-3 md:pb-0 border-b md:border-b-0 border-blue-50">
                                <div className="hidden md:block absolute right-[-12px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-100 to-transparent"></div>
                                <div className="text-blue-800 text-[10px] font-bold tracking-wider uppercase bg-blue-50 inline-block px-1 py-0.5 rounded-md text-center w-full">{t('stake.registration.form.dashboard.ordinance_baptism')}</div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.baptism?.capacity || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.occupied')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.baptism?.occupied || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.available')}:</span>
                                        <span className={`font-bold text-xs ${(ordinanceStats.baptism?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.baptism?.remaining || 0}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-1 mt-1 border-t border-blue-50 items-center">
                                    <span className="text-gray-400 text-[10px]">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                    <span className={`font-bold text-[10px] ${(ordinanceStats.baptism?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-1 py-0.5 rounded" : "text-gray-400"}`}>{ordinanceStats.baptism?.waiting || 0}</span>
                                </div>
                            </div>

                            {/* Sealing */}
                            <div className="pl-0 md:pl-2 h-full flex flex-col gap-3">
                                <div className="text-blue-800 text-[10px] font-bold tracking-wider uppercase bg-blue-50 inline-block px-1 py-0.5 rounded-md text-center w-full">{t('stake.registration.form.dashboard.ordinance_sealing', '印證')}</div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.total_seats')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.sealing?.capacity || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.occupied')}:</span>
                                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">{ordinanceStats.sealing?.occupied || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-500 text-[10px]">{t('stake.registration.form.dashboard.available')}:</span>
                                        <span className={`font-bold text-xs ${(ordinanceStats.sealing?.remaining || 0) > 0 ? "text-green-600" : "text-red-500"}`}>{ordinanceStats.sealing?.remaining || 0}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-1 mt-1 border-t border-blue-50 items-center">
                                    <span className="text-gray-400 text-[10px]">{t('stake.registration.form.dashboard.waitlist')}:</span>
                                    <span className={`font-bold text-[10px] ${(ordinanceStats.sealing?.waiting || 0) > 0 ? "text-red-600 bg-red-50 px-1 py-0.5 rounded" : "text-gray-400"}`}>{ordinanceStats.sealing?.waiting || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        {isClosed && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-none md:rounded-[8px] shadow-sm animate-fade-in flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-red-600" />
                <div>
                    <p className="text-sm font-bold text-red-700">{t('stake.registration.form.dashboard.reg_closed_hint')}</p>
                </div>
            </div>
        )}
        </div>
    );
};

export default RegistrationDashboard;
