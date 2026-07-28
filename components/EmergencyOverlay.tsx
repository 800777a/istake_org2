
import React, { useState, useEffect } from 'react';
import { getActiveEvent, getRegistrations, updateSafetyStatus } from '../services/sheetService';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import Toast, { ToastType } from './Toast';

const EmergencyOverlay: React.FC = () => {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  const [markedSafe, setMarkedSafe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<ToastType>('success');
  
  // Find "my" registration via simple logic (in real app, use auth context or local storage of last viewed ticket)
  // Here for simplicity in this mock, we don't know EXACTLY which user is viewing unless logged in or looked up ticket.
  // We will assume this overlay is mainly visual for the demo, but buttons work if we had user context.
  
  // NOTE: For this demo, let's assume we can mark ANY registration safe in a "I am safe" flow if we were specific.
  // Since we don't have a persistent "My Reg ID" in context for guests easily, we will simulate the UI flow.

  useEffect(() => {
    const checkEmergency = () => {
        const evt = getActiveEvent();
        if (evt && evt.emergencyConfig?.isActive) {
            setActive(true);
            setMessage(evt.emergencyConfig.message);
        } else {
            setActive(false);
            setMarkedSafe(false); // Reset when emergency clears
        }
    };

    checkEmergency();
    const interval = setInterval(checkEmergency, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSafe = () => {
      setMarkedSafe(true);
      // In a real app, we would update safety_status for the current user here.
      // updateSafetyStatus(currentUserRegId, 'safe');
  };

  const handleHelp = () => {
      setMsgType('error');
      setMsg('已發送求救訊號！請保持冷靜，等待救援。');
      // In a real app: reportSOS(currentUserRegId, 'Emergency Overlay');
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center p-6 text-white animate-pulse-slow">
        <div className="bg-white text-red-600 rounded-full p-6 mb-6 shadow-xl animate-bounce">
            <ShieldAlert className="w-24 h-24" />
        </div>
        
        <h1 className="text-4xl font-black mb-4 tracking-widest text-center">EMERGENCY ALERT</h1>
        <h2 className="text-2xl font-bold mb-8 text-center bg-red-800 px-6 py-2 rounded shadow-inner">
            {message || '緊急狀況，請依照指示行動'}
        </h2>

        {!markedSafe ? (
            <div className="w-full max-w-sm space-y-4">
                <button 
                    onClick={handleSafe}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded text-xl shadow-lg transform transition hover:scale-105 flex items-center justify-center"
                >
                    <CheckCircle className="w-6 h-6 mr-2" /> 我已安全 (I AM SAFE)
                </button>
                <button 
                    onClick={handleHelp}
                    className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold py-4 rounded text-xl shadow-lg transform transition hover:scale-105 flex items-center justify-center"
                >
                    <AlertTriangle className="w-6 h-6 mr-2" /> 我需要協助 (NEED HELP)
                </button>
            </div>
        ) : (
            <div className="text-center bg-green-600 p-8 rounded shadow-lg max-w-sm">
                <CheckCircle className="w-20 h-20 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">感謝回報</h3>
                <p className="mt-2">請留在安全區域，等待進一步指示。</p>
            </div>
        )}

        <div className="absolute bottom-6 text-sm opacity-70">
            System Live Monitor Active
        </div>
        
        <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />

        <style>{`
            @keyframes pulse-slow {
                0%, 100% { background-color: #dc2626; }
                50% { background-color: #b91c1c; }
            }
            .animate-pulse-slow {
                animation: pulse-slow 3s infinite;
            }
        `}</style>
    </div>
  );
};

export default EmergencyOverlay;
