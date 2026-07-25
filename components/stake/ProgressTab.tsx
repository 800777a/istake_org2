
import React from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { EventData } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { ClipboardList, Check } from 'lucide-react';

interface ProgressTabProps {
    currentEvent: EventData;
    onUpdateEvent: (event: EventData) => void;
}

// Modern Business Style constants (High-Contrast Theme)
const THEME = {
    canvas: 'bg-[#F0F4F8]',
    card: 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden',
    header: 'bg-indigo-900 text-white px-6 py-4 flex items-center justify-between cursor-pointer select-none',
    sectionTitle: 'text-sm md:text-base lg:text-lg font-semibold tracking-tight',
    pageTitle: 'text-xl md:text-2xl font-bold tracking-tight text-slate-900',
    bodyText: 'text-sm text-slate-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    btnSecondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
    badge: {
        success: 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 px-2.5 py-0.5 rounded text-[10px]',
        warning: 'bg-amber-100 text-amber-900 font-semibold border border-amber-300 px-2.5 py-0.5 rounded text-[10px]',
        danger: 'bg-rose-100 text-rose-900 font-semibold border border-rose-300 px-2.5 py-0.5 rounded text-[10px]',
        info: 'bg-blue-100 text-blue-900 font-semibold border border-blue-300 px-2.5 py-0.5 rounded text-[10px]'
    }
};

