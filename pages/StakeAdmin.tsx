
import React, { useState, useEffect, useMemo } from 'react';
import { EventData, Registration, GlobalSettings, BlacklistItem, PersonalInfo, User, RegStatus, Role } from '../types';
import { subscribeToEvents, subscribeToRegistrations, subscribeToSettings, subscribeToPersonalInfo, setCurrentEvent, getSettings, subscribeToBlacklist } from '../services/sheetService';
import { 
    Calendar, ClipboardList, Bus, BookOpen, Coins, Users, Badge, MapPin, 
    Settings, CheckCircle, List, Contact, Shield, ShieldCheck, 
    FileText, Landmark, ChevronDown, ChevronUp, UserCheck, 
    History, HelpCircle, FileSearch, Star, CreditCard, RefreshCw, Trash2, X, Menu,
    LayoutDashboard, Users2, Activity, ClipboardCheck, Truck, Wallet, Info,
    FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../src/contexts/LanguageContext';

// Import refactored components
import EventsTab from '../components/stake/EventsTab';
import BackupTab from '../components/stake/BackupTab';
import ProgressTab from '../components/stake/ProgressTab';
import RegistrationTab from '../components/stake/RegistrationTab'; 
import RegistrationSettingsTab from '../components/stake/RegistrationSettingsTab';
import BookingTab from '../components/stake/BookingTab';
import TempleTab from '../components/stake/TempleTab';
import FeeTab from '../components/stake/FeeTab';
import AssignmentTab from '../components/stake/AssignmentTab';
import StaffTab from '../components/stake/StaffTab';
import RouteTab from '../components/stake/RouteTab';
import AnnouncementTab from '../components/stake/AnnouncementTab';
import FeeConfigTab from '../components/stake/FeeConfigTab';
import SubsidyTab from '../components/stake/SubsidyTab';
import CommTab from '../components/stake/CommTab';
import PersonalInfoTab from '../components/stake/PersonalInfoTab';
import RepresentativesTab from '../components/stake/RepresentativesTab';
import RestrictionsTab from '../components/stake/RestrictionsTab';
import InsuranceTab from '../components/stake/InsuranceTab';
import BusManagementTab from '../components/stake/BusManagementTab';
import StationDataBlock from '../components/stake/StationDataBlock';
import SpecializedRegistrationList from '../components/stake/SpecializedRegistrationList';
import RolloverManagement from '../components/stake/RolloverManagement';
import RatingTab from '../components/stake/RatingTab';
import TextEditorTab from '../components/stake/TextEditorTab';
import HistoryTab from '../components/stake/HistoryTab';
import { useStats } from '../hooks/useStats';
import { assignMissingSerialNumbers } from '../services/registrationService';
import { updateEvent } from '../services/eventService';

interface StakeAdminProps {
    initialTab?: string;
    currentUser?: User;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    onRoleChange?: (role: Role | 'public_stats' | 'instructions' | 'feedback' | 'member') => void;
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
            { id: 'notice', label: '須知設定', labelKey: 'notice_setup', icon: Info },
            { id: 'textEditor', label: '文書處理', labelKey: 'text_editor', icon: FileEdit },
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
            { id: 'staff', label: '服務委派', labelKey: 'service_assign', icon: Badge },
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
            { id: 'regSettings', label: '報名設定', labelKey: 'reg_settings', icon: Settings },
            { id: 'registration', label: '報名名單', labelKey: 'reg_list', icon: List },
            { id: 'insurance', label: '保險名單', labelKey: 'insurance_list', icon: ShieldCheck },
            { id: 'restrictions', label: '限制名單', labelKey: 'restriction_list', icon: Shield },
            { id: 'deleted', label: '刪除名單', labelKey: 'deleted_list', icon: Trash2 },
            { id: 'temple', label: '教儀座位', labelKey: 'ordinance_seat', icon: BookOpen },
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
            { id: 'booking', label: '訂車作業', labelKey: 'booking_record', icon: Bus },
            { id: 'route', label: '行程安排', labelKey: 'route_plan', icon: MapPin },
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
            { id: 'subsidy', label: '補助作業', labelKey: 'subsidy_ops', icon: FileText },
            { id: 'retention', label: '留用名單', labelKey: 'retention_list', icon: FileSearch },
            { id: 'refunds', label: '退款名單', labelKey: 'refund_list', icon: RefreshCw },
        ]
    }
];

