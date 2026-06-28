import React, { useState, useEffect, useMemo } from 'react';
import { User, EventData } from '../types';
import { login, subscribeToEvents, logAction } from '../services/sheetService';
import { Lock, User as UserIcon, AlertCircle, X, ShieldCheck, Eye, EyeOff, Clock } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showUsername, setShowUsername] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
    
    // Rate Limiting State
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [loginLockCountdown, setLoginLockCountdown] = useState(0);
    
    // Service Personnel Modal State
    const [showServicePersonnel, setShowServicePersonnel] = useState(false);

    // Timer Effect for Login Lock
    useEffect(() => {
        if (!isOpen) return;
        
        const checkLock = () => {
            const lockUntilStr = localStorage.getItem('login_lock_until');
            if (lockUntilStr) {
                const lockUntil = parseInt(lockUntilStr, 10);
                const now = Date.now();
                if (lockUntil > now) {
                    const remaining = Math.ceil((lockUntil - now) / 1000);
                    setLoginLockCountdown(remaining);
                } else {
                    setLoginLockCountdown(0);
                    localStorage.removeItem('login_lock_until');
                    setLoginAttempts(0);
                    setError('');
                }
            }
        };

        checkLock();
        const interval = setInterval(checkLock, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const unsubEvents = subscribeToEvents((events) => {
            const active = events.find(e => e.is_active);
            setActiveEvent(active);
        });
        return () => unsubEvents();
    }, [isOpen]);

    const sortedServicePersonnel = useMemo(() => {
        if (!activeEvent?.servicePersonnel) return [];
        return [...activeEvent.servicePersonnel].sort((a, b) => a.order - b.order);
    }, [activeEvent]);

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loginLockCountdown > 0) return;

        setLoading(true);
        setError('');
        
        try {
            const user = await login(username, password);
            if (user) {
                setLoginAttempts(0);
                localStorage.removeItem('login_lock_until');
                logAction(user.name, '登入', '工作人員登入系統', { account: username, password: password });
                onLoginSuccess(user);
                onClose();
            } else {
                const newAttempts = loginAttempts + 1;
                setLoginAttempts(newAttempts);
                
                if (newAttempts >= 3) {
                    const lockTime = Date.now() + 180 * 1000;
                    localStorage.setItem('login_lock_until', lockTime.toString());
                    setLoginLockCountdown(180);
                    setError('錯誤次數過多，請等待 180 秒後再試。');
                } else {
                    setError(`帳號或密碼錯誤 (剩餘嘗試: ${3 - newAttempts}次)`);
                }
            }
        } catch (e) {
            setError('登入系統發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            {/* Inner Service Personnel Modal */}
            {showServicePersonnel ? (
                <div className="bg-white w-[600px] max-w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative z-[110]">
                    <div className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-slate-900 p-5 flex justify-between items-center shrink-0">
                        <h3 className="font-bold flex items-center text-lg tracking-wide">
                            <ShieldCheck className="w-5 h-5 mr-2" />
                            服務同工
                        </h3>
                        <button onClick={() => setShowServicePersonnel(false)} className="hover:bg-white/20 rounded-full p-2 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-0 overflow-y-auto bg-gray-50 flex-1 min-h-[300px]">
                        {sortedServicePersonnel.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gradient-to-t from-yellow-100 to-amber-200 text-black font-bold sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-4 w-1/3">單位</th>
                                        <th className="p-4 w-1/3">職位</th>
                                        <th className="p-4 w-1/3">姓名</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {sortedServicePersonnel.map((p) => (
                                        <tr key={p.id} className="hover:bg-indigo-50/20">
                                            <td className="p-4 text-gray-700">{p.unit}</td>
                                            <td className="p-4 text-gray-600">{p.calling}</td>
                                            <td className="p-4 text-black">{p.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-10 text-center text-gray-400">
                                目前尚無服務同工名單
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t bg-white text-center shrink-0">
                        <button 
                            onClick={() => setShowServicePersonnel(false)}
                            className="w-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-slate-900 px-6 py-3 rounded-lg font-bold hover:from-amber-400 hover:to-yellow-600 shadow-sm transition-colors"
                        >
                            返回登入
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden border border-white relative z-[105]">
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300"></div>
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-5 text-gray-400 hover:text-gray-700 transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">同工登入</h2>
                        <form onSubmit={handleLogin} className="space-y-6">
                            
                            <div className="mb-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowServicePersonnel(true)}
                                    className="w-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-slate-900 font-bold py-3 h-12 rounded-xl shadow-sm hover:from-amber-400 hover:to-yellow-600 transition-colors flex items-center justify-center text-sm"
                                >
                                    查看同工名單
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showUsername ? "text" : "password"}
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="pl-10 pr-10 block w-full border-gray-300 rounded-lg shadow-sm p-3.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-gray-50 focus:bg-white text-gray-900"
                                        placeholder="帳號"
                                        disabled={loginLockCountdown > 0}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowUsername(!showUsername)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        disabled={loginLockCountdown > 0}
                                    >
                                        {showUsername ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 block w-full border-gray-300 rounded-lg shadow-sm p-3.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-gray-50 focus:bg-white text-gray-900"
                                        placeholder="密碼"
                                        disabled={loginLockCountdown > 0}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        disabled={loginLockCountdown > 0}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || loginLockCountdown > 0}
                                className={`w-full flex justify-center py-3 h-12 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-all hover:-translate-y-0.5 mt-4 
                                    ${loginLockCountdown > 0 ? 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 cursor-not-allowed text-slate-900 opacity-80' : 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 hover:from-amber-400 hover:to-yellow-600'}
                                `}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        登入系統中...
                                    </span>
                                ) : loginLockCountdown > 0 ? (
                                    <span className="flex items-center">
                                        <Clock className="w-4 h-4 mr-2" />
                                        請等待 {loginLockCountdown} 秒
                                    </span>
                                ) : '登入'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginModal;
