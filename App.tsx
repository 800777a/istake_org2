import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegistrationForm from './pages/RegistrationForm';
import StakeAdmin from './pages/StakeAdmin';
import Engineer from './pages/Engineer';
import PublicStats from './pages/PublicStats'; 
import Instructions from './pages/Instructions';
import PrivacyPage from './pages/PrivacyPage';
import { Role, User } from './types';
import { getCurrentUser, logout, login, updateCurrentSession } from './services/sheetService';
import ConfirmDialog from './components/ConfirmDialog';
import FloatingI18nEditor from './src/components/i18n/FloatingI18nEditor';
import ScrollToTop from './components/ScrollToTop';

import { useI18n } from './src/contexts/LanguageContext';

const App = () => {
  const { isEditMode } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'login' | 'guest' | 'public_stats' | 'instructions' | 'feedback' | 'privacy' | 'member' | 'stake_admin' | 'engineer'>('login');
  const [statsTab, setStatsTab] = useState<'list' | 'schedule' | 'service' | 'stats'>('list');
  const [instructionsTab, setInstructionsTab] = useState<'eventRules' | 'general' | 'housing' | 'driving' | 'transit' | 'handbook' | 'privacy' | 'terms'>('eventRules');
  const [registrationTab, setRegistrationTab] = useState<string>('register');
  const [adminTab, setAdminTab] = useState<any>('events');
  const [engineerTab, setEngineerTab] = useState<any>('system');
  const [loading, setLoading] = useState(true);
  
  // V128: Dirty State Management
  const [isRegistrationDirty, setIsRegistrationDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // V190: Flash Message for PublicStats (e.g. "送出成功")
  const [publicStatsMessage, setPublicStatsMessage] = useState<string>('');

  useEffect(() => {
    // 檢查是否有登入 Session
    const currentUser = getCurrentUser();
    
    // 檢查 URL 路徑是否為 /privacy
    if (window.location.pathname === '/privacy') {
        setViewMode('privacy');
    } else if (currentUser) {
      setUser(currentUser);
      setViewMode('login'); 
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setViewMode(loggedInUser.role as any);
  };

  const handleGuestAccess = () => {
    setViewMode('guest' as any);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setViewMode('login');
    setIsRegistrationDirty(false); // Reset dirty state
  };

  const executeGoHome = () => {
      setViewMode('login');
      setIsRegistrationDirty(false);
      setShowExitConfirm(false);
  };

  const handleGoHomeRequest = () => {
      if (isRegistrationDirty && (viewMode === 'member' || user?.role === 'member')) {
          setShowExitConfirm(true);
      } else {
          executeGoHome();
      }
  };

  const handleGoToStats = (msg?: string) => {
      if (msg) setPublicStatsMessage(msg);
      setViewMode('public_stats');
  }

  const handleGoToInstructions = () => {
      setViewMode('instructions');
  }

  const handleGoToFeedback = () => {
      setViewMode('feedback');
  }

  // Role Switch Handler
  const handleRoleChange = (newRole: Role | 'public_stats' | 'instructions' | 'feedback' | 'member' | 'back_to_admin' | 'login', subTab?: string) => {
      if (newRole === 'login') {
          executeGoHome();
          return;
      }
      if (newRole === 'public_stats') {
          if (subTab) {
              setStatsTab(subTab as any);
          }
          handleGoToStats();
          return;
      }
      if (newRole === 'instructions') {
          if (subTab) {
              setInstructionsTab(subTab as any);
          }
          handleGoToInstructions();
          return;
      }
      if (newRole === 'stake_admin') {
          if (subTab) {
              setAdminTab(subTab);
          }
      }
      if (newRole === 'engineer') {
          if (subTab) {
              setEngineerTab(subTab);
          }
      }
      if (newRole === 'feedback') {
          handleGoToFeedback();
          return;
      }
      if (newRole === 'member' && !user) {
          if (subTab) {
              setRegistrationTab(subTab);
          }
          handleGuestAccess();
          return;
      }
      if (user) {
          let updatedRole: Role = user.role;
          let updatedOriginalRole = user.originalRole;

          if (newRole === 'back_to_admin' && user.originalRole) {
              updatedRole = user.originalRole;
              updatedOriginalRole = undefined;
          } else if (newRole === 'member') {
              if (subTab) {
                  setRegistrationTab(subTab);
              }
              if (['stake_admin', 'engineer'].includes(user.role)) {
                  updatedOriginalRole = user.role;
              }
              updatedRole = 'member';
          } else if (['stake_admin', 'engineer', 'member'].includes(newRole)) {
              updatedRole = newRole as Role;
          }

          const updatedUser = { 
              ...user, 
              role: updatedRole,
              originalRole: updatedOriginalRole
          };
          setUser(updatedUser);
          updateCurrentSession(updatedUser);
          setViewMode(newRole === 'back_to_admin' ? updatedRole : newRole as any); 
      } else if (newRole === 'member') {
          setViewMode('member' as any);
      }
  };

  const handleClearStatsMessage = () => {
      setPublicStatsMessage('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;

  // 決定顯示哪個畫面
  const renderContent = () => {
    // 1. Landing Page (Login screen) - Always shown when viewMode is 'login'
    if (viewMode === 'login') {
        return <Login 
            onLoginSuccess={handleLoginSuccess} 
            onGuestAccess={handleGuestAccess} 
            onGoToStats={handleGoToStats} 
            onGoToInstructions={handleGoToInstructions}
            onGoToFeedback={handleGoToFeedback}
        />;
    }

    // 2. Public / Shared Views
    if (viewMode === 'public_stats') {
        return <PublicStats 
            onGoHome={handleGoHomeRequest} 
            onGoRegister={handleGuestAccess} 
            onGoToInstructions={handleGoToInstructions} 
            initialMessage={publicStatsMessage}
            onClearMessage={handleClearStatsMessage}
            activeTab={statsTab}
            onTabChange={setStatsTab}
        />;
    }

    if (viewMode === 'instructions') {
        return <Instructions 
            onBack={handleGoHomeRequest} 
            onGoRegister={handleGuestAccess}
            onGoFeedback={handleGoToFeedback}
            activeTab={instructionsTab}
            onTabChange={setInstructionsTab}
        />;
    }

    if (viewMode === 'feedback') {
        return <Login 
            onLoginSuccess={handleLoginSuccess} 
            onGuestAccess={handleGuestAccess} 
            onGoToStats={handleGoToStats} 
            onGoToInstructions={handleGoToInstructions}
            onGoToFeedback={handleGoToFeedback}
            initialShowComments={true}
        />;
    }

    if (viewMode === 'privacy') {
        return <PrivacyPage />;
    }

    // 3. Authenticated Role Views
    if (user) {
        // Special case for member/guest registration
        if (viewMode === ('member' as any) || viewMode === ('guest' as any) || user.role === 'member') {
            return <RegistrationForm 
                onGoHome={handleGoHomeRequest}
                onGoToStats={handleGoToStats} 
                setIsDirty={setIsRegistrationDirty}
                activeTab={registrationTab}
                onTabChange={setRegistrationTab}
            />;
        }

        switch (user.role) {
          case 'stake_admin': return <StakeAdmin currentUser={user} onRoleChange={handleRoleChange} activeTab={adminTab} onTabChange={setAdminTab} />;
          case 'engineer': return <Engineer onRoleChange={handleRoleChange} activeTab={engineerTab} onTabChange={setEngineerTab} />;
          default: return <RegistrationForm 
            onGoHome={handleGoHomeRequest}
            onGoToStats={handleGoToStats} 
            setIsDirty={setIsRegistrationDirty}
            activeTab={registrationTab}
            onTabChange={setRegistrationTab}
          />;
        }
    }

    // 4. Default Fallback
    if (viewMode === 'guest' || viewMode === 'member') {
        return <RegistrationForm 
            onGoHome={handleGoHomeRequest} 
            onGoToStats={handleGoToStats} 
            setIsDirty={setIsRegistrationDirty}
            activeTab={registrationTab}
            onTabChange={setRegistrationTab}
        />;
    }

    return <RegistrationForm 
        onGoHome={handleGoHomeRequest} 
        onGoToStats={handleGoToStats} 
        setIsDirty={setIsRegistrationDirty}
        activeTab={registrationTab}
        onTabChange={setRegistrationTab}
    />;
  };
  
  return (
    <div className={`flex h-screen bg-[#F0F4F8] overflow-hidden`}>
      <ConfirmDialog 
          isOpen={showExitConfirm}
          title="放棄報名？"
          message="您目前已填寫資料。確定要放棄報名，回到首頁嗎？"
          confirmText="確定放棄"
          onConfirm={executeGoHome}
          onCancel={() => setShowExitConfirm(false)}
          isDangerous={true}
      />
      
      {/* 左側主畫面：自動縮放 */}
      <div className="flex-1 flex flex-col relative min-h-0">
        <Layout 
          user={user} 
          viewMode={viewMode}
          activeStatsTab={statsTab}
          activeInstructionsTab={instructionsTab}
          activeRegistrationTab={registrationTab}
          activeAdminTab={adminTab}
          activeEngineerTab={engineerTab}
          onLogout={handleLogout} 
          onGoHome={handleGoHomeRequest} 
          onRoleChange={handleRoleChange}
          onLoginSuccess={handleLoginSuccess}
        >
          {renderContent()}
        </Layout>
      </div>

      <ScrollToTop />
      
      {/* 右側 i18n 編輯器：側邊欄模式 */}
      <FloatingI18nEditor />
    </div>
  );
};

export default App;