const ProgressTab: React.FC<ProgressTabProps> = ({ currentEvent, onUpdateEvent }) => {
    const { t, tString } = useI18n();
    
    const calculateTaskDates = (eventDateStr: string) => {
        const eventDate = new Date(eventDateStr);
        const getDateStr = (daysOffset: number) => { 
            const d = new Date(eventDate);
            d.setDate(eventDate.getDate() - daysOffset); 
            return `${d.getMonth() + 1}/${d.getDate()}`;
        };

        return [
            { step: 1, title: t('stake.progress.task1.title', '活動規劃與發布'), desc: t('stake.progress.task1.desc', '確定日期、預約聖殿場次、發布通告'), deadline: getDateStr(60) },
            { step: 2, title: t('stake.progress.task2.title', '開放報名與宣傳'), desc: t('stake.progress.task2.desc', '系統開放報名、各單位宣導'), deadline: getDateStr(45) },
            { step: 3, title: t('stake.progress.task3.title', '初期人數統計'), desc: t('stake.progress.task3.desc', '預估參加人數、初步規劃車輛'), deadline: getDateStr(30) },
            { step: 4, title: t('stake.progress.task4.title', '工作人員招募'), desc: t('stake.progress.task4.desc', '確認領航員、聖殿工作人員'), deadline: getDateStr(21) },
            { step: 5, title: t('stake.progress.task5.title', '報名截止'), desc: t('stake.progress.task5.desc', '截止報名、確認最終人數'), deadline: getDateStr(14) },
            { step: 6, title: t('stake.progress.task6.title', '車輛確認與訂購'), desc: t('stake.progress.task6.desc', '確認遊覽車數量與合約'), deadline: getDateStr(10) },
            { step: 7, title: t('stake.progress.task7.title', '保險與名冊製作'), desc: t('stake.progress.task7.desc', '辦理旅遊平安險、製作點名表'), deadline: getDateStr(7) },
            { step: 8, title: t('stake.progress.task8.title', '座位安排與通知'), desc: t('stake.progress.task8.desc', '完成座位分配、發送行前通知'), deadline: getDateStr(3) },
            { step: 9, title: t('stake.progress.task9.title', '活動執行'), desc: t('stake.progress.task9.desc', '集合、點名、發車、聖殿服務'), deadline: getDateStr(0) },
            { step: 10, title: t('stake.progress.task10.title', '財務結算與核銷'), desc: t('stake.progress.task10.desc', '收集單據、確認收支平衡'), deadline: getDateStr(-3) },
            { step: 11, title: t('stake.progress.task11.title', '活動檢討與結案'), desc: t('stake.progress.task11.desc', '召開檢討會、完成結案報告'), deadline: getDateStr(-7) },
        ];
    };

    const handleSopToggle = (index: number) => {
        const newSop = [...(currentEvent.sop_progress || Array(11).fill(false))];
        newSop[index] = !newSop[index];
        const updatedEvent = { ...currentEvent, sop_progress: newSop };
        updateEvent(updatedEvent);
        onUpdateEvent(updatedEvent);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Main Header conforming to 60-30-10 & RWD font rules */}
            <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-lg flex flex-col gap-6">
                {/* Row 1: Title Row Only */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-lg border border-white/10 shadow-inner">
                        <ClipboardList className="text-blue-300" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {t('stake.progress.title', '執行進度追蹤平台')}
                        </h2>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                            Event Planning & Operation SOP Roadmap
                        </p>
                    </div>
                </div>
                
                {/* Row 2: Info Aligned Right beneath title row */}
                <div className="flex justify-end items-center gap-3">
                    <div className="bg-white/10 px-6 py-2 rounded-lg text-sm font-bold text-white border border-white/10 shadow-inner backdrop-blur-sm flex items-center gap-4">
                        <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-black">完成總進度</span>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-2xl font-bold">{(currentEvent.sop_progress || []).filter(Boolean).length}</span> 
                            <span className="text-indigo-400 text-lg opacity-40">/</span> 
                            <span className="text-white text-lg opacity-60">11</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area with Canvas BG */}
            <div className={THEME.card + " p-6 md:p-10"}>
                <div className="relative border-l-2 border-slate-100 ml-4 md:ml-8 space-y-10">
                    {calculateTaskDates(currentEvent.event_date).map((task, index) => {
                        const isDone = (currentEvent.sop_progress || [])[index];
                        return (
                            <div key={task.step} className="relative pl-10 md:pl-12 group/step">
                                <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-500 z-10 ${isDone ? 'bg-emerald-500 scale-125 ring-4 ring-emerald-500/20' : 'bg-slate-200 group-hover/step:bg-indigo-300 group-hover/step:scale-110'}`}></div>
                                
                                <div 
                                    onClick={() => handleSopToggle(index)}
                                    className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-lg border transition-all cursor-pointer select-none shadow-sm ${isDone ? 'bg-emerald-50/20 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5'} active:scale-[0.98]`}
                                >
                                    <div className="flex-1">
                                        <div className={`text-[10px] font-bold mb-3 flex items-center tracking-widest uppercase ${isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                                            <span className={`px-2.5 py-1 rounded font-black border mr-4 ${isDone ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                                {t('stake.progress.step_label', 'STEP')} {task.step}
                                            </span>
                                            <span className="opacity-30 mr-3">•</span>
                                            {t('stake.progress.deadline_label', '預計截止日期')}: <span className={`ml-2 ${isDone ? 'text-emerald-600' : 'text-slate-600'}`}>{task.deadline}</span>
                                        </div>
                                        <h4 className={`text-base md:text-lg font-bold transition-all ${isDone ? 'text-emerald-900 line-through opacity-40' : 'text-slate-900'}`}>
                                            {task.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed max-w-2xl opacity-80">{task.desc}</p>
                                    </div>

                                    {/* Action Button Right Aligned */}
                                    <div className="mt-6 md:mt-0 md:ml-8 flex justify-end">
                                        <div className={`flex items-center h-10 px-5 rounded-lg border transition-all font-black text-[10px] uppercase tracking-[0.15em] shadow-sm ${isDone ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                                            {isDone ? <Check className="w-3.5 h-3.5 mr-2 stroke-[3px]" /> : null}
                                            {isDone ? t('stake.progress.status.completed', '任務已達成') : t('stake.progress.status.pending', '待執行')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

};

export default ProgressTab;
