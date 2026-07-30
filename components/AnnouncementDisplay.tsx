
import React, { useState, useEffect } from 'react';
import { getActiveEvent } from '../services/sheetService';
import { Announcement, EventData } from '../types';
import { AlertTriangle, X, Megaphone, Info } from 'lucide-react';

const AnnouncementDisplay: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [urgentMsg, setUrgentMsg] = useState<Announcement | null>(null);
  const [normalMsg, setNormalMsg] = useState<Announcement | null>(null);
  const [dismissedUrgentIds, setDismissedUrgentIds] = useState<Set<string>>(new Set());

  const checkAnnouncements = () => {
    const evt = getActiveEvent();
    if (evt && evt.announcements) {
      // Sort by newest
      const active = evt.announcements
        .filter(a => a.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAnnouncements(active);

      // Find urgent message (newest active)
      const urgent = active.find(a => a.type === 'urgent');
      setUrgentMsg(urgent || null);

      // Find normal message (newest active normal or info)
      const normal = active.find(a => a.type !== 'urgent');
      setNormalMsg(normal || null);
    } else {
        setAnnouncements([]);
        setUrgentMsg(null);
        setNormalMsg(null);
    }
  };

  useEffect(() => {
    // Initial check
    checkAnnouncements();

    // Listen for storage changes (cross-tab)
    const handleStorageChange = () => checkAnnouncements();
    window.addEventListener('storage', handleStorageChange);

    // Poll locally (same-tab immediate feedback mock)
    const interval = setInterval(checkAnnouncements, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const dismissUrgent = (id: string) => {
      setDismissedUrgentIds(prev => new Set(prev).add(id));
  };

  return (
    <>
      {/* Normal/Info Banner (Fixed Top) */}
      {normalMsg && (
        <div className={`w-full p-2 text-center text-sm font-medium flex items-center justify-center relative z-40 ${
            normalMsg.type === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
            {normalMsg.type === 'info' ? <Info className="w-4 h-4 mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
            {normalMsg.message}
        </div>
      )}

      {/* Urgent Modal */}
      {urgentMsg && !dismissedUrgentIds.has(urgentMsg.id) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => dismissUrgent(urgentMsg.id)} />
            <div className="relative bg-white rounded shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-red-600">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-800 mb-2">緊急公告</h3>
                    <p className="text-gray-800 text-lg font-medium whitespace-pre-wrap">{urgentMsg.message}</p>
                    <div className="mt-4 text-xs text-gray-500">
                        發布時間: {new Date(urgentMsg.createdAt).toLocaleTimeString()}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-center">
                    <button 
                        onClick={() => dismissUrgent(urgentMsg.id)}
                        className="bg-red-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-red-700 transition-colors"
                    >
                        收到，我已了解
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementDisplay;
