
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EventData } from '../../types';
import { updateEvent } from '../../services/sheetService';
import { ClipboardList, Check } from 'lucide-react';

interface ProgressTabProps {
    currentEvent: EventData;
    onUpdateEvent: (event: EventData) => void;
}

const ProgressTab: React.FC<ProgressTabProps> = ({ currentEvent, onUpdateEvent }) => {
    const { t } = useTranslation();
    
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
        <div className="bg-green-50 p-8 rounded-3xl shadow-sm border-2 border-green-200 animate-fade-in">
            <div className="flex flex-col mb-10">
                <h3 className="text-2xl font-black mb-4 flex items-center text-green-900">
                    <ClipboardList className="w-8 h-8 mr-3 text-green-600" /> {t('stake.progress.title', '執行進度追蹤')}
                </h3>
                <div className="flex items-center">
                    <div className="bg-green-200 px-6 py-2 rounded-xl text-sm font-black text-green-900 border-2 border-green-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                        {t('stake.progress.total_progress', '完成總進度')}: {(currentEvent.sop_progress || []).filter(Boolean).length} / 11
                    </div>
                </div>
            </div>

            <div className="relative border-l-4 border-green-200 ml-6 space-y-10">
                {calculateTaskDates(currentEvent.event_date).map((task, index) => {
                    const isDone = (currentEvent.sop_progress || [])[index];
                    return (
                        <div key={task.step} className="relative pl-12 group">
                            <div className={`absolute -left-[14px] top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md transition-all ${isDone ? 'bg-green-500 scale-125' : 'bg-gray-300'}`}></div>
                            <div 
                                onClick={() => handleSopToggle(index)}
                                className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isDone ? 'bg-white border-green-500' : 'bg-white border-green-100 hover:border-green-400'}`}
                            >
                                <div className="flex-1">
                                    <div className={`text-xs font-black mb-2 flex items-center ${isDone ? 'text-green-600' : 'text-green-400'}`}>
                                        <span className="bg-green-100 px-2 py-0.5 rounded mr-2">{t('stake.progress.step_label', 'STEP')} {task.step}</span>
                                        • {t('stake.progress.deadline_label', '預計截止日期')}: {task.deadline}
                                    </div>
                                    <h4 className={`text-xl font-black ${isDone ? 'text-green-800 line-through opacity-60' : 'text-gray-900'}`}>{task.title}</h4>
                                    <p className="text-sm text-gray-500 mt-2 font-medium">{task.desc}</p>
                                </div>
                                <div className="mt-4 md:mt-0 md:ml-8 flex items-center">
                                    <div className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all font-black text-sm ${isDone ? 'bg-green-600 text-white border-green-700 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                        {isDone ? <Check className="w-4 h-4 mr-2" /> : null}
                                        {isDone ? t('stake.progress.status.completed', '任務已完成') : t('stake.progress.status.pending', '待執行')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressTab;
