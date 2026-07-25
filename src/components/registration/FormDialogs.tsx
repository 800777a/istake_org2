import React, { useState } from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Edit, Save, CheckCircle, Clock } from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ConfirmationModal from '../ConfirmationModal';

interface FormDialogsProps {
    showSubmitConfirm: boolean;
    setShowSubmitConfirm: (val: boolean) => void;
    showQueryConfirm: boolean;
    setShowQueryConfirm: (val: boolean) => void;
    confirmAction: { type: string; payload?: any } | null;
    setConfirmAction: (val: any) => void;
    handleSaveAndSubmit: () => void;
    executeGoToStats: () => void;
    executeAbandon: () => void;
    executeAbandonToLookup: () => void;
    executeBackToRegister: () => void;
    executeCancelMember: () => void;
    executeCancelFamily: () => void;
    lockCountdown: number;
    showLockModal: boolean;
    setShowLockModal: (val: boolean) => void;
}

const FormDialogs: React.FC<FormDialogsProps> = ({
    showSubmitConfirm,
    setShowSubmitConfirm,
    showQueryConfirm,
    setShowQueryConfirm,
    confirmAction,
    setConfirmAction,
    handleSaveAndSubmit,
    executeGoToStats,
    executeAbandon,
    executeAbandonToLookup,
    executeBackToRegister,
    executeCancelMember,
    executeCancelFamily,
    lockCountdown,
    showLockModal,
    setShowLockModal,
}) => {
    const { t, tString } = useI18n();
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    return (
        <>
            {showLockModal && lockCountdown > 0 && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-red-500 animate-in zoom-in-95 duration-200">
                        <Clock className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
                        <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{t('stake.registration.form.dialogs.locked_title')}</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                            {t('stake.registration.form.dialogs.locked_msg')}
                        </p>
                        <div className="text-5xl font-mono font-black text-red-600 bg-red-50 py-4 rounded-xl border border-red-100 shadow-inner mb-6">
                            {lockCountdown}s
                        </div>
                        <button 
                            onClick={() => setShowLockModal(false)}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                        >
                            {t('stake.registration.form.dialogs.locked_btn')}
                        </button>
                    </div>
                </div>
            )}

            {showSubmitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-fade-in border-2 border-green-50">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="bg-green-100 p-3 rounded-full mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">{t('stake.registration.form.dialogs.submit_ready_title')}</h3>
                            <p className="text-sm text-gray-600 font-medium">{t('stake.registration.form.dialogs.submit_ready_msg')}</p>
                        </div>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => setShowSubmitConfirm(false)} 
                                className="bg-orange-100 text-orange-800 w-full py-3 rounded-lg font-bold shadow hover:bg-orange-200 transition-colors flex items-center justify-center text-sm ring-1 ring-orange-200"
                            >
                                <Edit className="w-4 h-4 mr-2" /> {t('stake.registration.form.dialogs.continue_edit_btn')}
                            </button>
                            <button 
                                onClick={() => setShowSaveConfirm(true)} 
                                className="bg-green-100 text-green-800 w-full py-3 rounded-lg font-bold shadow hover:bg-green-200 transition-colors flex items-center justify-center text-sm ring-1 ring-green-200"
                            >
                                <Save className="w-4 h-4 mr-2" /> {t('stake.registration.form.dialogs.save_submit_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                onConfirm={handleSaveAndSubmit}
                title={t('common.notice', '通知')}
                message={t('common.confirm_save', '確定要儲存目前的變動嗎？')}
                confirmText={t('common.confirm', '確定')}
                type="info"
            />
            
            {showQueryConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full animate-fade-in">
                        <h3 className="text-xl font-bold text-red-600 mb-4">{t('stake.registration.form.dialogs.abandon_query_title')}</h3>
                        <p className="text-sm text-gray-600 mb-6">{t('stake.registration.form.dialogs.abandon_query_msg')}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowQueryConfirm(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-sm">{t('stake.registration.form.dialogs.cancel_btn')}</button>
                            <button onClick={executeGoToStats} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-700 text-sm">{t('stake.registration.form.dialogs.leave_btn')}</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'abandon'}
                title={t('stake.registration.form.dialogs.abandon_reg_title')}
                message={t('stake.registration.form.dialogs.abandon_reg_msg')}
                confirmText={t('stake.registration.form.dialogs.abandon_confirm_btn')}
                onConfirm={executeAbandon}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'abandonToLookup'}
                title={t('stake.registration.form.dialogs.switch_mode_title')}
                message={t('stake.registration.form.dialogs.switch_mode_msg')}
                confirmText={t('stake.registration.form.dialogs.abandon_confirm_btn')}
                onConfirm={executeAbandonToLookup}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'backToRegister'}
                title={t('stake.registration.form.dialogs.back_to_reg_title')}
                message={t('stake.registration.form.dialogs.back_to_reg_msg')}
                confirmText={t('stake.registration.form.dialogs.back_to_reg_btn')}
                onConfirm={executeBackToRegister}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'cancelReg'}
                title={t('stake.registration.form.dialogs.delete_member_title')}
                message={t('stake.registration.form.dialogs.delete_member_msg', { name: confirmAction?.payload?.name })}
                confirmText={t('stake.registration.form.dialogs.delete_btn')}
                onConfirm={executeCancelMember}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />

            <ConfirmDialog 
                isOpen={confirmAction?.type === 'cancelAll'}
                title={t('stake.registration.form.dialogs.delete_family_title')}
                message={t('stake.registration.form.dialogs.delete_family_msg')}
                confirmText={t('stake.registration.form.dialogs.delete_btn')}
                onConfirm={executeCancelFamily}
                onCancel={() => setConfirmAction(null)}
                isDangerous={true}
            />
        </>
    );
};

export default FormDialogs;
