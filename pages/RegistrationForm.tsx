
import React, { useState, useEffect } from 'react';
import { useI18n } from '../src/contexts/LanguageContext';
import { LogOut, Search, Check, XCircle, Clock, Shield, X, CheckCircle, Bus, LayoutGrid } from 'lucide-react';
import { 
    RegistrationMemberInput, IdentityType, OrdinanceItem, PaymentMethod, Registration, 
    DietaryType, TripType, User
} from '../types';
import { validateNameFormat, validateIdentityId } from '../utils/validation';
import * as sheetService from '../services/sheetService';
import MemberSection from '../src/components/registration/MemberSection';
import RegistrationDashboard from '../src/components/registration/RegistrationDashboard';
import TimeNodesDisplay from '../src/components/registration/TimeNodesDisplay';
import PrimaryContactSection from '../src/components/registration/PrimaryContactSection';
import RegistrationHeader from '../src/components/registration/RegistrationHeader';
import LookupSection from '../src/components/registration/LookupSection';
import PaymentSection from '../src/components/registration/PaymentSection';
import FormDialogs from '../src/components/registration/FormDialogs';
import ConfirmationModal from '../src/components/ConfirmationModal';
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import { useRemountOnResize } from '../hooks/useRemountOnResize';
// useI18n duplicate removed