const rainbowColors = [
    { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' },
    { bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600' },
    { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600' },
    { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
    { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600' },
    { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600' },
];

const StakeAdmin: React.FC<StakeAdminProps> = ({ initialTab, currentUser, onRoleChange, activeTab: passedActiveTab, onTabChange }) => {
    const { t, tString } = useI18n();
    const isReadOnly = currentUser?.permission === 'read';
    const [internalActiveTab, setInternalActiveTab] = useState<string>(initialTab || 'events');
    const activeTab = passedActiveTab || internalActiveTab;
    const setActiveTab = onTabChange || setInternalActiveTab;
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['admin', 'hr', 'activity', 'registration', 'transport', 'finance']);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [events, setEvents] = useState<EventData[]>([]);
    const [currentEvent, setCurrentEventState] = useState<EventData | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
    const [personalInfo, setPersonalInfo] = useState<PersonalInfo[]>([]);
    const [settings, setSettingsState] = useState<GlobalSettings>(getSettings());
    const [msg, setMsg] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');
    const [editorContent2, setEditorContent2] = useState<string>('');

    const { vehicleStats, ordinanceStats } = useStats(currentEvent, registrations);

    // Modern Business Theme constants
    const SIDEBAR_WIDTH = 'w-64';
    const THEME = {
        sidebar: 'bg-indigo-900',
        content: 'bg-[#F0F4F8]',
        accent: 'bg-blue-600',
        accentHover: 'hover:bg-blue-800',
        textMain: 'text-slate-900',
        textMuted: 'text-slate-600',
        card: 'bg-white shadow-lg border border-indigo-100'
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => 
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
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

    const handleSetActiveEvent = (eventId: string) => {
        setCurrentEvent(eventId);
        setMsg(t('stake.admin.switch_event_msg', '已切換活動 (資料同步中...)'));
        setTimeout(() => setMsg(null), 3000);
    };

    const handleUpdateEvent = (updatedEvent: EventData) => {
        setCurrentEventState(updatedEvent);
    };

    const pushToEditor = (content: string) => {
        const formattedContent = content.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>').join('');
        setEditorContent(prev => prev ? prev + formattedContent : formattedContent);
        setActiveTab('textEditor');
        setMsg(t('stake.admin.pushed_to_editor', '內容已傳送到文字編輯1'));
        setTimeout(() => setMsg(null), 2000);
    };

    const handleAssignVehicleSerials = async () => {
        if (!currentEvent?.event_id) return;
        const res = await assignMissingSerialNumbers(currentEvent.event_id, registrations);
        if (res.success) {
            setMsg(res.message);
        } else {
            setMsg(`分配車輛編號失敗: ${res.message}`);
        }
    };

    const handleAssignOrdinanceSerials = async () => {
        if (!currentEvent?.event_id) return;
        const res = await assignMissingSerialNumbers(currentEvent.event_id, registrations);
        if (res.success) {
            setMsg(res.message);
        } else {
            setMsg(`分配教儀編號失敗: ${res.message}`);
        }
    };

    const onRefresh = () => {
        setMsg(t('common.refreshing', '正在重新整理...'));
        setTimeout(() => setMsg(null), 1000);
    };

    const activeTabInfo = TAB_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab);

    if (!settings) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#F0F4F8]">
            {/* Actual Content Container - Integrated with Layout Unified Header */}
            <div id="admin-scroll-container" className={`flex-1 overflow-y-auto p-1 md:p-3 lg:p-4 scroll-smooth min-h-0 ${isReadOnly ? 'relative' : ''}`}>
                {isReadOnly && (
                    <div className="sticky top-0 z-50 mb-6 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm">
                        <Shield className="w-4 h-4 text-amber-700" />
                        <span className="text-amber-800 font-bold text-xs">{t('stake.admin.read_only_mode', '唯讀模式：您目前僅有檢視權限，無法修改資料。')}</span>
                    </div>
                )}
                
                <div className={`max-w-full mx-auto space-y-6 ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}>
                    {!currentEvent && !['events', 'announcement', 'feeConfig', 'notice', 'tutorial', 'backup', 'history'].includes(activeTab) ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <Calendar className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-slate-900 font-bold mb-2">{t('stake.admin.no_event_selected', '尚未選擇活動')}</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">{t('stake.admin.please_select_event_hint', '請先到「活動設定」選擇一個進行中的活動。')}</p>
                        </div>
                    ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Dashboard Content Mapping */}
                                {activeTab === 'registration' && currentEvent && <RegistrationTab registrations={registrations} settings={settings} currentEventId={currentEvent.event_id} activeEvent={currentEvent} onRefresh={() => {}} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                                {activeTab === 'events' && <EventsTab events={events} currentEvent={currentEvent} onRefresh={() => {}} onSetActive={handleSetActiveEvent} />}
                                {activeTab === 'insurance' && currentEvent && <InsuranceTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                                {activeTab === 'booking' && currentEvent && <BookingTab currentEvent={currentEvent} registrations={registrations} onUpdateEvent={handleUpdateEvent} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                                {activeTab === 'route' && currentEvent && <RouteTab currentEvent={currentEvent} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                                {activeTab === 'busStops' && <StationDataBlock settings={settings} events={events} onUpdateSettings={setSettingsState} />}
                                {activeTab === 'busManagement' && <BusManagementTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateSettings={setSettingsState} />}
                                {activeTab === 'assign' && currentEvent && <AssignmentTab currentEvent={currentEvent} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                                {activeTab === 'rating' && <RatingTab currentEvent={currentEvent} registrations={registrations} settings={settings} onUpdateSettings={setSettingsState} />}
                                
                                {activeTab === 'announcement' && <AnnouncementTab settings={settings} />}
                                {activeTab === 'notice' && <Placeholder name={t('stake.admin.tabs.notice_setup', "須知設定")} icon={Info} />}
                                {activeTab === 'textEditor' && <TextEditorTab content={editorContent} onContentChange={setEditorContent} content2={editorContent2} onContentChange2={setEditorContent2} />}
                                {activeTab === 'backup' && <BackupTab />}
                                {activeTab === 'history' && <HistoryTab events={events} onRefresh={() => {}} onPushToEditor={pushToEditor} />}

                                {activeTab === 'staff' && currentEvent && <StaffTab currentEvent={currentEvent} registrations={registrations} personalInfo={personalInfo} settings={settings} onUpdateEvent={handleUpdateEvent} onPushToEditor={pushToEditor} />}
                                
                                {activeTab === 'regSettings' && (
                                    <RegistrationSettingsTab 
                                        activeEvent={currentEvent}
                                        settings={settings}
                                        eventStats={vehicleStats}
                                        ordinanceStats={ordinanceStats}
                                        onUpdateEvent={(e) => {
                                            setCurrentEventState(e);
                                            updateEvent(e);
                                        }}
                                        onAssignVehicleSerials={handleAssignVehicleSerials}
                                        onAssignOrdinanceSerials={handleAssignOrdinanceSerials}
                                    />
                                )}
                                {activeTab === 'feeConfig' && <FeeConfigTab settings={settings} currentEvent={currentEvent} onRefreshEvents={() => {}} />}
                                {activeTab === 'fee' && currentEvent && <FeeTab registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                                {activeTab === 'subsidy' && currentEvent && <SubsidyTab registrations={registrations} settings={settings} currentEvent={currentEvent} onRefresh={() => {}} onPushToEditor={pushToEditor} />}
                                {activeTab === 'restrictions' && currentEvent && <RestrictionsTab settings={settings} blacklist={blacklist} registrations={registrations} onRefresh={() => {}} />}
                                {activeTab === 'representatives' && <RepresentativesTab event_id={currentEvent ? currentEvent.event_id : ''} />}
                                {activeTab === 'personalInfo' && <PersonalInfoTab units={settings.units} registrations={registrations} currentEvent={currentEvent} />}
                                {activeTab === 'comm' && currentEvent && <CommTab currentEvent={currentEvent} settings={settings} onUpdateEvent={handleUpdateEvent} />}
                                {activeTab === 'progress' && currentEvent && <ProgressTab currentEvent={currentEvent} onUpdateEvent={handleUpdateEvent} />}
                                {activeTab === 'temple' && currentEvent && <TempleTab currentEvent={currentEvent} registrations={registrations} settings={settings} onRefresh={() => {}} onUpdateEvent={handleUpdateEvent} />}

                                {activeTab === 'deleted' && (
                                    <SpecializedRegistrationList status={RegStatus.DELETED} title={t('stake.admin.tabs.deleted_list', "刪除名單")} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />
                                )}
                                {activeTab === 'retention' && (
                                    <SpecializedRegistrationList 
                                        status={RegStatus.RETAINED} 
                                        title={t('stake.admin.tabs.retention_list', "留用名單")} 
                                        registrations={registrations} 
                                        settings={settings} 
                                        onRefresh={() => {}} 
                                        onPushToEditor={pushToEditor} 
                                        header={
                                            <RolloverManagement 
                                                registrations={registrations} 
                                                onRefresh={() => {}} 
                                                currentEventId={currentEvent?.event_id || ''} 
                                            />
                                        }
                                    />
                                )}
                                {activeTab === 'refunds' && (
                                    <SpecializedRegistrationList status={RegStatus.REFUNDED} title={t('stake.admin.tabs.refund_list', "退款名單")} registrations={registrations} settings={settings} onRefresh={() => {}} onPushToEditor={pushToEditor} />
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
    );
};

const Placeholder = ({ name, icon: Icon }: { name: string, icon?: any }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            {Icon ? <Icon size={32} /> : <Settings size={32} />}
        </div>
        <h3 className="text-slate-900 font-bold mb-2">{name}</h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">此區塊目前正由首席工程師進行「現代商務風」優化中。請稍候重試。</p>
    </div>
);

export default StakeAdmin;
