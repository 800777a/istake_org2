
import React, { useState, useEffect, useRef } from 'react';
import { EventData, GlobalSettings, Volunteer, Registration, BusRatingRecord } from '../../types';
import { updateEvent, updateSettings } from '../../services/sheetService';
import { Badge, HeartHandshake, Plus, Star, CheckCircle2, User, AlertCircle, Lock, ChevronDown, ChevronUp, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRemountOnResize } from '../../hooks/useRemountOnResize';
import { maskName } from '../../utils/validation';

import Toast, { ToastType } from '../Toast';

const TEMPLE_WORKER_ROLES = [
    { key: 'A', label: 'A.協調員 (恩道門後的弟兄)' },
    { key: 'B', label: 'B.洗禮記錄員 (恩道門後的弟兄)' },
    { key: 'C', label: 'C.證實記錄員 (恩道門後的弟兄)' },
    { key: 'D', label: 'D.證實者 (長老以上的聖職)' },
    { key: 'E', label: 'E.發衣服 (恩道門後的姐妹)' },
    { key: 'F', label: 'F.發毛巾 (成年姐妹)' },
    { key: 'G', label: 'G.照顧兒童 (成人)' },
    { key: 'H', label: 'H.照顧兒童 (與G為夫妻或同性別的成人)' },
    { key: 'I', label: 'I.施洗者1 (祭司以上的聖職)' }, 
    { key: 'J', label: 'J.施洗者2 (祭司以上的聖職)' },
    { key: 'K', label: 'K.領車 (成人)' },
    { key: 'L', label: 'L.領車 (成人)' },
    { key: 'M', label: 'M.領車 (成人)' },
];

interface PublicServiceTabProps {
    activeEvent: EventData;
    settings: GlobalSettings;
    registrations?: Registration[]; // V300: Added for identity verification
}

const METRIC_LABELS = [
    '準時到達', '安全駕駛', '行車平穩', '沒有抽煙', '服務禮貌',
    '車況良好', '車輛清潔', '車內氣味', '設備正常'
];

// Refined rainbow themes following strict system instructions (Light bg + Dark text & borders)
const rainbowThemes = [
    { border: 'border-red-200', title: 'bg-red-200', header: 'bg-red-100', content: 'bg-red-50', accent: 'text-red-800' },
    { border: 'border-orange-200', title: 'bg-orange-200', header: 'bg-orange-100', content: 'bg-orange-50', accent: 'text-orange-800' },
    { border: 'border-amber-200', title: 'bg-amber-200', header: 'bg-amber-100', content: 'bg-amber-50', accent: 'text-amber-900' },
    { border: 'border-emerald-200', title: 'bg-emerald-200', header: 'bg-emerald-100', content: 'bg-emerald-50', accent: 'text-emerald-800' },
    { border: 'border-blue-200', title: 'bg-blue-200', header: 'bg-blue-100', content: 'bg-blue-50', accent: 'text-blue-800' },
    { border: 'border-indigo-200', title: 'bg-indigo-200', header: 'bg-indigo-100', content: 'bg-indigo-50', accent: 'text-indigo-800' },
    { border: 'border-purple-200', title: 'bg-purple-200', header: 'bg-purple-100', content: 'bg-purple-50', accent: 'text-purple-800' },
];

