import React from 'react';
import { Registration, EventData } from '../types';
import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
  registration: Registration;
  event: EventData;
  unit: string;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ registration, event, unit, onClose }) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-[800px] max-w-full rounded shadow-xl overflow-hidden">
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex space-x-2 print:hidden">
            <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center text-sm shadow"
            >
                <Printer className="w-4 h-4 mr-1" /> 列印
            </button>
            <button 
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 flex items-center text-sm shadow"
            >
                <X className="w-4 h-4 mr-1" /> 關閉
            </button>
        </div>

        {/* Receipt Content */}
        <div className="p-10 print:p-0">
            <div className="border-4 border-double border-gray-800 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-widest mb-2">聖殿旅行團 收據</h1>
                    <p className="text-gray-500 text-sm">Temple Trip Official Receipt</p>
                </div>

                <div className="flex justify-between items-end mb-6 border-b border-gray-300 pb-2">
                    <div className="text-sm">
                        <p>單位：<span className="font-bold text-lg">{unit}</span></p>
                    </div>
                    <div className="text-sm text-right">
                        <p>日期：{currentDate}</p>
                        <p>單號：{registration.reg_id.slice(-8).toUpperCase()}</p>
                    </div>
                </div>

                <div className="mb-8 space-y-4 text-gray-800">
                    <div className="flex items-baseline">
                        <span className="w-24 font-bold">茲收到</span>
                        <span className="border-b border-black flex-1 px-2 text-xl font-medium">{registration.name}</span>
                        <span className="ml-2">成員</span>
                    </div>
                    
                    <div className="flex items-baseline">
                        <span className="w-24 font-bold">繳交金額</span>
                        <span className="border-b border-black flex-1 px-2 text-xl font-mono">NT$ {registration.amount_due}</span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-24 font-bold">活動項目</span>
                        <span className="border-b border-black flex-1 px-2">{event.event_date} 聖殿旅行團 ({registration.trip_type})</span>
                    </div>
                    
                    <div className="flex items-baseline">
                        <span className="w-24 font-bold">付款方式</span>
                        <span className="border-b border-black flex-1 px-2">{registration.payment_method}</span>
                    </div>
                </div>

                <div className="mt-12 flex justify-between items-center text-sm">
                    <div className="text-center w-1/3">
                        <div className="border-b border-black mb-2 h-8"></div>
                        <p>經手人簽章</p>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="border-b border-black mb-2 h-8"></div>
                        <p>主管簽核</p>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                    * 本收據僅供教會活動內部證明使用
                </div>
            </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
          .fixed * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
