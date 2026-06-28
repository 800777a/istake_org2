
import React, { useMemo, useState } from 'react';
import { EventData, RoadSignItem } from '../../types';
import { getWeatherForecast } from '../../services/sheetService';
import { Clock, MapPin, Map as MapIcon, Briefcase, CheckSquare, Sun, CloudRain, Shirt, Umbrella, ChevronDown, ChevronUp, Bus } from 'lucide-react';

const BUS_THEMES = [
    { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', header: 'bg-orange-100', row: 'bg-orange-50', accent: 'border-orange-300' },
    { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-900', header: 'bg-yellow-100', row: 'bg-yellow-50', accent: 'border-yellow-300' },
    { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', header: 'bg-green-100', row: 'bg-green-50', accent: 'border-green-300' },
    { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-900', header: 'bg-cyan-100', row: 'bg-cyan-50', accent: 'border-cyan-300' },
    { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', header: 'bg-blue-100', row: 'bg-blue-50', accent: 'border-blue-300' },
    { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-900', header: 'bg-indigo-100', row: 'bg-indigo-50', accent: 'border-indigo-300' },
    { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-900', header: 'bg-purple-100', row: 'bg-purple-50', accent: 'border-purple-300' },
];

const SIGN_THEMES = [
    { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', header: 'bg-blue-100', row: 'bg-blue-50', accent: 'border-blue-300' },
    { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-900', header: 'bg-indigo-100', row: 'bg-indigo-50', accent: 'border-indigo-300' },
    { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-900', header: 'bg-purple-100', row: 'bg-purple-50', accent: 'border-purple-300' },
    { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-900', header: 'bg-pink-100', row: 'bg-pink-50', accent: 'border-pink-300' },
    { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', header: 'bg-red-100', row: 'bg-red-50', accent: 'border-red-300' },
    { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', header: 'bg-orange-100', row: 'bg-orange-50', accent: 'border-orange-300' },
    { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', header: 'bg-green-100', row: 'bg-green-50', accent: 'border-green-300' },
];

interface PublicScheduleTabProps {
    activeEvent: EventData;
}

const PublicScheduleTab: React.FC<PublicScheduleTabProps> = ({ activeEvent }) => {
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        temple: false
    });

    const toggleCollapse = (id: string) => {
        setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };
    
    // Helper to render Road Sign Table 
    const renderRoadSignTable = (type: 'outbound' | 'return', items: RoadSignItem[], theme: any = { border: 'border-green-500', text: 'text-green-900', header: 'bg-green-100' }) => {
        if (!items || items.length === 0) return null;
        return (
            <div className={`border ${theme.border} rounded-lg overflow-hidden bg-white shadow-sm mb-4`}>
                <div className={`p-2 font-bold text-sm ${theme.text} border-b ${theme.border} ${theme.header} flex justify-between items-center`}>
                    <span>{type === 'outbound' ? '去程' : '回程'}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead className={`${theme.text} border-b ${theme.border} ${theme.bg}`}>
                            <tr>
                                <th className={`p-2 w-10 border ${theme.border} text-center sticky left-0 z-20 ${theme.bg}`}>編號</th>
                                <th className={`p-2 border ${theme.border} min-w-[200px]`}>進度</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.border.replace('border-', 'divide-')}`}>
                            {(Array.isArray(items) ? items : []).map((sign, sIdx) => {
                                const isChecked = !!sign.checked;
                                const rowBg = isChecked ? 'bg-gray-100 text-gray-400' : 'bg-yellow-50 text-black';
                                const textClass = isChecked ? 'text-gray-400 line-through' : 'text-black';

                                return (
                                    <tr key={sIdx} className={`hover:opacity-80 transition-colors ${rowBg}`}>
                                        <td className={`p-2 border ${theme.border} text-center w-10 sticky left-0 z-10 ${rowBg} ${textClass}`}>
                                            {sIdx + 1}
                                        </td>
                                        <td className={`p-2 border ${theme.border} whitespace-normal text-xs ${textClass}`}>
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
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Temple Schedule - Red Theme */}
            {activeEvent.templeConfig?.isPublished && activeEvent.templeConfig.items && activeEvent.templeConfig.items.length > 0 && (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-500 overflow-hidden">
                    <div className="p-4 bg-red-100 border-b border-red-500 flex justify-between items-center">
                        <div className="flex flex-row items-center mb-0">
                            <button onClick={() => toggleCollapse('temple')} className="mr-2 text-red-900">
                                {collapsedSections['temple'] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <h3 className="font-bold text-red-900 text-base text-left flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-red-900" /> 
                                {activeEvent.templeConfig.title || '教儀安排'}
                            </h3>
                            {!collapsedSections['temple'] && (
                                <div className="text-xs text-red-900 font-bold ml-4">
                                    {activeEvent.templeConfig.startTime || ''} ~ {activeEvent.templeConfig.endTime || ''}
                                </div>
                            )}
                        </div>
                    </div>
                    {!collapsedSections['temple'] && (
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-sm text-center min-w-[600px] border-collapse">
                                <thead className="border-b border-red-500 text-red-900 font-bold bg-red-50">
                                    <tr>
                                        <th className="p-3 sticky left-0 z-20 bg-red-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] whitespace-nowrap">場次</th>
                                        <th className="p-3">開始</th>
                                        <th className="p-3">結束</th>
                                        <th className="p-3 w-16">需時</th>
                                        <th className="p-3 w-1/3">備註</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-200">
                                    {(Array.isArray(activeEvent.templeConfig.items) ? activeEvent.templeConfig.items : []).map((item, idx) => (
                                        <tr key={idx} className="bg-white hover:bg-red-50 transition-colors">
                                            <td className="p-3 sticky left-0 z-10 bg-white font-bold text-red-900 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] whitespace-nowrap text-sm">{item.stopCode || '-'}</td>
                                            <td className="p-3 font-medium text-sm">{item.arrivalTime}</td>
                                            <td className="p-3 font-medium text-sm">{item.departureTime}</td>
                                            <td className="p-3 font-medium text-sm">{item.stay ? `${item.stay}分` : '-'}</td>
                                            <td className="p-3 text-left text-gray-600 font-medium text-sm">{item.address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Bus Routes & Road Signs - Rainbow Themes */}
            {(activeEvent.busConfigs || []).length > 0 && (
                <div className="space-y-6">
                    {(activeEvent.busConfigs || []).map((busConfig, idx) => {
                        const busName = busConfig.name;
                        const route = (activeEvent.busRoutes?.[busName] as any) || { outbound: [], returnTrip: [] };
                        const showOutbound = route.isOutboundPublished;
                        const showReturn = route.isReturnPublished;
                        
                        if (!showOutbound && !showReturn) return null;

                        const busTheme = BUS_THEMES[idx % BUS_THEMES.length];
                        const signTheme = SIGN_THEMES[idx % SIGN_THEMES.length];
                        const isBusCollapsed = collapsedSections[`bus-${busName}`];
                        const isSignCollapsed = collapsedSections[`sign-${busName}`];

                        return (
                            <div key={busName} className="space-y-4">
                                {/* 行程安排 */}
                                <div className={`${busTheme.bg} rounded-xl shadow-sm border ${busTheme.border} overflow-hidden`}>
                                    <div className={`p-4 ${busTheme.header} border-b ${busTheme.border} flex flex-col gap-2`}>
                                        <h3 className={`font-bold ${busTheme.text} text-base text-left flex items-center`}>
                                            <button onClick={() => toggleCollapse(`bus-${busName}`)} className="mr-1">
                                                {isBusCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                            </button>
                                            <Bus className="w-5 h-5 mr-2" /> 
                                            行程安排 {busName}
                                        </h3>
                                        {(busConfig.company || busConfig.licensePlate || busConfig.driverName1) && (
                                            <div className={`text-xs font-bold ${busTheme.text} opacity-90 pl-11 flex flex-wrap gap-x-4 gap-y-1`}>
                                                {busConfig.company && <span>公司: {busConfig.company}</span>}
                                                {busConfig.licensePlate && <span>車號: {busConfig.licensePlate}</span>}
                                                {busConfig.driverName1 && <span>司機1: {busConfig.driverName1} ({busConfig.driverPhone1})</span>}
                                                {busConfig.driverName2 && <span>司機2: {busConfig.driverName2} ({busConfig.driverPhone2})</span>}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {!isBusCollapsed && (
                                        <div className="p-4 flex flex-col gap-6">
                                            {/* Outbound */}
                                            {showOutbound && route.outbound && route.outbound.length > 0 && (
                                                <div>
                                                                <h4 className={`font-bold text-sm ${busTheme.text} mb-2 border-b ${busTheme.accent} pb-1`}>
                                                                    去程: {route.outboundTitle || '前往聖殿'}
                                                                    <span className="text-xs font-normal ml-2 opacity-80">
                                                                        ({route.outboundStartTime || ''} ~ {route.outboundEndTime || ''})
                                                                    </span>
                                                                </h4>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm text-center border-collapse table-fixed min-w-[800px]">
                                                                        <thead className={`${busTheme.text} border-b ${busTheme.accent} ${busTheme.header}`}>
                                                                            <tr>
                                                                                <th className={`p-2 border ${busTheme.accent} w-14`}>站號</th>
                                                                                <th className={`p-2 border ${busTheme.accent} w-20`}>到達</th>
                                                                                <th className={`p-2 border ${busTheme.accent} w-20`}>離開</th>
                                                                                <th className={`p-2 border ${busTheme.accent} min-w-[200px]`}>地點</th>
                                                                                <th className={`p-2 border ${busTheme.accent} min-w-[300px]`}>地址</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className={`divide-y ${busTheme.border.replace('border-', 'divide-')}`}>
                                                                            {(Array.isArray(route.outbound) ? route.outbound : []).map((item: any, iIdx: number) => {
                                                                                const rowBg = iIdx % 2 !== 0 ? busTheme.row : 'bg-white';
                                                                                return (
                                                                                <tr key={iIdx} className={`${rowBg} hover:opacity-80`}>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.stopCode || '-'}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.arrivalTime}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.departureTime}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} ${busTheme.text} text-left min-w-[200px] ${rowBg}`}>{item.location}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} ${busTheme.text} text-left text-sm min-w-[300px] ${rowBg}`}>{item.address}</td>
                                                                                </tr>
                                                                            )})}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                </div>
                                            )}

                                            {/* Return */}
                                            {showReturn && route.returnTrip && route.returnTrip.length > 0 && (
                                                <div>
                                                                <h4 className={`font-bold text-sm ${busTheme.text} mb-2 border-b ${busTheme.accent} pb-1`}>
                                                                    回程: {route.returnTitle || '返回教堂'}
                                                                    <span className="text-xs font-normal ml-2 opacity-80">
                                                                        ({route.returnStartTime || ''} ~ {route.returnEndTime || ''})
                                                                    </span>
                                                                </h4>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm text-center border-collapse table-fixed min-w-[800px]">
                                                                        <thead className={`${busTheme.text} border-b ${busTheme.accent} ${busTheme.header}`}>
                                                                            <tr>
                                                                                <th className={`p-2 border ${busTheme.accent} w-14`}>站號</th>
                                                                                <th className={`p-2 border ${busTheme.accent} w-20`}>到達</th>
                                                                                <th className={`p-2 border ${busTheme.accent} w-20`}>離開</th>
                                                                                <th className={`p-2 border ${busTheme.accent} min-w-[200px]`}>地點</th>
                                                                                <th className={`p-2 border ${busTheme.accent} min-w-[300px]`}>地址</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className={`divide-y ${busTheme.border.replace('border-', 'divide-')}`}>
                                                                            {(Array.isArray(route.returnTrip) ? route.returnTrip : []).map((item: any, iIdx: number) => {
                                                                                const rowBg = iIdx % 2 !== 0 ? busTheme.row : 'bg-white';
                                                                                return (
                                                                                <tr key={iIdx} className={`${rowBg} hover:opacity-80`}>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.stopCode || '-'}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.arrivalTime}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} font-bold ${busTheme.text} ${rowBg}`}>{item.departureTime}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} ${busTheme.text} text-left min-w-[200px] ${rowBg}`}>{item.location}</td>
                                                                                    <td className={`p-2 border ${busTheme.accent} ${busTheme.text} text-left text-sm min-w-[300px] ${rowBg}`}>{item.address}</td>
                                                                                </tr>
                                                                            )})}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 路標提醒 (Per Bus) */}
                                {((route.isOutboundRoadSignsPublished && route.outboundRoadSigns?.length > 0) || (route.isReturnRoadSignsPublished && route.returnRoadSigns?.length > 0)) && (
                                    <div className={`${signTheme.bg} rounded-xl shadow-sm border ${signTheme.border} overflow-hidden`}>
                                        <div className={`p-4 ${signTheme.header} border-b ${signTheme.border} flex justify-between items-center`}>
                                            <h3 className={`font-bold ${signTheme.text} text-base text-left flex items-center`}>
                                                <button onClick={() => toggleCollapse(`sign-${busName}`)} className="mr-2">
                                                    {isSignCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                                </button>
                                                <MapIcon className="w-5 h-5 mr-2" /> 路標提醒 {busName}
                                            </h3>
                                        </div>
                                        {!isSignCollapsed && (
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {route.isOutboundRoadSignsPublished && renderRoadSignTable('outbound', route.outboundRoadSigns, signTheme)}
                                                {route.isReturnRoadSignsPublished && renderRoadSignTable('return', route.returnRoadSigns, signTheme)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Global Road Signs Display - Green Theme with Split Logic */}
            {showRoadSigns && (
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-500 overflow-hidden">
                    <div className="p-4 bg-green-100 border-b border-green-500 flex justify-between items-center">
                        <h3 className="font-bold text-green-900 text-base text-left flex items-center">
                            <button onClick={() => toggleCollapse('globalSigns')} className="mr-2 text-green-900">
                                {collapsedSections['globalSigns'] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <MapIcon className="w-5 h-5 mr-2 text-green-700" /> 路標提醒 (全體)
                        </h3>
                    </div>
                    {!collapsedSections['globalSigns'] && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {isOutboundPublished && globalRoadSigns!.outboundItems && globalRoadSigns!.outboundItems.length > 0 && (
                                <div className="mb-4">
                                    {renderRoadSignTable('outbound', globalRoadSigns!.outboundItems)}
                                </div>
                            )}
                            {isReturnPublished && ((globalRoadSigns!.returnItems && globalRoadSigns!.returnItems.length > 0) || (globalRoadSigns!.items && globalRoadSigns!.items.length > 0 && !globalRoadSigns!.outboundItems)) ? (
                                <div>
                                    {renderRoadSignTable('return', globalRoadSigns!.returnItems || globalRoadSigns!.items)}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {/* Travel Tips Section - Cyan/Sky Theme */}
            <div className="bg-cyan-50 rounded-xl shadow-sm border border-cyan-500 overflow-hidden">
                <div className="p-4 bg-cyan-100 border-b border-cyan-500">
                    <h3 className="font-bold text-cyan-900 text-base text-left flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-cyan-700" /> 旅行叮嚀
                    </h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 1. Reminder */}
                    <div className="bg-white p-4 rounded-lg border border-cyan-200 shadow-sm flex items-start">
                        <div className="bg-cyan-100 p-2 rounded-full mr-4 shrink-0">
                            <CheckSquare className="w-6 h-6 text-cyan-700" />
                        </div>
                        <div>
                            <h4 className="font-bold text-cyan-900 mb-1">必備物品檢查</h4>
                            <ul className="text-sm text-gray-700 space-y-1 list-disc pl-4">
                                <li className="font-bold text-red-600">有效聖殿推薦書 (最重要!)</li>
                                <li>個人身分證 / 健保卡</li>
                                <li>聖殿服裝 (若有參與教儀)</li>
                                <li>個人常備藥品</li>
                            </ul>
                        </div>
                    </div>

                    {/* 2. Weather & Clothing */}
                    <div className="bg-white p-4 rounded-lg border border-cyan-200 shadow-sm">
                        <div className="flex items-center mb-3 border-b border-cyan-100 pb-2">
                            {weather.condition === 'rainy' ? <CloudRain className="w-5 h-5 text-blue-500 mr-2" /> : <Sun className="w-5 h-5 text-orange-500 mr-2" />}
                            <h4 className="font-bold text-cyan-900">台北市大安區 (聖殿) 天氣預報</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center mb-4">
                            <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                <div className="text-xs text-gray-500">氣溫</div>
                                <div className="font-bold text-lg text-gray-800">{weather.temp_low}°C - {weather.temp_high}°C</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                <div className="text-xs text-gray-500">降雨機率</div>
                                <div className="font-bold text-lg text-blue-600">{weather.rainProb}%</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start">
                                <Shirt className="w-4 h-4 text-cyan-600 mr-2 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-700 text-justify">{getClothingAdvice()}</p>
                            </div>
                            <div className="flex items-start">
                                <Umbrella className="w-4 h-4 text-blue-600 mr-2 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-700 text-justify">{getRainAdvice()}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PublicScheduleTab;