const PublicServiceTab: React.FC<PublicServiceTabProps> = ({ activeEvent, settings, registrations = [] }) => {
    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = React.useMemo(() => {
        return settings.billingConfig?.units?.map(u => u.shortName) || settings.units || [];
    }, [settings]);

    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        rating: false,
        workers: false,
        volunteers: false
    });

    // Orientation Reset補丁 (Hard Reset)
    const remountKey = useRemountOnResize();

    const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scroll = (id: string, direction: 'left' | 'right') => {
        const el = scrollRefs.current[id];
        if (el) {
            const amount = direction === 'left' ? -200 : 200;
            el.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const toggleCollapse = (id: string) => {
        setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [newVolunteer, setNewVolunteer] = useState<Volunteer>({ id: '', unit: '', name: '', roleKey: '' });
    const [ratingForm, setRatingForm] = useState<{
        activeRatingId: string | null;
        raterUnit: string;
        raterName: string;
        remarks: string;
        d1Metrics: boolean[];
        d2Metrics: boolean[];
    }>({
        activeRatingId: null,
        raterUnit: '',
        raterName: '',
        remarks: '',
        d1Metrics: Array(9).fill(false),
        d2Metrics: Array(9).fill(false)
    });

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    const handleAddVolunteer = () => {
        if (!activeEvent) return;
        if (!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey) return;
        
        const newItem = { ...newVolunteer, id: `VOL-${Date.now()}` };
        const newList = [...(activeEvent.volunteers || []), newItem];
        const updated = { ...activeEvent, volunteers: newList };
        
        updateEvent(updated); 
        setNewVolunteer({ id: '', unit: '', name: '', roleKey: '' });
        setMsgType('success');
        setMsg('志願服務申請已送出！');
    };

    const handleRatingSubmit = async (record: BusRatingRecord) => {
        if (!ratingForm.raterName || !ratingForm.raterUnit) {
            setMsgType('error');
            setMsg('請填寫評分人單位與姓名');
            return;
        }

        // Identity Verification
        const isRegistered = registrations.some(r => r.name === ratingForm.raterName && r.unit === ratingForm.raterUnit);
        if (!isRegistered) {
            setMsgType('error');
            setMsg('身分檢核失敗：您非本次活動之報名人員，無法提交評分。');
            return;
        }

        const updatedRecord: BusRatingRecord = {
            ...record,
            isSubmitted: true,
            raterName: ratingForm.raterName,
            raterUnit: ratingForm.raterUnit,
            remarks: ratingForm.remarks,
            d1Metrics: ratingForm.d1Metrics,
            d2Metrics: ratingForm.d2Metrics
        };

        const updatedRatings = (settings.busRatings || []).map(r => r.id === record.id ? updatedRecord : r);
        await updateSettings({ ...settings, busRatings: updatedRatings });
        
        setRatingForm({
            activeRatingId: null,
            raterUnit: '',
            raterName: '',
            remarks: '',
            d1Metrics: Array(9).fill(false),
            d2Metrics: Array(9).fill(false)
        });
        setMsgType('success');
        setMsg('評分送出成功！');
    };

    const myRatings = (settings.busRatings || []).filter(r => r.eventId === activeEvent.event_id);

    return (
        <div key={remountKey} className="space-y-1 animate-fade-in pb-12 w-full max-w-full min-w-0 bg-[#F8F9FA]">
            {/* Service Rating Section - Rainbow 0 (Red) */}
            <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[0].border} overflow-hidden bg-white transition-all duration-300 w-full max-w-full min-w-0`}>
                <div 
                    className={`w-full px-5 py-3.5 ${rainbowThemes[0].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[0].border}`}
                    onClick={() => toggleCollapse('rating')}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[0].accent}`}>
                            <Star size={18}/>
                        </div>
                        <h4 className="font-bold text-sm md:text-base lg:text-lg text-slate-900 tracking-tight uppercase">車次服務評分 (SERVICE RATING)</h4>
                    </div>
                    <div className="text-slate-600">
                        {collapsedSections.rating ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                </div>

                {!collapsedSections['rating'] && (
                    <div className={`p-1 md:p-6 space-y-4 md:space-y-6 ${rainbowThemes[0].content} w-full max-w-full min-w-0`}>
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded border border-red-200 text-xs text-slate-600 leading-relaxed shadow-inner">
                            <h5 className={`font-black ${rainbowThemes[0].accent} mb-1 flex items-center gap-2 uppercase tracking-wider`}>
                                <AlertCircle size={14}/> 計分規則說明
                            </h5>
                            <p>本功能用於評分本次活動的服務品質。每位司機配置 9 項評核，我們將定期彙整結果供車行參考。您的個資將受到去識別化保護。</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myRatings.length === 0 && <div className="col-span-full text-center py-8 text-slate-400 text-xs font-bold uppercase">目前尚無評分項目</div>}
                            {myRatings.map(record => {
                                const isLocked = record.isSubmitted;
                                const isActive = ratingForm.activeRatingId === record.id;
                                
                                return (
                                    <div 
                                        key={record.id} 
                                        className={`rounded border transition-all duration-300 overflow-hidden flex flex-col ${isLocked ? 'bg-slate-100 border-slate-200 opacity-80' : 'bg-white border-red-200 shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className={`px-4 py-3 flex justify-between items-center border-b ${isLocked ? 'border-slate-200' : 'border-red-100'}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-xs md:text-sm text-slate-800">{record.busId} ({record.plate})</span>
                                                    {isLocked && <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1"><Lock size={10}/> 已送出</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">司機: {record.driver1Name}</div>
                                            </div>
                                            {!isLocked && (
                                                <button 
                                                    onClick={() => setRatingForm({ ...ratingForm, activeRatingId: isActive ? null : record.id })}
                                                    className={`h-8 px-3 rounded text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-slate-200 text-slate-600' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'}`}
                                                >
                                                    {isActive ? '取消' : '開始評分'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Rating Display (Locked) */}
                                        {isLocked && (
                                            <div className="p-3 text-[10px] text-slate-500 space-y-2">
                                                <div className="bg-white/50 p-2 rounded italic text-slate-600 border border-slate-200">備註: {record.remarks || '無'}</div>
                                                <div className="flex justify-between items-center font-bold">
                                                    <span className="flex items-center gap-1"><User size={10}/> {record.raterUnit} {maskName(record.raterName)}</span>
                                                    <span className="text-red-700">{record.d1Metrics.filter(m => m).length}/{METRIC_LABELS.length} 達成</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rating Form (Active) */}
                                        {isActive && !isLocked && (
                                            <div className="p-4 bg-red-50/50 space-y-4 animate-slide-down">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <h6 className="text-[10px] font-black text-red-800 border-b border-red-200 pb-1 uppercase tracking-widest flex items-center justify-between">
                                                            {record.driver1Name} (指標核取)
                                                            <span className="text-red-600">{ratingForm.d1Metrics.filter(m => m).length}/{METRIC_LABELS.length}</span>
                                                        </h6>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {METRIC_LABELS.map((label, i) => (
                                                                <label key={i} className="flex items-center gap-2 cursor-pointer group p-1.5 rounded hover:bg-white transition-colors border border-transparent hover:border-red-100">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="rounded text-red-600 w-4 h-4 border-red-300 focus:ring-red-500"
                                                                        checked={ratingForm.d1Metrics[i]}
                                                                        onChange={e => {
                                                                            const nm = [...ratingForm.d1Metrics];
                                                                            nm[i] = e.target.checked;
                                                                            setRatingForm({ ...ratingForm, d1Metrics: nm });
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2 border-t border-red-200">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">反應備註</label>
                                                            <textarea 
                                                                className="w-full border border-red-200 rounded p-2 text-xs focus:ring-2 focus:ring-red-300 outline-none bg-white min-h-[60px]"
                                                                placeholder="請輸入具體意見或建議..."
                                                                value={ratingForm.remarks}
                                                                onChange={e => setRatingForm({ ...ratingForm, remarks: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">評分者單位</label>
                                                                <select 
                                                                    className="w-full border border-red-200 h-9 rounded px-2 text-xs bg-white font-bold text-slate-700"
                                                                    value={ratingForm.raterUnit}
                                                                    onChange={e => setRatingForm({ ...ratingForm, raterUnit: e.target.value })}
                                                                >
                                                                    <option value="">選擇單位</option>
                                                                    {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">評分者姓名</label>
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full border border-red-200 h-9 rounded px-2 text-xs font-bold text-slate-700"
                                                                    placeholder="請輸入您的真實姓名"
                                                                    value={ratingForm.raterName}
                                                                    onChange={e => setRatingForm({ ...ratingForm, raterName: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRatingSubmit(record)}
                                                            className="w-full h-8 md:h-10 lg:h-12 bg-red-800 text-white rounded text-xs md:text-sm lg:text-base font-black uppercase tracking-widest shadow-md hover:bg-red-900 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle2 size={18}/> 送出評分
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Temple Workers - Rainbow 1 (Orange) */}
            <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[1].border} overflow-hidden w-full max-w-full min-w-0 bg-white transition-all duration-300`}>
                <div 
                    className={`w-full px-5 py-3.5 ${rainbowThemes[1].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[1].border}`}
                    onClick={() => toggleCollapse('workers')}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[1].accent}`}>
                            <Badge size={18}/>
                        </div>
                        <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">指定教儀/領車服務人員 (ASSIGNED STAFF)</h4>
                    </div>
                    <div className="text-slate-600">
                        {collapsedSections.workers ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                </div>

                {!collapsedSections['workers'] && (
                    <div className={`p-1 md:p-3 lg:p-4 xl:p-6 ${rainbowThemes[1].content}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {TEMPLE_WORKER_ROLES.map((role: { key: string, label: string }) => {
                                const existingData = activeEvent.temple_workers?.[role.key] || { name: '', unit: '' };
                                const worker = typeof existingData === 'string' ? { name: existingData, unit: '' } : existingData;
                                const hasWorker = !!worker.name;
                                
                                return (
                                    <div key={role.key} className="flex flex-col space-y-1 group">
                                        <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{role.label}</label>
                                        <div className="flex gap-1.5">
                                            <div className={`w-24 border rounded h-9 md:h-10 flex items-center justify-center text-[10px] md:text-xs font-black shadow-sm transition-all ${hasWorker ? 'bg-orange-800 border-orange-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                                                {worker.unit || '-'}
                                            </div>
                                            <div className={`flex-1 border rounded h-9 md:h-10 px-3 flex items-center text-[10px] md:text-xs shadow-sm transition-all ${hasWorker ? 'bg-white border-orange-300 text-slate-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-300 italic'}`}>
                                                {maskName(worker.name) || '待指派...'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Volunteers Section - Rainbow 2 (Amber) */}
            <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[2].border} overflow-hidden w-full max-w-full min-w-0 bg-white transition-all duration-300`}>
                <div 
                    className={`w-full px-5 py-3.5 ${rainbowThemes[2].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[2].border}`}
                    onClick={() => toggleCollapse('volunteers')}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[2].accent}`}>
                            <HeartHandshake size={18}/>
                        </div>
                        <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">主動申請服務 (VOLUNTEERS)</h4>
                    </div>
                    <div className="text-slate-600">
                        {collapsedSections.volunteers ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                </div>

                {!collapsedSections['volunteers'] && (
                    <div className={`p-1 md:p-3 lg:p-4 xl:p-6 space-y-6 ${rainbowThemes[2].content}`}>
                        {/* Add Form Area - Right Aligned below title */}
                        <div className="flex justify-end">
                            <div className="w-full lg:w-3/4 bg-white/80 backdrop-blur-md p-4 md:p-6 rounded border border-amber-200 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">您的單位</label>
                                            <select 
                                                className="w-full border border-amber-200 h-8 md:h-10 lg:h-12 rounded px-3 text-xs md:text-sm font-bold bg-white focus:ring-2 focus:ring-amber-300 outline-none"
                                                value={newVolunteer.unit}
                                                onChange={e => setNewVolunteer({...newVolunteer, unit: e.target.value})}
                                            >
                                                <option value="">請選擇單位</option>
                                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">您的姓名</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-amber-200 h-8 md:h-10 lg:h-12 rounded px-3 text-xs md:text-sm font-bold focus:ring-2 focus:ring-amber-300 outline-none"
                                            placeholder="請輸入姓名"
                                            value={newVolunteer.name}
                                            onChange={e => setNewVolunteer({...newVolunteer, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">欲擔任職務</label>
                                        <select 
                                            className="w-full border border-amber-200 h-8 md:h-10 lg:h-12 rounded px-3 text-xs md:text-sm font-bold bg-white focus:ring-2 focus:ring-amber-300 outline-none"
                                            value={newVolunteer.roleKey}
                                            onChange={e => setNewVolunteer({...newVolunteer, roleKey: e.target.value})}
                                        >
                                            <option value="">請選擇職務</option>
                                            {TEMPLE_WORKER_ROLES.map((role: { key: string, label: string }) => (
                                                <option key={role.key} value={role.key}>{role.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleAddVolunteer}
                                        disabled={!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey}
                                        className="h-8 md:h-10 lg:h-12 px-8 bg-amber-600 text-white rounded text-xs md:text-sm lg:text-base font-black uppercase tracking-widest shadow-md hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> 提交服務申請
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Volunteer List Table */}
                        <div className="space-y-1">
                            {/* Mobile Scroll Assist */}
                            <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-white/50 border-b border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 animate-pulse flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" /> 左右滑動
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => scroll('volunteers', 'left')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                                    <button onClick={() => scroll('volunteers', 'right')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                                </div>
                            </div>
                            <div ref={el => scrollRefs.current['volunteers'] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar pb-6 md:pb-0 rounded-none md:rounded border-none md:border border-amber-200 shadow-sm bg-white p-1 w-full max-w-full min-w-0">
                                <table className="w-full text-left border-collapse min-w-[1200px] [width:max-content] table-auto">
                                    <thead className={`${rainbowThemes[2].header} ${rainbowThemes[2].accent} border-b ${rainbowThemes[2].border}`}>
                                        <tr className="text-[10px] md:text-sm font-black uppercase tracking-widest">
                                            <th className="px-2 py-2 pl-3 w-1/4 border-r border-amber-100">所屬單位</th>
                                            <th className="px-2 py-2 w-1/4 border-r border-amber-100">志願人員</th>
                                            <th className="px-2 py-2">擔任職務標籤</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${rainbowThemes[2].border.replace('border', 'divide')} text-[10px] md:text-sm`}>
                                        {(activeEvent.volunteers || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">目前尚無人員申請服務</td>
                                            </tr>
                                        ) : (
                                            (activeEvent.volunteers || []).map((v: Volunteer) => {
                                                const roleLabel = TEMPLE_WORKER_ROLES.find((r: { key: string }) => r.key === v.roleKey)?.label || v.roleKey;
                                                return (
                                                    <tr key={v.id} className="hover:bg-amber-50/50 transition-colors group">
                                                        <td className="px-2 py-2 pl-3 font-black text-amber-900 border-r border-amber-100">{v.unit}</td>
                                                        <td className="px-2 py-2 text-slate-900 font-bold border-r border-amber-100">{maskName(v.name)}</td>
                                                        <td className="px-2 py-2 text-slate-500 font-medium">{roleLabel}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
        </div>
    );
};

export default PublicServiceTab;
