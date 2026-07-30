import React from 'react';
import { LostItem, EventData } from '../types';
import { X, Search, MapPin } from 'lucide-react';

interface LostFoundModalProps {
  event: EventData;
  onClose: () => void;
}

const LostFoundModal: React.FC<LostFoundModalProps> = ({ event, onClose }) => {
  const items = event.lostItems || [];
  const unclaimed = items.filter(i => i.status === 'unclaimed');
  const claimed = items.filter(i => i.status === 'claimed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-[500px] max-w-full rounded shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-800 p-4 text-white flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold flex items-center">
                <Search className="w-5 h-5 mr-2" /> 失物招領
            </h2>
            <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-4 overflow-y-auto bg-gray-50 flex-1">
            <div className="mb-4 text-sm text-gray-500 text-center">
                若您遺失了物品，請查看下方清單。若確認是您的物品，請聯繫負責人。
            </div>

            {items.length === 0 ? (
                <div className="text-center py-10 text-gray-400">目前沒有失物紀錄</div>
            ) : (
                <div className="space-y-4">
                    {/* Unclaimed */}
                    {unclaimed.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded shadow-sm border border-l-4 border-l-orange-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{item.itemName}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    <div className="flex items-center text-xs text-gray-400 mt-2">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        拾獲地點: {item.foundLocation}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold">待認領</span>
                            </div>
                        </div>
                    ))}

                    {/* Claimed */}
                    {claimed.length > 0 && (
                        <>
                            <div className="text-center text-xs text-gray-400 my-4 border-t pt-2">以下物品已結案</div>
                            {claimed.map(item => (
                                <div key={item.id} className="bg-gray-100 p-4 rounded border border-gray-200 opacity-70">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-600 line-through">{item.itemName}</h3>
                                            <p className="text-xs text-gray-500">{item.description}</p>
                                        </div>
                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">已領取</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LostFoundModal;
