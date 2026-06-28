import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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

    // Custom Unit List with Fixed additions
    const unitOptions = [...settings.units, t('stake.common.stake_name', '支聯會'), t('bus.a', 'A車'), t('bus.b', 'B車'), t('bus.c', 'C車'), t('bus.d', 'D車')];

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
                title={t('users.dialogs.deleteTitle', '刪除帳號')}
                message={t('users.dialogs.deleteMessage', '確定要刪除帳號 {{target}} 嗎？此操作無法復原。', { target: deleteTarget })}
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteTarget(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={!!pendingImportData}
                title={t('users.dialogs.importTitle', '確認匯入')}
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

            {/* Matrix Table - Orange Scheme - Renamed to 單位帳密 and removed outer bg if possible */}
            <div className="bg-white rounded-3xl shadow-xl border-4 border-orange-200 overflow-hidden mb-8 p-6">
                <div className="flex flex-col gap-4 mb-8 border-b-4 border-orange-100 pb-6">
                    <div>
                        <h2 className="font-black text-orange-900 flex items-center text-4xl mb-2">
                            <Key className="w-10 h-10 mr-4" /> {t('users.title', '帳號管理 (Account Mgt)')}
                        </h2>
                        <p className="text-orange-600 font-bold ml-14">{t('users.description', '管理資管與主辦人員帳號與權限')}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center justify-end">
                        <button onClick={handleExportUsers} className="text-sm bg-white text-orange-900 border-orange-300 border-2 px-4 py-2 rounded-xl hover:bg-orange-50 flex items-center font-black shadow-sm transition-all"><Download className="w-5 h-5 mr-2"/>{t('users.export', '匯出帳號 / Export')}</button>
                        <label className="text-sm bg-white text-orange-900 border-orange-300 border-2 px-4 py-2 rounded-xl hover:bg-orange-50 flex items-center cursor-pointer font-black shadow-sm transition-all">
                            <Upload className="w-5 h-5 mr-2"/>{t('users.import', '匯入帳號 / Import')}
                            <input type="file" className="hidden" accept=".json" onChange={handleImportUsers}/>
                        </label>
                        <button onClick={openAddModal} className="text-sm bg-orange-600 text-white border-orange-700 border-2 px-6 py-2.5 rounded-2xl hover:bg-orange-700 flex items-center font-black ml-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                            <Plus className="w-5 h-5 mr-2" /> {t('users.add', '新增帳號 / Add Account')}
                        </button>
                    </div>
                </div>

                {/* Engineer Table */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 overflow-hidden mb-6">
                    <div 
                        className="p-6 border-b-2 border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors flex justify-between items-center"
                        onClick={() => setIsEngineerExpanded(!isEngineerExpanded)}
                    >
                        <h3 className="font-black text-orange-900 flex items-center text-2xl">
                            <ShieldAlert className="w-7 h-7 mr-3" /> {t('users.engineerSection', '資管 / System Admin')}
                        </h3>
                        <div className="flex items-center gap-4">
                             {isEngineerExpanded ? <ChevronUp className="w-7 h-7 text-orange-900" /> : <ChevronDown className="w-7 h-7 text-orange-900" />}
                        </div>
                    </div>
                    
                    {isEngineerExpanded && (
                        <div className="p-4 border-b-2 border-orange-100 bg-white">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder={t('users.searchPlaceholder', '搜尋資管人員...')}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-orange-100 rounded-xl focus:border-orange-300 outline-none font-bold text-sm"
                                    value={engineerSearch}
                                    onChange={e => setEngineerSearch(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    {isEngineerExpanded && (
                        <>
                            {filteredEngineerUsers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-bold">{t('users.emptyEngineer', '目前無資管帳號')}</div>
                            ) : (
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1100px]">
                                        <thead className="bg-orange-100 text-orange-900 font-black border-b-2 border-orange-200 sticky top-0 z-30">
                                            <tr>
                                                <th className="p-4 text-center w-28">{t('users.columns.action', '操作 / Action')}</th>
                                                <th onClick={() => toggleSort('order')} className="p-4 border-x-2 border-orange-200 w-24 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.order', '排序編號')} <SortArrow field="order"/></th>
                                                <th onClick={() => toggleSort('unit')} className="p-4 border-r-2 border-orange-200 w-32 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.unit', '單位 / Stake')} <SortArrow field="unit"/></th>
                                                <th onClick={() => toggleSort('name')} className="p-4 border-r-2 border-orange-200 w-40 sticky left-0 bg-orange-100 z-20 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.name', '姓名 / Name')} <SortArrow field="name"/></th>
                                                <th className="p-4 border-r-2 border-orange-200 w-48">{t('users.columns.role', '權限 / Role')}</th>
                                                <th onClick={() => toggleSort('permission')} className="p-4 border-r-2 border-orange-200 w-40 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.permission', '操作權限')} <SortArrow field="permission"/></th>
                                                <th onClick={() => toggleSort('username')} className="p-4 border-r-2 border-orange-200 w-40 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.username', '帳號 / User ID')} <SortArrow field="username"/></th>
                                                <th className="p-4 border-r-2 border-orange-200 w-40">{t('users.columns.password', '密碼 / Password')}</th>
                                                <th onClick={() => toggleSort('phone')} className="p-4 border-r-2 border-orange-200 w-44 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.phone', '行動電話 / Phone')} <SortArrow field="phone"/></th>
                                                <th onClick={() => toggleSort('email')} className="p-4 w-56 cursor-pointer hover:bg-orange-200 transition-colors">{t('users.columns.email', '電子信箱 / Email')} <SortArrow field="email"/></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-orange-100 bg-white">
                                            {filteredEngineerUsers.map((u, idx) => (
                                                <tr key={`${u.username}-${idx}`} className="hover:bg-orange-50 transition-colors group">
                                                    <td className="p-4 text-center flex justify-center gap-2">
                                                        <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition-all hover:scale-110 shadow-sm border bg-white" title="Edit">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(u.username)} className="text-red-500 hover:bg-red-100 p-2 rounded-xl transition-all hover:scale-110 shadow-sm border bg-white" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="p-4 border-x-2 border-orange-100 text-orange-800 font-bold text-center">{u.order || 0}</td>
                                                    <td className="p-4 border-r-2 border-orange-100 text-gray-900 font-bold">{u.unit || '-'}</td>
                                                    <td className="p-4 border-r-2 border-orange-100 font-black text-gray-900 sticky left-0 bg-white z-10 group-hover:bg-orange-50">{u.name}</td>
                                                    <td className="p-4 border-r-2 border-orange-100">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(u.roles || [u.role]).map(r => (
                                                                <span key={r} className={`px-2 py-1 rounded-lg text-[10px] font-black ${getRoleStyle(r)} border shadow-sm`}>
                                                                    {getRoleLabel(r)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-r-2 border-orange-100">
                                                        {u.permission === 'read' ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-50 text-orange-800 border border-orange-100">
                                                                <Shield className="w-3 h-3 mr-1" /> {t('users.permissions.readOnly', '唯讀 (Read-only)')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-200">
                                                                <Edit2 className="w-3 h-3 mr-1" /> {t('users.permissions.edit', '編輯 (Edit)')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 border-r-2 border-orange-100 font-mono font-bold text-blue-700">{u.username}</td>
                                                    <td className="p-4 border-r-2 border-orange-100 font-mono font-bold text-gray-600">{u.password}</td>
                                                    <td className="p-4 border-r-2 border-orange-100 font-mono font-bold text-green-700">{u.phone || '-'}</td>
                                                    <td className="p-4 font-mono text-gray-500">{u.email || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Stake Admin Table */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-amber-200 overflow-hidden mb-6">
                    <div 
                        className="p-6 border-b-2 border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors flex justify-between items-center"
                        onClick={() => setIsStakeAdminExpanded(!isStakeAdminExpanded)}
                    >
                        <h3 className="font-black text-amber-900 flex items-center text-2xl">
                            <Shield className="w-7 h-7 mr-3" /> {t('users.stakeAdminSection', '主辦 / Stake Admin')}
                        </h3>
                        <div className="flex items-center gap-4">
                             {isStakeAdminExpanded ? <ChevronUp className="w-7 h-7 text-amber-900" /> : <ChevronDown className="w-7 h-7 text-amber-900" />}
                        </div>
                    </div>
                    
                    {isStakeAdminExpanded && (
                        <div className="p-4 border-b-2 border-amber-100 bg-white">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder={t('users.searchPlaceholderStake', '搜尋主辦人員...')}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-amber-100 rounded-xl focus:border-amber-300 outline-none font-bold text-sm"
                                    value={stakeAdminSearch}
                                    onChange={e => setStakeAdminSearch(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    {isStakeAdminExpanded && (
                        <>
                            {filteredStakeAdminUsers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-bold">{t('users.emptyStakeAdmin', '目前無主辦帳號')}</div>
                            ) : (
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1200px]">
                                        <thead className="bg-amber-100 text-amber-900 font-black border-b-2 border-amber-200 sticky top-0 z-30">
                                            <tr>
                                                <th className="p-4 text-center w-28">{t('users.columns.action', '操作 / Action')}</th>
                                                <th onClick={() => toggleSort('order')} className="p-4 border-x-2 border-amber-200 w-24 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.unit_number', '單位編號')} <SortArrow field="order"/></th>
                                                <th onClick={() => toggleSort('unit')} className="p-4 border-r-2 border-amber-200 w-32 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.unit', '單位 / Stake')} <SortArrow field="unit"/></th>
                                                <th onClick={() => toggleSort('name')} className="p-4 border-r-2 border-amber-200 w-40 sticky left-0 bg-amber-100 z-20 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.name', '姓名 / Name')} <SortArrow field="name"/></th>
                                                <th className="p-4 border-r-2 border-amber-200 w-48">{t('users.columns.role', '權限 / Role')}</th>
                                                <th onClick={() => toggleSort('permission')} className="p-4 border-r-2 border-amber-200 w-40 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.permission', '操作權限')} <SortArrow field="permission"/></th>
                                                <th onClick={() => toggleSort('username')} className="p-4 border-r-2 border-amber-200 w-40 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.username', '帳號 / User ID')} <SortArrow field="username"/></th>
                                                <th className="p-4 border-r-2 border-amber-200 w-40">{t('users.columns.password', '密碼 / Password')}</th>
                                                <th onClick={() => toggleSort('phone')} className="p-4 border-r-2 border-amber-200 w-44 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.phone', '行動電話 / Phone')} <SortArrow field="phone"/></th>
                                                <th onClick={() => toggleSort('email')} className="p-4 w-56 cursor-pointer hover:bg-amber-200 transition-colors">{t('users.columns.email', '電子信箱 / Email')} <SortArrow field="email"/></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-amber-100 bg-white">
                                            {filteredStakeAdminUsers.map((u, idx) => (
                                                <tr key={`${u.username}-${idx}`} className="hover:bg-amber-50 transition-colors group">
                                                    <td className="p-4 text-center flex justify-center gap-2">
                                                        {u.permission === 'read' ? (
                                                            <div className="text-gray-400 p-2" title="Read-only mode">
                                                                <Shield className="w-4 h-4" />
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition-all hover:scale-110 shadow-sm border bg-white" title="Edit">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => setDeleteTarget(u.username)} className="text-red-500 hover:bg-red-100 p-2 rounded-xl transition-all hover:scale-110 shadow-sm border bg-white" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="p-4 border-x-2 border-amber-100 text-amber-800 font-bold text-center">{u.order || 0}</td>
                                                    <td className="p-4 border-r-2 border-amber-100 text-gray-900 font-bold">{u.unit || '-'}</td>
                                                    <td className="p-4 border-r-2 border-amber-100 font-black text-gray-900 sticky left-0 bg-white z-10 group-hover:bg-amber-50">{u.name}</td>
                                                    <td className="p-4 border-r-2 border-amber-100">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(u.roles || [u.role]).map(r => (
                                                                <span key={r} className={`px-2 py-1 rounded-lg text-[10px] font-black ${getRoleStyle(r)} border shadow-sm`}>
                                                                    {getRoleLabel(r)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-r-2 border-amber-100">
                                                        {u.permission === 'read' ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                                                <Shield className="w-3 h-3 mr-1" /> {t('users.permissions.readOnly', '唯讀 (Read-only)')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                                                                <Edit2 className="w-3 h-3 mr-1" /> {t('users.permissions.edit', '編輯 (Edit)')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 border-r-2 border-amber-100 font-mono font-bold text-blue-700">{u.username}</td>
                                                    <td className="p-4 border-r-2 border-amber-100 font-mono font-bold text-gray-600">{u.password}</td>
                                                    <td className="p-4 border-r-2 border-amber-100 font-mono font-bold text-green-700">{u.phone || '-'}</td>
                                                    <td className="p-4 font-mono text-gray-500">{u.email || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal Form */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white w-[600px] max-w-full rounded-3xl shadow-2xl relative overflow-hidden flex flex-col border-4 border-orange-200">
                        <div className="bg-orange-100 p-6 flex justify-between items-center border-b-2 border-orange-200">
                            <h3 className="font-black text-orange-900 flex items-center text-xl">
                                {editingUsername ? <Edit2 className="w-6 h-6 mr-3" /> : <Plus className="w-6 h-6 mr-3" />} 
                                {editingUsername ? t('users.modal.editTitle', '編輯帳號 / Edit Account') : t('users.modal.addTitle', '新增帳號 / Add Account')}
                            </h3>
                            <button onClick={closeModal} className="hover:bg-orange-200 rounded-full p-2 transition-colors text-orange-900">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <form onSubmit={handleSaveUser} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.orderLabel', '支聯會編號 / ID')}</label>
                                        <input 
                                            type="number" 
                                            value={newUser.order || 0} 
                                            onChange={e => setNewUser({...newUser, order: parseInt(e.target.value) || 0})} 
                                            className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.unitLabel', '支聯會名稱 / Stake')}</label>
                                        <input 
                                            type="text"
                                            value={newUser.unit || ''} 
                                            onChange={e => setNewUser({...newUser, unit: e.target.value})} 
                                            className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold"
                                            placeholder={t('users.modal.unitPlaceholder', '請手動輸入單位名稱')}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.nameLabel', '姓名 / Name')}</label>
                                    <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" required placeholder={t('users.modal.nameLabel', '姓名 / Name')} />
                                </div>
                                
                                {((newUser.roles?.includes('stake_admin') || newUser.role === 'stake_admin')) ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.permissionLabel', '主辦權限 / Permission')}</label>
                                            <div className="flex gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewUser({...newUser, permission: 'edit'})}
                                                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm ${newUser.permission === 'edit' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-orange-200 text-orange-900 hover:bg-orange-50'}`}
                                                >
                                                    <Edit2 className="w-4 h-4 mr-2" /> {t('users.permissions.edit', '編輯 (Edit)')}
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewUser({...newUser, permission: 'read'})}
                                                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm ${newUser.permission === 'read' ? 'bg-amber-100 border-amber-600 text-amber-900 shadow-md' : 'bg-white border-orange-200 text-orange-900 hover:bg-orange-50'}`}
                                                >
                                                    <Shield className="w-4 h-4 mr-2" /> {t('users.permissions.readOnly', '唯讀 (Read-only)')}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.roleLabel', '權限 / Role (可複選 / Multi)')}</label>
                                            <div className="border-2 border-orange-100 p-4 rounded-xl bg-orange-50 max-h-40 overflow-y-auto space-y-1">
                                                {availableRoles.map(r => (
                                                    <div key={r.val} onClick={() => toggleRole(r.val as Role)} className="flex items-center cursor-pointer select-none hover:bg-orange-100 p-2 rounded-lg transition-colors">
                                                        <div className={`w-5 h-5 rounded-md mr-3 flex items-center justify-center border-2 ${ (newUser.roles?.includes(r.val as Role) || newUser.role === r.val) ? 'bg-orange-600 border-orange-600' : 'border-orange-300 bg-white' }`}>
                                                            {(newUser.roles?.includes(r.val as Role) || newUser.role === r.val) && <Check className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">{r.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.roleLabel', '權限 / Role (可複選 / Multi)')}</label>
                                            <div className="border-2 border-orange-100 p-4 rounded-xl bg-orange-50 max-h-40 overflow-y-auto space-y-1">
                                                {availableRoles.map(r => (
                                                    <div key={r.val} onClick={() => toggleRole(r.val as Role)} className="flex items-center cursor-pointer select-none hover:bg-orange-100 p-2 rounded-lg transition-colors">
                                                        <div className={`w-5 h-5 rounded-md mr-3 flex items-center justify-center border-2 ${ (newUser.roles?.includes(r.val as Role) || newUser.role === r.val) ? 'bg-orange-600 border-orange-600' : 'border-orange-300 bg-white' }`}>
                                                            {(newUser.roles?.includes(r.val as Role) || newUser.role === r.val) && <Check className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">{r.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.permissionLabel', '操作權限 / Action Permission')}</label>
                                            <div className="flex gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewUser({...newUser, permission: 'edit'})}
                                                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm ${newUser.permission === 'edit' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-orange-200 text-orange-900 hover:bg-orange-50'}`}
                                                >
                                                    <Edit2 className="w-4 h-4 mr-2" /> {t('users.permissions.edit', '編輯 (Edit)')}
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewUser({...newUser, permission: 'read'})}
                                                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm ${newUser.permission === 'read' ? 'bg-amber-100 border-amber-600 text-amber-900 shadow-md' : 'bg-white border-orange-200 text-orange-900 hover:bg-orange-50'}`}
                                                >
                                                    <Shield className="w-4 h-4 mr-2" /> {t('users.permissions.readOnly', '唯讀 (Read-only)')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.usernameLabel', '帳號 / User ID')}</label>
                                        <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" required placeholder={t('users.modal.usernameLabel', '帳號 / User ID')} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.passwordLabel', '密碼 / Password')}</label>
                                        <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" required placeholder={t('users.modal.passwordLabel', '密碼 / Password')} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.phoneLabel', '行動電話 / Phone')}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 w-4 h-4 text-orange-400" />
                                            <input type="text" value={newUser.phone || ''} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full border-2 border-orange-200 pl-10 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" placeholder="09xx-xxx-xxx" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-orange-900 uppercase mb-1">{t('users.modal.emailLabel', '電子信箱 / Email')}</label>
                                        <input type="email" value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border-2 border-orange-200 p-2.5 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-300 outline-none font-bold" placeholder="example@gmail.com" />
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button type="submit" className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-orange-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex items-center transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                                        <Save className="w-5 h-5 mr-3" /> {t('users.modal.saveButton', '儲存帳號 / Save Account')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
};

export default UsersTab;