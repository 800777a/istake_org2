
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert } from 'lucide-react';

interface ExportChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mask: boolean, toEditor: boolean, scope?: 'all' | 'unpaid') => void;
  showScopeSelector?: boolean;
}

const ExportChoiceModal: React.FC<ExportChoiceModalProps> = ({ isOpen, onClose, onConfirm, showScopeSelector = false }) => {
  const [destination, setDestination] = React.useState<'download' | 'editor'>('download');
  const [scope, setScope] = React.useState<'all' | 'unpaid'>('all');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded shadow-2xl w-full max-w-sm overflow-hidden border-4 border-white"
          >
            {/* Title Bar */}
            <div className="px-8 py-5 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="font-black text-xl text-gray-900 tracking-tight">
                  選擇輸出方式
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {showScopeSelector && (
                <div className="mb-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">名單範圍 / Scope</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded">
                    <button 
                      onClick={() => setScope('all')}
                      className={`py-2.5 rounded text-xs font-black transition-all ${scope === 'all' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      全部名單
                    </button>
                    <button 
                      onClick={() => setScope('unpaid')}
                      className={`py-2.5 rounded text-xs font-black transition-all ${scope === 'unpaid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      未收名單
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">輸出目的地 / Destination</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded">
                  <button 
                    onClick={() => setDestination('download')}
                    className={`py-2.5 rounded text-xs font-black transition-all ${destination === 'download' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    存為檔案
                  </button>
                  <button 
                    onClick={() => setDestination('editor')}
                    className={`py-2.5 rounded text-xs font-black transition-all ${destination === 'editor' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    傳送至文書處理
                  </button>
                </div>
              </div>

              <div className="mb-8 text-center px-2">
                <p className="text-gray-800 font-bold text-base leading-relaxed">
                  名單中的姓名中間字是否需要"Ｏ"遮蔽？
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onConfirm(true, destination === 'editor', scope)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-sm shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center"
                >
                  要遮蔽 / Masked
                </button>
                <button 
                  onClick={() => onConfirm(false, destination === 'editor', scope)}
                  className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded font-black text-sm hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center"
                >
                  不遮蔽 / Normal
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 text-gray-400 rounded font-black text-sm hover:text-gray-600 transition-all"
                >
                  放　棄 / Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExportChoiceModal;