interface RegistrationFormProps {
  onGoHome?: () => void;
  onGoToStats?: (msg?: string) => void;
  setIsDirty?: (dirty: boolean) => void; 
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRoleChange?: (role: any, subTab?: string) => void;
  currentUser?: User | null;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onGoHome, onGoToStats, setIsDirty, activeTab, onTabChange, onRoleChange, currentUser }) => {
  const { currentLang, setLang } = useI18n();
  const lang = currentLang as 'zh' | 'en';
  const { t, tString } = useI18n();

  // Rule 4.2: Orientation & Hard Reset (Width-aware)
  const remountKey = useRemountOnResize();

  const {
      mode, setMode,
      lookupIntent, setLookupIntent,
      activeEvent, settings, loading, setLoading, msg, setMsg,
      eventStats, ordinanceStats, blacklist, personalInfoList, representatives,
      primaryName, setPrimaryName,
      primaryPassword, setPrimaryPassword,
      primaryContactPhone, setPrimaryContactPhone,
      primaryUnit, setPrimaryUnit,
      paymentMethod, setPaymentMethod,
      transferLast5, setTransferLast5,
      needsSelfPaidInsurance, setNeedsSelfPaidInsurance,
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
      executeSubmit: baseExecuteSubmit,
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

  // Sync external activeTab with internal mode
  React.useEffect(() => {
    if (!activeTab) return;
    if (activeTab === 'register') {
      if (mode !== 'register') setMode('register');
    } else if (activeTab === 'edit' || activeTab === 'delete') {
      setLookupIntent(activeTab as 'edit' | 'delete');
      if (mode !== 'lookup') setMode('lookup');
    } else if (activeTab === 'save') {
      setShowSidebarSaveConfirm(true);
      onTabChange?.(mode === 'register' ? 'register' : 'edit');
    } else if (activeTab === 'load') {
      setShowSidebarLoadConfirm(true);
      onTabChange?.(mode === 'register' ? 'register' : 'edit');
    }
  }, [activeTab]);

  const [confirmAction, setConfirmAction] = useState<{ type: 'abandon' | 'cancelReg' | 'cancelAll' | 'abandonToLookup' | 'backToRegister' | 'confirmSubmit' | 'directSubmit', payload?: any } | null>(null);
  const [showQueryConfirm, setShowQueryConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showSidebarSaveConfirm, setShowSidebarSaveConfirm] = useState(false);
  const [showSidebarLoadConfirm, setShowSidebarLoadConfirm] = useState(false);
  const sidebarFileInputRef = React.useRef<HTMLInputElement>(null);

  // Date Selectors Data
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 100}, (_, i) => currentYear - i);
  const months = Array.from({length: 12}, (_, i) => i + 1);
  const days = Array.from({length: 31}, (_, i) => i + 1);

  const proxyOptions = [OrdinanceItem.BAPTISM, OrdinanceItem.CONFIRMATION, OrdinanceItem.INITIATORY, OrdinanceItem.ENDOWMENT, OrdinanceItem.SEALING];
  const livingOptions = [OrdinanceItem.ENDOWMENT, OrdinanceItem.SEALING, OrdinanceItem.OBSERVER];

  const isClosed = isRegistrationClosedCheck();

  const [errorField, setErrorField] = useState<string | null>(null);

  const handleSubmitTrigger = async (e: React.FormEvent) => { 
      e.preventDefault();
      setErrorField(null);

      // Manual check for first missing field for smooth scrolling
      if (!primaryUnit) { scrollToField('primaryUnit'); return; }
      if (!primaryName) { scrollToField('primaryName'); return; }
      if (!primaryContactPhone) { scrollToField('primaryContactPhone'); return; }
      if (!primaryPassword) { scrollToField('primaryPassword'); return; }
      if ((!activeEvent?.paymentDisplayMode || activeEvent.paymentDisplayMode !== 'none') && !paymentMethod) { scrollToField('paymentMethod'); return; }

      for (let i = 0; i < members.length; i++) {
          const m = members[i];
          if (!m.name) { scrollToField(`member-${i}-name`); return; }
          if (!m.birth_date) { scrollToField(`member-${i}-birth`); return; }
          if (!m.identity_id) { scrollToField(`member-${i}-id`); return; }
          
          // 身份證格式校驗 (身分證/居留證)
          const nameCheck = validateNameFormat(m.name);
          if (!nameCheck.isEnglish && !validateIdentityId(m.identity_id)) {
              setMsg({ type: 'error', text: `第 ${i + 1} 位成員身份證格式不正確` });
              scrollToField(`member-${i}-id`);
              setTimeout(() => setMsg(null), 5000);
              return;
          }
          
          // 身份證重複校驗
          if (members.some((other, idx) => idx !== i && other.identity_id === m.identity_id)) {
              setMsg({ type: 'error', text: `第 ${i + 1} 位成員身份證字號與他人重複` });
              scrollToField(`member-${i}-id`);
              setTimeout(() => setMsg(null), 5000);
              return;
          }
      }

      const isValid = await validateForm();
      if (isValid) setShowSubmitConfirm(true);
  };

  const scrollToField = (fieldId: string) => {
      setErrorField(fieldId);
      const element = document.getElementById(fieldId);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
      }
      setTimeout(() => setErrorField(null), 5000);
  };

  // Sync dirty state to global for Layout navigation guard
  useEffect(() => {
    (window as any).__IS_REG_DIRTY__ = isFormDirty();
    return () => {
      (window as any).__IS_REG_DIRTY__ = false;
    };
  }, [members, primaryName, primaryUnit]);

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
      a.download = `${datePrefix}_聖殿旅行團_報名檔.json`;
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

  // 處理直接送出 (不儲存)
  React.useEffect(() => {
      if (confirmAction?.type === 'directSubmit') {
          setConfirmAction(null);
          baseExecuteSubmit();
      }
  }, [confirmAction]);

  const enabledIdentities = React.useMemo(() => {
    return settings.billingConfig?.identityPricings?.length 
      ? [...settings.billingConfig.identityPricings].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => p.identity) 
      : (settings.active_identities?.length ? settings.active_identities : Object.values(IdentityType));
  }, [settings]);

  const enabledTripTypes = React.useMemo(() => {
    return settings.billingConfig?.tripPricings?.length 
      ? [...settings.billingConfig.tripPricings].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => p.trip) 
      : Object.values(TripType).filter(t => t !== TripType.RETAINED);
  }, [settings]);

  const unitsOptions = React.useMemo(() => {
    // Vxxx: Combine all potential sources of unit names
    const billingUnits = settings.billingConfig?.units?.map(u => u.shortName) || [];
    const configUnits = settings.units || [];
    
    // Unique list, filtered for non-empty/whitespace
    const allUnits = Array.from(new Set([...billingUnits, ...configUnits]))
        .filter(u => u != null && String(u).trim() !== '');

    // Sort: priority to billingUnits order, then configUnits, then alphabetical
    return allUnits.sort((a, b) => {
        const idxBillingA = billingUnits.indexOf(a);
        const idxBillingB = billingUnits.indexOf(b);
        if (idxBillingA !== -1 && idxBillingB !== -1) return idxBillingA - idxBillingB;
        if (idxBillingA !== -1) return -1;
        if (idxBillingB !== -1) return 1;
        
        const idxConfigA = configUnits.indexOf(a);
        const idxConfigB = configUnits.indexOf(b);
        if (idxConfigA !== -1 && idxConfigB !== -1) return idxConfigA - idxConfigB;
        if (idxConfigA !== -1) return -1;
        if (idxConfigB !== -1) return 1;

        return String(a).localeCompare(String(b));
    }).map(u => ({ value: u, label: u }));
  }, [settings]);

  if (!activeEvent) return <div className="p-8 text-center text-gray-500">{t('stake.registration.form.no_active_event')}</div>;

  return (
    <div key={remountKey} className="min-h-screen bg-[#F8F9FA] pb-12 animate-fade-in font-['微軟正黑體',_sans-serif] w-full min-w-0 overflow-x-visible">
      <div className="max-w-6xl mx-auto px-1 md:px-4 lg:px-8 pt-2 md:pt-6 space-y-2 min-w-0 flex flex-col">
        {/* Hidden input for loading config from sidebar/tab */}
        <input 
          ref={sidebarFileInputRef}
          type="file" 
          accept=".json" 
          onChange={handleUploadConfig} 
          className="hidden" 
        />

        {msg && (
            <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border ${msg.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-black border-transparent'}`}>
                {msg.type === 'error' ? <XCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3 text-black" />}
                <span className="font-bold">{msg.text}</span>
                <button onClick={() => setMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full"><X className="w-4 h-4" /></button>
            </div>
        )}

        <FormDialogs 
            showSubmitConfirm={showSubmitConfirm} setShowSubmitConfirm={setShowSubmitConfirm} showQueryConfirm={showQueryConfirm} setShowQueryConfirm={setShowQueryConfirm}
            confirmAction={confirmAction} setConfirmAction={setConfirmAction} handleSaveAndSubmit={() => { handleDownloadConfig(); setTimeout(baseExecuteSubmit, 500); }}
            executeGoToStats={() => { setShowQueryConfirm(false); if (onGoToStats) onGoToStats(); }} executeAbandon={executeAbandon} executeAbandonToLookup={() => { handleReset(); setMode('lookup'); setMsg(null); setConfirmAction(null); }}
            executeBackToRegister={() => { setLookupUnit(''); setLookupName(''); setLookupPassword(''); setMode('register'); setMsg(null); setConfirmAction(null); }}
            executeCancelMember={executeCancelMember} executeCancelFamily={executeCancelFamily} lockCountdown={lockCountdown} showLockModal={showLockModal} setShowLockModal={setShowLockModal}
        />
        
        {/* Sidebar Save Confirmation */}
        <ConfirmationModal
            isOpen={showSidebarSaveConfirm}
            onClose={() => setShowSidebarSaveConfirm(false)}
            onConfirm={() => {
                handleDownloadConfig();
                setShowSidebarSaveConfirm(false);
            }}
            title={t('common.notice', '通知')}
            message={t('common.confirm_save', '確定要儲存目前的變動嗎？')}
            confirmText={t('common.confirm', '確定')}
            type="info"
        />

        {/* Sidebar Load Confirmation */}
        <ConfirmationModal
            isOpen={showSidebarLoadConfirm}
            onClose={() => setShowSidebarLoadConfirm(false)}
            onConfirm={() => {
                sidebarFileInputRef.current?.click();
                setShowSidebarLoadConfirm(false);
            }}
            title={t('common.notice', '通知')}
            message={t('common.confirm_load', '確定要讀取存檔嗎？這將會覆蓋目前正在填寫的資料。')}
            confirmText={t('common.confirm', '確定')}
            type="warning"
        />
        
        <RegistrationHeader 
            mode={mode} setMode={(m) => { setMode(m); onTabChange?.(m === 'register' ? 'register' : 'edit'); }} lang={lang} setLang={setLang} activeEvent={activeEvent}
            lockCountdown={lockCountdown} handleResetAndRegister={() => { setMode('register'); handleReset(); onTabChange?.('register'); }}
            isFormDirty={isFormDirty} setLookupIntent={() => {}} setConfirmAction={setConfirmAction}
            setMsg={setMsg} handleDownloadConfig={handleDownloadConfig} handleUploadConfig={handleUploadConfig}
            hideModeButtons={!!activeTab}
        />

        {/* Dashboard Statistics - Perfectly Matched to Admin Style (Unwrapped) - Rule 3.2 Compliance */}
        <div className="w-full max-w-full px-1 pt-1 shrink-0 space-y-1">
            {/* 1. 車輛座位預約 (Bus Seats) - 複製自後台結構 */}
            <div className="flex flex-col min-w-0">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-1 rounded-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-amber-950" />
                        <h2 className="text-sm font-black text-amber-950 uppercase tracking-widest">車輛座位預約</h2>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-white border-x border-b border-amber-200 rounded-b">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate">總座位數</div>
                        <div className="text-xl font-black text-slate-900">{eventStats.capacity} <span className="text-[10px] text-slate-400">人</span></div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                        <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1 truncate">預約位數</div>
                        <div className="text-xl font-black text-emerald-900">{(eventStats.occupied + eventStats.waiting)} <span className="text-[10px] text-slate-400">人</span></div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                        <div className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-1 truncate">剩餘位數</div>
                        <div className="text-xl font-black text-amber-900">{eventStats.remaining} <span className="text-[10px] text-slate-400">人</span></div>
                    </div>
                </div>
            </div>

            {/* 2. 教儀座位預約 (Ordinance Seats) - 複製自後台結構 */}
            <div className="flex flex-col min-w-0">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-1 rounded-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-amber-950" />
                        <h2 className="text-sm font-black text-amber-950 uppercase tracking-widest">教儀座位預約</h2>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-white border-x border-b border-amber-200 rounded-b">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <div className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1 truncate">洗禮</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-blue-900">{ordinanceStats.baptism.occupied + ordinanceStats.baptism.waiting}</span>
                            <span className="text-[10px] text-slate-400">/ {ordinanceStats.baptism.capacity}</span>
                        </div>
                        <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.baptism.occupied + ordinanceStats.baptism.waiting) / (ordinanceStats.baptism.capacity || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                        <div className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mb-1 truncate">恩道門</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-indigo-900">{ordinanceStats.endowment.occupied + ordinanceStats.endowment.waiting}</span>
                            <span className="text-[10px] text-slate-400">/ {ordinanceStats.endowment.capacity}</span>
                        </div>
                        <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.endowment.occupied + ordinanceStats.endowment.waiting) / (ordinanceStats.endowment.capacity || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-100">
                        <div className="text-[10px] text-rose-600 font-black uppercase tracking-widest mb-1 truncate">印證</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-rose-900">{ordinanceStats.sealing.occupied + ordinanceStats.sealing.waiting}</span>
                            <span className="text-[10px] text-slate-400">/ {ordinanceStats.sealing.capacity}</span>
                        </div>
                        <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((ordinanceStats.sealing.occupied + ordinanceStats.sealing.waiting) / (ordinanceStats.sealing.capacity || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4 min-w-0 w-full">
          <LookupSection 
              mode={mode} lookupIntent={lookupIntent} lookupLockCountdown={lookupLockCountdown} lookupUnit={lookupUnit} setLookupUnit={setLookupUnit} lookupName={lookupName} setLookupName={setLookupName}
              lookupPassword={lookupPassword} setLookupPassword={setLookupPassword} handleLookup={(e) => { e.preventDefault(); refreshLookup(); }} handleBackToRegister={() => setMode('register')} settings={settings}
              units={unitsOptions}
          />

          {mode === 'lookup' && lookupIntent !== 'edit' && lookupIntent !== 'delete' && (
            <div className="mt-4 min-w-0 w-full space-y-4">
              <TimeNodesDisplay activeEvent={activeEvent} isPublic={true} />
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleSubmitTrigger} className="space-y-4 min-w-0 w-full">
              <TimeNodesDisplay activeEvent={activeEvent} isPublic={true} />

              {activeEvent?.stop_cancellation && (
                  <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 p-3 md:p-4 rounded shadow-sm mb-4 flex items-center animate-fade-in ring-1 ring-amber-100 min-w-0 mx-1 md:mx-0">
                      <Shield className="w-5 h-5 mr-3 text-amber-600 shrink-0" />
                      <span className="font-bold text-xs md:text-sm">{t('stake.registration.form.insured_not_cancel_hint')}</span>
                  </div>
              )}

        <PrimaryContactSection 
            primaryName={primaryName} setPrimaryName={setPrimaryName} primaryUnit={primaryUnit} setPrimaryUnit={setPrimaryUnit}
            primaryPassword={primaryPassword} setPrimaryPassword={setPrimaryPassword} primaryContactPhone={primaryContactPhone} setPrimaryContactPhone={setPrimaryContactPhone}
            units={unitsOptions} isRepresentativeMatched={isRepresentativeMatched} setIsRepresentativeMatched={setIsRepresentativeMatched}
            isPrimaryNameFinished={isPrimaryNameFinished} setIsPrimaryNameFinished={setIsPrimaryNameFinished} representatives={representatives}
            editingFamilyGroupId={editingFamilyGroupId} members={members} setMembers={setMembers} personalInfoList={personalInfoList}
            errorField={errorField}
        />

        <MemberSection 
            members={members} lang={lang} activeEvent={activeEvent!} settings={settings} enabledIdentities={enabledIdentities} enabledTripTypes={enabledTripTypes}
            years={years} months={months} days={days} proxyOptions={proxyOptions} livingOptions={livingOptions} lockCountdown={lockCountdown} personalInfoList={personalInfoList}
            primaryUnit={primaryUnit} primaryName={primaryName} isPrimaryNameFinished={isPrimaryNameFinished} onAddMember={addMember} onUpdateMember={updateMember}
            onUpdateBirthday={updateMemberBirthday} onDeleteMember={(m) => setConfirmAction({ type: 'cancelReg', payload: m })} calculateMemberPrice={calculateMemberPrice}
            errorField={errorField}
        />

        {(!activeEvent?.paymentDisplayMode || activeEvent.paymentDisplayMode !== 'none') && (
            <PaymentSection 
                paymentMethod={paymentMethod} 
                setPaymentMethod={setPaymentMethod} 
                transferLast5={transferLast5} 
                setTransferLast5={setTransferLast5} 
                totalDue={getTotalFamilyDue()} 
                needsSelfPaidInsurance={needsSelfPaidInsurance}
                setNeedsSelfPaidInsurance={setNeedsSelfPaidInsurance}
                memberCount={members.length}
                activeEvent={activeEvent}
                availablePaymentMethods={[PaymentMethod.CASH, PaymentMethod.TRANSFER].filter(m => !settings.payment_methods || settings.payment_methods.includes(m))} 
                settings={settings} 
                lang={lang} 
                errorField={errorField}
            />
        )}
        
        <div className="pt-8 border-t border-slate-200 flex flex-row gap-4 w-full">
             <button 
                type="button" 
                onClick={() => isFormDirty() ? setConfirmAction({ type: 'abandon' }) : executeAbandon()} 
                disabled={loading} 
                className="flex-1 py-4 bg-red-100 text-red-800 border-2 border-red-200 font-black rounded shadow-lg hover:bg-red-200 focus:outline-none transition-all text-base flex items-center justify-center active:scale-[0.98]"
             >
                 <LogOut className="w-5 h-5 mr-2" /> {t('stake.registration.form.discard_btn')}
             </button>
             <button 
                type="submit" 
                disabled={loading || settings.maintenance_mode || isClosed || lockCountdown > 0} 
                className={`flex-1 py-4 bg-emerald-100 text-emerald-900 border-2 border-emerald-200 font-black rounded shadow-xl hover:bg-emerald-200 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all text-lg flex items-center justify-center active:scale-[0.98] ${loading || settings.maintenance_mode || isClosed || lockCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                 {settings.maintenance_mode ? <Shield className="w-5 h-5 mr-2" /> : isClosed ? <XCircle className="w-5 h-5 mr-2" /> : lockCountdown > 0 ? <Clock className="w-5 h-5 mr-2" /> : <CheckCircle className="w-6 h-6 mr-2" />}
                 {settings.maintenance_mode ? t('stake.registration.form.maintenance_label') : isClosed ? t('stake.registration.form.reg_closed_label') : lockCountdown > 0 ? `${lockCountdown}s` : (loading ? t('stake.registration.form.processing_label') : (editingFamilyGroupId ? t('stake.registration.form.confirm_edit_btn', '確認修改') : t('stake.registration.form.submit_btn', '提交報名')))}
             </button>
        </div>
      </form>
      )}
      </div>
    </div>
  </div>
  );
};

export default RegistrationForm;
