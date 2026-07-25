import React, { useState } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, Download, Upload } from 'lucide-react';
import { EventData, GlobalSettings, BusRatingRecord, Registration } from '../../types';
import Toast, { ToastType } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import { updateSettings } from '../../services/sheetService';

interface RatingTabProps {
    currentEvent: EventData | null;
    registrations: Registration[];
    settings: GlobalSettings;
    onUpdateSettings: (settings: GlobalSettings) => void;
}

interface ConfirmConfig {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

const RatingTab: React.FC<RatingTabProps> = ({ currentEvent, registrations, settings, onUpdateSettings }) => {
    const { t, tString } = useI18n();
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const handleExportToFront = () => {
        // Mock function based on original
        setMsgType('success');
        setMsg(t('bus.alerts.exportingToFront', '導出至前端功能執行中...'));
    };

    const handleImportRatings = () => {
        // Mock function based on original
        setMsgType('success');
        setMsg(t('bus.alerts.importingRatings', '匯入評分功能執行中...'));
    };

    const calculatePoints = (metrics: boolean[]) => {
        if (!metrics) return 0;
        return metrics.filter(m => m === true).length;
    };

    const maskName = (name: string) => {
        if (!name) return '';
        if (name.length <= 1) return name;
        return name[0] + '○' + (name.length > 2 ? name[name.length - 1] : '');
    };

    const processRating = (record: BusRatingRecord) => {
        setConfirmConfig({
            isOpen: true,
            title: t('common.confirm.title', '確認'),
            message: t('bus.alerts.confirmProcessRating', '確定要審查此評分並累加至司機紀錄嗎？'),
            onConfirm: () => {
                const points = calculatePoints(record.d1Metrics) + (record.driver2Name ? calculatePoints(record.d2Metrics) : 0);
                let delta = 0;
                if (points >= 1 && points <= 3) delta = -1;
                else if (points >= 7 && points <= 9) delta = 1;

                const d1Points = (record.d1Metrics || []).filter((m, i) => m === true && i <= 4).length;
                const v1Points = (record.d1Metrics || []).filter((m, i) => m === true && i > 4).length;

                const updatedDrivers = (settings.busDrivers || []).map(dri => {
                    if (dri.name === record.driver1Name) {
                        return {
                            ...dri,
                            serviceCount: (dri.serviceCount || 0) + 1,
                            totalRating: (dri.totalRating || 0) + d1Points,
                            avgRating: Number((((dri.totalRating || 0) + d1Points) / ((dri.serviceCount || 0) + 1)).toFixed(1))
                        };
                    }
                    if (record.driver2Name && dri.name === record.driver2Name) {
                        const d2Points = (record.d2Metrics || []).filter((m, i) => m === true && i <= 4).length;
                        return {
                            ...dri,
                            serviceCount: (dri.serviceCount || 0) + 1,
                            totalRating: (dri.totalRating || 0) + d2Points,
                            avgRating: Number((((dri.totalRating || 0) + d2Points) / ((dri.serviceCount || 0) + 1)).toFixed(1))
                        };
                    }
                    return dri;
                });

                const updatedVehicles = (settings.busVehicles || []).map(veh => {
                    if (veh.plate === record.plate) {
                        return {
                            ...veh,
                            serviceCount: (veh.serviceCount || 0) + 1,
                            totalRating: (veh.totalRating || 0) + v1Points,
                            avgRating: Number((((veh.totalRating || 0) + v1Points) / ((veh.serviceCount || 0) + 1)).toFixed(1))
                        };
                    }
                    return veh;
                });

                const updatedCompanies = (settings.busCompanies || []).map(comp => {
                    const companyDrivers = updatedDrivers.filter(d => d.companyId === comp.id);
                    if (companyDrivers.length > 0) {
                        const totalSvc = companyDrivers.reduce((sum, d) => sum + (d.serviceCount || 0), 0);
                        const avgR = companyDrivers.reduce((sum, d) => sum + (d.avgRating || 0), 0) / companyDrivers.length;
                        return {
                            ...comp,
                            serviceCount: totalSvc,
                            avgRating: Number(avgR.toFixed(1))
                        };
                    }
                    return comp;
                });

                const updatedRatings = (settings.busRatings || []).map(r => 
                    r.id === record.id ? { ...r, isProcessed: true } : r
                );

                onUpdateSettings({
                    ...settings,
                    busDrivers: updatedDrivers,
                    busVehicles: updatedVehicles,
                    busCompanies: updatedCompanies,
                    busRatings: updatedRatings
                });
                setConfirmConfig((prev: ConfirmConfig) => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div className="space-y-6">
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig((prev: ConfirmConfig) => ({ ...prev, isOpen: false }))}
                isDangerous={false}
            />
            {msg && <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />}
            <div className="bg-white rounded-3xl p-8 border-4 border-gray-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <Star className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{t('bus.title.reviewRating', '審查評分')}</h2>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Rating Review</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-1 bg-yellow-50/50 p-6 rounded-2xl border-2 border-yellow-100">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            {t('bus.label.ratingRuleInfo', '計分規則說明')}
                        </h4>
                        <div className="text-sm space-y-3 font-medium text-gray-700">
                            <p>{t('bus.desc.ratingRule', '核取項目採加點制 (滿分9點)，每選一項加1點。')}</p>
                            <div className="bg-white p-3 rounded-xl border border-yellow-200">
                                <ul className="space-y-1">
                                    <li className="flex justify-between"><span>{t('bus.label.points1_3', '1~3點：')}</span><span className="text-red-600 font-bold">{t('bus.label.pointMinus1', '加點 -1')}</span></li>
                                    <li className="flex justify-between"><span>{t('bus.label.points4_6', '4~6點：')}</span><span>{t('bus.label.noChange', '不加不扣')}</span></li>
                                    <li className="flex justify-between"><span>{t('bus.label.points7_9', '7~9點：')}</span><span className="text-green-600 font-bold">{t('bus.label.pointPlus1', '加點 +1')}</span></li>
                                </ul>
                            </div>
                            <p className="text-xs text-gray-500 italic">{t('bus.desc.ratingNote', '主辦可手動調整。審查後累加至司機庫。')}</p>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="font-black text-lg text-indigo-900 border-l-4 border-indigo-500 pl-3">
                                {t('bus.title.reviewRatingWithEvent', '審查評分: {{title}} ({{date}})', { title: currentEvent?.event_title, date: currentEvent?.event_date })}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={handleExportToFront} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-200 transition-colors">
                                    <Upload size={16}/> {t('bus.button.exportToFront', '匯到前端')}
                                </button>
                                <button onClick={handleImportRatings} className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors">
                                    <Download size={16}/> {t('bus.button.importRatings', '匯入評分')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {(!settings.busRatings || settings.busRatings.filter(r => r.eventId === currentEvent?.event_id).length === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
                                    {t('bus.status.noPendingRatings', '目前無待審查評分資料')}
                                </div>
                            )}
                            {(settings.busRatings || []).filter(r => r.eventId === currentEvent?.event_id).map(record => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={record.id} 
                                    className={`p-5 border-2 rounded-2xl transition-all ${record.isProcessed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                                                <Star className={record.isSubmitted ? "text-yellow-500 fill-yellow-500" : ""} size={24}/>
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 text-lg flex items-center gap-2">
                                                    <span>{record.busId} ({record.plate})</span>
                                                    {record.isSubmitted ? <CheckCircle2 className="text-green-500" size={18}/> : <AlertTriangle className="text-yellow-500" size={18}/>}
                                                </div>
                                                <div className="text-sm font-bold text-gray-500">
                                                    {t('bus.label.driverInfo', '司機: {{name1}} {{name2}}', { name1: record.driver1Name, name2: record.driver2Name ? `/ ${record.driver2Name}` : '' })}
                                                </div>
                                            </div>
                                        </div>
                                        {!record.isProcessed && record.isSubmitted ? (
                                            <button 
                                                onClick={() => processRating(record)}
                                                className="bg-indigo-600 shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-[4px] text-white px-5 py-2 rounded-xl text-sm font-black transition-all"
                                            >
                                                {t('bus.button.processReview', '審查累加')}
                                            </button>
                                        ) : record.isProcessed ? (
                                            <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-lg text-xs font-black uppercase tracking-tighter">{t('bus.status.processed', '已結算')}</span>
                                        ) : null}
                                    </div>
                                    {record.isSubmitted && (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 italic text-sm text-gray-700">
                                                <span className="font-bold text-indigo-900 mr-2">{t('bus.label.remarks', '備註:')}</span>
                                                {record.remarks || t('common.none', '無')}
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 font-bold text-gray-400">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{t('bus.label.raterInfo', '評分人: {{unit}} {{name}}', { unit: record.raterUnit, name: maskName(record.raterName) })}</span>
                                                </div>
                                                <div className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                                    {t('bus.label.pointsResult', '點數換算基本分: {{points}}', { points: calculatePoints(record.d1Metrics) + (record.driver2Name ? calculatePoints(record.d2Metrics) : 0) })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RatingTab;
