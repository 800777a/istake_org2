
import React, { useState } from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { BusVehicle, BusCompany } from '../../../../types';
import ConfirmationModal from '../../ConfirmationModal';

interface VehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    editingVehicle: BusVehicle | null;
    companies: BusCompany[];
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, onSave, editingVehicle, companies }) => {
    const { t, tString } = useI18n();
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [data, setData] = React.useState({ plate: '', companyId: '', companyName: '', seats: 42, year: '', color: '' });

    React.useEffect(() => {
        if (editingVehicle) {
            setData({
                plate: editingVehicle.plate,
                companyId: editingVehicle.companyId,
                companyName: editingVehicle.companyName,
                seats: editingVehicle.seats,
                year: editingVehicle.year,
                color: editingVehicle.color
            });
        } else {
            setData({ plate: '', companyId: '', companyName: '', seats: 42, year: new Date().getFullYear().toString(), color: t('common.color.white') });
        }
    }, [editingVehicle, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-4 border-gray-100"
            >
                <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter">
                        {editingVehicle ? t('bus.modal.editVehicle') : t('bus.modal.addVehicle')}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.plate')}</label>
                            <input 
                                className={`w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none font-black ${editingVehicle ? 'bg-gray-50 text-gray-400' : ''}`}
                                value={data.plate} onChange={e => setData({...data, plate: e.target.value})}
                                disabled={!!editingVehicle}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.company')}</label>
                            <select 
                                className="w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none bg-white"
                                value={`${data.companyId}|${data.companyName}`}
                                onChange={e => {
                                    const [id, name] = e.target.value.split('|');
                                    setData({...data, companyId: id, companyName: name});
                                }}
                            >
                                <option value="">{tString('bus.placeholder.selectCompany')}</option>
                                {companies.map(c => (
                                    <option key={c.id} value={`${c.id}|${c.name1}`}>{c.name1}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.seats')}</label>
                            <input type="number" className="w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none font-bold" value={data.seats} onChange={e => setData({...data, seats: parseInt(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.year')}</label>
                            <input className="w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none font-mono" value={data.year} onChange={e => setData({...data, year: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.color')}</label>
                            <input className="w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none" value={data.color} onChange={e => setData({...data, color: e.target.value})} />
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSaveConfirm(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <Save size={20}/> {editingVehicle ? t('bus.button.updateVehicle') : t('bus.button.saveVehicle')}
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

export default VehicleModal;
