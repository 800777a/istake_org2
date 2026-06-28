
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Search, Check, XCircle, Clock, Shield, X, CheckCircle } from 'lucide-react';
import { 
    RegistrationMemberInput, IdentityType, OrdinanceItem, PaymentMethod, Registration, 
    DietaryType, TripType 
} from '../types';
import * as sheetService from '../services/sheetService';
import MemberSection from '../src/components/registration/MemberSection';
import RegistrationDashboard from '../src/components/registration/RegistrationDashboard';
import PrimaryContactSection from '../src/components/registration/PrimaryContactSection';
import RegistrationHeader from '../src/components/registration/RegistrationHeader';
import LookupSection from '../src/components/registration/LookupSection';
import PaymentSection from '../src/components/registration/PaymentSection';
import FormDialogs from '../src/components/registration/FormDialogs';
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import { useI18n } from '../src/contexts/LanguageContext';

interface RegistrationFormProps {
  onGoHome?: () => void;
  onGoToStats?: () => void;
  setIsDirty?: (dirty: boolean) => void; 
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onGoHome, onGoToStats, setIsDirty }) => {
  const { currentLang, setLang } = useI18n();
  const lang = currentLang as 'zh' | 'en';
  const { t } = useTranslation();
  const {
      mode, setMode,
      activeEvent, settings, loading, setLoading, msg, setMsg,
      eventStats, ordinanceStats, blacklist, personalInfoList, representatives,
      primaryName, setPrimaryName,
      primaryPassword, setPrimaryPassword,
      primaryContactPhone, setPrimaryContactPhone,
      primaryUnit, setPrimaryUnit,
      paymentMethod, setPaymentMethod,
      transferLast5, setTransferLast5,
      members, setMembers,
      editingFamilyGroupId, setEditingFamilyGroupId,
      lookupUnit, setLookupUnit,
      lookupName, setLookupName,
      lookupPassword, setLookupPassword,
      lookupResults, setLookupResults,
      lookupAttempts, setLookupAttempts,
      lookupLockCountdown,
      lockCountdown,
      addMember,
      isFormDirty,
      validateForm,
      executeSubmit,
      handleReset,
      removeMember,
      updateMember,
      updateMemberBirthday,
      calculateMemberPrice,
      getTotalFamilyDue,
      isRegistrationClosedCheck,
      isRepresentativeMatched, setIsRepresentativeMatched,
      isPrimaryNameFinished, setIsPrimaryNameFinished
  } = useRegistrationForm(setIsDirty);

  const [confirmAction, setConfirmAction] = useState<{ type: 'abandon' | 'cancelReg' | 'cancelAll' | 'abandonToLookup' | 'backToRegister', payload?: any } | null>(null);
  const [showQueryConfirm, setShowQueryConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  // Date Selectors Data
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 100}, (_, i) => currentYear - i);
  const months = Array.from({length: 12}, (_, i) => i + 1);
  const days = Array.from({length: 31}, (_, i) => i + 1);

  const proxyOptions = [OrdinanceItem.BAPTISM, OrdinanceItem.CONFIRMATION, OrdinanceItem.INITIATORY, OrdinanceItem.ENDOWMENT, OrdinanceItem.SEALING];
  const livingOptions = [OrdinanceItem.ENDOWMENT, OrdinanceItem.SEALING, OrdinanceItem.OBSERVER];

  const isClosed = isRegistrationClosedCheck();

  const handleSubmitTrigger = async (e: React.FormEvent) => { 
      e.preventDefault();
      const isValid = await validateForm();
      if (isValid) setShowSubmitConfirm(true);
  };

  const executeAbandon = () => {
      if (onGoHome) onGoHome();
      else window.location.reload(); 
      setConfirmAction(null);
  };

  const handleDownloadConfig = () => {
      const data = { primary_name: primaryName, primary_phone: primaryPassword, primary_unit: primaryUnit, members: members };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const datePrefix = activeEvent ? activeEvent.event_date.replace(/-/g, '_') : 'draft';
      a.download = `${datePrefix}_聖殿之旅_報名檔.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  };

  const handleUploadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const data = JSON.parse(evt.target?.result as string);
              if (data.members && Array.isArray(data.members)) {
                  setPrimaryName(data.primary_name || '');
                  setPrimaryPassword(data.primary_phone || '');
                  setPrimaryUnit(data.primary_unit || '');
                  setMembers(data.members.map((m: RegistrationMemberInput, idx: number) => ({ ...m, temp_id: `imp-${Date.now()}-${idx}` })));
                  setMsg({ type: 'success', text: t('stake.registration.form.upload_success_msg') });
              } else setMsg({ type: 'error', text: t('stake.registration.form.upload_format_error') });
          } catch (err) { setMsg({ type: 'error', text: t('stake.registration.form.upload_fail_msg') }); }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const refreshLookup = async () => { 
      if (lookupLockCountdown > 0 || !activeEvent || !lookupPassword || !lookupUnit || !lookupName) return; 
      let results: Registration[] = [];
      try {
          results = await sheetService.lookupRegistration(lookupUnit, lookupName, lookupPassword.trim(), activeEvent.event_id);
      } catch (e: any) {
          setMsg({ type: 'error', text: t('stake.registration.form.lookup_fail_prefix') + (e.message || t('stake.registration.form.unknown_error')) });
          return;
      }
      const match = results.find(r => (r.primary_contact_name?.trim() === lookupName.trim() || r.name.trim() === lookupName.trim()) && r.unit === lookupUnit);
      if (match) {
          setLookupAttempts(0);
          const familyId = match.family_group_id;
          setEditingFamilyGroupId(familyId);
          setPrimaryName(match.primary_contact_name || match.name); 
          setPrimaryContactPhone(match.contact_phone || ''); 
          setPrimaryPassword(lookupPassword.trim()); 
          setPrimaryUnit(match.unit);
          setPaymentMethod(match.payment_method);
          setTransferLast5(match.transfer_last_5 || '');
          const validMembers = results.filter(r => !r.reg_id.startsWith('VIRT-') && r.family_group_id === familyId);
          setMembers(validMembers.map(r => ({
              temp_id: r.reg_id, serial_number: r.serial_number, endowment_serial_number: r.endowment_serial_number, baptism_serial_number: r.baptism_serial_number,
              created_at: r.created_at, name: r.name, identity_id: r.identity_id, birth_date: r.birth_date, trip_type: r.trip_type, identity_type: r.identity_type,
              ordinance_type: r.ordinance_type, ordinance_item: r.ordinance_item, ceremony_session: r.ceremony_session, is_staff: r.is_staff, staff_role: r.staff_role,
              is_new_member: r.is_new_member, boarding_place: r.boarding_place, dietary_preference: r.dietary_preference || DietaryType.NO_MEAL
          })));
          if (validMembers.length === 0) { setMembers([]); setTimeout(() => addMember(), 0); }
          setMode('register');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setMsg({ type: 'success', text: t('stake.registration.form.verify_success_msg') });
      } else { 
          const newAttempts = lookupAttempts + 1;
          setLookupAttempts(newAttempts);
          if (newAttempts >= 3) {
              const lockTime = Date.now() + 180 * 1000;
              localStorage.setItem('lookup_lock_until', lockTime.toString());
              setLookupUnit(''); setLookupName(''); setLookupPassword('');
              setMsg({ type: 'error', text: t('stake.registration.form.too_many_attempts_lock') });
          } else setMsg({ type: 'error', text: t('stake.registration.form.lookup_fail_msg', { count: 3 - newAttempts }) });
          setLookupResults(null); 
      } 
  };

  const executeCancelMember = async () => {
      if (confirmAction?.type === 'cancelReg' && confirmAction.payload) {
          const member = confirmAction.payload as RegistrationMemberInput;
          if (editingFamilyGroupId && member.temp_id.startsWith('R-')) {
              setLoading(true);
              try {
                  await sheetService.deleteRegistration(member.temp_id);
                  setMembers(members.filter(m => m.temp_id !== member.temp_id));
                  setMsg({ type: 'success', text: t('stake.registration.form.member_deleted_msg') });
              } catch (e: any) { setMsg({ type: 'error', text: t('stake.registration.form.delete_fail_prefix') + e.message });
              } finally { setLoading(false); }
          } else removeMember(member.temp_id);
      }
      setConfirmAction(null);
  };

  const executeCancelFamily = async () => {
      if (confirmAction?.type === 'cancelAll' && confirmAction.payload) {
          const result = await sheetService.cancelFamilyRegistration(confirmAction.payload);
          if (result.success) {
              setMsg({ type: 'success', text: t('stake.registration.form.family_deleted_msg') });
              handleReset(); setMode('register'); 
              const lockTime = Date.now() + 180 * 1000;
              localStorage.setItem('reg_lock_until', lockTime.toString());
              setShowLockModal(true);
          } else setMsg({ type: 'error', text: result.message });
      }
      setConfirmAction(null);
  };

  if (!activeEvent) return <div className="p-8 text-center text-gray-500">{t('stake.registration.form.no_active_event')}</div>;

  const enabledIdentities = settings.billingConfig?.identityPricings?.length ? [...settings.billingConfig.identityPricings].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => p.identity) : (settings.active_identities?.length ? settings.active_identities : Object.values(IdentityType));
  const enabledTripTypes = settings.billingConfig?.tripPricings?.length ? [...settings.billingConfig.tripPricings].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => p.trip) : Object.values(TripType).filter(t => t !== TripType.RETAINED);
  const unitsOptions = settings.billingConfig?.units?.length ? [...settings.billingConfig.units].sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0)).map(u => ({ value: u.shortName, label: u.shortName })) : settings.units.map(u => ({ value: u, label: u }));

  return (
    <div className="p-6 relative">
      {msg && (
          <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-lg shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border ${msg.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-black border-transparent'}`}>
              {msg.type === 'error' ? <XCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3 text-black" />}
              <span className="font-bold">{msg.text}</span>
              <button onClick={() => setMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full"><X className="w-4 h-4" /></button>
          </div>
      )}

      <FormDialogs 
          showSubmitConfirm={showSubmitConfirm} setShowSubmitConfirm={setShowSubmitConfirm} showQueryConfirm={showQueryConfirm} setShowQueryConfirm={setShowQueryConfirm}
          confirmAction={confirmAction} setConfirmAction={setConfirmAction} handleSaveAndSubmit={() => { handleDownloadConfig(); setTimeout(executeSubmit, 500); }}
          executeGoToStats={() => { setShowQueryConfirm(false); if (onGoToStats) onGoToStats(); }} executeAbandon={executeAbandon} executeAbandonToLookup={() => { handleReset(); setMode('lookup'); setMsg(null); setConfirmAction(null); }}
          executeBackToRegister={() => { setLookupUnit(''); setLookupName(''); setLookupPassword(''); setMode('register'); setMsg(null); setConfirmAction(null); }}
          executeCancelMember={executeCancelMember} executeCancelFamily={executeCancelFamily} lockCountdown={lockCountdown} showLockModal={showLockModal} setShowLockModal={setShowLockModal}
      />
      
      <RegistrationHeader 
          mode={mode} setMode={setMode} lang={lang} setLang={setLang} activeEvent={activeEvent}
          lockCountdown={lockCountdown} handleResetAndRegister={() => { setMode('register'); handleReset(); }}
          isFormDirty={isFormDirty} setLookupIntent={() => {}} setConfirmAction={setConfirmAction}
          setMsg={setMsg} handleDownloadConfig={handleDownloadConfig} handleUploadConfig={handleUploadConfig}
      />

      <LookupSection 
          mode={mode} lookupIntent="edit" lookupLockCountdown={lookupLockCountdown} lookupUnit={lookupUnit} setLookupUnit={setLookupUnit} lookupName={lookupName} setLookupName={setLookupName}
          lookupPassword={lookupPassword} setLookupPassword={setLookupPassword} handleLookup={(e) => { e.preventDefault(); refreshLookup(); }} handleBackToRegister={() => setMode('register')} settings={settings}
      />

      {mode === 'register' && (
      <form onSubmit={handleSubmitTrigger} className="space-y-6">
        <RegistrationDashboard activeEvent={activeEvent} eventStats={eventStats} ordinanceStats={ordinanceStats} deadlineDisplay={activeEvent.registrationDeadline ? new Date(activeEvent.registrationDeadline).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('common.status.notSet')} isClosed={isClosed} lang={lang} />

        {activeEvent?.stop_cancellation && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl shadow-sm mb-6 flex items-center animate-fade-in ring-1 ring-amber-100">
                <Shield className="w-5 h-5 mr-3 text-amber-600 shrink-0" />
                <span className="font-bold text-sm">{t('stake.registration.form.insured_not_cancel_hint')}</span>
            </div>
        )}

        <PrimaryContactSection 
            primaryName={primaryName} setPrimaryName={setPrimaryName} primaryUnit={primaryUnit} setPrimaryUnit={setPrimaryUnit}
            primaryPassword={primaryPassword} setPrimaryPassword={setPrimaryPassword} primaryContactPhone={primaryContactPhone} setPrimaryContactPhone={setPrimaryContactPhone}
            units={unitsOptions} isRepresentativeMatched={isRepresentativeMatched} setIsRepresentativeMatched={setIsRepresentativeMatched}
            isPrimaryNameFinished={isPrimaryNameFinished} setIsPrimaryNameFinished={setIsPrimaryNameFinished} representatives={representatives}
            editingFamilyGroupId={editingFamilyGroupId} members={members} setMembers={setMembers} personalInfoList={personalInfoList}
        />

        <MemberSection 
            members={members} lang={lang} activeEvent={activeEvent!} settings={settings} enabledIdentities={enabledIdentities} enabledTripTypes={enabledTripTypes}
            years={years} months={months} days={days} proxyOptions={proxyOptions} livingOptions={livingOptions} lockCountdown={lockCountdown} personalInfoList={personalInfoList}
            primaryUnit={primaryUnit} primaryName={primaryName} isPrimaryNameFinished={isPrimaryNameFinished} onAddMember={addMember} onUpdateMember={updateMember}
            onUpdateBirthday={updateMemberBirthday} onDeleteMember={(m) => setConfirmAction({ type: 'cancelReg', payload: m })} calculateMemberPrice={calculateMemberPrice}
        />

        {(!activeEvent?.paymentDisplayMode || activeEvent.paymentDisplayMode !== 'none') && (
            <PaymentSection paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} transferLast5={transferLast5} setTransferLast5={setTransferLast5} totalDue={getTotalFamilyDue()} availablePaymentMethods={[PaymentMethod.CASH, PaymentMethod.TRANSFER].filter(m => !settings.payment_methods || settings.payment_methods.includes(m))} settings={settings} lang={lang} />
        )}
        
        <div className="pt-4 border-t flex gap-4 w-full flex-wrap md:flex-nowrap">
             <button type="button" onClick={() => isFormDirty() ? setConfirmAction({ type: 'abandon' }) : executeAbandon()} disabled={loading} className={`w-full md:flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-lg shadow hover:bg-red-200 focus:outline-none transition-colors text-sm flex items-center justify-center ring-1 ring-red-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                 <LogOut className="w-4 h-4 mr-2" /> {t('stake.registration.form.discard_btn')}
             </button>
             <button type="button" onClick={() => isFormDirty() ? setShowQueryConfirm(true) : (onGoToStats && onGoToStats())} className="w-full md:flex-1 py-3 bg-green-100 text-green-700 font-bold rounded-lg shadow hover:bg-green-200 focus:outline-none transition-colors text-sm flex items-center justify-center ring-1 ring-green-200">
                 <Search className="w-4 h-4 mr-2" /> {t('stake.registration.form.lookup_btn')}
             </button>
             <button type="submit" disabled={loading || settings.maintenance_mode || isClosed || lockCountdown > 0} className={`w-full md:flex-1 py-3 bg-blue-100 text-blue-700 font-bold rounded-lg shadow hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm ring-1 ring-blue-200 ${loading || settings.maintenance_mode || isClosed || lockCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                 {settings.maintenance_mode ? <Shield className="w-4 h-4 mr-2" /> : isClosed ? <XCircle className="w-4 h-4 mr-2" /> : lockCountdown > 0 ? <Clock className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                 {settings.maintenance_mode ? t('stake.registration.form.maintenance_label') : isClosed ? t('stake.registration.form.reg_closed_label') : lockCountdown > 0 ? `${lockCountdown}s` : (loading ? t('stake.registration.form.processing_label') : (editingFamilyGroupId ? t('stake.registration.form.confirm_edit_btn') : t('stake.registration.form.submit_btn')))}
             </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default RegistrationForm;
