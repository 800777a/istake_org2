
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Role, User, GlobalSettings, EventData } from '../types';
import { 
  Menu, X, Bus, UserCircle, LogOut, Home, ChevronDown, Check, BarChart3, 
  ArrowUp, LogIn, ChevronRight, ClipboardList, Info, MessageSquare, 
  LayoutDashboard, Shield, UserPlus, HeartHandshake, CalendarCheck, 
  List, ChevronUp, FileText, MapPin, Train, Book, ShieldCheck, 
  PlusCircle, Edit, Trash2, Download, Upload, Layers,
  Users2, Activity, ClipboardCheck, Truck, Wallet, FileEdit, 
  UserCheck, Contact, Users, Badge, Calendar, Settings, BookOpen, 
  Star, Landmark, Coins, FileSearch, RefreshCw, Bell, Languages, History, Database
} from 'lucide-react';
import AnnouncementDisplay from './AnnouncementDisplay';
import EmergencyOverlay from './EmergencyOverlay';
import { getSettings, subscribeToSettings, subscribeToEvents } from '../services/sheetService';
import LoginModal from './LoginModal';
import LanguageSelector from '../src/components/i18n/LanguageSelector';
import ConfirmationModal from '../src/components/ConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  viewMode?: string;
  activeStatsTab?: string;
  activeInstructionsTab?: string;
  activeRegistrationTab?: string;
  activeAdminTab?: string;
  activeEngineerTab?: string;
  onLogout: () => void;
  onGoHome: () => void; 
  onRoleChange: (role: Role | 'public_stats' | 'instructions' | 'feedback' | 'back_to_admin' | 'member', subTab?: string) => void;
  onLoginSuccess?: (user: User) => void;
}

const rainbowColors = [
    { bg: 'bg-red-600', text: 'text-red-900', border: 'border-red-600' },
    { bg: 'bg-orange-600', text: 'text-orange-900', border: 'border-orange-600' },
    { bg: 'bg-amber-600', text: 'text-amber-950', border: 'border-amber-600' },
    { bg: 'bg-emerald-600', text: 'text-emerald-900', border: 'border-emerald-600' },
    { bg: 'bg-blue-600', text: 'text-blue-900', border: 'border-blue-600' },
    { bg: 'bg-indigo-600', text: 'text-indigo-900', border: 'border-indigo-600' },
    { bg: 'bg-purple-600', text: 'text-purple-900', border: 'border-purple-600' },
];

