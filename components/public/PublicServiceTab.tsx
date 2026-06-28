
import React, { useState } from 'react';
import { EventData, GlobalSettings, Volunteer, Registration, BusRatingRecord } from '../../types';
import { updateEvent, updateSettings } from '../../services/sheetService';
import { Badge, HeartHandshake, Plus, Star, CheckCircle2, User, AlertCircle, Lock } from 'lucide-react';
import { maskName } from '../../utils/validation';

import Toast, { ToastType } from '../Toast';

const TEMPLE_WORKER_ROLES = [
    { key: 'A', label: 'A.協調員 (恩道門後的弟兄)' },
    { key: 'B', label: 'B.洗禮記錄員 (恩道門後的弟兄)' },
    { key: 'C', label: 'C.證實記錄員 (恩道門後的弟兄)' },
    { key: 'D', label: 'D.證實者 (長老以上的聖職)' },
    { key: 'E', label: 'E.發衣服 (恩道門後的姐妹)' },
    { key: 'F', label: 'F.發毛巾 (成年姐妹)' },
    { key: 'G', label: 'G.照顧兒童 (成人)' },
    { key: 'H', label: 'H.照顧兒童 (與G為夫妻或同性別的成人)' },
    { key: 'I', label: 'I.施洗者1 (祭司以上的聖職)' }, 
    { key: 'J', label: 'J.施洗者2 (祭司以上的聖職)' },
    { key: 'K', label: 'K.領車 (成人)' },
    { key: 'L', label: 'L.領車 (成人)' },
    { key: 'M', label: 'M.領車 (成人)' },
];

interface PublicServiceTabProps {
    activeEvent: EventData;
    settings: GlobalSettings;
    registrations?: Registration[]; // V300: Added for identity verification
}

const METRIC_LABELS = [
    '準時到達', '安全駕駛', '行車平穩', '沒有抽煙', '服務禮貌',
    '車況良好', '車輛清潔', '車內氣味', '設備正常'
];

