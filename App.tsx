import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegistrationForm from './pages/RegistrationForm';
import StakeAdmin from './pages/StakeAdmin';
import Engineer from './pages/Engineer';
import PublicStats from './pages/PublicStats'; 
import Instructions from './pages/Instructions';
import { Role, User } from './types';
import { getCurrentUser, logout, login, updateCurrentSession } from './services/sheetService';
import ConfirmDialog from './components/ConfirmDialog';
import FloatingI18nEditor from './src/components/i18n/FloatingI18nEditor';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'login' | 'guest' | 'public_stats' | 'instructions' | 'feedback'>('login');
  const [loading, setLoading] = useState(true);
  
  // V128: Dirty State Management
  const [isRegistrationDirty, setIsRegistrationDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // V190: Flash Message for PublicStats (e.g. "送出成功")
  const [publicStatsMessage, setPublicStatsMessage] = useState<string>('');

  useEffect(() => {
    // 檢查是否有登入 Session
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setViewMode('login'); 
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setViewMode('login');
  };

  const handleGuestAccess = () => {
    setViewMode('guest');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setViewMode('login');
    setIsRegistrationDirty(false); // Reset dirty state
  };

  const executeGoHome = () => {
      logout();
      setUser(null);
      setViewMode('login');
      setIsRegistrationDirty(false);
      setShowExitConfirm(false);
  };

  const handleGoHomeRequest = () => {
      if (isRegistrationDirty) {
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
  const handleRoleChange = (newRole: Role | 'public_stats' | 'instructions' | 'feedback') => {
      if (newRole === 'public_stats') {
          handleGoToStats();
          return;
      }
      if (newRole === 'instructions') {
          handleGoToInstructions();
          return;
      }
      if (newRole === 'feedback') {
          handleGoToFeedback();
          return;
      }
      if (user) {
          const updatedUser = { ...user, role: newRole as Role };
          setUser(updatedUser);
          updateCurrentSession(updatedUser);
          setViewMode('login'); 
      }
  };

  const handleClearStatsMessage = () => {
      setPublicStatsMessage('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;

  // 決定顯示哪個畫面
  const renderContent = () => {
    // 1. 已登入使用者
    if (user) {
        // Special case for public_stats view mode while logged in
        if (viewMode === 'public_stats') {
            return <PublicStats 
                onGoHome={() => setViewMode('login')} 
                onGoRegister={() => setViewMode('login')} 
                onGoToInstructions={handleGoToInstructions} 
                initialMessage={publicStatsMessage}
                onClearMessage={handleClearStatsMessage}
            />;
        }

        // Special case for instructions view mode while logged in (Fix for "Go to Registration" error)
        if (viewMode === 'instructions') {
            return <Instructions 
                onBack={() => setViewMode('login')} 
                onGoRegister={() => setViewMode('login')}
                onGoFeedback={handleGoToFeedback}
            />;
        }

        // Special case for feedback view mode while logged in
        if (viewMode === 'feedback') {
            return <Login 
                onLoginSuccess={handleLoginSuccess} 
                onGuestAccess={handleGuestAccess} 
                onGoToStats={handleGoToStats} 
                onGoToInstructions={handleGoToInstructions}
                initialShowComments={true}
            />;
        }

        // Special case for guest view mode (Register button) while logged in (Fix for "No Action" on Home)
        if (viewMode === 'guest') {
             return <RegistrationForm 
                onGoHome={() => setViewMode('login')} 
                onGoToStats={handleGoToStats} 
                setIsDirty={setIsRegistrationDirty}
            />;
        }

        switch (user.role) {
          case 'stake_admin': return <StakeAdmin currentUser={user} />;
          case 'engineer': return <Engineer />;
          // New: Allow staff to view Member page explicitly
          case 'member': return <RegistrationForm 
            onGoToStats={handleGoToStats} 
            setIsDirty={setIsRegistrationDirty}
          />;
          // New: Allow staff to view Home/Login page explicitly without logging out
          case 'home' as any: return <Login 
            onLoginSuccess={handleLoginSuccess} 
            onGuestAccess={handleGuestAccess} 
            onGoToStats={handleGoToStats} 
            onGoToInstructions={handleGoToInstructions}
          />;
          
          default: return <RegistrationForm 
            onGoToStats={handleGoToStats} 
            setIsDirty={setIsRegistrationDirty}
          />;
        }
    }

    // 2. 未登入 - 訪客/成員模式
    if (viewMode === 'guest') {
        return <RegistrationForm 
            onGoHome={handleGoHomeRequest} 
            onGoToStats={handleGoToStats} 
            setIsDirty={setIsRegistrationDirty}
        />;
    }

    // 3. 未登入 - 公開查詢
    if (viewMode === 'public_stats') {
        return <PublicStats 
            onGoHome={handleGoHomeRequest} 
            onGoRegister={handleGuestAccess} 
            onGoToInstructions={handleGoToInstructions} 
            initialMessage={publicStatsMessage}
            onClearMessage={handleClearStatsMessage}
        />;
    }

    // 4. 未登入 - 說明頁面
    if (viewMode === 'instructions') {
        return <Instructions 
            onBack={() => setViewMode('login')} 
            onGoRegister={handleGuestAccess}
            onGoFeedback={handleGoToFeedback}
        />;
    }

    // 5. 未登入 - 留言分頁
    if (viewMode === 'feedback') {
        return <Login 
            onLoginSuccess={handleLoginSuccess} 
            onGuestAccess={handleGuestAccess} 
            onGoToStats={handleGoToStats} 
            onGoToInstructions={handleGoToInstructions}
            initialShowComments={true}
        />;
    }

    // 6. 預設 - 登入畫面
    return <Login 
        onLoginSuccess={handleLoginSuccess} 
        onGuestAccess={handleGuestAccess} 
        onGoToStats={handleGoToStats} 
        onGoToInstructions={handleGoToInstructions}
    />;
  };
  
  return (
    <>
      <ConfirmDialog 
          isOpen={showExitConfirm}
          title="放棄報名？"
          message="您目前已填寫資料。確定要放棄報名，回到首頁嗎？"
          confirmText="確定放棄"
          onConfirm={executeGoHome}
          onCancel={() => setShowExitConfirm(false)}
          isDangerous={true}
      />
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        onGoHome={handleGoHomeRequest} 
        onRoleChange={handleRoleChange}
        onLoginSuccess={handleLoginSuccess}
      >
        {renderContent()}
      </Layout>
      <FloatingI18nEditor />
    </>
  );
};

export default App;
