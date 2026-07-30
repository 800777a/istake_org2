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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => setShowLockModal(false)} />
                    <div className="bg-white rounded shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-amber-600 animate-in zoom-in-95 duration-200 relative z-10">
                        <Clock className="w-16 h-16 text-amber-600 mx-auto mb-6 animate-pulse" />
                        <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{t('stake.registration.form.dialogs.locked_title')}</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                            {t('stake.registration.form.dialogs.locked_msg')}
                        </p>
                        <div className="text-5xl font-mono font-black text-red-600 bg-red-50 py-4 rounded border border-red-100 shadow-inner mb-6">
                            {lockCountdown}s
                        </div>
                        <button 
                            onClick={() => setShowLockModal(false)}
                            className="w-full py-4 bg-gray-900 text-white rounded font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                        >
                            {t('stake.registration.form.dialogs.locked_btn')}
                        </button>
                    </div>
                </div>
            )}

            {showSubmitConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => setShowSubmitConfirm(false)} />
                    <div className="bg-white rounded shadow-2xl max-w-md w-full overflow-hidden border-2 border-amber-500 animate-in zoom-in-95 duration-200 relative z-10">
                        <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-4 text-amber-950 flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-amber-900" />
                            <h3 className="font-black text-lg tracking-tight">確認送出報名？</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 font-bold leading-relaxed text-sm">
                                您即將提交報名資訊。請選擇您的處理方式：
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => {
                                        setShowSubmitConfirm(false);
                                        // executeSubmit(false) is called in RegistrationForm.tsx
                                        // But here it uses setShowSaveConfirm or handleSaveAndSubmit
                                        // We need to trigger the parents executeSubmit
                                        // Looking at RegistrationForm line 303: handleSaveAndSubmit calls executeSubmit
                                        // Actually FormDialogs.tsx has showSaveConfirm logic
                                        setShowSubmitConfirm(false);
                                        setConfirmAction({ type: 'directSubmit' }); 
                                    }}
                                    className="w-full p-4 rounded bg-red-50 border-2 border-red-200 text-red-800 flex items-center gap-3 hover:bg-red-100 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 rounded bg-red-200 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-sm md:text-base mb-0.5">1. 直接送出不儲存</div>
                                        <div className="text-[10px] md:text-xs opacity-70 font-medium leading-tight">僅完成此次報名，不會更新或覆蓋您的常用聯絡人資料</div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => {
                                        setShowSubmitConfirm(false);
                                        setShowSaveConfirm(true);
                                    }} 
                                    className="w-full p-4 rounded bg-emerald-50 border-2 border-emerald-200 text-emerald-800 flex items-center gap-3 hover:bg-emerald-100 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 rounded bg-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0">
                                        <Save className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-sm md:text-base mb-0.5">2. 儲存名單並送出 (推薦)</div>
                                        <div className="text-[10px] md:text-xs opacity-70 font-medium leading-tight text-emerald-700">系統將記住此報名名單，下次報名時可直接讀取帶入</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end border-t border-slate-100 gap-3">
                            <button 
                                onClick={() => setShowSubmitConfirm(false)}
                                className="px-6 py-2 rounded font-black text-slate-500 hover:bg-slate-200 transition-colors text-sm"
                            >
                                取消返回
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => setShowQueryConfirm(false)} />
                    <div className="bg-white rounded shadow-2xl overflow-hidden max-w-sm w-full animate-fade-in relative z-10">
                        <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-4 text-amber-950">
                            <h3 className="text-lg font-black tracking-tight">{t('stake.registration.form.dialogs.abandon_query_title')}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6">{t('stake.registration.form.dialogs.abandon_query_msg')}</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowQueryConfirm(false)} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100 font-bold text-sm">{t('stake.registration.form.dialogs.cancel_btn')}</button>
                                <button onClick={executeGoToStats} className="bg-amber-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-amber-700 text-sm">{t('stake.registration.form.dialogs.leave_btn')}</button>
                            </div>
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
