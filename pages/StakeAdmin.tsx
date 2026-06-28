
import React, { useState, useEffect, useMemo } from 'react';
import { EventData, Registration, GlobalSettings, BlacklistItem, PersonalInfo, User } from '../types';
import { subscribeToEvents, subscribeToRegistrations, subscribeToSettings, subscribeToPersonalInfo, setCurrentEvent, getSettings, subscribeToBlacklist } from '../services/sheetService';
import { 
    Calendar, ClipboardList, Bus, BookOpen, Coins, Users, Badge, MapPin, 
    Settings, CheckCircle, List, Contact, Shield, ShieldCheck, 
    FileText, Landmark, ChevronDown, ChevronUp, UserCheck, 
    History, HelpCircle, FileSearch, Star, CreditCard, RefreshCw, Trash2,
    LayoutDashboard, Users2, Activity, ClipboardCheck, Truck, Wallet, Info,
    FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

// Import refactored components
import EventsTab from '../components/stake/EventsTab';
import BackupTab from '../components/stake/BackupTab';
import ProgressTab from '../components/stake/ProgressTab';
import RegistrationTab from '../components/stake/RegistrationTab'; 
import BookingTab from '../components/stake/BookingTab';
import TempleTab from '../components/stake/TempleTab';
import FeeTab from '../components/stake/FeeTab';
import AssignmentTab from '../components/stake/AssignmentTab';
import StaffTab from '../components/stake/StaffTab';
import RouteTab from '../components/stake/RouteTab';
import AnnouncementTab from '../components/stake/AnnouncementTab';
import FeeConfigTab from '../components/stake/FeeConfigTab';
import CommTab from '../components/stake/CommTab';
import PersonalInfoTab from '../components/stake/PersonalInfoTab';
import RepresentativesTab from '../components/stake/RepresentativesTab';
import RestrictionsTab from '../components/stake/RestrictionsTab';
import InsuranceTab from '../components/stake/InsuranceTab';
import BusManagementTab from '../components/stake/BusManagementTab';
import StationDataBlock from '../components/stake/StationDataBlock';
import SpecializedRegistrationList from '../components/stake/SpecializedRegistrationList';
import RatingTab from '../components/stake/RatingTab';
import TextEditorTab from '../components/stake/TextEditorTab';
import HistoryTab from '../components/stake/HistoryTab';
import { RegStatus } from '../types';

interface StakeAdminProps {
    initialTab?: string;
    currentUser?: User;
}

// V410: Grouped Tab Definition
const TAB_GROUPS = [
    {
        id: 'admin',
        label: '行政管理',
        labelKey: 'admin_mgmt',
        icon: LayoutDashboard,
        tabs: [
            { id: 'announcement', label: '活動辦法', labelKey: 'rule_setup', icon: FileText },
            { id: 'textEditor', label: '文書處理', labelKey: 'text_editor', icon: FileEdit },
            { id: 'notice', label: '須知設定', labelKey: 'notice_setup', icon: Info },
            { id: 'tutorial', label: '使用教學', labelKey: 'tutorial_setup', icon: HelpCircle },
            { id: 'backup', label: '資料保護', labelKey: 'data_protection', icon: History },
            { id: 'history', label: '歷史記錄', labelKey: 'history_record', icon: History },
        ]
    },
    {
        id: 'hr',
        label: '人資管理',
        labelKey: 'hr_mgmt',
        icon: Users2,
        tabs: [
            { id: 'representatives', label: '代表名單', labelKey: 'rep_list', icon: UserCheck },
            { id: 'personalInfo', label: '成員名單', labelKey: 'member_list', icon: Contact },
            { id: 'comm', label: '同工名單', labelKey: 'staff_list', icon: Users },
        ]
    },
    {
        id: 'activity',
        label: '活動管理',
        labelKey: 'activity_mgmt',
        icon: Activity,
        tabs: [
            { id: 'events', label: '活動設定', labelKey: 'event_setup', icon: Calendar },
            { id: 'progress', label: '執行進度', labelKey: 'exec_progress', icon: ClipboardList },
        ]
    },
    {
        id: 'registration',
        label: '報名管理',
        labelKey: 'reg_mgmt',
        icon: ClipboardCheck,
        tabs: [
            { id: 'registration', label: '報名名單', labelKey: 'reg_list', icon: List },
            { id: 'insurance', label: '保險名單', labelKey: 'insurance_list', icon: ShieldCheck },
            { id: 'restrictions', label: '限制名單', labelKey: 'restriction_list', icon: Shield },
            { id: 'deleted', label: '刪除名單', labelKey: 'deleted_list', icon: Trash2 },
            { id: 'temple', label: '教儀座位', labelKey: 'ordinance_seat', icon: BookOpen },
            { id: 'staff', label: '服務委派', labelKey: 'service_assign', icon: Badge },
        ]
    },
    {
        id: 'transport',
        label: '交通管理',
        labelKey: 'transport_mgmt',
        icon: Truck,
        tabs: [
            { id: 'busManagement', label: '車行司機', labelKey: 'bus_driver', icon: Bus },
            { id: 'busStops', label: '停靠站點', labelKey: 'stop_point', icon: MapPin },
            { id: 'route', label: '行程安排', labelKey: 'route_plan', icon: MapPin },
            { id: 'booking', label: '訂車作業', labelKey: 'booking_record', icon: Bus },
            { id: 'assign', label: '車輛座位', labelKey: 'bus_seat', icon: Users },
            { id: 'rating', label: '評分設定', labelKey: 'rating_setup', icon: Star },
        ]
    },
    {
        id: 'finance',
        label: '財務管理',
        labelKey: 'finance_mgmt',
        icon: Wallet,
        tabs: [
            { id: 'feeConfig', label: '收費設定', labelKey: 'fee_setup', icon: Landmark },
            { id: 'fee', label: '收款對帳', labelKey: 'payment_audit', icon: Coins },
            { id: 'retention', label: '留用名單', labelKey: 'retention_list', icon: FileSearch },
            { id: 'refunds', label: '退款名單', labelKey: 'refund_list', icon: RefreshCw },
        ]
    }
];

const StakeAdmin: React.FC<StakeAdminProps> = ({ initialTab, currentUser }) => {
    const { t } = useTranslation();
    const isReadOnly = currentUser?.permission === 'read';
    const [activeTab, setActiveTab] = useState<string>(initialTab || 'events');
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['admin', 'hr', 'activity', 'registration', 'transport', 'finance']);
    const [isMenuExpanded, setIsMenuExpanded] = useState(true);
    
    const [events, setEvents] = useState<EventData[]>([]);
    const [currentEvent, setCurrentEventState] = useState<EventData | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
    const [personalInfo, setPersonalInfo] = useState<PersonalInfo[]>([]);
    const [settings, setSettingsState] = useState<GlobalSettings>(getSettings());
    const [msg, setMsg] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');
    const [editorContent2, setEditorContent2] = useState<string>('');

    // Rainbow Colors Definition - Unified Light Theme Style
    const groupRainbowSchemes = [
        { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-200', activeBg: 'bg-red-200', shadow: 'rgba(185, 28, 28, 0.4)' },
        { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200', activeBg: 'bg-orange-200', shadow: 'rgba(194, 65, 12, 0.4)' },
        { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-200', activeBg: 'bg-yellow-200', shadow: 'rgba(161, 98, 7, 0.4)' },
        { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-200', activeBg: 'bg-green-200', shadow: 'rgba(21, 128, 61, 0.4)' },
        { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200', activeBg: 'bg-blue-200', shadow: 'rgba(29, 78, 216, 0.4)' },
        { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-200', activeBg: 'bg-indigo-200', shadow: 'rgba(67, 56, 202, 0.4)' },
        { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-200', activeBg: 'bg-violet-200', shadow: 'rgba(109, 40, 217, 0.4)' },
    ];

    const tabRainbowSchemes = [
        { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-100', activeBg: 'bg-red-100', shadow: 'rgba(185, 28, 28, 0.2)' },
        { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-100', activeBg: 'bg-orange-100', shadow: 'rgba(194, 65, 12, 0.2)' },
        { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-100', activeBg: 'bg-yellow-100', shadow: 'rgba(161, 98, 7, 0.2)' },
        { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-100', activeBg: 'bg-green-100', shadow: 'rgba(21, 128, 61, 0.2)' },
        { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-100', activeBg: 'bg-blue-100', shadow: 'rgba(29, 78, 216, 0.2)' },
        { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-100', activeBg: 'bg-indigo-100', shadow: 'rgba(67, 56, 202, 0.2)' },
        { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-100', activeBg: 'bg-violet-100', shadow: 'rgba(109, 40, 217, 0.2)' },
    ];

    const getRainbowGroupClass = (idx: number, isExpanded: boolean) => {
        const s = groupRainbowSchemes[idx % groupRainbowSchemes.length];
        if (isExpanded) {
            return `${s.activeBg} ${s.text} border-2 border-white/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ring-4 ring-indigo-500/10 scale-105`;
        }
        return `${s.bg} ${s.text} ${s.border} border-2 hover:brightness-105 shadow-[4px_4px_0px_0px_${s.shadow}] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`;
    };

    const getRainbowTabClass = (idx: number, isActive: boolean) => {
        const s = tabRainbowSchemes[idx % tabRainbowSchemes.length];
        if (isActive) {
            return `${s.activeBg} ${s.text} border-2 border-white/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] scale-110 ring-4 ring-indigo-500/5`;
        }
        return `${s.bg} ${s.text} ${s.border} border-2 hover:bg-white shadow-[3px_3px_0px_0px_${s.shadow}] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all`;
    };

    useEffect(() => {
        let unsubRegs = () => {};
        const unsubSettings = subscribeToSettings((s) => setSettingsState(s));
        const unsubBlacklist = subscribeToBlacklist((list) => setBlacklist(list));
        const unsubPersonalInfo = subscribeToPersonalInfo((list) => setPersonalInfo(list));
        const unsubEvents = subscribeToEvents((allEvents) => {
            setEvents(allEvents);
            const active = allEvents.find(e => e.is_active);
            setCurrentEventState(active || null);
            if (active) {
                if (unsubRegs) unsubRegs();
                unsubRegs = subscribeToRegistrations(active.event_id, (r) => setRegistrations(r));
            } else {
                setRegistrations([]);
            }
        });
        return () => {
            unsubSettings();
            unsubBlacklist();
            unsubPersonalInfo();
            unsubEvents();
            unsubRegs();
        };
    }, []);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => 
            prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
        );
    };

    const Placeholder = ({ name }: { name: string }) => (
        <div id={`placeholder-${name}`} className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed">
            <Settings className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-black">{name}</h3>
            <p className="mt-2 font-bold">{t('stake.admin.developing', '功能開發中，請稍候...')}</p>
        </div>
    );

    const handleSetActiveEvent = (eventId: string) => {
        setCurrentEvent(eventId);
        setMsg(t('stake.admin.switch_event_msg', '已切換活動 (資料同步中...)'));
        setTimeout(() => setMsg(null), 3000);
    };

    const handleUpdateEvent = (updatedEvent: EventData) => {
        setCurrentEventState(updatedEvent);
    };

    const pushToEditor = (content: string) => {
        // Convert plain text newlines to HTML paragraphs for the editor
        const formattedContent = content.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>').join('');
        setEditorContent(prev => prev ? prev + formattedContent : formattedContent);
        setActiveTab('textEditor');
        setMsg(t('stake.admin.pushed_to_editor', '內容已傳送到文字編輯1'));
        setTimeout(() => setMsg(null), 2000);
    };

    if (!settings) return <div id="loading-spinner">{t('common.loading', 'Loading...')}</div>;

    return (
        <div id="stake-admin-root" className="bg-gray-50 flex flex-col relative w-full">
            {msg && (
                <div id="status-msg-toast" className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-8 py-4 rounded-xl shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border border-white/20">
                    <CheckCircle className="w-6 h-6 mr-3 text-green-400" />
                    <span className="font-black text-lg">{msg}</span>
                </div>
            )}

            {/* Top Fixed Menu Container (Unified height and padding) */}
            <div id="stake-admin-header" className="sticky top-0 z-[40] bg-white border-b-4 border-gray-100 shadow-md mt-0">
                <div className="max-w-7xl mx-auto">
                    <div 
                      id="stake-admin-menu-toggle"
                      className="flex items-center justify-between w-full h-16 p-4 px-4 md:px-8 cursor-pointer hover:bg-gray-50 transition-all font-sans"
                      onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white mr-5 shadow-lg shadow-indigo-100">
                          <Settings className="w-6 h-6" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">{t('stake.admin.title', '主辦行政管理')}</h1>
                          {currentEvent && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mt-1">{currentEvent.event_date}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{t('stake.admin.role_label', '管理員')}</span>
                            <span className="text-sm font-black text-gray-700">{currentUser?.name || t('stake.admin.default_user', "系統管理")}</span>
                        </div>
                        {isMenuExpanded ? <ChevronUp className="w-7 h-7 text-gray-300" /> : <ChevronDown className="w-7 h-7 text-gray-300" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isMenuExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-white border-t-2 border-gray-100 shadow-inner"
                        >
                          <div className="p-6 px-4 md:px-8 flex flex-wrap gap-4 overflow-x-auto no-scrollbar pb-8">
                            {TAB_GROUPS.map((group, gIdx) => (
                              <div key={group.id} className="flex flex-col gap-3 min-w-[155px]">
                                <button 
                                    id={`group-btn-${group.id}`}
                                    onClick={() => toggleGroup(group.id)}
                                    className={`flex items-center px-5 py-3 rounded-2xl text-[13px] font-black transition-all ${getRainbowGroupClass(gIdx, expandedGroups.includes(group.id))}`}
                                >
                                    <group.icon className="w-4 h-4 mr-2.5" />
                                    {t(`stake.admin.tabs.${group.labelKey}`, group.label)}
                                    {expandedGroups.includes(group.id) ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                                </button>
                                <AnimatePresence>
                                    {expandedGroups.includes(group.id) && (
                                        <motion.div 
                                            id={`group-content-${group.id}`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex flex-col gap-2.5 mt-1 pl-3"
                                        >
                                            {group.tabs.map((tab, tIdx) => (
                                                <button 
                                                    id={`tab-btn-${tab.id}`}
                                                    key={tab.id}
                                                    onClick={() => {
                                                        setActiveTab(tab.id);
                                                        setIsMenuExpanded(false);
                                                    }}
                                                    className={`flex items-center px-5 py-3 rounded-2xl text-[11px] font-black transition-all ${getRainbowTabClass(tIdx + gIdx * 3, activeTab === tab.id)}`}
                                                >
                                                    <tab.icon className="w-3.5 h-3.5 mr-2.5" />
                                                    {t(`stake.admin.tabs.${tab.labelKey}`, tab.label)}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content Area */}
            <div id="stake-admin-content" className={`flex-1 w-full overflow-auto ${isReadOnly ? 'relative' : ''}`}>
                {isReadOnly && (
                    <div id="read-only-banner" className="sticky top-0 z-50 bg-amber-50 border-b-2 border-amber-200 px-4 py-2 flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4 text-amber-700" />
                        <span className="text-amber-800 font-black text-sm">{t('stake.admin.read_only_mode', '唯讀模式 (Read-only Mode)：您目前僅有檢視權限，無法修改資料。')}</span>
                    </div>
                )}
                <main className={`animate-fade-in ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}>
                    {!currentEvent && !['events', 'announcement', 'feeConfig', 'notice', 'tutorial', 'backup', 'history'].includes(activeTab) ? (
                        <div id="no-event-selected-view" className="text-center py-24 text-gray-400 bg-white rounded-3xl border-4 border-dashed border-gray-200">
                            <Calendar className="w-20 h-20 mx-auto mb-6 opacity-20" />
                            <h3 className="text-2xl font-black text-gray-900">{t('stake.admin.no_event_selected', '尚未選擇活動')}</h3>
                            <p className="mt-4 font-bold text-lg">{t('stake.admin.please_select_event_hint', '請先到「活動設定」選擇一個進行中的活動。')}</p>
                        </div>
                    ) : (
                        <>
                            {/* 行政管理 */}
                            {activeTab === 'announcement' && <AnnouncementTab settings={settings} />}
                            {activeTab === 'textEditor' && <TextEditorTab content={editorContent} onContentChange={setEditorContent} content2={editorContent2} onContentChange2={setEditorContent2} />}
                            {activeTab === 'notice' && <Placeholder name={t('stake.admin.tabs.notice_setup', "須知設定")} />}
                            {activeTab === 'tutorial' && <Placeholder name={t('stake.admin.tabs.tutorial_setup', "使用教學")} />}
                            {activeTab === 'backup' && <BackupTab />}
                            {activeTab === 'history' && <HistoryTab events={events} onRefresh={() => {}} onPushToEditor={pushToEditor} />}

                            {/* 人資管理 */}
                            {activeTab === 'representatives' && <RepresentativesTab event_id={currentEvent ? currentEvent.event_id : ''} />}
                            {activeTab === 'personalInfo' && <PersonalInfoTab units={settings.units} registrations={registrations} currentEvent={currentEvent} />}
                            {activeTab === 'comm' && currentEvent && <CommTab currentEvent={currentEvent} settings={settings} onUpdateEvent={handleUpdateEvent} />}

                            {/* 活動管理 */}
                            {activeTab === 'events' && (
                                <EventsTab 
                                    events={events} 
                                    currentEvent={currentEvent} 
                                    onRefresh={() => {}} 
                                    onSetActive={handleSetActiveEvent} 
                                />
                            )}
                            {activeTab === 'progress' && currentEvent && <ProgressTab currentEvent={currentEvent} onUpdateEvent={handleUpdateEvent} />}

                            {/* 報名管理 */}
                            {activeTab === 'registration' && currentEvent && <RegistrationTab registrations={registrations} settings={settings} currentEventId={currentEvent.event_id} activeEvent={currentEvent} onRefresh={() => {}} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                            {activeTab === 'insurance' && currentEvent && <InsuranceTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                            {activeTab === 'restrictions' && currentEvent && <RestrictionsTab settings={settings} blacklist={blacklist} registrations={registrations} onRefresh={() => {}} />}
                            {activeTab === 'deleted' && <SpecializedRegistrationList status={RegStatus.DELETED} title={t('stake.admin.tabs.deleted_list', "刪除名單")} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                            {activeTab === 'temple' && currentEvent && <TempleTab currentEvent={currentEvent} registrations={registrations} settings={settings} onRefresh={() => {}} onUpdateEvent={handleUpdateEvent} />}
                            {activeTab === 'staff' && currentEvent && <StaffTab currentEvent={currentEvent} registrations={registrations} personalInfo={personalInfo} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}

                            {/* 交通管理 */}
                            {activeTab === 'busManagement' && <BusManagementTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateSettings={setSettingsState} />}
                            {activeTab === 'busStops' && <StationDataBlock settings={settings} events={events} onUpdateSettings={setSettingsState} />}
                            {activeTab === 'route' && currentEvent && <RouteTab currentEvent={currentEvent} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                            {activeTab === 'booking' && currentEvent && <BookingTab currentEvent={currentEvent} registrations={registrations} onUpdateEvent={handleUpdateEvent} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                            {activeTab === 'assign' && currentEvent && <AssignmentTab currentEvent={currentEvent} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                            {activeTab === 'rating' && <RatingTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateSettings={setSettingsState} />}

                            {/* 財務管理 */}
                            {activeTab === 'feeConfig' && <FeeConfigTab settings={settings} currentEvent={currentEvent} onRefreshEvents={() => {}} />}
                            {activeTab === 'fee' && currentEvent && <FeeTab registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                            {activeTab === 'retention' && <SpecializedRegistrationList status={RegStatus.RETAINED} title={t('stake.admin.tabs.retention_list', "留用名單")} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                            {activeTab === 'refunds' && <SpecializedRegistrationList status={RegStatus.REFUNDED} title={t('stake.admin.tabs.refund_list', "退款名單")} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default StakeAdmin;