const Layout: React.FC<LayoutProps> = ({ children, user, viewMode, activeStatsTab, activeInstructionsTab, activeRegistrationTab, activeAdminTab, activeEngineerTab, onLogout, onGoHome, onRoleChange, onLoginSuccess }) => {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQueryExpanded, setIsQueryExpanded] = useState(true);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(true);
  const [isRegistrationExpanded, setIsRegistrationExpanded] = useState(true);
  const [expandedAdminGroups, setExpandedAdminGroups] = useState<string[]>(['admin', 'hr', 'activity', 'registration', 'transport', 'finance']);
    const [isEngineerExpanded, setIsEngineerExpanded] = useState(true);
    const [isManagementRolesExpanded, setIsManagementRolesExpanded] = useState(false);
    const [settings, setSettings] = useState<GlobalSettings>(getSettings());
    const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const container = document.getElementById('public-scroll-container');
            if (!container) return;
            const currentScrollY = container.scrollTop;
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowHeader(false);
            } else {
                setShowHeader(true);
            }
            lastScrollY.current = currentScrollY;
        };

        const scrollContainer = document.getElementById('public-scroll-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);
  
  // State for Login Modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
      const unsub = subscribeToSettings((s) => setSettings(s));
      const unsubEvents = subscribeToEvents((events) => {
          const active = events.find(e => e.is_active);
          setActiveEvent(active || null);
      });
      return () => {
          unsub();
          unsubEvents();
      };
  }, []);

  const getRoleName = (r: Role | string) => {
    switch (r) {
      case 'engineer': return '資管同工';
      case 'stake_admin': return '主辦行政';
      case 'admin': return '管理中心';
      case 'stake': return '主辦中心';
      case 'ward': return '單位中心';
      case 'member': return '報名';
      case 'guest': return '報名';
      case 'home': return '系統首頁';
      case 'login': return '系統首頁';
      case 'public_stats': return '查詢';
      case 'instructions': return '說明';
      case 'feedback': return '留言';
      case 'privacy': return '隱私權政策';
      default: return r;
    }
  };

  const getBreadcrumb = () => {
      const items = [{ label: '首頁', action: onGoHome, icon: Home }];
      
      // If viewMode is 'login', we are at the landing page (Root).
      // Otherwise, we show the current view as the second crumb.
      if (viewMode && viewMode !== 'login' && viewMode !== 'home_page') {
          const mainRole = (viewMode === 'guest' || viewMode === 'member') ? 'member' : viewMode;
          items.push({ 
              label: getRoleName(mainRole), 
              action: () => onRoleChange(mainRole as any), 
              icon: (mainRole === 'public_stats' ? BarChart3 : 
                     mainRole === 'instructions' ? Info : 
                     mainRole === 'feedback' ? MessageSquare : 
                     mainRole === 'member' ? ClipboardList :
                     mainRole === 'admin' ? Shield :
                     mainRole === 'stake_admin' ? Shield :
                     mainRole === 'engineer' ? Shield :
                     ClipboardList) as any
          });

          // Sub-tabs
          if (viewMode === 'public_stats' && activeStatsTab) {
              const subLabels: any = { list: '報名', schedule: '行程', service: '服務', stats: '統計' };
              const subIcons: any = { list: List, schedule: CalendarCheck, service: HeartHandshake, stats: BarChart3 };
              items.push({
                  label: subLabels[activeStatsTab] || activeStatsTab,
                  action: () => {},
                  icon: subIcons[activeStatsTab] || BarChart3
              });
          } else if (viewMode === 'instructions' && activeInstructionsTab) {
              const subLabels: any = { 
                  eventRules: '活動辦法', general: '報名須知', housing: '副殿住宿', 
                  driving: '開車前往', transit: '大眾運輸', handbook: '手冊擷選', 
                  privacy: '隱私權利', terms: '服務條款' 
              };
              const subIcons: any = { 
                  eventRules: FileText, general: List, housing: Home, 
                  driving: MapPin, transit: Train, handbook: Book, 
                  privacy: ShieldCheck, terms: FileText 
              };
              items.push({
                  label: subLabels[activeInstructionsTab] || activeInstructionsTab,
                  action: () => {},
                  icon: subIcons[activeInstructionsTab] || Info
              });
          } else if ((viewMode === 'guest' || viewMode === 'member') && activeRegistrationTab) {
              const subLabels: any = { register: '登記', edit: '編輯', delete: '刪除', save: '存檔', load: '讀檔' };
              const subIcons: any = { register: PlusCircle, edit: Edit, delete: Trash2, save: Download, load: Upload };
              items.push({
                  label: subLabels[activeRegistrationTab] || activeRegistrationTab,
                  action: () => {},
                  icon: subIcons[activeRegistrationTab] || ClipboardList
              });
          } else if (viewMode === 'stake_admin' && activeAdminTab) {
              const subLabels: any = {
                  events: '活動設定', progress: '執行進度', registration: '報名名單', regSettings: '報名設定',
                  booking: '訂車作業', temple: '教儀座位', fee: '對帳作業', assignment: '服務委派',
                  staff: '同工名單', route: '行程安排', announcement: '活動辦法', notice: '須知設定',
                  feeConfig: '收費設定', subsidy: '補助設定', comm: '通訊錄', personalInfo: '成員名單',
                  representatives: '代表名單', restrictions: '限制名單', insurance: '保險名單',
                  busManagement: '車輛管理', backup: '資料保護', history: '歷史記錄',
                  textEditor: '文書處理'
              };
              items.push({
                  label: subLabels[activeAdminTab] || activeAdminTab,
                  action: () => {},
                  icon: LayoutDashboard
              });
          } else if (viewMode === 'engineer' && activeEngineerTab) {
              const subLabels: any = {
                  dashboard: '儀表板', logs: '系統日誌', system: '系統管理', 
                  users: '帳號權限', data: '資料維護', announcements: '公告設定',
                  translations: '語言翻譯'
              };
              items.push({
                  label: subLabels[activeEngineerTab] || activeEngineerTab,
                  action: () => {},
                  icon: Shield
              });
          }
      }
      return items;
  };

  const isManagement = ['engineer', 'stake_admin'].includes(user?.role || '') && viewMode !== 'guest' && viewMode !== 'member';


  const publicNavItems = [
      { id: 'home', label: '首頁', icon: Home, action: onGoHome },
      { 
        id: 'member', 
        label: '報名', 
        icon: ClipboardList, 
        isCategory: true,
        subItems: [
            { id: 'register', label: '登記', icon: PlusCircle },
            { id: 'edit', label: '編輯', icon: Edit },
            { id: 'delete', label: '刪除', icon: Trash2 },
            { id: 'save', label: '存檔', icon: Download },
            { id: 'load', label: '讀檔', icon: Upload },
        ]
      },
      { 
        id: 'public_stats', 
        label: '查詢', 
        icon: BarChart3, 
        isCategory: true,
        subItems: [
            { id: 'list', label: '報名', icon: List },
            { id: 'schedule', label: '行程', icon: CalendarCheck },
            { id: 'service', label: '服務', icon: HeartHandshake },
            { id: 'stats', label: '統計', icon: BarChart3 },
        ]
      },
      { 
        id: 'instructions', 
        label: '說明', 
        icon: Info, 
        isCategory: true,
        subItems: [
            { id: 'eventRules', label: '活動辦法', icon: FileText },
            { id: 'general', label: '報名須知', icon: List },
            { id: 'housing', label: '副殿住宿', icon: Home },
            { id: 'driving', label: '開車前往', icon: MapPin },
            { id: 'transit', label: '大眾運輸', icon: Train },
            { id: 'handbook', label: '手冊擷選', icon: Book },
            { id: 'privacy', label: '隱私權利', icon: ShieldCheck },
            { id: 'terms', label: '服務條款', icon: FileText },
        ]
      },
      { id: 'feedback', label: '留言', icon: MessageSquare, action: () => onRoleChange('feedback') },
  ];

  const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const containers = document.querySelectorAll('.overflow-y-auto, #admin-scroll-container');
      containers.forEach(el => {
          el.scrollTo({ top: 0, behavior: 'smooth' });
      });
  };

  const breadcrumbs = getBreadcrumb();

  return (
    <div className="flex-1 bg-[#F0F4F8] flex flex-col font-sans overflow-hidden">
      {/* Maintenance Overlay */}
      {settings.maintenance_mode && user?.role !== 'engineer' && (
          <div className="bg-rose-600 text-white text-center py-2 text-xs font-bold animate-pulse sticky top-0 z-[70] shadow-md">
              系統資料維護中，請稍候再試...
          </div>
      )}

      <EmergencyOverlay />
      <AnnouncementDisplay />

      {showLoginModal && onLoginSuccess && (
          <LoginModal 
              isOpen={showLoginModal} 
              onLoginSuccess={onLoginSuccess}
              onClose={() => setShowLoginModal(false)}
          />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Backdrop (Mobile) */}
        <AnimatePresence>
            {isSidebarOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-indigo-900/60 backdrop-blur-sm z-[998] lg:hidden"
                />
            )}
        </AnimatePresence>

        {/* Unified Sidebar */}
        <aside className={`
            w-64 bg-indigo-900 flex flex-col shrink-0 z-[999] shadow-2xl border-r border-indigo-800
            fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            {/* Sidebar Branding */}
            <div className="p-6 border-b border-indigo-800 flex items-center justify-between">
                <div onClick={onGoHome} className="flex items-center gap-3 cursor-pointer group">
                    <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 border border-white/10 transition-colors">
                        <Bus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg md:text-xl lg:text-2xl tracking-tight leading-none mb-1">
                            {settings.stake_name || '聖殿旅行'}
                        </h2>
                        {activeEvent && (
                            <p className="text-white text-xl font-black mb-1">
                                {activeEvent.event_date}
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-indigo-100 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation Content */}
            <nav ref={navRef} className="flex-1 overflow-y-scroll py-6 px-4 space-y-4 scrollbar-thin scrollbar-thumb-indigo-800">
                {/* Section: User Profile & Controls (Top) */}
                <div className="space-y-1 mb-6">
                    {user && (
                        <div className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] transition-all shadow-md brightness-105 border border-white/10">
                            <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white">
                                <UserCircle size={14} />
                            </div>
                            <div className="bg-white text-indigo-950 flex-1 flex items-center justify-between px-3 text-[10px] font-black overflow-hidden">
                                <span className="font-bold truncate">{user.name}</span>
                                <span className="text-[8px] opacity-70 ml-2 whitespace-nowrap">{getRoleName(user.role)}</span>
                            </div>
                        </div>
                    )}
                    
                    {user?.originalRole && (
                        <button 
                            onClick={() => onRoleChange('back_to_admin')}
                            className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] transition-all group shadow-md brightness-105 border border-white/10"
                        >
                            <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white">
                                <Shield size={14} />
                            </div>
                            <div className="bg-white text-indigo-950 flex-1 flex items-center px-3 text-[10px] font-black">
                                <span>切換到後台</span>
                            </div>
                        </button>
                    )}

                    <LanguageSelector />
                </div>

                {/* Section: Role Switch (Management only) */}
                {isManagement ? (
                    <div className="px-4 mb-6 space-y-4">
                        {/* Front-end Switch */}
                        <button 
                            onClick={() => { onRoleChange('member'); setIsSidebarOpen(false); }}
                            className="w-full h-7 flex items-stretch overflow-hidden rounded-[4px] transition-all group shadow-md brightness-105 border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="bg-indigo-500 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                <Home size={14} />
                            </div>
                            <div className="bg-white text-indigo-950 flex-1 flex items-center px-3 text-[10px] font-black">
                                <span>切換至前台</span>
                            </div>
                        </button>

                        {/* Management Roles Switch */}
                        <div className="space-y-1">
                            <button 
                                onClick={() => setIsManagementRolesExpanded(!isManagementRolesExpanded)}
                                className="flex items-center justify-between w-full px-3 py-1 mb-1 hover:bg-white/10 rounded transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <Shield size={12} className="text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">切換管理權限</span>
                                </div>
                                <ChevronDown 
                                    size={12} 
                                    className={`text-white transition-transform duration-200 ${isManagementRolesExpanded ? 'rotate-180' : ''}`} 
                                />
                            </button>
                            <AnimatePresence initial={false}>
                                {isManagementRolesExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden space-y-1"
                                    >
                                        <button 
                                            onClick={() => { onRoleChange('engineer'); setIsSidebarOpen(false); }}
                                            className={`w-full h-7 flex items-stretch overflow-hidden rounded-[4px] transition-all group ${user?.role === 'engineer' ? 'shadow-md brightness-105' : 'opacity-90'}`}
                                        >
                                            <div className="bg-emerald-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                                <ShieldCheck size={14} />
                                            </div>
                                            <div className={`${user?.role === 'engineer' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-950'} flex-1 flex items-center justify-between px-3 text-[10px] font-black`}>
                                                <span>資管同工後台</span>
                                                {user?.role === 'engineer' && <Check size={12} />}
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => { onRoleChange('stake_admin'); setIsSidebarOpen(false); }}
                                            className={`w-full h-7 flex items-stretch overflow-hidden rounded-[4px] transition-all group ${user?.role === 'stake_admin' ? 'shadow-md brightness-105' : 'opacity-90'}`}
                                        >
                                            <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                                <Shield size={14} />
                                            </div>
                                            <div className={`${user?.role === 'stake_admin' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-950'} flex-1 flex items-center justify-between px-3 text-[10px] font-black`}>
                                                <span>主辦行政管理</span>
                                                {user?.role === 'stake_admin' && <Check size={12} />}
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : (['engineer', 'stake_admin'].includes(user?.role || '') && (
                            <div className="px-4 mb-6">
                                <button 
                                    onClick={() => { 
                                        const targetRole = user?.role === 'engineer' ? 'engineer' : 'stake_admin';
                                        onRoleChange(targetRole as any); 
                                        setIsSidebarOpen(false); 
                                    }}
                                    className="w-full h-7 flex items-stretch overflow-hidden rounded-[4px] transition-all group shadow-md brightness-105 border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <div className="bg-amber-500 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                        <Shield size={14} />
                                    </div>
                                    <div className="bg-white text-indigo-950 flex-1 flex items-center px-3 text-[10px] font-black">
                                        <span>切換至後台</span>
                                    </div>
                                </button>
                            </div>
                ))}

                {/* Section: Main Menu */}
                <div className="space-y-1">
                    {isManagement ? (
                        <p className="text-[10px] font-black text-white uppercase tracking-widest px-3 mb-3 opacity-90">
                            管理功能選單
                        </p>
                    ) : (
                        <button 
                            onClick={() => {
                                const anyExpanded = isQueryExpanded || isInstructionsExpanded || isRegistrationExpanded;
                                const newState = !anyExpanded;
                                setIsQueryExpanded(newState);
                                setIsInstructionsExpanded(newState);
                                setIsRegistrationExpanded(newState);
                            }}
                            className="flex items-center justify-between w-full px-3 py-1 mb-3 hover:bg-white/10 rounded transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <Layers size={12} className="text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">系統功能導航</span>
                            </div>
                            <ChevronDown 
                                size={12} 
                                className={`text-white transition-transform duration-200 ${(isQueryExpanded || isInstructionsExpanded || isRegistrationExpanded) ? 'rotate-180' : ''}`} 
                            />
                        </button>
                    )}
                    
                    {isManagement ? (
                        <div className="space-y-4">
                            {user?.role === 'stake_admin' && (
                                <>
                                    {(() => {
                                        let cIdx = 0;
                                        // TAB_GROUPS logic for StakeAdmin
                                        const TAB_GROUPS = [
                                            { id: 'admin', label: '行政管理', icon: LayoutDashboard, tabs: ['announcement', 'notice', 'textEditor', 'backup', 'history'] },
                                            { id: 'hr', label: '人資管理', icon: Users2, tabs: ['representatives', 'personalInfo', 'comm', 'staff'] },
                                            { id: 'activity', label: '活動管理', icon: Activity, tabs: ['events', 'progress'] },
                                            { id: 'registration', label: '報名管理', icon: ClipboardCheck, tabs: ['regSettings', 'registration', 'insurance', 'restrictions', 'deleted', 'temple'] },
                                            { id: 'transport', label: '交通管理', icon: Truck, tabs: ['busManagement', 'busStops', 'booking', 'route', 'assign', 'rating'] },
                                            { id: 'finance', label: '財務管理', icon: Wallet, tabs: ['feeConfig', 'fee', 'subsidy', 'retention', 'refunds'] }
                                        ];
                                        const tabLabels: any = {
                                            announcement: '活動辦法', notice: '須知設定', textEditor: '文書處理', backup: '資料保護', history: '歷史記錄',
                                            representatives: '代表名單', personalInfo: '成員名單', comm: '同工名單', staff: '服務委派',
                                            events: '活動設定', progress: '執行進度',
                                            regSettings: '報名設定', registration: '報名名單', insurance: '保險名單', restrictions: '限制名單', deleted: '刪除名單', temple: '教儀座位',
                                            busManagement: '車行司機', busStops: '停靠站點', booking: '訂車作業', route: '行程安排', assign: '車輛座位', rating: '評分設定',
                                            feeConfig: '收費設定', fee: '收款對帳', subsidy: '補助作業', retention: '留用名單', refunds: '退款名單'
                                        };
                                        const tabIcons: any = {
                                            announcement: FileText, notice: Info, textEditor: FileEdit, backup: History, history: History,
                                            representatives: UserCheck, personalInfo: Contact, comm: Users, staff: Badge,
                                            events: Calendar, progress: ClipboardList,
                                            regSettings: Settings, registration: List, insurance: ShieldCheck, restrictions: Shield, deleted: Trash2, temple: BookOpen,
                                            busManagement: Bus, busStops: MapPin, booking: Bus, route: MapPin, assign: Users, rating: Star,
                                            feeConfig: Landmark, fee: Coins, subsidy: FileText, retention: FileSearch, refunds: RefreshCw
                                        };

                                        return TAB_GROUPS.map(group => {
                                            const color = rainbowColors[cIdx++ % rainbowColors.length];
                                            const isExpanded = expandedAdminGroups.includes(group.id);
                                            const toggleGroup = () => {
                                                setExpandedAdminGroups(prev => 
                                                    prev.includes(group.id) 
                                                        ? prev.filter(id => id !== group.id) 
                                                        : [...prev, group.id]
                                                );
                                            };

                                            return (
                                                <div key={group.id} className="space-y-1">
                                                    <button 
                                                        onClick={toggleGroup}
                                                        className="flex items-center justify-between w-full px-3 py-1 mb-1 hover:bg-white/10 rounded transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <group.icon size={12} className="text-white" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">{group.label}</span>
                                                        </div>
                                                        <ChevronDown 
                                                            size={12} 
                                                            className={`text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                                        />
                                                    </button>
                                                    
                                                    <AnimatePresence initial={false}>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden space-y-0.5"
                                                            >
                                                                {group.tabs.map(tabId => {
                                                                    const isActive = activeAdminTab === tabId;
                                                                    const Icon = tabIcons[tabId] || List;
                                                                    return (
                                                                        <button 
                                                                            key={tabId}
                                                                            onClick={() => { onRoleChange('stake_admin', tabId); setIsSidebarOpen(false); }}
                                                                            className={`w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mb-0.5 transition-all group ${isActive ? 'shadow-md brightness-105' : 'opacity-90 hover:opacity-100'}`}
                                                                        >
                                                                            <div className={`${color.bg} text-white w-7 h-7 flex items-center justify-center shrink-0 ${isActive ? 'border border-white' : ''}`}>
                                                                                <Icon size={14} />
                                                                            </div>
                                                                            <div className={`${isActive ? color.bg + ' text-white' : 'bg-white ' + color.text} flex-1 flex items-center px-3 text-[10px] font-normal`}>
                                                                                <span>{tabLabels[tabId]}</span>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        });
                                    })()}
                                </>
                            )}
                            {user?.role === 'engineer' && (
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setIsEngineerExpanded(!isEngineerExpanded)}
                                        className="flex items-center justify-between w-full px-3 py-1 mb-1 hover:bg-white/10 rounded transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Shield size={12} className="text-white" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">行政管理</span>
                                        </div>
                                        <ChevronDown 
                                            size={12} 
                                            className={`text-white transition-transform duration-200 ${isEngineerExpanded ? 'rotate-180' : ''}`} 
                                        />
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isEngineerExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden space-y-0.5"
                                            >
                                                {[
                                                    { id: 'system', label: '系統設定', icon: LayoutDashboard },
                                                    { id: 'users', label: '帳號管理', icon: Users },
                                                    { id: 'data', label: '資料維護', icon: Database },
                                                    { id: 'logs', label: '系統日誌', icon: Activity },
                                                    { id: 'announcements', label: '公告管理', icon: Bell },
                                                    { id: 'translations', label: '詞典管理', icon: Languages }
                                                ].map((item, idx) => {
                                                    const isActive = activeEngineerTab === item.id;
                                                    const color = rainbowColors[idx % rainbowColors.length];
                                                    return (
                                                        <button 
                                                            key={item.id}
                                                            onClick={() => { onRoleChange('engineer', item.id); setIsSidebarOpen(false); }}
                                                            className={`w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mb-0.5 transition-all group ${isActive ? 'shadow-md brightness-105' : 'opacity-90 hover:opacity-100'}`}
                                                        >
                                                            <div className={`${color.bg} text-white w-7 h-7 flex items-center justify-center shrink-0 ${isActive ? 'border border-white' : ''}`}>
                                                                <item.icon size={14} />
                                                            </div>
                                                            <div className={`${isActive ? color.bg + ' text-white' : 'bg-white ' + color.text} flex-1 flex items-center px-3 text-[10px] font-normal`}>
                                                                <span>{item.label}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {(() => {
                                let cIdx = 0;
                                return publicNavItems.map(item => {
                                    const color = rainbowColors[cIdx++ % rainbowColors.length];
                                    const isActive = viewMode === item.id || 
                                                    (viewMode === 'login' && item.id === 'home') ||
                                                    (item.id === 'member' && viewMode === 'guest');
                                    
                                    if (item.isCategory) {
                                        const isQuery = item.id === 'public_stats';
                                        const isInstructions = item.id === 'instructions';
                                        const isRegistration = item.id === 'member' || item.id === 'guest';
                                        const isExpanded = isQuery ? isQueryExpanded : (isInstructions ? isInstructionsExpanded : (isRegistration ? isRegistrationExpanded : false));
                                        const setIsExpanded = isQuery ? setIsQueryExpanded : (isInstructions ? setIsInstructionsExpanded : (isRegistration ? setIsRegistrationExpanded : () => {}));
                                        const activeSubTab = isQuery ? activeStatsTab : (isInstructions ? activeInstructionsTab : (isRegistration ? activeRegistrationTab : null));

                                        return (
                                            <div key={item.id} className="space-y-1">
                                                <button
                                                    onClick={() => setIsExpanded(!isExpanded)}
                                                    className="flex items-center justify-between w-full px-3 py-1 mb-1 hover:bg-white/10 rounded transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <item.icon size={12} className="text-white" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">{item.label}</span>
                                                    </div>
                                                    <ChevronDown 
                                                        size={12} 
                                                        className={`text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                                    />
                                                </button>
                                                
                                                <AnimatePresence initial={false}>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden space-y-0.5"
                                                        >
                                                            {item.subItems?.map(sub => {
                                                                const isSubActive = (viewMode === item.id || (isRegistration && (viewMode === 'guest' || viewMode === 'member'))) && activeSubTab === sub.id;
                                                                const subColor = color;
                                                                return (
                                                                    <button
                                                                        key={sub.id}
                                                                        onClick={() => { onRoleChange(item.id as any, sub.id); setIsSidebarOpen(false); }}
                                                                        className={`w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mb-0.5 transition-all group ${isSubActive ? 'shadow-md brightness-105' : 'opacity-90 hover:opacity-100'}`}
                                                                    >
                                                                        <div className={`${subColor.bg} text-white w-7 h-7 flex items-center justify-center shrink-0 ${isSubActive ? 'border border-white' : ''}`}>
                                                                            <sub.icon size={14} />
                                                                        </div>
                                                                        <div className={`${isSubActive ? subColor.bg + ' text-white' : 'bg-white ' + subColor.text} flex-1 flex items-center px-3 text-[10px] font-normal`}>
                                                                            <span>{sub.label}</span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { item.action?.(); setIsSidebarOpen(false); }}
                                            className={`w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mb-1 transition-all group ${isActive ? 'shadow-md brightness-105' : 'opacity-90 hover:opacity-100'}`}
                                        >
                                            <div className={`${color.bg} text-white w-7 h-7 flex items-center justify-center shrink-0 ${isActive ? 'border border-white' : ''}`}>
                                                <item.icon size={14} />
                                            </div>
                                            <div className={`${isActive ? color.bg + ' text-white' : 'bg-white ' + color.text} flex-1 flex items-center px-3 text-[10px] font-normal`}>
                                                <span>{item.label}</span>
                                            </div>
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    )}
                    
                    <button
                        onClick={() => navRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mt-4 transition-all group opacity-90 hover:opacity-100 shadow-md brightness-105 border border-indigo-500/10"
                    >
                        <div className="bg-indigo-500 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                            <ArrowUp size={14} />
                        </div>
                        <div className="bg-white text-indigo-900 flex-1 flex-row flex items-center px-3 text-[10px] font-normal">
                            <span>回到頂端</span>
                        </div>
                    </button>

                    {user ? (
                        <button 
                            onClick={() => setShowLogoutConfirm(true)}
                            className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mt-1 transition-all group shadow-md brightness-105 border border-rose-600/20"
                        >
                            <div className="bg-rose-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                <LogOut size={14} />
                            </div>
                            <div className="bg-white text-rose-900 flex-1 flex items-center px-3 text-[10px] font-bold">
                                <span>登出系統</span>
                            </div>
                        </button>
                    ) : (
                        <button 
                            onClick={() => { setShowLoginModal(true); setIsSidebarOpen(false); }}
                            className="w-full h-7 flex items-stretch overflow-hidden rounded-r-[4px] mt-1 transition-all group shadow-md brightness-105 border border-indigo-600/20"
                        >
                            <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center shrink-0 border-r border-white/20">
                                <LogIn size={14} />
                            </div>
                            <div className="bg-white text-indigo-900 flex-1 flex items-center px-3 text-[10px] font-bold">
                                <span>同工登入入口</span>
                            </div>
                        </button>
                    )}
                </div>

                {/* Section: User Account (Bottom) */}
                <div className="pt-4 border-t border-indigo-800">
                </div>
            </nav>
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={onLogout}
                title="確認登出"
                message={t('common.confirm_logout')}
                confirmText="登出"
                type="danger"
            />
        </aside>

        {/* Main Content Stage */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-[#F0F4F8]">
            {/* Top Navigation Bar / Breadcrumb Bar */}
            <motion.header 
                initial={{ y: 0 }}
                animate={{ y: showHeader ? 0 : -64 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="h-16 bg-indigo-900 border-b border-white/10 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-xl text-white sticky top-0"
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg lg:hidden transition-colors shrink-0"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    
                    <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block shrink-0"></div>
                    
                    {/* Dynamic Breadcrumbs - Optimized for Mobile with horizontal scroll and gradient mask */}
                    <nav className="flex items-center space-x-1 md:space-x-2 text-[10px] md:text-[12px] overflow-x-auto scrollbar-none flex-nowrap min-w-0 flex-1 pr-8 [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_85%,rgba(0,0,0,0)_100%)]">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight size={10} className="text-indigo-300 shrink-0" />}
                                <button 
                                    onClick={crumb.action}
                                    className={`flex items-center gap-1 px-1 py-1 rounded-md transition-all whitespace-nowrap shrink-0 ${idx === breadcrumbs.length - 1 ? 'text-white cursor-default font-black' : 'text-indigo-100 hover:text-white hover:bg-white/10 underline decoration-white/30 underline-offset-4'}`}
                                >
                                    {idx === 0 && <crumb.icon size={12} className="shrink-0" />}
                                    <span>{crumb.label}</span>
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                    {/* User Profile or Settings Icon could go here */}
                </div>
            </motion.header>

            {/* Actual Content Wrapper - Optimized for horizontal scrolling and space maximization */}
            <main id="public-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth min-h-0 w-full max-w-full">
                {(() => {
                    const isFullWidthView = isManagement || ['public_stats', 'instructions', 'feedback', 'login', 'privacy', 'member', 'guest'].includes(viewMode || '');
                    return (
                        <div className="flex flex-col min-h-full">
                            <div className={`mx-auto w-full flex-1 max-w-full ${isFullWidthView ? 'px-1 py-1 md:px-4 md:py-2' : 'p-2 md:p-4'}`}>
                                <div className={`min-h-full w-full max-w-full ${isFullWidthView ? '' : 'bg-white border shadow-sm rounded-[8px]'}`}>
                                    {children}
                                </div>
                            </div>

                            {/* Footer Bar - Scrolling with content */}
                            <footer className="w-full bg-indigo-900 border-t border-white/10 px-4 py-6 flex items-center justify-center text-white text-[10px] md:text-xs opacity-90 mt-auto">
                                <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 whitespace-nowrap">
                                    <span>智聯會 istake.org ©</span>
                                    <span className="opacity-40">|</span>
                                    <span>版本序號 (Version) {settings.engineering_version || settings.app_version || 'v1.0.2'}</span>
                                    <span className="opacity-40">|</span>
                                    <span>最後更新 (Last Publish) {settings.engineering_date || settings.maintenance_date || '2024.07.24'}</span>
                                </div>
                            </footer>
                        </div>
                    );
                })()}
            </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
