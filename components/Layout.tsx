
import React, { useState, useEffect, useMemo } from 'react';
import { Role, User, GlobalSettings } from '../types';
import { Menu, X, Bus, UserCircle, LogOut, Home, ChevronDown, Check, BarChart3, ArrowUp, LogIn } from 'lucide-react';
import AnnouncementDisplay from './AnnouncementDisplay';
import EmergencyOverlay from './EmergencyOverlay';
import { getSettings, subscribeToSettings } from '../services/sheetService';
import LoginModal from './LoginModal';
import LanguageSelector from '../src/components/i18n/LanguageSelector';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onGoHome: () => void; 
  onRoleChange: (role: Role | 'public_stats' | 'instructions') => void;
  onLoginSuccess?: (user: User) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onGoHome, onRoleChange, onLoginSuccess }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>(getSettings());
  
  // State for Login Modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
      const unsub = subscribeToSettings((s) => setSettings(s));
      return () => unsub();
  }, []);

  const getRoleName = (r: Role | string) => {
    const forbiddenRoles = ['unit_admin', 'insurer', 'convener', 'navigator', 'supervisor'];
    if (forbiddenRoles.includes(r)) return '';

    switch (r) {
      case 'engineer': return '資管';
      case 'stake_admin': return '主辦';
      case 'member': return '報名';
      case 'home': return '首頁';
      case 'public_stats': return '查詢';
      case 'instructions': return '說明';
      case 'feedback': return '留言';
      default: return r;
    }
  };

  const rolePriority: Record<string, number> = {
      'engineer': 1,
      'stake_admin': 3,
      'member': 8
  };

  const sortedRoles = useMemo(() => {
      const roles = user?.roles || (user?.role ? [user.role] : []);
      const forbiddenRoles: string[] = ['unit_admin', 'insurer', 'convener', 'navigator', 'supervisor'];
      return roles
          .filter(r => !forbiddenRoles.includes(r))
          .sort((a, b) => {
              return (rolePriority[a] || 99) - (rolePriority[b] || 99);
          });
  }, [user?.roles, user?.role]);

  const isMaintenanceMode = settings.maintenance_mode && user?.role !== 'engineer';
  const navigationRoles = ['home', 'member', 'public_stats', 'instructions', 'feedback'];

  const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isMaintenanceMode && (
          <div className="bg-red-600 text-white text-center py-3 font-bold animate-pulse sticky top-0 z-[60] shadow-md">
              系統資料正在維護更新中 請稍待片刻...
          </div>
      )}

      <EmergencyOverlay />
      <AnnouncementDisplay />

      {showLoginModal && onLoginSuccess && (
          <LoginModal 
              isOpen={showLoginModal} 
              onClose={() => setShowLoginModal(false)} 
              onLoginSuccess={onLoginSuccess} 
          />
      )}

      <header className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-slate-900 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onGoHome}
            >
              <Bus className="h-6 w-6 text-slate-900" />
              <span className="font-bold text-xl tracking-wide text-slate-900">{settings.stake_name || '支聯會辦旅行'}</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSelector />
              {user ? (
                <>
                    <div className="relative">
                        <div 
                            className={`flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-slate-900/10 px-3 py-1 rounded-full text-sm select-none transition-colors cursor-pointer hover:bg-white/30`}
                            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                        >
                            <UserCircle className="w-4 h-4 text-slate-800" />
                            <span className="text-slate-900 font-bold">{user.name} ({getRoleName(user.role)})</span>
                            {user.unit && <span className="text-slate-800 text-xs opacity-75">| {user.unit}</span>}
                            <ChevronDown className={`w-3 h-3 text-slate-800 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isRoleMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsRoleMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-20 text-gray-800 animate-fade-in border border-gray-200">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase border-b">後台</div>
                                    {sortedRoles.map(r => (
                                        <button 
                                            key={r}
                                            onClick={() => {
                                                onRoleChange(r);
                                                setIsRoleMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 flex items-center justify-between ${user.role === r ? 'text-amber-600 font-bold bg-amber-50' : ''}`}
                                        >
                                            {getRoleName(r)}
                                            {user.role === r && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                    
                                    <div className="border-t my-1"></div>
                                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase">前台</div>
                                    {navigationRoles.map(navRole => (
                                        <button 
                                            key={navRole}
                                            onClick={() => {
                                                onRoleChange(navRole as any);
                                                setIsRoleMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 flex items-center justify-between ${user.role === navRole ? 'text-amber-600 font-bold bg-amber-50' : ''}`}
                                        >
                                            {getRoleName(navRole)}
                                            {user.role === navRole && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={onLogout}
                        className="text-slate-800 hover:text-black flex items-center text-sm font-medium ml-4 bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-1" /> 登出
                    </button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={onGoHome}
                        className="text-slate-800 hover:text-black flex items-center text-sm font-medium"
                    >
                        <Home className="w-4 h-4 mr-1" /> 回首頁
                    </button>
                    <button 
                        onClick={() => setShowLoginModal(true)}
                        className="text-slate-900 bg-white/30 hover:bg-white/50 flex items-center text-sm font-bold px-4 py-1.5 rounded-full transition-colors border border-slate-900/10 shadow-sm"
                    >
                        <LogIn className="w-4 h-4 mr-1" /> 登入
                    </button>
                </div>
              )}
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-900">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-amber-400 px-4 pt-2 pb-4 shadow-inner">
            {user ? (
                 <div className="border-t border-amber-500 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-slate-900 font-bold text-sm">{user.name}</p>
                        {user.unit && <span className="text-slate-800 text-xs bg-amber-300 px-2 py-0.5 rounded">{user.unit}</span>}
                    </div>
                    
                    <div className="mb-4 bg-amber-300/50 rounded p-2">
                        <p className="text-xs text-slate-700 mb-2 font-bold uppercase">後台</p>
                        <div className="space-y-1">
                            {sortedRoles.map(r => (
                                <button 
                                    key={r}
                                    onClick={() => {
                                        onRoleChange(r);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between ${user.role === r ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-800 hover:bg-amber-200'}`}
                                >
                                    {getRoleName(r)}
                                    {user.role === r && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                            <div className="border-t border-amber-400/50 my-1"></div>
                            <p className="text-xs text-slate-700 mb-2 font-bold uppercase px-2 mt-2">前台</p>
                            {navigationRoles.map(navRole => (
                                <button 
                                    key={navRole}
                                    onClick={() => {
                                        onRoleChange(navRole as any);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between ${user.role === navRole ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-800 hover:bg-amber-200'}`}
                                >
                                    {getRoleName(navRole)}
                                    {user.role === navRole && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={onLogout} className="text-slate-900 font-bold w-full text-left py-2 flex items-center">
                        <LogOut className="w-4 h-4 mr-2" /> 登出
                    </button>
                 </div>
            ) : (
                 <div className="py-2 space-y-2">
                     <p className="text-slate-900 font-bold px-2">訪客模式</p>
                     <button onClick={() => { onGoHome(); setIsMenuOpen(false); }} className="text-slate-800 flex items-center w-full text-left py-3 px-2 border-t border-amber-500 font-medium">
                         <Home className="w-4 h-4 mr-2" /> 回首頁
                     </button>
                     <button onClick={() => { setShowLoginModal(true); setIsMenuOpen(false); }} className="text-slate-900 flex items-center w-full text-left py-3 px-2 border-t border-amber-500 font-bold bg-amber-300">
                         <LogIn className="w-4 h-4 mr-2" /> 同工登入
                     </button>
                 </div>
            )}
          </div>
        )}
      </header>

      <main className={`flex-grow w-full mx-auto ${['engineer', 'stake_admin'].includes(user?.role || '') ? 'px-0 py-0' : 'max-w-7xl px-2 py-2 md:px-4 md:py-8'}`}>
        <div className={`bg-white min-h-[500px] ${['engineer', 'stake_admin'].includes(user?.role || '') ? '' : 'rounded shadow-sm border border-gray-200 overflow-hidden'}`}>
             {children}
        </div>
      </main>

      <div className="w-full bg-white border-t border-gray-200">
          <button 
              onClick={scrollToTop}
              className="w-full bg-purple-100 text-purple-700 py-4 font-bold flex items-center justify-center hover:bg-purple-200 transition-colors"
          >
              <ArrowUp className="w-4 h-4 mr-2" /> 回到頂端
          </button>
      </div>

      <footer className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-slate-800 py-6 text-center text-sm shadow-inner">
        <p className="font-medium drop-shadow-sm">
            智聯會 istake.org &copy; | V.{settings.app_version} | {settings.maintenance_date}
        </p>
      </footer>
    </div>
  );
};

export default Layout;
