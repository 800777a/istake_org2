import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Registration, GlobalSettings, RegStatus, EventData } from '../../types';
import { Edit2, Search, User } from 'lucide-react';
import EditMemberModal from '../EditMemberModal';

interface SpecializedRegistrationListProps {
    status: RegStatus;
    title: string;
    registrations: Registration[];
    settings: GlobalSettings;
    onRefresh: () => void;
    onPushToEditor?: (content: string) => void;
}

const SpecializedRegistrationList: React.FC<SpecializedRegistrationListProps> = ({ status, title, registrations, settings, onRefresh, onPushToEditor }) => {
    const { t } = useTranslation();
    const [searchName, setSearchName] = useState('');
    const [editTarget, setEditTarget] = useState<Registration | null>(null);

    const filteredRegs = useMemo(() => {
        return registrations.filter(r => r.status === status && (searchName === '' || r.name.includes(searchName)));
    }, [registrations, status, searchName]);

    const getBgColor = () => {
        switch(status) {
            case RegStatus.DELETED: return 'bg-red-50 border-red-200';
            case RegStatus.RETAINED: return 'bg-violet-50 border-violet-200';
            case RegStatus.REFUNDED: return 'bg-orange-50 border-orange-200';
            case RegStatus.RESTRICTED: return 'bg-slate-50 border-slate-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getTextColor = () => {
        switch(status) {
            case RegStatus.DELETED: return 'text-red-900';
            case RegStatus.RETAINED: return 'text-violet-900';
            case RegStatus.REFUNDED: return 'text-orange-900';
            case RegStatus.RESTRICTED: return 'text-slate-900';
            default: return 'text-gray-900';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {editTarget && (
                <EditMemberModal 
                    registration={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={onRefresh}
                    settings={settings}
                />
            )}

            <div className={`p-4 md:p-6 ${getBgColor()}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-black/5 pb-4">
                    <h3 className={`font-black text-2xl flex items-center ${getTextColor()}`}>
                        <User className="w-8 h-8 mr-3 opacity-70" /> {title}
                    </h3>
                    
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={t('common.search_name_placeholder', '搜尋姓名...')} 
                            value={searchName}
                            onChange={e => setSearchName(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-4">{t('common.col.unit', '單位')}</th>
                                    <th className="px-6 py-4">{t('common.col.name', '姓名')}</th>
                                    <th className="px-6 py-4">{t('common.col.identity', '收費項目')}</th>
                                    <th className="px-6 py-4">{t('common.col.trip', '行程')}</th>
                                    <th className="px-6 py-4">{t('common.col.amount_due', '應繳')}</th>
                                    <th className="px-6 py-4 text-center">{t('common.col.action', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRegs.map(r => (
                                    <tr key={r.reg_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-700">{r.unit}</td>
                                        <td className="px-6 py-4 font-black">{r.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{r.identity_type}</td>
                                        <td className="px-6 py-4 text-gray-500">{r.trip_type}</td>
                                        <td className="px-6 py-4 font-mono font-bold">${r.amount_due}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setEditTarget(r)}
                                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-blue-600"
                                                title={t('common.button.edit_member', '編輯成員資料')}
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                 {filteredRegs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">
                                            {t('common.status.no_data', '目前無資料')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpecializedRegistrationList;
