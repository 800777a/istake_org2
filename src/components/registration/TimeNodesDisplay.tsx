import React from 'react';
import { Clock } from 'lucide-react';
import { EventData } from '../../../types';

interface TimeNodesDisplayProps {
    activeEvent: EventData | undefined;
    isPublic?: boolean;
}

const TimeNodesDisplay: React.FC<TimeNodesDisplayProps> = ({ activeEvent, isPublic = false }) => {
    if (!activeEvent?.engineConfig?.timeNodes) return null;

    const { timeNodes } = activeEvent.engineConfig;
    if (isPublic && !timeNodes.showOnPublic) return null;

    const hasData = [
        timeNodes.regStartTime, timeNodes.groupFormationDeadline,
        timeNodes.regularPaymentStartTime, timeNodes.regularPaymentDeadline,
        timeNodes.waitlistPaymentStartTime, timeNodes.waitlistPaymentDeadline,
        timeNodes.cancellationDeadline, timeNodes.regEndTime
    ].some(v => !!v);

    if (!hasData) return null;

    const nodes = [
        { label: '報名開始時間', value: timeNodes.regStartTime },
        { label: '成團截止時間', value: timeNodes.groupFormationDeadline },
        { label: '正取繳費開始', value: timeNodes.regularPaymentStartTime },
        { label: '正取繳費截止', value: timeNodes.regularPaymentDeadline },
        { label: '備取繳費開始', value: timeNodes.waitlistPaymentStartTime },
        { label: '備取繳費截止', value: timeNodes.waitlistPaymentDeadline },
        { label: '報名取消期限', value: timeNodes.cancellationDeadline, hint: '此日期為報名可取消的最後期限' },
        { label: '報名結束時間', value: timeNodes.regEndTime },
    ];

    const formatDateTime = (val: string) => {
        if (!val) return '未設定';
        const showYear = timeNodes.showYear;
        return new Date(val).toLocaleString('zh-TW', {
            year: showYear ? 'numeric' : undefined,
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="bg-white border-none shadow-none rounded-none md:border border-amber-200 md:rounded-[8px] md:shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 mb-2 md:mb-4 w-full max-w-full">
            <div className="w-full flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-amber-200 border-b border-amber-200">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="p-1 md:p-1.5 bg-white/50 rounded-lg shadow-sm border border-amber-200 text-amber-900">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 animate-pulse" /> 
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs md:text-sm lg:text-base tracking-tight uppercase">
                        活動重要時間節點
                    </h4>
                </div>
            </div>
            
            <div className="bg-amber-50 p-3 md:p-6 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full">
                    {nodes.map((node, idx) => (
                        <div key={idx} className="space-y-1 min-w-0 w-full">
                            <label className="text-[10px] md:text-xs font-bold text-amber-800 block truncate uppercase tracking-wider">{node.label}</label>
                            <div className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[10px] md:text-xs lg:text-sm font-bold text-slate-900 shadow-sm text-center md:text-left truncate overflow-hidden whitespace-nowrap" title={formatDateTime(node.value)}>
                                {formatDateTime(node.value)}
                            </div>
                            {node.hint && <p className="text-[8px] font-medium text-amber-600/70 italic mt-0.5 hidden md:block truncate">{node.hint}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TimeNodesDisplay;
