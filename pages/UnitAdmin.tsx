
import React, { useState, useEffect } from 'react';
import { EventData, Registration, User } from '../types';
import { getCurrentUser, subscribeToEvents, subscribeToRegistrations, updateUnitStaffInfo, toggleTaskStatus } from '../services/sheetService';
import { Users, ClipboardList, CheckSquare } from 'lucide-react';
import SharedOperations from '../components/SharedOperations';
import SharedRegistrationList from '../components/SharedRegistrationList';
import Toast, { ToastType } from '../components/Toast';

const STAFF_ROLES = [
    'A.協調員 (恩道門後的弟兄)',
    'B.洗禮記錄員 (恩道門後的弟兄)',
    'C.證實記錄員 (恩道門後的弟兄)',
    'D.證實者 (長老以上的聖職)',
    'E.發衣服 (恩道門後的姐妹)',
    'F.發毛巾 (成年姐妹)',
    'G.照顧兒童 (成人)',
    'H.照顧兒童 (與G為夫妻或同性別的成人)',
    'I.施洗者1 (祭司以上的聖職)', 
    'J.施洗者2 (祭司以上的聖職)',
    'K.領車 (成人)'
];

const UnitAdmin: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    
    // UI State
    const [isLockedPayment, setIsLockedPayment] = useState(false);
    const [isLockedTo, setIsLockedTo] = useState(false);
    const [isLockedBack, setIsLockedBack] = useState(false);
    
    // Staff Assignment State
    const [staffName, setStaffName] = useState('');
    const [staffRole, setStaffRole] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('success');

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);

        const unsubEvents = subscribeToEvents((events) => {
            const active = events.find(e => e.is_active);
            setActiveEvent(active);
            
            if (active && user?.unit) {
                // Initialize staff info from event
                const info = active.unitStaffInfo?.[user.unit];
                if (info) {
                    setStaffName(info.staff || '');
                    setStaffRole(info.staffRole || '');
                }
            }
        });

        return () => unsubEvents();
    }, []);

    useEffect(() => {
        if (activeEvent && currentUser?.unit) {
            const unsubRegs = subscribeToRegistrations(activeEvent.event_id, (allRegs) => {
                const unitRegs = allRegs.filter(r => r.unit === currentUser.unit);
                setRegistrations(unitRegs);
            });
            return () => unsubRegs();
        }
    }, [activeEvent, currentUser]);

    const handleStaffChange = (field: 'staff'|'role', value: string) => {
        if (!activeEvent || !currentUser?.unit) return;
        
        let newStaff = staffName;
        let newRole = staffRole;

        if (field === 'staff') { setStaffName(value); newStaff = value; }
        if (field === 'role') { setStaffRole(value); newRole = value; }

        updateUnitStaffInfo(activeEvent.event_id, currentUser.unit, newStaff, newRole);
    };

    const handleTaskToggle = (taskId: string, currentStatus: boolean) => {
        if (!activeEvent || !currentUser?.unit) return;
        toggleTaskStatus(activeEvent.event_id, taskId, currentUser.unit, !currentStatus);
    };

    const triggerReset = (type: 'to' | 'back') => {
        setMsgType('info');
        setMsg('請聯絡主辦人進行批量重置');
    };

    if (!currentUser || !activeEvent) return <div className="p-8 text-center text-gray-500">載入中或無權限...</div>;

    const selectedUnit = currentUser.unit || '';
    const isEventClosed = activeEvent.status === 'completed' || activeEvent.status === 'cancelled';
    
    // Filter tasks
    const unitTasks = (activeEvent.tasks || []).filter(t => t.type === 'per_unit');
    const pendingTasksCount = unitTasks.filter(t => !t.status[selectedUnit]).length;

    return (
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-800">
                    <Users className="mr-2 text-red-600" /> 
                    承辦 - {selectedUnit}
                </h2>
                <span className="text-base font-medium text-gray-500">活動日期：{activeEvent.event_date}</span>
            </div>

             {/* Tasks */}
            {unitTasks.length > 0 && (
                <div className="mb-6 bg-purple-50 border border-purple-200 rounded p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-purple-800 flex items-center text-base">
                            <ClipboardList className="w-5 h-5 mr-2" /> 待辦事項
                        </h3>
                        {pendingTasksCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                {pendingTasksCount} 待辦
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unitTasks.map(task => (
                            <div 
                                key={task.id}
                                onClick={() => handleTaskToggle(task.id, !!task.status[selectedUnit])}
                                className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${task.status[selectedUnit] ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-purple-200 hover:border-purple-400 shadow-sm'} ${isEventClosed ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${task.status[selectedUnit] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-400'}`}>
                                    {task.status[selectedUnit] && <CheckSquare className="w-4 h-4 text-white" />}
                                </div>
                                <span className={`text-xs font-medium ${task.status[selectedUnit] ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                    {task.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Shared Operations */}
            <SharedOperations 
                isLockedPayment={isLockedPayment}
                isLockedTo={isLockedTo}
                isLockedBack={isLockedBack}
                onToggleLockPayment={() => setIsLockedPayment(!isLockedPayment)}
                onToggleLockTo={() => setIsLockedTo(!isLockedTo)}
                onToggleLockBack={() => setIsLockedBack(!isLockedBack)}
                onResetTo={() => triggerReset('to')}
                onResetBack={() => triggerReset('back')}
                onMobileMode={() => {}} 
                className="bg-orange-50 border-orange-200"
                titleClassName="text-orange-900"
            />

            {/* Registration List */}
            <div className="bg-yellow-50 rounded border border-yellow-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-yellow-100 border-b border-yellow-200 flex justify-between items-center sticky top-0 z-20">
                    <h3 className="font-bold text-yellow-900 text-base">名單</h3>
                </div>
                <SharedRegistrationList 
                    registrations={registrations}
                    unitName={selectedUnit}
                    currentUser={currentUser}
                    isLockedPayment={isLockedPayment}
                    isLockedCheckInTo={isLockedTo}
                    isLockedCheckInBack={isLockedBack}
                    isEventClosed={isEventClosed}
                    onRefresh={() => {}}
                />
            </div>
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
        </div>
    );
};

export default UnitAdmin;
