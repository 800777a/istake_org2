
import React, { useState, useEffect } from 'react';
import { Registration } from '../types';
import { X, ClipboardList, CheckSquare, Users, Phone, Shield, Plus, Minus, Zap } from 'lucide-react';

interface StaffActionModalProps {
  registration: Registration;
  onClose: () => void;
}

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

const StaffActionModal: React.FC<StaffActionModalProps> = ({ registration, onClose }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [headcount, setHeadcount] = useState(0);
  const [activeTab, setActiveTab] = useState<'tasks' | 'tools'>('tasks');

  // Initialize tasks based on role
  useEffect(() => {
    const role = registration.staff_role || '一般同工';
    let initTasks: TaskItem[] = [];

    if (role.includes('領車人') || role.includes('車長')) {
        initTasks = [
            { id: '1', text: '出發前：確認車輛與司機資訊', completed: false },
            { id: '2', text: '集合時：協助成員放置行李', completed: false },
            { id: '3', text: '發車前：清點車上人數', completed: false },
            { id: '4', text: '行駛中：宣導安全帶與逃生出口', completed: false },
            { id: '5', text: '抵達時：確認無遺留物品', completed: false },
        ];
    } else if (role.includes('醫護')) {
        initTasks = [
            { id: '1', text: '檢查急救包內容物', completed: false },
            { id: '2', text: '確認暈車藥備量', completed: false },
            { id: '3', text: '留意長輩身體狀況', completed: false },
            { id: '4', text: '緊急狀況待命', completed: false },
        ];
    } else if (role.includes('攝影')) {
        initTasks = [
            { id: '1', text: '拍攝出發前大合照', completed: false },
            { id: '2', text: '記錄車上活動花絮', completed: false },
            { id: '3', text: '拍攝聖殿廣場團體照', completed: false },
            { id: '4', text: '上傳精選照片至相簿', completed: false },
        ];
    } else {
        initTasks = [
            { id: '1', text: '準時報到', completed: false },
            { id: '2', text: '協助維持秩序', completed: false },
            { id: '3', text: '關懷同車成員', completed: false },
        ];
    }
    setTasks(initTasks);
  }, [registration.staff_role]);

  const toggleTask = (id: string) => {
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 animate-fade-in">
      <div className="bg-white w-[500px] max-w-full h-[600px] rounded shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white shrink-0">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold flex items-center">
                        <Shield className="w-6 h-6 mr-2" /> 工作人員專區
                    </h2>
                    <p className="text-violet-200 text-sm mt-1 font-mono">
                        {registration.staff_role} | {registration.name}
                    </p>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2"><X className="w-6 h-6"/></button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-xs mb-1 opacity-90">
                    <span>任務進度</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
            <button 
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'tasks' ? 'text-violet-700 border-b-2 border-violet-700 bg-violet-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <ClipboardList className="inline w-4 h-4 mr-1" /> 職務清單
            </button>
            <button 
                onClick={() => setActiveTab('tools')}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'tools' ? 'text-violet-700 border-b-2 border-violet-700 bg-violet-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Zap className="inline w-4 h-4 mr-1" /> 數位工具
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {activeTab === 'tasks' ? (
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => toggleTask(task.id)}
                            className={`p-4 rounded border-2 flex items-center cursor-pointer transition-all ${task.completed ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-gray-200 hover:border-violet-300 shadow-sm'}`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {task.completed && <CheckSquare className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                {task.text}
                            </span>
                        </div>
                    ))}
                    {tasks.length === 0 && <div className="text-center text-gray-400 py-10">尚無指派任務</div>}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Tally Counter */}
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
                        <h3 className="text-gray-600 font-bold mb-4 flex items-center justify-center">
                            <Users className="w-5 h-5 mr-2" /> 人數計數器
                        </h3>
                        <div className="text-6xl font-mono font-bold text-gray-800 mb-6">{headcount}</div>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setHeadcount(Math.max(0, headcount - 1))}
                                className="w-16 h-16 rounded-full border-2 border-red-200 bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                            >
                                <Minus className="w-8 h-8" />
                            </button>
                            <button 
                                onClick={() => setHeadcount(0)}
                                className="px-4 text-xs text-gray-400 hover:text-gray-600"
                            >
                                重置
                            </button>
                            <button 
                                onClick={() => setHeadcount(headcount + 1)}
                                className="w-16 h-16 rounded-full border-2 border-green-200 bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all shadow-md"
                            >
                                <Plus className="w-8 h-8" />
                            </button>
                        </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
                        <h3 className="text-gray-600 font-bold mb-4 flex items-center">
                            <Phone className="w-5 h-5 mr-2" /> 緊急聯絡簿
                        </h3>
                        <div className="space-y-2">
                            {[
                                { title: '活動負責人', name: '王負責', phone: '0912-345-678' },
                                { title: '醫療總召', name: '林醫師', phone: '0987-654-321' },
                                { title: '遊覽車調度', name: '陳經理', phone: '0911-222-333' },
                            ].map((contact, i) => (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors">
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{contact.title}</div>
                                        <div className="text-xs text-gray-500">{contact.name}</div>
                                    </div>
                                    <a href={`tel:${contact.phone}`} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center hover:bg-green-200">
                                        <Phone className="w-3 h-3 mr-1" /> 撥打
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StaffActionModal;
