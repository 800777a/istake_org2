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
        <div className="bg-white overflow-visible border-2 border-yellow-200 rounded mb-4 shadow-sm animate-in fade-in slide-in-from-top-2 w-full max-w-full min-w-0">
            {/* Level 1: Header */}
            <div className="w-full flex items-center justify-between px-3 py-3 md:px-6 md:py-3 bg-yellow-200 border-b-2 border-yellow-300/30 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="p-1.5 bg-white/50 rounded shadow-sm border-2 border-yellow-300/30 text-yellow-900 shrink-0">
                        <Clock className="w-4 h-4 md:w-5 md:h-5 animate-pulse" /> 
                    </div>
                    <h4 className="font-black text-yellow-950 text-xs md:text-sm lg:text-base tracking-tight uppercase truncate">
                        活動重要時間節點
                    </h4>
                </div>
            </div>
            
            {/* Level 4: Content */}
            <div className="bg-yellow-50 p-2 md:p-6 w-full min-w-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full min-w-0">
                    {nodes.map((node, idx) => (
                        <div key={idx} className="space-y-1 min-w-0 w-full group">
                            <label className="text-[9px] md:text-xs font-black text-yellow-800 block truncate uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity pl-1">{node.label}</label>
                            <div className="w-full p-2 md:p-2.5 bg-white border-2 border-yellow-200 rounded text-[10px] md:text-xs lg:text-sm font-black text-slate-900 shadow-sm text-center md:text-left truncate overflow-hidden whitespace-nowrap transition-all group-hover:border-yellow-400 group-hover:shadow-md" title={formatDateTime(node.value)}>
                                {formatDateTime(node.value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TimeNodesDisplay;
