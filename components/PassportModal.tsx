import React, { useEffect, useState } from 'react';
import { Registration, EventData } from '../types';
import { getMemberHistory } from '../services/sheetService';
import { X, Award, Star, BookOpen, Clock, Heart, Brain } from 'lucide-react';

interface PassportModalProps {
  registration: Registration;
  event: EventData;
  onClose: () => void;
}

const PassportModal: React.FC<PassportModalProps> = ({ registration, event, onClose }) => {
  const [history, setHistory] = useState<{eventDate: string, unit: string, status: string}[]>([]);

  useEffect(() => {
      // Wrap setHistory to ensure it receives exactly one argument and no secondary arguments from the promise chain
      getMemberHistory(registration.identity_id)
        .then((data) => {
            setHistory(data);
        })
        .catch(err => console.error("Failed to load history", err));
  }, [registration.identity_id]);
  
  // Calculations
  const totalTrips = history.filter(h => h.status === '正常').length;
  
  // Badges Logic
  const badges = [
      { id: 'first', name: '首發成員', icon: Star, unlocked: totalTrips >= 1, color: 'text-yellow-500' },
      { id: 'regular', name: '持之以恆', icon: Clock, unlocked: totalTrips >= 3, color: 'text-blue-500' },
      { id: 'veteran', name: '聖殿老手', icon: Award, unlocked: totalTrips >= 5, color: 'text-purple-500' },
      { id: 'service', name: '服務熱忱', icon: Heart, unlocked: registration.is_staff, color: 'text-red-500' },
      // V035: Trivia Badge
      { id: 'smart', name: '知識守護者', icon: Brain, unlocked: (registration.trivia_score || 0) >= 80, color: 'text-teal-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 animate-fade-in">
      <div className="bg-[#fdfbf7] w-[800px] max-w-full h-[600px] rounded-r-2xl rounded-l-md shadow-2xl relative overflow-hidden flex flex-col md:flex-row border-l-[12px] border-l-blue-900 book-spine">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <X className="w-6 h-6" />
        </button>

        {/* Left Page: Profile & Stats */}
        <div className="flex-1 p-8 border-r border-gray-300 relative bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
            <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4 border-4 border-blue-200">
                    <BookOpen className="w-12 h-12 text-blue-800" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-800 tracking-wider">聖殿護照</h2>
                <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mt-1">Temple Passport</p>
            </div>

            <div className="space-y-4 font-mono text-sm text-gray-700">
                <div className="flex border-b border-gray-300 pb-1">
                    <span className="w-24 text-gray-500">Name</span>
                    <span className="font-bold">{registration.name}</span>
                </div>
                <div className="flex border-b border-gray-300 pb-1">
                    <span className="w-24 text-gray-500">Unit</span>
                    <span>{registration.unit}</span>
                </div>
                <div className="flex border-b border-gray-300 pb-1">
                    <span className="w-24 text-gray-500">ID</span>
                    <span>{registration.identity_id.slice(0, 3)}*****{registration.identity_id.slice(-2)}</span>
                </div>
                <div className="flex border-b border-gray-300 pb-1">
                    <span className="w-24 text-gray-500">Trivia Score</span>
                    <span className="font-bold text-teal-600">{registration.trivia_score || '-'}</span>
                </div>
            </div>

            {/* Badges Section */}
            <div className="mt-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Achievements</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                    {badges.map(badge => (
                        <div key={badge.id} className={`flex flex-col items-center ${badge.unlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm mb-1">
                                <badge.icon className={`w-5 h-5 ${badge.color}`} />
                            </div>
                            <span className="text-[10px] text-gray-600">{badge.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Page: Stamps */}
        <div className="flex-1 p-8 relative bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] overflow-y-auto">
            <h3 className="text-center font-serif text-gray-400 text-sm mb-6 border-b border-dashed border-gray-300 pb-2">VISA / STAMPS</h3>
            
            <div className="grid grid-cols-2 gap-4">
                {history.map((h, idx) => (
                    <div key={idx} className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center relative p-2 group hover:border-blue-200 transition-colors">
                        {h.status === '正常' ? (
                            <div className="text-center transform rotate-[-5deg] group-hover:rotate-0 transition-transform">
                                <div className="border-2 border-blue-800 text-blue-800 rounded-full w-24 h-24 flex flex-col items-center justify-center opacity-70">
                                    <div className="text-[10px] uppercase font-bold">Temple Trip</div>
                                    <div className="text-xs font-bold my-1">{h.eventDate}</div>
                                    <div className="text-[10px]">{h.unit}</div>
                                    <div className="text-[8px] mt-1 text-red-600 font-bold">COMPLETED</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <div className="text-xs text-gray-400">{h.eventDate}</div>
                                <div className="text-xs text-red-400 font-bold">{h.status}</div>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Empty Slots Filler */}
                {Array.from({ length: Math.max(0, 6 - history.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square border-2 border-dashed border-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-100 text-xs">EMPTY</span>
                    </div>
                ))}
            </div>
        </div>

      </div>
      <style>{`
        .book-spine {
            box-shadow: 
                inset 10px 0 20px rgba(0,0,0,0.1),
                5px 5px 15px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default PassportModal;