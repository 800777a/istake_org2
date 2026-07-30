import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { User, Role, GlobalSettings } from '../../types';
import { saveUser, deleteUser, subscribeToUsers } from '../../services/userService';
import { subscribeToSettings } from '../../services/settingsService';
import { Key, Trash2, Plus, Download, Upload, Edit2, X, Save, Check, ArrowUpDown, ChevronUp, ChevronDown, Shield, ShieldAlert, Phone, Search, Info } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import Toast, { ToastType } from '../Toast';

interface UsersTabProps {
    settings: GlobalSettings;
    hiddenRoles?: string[];
}

const UsersTab: React.FC<UsersTabProps> = ({ settings, hiddenRoles = [] }) => {
    const { t, tString } = useI18n();
    const [users, setUsers] = useState<User[]>([]);
    const [newUser, setNewUser] = useState<User>({ username: '', password: '', role: 'stake_admin', name: '', unit: '', roles: ['stake_admin'], order: 0, email: '', phone: '', permission: 'edit' });
    const [editingUsername, setEditingUsername] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [sortField, setSortField] = useState<string>('order');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    // Expansion and Search State
    const [isEngineerExpanded, setIsEngineerExpanded] = useState(true);
    const [isStakeAdminExpanded, setIsStakeAdminExpanded] = useState(true);
    const [engineerSearch, setEngineerSearch] = useState('');
    const [stakeAdminSearch, setStakeAdminSearch] = useState('');
    
    // Dialog State
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [pendingImportData, setPendingImportData] = useState<User[] | null>(null);

    useEffect(() => {
        const unsub = subscribeToUsers((u) => {
            // Deduplicate by username to prevent UI issues and fix the bug where multiple docs might exist
            const uniqueUsersMap = new Map<string, User>();
            u.forEach(user => {
                if (!user.username || (user as any).deleted) return;
                const existing = uniqueUsersMap.get(user.username);
                if (!existing || ((user as any).updated_at || '') > ((existing as any).updated_at || '')) {
                    uniqueUsersMap.set(user.username, user);
                }
            });
            setUsers(Array.from(uniqueUsersMap.values()));
        });
        return () => unsub();
    }, []);

    // Filter Users based on hiddenRoles
    const displayedUsers = users.filter(u => {
        if (hiddenRoles.length > 0) {
            const roles = u.roles || [u.role];
            // If user has ANY of the hidden roles, exclude them
            return !roles.some(r => hiddenRoles.includes(r));
        }
        return true;
    });

    // Sort Logic
    const sortedUsers = [...displayedUsers].sort((a, b) => {
        const valA = (a as any)[sortField] || '';
        const valB = (b as any)[sortField] || '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const engineerUsers = sortedUsers.filter(u => (u.roles || [u.role]).includes('engineer'));
    const stakeAdminUsers = sortedUsers.filter(u => (u.roles || [u.role]).includes('stake_admin'));

    const filteredEngineerUsers = engineerUsers.filter(u => 
        u.name.toLowerCase().includes(engineerSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(engineerSearch.toLowerCase()) ||
        (u.unit || '').toLowerCase().includes(engineerSearch.toLowerCase())
    );

    const filteredStakeAdminUsers = stakeAdminUsers.filter(u => 
        u.name.toLowerCase().includes(stakeAdminSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(stakeAdminSearch.toLowerCase()) ||
        (u.unit || '').toLowerCase().includes(stakeAdminSearch.toLowerCase())
    );

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortArrow = ({ field }: { field: string }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 inline" />;
        return sortDirection === 'asc' 
            ? <ChevronUp className="w-3 h-3 ml-1 text-orange-600 inline" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-orange-600 inline" />;
    };

    // Update Role List Order and Labels
    const internalHiddenRoles = ['supervisor', 'navigator', 'unit_admin'];
    const availableRoles = [
        {val: 'stake_admin', label: t('users.roles.stake_admin', '主辦 / Stake Admin')},
        {val: 'engineer', label: t('users.roles.engineer', '資管 / System Admin')},
        {val: 'member', label: t('users.roles.member', '成員 / Member')},
    ].filter(r => !internalHiddenRoles.includes(r.val));

    // V002: Get unit options from Billing Engine if available, fallback to settings.units
    const unitOptions = React.useMemo(() => {
        const baseUnits = settings.billingConfig?.units?.map(u => u.shortName) || settings.units || [];
        return [...baseUnits, tString('stake.common.stake_name', '支聯會'), tString('bus.a', 'A車'), tString('bus.b', 'B車'), tString('bus.c', 'C車'), tString('bus.d', 'D車')];
    }, [settings, tString]);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation with feedback
        if (!newUser.username || !newUser.password || !newUser.name) {
            setMsg(t('users.alerts.validationError', '請填寫必填欄位：帳號、密碼、姓名'));
            return;
        }
        
        try {
            const primaryRole = newUser.roles && newUser.roles.length > 0 ? newUser.roles[0] : newUser.role;
            const userToSave = { ...newUser, role: primaryRole };

            await saveUser(userToSave);

            // Handle Renaming
            if (editingUsername && editingUsername !== newUser.username) {
                await deleteUser(editingUsername);
            }

            closeModal();
            setMsgType('success');
            setMsg(t('users.alerts.saved', '帳號已儲存'));
        } catch (error: any) {
            setMsgType('error');
            setMsg(t('users.alerts.saveError', '儲存失敗: {{error}}', { error: error.message }));
        }
    };

    const openAddModal = () => {
        setNewUser({ username: '', password: '', role: 'stake_admin', name: '', unit: '', roles: ['stake_admin'], order: 0, email: '', phone: '', permission: 'edit' });
        setEditingUsername(null);
        setShowModal(true);
    };

    const handleEditUser = (user: User) => {
        setNewUser({ ...user, permission: user.permission || 'edit' });
        setEditingUsername(user.username);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUsername(null);
        setNewUser({ username: '', password: '', role: 'stake_admin', name: '', unit: '', roles: ['stake_admin'], order: 0, email: '', phone: '', permission: 'edit' });
    };

    const confirmDeleteUser = async () => {
        if (deleteTarget) {
            await deleteUser(deleteTarget);
            setDeleteTarget(null);
        }
    };

    const toggleRole = (role: Role) => {
        const currentRoles = newUser.roles || [];
        if (currentRoles.includes(role)) {
            setNewUser({ ...newUser, roles: currentRoles.filter(r => r !== role) });
        } else {
            setNewUser({ ...newUser, roles: [...currentRoles, role] });
        }
    };

    const getRoleLabel = (role: string) => {
        switch(role) {
            case 'engineer': return t('users.roles.engineer', '資管 / System Admin');
            case 'stake_admin': return t('users.roles.stake_admin', '主辦 / Stake Admin');
            case 'member': return t('users.roles.member', '成員 / Member');
            default: return role;
        }
    };

    const getRoleStyle = (role: string) => {
        switch(role) {
            case 'engineer': return 'bg-red-100 text-red-800'; // 淡紅
            case 'stake_admin': return 'bg-yellow-100 text-yellow-800'; // 淡黃
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Import Users
    const handleImportUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const imported = JSON.parse(evt.target?.result as string);
                if (Array.isArray(imported)) {
                    // Set State to trigger confirm dialog
                    setPendingImportData(imported);
                } else {
                    setMsg(t('users.alerts.formatError', '格式錯誤：需為使用者陣列'));
                }
            } catch(e) {
                setMsg(t('users.alerts.importError', '匯入失敗：檔案格式錯誤'));
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    const executeImport = async () => {
        if (!pendingImportData) return;
        
        let count = 0;
        for (const u of pendingImportData) {
            await saveUser(u);
            count++;
        }
        
        setPendingImportData(null);
        setMsg(t('users.alerts.importSuccess', '匯入成功：共更新/新增 {{count}} 筆帳號', { count }));
    };

    // Export Users
    const handleExportUsers = () => {
        const blob = new Blob([JSON.stringify(displayedUsers, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `users_export_${new Date().toISOString().split('T')[0].replace(/-/g,'_')}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in relative max-w-full">
            <ConfirmDialog 
                isOpen={!!deleteTarget}
                title={tString('users.dialogs.deleteTitle', '刪除帳號')}
                message={t('users.dialogs.deleteMessage', '確定要刪除帳號 {{target}} 嗎？此操作無法復原。', { target: deleteTarget })}
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteTarget(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!pendingImportData}
                title={tString('users.dialogs.importTitle', '確認匯入')}
                message={t('users.dialogs.importMessage', '讀取成功！共包含 {{count}} 筆帳號資料。\n確定要覆蓋現有資料嗎？確定後將重建資料。', { count: pendingImportData?.length })}
                onConfirm={executeImport}
                onCancel={() => setPendingImportData(null)}
                isDangerous={true}
            />

            {/* Toast Notification */}
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />

            {/* Main Header Card - Modern Business Style */}
            <div className="bg-white rounded shadow-lg border border-indigo-100 overflow-hidden mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-indigo-900 border-b border-indigo-800 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded border border-white/10 backdrop-blur-sm shadow-lg">
                            <Key className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-2xl">
                                {t('users.title', '帳號管理')}
                            </h2>
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5 opacity-80">System Access & Identity Management</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExportUsers} className="flex-1 sm:flex-none text-xs bg-white/10 text-white border border-white/20 px-4 py-2 rounded hover:bg-white/20 flex items-center justify-center font-bold shadow-sm transition-all backdrop-blur-sm">
                                <Download className="w-4 h-4 mr-2 text-indigo-300"/>{t('users.export', '匯出')}
                            </button>
                            <label className="flex-1 sm:flex-none text-xs bg-white/10 text-white border border-white/20 px-4 py-2 rounded hover:bg-white/20 flex items-center justify-center cursor-pointer font-bold shadow-sm transition-all backdrop-blur-sm">
                                <Upload className="w-4 h-4 mr-2 text-indigo-300"/>{t('users.import', '匯入')}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportUsers}/>
                            </label>
                        </div>
                        <button onClick={openAddModal} className="w-full sm:w-auto text-xs bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center justify-center font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                            <Plus className="w-4 h-4 mr-2" /> {t('users.add', '新增帳號')}
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8">

                    {/* Engineer Table - Modern Business Style */}
                    <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                        <div 
                            className="px-6 py-4 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors flex justify-between items-center"
                            onClick={() => setIsEngineerExpanded(!isEngineerExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5 text-rose-600" />
                                <h3 className="font-bold text-slate-800 text-base">
                                    {t('users.engineerSection', '資管 (System Admin)')}
                                </h3>
                            </div>
                            <div className="text-slate-400">
                                 {isEngineerExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                        
                        {isEngineerExpanded && (
                            <div className="animate-fade-in">
                                <div className="p-4 bg-white border-b border-slate-100">
                                    <div className="relative max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder={tString('users.searchPlaceholder', '搜尋資管人員...')}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none font-medium text-sm transition-all"
                                            value={engineerSearch}
                                            onChange={e => setEngineerSearch(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                
                                {filteredEngineerUsers.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 italic text-sm">{t('users.emptyEngineer', '目前無資管帳號')}</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left border-collapse table-fixed min-w-[1000px]">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                                                <tr>
                                                    <th className="px-4 py-3 text-center w-28 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">{t('users.columns.action', '操作')}</th>
                                                    <th onClick={() => toggleSort('order')} className="px-4 py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.order', '序')} <SortArrow field="order"/></th>
                                                    <th onClick={() => toggleSort('unit')} className="px-4 py-3 w-32 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.unit', '單位')} <SortArrow field="unit"/></th>
                                                    <th onClick={() => toggleSort('name')} className="px-4 py-3 w-40 sticky left-28 bg-slate-50 z-20 border-r border-slate-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.name', '姓名')} <SortArrow field="name"/></th>
                                                    <th className="px-4 py-3 w-40">{t('users.columns.role', '身分權限')}</th>
                                                    <th onClick={() => toggleSort('permission')} className="px-4 py-3 w-32 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.permission', '權限')} <SortArrow field="permission"/></th>
                                                    <th onClick={() => toggleSort('username')} className="px-4 py-3 w-40 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.username', '帳號')} <SortArrow field="username"/></th>
                                                    <th className="px-4 py-3 w-40">{t('users.columns.password', '密碼')}</th>
                                                    <th onClick={() => toggleSort('phone')} className="px-4 py-3 w-44 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.phone', '電話')} <SortArrow field="phone"/></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {filteredEngineerUsers.map((u, idx) => (
                                                    <tr key={`${u.username}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-4 py-4 text-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 flex justify-center gap-2">
                                                            <button onClick={() => handleEditUser(u)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all border border-slate-100" title="Edit">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setDeleteTarget(u.username)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all border border-slate-100" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-500 font-medium text-center">{u.order || 0}</td>
                                                        <td className="px-4 py-4 text-slate-900 font-bold">{u.unit || '-'}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-900 sticky left-28 bg-white z-10 group-hover:bg-slate-50 transition-colors border-r border-slate-100">{u.name}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(u.roles || [u.role]).map(r => (
                                                                    <span key={r} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                                        {getRoleLabel(r)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${u.permission === 'read' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                                                                {u.permission === 'read' ? t('users.permissions.readOnly', '唯讀') : t('users.permissions.edit', '編輯')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 font-mono text-xs font-bold text-sky-700 uppercase tracking-tighter">{u.username}</td>
                                                        <td className="px-4 py-4 font-mono text-xs text-slate-500">{u.password}</td>
                                                        <td className="px-4 py-4 font-mono text-xs text-slate-600">{u.phone || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stake Admin Table - Modern Business Style */}
                    <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                        <div 
                            className="px-6 py-4 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors flex justify-between items-center"
                            onClick={() => setIsStakeAdminExpanded(!isStakeAdminExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-sky-600" />
                                <h3 className="font-bold text-slate-800 text-base">
                                    {t('users.stakeAdminSection', '主辦 (Stake Admin)')}
                                </h3>
                            </div>
                            <div className="text-slate-400">
                                 {isStakeAdminExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                        
                        {isStakeAdminExpanded && (
                            <div className="animate-fade-in">
                                <div className="p-4 bg-white border-b border-slate-100">
                                    <div className="relative max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder={tString('users.searchPlaceholderStake', '搜尋主辦人員...')}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none font-medium text-sm transition-all"
                                            value={stakeAdminSearch}
                                            onChange={e => setStakeAdminSearch(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                
                                {filteredStakeAdminUsers.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 italic text-sm">{t('users.emptyStakeAdmin', '目前無主辦帳號')}</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left border-collapse table-fixed min-w-[1000px]">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                                                <tr>
                                                    <th className="px-4 py-3 text-center w-28 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">{t('users.columns.action', '操作')}</th>
                                                    <th onClick={() => toggleSort('order')} className="px-4 py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.unit_number', '序')} <SortArrow field="order"/></th>
                                                    <th onClick={() => toggleSort('unit')} className="px-4 py-3 w-32 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.unit', '單位')} <SortArrow field="unit"/></th>
                                                    <th onClick={() => toggleSort('name')} className="px-4 py-3 w-40 sticky left-28 bg-slate-50 z-20 border-r border-slate-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.name', '姓名')} <SortArrow field="name"/></th>
                                                    <th className="px-4 py-3 w-40">{t('users.columns.role', '身分權限')}</th>
                                                    <th onClick={() => toggleSort('permission')} className="px-4 py-3 w-32 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.permission', '權限')} <SortArrow field="permission"/></th>
                                                    <th onClick={() => toggleSort('username')} className="px-4 py-3 w-40 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.username', '帳號')} <SortArrow field="username"/></th>
                                                    <th className="px-4 py-3 w-40">{t('users.columns.password', '密碼')}</th>
                                                    <th onClick={() => toggleSort('phone')} className="px-4 py-3 w-44 cursor-pointer hover:bg-slate-100 transition-colors">{t('users.columns.phone', '電話')} <SortArrow field="phone"/></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {filteredStakeAdminUsers.map((u, idx) => (
                                                    <tr key={`${u.username}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-4 py-4 text-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 flex justify-center gap-2">
                                                            <button onClick={() => handleEditUser(u)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all border border-slate-100" title="Edit">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setDeleteTarget(u.username)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all border border-slate-100" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-500 font-medium text-center">{u.order || 0}</td>
                                                        <td className="px-4 py-4 text-slate-900 font-bold">{u.unit || '-'}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-900 sticky left-28 bg-white z-10 group-hover:bg-slate-50 transition-colors border-r border-slate-100">{u.name}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(u.roles || [u.role]).map(r => (
                                                                    <span key={r} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                                        {getRoleLabel(r)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${u.permission === 'read' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                                                                {u.permission === 'read' ? t('users.permissions.readOnly', '唯讀') : t('users.permissions.edit', '編輯')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 font-mono text-xs font-bold text-sky-700 uppercase tracking-tighter">{u.username}</td>
                                                        <td className="px-4 py-4 font-mono text-xs text-slate-500">{u.password}</td>
                                                        <td className="px-4 py-4 font-mono text-xs text-slate-600">{u.phone || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Form - Modern Business Style */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={closeModal} />
                    <div className="bg-white w-[500px] max-w-full rounded shadow-2xl relative overflow-hidden flex flex-col border border-slate-200">
                        <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-900 rounded">
                                    {editingUsername ? <Edit2 className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />} 
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                    {editingUsername ? t('users.modal.editTitle', '編輯帳號') : t('users.modal.addTitle', '新增帳號')}
                                </h3>
                            </div>
                            <button onClick={closeModal} className="hover:bg-slate-200 rounded-full p-2 transition-colors text-slate-400 hover:text-slate-900">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <form onSubmit={handleSaveUser} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.modal.orderLabel', '支聯會編號')}</label>
                                        <input 
                                            type="number" 
                                            value={newUser.order || 0} 
                                            onChange={e => setNewUser({...newUser, order: parseInt(e.target.value) || 0})} 
                                            className="w-full border border-slate-200 h-10 rounded px-3 text-sm text-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none font-bold transition-all" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.modal.unitLabel', '單位名稱')}</label>
                                        <select 
                                            value={newUser.unit || ''} 
                                            onChange={e => setNewUser({...newUser, unit: e.target.value})} 
                                            className="w-full border border-slate-200 h-10 rounded px-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none font-bold transition-all"
                                        >
                                            <option value="">{tString('users.modal.unitPlaceholder', '單位名稱')}</option>
                                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.modal.nameLabel', '姓名')}</label>
                                    <input 
                                        type="text" 
                                        value={newUser.name} 
                                        onChange={e => setNewUser({...newUser, name: e.target.value})} 
                                        className="w-full border border-slate-200 h-10 rounded px-4 text-sm text-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none font-bold transition-all" 
                                        required 
                                        placeholder={tString('users.modal.nameLabel', '姓名')} 
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.modal.permissionLabel', '操作權限')}</label>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setNewUser({...newUser, permission: 'edit'})}
                                                className={`flex-1 flex items-center justify-center h-10 rounded border text-sm font-bold transition-all ${newUser.permission === 'edit' ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Edit2 className="w-4 h-4 mr-2" /> {t('users.permissions.edit', '可編輯')}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setNewUser({...newUser, permission: 'read'})}
                                                className={`flex-1 flex items-center justify-center h-10 rounded border text-sm font-bold transition-all ${newUser.permission === 'read' ? 'bg-amber-100 border-amber-600 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Shield className="w-4 h-4 mr-2" /> {t('users.permissions.readOnly', '僅唯讀')}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.modal.roleLabel', '角色身分 (可複選)')}</label>
                                        <div className="border border-slate-100 p-3 rounded bg-slate-50 max-h-40 overflow-y-auto space-y-1">
                                            {availableRoles.map(r => (
                                                <div key={r.val} onClick={() => toggleRole(r.val as Role)} className="flex items-center cursor-pointer select-none hover:bg-white p-2 rounded transition-all group">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all mr-3 ${ (newUser.roles?.includes(r.val as Role) || newUser.role === r.val) ? 'bg-sky-600 border-sky-600' : 'border-slate-300 bg-white group-hover:border-sky-500' }`}>
                                                        {(newUser.roles?.includes(r.val as Role) || newUser.role === r.val) && <Check className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <span className={`text-sm font-bold ${ (newUser.roles?.includes(r.val as Role) || newUser.role === r.val) ? 'text-sky-700' : 'text-slate-600' }`}>{r.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.columns.username', '帳號 (User ID)')}</label>
                                            <input 
                                                type="text" 
                                                value={newUser.username} 
                                                onChange={e => setNewUser({...newUser, username: e.target.value})} 
                                                className="w-full border border-slate-200 h-10 rounded px-3 text-sm font-mono font-bold text-sky-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all uppercase" 
                                                required 
                                                placeholder="ID"
                                                disabled={!!editingUsername}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.columns.phone', '電話')}</label>
                                            <input 
                                                type="tel" 
                                                value={newUser.phone || ''} 
                                                onChange={e => setNewUser({...newUser, phone: e.target.value})} 
                                                className="w-full border border-slate-200 h-10 rounded px-3 text-sm font-mono focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all" 
                                                placeholder="09xx..." 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.columns.password', '密碼')}</label>
                                            <input 
                                                type="text" 
                                                value={newUser.password} 
                                                onChange={e => setNewUser({...newUser, password: e.target.value})} 
                                                className="w-full border border-slate-200 h-10 rounded px-3 text-sm font-mono focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all" 
                                                required 
                                                placeholder="PW" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('users.columns.email', 'Email')}</label>
                                            <input 
                                                type="email" 
                                                value={newUser.email || ''} 
                                                onChange={e => setNewUser({...newUser, email: e.target.value})} 
                                                className="w-full border border-slate-200 h-10 rounded px-3 text-sm font-mono focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all" 
                                                placeholder="Email" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={closeModal} 
                                        className="flex-1 h-11 border border-slate-200 text-slate-600 rounded text-sm font-bold hover:bg-slate-50 transition-all"
                                    >
                                        {t('common.cancel', '取消')}
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 h-11 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> {t('common.save', '儲存帳號')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTab;