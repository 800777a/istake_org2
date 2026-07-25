
import React from 'react';
import { useI18n } from '../src/contexts/LanguageContext';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel,
  isDangerous = false
}) => {
  const { t, tString } = useI18n();
  if (!isOpen) return null;

  const displayConfirmText = confirmText || t('common.confirm', '確定');
  const displayCancelText = cancelText || t('common.cancel', '取消');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
      <div className="bg-white rounded-none md:rounded-[8px] shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
        <div className={`p-4 flex items-center ${isDangerous ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800'}`}>
          <AlertTriangle className="w-6 h-6 mr-3 flex-shrink-0" />
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        
        <div className="p-6 text-gray-700 text-sm leading-relaxed">
          {message}
        </div>

        <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onCancel}
            className="w-full md:w-auto h-10 md:h-10 px-4 rounded-none md:rounded-[8px] text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 font-bold text-xs flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 mr-1" /> {displayCancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`w-full md:w-auto h-10 md:h-10 px-4 rounded-none md:rounded-[8px] text-white font-bold text-xs flex items-center justify-center shadow-sm transition-colors ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Check className="w-4 h-4 mr-1" /> {displayConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
