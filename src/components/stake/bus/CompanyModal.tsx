
import React, { useState } from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BusCompany } from '../../../../types';
import ConfirmationModal from '../../ConfirmationModal';

interface CompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    editingCompany: BusCompany | null;
}

const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, onSave, editingCompany }) => {
    const { t, tString } = useI18n();
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [data, setData] = React.useState({ name1: '', name2: '', name3: '', phone: '', manager: '' });

    React.useEffect(() => {
        if (editingCompany) {
            setData({
                name1: editingCompany.name1,
                name2: editingCompany.name2 || '',
                name3: editingCompany.name3 || '',
                phone: editingCompany.phone || '',
                manager: editingCompany.manager || ''
            });
        } else {
            setData({ name1: '', name2: '', name3: '', phone: '', manager: '' });
        }
    }, [editingCompany, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden border-4 border-gray-100"
            >
                <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter">
                        {editingCompany ? t('bus.modal.editCompany') : t('bus.modal.addCompany')}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.companyName')}</label>
                        <input 
                            className="w-full p-3 border-2 rounded focus:border-blue-500 outline-none font-black" 
                            value={data.name1} onChange={e => setData({...data, name1: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.name2')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-blue-500 outline-none" value={data.name2} onChange={e => setData({...data, name2: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.name3')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-blue-500 outline-none" value={data.name3} onChange={e => setData({...data, name3: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.manager')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-blue-500 outline-none" value={data.manager} onChange={e => setData({...data, manager: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.phone')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-blue-500 outline-none font-mono" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSaveConfirm(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded font-black shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <Save size={20}/> {editingCompany ? t('bus.button.updateCompany') : t('bus.button.saveCompany')}
                    </button>
                </div>
            </motion.div>
            <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                onConfirm={() => onSave(data)}
                title={t('common.notice', '通知')}
                message={t('common.confirm_save', '確定要儲存目前的變動嗎？')}
                confirmText={t('common.confirm', '確定')}
                type="info"
            />
        </div>
    );
};

export default CompanyModal;
