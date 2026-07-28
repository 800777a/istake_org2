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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Inner Service Personnel Modal */}
            {showServicePersonnel ? (
                <div className="bg-white w-[600px] max-w-full rounded shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative z-[110] border-2 border-slate-100 animate-in zoom-in-95 duration-300">
                    <div className="bg-indigo-900 text-white p-6 flex justify-between items-center shrink-0 border-b border-indigo-950">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded border border-white/10">
                                <ShieldCheck className="w-6 h-6 text-indigo-300" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl tracking-tight leading-none mb-1">工作人員名單</h3>
                                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest opacity-60">Service Personnel Registry</p>
                            </div>
                        </div>
                        <button onClick={() => setShowServicePersonnel(false)} className="hover:bg-white/10 rounded p-3 transition-all active:scale-90"><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-0 overflow-y-auto bg-slate-50 flex-1 min-h-[300px] custom-scrollbar">
                        {sortedServicePersonnel.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/80 backdrop-blur-md text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] sticky top-0 z-20 shadow-sm border-b border-slate-100">
                                    <tr>
                                        <th className="p-5 w-1/3">單位 (Unit)</th>
                                        <th className="p-5 w-1/3">職位 (Position)</th>
                                        <th className="p-5 w-1/3">姓名 (Name)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {sortedServicePersonnel.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-5 text-slate-600 font-bold text-sm">{p.unit}</td>
                                            <td className="p-5 text-slate-400 font-medium text-xs">{p.calling}</td>
                                            <td className="p-5 text-slate-900 font-black text-sm">{p.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-16 text-center flex flex-col items-center justify-center">
                                <AlertCircle className="w-16 h-16 text-slate-200 mb-6" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">目前尚無服務同工名單</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                        <button 
                            onClick={() => setShowServicePersonnel(false)}
                            className="w-full bg-white text-slate-900 h-14 rounded font-black text-sm hover:bg-slate-900 hover:text-white transition-all shadow-md active:scale-95 border-2 border-slate-100"
                        >
                            返回登入入口
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white w-full max-w-sm rounded shadow-2xl overflow-hidden border-2 border-slate-100 relative z-[105] animate-in zoom-in-95 duration-300">
                    <div className="h-2 w-full bg-indigo-600"></div>
                    <button 
                        onClick={onClose}
                        className="absolute right-6 top-8 text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-50 rounded active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="p-10">
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-16 h-16 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 mb-6 shadow-inner border border-indigo-100">
                                <Lock size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">同工系統登入</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-3">Personnel Authorization required</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">管理帳號 (ID)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <UserIcon className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type={showUsername ? "text" : "password"}
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="pl-14 pr-12 block w-full border-slate-100 rounded shadow-sm h-14 border-2 focus:border-indigo-600 transition-all text-sm bg-slate-50 focus:bg-white text-slate-900 font-black outline-none"
                                            placeholder="Account ID"
                                            disabled={loginLockCountdown > 0}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowUsername(!showUsername)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-600 focus:outline-none"
                                            disabled={loginLockCountdown > 0}
                                        >
                                            {showUsername ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">驗證密碼 (Token)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-14 pr-12 block w-full border-slate-100 rounded shadow-sm h-14 border-2 focus:border-indigo-600 transition-all text-sm bg-slate-50 focus:bg-white text-slate-900 font-black outline-none"
                                            placeholder="Security Password"
                                            disabled={loginLockCountdown > 0}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-600 focus:outline-none"
                                            disabled={loginLockCountdown > 0}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center text-[11px] font-black bg-rose-50 text-rose-600 p-4 rounded border-2 border-rose-100 animate-in shake duration-300">
                                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="pt-4 space-y-4">
                                <button
                                    type="submit"
                                    disabled={loading || loginLockCountdown > 0}
                                    className={`w-full flex justify-center items-center h-14 px-6 rounded shadow-xl text-base font-black transition-all hover:-translate-y-1 active:scale-95
                                        ${loginLockCountdown > 0 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}
                                    `}
                                >
                                    {loading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            正在驗證
                                        </span>
                                    ) : loginLockCountdown > 0 ? (
                                        <span className="flex items-center">
                                            <Clock className="w-5 h-5 mr-3" />
                                            請等待 {loginLockCountdown} 秒
                                        </span>
                                    ) : '立即登入系統'}
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => setShowServicePersonnel(true)}
                                    className="w-full text-slate-400 font-black py-2 text-xs hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    <ShieldCheck size={16} />
                                    查看服務同工名單
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginModal;
