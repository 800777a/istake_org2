import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning'
}) => {
  const { t } = useTranslation();

  const colors = {
    danger: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-indigo-600 text-white'
  };

  const btnColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className={`flex items-center gap-3 px-4 py-3 ${colors[type]}`}>
              <AlertTriangle size={18} />
              <span className="text-sm font-bold">{title || t('common.notice', '通知')}</span>
              <button onClick={onClose} className="ml-auto hover:bg-white/20 p-1 rounded-md transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 leading-relaxed text-center">
                {message}
              </p>
            </div>

            <div className="p-4 bg-slate-50 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
              >
                {cancelText || t('common.cancel', '取消')}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all shadow-md ${btnColors[type]}`}
              >
                {confirmText || t('common.confirm', '確定')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
