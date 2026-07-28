import React, { useState } from 'react';
import { Registration, Feedback } from '../types';
import { Star, X } from 'lucide-react';
import { saveFeedback } from '../services/sheetService';
import Toast, { ToastType } from './Toast';

interface FeedbackModalProps {
  registration: Registration;
  onClose: () => void;
  onSubmitted: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ registration, onClose, onSubmitted }) => {
  const [transport, setTransport] = useState(0);
  const [food, setFood] = useState(0);
  const [experience, setExperience] = useState(0);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<ToastType>('success');

  const handleSubmit = () => {
      if (transport === 0 || food === 0 || experience === 0) {
          setMsgType('error');
          setMsg('請為所有項目評分');
          return;
      }

      const feedback: Feedback = {
          id: `FB-${Date.now()}`,
          reg_id: registration.reg_id,
          event_id: registration.event_id,
          rating_transport: transport,
          rating_food: food,
          rating_experience: experience,
          comment: comment,
          created_at: new Date().toISOString()
      };

      saveFeedback(feedback);
      onSubmitted();
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
      <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
          <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => onChange(star)} className="focus:outline-none transition-transform hover:scale-110">
                      <Star className={`w-8 h-8 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
              ))}
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
      <div className="bg-white w-[400px] max-w-full rounded shadow-xl relative overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white text-center relative">
            <h2 className="text-xl font-bold">活動滿意度調查</h2>
            <p className="text-sm opacity-90">您的回饋是我們進步的動力</p>
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6">
            <StarRating value={transport} onChange={setTransport} label="交通安排" />
            <StarRating value={food} onChange={setFood} label="餐點品質" />
            <StarRating value={experience} onChange={setExperience} label="整體體驗" />

            <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">其他建議或心得 (選填)</label>
                <textarea 
                    className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    rows={3}
                    placeholder="例如：冷氣太冷、便當很好吃..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
            </div>

            <button 
                onClick={handleSubmit}
                className="w-full mt-6 bg-purple-600 text-white py-3 rounded font-bold shadow hover:bg-purple-700 transition-colors"
            >
                送出回饋
            </button>
        </div>
      </div>
      <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
    </div>
  );
};

export default FeedbackModal;
