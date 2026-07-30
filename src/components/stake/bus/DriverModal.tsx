
import React, { useState } from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { BusDriver, BusCompany, BusVehicle } from '../../../../types';
import ConfirmationModal from '../../ConfirmationModal';

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    editingDriver: BusDriver | null;
    companies: BusCompany[];
    vehicles: BusVehicle[];
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSave, editingDriver, companies, vehicles }) => {
    const { t, tString } = useI18n();
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [data, setData] = React.useState({ name: '', phone: '', companyId: '', companyName: '', plate: '' });

    React.useEffect(() => {
        if (editingDriver) {
            setData({
                name: editingDriver.name,
                phone: editingDriver.phone,
                companyId: editingDriver.companyId,
                companyName: editingDriver.companyName,
                plate: editingDriver.plate || ''
            });
        } else {
            setData({ name: '', phone: '', companyId: '', companyName: '', plate: '' });
        }
    }, [editingDriver, isOpen]);

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
                        {editingDriver ? t('bus.modal.editDriver') : t('bus.modal.addDriver')}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.driverName')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-indigo-500 outline-none font-black" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.phone')}</label>
                            <input className="w-full p-3 border-2 rounded focus:border-indigo-500 outline-none font-mono" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.company')}</label>
                            <select 
                                className="w-full p-3 border-2 rounded focus:border-indigo-500 outline-none bg-white"
                                value={`${data.companyId}|${data.companyName}`}
                                onChange={e => {
                                    const [id, name] = e.target.value.split('|');
                                    setData({...data, companyId: id, companyName: name, plate: ''});
                                }}
                            >
                                <option value="">{tString('bus.placeholder.selectCompany')}</option>
                                {companies.map(c => (
                                    <option key={c.id} value={`${c.id}|${c.name1}`}>{c.name1}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">{t('bus.field.pairedVehicle')}</label>
                            <select 
                                className="w-full p-3 border-2 rounded focus:border-indigo-500 outline-none bg-white"
                                value={data.plate} onChange={e => setData({...data, plate: e.target.value})}
                                disabled={!data.companyId}
                            >
                                <option value="">{tString('bus.placeholder.selectPlateOptional')}</option>
                                {vehicles.filter(v => v.companyId === data.companyId).map(v => (
                                    <option key={v.plate} value={v.plate}>{v.plate}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSaveConfirm(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded font-black shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <Save size={20}/> {editingDriver ? t('bus.button.updateDriver') : t('bus.button.saveDriver')}
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

export default DriverModal;