const PublicServiceTab: React.FC<PublicServiceTabProps> = ({ activeEvent, settings, registrations = [] }) => {
    const [newVolunteer, setNewVolunteer] = useState<Volunteer>({ id: '', unit: '', name: '', roleKey: '' });
    const [ratingForm, setRatingForm] = useState<{
        activeRatingId: string | null;
        raterUnit: string;
        raterName: string;
        remarks: string;
        d1Metrics: boolean[];
        d2Metrics: boolean[];
    }>({
        activeRatingId: null,
        raterUnit: '',
        raterName: '',
        remarks: '',
        d1Metrics: Array(9).fill(false),
        d2Metrics: Array(9).fill(false)
    });

    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    const handleAddVolunteer = () => {
        if (!activeEvent) return;
        if (!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey) return;
        
        const newItem = { ...newVolunteer, id: `VOL-${Date.now()}` };
        const newList = [...(activeEvent.volunteers || []), newItem];
        const updated = { ...activeEvent, volunteers: newList };
        
        updateEvent(updated); 
        setNewVolunteer({ id: '', unit: '', name: '', roleKey: '' });
        setMsgType('success');
        setMsg('志願服務申請已送出！');
    };

    const handleRatingSubmit = async (record: BusRatingRecord) => {
        if (!ratingForm.raterName || !ratingForm.raterUnit) {
            setMsgType('error');
            setMsg('請填寫評分人單位與姓名');
            return;
        }

        // Identity Verification
        const isRegistered = registrations.some(r => r.name === ratingForm.raterName && r.unit === ratingForm.raterUnit);
        if (!isRegistered) {
            setMsgType('error');
            setMsg('身分檢核失敗：您非本次活動之報名人員，無法提交評分。');
            return;
        }

        const updatedRecord: BusRatingRecord = {
            ...record,
            isSubmitted: true,
            raterName: ratingForm.raterName,
            raterUnit: ratingForm.raterUnit,
            remarks: ratingForm.remarks,
            d1Metrics: ratingForm.d1Metrics,
            d2Metrics: ratingForm.d2Metrics
        };

        const updatedRatings = (settings.busRatings || []).map(r => r.id === record.id ? updatedRecord : r);
        await updateSettings({ ...settings, busRatings: updatedRatings });
        
        setRatingForm({
            activeRatingId: null,
            raterUnit: '',
            raterName: '',
            remarks: '',
            d1Metrics: Array(9).fill(false),
            d2Metrics: Array(9).fill(false)
        });
        setMsgType('success');
        setMsg('評分送出成功！');
    };

    const myRatings = (settings.busRatings || []).filter(r => r.eventId === activeEvent.event_id);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Service Rating Section */}
            <div className="bg-indigo-50 p-4 md:p-6 rounded-lg shadow-sm border border-indigo-500">
                <h3 className="text-base font-bold mb-4 flex items-center text-indigo-900">
                    <Star className="w-5 h-5 mr-2 text-indigo-700"/> 服務評分
                </h3>
                
                <div className="bg-white p-3 rounded-lg border border-indigo-200 text-xs mb-4">
                    <h4 className="font-bold text-indigo-800 mb-1">計分規則說明</h4>
                    <p className="text-gray-600">本功能用於評分本次活動的服務品質。每位司機配置 9 項評核，我們將定期彙整結果供車行參考。您的個資將受到去識別化保護。</p>
                </div>

                <div className="space-y-4">
                    {myRatings.length === 0 && <div className="text-center py-4 text-gray-400 text-xs">目前尚無評分項目 (待主辦發佈)</div>}
                    {myRatings.map(record => {
                        const isLocked = record.isSubmitted;
                        const isActive = ratingForm.activeRatingId === record.id;
                        
                        return (
                            <div 
                                key={record.id} 
                                className={`border rounded-xl transition-all duration-300 overflow-hidden ${isLocked ? 'bg-[#F5F5F5] border-gray-300 shadow-none' : 'bg-white border-indigo-200 shadow-sm'}`}
                            >
                                <div className={`px-4 py-3 flex justify-between items-center ${isLocked ? 'text-[#1A1A1A]' : 'text-indigo-900 font-bold'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{record.busId} ({record.plate})</span>
                                            {isLocked && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] flex items-center">已送出 <Lock size={10} className="ml-1"/></span>}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-normal">司機: {record.driver1Name} {record.driver2Name ? `/ ${record.driver2Name}` : ''}</div>
                                    </div>
                                    {!isLocked && (
                                        <button 
                                            onClick={() => setRatingForm({ ...ratingForm, activeRatingId: isActive ? null : record.id })}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                        >
                                            {isActive ? '取消' : '開始評分'}
                                        </button>
                                    )}
                                </div>

                                {/* Rating Content */}
                                {isLocked && (
                                    <div className="px-4 py-3 border-t border-gray-200 text-xs text-[#1A1A1A]">
                                        <div className="italic bg-white/50 p-2 rounded mb-2">反應備註: {record.remarks || '無'}</div>
                                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                                            <span>評分人: {record.raterUnit} {maskName(record.raterName)}</span>
                                            <div className="flex gap-1">
                                                {record.d1Metrics.filter(m => m).length}/{METRIC_LABELS.length} 及格
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isActive && !isLocked && (
                                    <div className="p-4 border-t border-indigo-100 bg-indigo-50/30 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Driver 1 */}
                                            <div className="space-y-2">
                                                <div className="font-bold text-xs text-indigo-800 border-b border-indigo-100 pb-1">司機1: {record.driver1Name}</div>
                                                <div className="grid grid-cols-3 gap-y-2">
                                                    {METRIC_LABELS.map((label, i) => (
                                                        <label key={i} className="flex items-center gap-1 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                className="rounded text-indigo-600 w-3 h-3"
                                                                checked={ratingForm.d1Metrics[i]}
                                                                onChange={e => {
                                                                    const nm = [...ratingForm.d1Metrics];
                                                                    nm[i] = e.target.checked;
                                                                    setRatingForm({ ...ratingForm, d1Metrics: nm });
                                                                }}
                                                            />
                                                            <span className="text-[10px]">{label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Driver 2 */}
                                            {record.driver2Name && (
                                                <div className="space-y-2">
                                                    <div className="font-bold text-xs text-indigo-800 border-b border-indigo-100 pb-1">司機2: {record.driver2Name}</div>
                                                    <div className="grid grid-cols-3 gap-y-2">
                                                        {METRIC_LABELS.map((label, i) => (
                                                            <label key={i} className="flex items-center gap-1 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="rounded text-indigo-600 w-3 h-3"
                                                                    checked={ratingForm.d2Metrics[i]}
                                                                    onChange={e => {
                                                                        const nm = [...ratingForm.d2Metrics];
                                                                        nm[i] = e.target.checked;
                                                                        setRatingForm({ ...ratingForm, d2Metrics: nm });
                                                                    }}
                                                                />
                                                                <span className="text-[10px]">{label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-indigo-100">
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">反應備註</label>
                                                <textarea 
                                                    className="w-full border border-indigo-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                                                    rows={2}
                                                    placeholder="請提供您的具體意見..."
                                                    value={ratingForm.remarks}
                                                    onChange={e => setRatingForm({ ...ratingForm, remarks: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1">評分人單位</label>
                                                    <select 
                                                        className="w-full border border-indigo-200 rounded-lg p-2 text-xs bg-white"
                                                        value={ratingForm.raterUnit}
                                                        onChange={e => setRatingForm({ ...ratingForm, raterUnit: e.target.value })}
                                                    >
                                                        <option value="">請選擇單位</option>
                                                        {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1">評分人姓名</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full border border-indigo-200 rounded-lg p-2 text-xs"
                                                        placeholder="必填"
                                                        value={ratingForm.raterName}
                                                        onChange={e => setRatingForm({ ...ratingForm, raterName: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRatingSubmit(record)}
                                                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={18}/> 送出評分
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Temple Workers */}
            <div className="bg-yellow-50 p-4 md:p-6 rounded-lg shadow-sm border border-yellow-500">
                <h3 className="text-base font-bold mb-4 flex items-center text-yellow-900">
                    <Badge className="w-5 h-5 mr-2 text-yellow-700"/> 服務人員
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TEMPLE_WORKER_ROLES.map((role: { key: string, label: string }) => {
                        const existingData = activeEvent.temple_workers?.[role.key] || { name: '', unit: '' };
                        const worker = typeof existingData === 'string' ? { name: existingData, unit: '' } : existingData;
                        const hasWorker = !!worker.name;
                        
                        return (
                            <div key={role.key} className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1">{role.label}</label>
                                <div className="flex gap-2">
                                    <div className={`w-1/3 border rounded-lg p-2 text-xs font-bold h-[34px] flex items-center ${hasWorker ? 'bg-red-50 border-red-500 text-black' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                        {worker.unit || '-'}
                                    </div>
                                    <div className={`w-2/3 border rounded-lg p-2 text-xs h-[34px] flex items-center ${hasWorker ? 'bg-red-50 border-red-500 text-black font-bold' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                        {maskName(worker.name) || '待指派'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Volunteers Section */}
            <div className="bg-green-50 p-4 md:p-6 rounded-lg shadow-sm border border-green-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold flex items-center text-green-900">
                        <HeartHandshake className="w-5 h-5 mr-2 text-green-700"/> 申請服務
                    </h3>
                </div>

                {/* Add Form */}
                <div className="flex flex-col md:flex-row gap-2 mb-4 bg-white p-3 rounded-lg border border-green-200 items-end">
                    <div className="w-full md:flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">單位</label>
                        <select 
                            className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-green-300 outline-none"
                            value={newVolunteer.unit}
                            onChange={e => setNewVolunteer({...newVolunteer, unit: e.target.value})}
                        >
                            <option value="">請選擇</option>
                            {settings.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">姓名</label>
                        <input 
                            type="text" 
                            className="w-full border rounded p-2 text-xs focus:ring-2 focus:ring-green-300 outline-none"
                            placeholder="輸入姓名"
                            value={newVolunteer.name}
                            onChange={e => setNewVolunteer({...newVolunteer, name: e.target.value})}
                        />
                    </div>
                    <div className="w-full md:flex-[2]">
                        <label className="text-[10px] text-gray-500 block mb-1">擔任</label>
                        <select 
                            className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-green-300 outline-none"
                            value={newVolunteer.roleKey}
                            onChange={e => setNewVolunteer({...newVolunteer, roleKey: e.target.value})}
                        >
                            <option value="">請選擇</option>
                            {TEMPLE_WORKER_ROLES.map((role: { key: string, label: string }) => (
                                <option key={role.key} value={role.key}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handleAddVolunteer}
                        disabled={!newVolunteer.name || !newVolunteer.unit || !newVolunteer.roleKey}
                        className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50 font-bold h-[34px] flex items-center justify-center"
                    >
                        <Plus className="w-3 h-3 mr-1" /> 申請
                    </button>
                </div>

                {/* Volunteer List (Read Only for Public) */}
                <div className="overflow-x-auto bg-white rounded-lg border border-green-200">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="bg-green-100 text-green-900 font-bold border-b border-green-200">
                            <tr>
                                <th className="p-2 pl-4 w-24">單位</th>
                                <th className="p-2 w-32">姓名</th>
                                <th className="p-2">擔任職務</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                            {(activeEvent.volunteers || []).map((v: Volunteer) => {
                                const roleLabel = TEMPLE_WORKER_ROLES.find((r: { key: string }) => r.key === v.roleKey)?.label || v.roleKey;
                                return (
                                    <tr key={v.id} className="hover:bg-green-50/50">
                                        <td className="p-2 pl-4 text-green-800 font-bold">{v.unit}</td>
                                        <td className="p-2 text-gray-800 font-medium">{maskName(v.name)}</td>
                                        <td className="p-2 text-gray-600">{roleLabel}</td>
                                    </tr>
                                );
                            })}
                            {(activeEvent.volunteers || []).length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-400">目前無志願工作資料</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
        </div>
    );
};

export default PublicServiceTab;
