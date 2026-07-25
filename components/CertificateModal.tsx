import React from 'react';
import { Registration, EventData } from '../types';
import { Printer, X, Award } from 'lucide-react';

interface CertificateModalProps {
  registration: Registration;
  event: EventData;
  onClose: () => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ registration, event, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-white w-[800px] max-w-full rounded shadow-2xl relative overflow-hidden">
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex space-x-2 print:hidden z-10">
            <button 
                onClick={() => window.print()}
                className="bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 flex items-center text-sm shadow"
            >
                <Printer className="w-4 h-4 mr-1" /> 下載/列印
            </button>
            <button 
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 flex items-center text-sm shadow"
            >
                <X className="w-4 h-4 mr-1" /> 關閉
            </button>
        </div>

        {/* Certificate Design */}
        <div className="p-10 border-[20px] border-double border-yellow-600 m-4 relative bg-[#fffdf5]">
            {/* Watermark/Background decoration */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <Award className="w-96 h-96 text-yellow-600" />
            </div>

            <div className="text-center relative z-0 space-y-8 py-10">
                
                {/* Title */}
                <div>
                    <h1 className="text-5xl font-serif text-yellow-800 font-bold mb-2 tracking-wide">結 業 證 書</h1>
                    <p className="text-sm font-serif text-gray-500 uppercase tracking-[0.3em]">Certificate of Completion</p>
                </div>

                {/* Body */}
                <div className="text-lg text-gray-800 font-serif leading-relaxed">
                    <p>茲證明</p>
                    <h2 className="text-4xl font-bold my-6 border-b-2 border-gray-300 inline-block px-10 pb-2">{registration.name}</h2>
                    <p>參加由 嘉義支聯會 主辦之</p>
                    <h3 className="text-2xl font-bold text-blue-900 my-4">「{event.event_date} 聖殿旅行團」</h3>
                    <p>已圓滿完成所有行程，並展現對聖殿教儀之熱忱。</p>
                    <p className="mt-2">特頒此證，以資鼓勵。</p>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end px-16 mt-16">
                    <div className="text-center">
                        <div className="w-40 border-b border-black mb-2"></div>
                        <p className="font-serif text-sm">支聯會會長</p>
                    </div>
                    <div className="w-24 h-24 relative">
                         {/* Seal Mockup */}
                         <div className="absolute inset-0 border-4 border-red-700 rounded-full flex items-center justify-center text-red-700 font-bold opacity-80 rotate-[-15deg]">
                             <div className="text-center text-xs">
                                 <div>THE CHURCH OF</div>
                                 <div>JESUS CHRIST</div>
                                 <div className="text-[10px]">OF LATTER-DAY SAINTS</div>
                             </div>
                         </div>
                    </div>
                    <div className="text-center">
                        <div className="w-40 border-b border-black mb-2"></div>
                        <p className="font-serif text-sm">活動委員會主席</p>
                    </div>
                </div>

                <div className="text-xs text-gray-400 mt-10 font-mono">
                    ID: {registration.reg_id} • Date: {event.event_date}
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
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default CertificateModal;
