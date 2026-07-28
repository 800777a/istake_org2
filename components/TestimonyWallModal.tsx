
import React, { useState } from 'react';
import { EventData, Testimony, Registration } from '../types';
import { X, Send, Heart } from 'lucide-react';
import { addTestimony } from '../services/sheetService';
import Toast, { ToastType } from './Toast';

interface TestimonyWallModalProps {
  event: EventData;
  registration?: Registration; // If present, allow posting
  onClose: () => void;
}

const TestimonyWallModal: React.FC<TestimonyWallModalProps> = ({ event, registration, onClose }) => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [activeTab, setActiveTab] = useState<'wall' | 'write'>('wall');
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<ToastType>('success');

  const testimonies = (event.testimonies || []).filter(t => t.isPublic);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!content || !registration) return;

      const newTestimony: Testimony = {
          id: `TES-${Date.now()}`,
          eventId: event.event_id,
          regId: registration.reg_id,
          authorName: isAnonymous ? '匿名成員' : registration.name,
          content: content,
          createdAt: new Date().toISOString(),
          isPublic: true
      };

      addTestimony(event.event_id, newTestimony);
      setContent('');
      setMsgType('success');
      setMsg('見證已發布！感謝您的分享。');
      setActiveTab('wall');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-50 to-blue-100 w-[800px] max-w-full h-[80vh] rounded shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-white/50 shrink-0">
            <h2 className="text-2xl font-serif text-indigo-900 font-bold flex items-center">
                <Heart className="w-6 h-6 mr-2 text-pink-500 fill-pink-500" />
                靈性見證牆
            </h2>
            <button onClick={onClose} className="hover:bg-white/50 rounded-full p-2 transition-colors">
                <X className="w-6 h-6 text-gray-500" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center space-x-4 p-4 shrink-0">
            <button 
                onClick={() => setActiveTab('wall')}
                className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'wall' ? 'bg-white text-indigo-600 shadow-md' : 'bg-transparent text-indigo-400 hover:bg-white/30'}`}
            >
                瀏覽見證
            </button>
            {registration && (
                <button 
                    onClick={() => setActiveTab('write')}
                    className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'write' ? 'bg-white text-pink-600 shadow-md' : 'bg-transparent text-pink-400 hover:bg-white/30'}`}
                >
                    分享感動
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'wall' ? (
                testimonies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-indigo-300">
                        <Heart className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">目前還沒有見證，成為第一個分享的人吧！</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testimonies.map(t => (
                            <div key={t.id} className="bg-white p-4 rounded shadow-sm hover:shadow-md transition-shadow border border-indigo-50 relative group">
                                <div className="text-gray-700 text-sm leading-relaxed mb-4 min-h-[80px]">
                                    "{t.content}"
                                </div>
                                <div className="text-right text-xs text-indigo-400 font-bold mt-2 border-t pt-2">
                                    — {t.authorName}
                                </div>
                                <div className="absolute top-2 right-2 text-pink-200">
                                    <Heart className="w-4 h-4 fill-current" />
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="max-w-lg mx-auto bg-white p-8 rounded shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">寫下您的感動</h3>
                    <p className="text-gray-500 text-sm mb-6 text-center">您的分享可能會成為他人的祝福</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="這次聖殿旅行團中，您有什麼特別的體會或靈性經驗嗎？"
                            className="w-full h-40 p-4 border border-indigo-100 rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none bg-indigo-50/30"
                            required
                        />
                        
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer select-none text-gray-600 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={isAnonymous}
                                    onChange={e => setIsAnonymous(e.target.checked)}
                                    className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                匿名發布
                            </label>
                            <button 
                                type="submit"
                                className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center"
                            >
                                <Send className="w-4 h-4 mr-2" /> 發布
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
      <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
    </div>
  );
};

export default TestimonyWallModal;
