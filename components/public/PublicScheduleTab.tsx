import React, { useMemo, useState, useEffect, useRef } from 'react';
import { EventData, RoadSignItem } from '../../types';
import { getWeatherForecast } from '../../services/sheetService';
import { Clock, MapPin, Map as MapIcon, Briefcase, CheckSquare, Sun, CloudRain, Shirt, Umbrella, ChevronDown, ChevronUp, Bus, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';

interface PublicScheduleTabProps {
    activeEvent: EventData;
}

// Refined rainbow themes following strict system instructions (Light bg + Dark text & borders)
const rainbowThemes = [
    { border: 'border-red-200', title: 'bg-red-200', header: 'bg-red-100', content: 'bg-red-50', accent: 'text-red-900' },
    { border: 'border-orange-200', title: 'bg-orange-200', header: 'bg-orange-100', content: 'bg-orange-50', accent: 'text-orange-900' },
    { border: 'border-amber-200', title: 'bg-amber-200', header: 'bg-amber-100', content: 'bg-amber-50', accent: 'text-amber-900' },
    { border: 'border-emerald-200', title: 'bg-emerald-200', header: 'bg-emerald-100', content: 'bg-emerald-50', accent: 'text-emerald-900' },
    { border: 'border-blue-200', title: 'bg-blue-200', header: 'bg-blue-100', content: 'bg-blue-50', accent: 'text-blue-900' },
    { border: 'border-indigo-200', title: 'bg-indigo-200', header: 'bg-indigo-100', content: 'bg-indigo-50', accent: 'text-indigo-900' },
    { border: 'border-purple-200', title: 'bg-purple-200', header: 'bg-purple-100', content: 'bg-purple-50', accent: 'text-purple-900' },
];

const PublicScheduleTab: React.FC<PublicScheduleTabProps> = ({ activeEvent }) => {
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        temple: false,
        tips: false,
        globalSigns: false
    });

    // Orientation Reset補丁 (Hard Reset)
    const [remountKey, setRemountKey] = useState(0);
    useEffect(() => {
        const handleResize = () => setRemountKey(k => k + 1);
        window.addEventListener('orientationchange', handleResize);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('orientationchange', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

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
    
    // Helper to render Road Sign Table 
    const renderRoadSignTable = (type: 'outbound' | 'return', items: RoadSignItem[], theme: any, id: string) => {
        if (!items || items.length === 0) return null;
        return (
            <div className={`rounded overflow-hidden shadow-sm border ${theme.border} bg-white/60 backdrop-blur-sm h-full`}>
                <div className={`px-4 py-2 font-bold text-[10px] md:text-xs uppercase tracking-widest border-b ${theme.accent} ${theme.border} bg-white/40`}>
                    {type === 'outbound' ? '去程 (OUTBOUND)' : '回程 (RETURN)'}
                </div>
                {/* Mobile Scroll Assist */}
                <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-white/30 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 animate-pulse flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> 左右滑動
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => scroll(id + type, 'left')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                        <button onClick={() => scroll(id + type, 'right')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                    </div>
                </div>
                <div ref={el => scrollRefs.current[id + type] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar w-full max-w-full min-w-0">
                    <table className="w-full [width:max-content] min-w-[1200px] text-left border-collapse table-auto">
                        <thead>
                            <tr className={`text-[10px] md:text-sm font-bold uppercase tracking-wider border-b bg-white/20 ${theme.accent} ${theme.border}`}>
                                <th className={`px-2 py-2 w-12 text-center border-r ${theme.border}`}>#</th>
                                <th className="px-2 py-2">行車指示內容 (INSTRUCTIONS)</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.border.replace('border', 'divide')} text-[10px] md:text-sm`}>
                            {(Array.isArray(items) ? items : []).map((sign: RoadSignItem, sIdx: number) => {
                                const isChecked = !!sign.checked;
                                return (
                                    <tr key={sIdx} className={`${isChecked ? 'opacity-50 grayscale' : ''} hover:bg-white/40 transition-colors`}>
                                        <td className={`px-2 py-2 text-center font-bold border-r bg-white/20 ${theme.border} ${theme.accent}`}>
                                            {sIdx + 1}
                                        </td>
                                        <td className={`px-2 py-2 font-medium leading-relaxed ${isChecked ? 'line-through' : 'text-slate-800'}`}>
                                            {sign.instruction}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const globalRoadSigns = activeEvent.globalRoadSigns;
    const isOutboundPublished = globalRoadSigns?.isPublished;
    const isReturnPublished = (globalRoadSigns as any)?.isReturnPublished;

    const showRoadSigns = globalRoadSigns && (isOutboundPublished || isReturnPublished);

    // Weather Data & Advice Logic
    const weather = useMemo(() => getWeatherForecast(activeEvent.event_date, '台北市大安區'), [activeEvent.event_date]);

    const getClothingAdvice = () => {
        let advice = "請穿著端莊的聖殿服裝(安息日服裝)。";
        if (weather.temp_low < 20) advice += " 早晚氣溫較低，建議攜帶保暖外套。";
        else if (weather.temp_high > 30) advice += " 天氣炎熱，請穿著透氣材質，並注意補充水分。";
        else advice += " 氣溫舒適，建議洋蔥式穿搭。";
        return advice;
    };

    const getRainAdvice = () => {
        if (weather.rainProb >= 50) return "降雨機率高，請務必攜帶雨具。";
        if (weather.rainProb >= 20) return "建議攜帶摺疊傘，以備不時之需。";
        return "降雨機率低，但仍可攜帶雨具以防萬一。";
    };

    return (
        <div key={remountKey} className="space-y-1 animate-fade-in pb-12 w-full max-w-full min-w-0 bg-[#F8F9FA]">
            {/* Temple Schedule - Using rainbowTheme[0] (Red) */}
            {activeEvent.templeConfig?.isPublished && activeEvent.templeConfig.items && activeEvent.templeConfig.items.length > 0 && (
                <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[0].border} overflow-hidden w-full max-w-full min-w-0 bg-white transition-all duration-300`}>
                    <div 
                        className={`w-full px-5 py-3.5 ${rainbowThemes[0].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[0].border}`}
                        onClick={() => toggleCollapse('temple')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[0].accent}`}>
                                <Clock size={18}/>
                            </div>
                            <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">
                                {activeEvent.templeConfig.title || '教儀行程安排'}
                                {!collapsedSections['temple'] && (
                                    <span className="ml-3 text-[10px] md:text-xs opacity-60 font-bold text-slate-500">
                                        {activeEvent.templeConfig.startTime || ''} - {activeEvent.templeConfig.endTime || ''}
                                    </span>
                                )}
                            </h4>
                        </div>
                        <div className="text-slate-600">
                            {collapsedSections.temple ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                        </div>
                    </div>

                    {!collapsedSections['temple'] && (
                        <div className={`w-full min-w-0 ${rainbowThemes[0].content} p-0 md:p-3 lg:p-4 xl:p-6`}>
                            {/* Mobile Scroll Assist */}
                            <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-white/50 border-b border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 animate-pulse flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" /> 左右滑動
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => scroll('temple', 'left')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                                    <button onClick={() => scroll('temple', 'right')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                                </div>
                            </div>
                            <div ref={el => scrollRefs.current['temple'] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar pb-6 md:pb-0 w-full max-w-full min-w-0">
                                <table className="w-full text-center border-collapse min-w-[1200px] [width:max-content] table-auto">
                                    <thead>
                                        <tr className={`border-b ${rainbowThemes[0].header} ${rainbowThemes[0].accent} ${rainbowThemes[0].border} text-[10px] md:text-sm`}>
                                            <th className={`px-2 py-2 text-left w-24 sticky left-0 z-20 ${rainbowThemes[0].header} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r ${rainbowThemes[0].border} font-bold uppercase`}>場次</th>
                                            <th className="px-2 py-2 font-bold uppercase">開始時間</th>
                                            <th className="px-2 py-2 font-bold uppercase">結束時間</th>
                                            <th className="px-2 py-2 w-20 font-bold uppercase">預計需時</th>
                                            <th className="px-2 py-2 text-left font-bold uppercase">備註說明</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${rainbowThemes[0].border.replace('border', 'divide')} text-[10px] md:text-sm`}>
                                        {(Array.isArray(activeEvent.templeConfig.items) ? activeEvent.templeConfig.items : []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/40 transition-colors group">
                                                <td className={`px-2 py-2 sticky left-0 z-10 ${rainbowThemes[0].content} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r font-black ${rainbowThemes[0].accent} ${rainbowThemes[0].border}`}>{item.stopCode || '-'}</td>
                                                <td className="px-2 py-2 font-medium text-slate-700">{item.arrivalTime}</td>
                                                <td className="px-2 py-2 font-medium text-slate-700">{item.departureTime}</td>
                                                <td className="px-2 py-2 font-medium text-slate-700">{item.stay ? `${item.stay} min` : '-'}</td>
                                                <td className="px-2 py-2 text-left text-slate-600 leading-relaxed">{item.address}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bus Routes & Road Signs */}
            {(activeEvent.busConfigs || []).length > 0 && (
                <div className="space-y-8">
                    {(activeEvent.busConfigs || []).map((busConfig: any, idx: number) => {
                        const busName = busConfig.name;
                        const route = (activeEvent.busRoutes?.[busName] as any) || { outbound: [], returnTrip: [] };
                        const showOutbound = route.isOutboundPublished;
                        const showReturn = route.isReturnPublished;
                        
                        if (!showOutbound && !showReturn) return null;

                        const themeIdx = (idx + 1) % 7;
                        const theme = rainbowThemes[themeIdx];
                        const isBusCollapsed = collapsedSections[`bus-${busName}`];
                        const isSignCollapsed = collapsedSections[`sign-${busName}`];

                        return (
                            <div key={busName} className="space-y-4 md:space-y-6">
                                {/* 行程安排 */}
                                <div className={`rounded shadow-none md:shadow-sm border-none md:border ${theme.border} overflow-hidden w-full max-w-full min-w-0 bg-white transition-all duration-300`}>
                                    <div 
                                        className={`w-full px-5 py-3.5 ${theme.title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${theme.border}`}
                                        onClick={() => toggleCollapse(`bus-${busName}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${theme.accent}`}>
                                                <Bus size={18}/>
                                            </div>
                                            <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">車次行程：{busName}</h4>
                                        </div>
                                        <div className="text-slate-600">
                                            {isBusCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                        </div>
                                    </div>
                                    
                                    {!isBusCollapsed && (
                                        <div className={`p-1 md:p-3 lg:p-4 xl:p-6 space-y-4 md:space-y-6 ${theme.content}`}>
                                            {/* Bus Info Below Title - Right Aligned */}
                                            {(busConfig.company || busConfig.licensePlate || busConfig.driverName1) && (
                                                <div className="w-full flex justify-end gap-3 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                                    {busConfig.company && <span className="bg-white/40 px-2 py-0.5 rounded border border-slate-200">🏢 {busConfig.company}</span>}
                                                    {busConfig.licensePlate && <span className="bg-white/40 px-2 py-0.5 rounded border border-slate-200">🚌 {busConfig.licensePlate}</span>}
                                                    {busConfig.driverName1 && <span className="bg-white/40 px-2 py-0.5 rounded border border-slate-200">👤 {busConfig.driverName1}</span>}
                                                </div>
                                            )}

                                            {/* Outbound */}
                                            {showOutbound && route.outbound && route.outbound.length > 0 && (
                                                <div className="space-y-3">
                                                    <h5 className={`font-black text-xs md:text-sm ${theme.accent} flex items-center gap-2 border-b-2 ${theme.border} pb-1`}>
                                                        <MapPin size={14}/> 去程：{route.outboundTitle || '前往聖殿'}
                                                        <span className="font-bold opacity-60 ml-auto text-[10px] md:text-xs text-slate-500">{route.outboundStartTime || ''} - {route.outboundEndTime || ''}</span>
                                                    </h5>
                                                    <div className="w-full min-w-0 bg-white/40 rounded-none md:rounded border-none md:border border-white/40">
                                                        {/* Mobile Scroll Assist */}
                                                        <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-white/50 border-b border-slate-200">
                                                            <span className="text-[10px] font-bold text-slate-400 animate-pulse flex items-center gap-1">
                                                                <Smartphone className="w-3 h-3" /> 左右滑動
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => scroll(`bus-${busName}-out`, 'left')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                                                                <button onClick={() => scroll(`bus-${busName}-out`, 'right')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                                                            </div>
                                                        </div>
                                                        <div ref={el => scrollRefs.current[`bus-${busName}-out`] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar pb-6 md:pb-0 w-full max-w-full min-w-0">
                                                            <table className="w-full text-center border-collapse min-w-[1200px] [width:max-content] table-auto">
                                                                <thead>
                                                                    <tr className={`text-[10px] md:text-sm font-bold ${theme.header} ${theme.accent}`}>
                                                                        <th className={`px-2 py-2 w-16 sticky left-0 z-20 ${theme.header} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r ${theme.border} font-bold`}>站號</th>
                                                                        <th className={`px-2 py-2 w-24 border-r ${theme.border}`}>到達</th>
                                                                        <th className={`px-2 py-2 w-24 border-r ${theme.border}`}>離開</th>
                                                                        <th className={`px-2 py-2 text-left border-r ${theme.border}`}>站點地點</th>
                                                                        <th className="px-2 py-2 text-left">詳細地址</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className={`divide-y ${theme.border.replace('border', 'divide')} text-[10px] md:text-sm`}>
                                                                    {(Array.isArray(route.outbound) ? route.outbound : []).map((item: any, iIdx: number) => (
                                                                        <tr key={iIdx} className="hover:bg-white/40 transition-colors">
                                                                            <td className={`px-2 py-2 sticky left-0 z-10 ${theme.content} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r font-black ${theme.accent} ${theme.border}`}>{item.stopCode || '-'}</td>
                                                                            <td className="px-2 py-2 font-bold text-slate-700">{item.arrivalTime}</td>
                                                                            <td className="px-2 py-2 font-bold text-slate-700">{item.departureTime}</td>
                                                                            <td className="px-2 py-2 text-left font-bold text-slate-900">{item.location}</td>
                                                                            <td className="px-2 py-2 text-left text-slate-500 font-medium">{item.address}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Return */}
                                            {showReturn && route.returnTrip && route.returnTrip.length > 0 && (
                                                <div className="space-y-3">
                                                    <h5 className={`font-black text-xs md:text-sm ${theme.accent} flex items-center gap-2 border-b-2 ${theme.border} pb-1`}>
                                                        <MapPin size={14}/> 回程：{route.returnTitle || '返回教堂'}
                                                        <span className="font-bold opacity-60 ml-auto text-[10px] md:text-xs text-slate-500">{route.returnStartTime || ''} - {route.returnEndTime || ''}</span>
                                                    </h5>
                                                    <div className="w-full min-w-0 bg-white/40 rounded-none md:rounded border-none md:border border-white/40">
                                                        {/* Mobile Scroll Assist */}
                                                        <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-white/50 border-b border-slate-200">
                                                            <span className="text-[10px] font-bold text-slate-400 animate-pulse flex items-center gap-1">
                                                                <Smartphone className="w-3 h-3" /> 左右滑動
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => scroll(`bus-${busName}-back`, 'left')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                                                                <button onClick={() => scroll(`bus-${busName}-back`, 'right')} className="p-1 bg-white border border-slate-200 rounded shadow-sm active:bg-slate-100"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                                                            </div>
                                                        </div>
                                                        <div ref={el => scrollRefs.current[`bus-${busName}-back`] = el} className="overflow-x-auto overscroll-x-contain -mx-1 px-1 custom-scrollbar pb-6 md:pb-0 w-full max-w-full min-w-0">
                                                            <table className="w-full text-center border-collapse min-w-[1200px] [width:max-content] table-auto">
                                                                <thead>
                                                                    <tr className={`text-[10px] md:text-sm font-bold ${theme.header} ${theme.accent}`}>
                                                                        <th className={`px-2 py-2 w-16 sticky left-0 z-20 ${theme.header} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r ${theme.border} font-bold`}>站號</th>
                                                                        <th className={`px-2 py-2 w-24 border-r ${theme.border}`}>到達</th>
                                                                        <th className={`px-2 py-2 w-24 border-r ${theme.border}`}>離開</th>
                                                                        <th className={`px-2 py-2 text-left border-r ${theme.border}`}>站點地點</th>
                                                                        <th className="px-2 py-2 text-left">詳細地址</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className={`divide-y ${theme.border.replace('border', 'divide')} text-[10px] md:text-sm`}>
                                                                    {(Array.isArray(route.returnTrip) ? route.returnTrip : []).map((item: any, iIdx: number) => (
                                                                        <tr key={iIdx} className="hover:bg-white/40 transition-colors">
                                                                            <td className={`px-2 py-2 sticky left-0 z-10 ${theme.content} shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-r font-black ${theme.accent} ${theme.border}`}>{item.stopCode || '-'}</td>
                                                                            <td className="px-2 py-2 font-bold text-slate-700">{item.arrivalTime}</td>
                                                                            <td className="px-2 py-2 font-bold text-slate-700">{item.departureTime}</td>
                                                                            <td className="px-2 py-2 text-left font-bold text-slate-900">{item.location}</td>
                                                                            <td className="px-2 py-2 text-left text-slate-500 font-medium">{item.address}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 路標提醒 (Per Bus) */}
                                {((route.isOutboundRoadSignsPublished && route.outboundRoadSigns?.length > 0) || (route.isReturnRoadSignsPublished && route.returnRoadSigns?.length > 0)) && (
                                    <div className={`rounded shadow-none md:shadow-sm border-none md:border ${theme.border} overflow-hidden w-full max-w-full min-w-0 bg-white transition-all duration-300`}>
                                        <div 
                                            className={`w-full px-5 py-3.5 ${theme.title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${theme.border}`}
                                            onClick={() => toggleCollapse(`sign-${busName}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${theme.accent}`}>
                                                    <MapIcon size={18}/>
                                                </div>
                                                <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">行車路標指引：{busName}</h4>
                                            </div>
                                            <div className="text-slate-600">
                                                {isSignCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                            </div>
                                        </div>
                                        {!isSignCollapsed && (
                                            <div className={`p-1 md:p-3 lg:p-4 xl:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 ${theme.content}`}>
                                                {route.isOutboundRoadSignsPublished && renderRoadSignTable('outbound', route.outboundRoadSigns, theme, `bus-${busName}-sign`)}
                                                {route.isReturnRoadSignsPublished && renderRoadSignTable('return', route.returnRoadSigns, theme, `bus-${busName}-sign`)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Global Road Signs */}
            {showRoadSigns && (
                <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[3].border} overflow-hidden bg-white transition-all duration-300`}>
                    <div 
                        className={`w-full px-5 py-3.5 ${rainbowThemes[3].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[3].border}`}
                        onClick={() => toggleCollapse('globalSigns')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[3].accent}`}>
                                <MapIcon size={18}/>
                            </div>
                            <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">共通行程路標指引 (ALL BUSES)</h4>
                        </div>
                        <div className="text-slate-600">
                            {collapsedSections.globalSigns ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                        </div>
                    </div>
                    {!collapsedSections['globalSigns'] && (
                        <div className={`p-1 md:p-3 lg:p-4 xl:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 ${rainbowThemes[3].content}`}>
                            {isOutboundPublished && globalRoadSigns!.outboundItems && globalRoadSigns!.outboundItems.length > 0 && (
                                renderRoadSignTable('outbound', globalRoadSigns!.outboundItems, rainbowThemes[3], 'global-sign')
                            )}
                            {isReturnPublished && ((globalRoadSigns!.returnItems && globalRoadSigns!.returnItems.length > 0) || (globalRoadSigns!.items && globalRoadSigns!.items.length > 0 && !globalRoadSigns!.outboundItems)) ? (
                                renderRoadSignTable('return', globalRoadSigns!.returnItems || globalRoadSigns!.items, rainbowThemes[3], 'global-sign')
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {/* Travel Tips Section */}
            <div className={`rounded shadow-none md:shadow-sm border-none md:border ${rainbowThemes[4].border} overflow-hidden bg-white transition-all duration-300`}>
                <div 
                    className={`w-full px-5 py-3.5 ${rainbowThemes[4].title} flex justify-between items-center cursor-pointer hover:opacity-90 transition-all border-b ${rainbowThemes[4].border}`}
                    onClick={() => toggleCollapse('tips')}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded border shadow-sm bg-white/50 ${rainbowThemes[4].accent}`}>
                            <Briefcase size={18}/>
                        </div>
                        <h4 className="font-bold text-xs md:text-sm lg:text-base text-slate-900 tracking-tight uppercase">聖殿旅行團必備叮嚀 (TRAVEL TIPS)</h4>
                    </div>
                    <div className="text-slate-600">
                        {collapsedSections.tips ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                </div>

                {!collapsedSections['tips'] && (
                    <div className={`p-1 md:p-3 lg:p-4 xl:p-6 ${rainbowThemes[4].content}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            {/* 1. Reminder Card */}
                            <div className="bg-white p-4 md:p-6 rounded border border-blue-200 shadow-sm flex items-start gap-4">
                                <div className="bg-blue-100 p-2 md:p-3 rounded-full text-blue-700 shadow-inner">
                                    <CheckSquare size={20} className="md:w-6 md:h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h5 className="font-black text-blue-900 text-[10px] md:text-xs uppercase tracking-wider">必備物品檢查清單</h5>
                                    <ul className="text-xs text-slate-700 space-y-2">
                                        <li className="flex items-center gap-2 font-black text-rose-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                            有效聖殿推薦書 (REQUIRED)
                                        </li>
                                        <li className="flex items-center gap-2 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            個人身分證明文件 (ID CARD)
                                        </li>
                                        <li className="flex items-center gap-2 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            全套聖殿/安息日服裝
                                        </li>
                                        <li className="flex items-center gap-2 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            個人常備藥品與飲用水
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* 2. Weather Card */}
                            <div className="bg-white p-4 md:p-6 rounded border border-amber-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-2">
                                    <h5 className="font-black text-amber-900 text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2">
                                        {weather.condition === 'rainy' ? <CloudRain size={16} className="text-blue-500" /> : <Sun size={16} className="text-amber-500" />}
                                        台北聖殿天氣預報
                                    </h5>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daan Dist, Taipei</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                                    <div className="bg-amber-50 p-2 md:p-3 rounded border border-amber-100 shadow-inner">
                                        <div className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">預估氣溫</div>
                                        <div className="font-black text-lg md:text-2xl text-slate-800 tracking-tighter">{weather.temp_low}° - {weather.temp_high}°C</div>
                                    </div>
                                    <div className="bg-blue-50 p-2 md:p-3 rounded border border-blue-100 shadow-inner">
                                        <div className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">降雨機率</div>
                                        <div className="font-black text-lg md:text-2xl text-blue-600 tracking-tighter">{weather.rainProb}%</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-2 bg-amber-50/80 rounded">
                                        <Shirt size={14} className="text-amber-700 mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{getClothingAdvice()}</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-blue-50/80 rounded">
                                        <Umbrella size={14} className="text-blue-700 mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{getRainAdvice()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicScheduleTab;
