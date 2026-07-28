import React, { useState } from 'react';
import { 
    ChevronDown, ChevronUp, Settings, TrendingUp, Layers, Clock, 
    Play, Plus, Trash2, ShieldCheck, Database, Zap, RefreshCw,
    UserPlus, FastForward, CheckCircle, Info, Power, Bus, Star
} from 'lucide-react';
import { EventData, RegistrationEngineConfig, GlobalSettings } from '../../types';
import { useI18n } from '../../src/contexts/LanguageContext';

interface RegistrationEngineSettingsProps {
    activeEvent: EventData;
    settings: GlobalSettings;
    onUpdateEvent: (e: EventData) => void;
    colorIndex?: number;
}

const RegistrationEngineSettings: React.FC<RegistrationEngineSettingsProps> = ({ activeEvent, settings, onUpdateEvent, colorIndex = 0 }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(true);
    const [sandboxMode, setSandboxMode] = useState(false);

    const rainbowColors = [
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', accent: 'bg-red-100', button: 'bg-red-600 hover:bg-red-700', icon: 'text-red-600' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', accent: 'bg-orange-100', button: 'bg-orange-600 hover:bg-orange-700', icon: 'text-orange-600' },
        { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', accent: 'bg-yellow-100', button: 'bg-yellow-600 hover:bg-yellow-700', icon: 'text-yellow-600' },
        { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', accent: 'bg-green-100', button: 'bg-green-600 hover:bg-green-700', icon: 'text-green-600' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', accent: 'bg-blue-100', button: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-600' },
        { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', accent: 'bg-indigo-100', button: 'bg-indigo-600 hover:bg-indigo-700', icon: 'text-indigo-600' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', accent: 'bg-purple-100', button: 'bg-purple-600 hover:bg-purple-700', icon: 'text-purple-600' },
    ];

    const getRainbow = (idx: number) => rainbowColors[idx % rainbowColors.length];
    const mainColor = getRainbow(colorIndex);

    const config = activeEvent.engineConfig || {
        enabled: false,
        weights: { unit: 40, identity: 30, trip: 20, special: 10 },
        groupGate: { 
            maxGroups: 1, 
            minCapacity: 30, 
            maxCapacity: 42, 
            progressiveOpening: true, 
            backtrackLogic: true,
            decisionCondition: 'minCapacityOrAmount',
            minAmount: 0
        },
        timeNodes: {
            regStartTime: '',
            groupFormationDeadline: '',
            regularPaymentStartTime: '',
            regularPaymentDeadline: '',
            waitlistPaymentStartTime: '',
            waitlistPaymentDeadline: '',
            cancellationDeadline: '',
            regEndTime: ''
        },
        priorityMappings: {
            unitScores: {},
            identityScores: {},
            tripScores: {},
            specialScores: {}
        }
    };

    // V600: Safety check for nested objects
    if (!config.priorityMappings) {
        config.priorityMappings = {
            unitScores: {},
            identityScores: {},
            tripScores: {},
            specialScores: {}
        };
    }

    if (!config.groupGate.decisionCondition) {
        config.groupGate.decisionCondition = 'minCapacityOrAmount';
    }

    const updateConfig = (newConfig: Partial<RegistrationEngineConfig>) => {
        onUpdateEvent({
            ...activeEvent,
            engineConfig: { ...config, ...newConfig }
        });
    };

    const handleWeightChange = (key: keyof typeof config.weights, val: string) => {
        const num = parseInt(val) || 0;
        updateConfig({
            weights: { ...config.weights, [key]: num }
        });
    };

    const handleGroupGateChange = (key: keyof typeof config.groupGate, val: any) => {
        updateConfig({
            groupGate: { ...config.groupGate, [key]: val }
        });
    };

    const handleTimeNodeChange = (key: keyof typeof config.timeNodes, val: any) => {
        updateConfig({
            timeNodes: { ...config.timeNodes, [key]: val }
        });
    };

    return (
        <div className="bg-white rounded border border-slate-200 shadow-sm mb-8 overflow-hidden animate-fade-in relative">
            {/* Title Row */}
            <div 
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 rounded">
                        <TrendingUp className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center">
                            {t('stake.registration.settings.engine_title', '報名細項設定')}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registration Detail Settings</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${config.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {config.enabled ? '● 引擎運行中' : '○ 已停用'}
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 space-y-8 animate-slide-up">
                    {/* Control Bar */}
                    <div className="flex justify-end border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => updateConfig({ enabled: !config.enabled })}
                                className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${config.enabled ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                            >
                                <Power className="w-4 h-4" />
                                {config.enabled ? t('common.button.disable', '停用引擎') : t('common.button.enable', '啟用引擎')}
                            </button>
                            <button 
                                onClick={() => setSandboxMode(!sandboxMode)}
                                className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${sandboxMode ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${sandboxMode ? 'animate-spin' : ''}`} />
                                {sandboxMode ? '正在測試沙盒' : '啟動沙盒測試'}
                            </button>
                        </div>
                    </div>

                    {/* Engine Settings Sections */}
                    {!sandboxMode ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* 1. Progressive Group Gate */}
                            <div className="bg-slate-50 p-6 rounded border border-slate-200 shadow-sm space-y-6">
                                <h4 className="font-bold text-slate-900 flex items-center text-md gap-2 border-b border-slate-200 pb-3">
                                    <Layers className="w-5 h-5 text-sky-600" /> 1. 數量與漸進式開團指標
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">開團決定條件</label>
                                        <select 
                                            value={config.groupGate.decisionCondition}
                                            onChange={(e) => handleGroupGateChange('decisionCondition', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all"
                                        >
                                            <option value="minCapacity">達到最低人數</option>
                                            <option value="minAmount">達到最低金額</option>
                                            <option value="minCapacityOrAmount">達到最低人數或最低金額</option>
                                            <option value="minCapacityAndAmount">達到最低人數及最低金額</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">報名團數上限</label>
                                            <input 
                                                type="number" 
                                                value={config.groupGate.maxGroups}
                                                onChange={(e) => handleGroupGateChange('maxGroups', parseInt(e.target.value) || 1)}
                                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">單團最少人數</label>
                                            <input 
                                                type="number" 
                                                value={config.groupGate.minCapacity}
                                                onChange={(e) => handleGroupGateChange('minCapacity', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">單團最多人數</label>
                                            <input 
                                                type="number" 
                                                value={config.groupGate.maxCapacity}
                                                onChange={(e) => handleGroupGateChange('maxCapacity', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">單團最低金額</label>
                                            <input 
                                                type="number" 
                                                value={config.groupGate.minAmount || 0}
                                                onChange={(e) => handleGroupGateChange('minAmount', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={config.groupGate.progressiveOpening}
                                            onChange={(e) => handleGroupGateChange('progressiveOpening', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-sky-700 transition-colors">漸進式自動開團 (線性遞進)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={config.groupGate.backtrackLogic}
                                            onChange={(e) => handleGroupGateChange('backtrackLogic', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-sky-700 transition-colors">回溯遞補邏輯 (名額釋回優先權)</span>
                                    </label>
                                </div>
                            </div>

                            {/* 2. 4D Priority Weights */}
                            <div className="bg-slate-50 p-6 rounded border border-slate-200 shadow-sm space-y-6">
                                <h4 className="font-bold text-slate-900 flex items-center text-md gap-2 border-b border-slate-200 pb-3">
                                    <Database className="w-5 h-5 text-sky-600" /> 2. 四維交叉審核權重
                                </h4>
                                <div className="space-y-6 pt-2">
                                    {[
                                        { key: 'unit', label: '單位優先 (W1)', weight: config.weights.unit },
                                        { key: 'identity', label: '身份優先 (W2)', weight: config.weights.identity },
                                        { key: 'trip', label: '行程優先 (W3)', weight: config.weights.trip },
                                        { key: 'special', label: '特別優先 (W4)', weight: config.weights.special }
                                    ].map((w) => (
                                        <div key={w.key} className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-medium text-slate-600 shrink-0 w-24">{w.label}</span>
                                            <div className="flex-1 flex items-center gap-4">
                                                <input 
                                                    type="range" min="0" max="100" 
                                                    value={w.weight}
                                                    onChange={(e) => handleWeightChange(w.key as any, e.target.value)}
                                                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-600"
                                                />
                                                <span className="w-10 text-right font-bold text-sky-600 text-sm">{w.weight}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-sky-50 rounded text-[11px] font-medium text-sky-700 border border-sky-100 flex gap-2">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>總分為 100 滿分。系統依加權得分對報名者進行排序，正備取轉換將完全依據此得分。</span>
                                </div>
                            </div>

                            {/* 3. Seven Time Nodes */}
                            <div className="lg:col-span-2 bg-slate-50 p-6 rounded border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                    <h4 className="font-bold text-slate-900 flex items-center text-md gap-2">
                                        <Clock className="w-5 h-5 text-sky-600" /> 3. 時間節點
                                    </h4>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">前台顯示</span>
                                            <button 
                                                onClick={() => handleTimeNodeChange('showOnPublic', !config.timeNodes.showOnPublic)}
                                                className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center ${config.timeNodes.showOnPublic ? 'bg-sky-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${config.timeNodes.showOnPublic ? 'ml-5' : 'ml-0'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">年份顯示</span>
                                            <button 
                                                onClick={() => handleTimeNodeChange('showYear', !config.timeNodes.showYear)}
                                                className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center ${config.timeNodes.showYear ? 'bg-sky-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${config.timeNodes.showYear ? 'ml-5' : 'ml-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                                    <TimeNodeField 
                                        label="報名開始時間" 
                                        value={config.timeNodes.regStartTime} 
                                        onChange={(val) => handleTimeNodeChange('regStartTime', val)}
                                    />
                                    <TimeNodeField 
                                        label="成團截止時間" 
                                        value={config.timeNodes.groupFormationDeadline} 
                                        onChange={(val) => handleTimeNodeChange('groupFormationDeadline', val)}
                                    />
                                    <TimeNodeField 
                                        label="正取繳費開始" 
                                        value={config.timeNodes.regularPaymentStartTime} 
                                        onChange={(val) => handleTimeNodeChange('regularPaymentStartTime', val)}
                                    />
                                    <TimeNodeField 
                                        label="正取繳費截止" 
                                        value={config.timeNodes.regularPaymentDeadline} 
                                        onChange={(val) => handleTimeNodeChange('regularPaymentDeadline', val)}
                                    />
                                    <TimeNodeField 
                                        label="備取繳費開始" 
                                        value={config.timeNodes.waitlistPaymentStartTime} 
                                        onChange={(val) => handleTimeNodeChange('waitlistPaymentStartTime', val)}
                                    />
                                    <TimeNodeField 
                                        label="備取繳費截止" 
                                        value={config.timeNodes.waitlistPaymentDeadline} 
                                        onChange={(val) => handleTimeNodeChange('waitlistPaymentDeadline', val)}
                                    />
                                    <TimeNodeField 
                                        label="報名取消期限" 
                                        value={config.timeNodes.cancellationDeadline} 
                                        onChange={(val) => handleTimeNodeChange('cancellationDeadline', val)}
                                        hint="此日期為報名可取消的最後期限"
                                    />
                                    <TimeNodeField 
                                        label="報名結束時間" 
                                        value={config.timeNodes.regEndTime} 
                                        onChange={(val) => handleTimeNodeChange('regEndTime', val)}
                                    />
                                </div>
                            </div>

                            {/* 4. Priority Score Mappings (4D Breakdown) */}
                            <div className="lg:col-span-2 space-y-6">
                                <h4 className="font-bold text-slate-900 flex items-center text-md gap-2 border-b border-slate-200 pb-3">
                                    <ShieldCheck className="w-5 h-5 text-sky-600" /> 4. 四維優先權量化設定
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Unit Priority */}
                                    <PriorityMappingCard 
                                        title="單位優先分 (Unit)" 
                                        icon={Layers} 
                                        color="sky"
                                        items={Array.from(new Map((settings.billingConfig?.units || []).map(u => [u.shortName, u])).values()).map(u => ({ id: u.shortName, label: u.fullName }))}
                                        scores={config.priorityMappings.unitScores}
                                        onUpdate={(id, val) => {
                                            updateConfig({
                                                priorityMappings: {
                                                    ...config.priorityMappings,
                                                    unitScores: { ...config.priorityMappings.unitScores, [id]: val }
                                                }
                                            });
                                        }}
                                    />

                                    {/* Identity Priority */}
                                    <PriorityMappingCard 
                                        title="身份優先分 (Identity)" 
                                        icon={UserPlus} 
                                        color="indigo"
                                        items={Array.from(new Set(settings.billingConfig?.identityPricings.map(ip => ip.identity) || [])).map(id => ({ id, label: id }))}
                                        scores={config.priorityMappings.identityScores}
                                        onUpdate={(id, val) => {
                                            updateConfig({
                                                priorityMappings: {
                                                    ...config.priorityMappings,
                                                    identityScores: { ...config.priorityMappings.identityScores, [id]: val }
                                                }
                                            });
                                        }}
                                    />

                                    {/* Trip Priority */}
                                    <PriorityMappingCard 
                                        title="行程優先分 (Trip)" 
                                        icon={Bus} 
                                        color="emerald"
                                        items={Array.from(new Set(settings.billingConfig?.tripPricings.map(tp => tp.trip) || [])).map(id => ({ id, label: id }))}
                                        scores={config.priorityMappings.tripScores}
                                        onUpdate={(id, val) => {
                                            updateConfig({
                                                priorityMappings: {
                                                    ...config.priorityMappings,
                                                    tripScores: { ...config.priorityMappings.tripScores, [id]: val }
                                                }
                                            });
                                        }}
                                    />

                                    {/* Special Priority */}
                                    <PriorityMappingCard 
                                        title="特別優先分 (Special)" 
                                        icon={Star} 
                                        color="amber"
                                        items={Array.from(new Map((settings.billingConfig?.specialPromos || []).map(sp => [sp.id, sp])).values()).map(sp => ({ id: sp.id, label: sp.name }))}
                                        scores={config.priorityMappings.specialScores}
                                        onUpdate={(id, val) => {
                                            updateConfig({
                                                priorityMappings: {
                                                    ...config.priorityMappings,
                                                    specialScores: { ...config.priorityMappings.specialScores, [id]: val }
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Sandbox Mode Content */
                        <div className="space-y-6 animate-slide-up">
                            <div className="bg-amber-50 p-4 rounded border border-amber-200 flex items-start gap-3">
                                <div className="p-1 bg-amber-100 rounded">
                                    <Info className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-bold text-amber-900 flex items-center gap-2">
                                        沙盒測試模式 (Simulation Sandbox)
                                    </p>
                                    <p className="text-amber-700 font-medium">在此模式下，您可以安全地模擬高併發報名、自動開團與遞補邏輯，不會影響正式資料。</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Controller */}
                                <div className="lg:col-span-1 bg-white p-6 rounded border border-slate-200 shadow-sm space-y-6">
                                    <h5 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                                        <RefreshCw className="w-4 h-4 text-sky-600" /> Sandbox Controller
                                    </h5>
                                    
                                    <div className="space-y-4">
                                        <button className="w-full py-2.5 px-4 bg-slate-800 text-white rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-sm">
                                            <FastForward className="w-4 h-4" /> 一鍵複製環境與權重
                                        </button>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">虛擬報名者數量</label>
                                            <div className="flex gap-2">
                                                <button className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold hover:bg-slate-100 transition-colors">100</button>
                                                <button className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold hover:bg-slate-100 transition-colors">300</button>
                                                <button className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold hover:bg-slate-100 transition-colors">500</button>
                                            </div>
                                            <button className="w-full py-2.5 bg-emerald-600 text-white rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-sm">
                                                <UserPlus className="w-4 h-4" /> 灌入虛擬數據 (Mass Enroll)
                                            </button>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 space-y-3">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Traveler (加速時間軸)</label>
                                            <input type="range" className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-600" />
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                <span>Start</span>
                                                <span>Deadline</span>
                                                <span>Payment</span>
                                                <span>End</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Monitor / Results */}
                                <div className="lg:col-span-2 bg-slate-900 text-slate-300 p-6 rounded shadow-inner font-mono text-[11px] space-y-4 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Zap className="w-24 h-24 text-yellow-400" />
                                    </div>
                                    <h5 className="text-sky-400 font-bold flex items-center gap-2 mb-4 uppercase tracking-widest">
                                        <Play className="w-4 h-4" /> ENGINE_RUNTIME_LOG
                                    </h5>
                                    <div className="space-y-1.5 h-[280px] overflow-y-auto custom-scrollbar pr-2 leading-relaxed">
                                        <p className="text-emerald-400 opacity-80">[02:01:45] SYSTEM: Initializing Sandbox...</p>
                                        <p className="text-sky-400 opacity-80">[02:01:45] GATE: Group 1 status: OPEN (Capacity: 0/42)</p>
                                        <p className="text-sky-400 opacity-80">[02:01:45] GATE: Group 2 status: LOCKED</p>
                                        <p className="text-slate-500">[02:01:48] EVENT: Incoming registration from Unit:X (Identity:VVIP)</p>
                                        <p className="text-amber-400 font-medium">[02:01:48] SCORE: Calc result S=95. Assigned to Group 1.</p>
                                        <p className="text-slate-500">[02:01:52] EVENT: Incoming registration from Unit:Y (Identity:REGULAR)</p>
                                        <p className="text-amber-400 font-medium">[02:01:52] SCORE: Calc result S=45. Assigned to Group 1.</p>
                                        <p className="text-indigo-400 font-bold">[02:02:05] TRIGGER: Group 1 REACHED MAX (42/42). AUTO-UNLOCKING GROUP 2...</p>
                                        <p className="text-emerald-400 opacity-80">[02:02:06] GATE: Group 2 status: OPEN (Capacity: 0/42)</p>
                                        <p className="text-slate-600 italic">... waiting for simulation input ...</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                                        <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-[9px] font-bold transition-all">WEBHOOK: PAY_SUCCESS</button>
                                        <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-[9px] font-bold transition-all">WEBHOOK: PAY_TIMEOUT</button>
                                        <button className="px-3 py-1 bg-rose-900/30 text-rose-400 rounded border border-rose-900/50 text-[9px] font-bold transition-all">RESET_SANDBOX</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TimeNodeField = ({ label, value, onChange, hint }: { label: string, value: string, onChange: (val: string) => void, hint?: string }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <input 
            type="datetime-local" 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded text-[11px] font-medium focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-slate-700 transition-all"
        />
        {hint && <p className="text-[10px] font-medium text-slate-400 italic mt-1">{hint}</p>}
    </div>
);

const PriorityMappingCard = ({ title, icon: Icon, color, items, scores, onUpdate }: { 
    title: string, 
    icon: any, 
    color: string,
    items: { id: string, label: string }[],
    scores: Record<string, number>,
    onUpdate: (id: string, val: number) => void
}) => {
    const colorClasses: Record<string, string> = {
        sky: 'text-sky-600 bg-sky-50 border-sky-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
    };
    
    return (
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
            <h5 className={`font-bold flex items-center gap-2 text-xs pb-3 border-b border-slate-100 ${colorClasses[color]?.split(' ')[0]}`}>
                <Icon className="w-4 h-4" /> {title}
            </h5>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {items.length > 0 ? items.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0">
                        <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={scores[item.id] || 0}
                                onChange={(e) => onUpdate(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 p-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-right outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all"
                            />
                            <span className="text-[10px] font-bold text-slate-300">pts</span>
                        </div>
                    </div>
                )) : (
                    <div className="py-6 text-center text-[10px] font-medium text-slate-400 italic">
                        無設定資料
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationEngineSettings;
