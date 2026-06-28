
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { subscribeToLogs, getSettings, saveSettings, migrateToCloud, subscribeToEvents, db, getDocs, collection, query, where, writeBatch } from '../services/sheetService';
import { AuditLog, GlobalSettings, DictionaryEntry } from '../types';
import { Server, Users, Database, FileText, Download, Upload, Save, Activity, Settings, CheckCircle, Edit2, UploadCloud, AlertTriangle, Loader, ShieldAlert, RefreshCw, KeyRound, ChevronUp, ChevronDown, Languages, ArrowUpDown, ChevronRight, FileJson, Trash2, Edit, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';
import UsersTab from '../components/stake/UsersTab';

const Engineer: React.FC = () => {
  const { t } = useTranslation();
  // Swap order: System first for visibility during migration
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'data' | 'logs' | 'announcements' | 'translations'>('system');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<Record<string, { content: string, isActive: boolean }>>({});
  const announcementsCategories = ['聖殿副殿', '家譜中心', '發行中心', '交通資訊', '用餐資訊', '手冊擷選'];
  
  // Translations State
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [newTransKey, setNewTransKey] = useState('');
  const [newTransZh, setNewTransZh] = useState('');
  const [newTransEn, setNewTransEn] = useState('');
  const [newTransCategory, setNewTransCategory] = useState('一般');
  
  // Sorting for Dictionary
  const [sortField, setSortField] = useState<'zh' | 'en' | 'key'>('key');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DictionaryEntry>>({});

  const [dictionarySearch, setDictionarySearch] = useState('');

  // Cloud Data Editor State
  const [cloudDataJson, setCloudDataJson] = useState('');
  const [eventDate, setEventDate] = useState('N/A');
  // V096: Stake Name State
  // V097: App Version State
  const [stakeName, setStakeName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [internetFee, setInternetFee] = useState<number>(0);
  const [settings, setSettingsData] = useState<GlobalSettings>(getSettings());

  // V101: Toast State
  const [msg, setMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Loading state
  const [isSaving, setIsSaving] = useState(false); // New saving state for the button

  // Dialog State
  const [confirmAction, setConfirmAction] = useState<{
      type: 'migrate' | 'manualImport' | 'saveCloudData' | 'importSettings' | 'exportSettings' | 'exportCloudData' | 'importCloudData' | 'resetPasswords' | 'saveSettings',
      payload?: any
  } | null>(null);

  // V192: Engineering States
  const [engineeringVersion, setEngineeringVersion] = useState<number>(0);

  useEffect(() => {
    // Subscribe to cloud logs
    const unsubLogs = subscribeToLogs((l) => setLogs(l));

    // Fix: Subscribe to events to get active event date correctly
    const unsubEvents = subscribeToEvents((events) => {
        const active = events.find(e => e.is_active);
        if (active) setEventDate(active.event_date);
    });
    
    // Load Settings
    const s = getSettings();
    setSettingsData(s);
    setStakeName(s.stake_name);
    setAppVersion(s.app_version || 'V 1.0.0'); 
    setMaintenanceDate(s.maintenance_date || new Date().toISOString().split('T')[0].replace(/-/g, '/'));
    setInternetFee(s.internet_fee || 0);
    setEngineeringVersion(parseInt(s.engineering_version || '1'));
    setAnnouncements(s.site_announcements || {});
    setTranslations(s.translations || {});
    setDictionary(s.dictionary || []);
    
    return () => {
        unsubLogs();
        unsubEvents();
    };
  }, []);

  const handleSaveSettings = () => {
      // Input Validation: Ensure engineeringVersion is a valid integer
      if (isNaN(engineeringVersion) || engineeringVersion < 0) {
          setMsg('錯誤：工程版本必須為正整數');
          setTimeout(() => setMsg(null), 3000);
          return;
      }
      setConfirmAction({ type: 'saveSettings' });
  };

  const executeSaveSettings = async () => {
      setConfirmAction(null);
      setIsSaving(true);
      setMsg('儲存中...');
      
      try {
          const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
          const currentEngVer = engineeringVersion;
          
          // Prepare new settings
          // app_version gets current engineeringVersion
          // maintenance_date gets today
          // engineering_version gets engineeringVersion + 1
            const newSettings: GlobalSettings = { 
                ...settings, 
                stake_name: stakeName, 
                app_version: currentEngVer.toString(),
                maintenance_date: today,
                internet_fee: internetFee,
                engineering_version: (currentEngVer + 1).toString(),
                site_announcements: announcements,
                translations: translations,
                dictionary: dictionary,
                language: settings.language || 'zh'
            };
          
          // API Call to save
          await saveSettings(newSettings);
          
          // Update local state after success
          setSettingsData(newSettings);
          setAppVersion(newSettings.app_version!);
          setMaintenanceDate(newSettings.maintenance_date!);
          setEngineeringVersion(currentEngVer + 1);
          
          setMsg('設定已成功發佈連結');
      } catch (error: any) {
          setMsg(`儲存失敗: ${error.message}`);
      } finally {
          setIsSaving(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const toggleMaintenance = () => {
      const newMode = !settings.maintenance_mode;
      const newSettings = { ...settings, maintenance_mode: newMode };
      saveSettings(newSettings);
      setSettingsData(newSettings);
      setMsg(newMode ? '已開啟系統維護模式' : '已關閉系統維護模式');
      setTimeout(() => setMsg(null), 3000);
  };

  // --- Migration Handlers ---

  const handleMigrate = () => {
      setConfirmAction({ type: 'migrate' });
  };

  const executeMigrate = async () => {
      setConfirmAction(null);
      setMsg('初始化上傳...');
      setIsProcessing(true);
      try {
          // Pass a callback to update message
          const result = await migrateToCloud({}, (progressMsg: string) => {
              setMsg(progressMsg);
          });
          setMsg(result.message);
      } catch (e: any) {
          setMsg(`Error: ${e.message}`);
      } finally {
          setIsProcessing(false);
          setTimeout(() => setMsg(null), 5000);
      }
  };

  // --- Cloud Data Fetch / Save ---

  const fetchCloudData = async () => {
      setIsProcessing(true);
      setMsg('正在下載雲端資料...');
      try {
          const eventsSnap = await getDocs(collection(db, 'events'));
          const regsSnap = await getDocs(collection(db, 'registrations'));
          const settingsSnap = await getDocs(collection(db, 'settings'));
          const usersSnap = await getDocs(collection(db, 'users'));
          const blacklistSnap = await getDocs(collection(db, 'blacklist')).catch(() => ({ docs: [] }));
          const personalInfoSnap = await getDocs(collection(db, 'personal_info')).catch(() => ({ docs: [] }));
          const representativesSnap = await getDocs(collection(db, 'representatives')).catch(() => ({ docs: [] }));

          const data = {
              events: eventsSnap.docs.map(d => d.data()),
              registrations: regsSnap.docs.map(d => d.data()),
              settings: settingsSnap.docs.length > 0 ? settingsSnap.docs[0].data() : {},
              users: usersSnap.docs.map(d => d.data()),
              blacklist: blacklistSnap.docs.map(d => d.data()),
              personalInfo: personalInfoSnap.docs.map(d => d.data()),
              representatives: representativesSnap.docs.map(d => d.data())
          };

          setCloudDataJson(JSON.stringify(data, null, 2));
          setMsg('雲端資料已下載');
      } catch (e: any) {
          setMsg(`下載失敗: ${e.message}`);
      } finally {
          setIsProcessing(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const handleSaveCloudData = () => {
      if (!cloudDataJson) return;
      setConfirmAction({ type: 'saveCloudData' });
  };

  const executeSaveCloudData = async () => {
      setConfirmAction(null);
      setIsProcessing(true);
      setMsg('正在寫入雲端...');
      try {
          const data = JSON.parse(cloudDataJson);
          
          // Use migrateToCloud but map the structure if needed
          const migrationPayload = {
              events: data.events,
              regs: data.registrations || data.regs, // Support both names
              settings: data.settings,
              users: data.users,
              blacklist: data.blacklist,
              personalInfo: data.personalInfo,
              representatives: data.representatives
          };

          const result = await migrateToCloud(migrationPayload, (progressMsg) => {
              setMsg(progressMsg);
          });

          setMsg(result.message);
      } catch (e: any) {
          setMsg(`寫入失敗: ${e.message}`);
      } finally {
          setIsProcessing(false);
      }
  };

  // --- Cloud Data Export / Import (Text Area) ---
  const handleExportCloudData = () => {
      if (!cloudDataJson) {
          setMsg('請先下載雲端資料');
          return;
      }
      setConfirmAction({ type: 'exportCloudData' });
  };

  const executeExportCloudData = () => {
      const blob = new Blob([cloudDataJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      const safeVersion = (appVersion || 'v0').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, ''); 
      
      // Filename format: IT_full_backup_v_154_2026_02_22.JSON
      a.download = `IT_full_backup_${safeVersion}_${dateStr}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setConfirmAction(null);
  };

  const handleImportCloudDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setConfirmAction({ type: 'importCloudData', payload: file });
      e.target.value = '';
  };

  const executeImportCloudData = () => {
      if (!confirmAction?.payload) return;
      const file = confirmAction.payload;
      const reader = new FileReader();
      reader.onload = (evt) => {
          // Removed blocking window.confirm to avoid sandbox issues
          // Confirmation already happened in ConfirmDialog
          try {
              const text = evt.target?.result as string;
              // Validate JSON
              JSON.parse(text); 
              setCloudDataJson(text);
              setMsg('資料已成功載入至編輯區。\n\n請注意：必須點擊右側紅色的「重建雲端」按鈕，才會真正寫入資料庫。');
          } catch(e) {
              setMsg('匯入失敗：格式錯誤');
          }
      };
      reader.readAsText(file);
      setConfirmAction(null);
  };

  // --- Settings Export/Import ---
  const handleExportSettings = () => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Add 'it_' prefix
      a.download = `it_settings_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
  };

  const handleImportSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setConfirmAction({ type: 'importSettings', payload: file });
      e.target.value = '';
  };

  const executeImportSettings = () => {
      if (!confirmAction?.payload) return;
      const file = confirmAction.payload;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          // Removed blocking window.confirm
          try {
              const data = JSON.parse(evt.target?.result as string);
              await saveSettings(data);
              setSettingsData(data);
              setStakeName(data.stake_name);
              setAppVersion(data.app_version);
              setMsg('基本設定已匯入並重建');
          } catch(e) {
              setMsg('匯入失敗');
          }
      };
      reader.readAsText(file);
      setConfirmAction(null);
  };

  // --- Data Batch Fixes ---
  const triggerResetPasswordsToID = () => {
      setConfirmAction({ type: 'resetPasswords' });
  };

  const executeResetPasswordsToID = async () => {
      setConfirmAction(null);
      setIsProcessing(true);
      setMsg('正在檢查並修正密碼...');

      try {
          const q = query(collection(db, 'registrations'), where('is_primary_contact', '==', true));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          let count = 0;

          snapshot.forEach(doc => {
              const data = doc.data();
              const currentPass = data.phone || '';
              // Only update if password starts with XYZ
              if (currentPass.startsWith('XYZ')) {
                  const newPass = 'ID4' + currentPass.substring(3); // Replace XYZ with ID4
                  batch.update(doc.ref, { phone: newPass });
                  count++;
              }
          });

          if (count > 0) {
              await batch.commit();
              setMsg(`修正完成！已將 ${count} 筆 XYZ 開頭的密碼修正為 ID4 開頭。`);
          } else {
              setMsg('沒有發現需要修正的密碼 (無 XYZ 開頭)。');
          }
      } catch (e: any) {
          setMsg(`修正失敗: ${e.message}`);
      } finally {
          setIsProcessing(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  // --- Dictionary Handlers ---
  const handleMigrateToDictionary = () => {
      // ETL: Convert legacy Record<string, string> to DictionaryEntry[]
      const migrated: DictionaryEntry[] = Object.entries(translations).map(([zh, en], idx) => ({
          id: `trans_${idx}_${Date.now()}`,
          key: `key_${idx}`, // Temporary generic key
          zh: zh,
          en: en,
          category: '自動匯入'
      }));

      // Add specialized UI keys that we just implemented
      const uiKeys: DictionaryEntry[] = [
        { id: 'ui_0', key: 'stake_admin_title', zh: '主辦', en: 'Stake Admin', category: '系統UI' },
        { id: 'ui_1', key: 'admin_mgmt', zh: '行政管理', en: 'Admin Mgmt', category: '系統UI' },
        { id: 'ui_2', key: 'hr_mgmt', zh: '人資管理', en: 'HR Mgmt', category: '系統UI' },
        { id: 'ui_3', key: 'activity_mgmt', zh: '活動管理', en: 'Activity Mgmt', category: '系統UI' },
        { id: 'ui_4', key: 'reg_mgmt', zh: '報名管理', en: 'Registration Mgmt', category: '系統UI' },
        { id: 'ui_5', key: 'transport_mgmt', zh: '交通管理', en: 'Transport Mgmt', category: '系統UI' },
        { id: 'ui_6', key: 'finance_mgmt', zh: '財務管理', en: 'Finance Mgmt', category: '系統UI' },
        { id: 'ui_7', key: 'rule_setup', zh: '辦法設定', en: 'Rule Setup', category: '系統UI' },
        { id: 'ui_8', key: 'notice_setup', zh: '須知設定', en: 'Notice Setup', category: '系統UI' },
        { id: 'ui_9', key: 'tutorial_setup', zh: '使用教學', en: 'Tutorial', category: '系統UI' },
        { id: 'ui_10', key: 'backup_restore', zh: '備份還原', en: 'Backup/Restore', category: '系統UI' },
        { id: 'ui_52', key: 'data_protection', zh: '資料保護', en: 'Data Protection', category: '系統UI' },
        { id: 'ui_11', key: 'rep_list', zh: '代表名單', en: 'Rep. List', category: '系統UI' },
        { id: 'ui_12', key: 'member_list', zh: '成員名單', en: 'Member List', category: '系統UI' },
        { id: 'ui_13', key: 'staff_list', zh: '同工名單', en: 'Staff List', category: '系統UI' },
        { id: 'ui_14', key: 'event_setup', zh: '活動設定', en: 'Event Setup', category: '系統UI' },
        { id: 'ui_15', key: 'exec_progress', zh: '執行進度', en: 'Progress', category: '系統UI' },
        { id: 'ui_16', key: 'reg_list', zh: '報名名單', en: 'Reg. List', category: '系統UI' },
        { id: 'ui_17', key: 'insurance_list', zh: '保險名單', en: 'Insurance List', category: '系統UI' },
        { id: 'ui_18', key: 'retention_list', zh: '留用名單', en: 'Retention List', category: '系統UI' },
        { id: 'ui_19', key: 'restriction_list', zh: '限制名單', en: 'Restrictions', category: '系統UI' },
        { id: 'ui_51', key: 'deleted_list', zh: '刪除名單', en: 'Deleted List', category: '系統UI' },
        { id: 'ui_20', key: 'ordinance_seat', zh: '教儀座位', en: 'Ordinance Seat', category: '系統UI' },
        { id: 'ui_21', key: 'service_assign', zh: '服務委派', en: 'Service Assign', category: '系統UI' },
        { id: 'ui_22', key: 'bus_driver', zh: '車行司機', en: 'Bus Driver', category: '系統UI' },
        { id: 'ui_23', key: 'stop_point', zh: '停靠站點', en: 'Stop Points', category: '系統UI' },
        { id: 'ui_24', key: 'route_plan', zh: '行程安排', en: 'Route Plan', category: '系統UI' },
        { id: 'ui_25', key: 'booking_record', zh: '訂車作業', en: 'Booking Record', category: '系統UI' },
        { id: 'ui_26', key: 'bus_seat', zh: '車輛座位', en: 'Bus Seat', category: '系統UI' },
        { id: 'ui_27', key: 'rating_setup', zh: '評分設定', en: 'Rating Setup', category: '系統UI' },
        { id: 'ui_28', key: 'fee_setup', zh: '收費設定', en: 'Fee Setup', category: '系統UI' },
        { id: 'ui_29', key: 'payment_audit', zh: '對帳作業', en: 'Reconciliation', category: '系統UI' },
        { id: 'ui_30', key: 'refund_list', zh: '退款名單', en: 'Refund List', category: '系統UI' },
        { id: 'ui_31', key: 'settlement_record', zh: '收支結算', en: 'Settlement', category: '系統UI' },
        { id: 'ui_32', key: 'seat_reservation', zh: '車輛座位預約', en: 'Vehicle Seat Reservation', category: '系統UI' },
        { id: 'ui_86', key: 'representative', zh: '代表人', en: 'Representative', category: '收費對帳' },
        { id: 'ui_87', key: 'payment_method_label', zh: '付款', en: 'Payment', category: '收費對帳' },
        { id: 'ui_88', key: 'total_due_label', zh: '應付總額', en: 'Total Due', category: '收費對帳' },
        { id: 'ui_89', key: 'payment_status_label', zh: '收款', en: 'Status', category: '收費對帳' },
        { id: 'ui_90', key: 'transfer_amount_label', zh: '轉帳金額', en: 'Transfer Amount', category: '收費對帳' },
        { id: 'ui_91', key: 'last_5_digits_label', zh: '末五碼', en: 'Last 5 Digits', category: '收費對帳' },
        { id: 'ui_92', key: 'paid', zh: '已收', en: 'Paid', category: '收費對帳' },
        { id: 'ui_93', key: 'unpaid', zh: '未收', en: 'Unpaid', category: '收費對帳' },
        { id: 'ui_94', key: 'cash', zh: '現金', en: 'Cash', category: '收費對帳' },
        { id: 'ui_95', key: 'transfer', zh: '轉帳', en: 'Transfer', category: '收費對帳' },
        { id: 'ui_96', key: 'waived', zh: '免收', en: 'Waived', category: '收費對帳' },
        { id: 'ui_97', key: 'free', zh: '免付', en: 'Free', category: '收費對帳' },
        { id: 'ui_60', key: 'stake_id', zh: '支聯會編號', en: 'Stake ID', category: '資管' },
        { id: 'ui_61', key: 'stake_name_label', zh: '支聯會名稱', en: 'Stake Name', category: '資管' },
        { id: 'ui_62', key: 'add_account', zh: '新增帳號', en: 'Add Account', category: '資管' },
        { id: 'ui_63', key: 'edit_account', zh: '編輯帳號', en: 'Edit Account', category: '資管' },
        { id: 'ui_64', key: 'get_otp', zh: '取得認證碼', en: 'Get OTP', category: '資管' },
        { id: 'ui_65', key: 'enter_otp', zh: '輸入認證碼', en: 'Enter OTP', category: '資管' },
        { id: 'ui_66', key: 'verify', zh: '認證', en: 'Verify', category: '資管' },
        { id: 'ui_67', key: 'save_changes', zh: '儲存變更', en: 'Save Changes', category: '資管' },
        { id: 'ui_68', key: 'payment_transfer', zh: '支付與轉帳', en: 'Payment & Transfer', category: '資管' },
        { id: 'ui_69', key: 'hide', zh: '不顯示', en: 'Hide', category: '資管' },
        { id: 'ui_70', key: 'always_show', zh: '強制顯示', en: 'Always Show', category: '資管' },
        { id: 'ui_71', key: 'show_after_confirmed', zh: '活動成行後顯示', en: 'Show After Confirmed', category: '資管' },
        { id: 'ui_72', key: 'link_gmail', zh: '連結 Gmail', en: 'Link Gmail', category: '資管' },
        { id: 'ui_73', key: 'auth_success', zh: '授權成功', en: 'Auth Success', category: '資管' },
        { id: 'ui_74', key: 'client_id_label', zh: '用戶端 ID', en: 'Client ID', category: '資管' },
        { id: 'ui_75', key: 'client_secret_label', zh: '用戶端密鑰', en: 'Client Secret', category: '資管' },
        { id: 'ui_76', key: 'import_account', zh: '匯入帳號', en: 'Import Account', category: '資管' },
        { id: 'ui_77', key: 'export_account', zh: '匯出帳號', en: 'Export Account', category: '資管' },
        { id: 'ui_33', key: 'assign_vehicle_numbers', zh: '補發車位編號', en: 'Assign Vehicle Numbers', category: '系統UI' },
        { id: 'ui_34', key: 'total_seats', zh: '座位總數', en: 'Total Seats', category: '系統UI' },
        { id: 'ui_35', key: 'occupied', zh: '已經預約', en: 'Occupied', category: '系統UI' },
        { id: 'ui_36', key: 'available', zh: '尚有座位', en: 'Available', category: '系統UI' },
        { id: 'ui_37', key: 'waitlist', zh: '候補人數', en: 'Waitlist', category: '系統UI' },
        { id: 'ui_38', key: 'unit_person', zh: '位', en: 'ppl', category: '系統UI' },
        { id: 'ui_39', key: 'buses_count', zh: '車輛台數: ', en: 'Buses: ', category: '系統UI' },
        { id: 'ui_40', key: 'deadline', zh: '期限: ', en: 'Deadline: ', category: '系統UI' },
        { id: 'ui_41', key: 'no_event_selected', zh: '尚未選擇活動', en: 'No Event Selected', category: '系統UI' },
        { id: 'ui_42', key: 'please_select_event_hint', zh: '請先至「活動管理」 > 「活動設定」建立或選擇一個活動', en: 'Please select or create an event in Activity Mgmt > Event Setup', category: '系統UI' },
        { id: 'ui_43', key: 'ordinance_reservation', zh: '教儀座位預約', en: 'Ordinance Seat Reservation', category: '系統UI' },
        { id: 'ui_44', key: 'assign_ordinance_numbers', zh: '補發教儀編號', en: 'Assign Ordinance IDs', category: '系統UI' },
        { id: 'ui_45', key: 'ordinance_endowment', zh: '恩道門', en: 'Endowment', category: '系統UI' },
        { id: 'ui_46', key: 'ordinance_baptism', zh: '洗禮', en: 'Baptism', category: '系統UI' },
        { id: 'ui_47', key: 'stat_occupied', zh: '已佔', en: 'Occ.', category: '系統UI' },
        { id: 'ui_48', key: 'stat_available', zh: '剩餘', en: 'Rem.', category: '系統UI' },
        { id: 'ui_49', key: 'reg_closed_title', zh: '報名已截止或關閉', en: 'Registration Closed', category: '系統UI' },
        { id: 'ui_50', key: 'reg_closed_hint', zh: '本次活動報名已關閉，若有疑問請聯繫負責人。', en: 'Registration is closed. Contact administrator for help.', category: '系統UI' },
        { id: 'ui_53', key: 'reverse_route', zh: '回程反向', en: 'Reverse Route', category: '系統UI' },
        { id: 'ui_54', key: 'road_signs_outbound', zh: '去程路標提醒', en: 'Outbound Road Signs', category: '系統UI' },
        { id: 'ui_55', key: 'road_signs_return', zh: '回程路標提醒', en: 'Return Road Signs', category: '系統UI' },
        { id: 'ui_56', key: 'collapse', zh: '摺疊', en: 'Collapse', category: '系統UI' },
        { id: 'ui_57', key: 'expand', zh: '展開', en: 'Expand', category: '系統UI' },
        { id: 'ui_58', key: 'ordinance_schedule', zh: '教儀安排', en: 'Ordinance Schedule', category: '系統UI' },
        { id: 'ui_59', key: 'stake_title', zh: '支聯會', en: 'Stake', category: '系統UI' },
        { id: 'ui_80', key: 'sort_order_label', zh: '排序', en: 'Sort Order', category: '收費設定' },
        { id: 'ui_81', key: 'adjustment_label', zh: '增減金額', en: 'Adjustment', category: '收費設定' },
        { id: 'ui_82', key: 'phone_label', zh: '行動電話', en: 'Mobile Phone', category: '帳號管理' },
        { id: 'ui_83', key: 'permission_label', zh: '權限', en: 'Permission', category: '帳號管理' },
        { id: 'ui_84', key: 'edit_label', zh: '編輯', en: 'Edit', category: '帳號管理' },
        { id: 'ui_85', key: 'readonly_label', zh: '唯讀', en: 'Read-only', category: '帳號管理' },
        { id: 'ui_100', key: 'registration_title', zh: '報名', en: 'Registration', category: '報名表單' },
        { id: 'ui_101', key: 'wait_label', zh: '等待', en: 'Wait', category: '報名表單' },
        { id: 'ui_102', key: 'register_btn', zh: '登記', en: 'Register', category: '報名表單' },
        { id: 'ui_103', key: 'edit_btn', zh: '修改', en: 'Edit', category: '報名表單' },
        { id: 'ui_104', key: 'delete_btn', zh: '刪除', en: 'Delete', category: '報名表單' },
        { id: 'ui_105', key: 'save_btn', zh: '存檔', en: 'Save', category: '報名表單' },
        { id: 'ui_106', key: 'read_btn', zh: '讀檔', en: 'Read', category: '報名表單' },
        { id: 'ui_107', key: 'members_section', zh: '成員', en: 'Members', category: '報名表單' },
        { id: 'ui_108', key: 'person_unit', zh: '人', en: 'ppl', category: '報名表單' },
        { id: 'ui_109', key: 'add_member_btn', zh: '增加報名人數', en: 'Add Member', category: '報名表單' },
        { id: 'ui_110', key: 'name_label', zh: '姓名', en: 'Name', category: '報名表單' },
        { id: 'ui_111', key: 'birth_date_label', zh: '西元生日', en: 'Birth Date', category: '報名表單' },
        { id: 'ui_112', key: 'id_label', zh: '身分證/居留證', en: 'ID / Resident Cert', category: '報名表單' },
        { id: 'ui_113', key: 'guardian_label', zh: '監護人', en: 'Guardian', category: '報名表單' },
        { id: 'ui_114', key: 'ordinance_participation', zh: '參與教儀', en: 'Ordinance Participation', category: '報名表單' },
        { id: 'ui_115', key: 'ordinance_item', zh: '教儀項目', en: 'Ordinance Item', category: '報名表單' },
        { id: 'ui_116', key: 'qualification_label', zh: '服務資格', en: 'Qualification', category: '報名表單' },
        { id: 'ui_117', key: 'trip_label', zh: '行程', en: 'Trip', category: '報名表單' },
        { id: 'ui_118', key: 'identity_label', zh: '身份', en: 'Identity', category: '報名表單' },
        { id: 'ui_119', key: 'fee_label', zh: '車資', en: 'Fee', category: '報名表單' },
        { id: 'ui_120', key: 'lookup_edit_title', zh: '修改報名資料', en: 'Edit Registration Data', category: '報名查詢' },
        { id: 'ui_121', key: 'lookup_delete_title', zh: '刪除報名資料', en: 'Delete Registration Data', category: '報名查詢' },
        { id: 'ui_122', key: 'back_to_form', zh: '返回填寫', en: 'Back to Form', category: '報名查詢' },
        { id: 'ui_123', key: 'temp_locked', zh: '暫時鎖定', en: 'Temporarily Locked', category: '報名查詢' },
        { id: 'ui_124', key: 'too_many_attempts', zh: '驗證失敗次數過多，請稍後再試。', en: 'Too many failed attempts.', category: '報名查詢' },
        { id: 'ui_125', key: 'unit_label', zh: '單位', en: 'Unit', category: '報名查詢' },
        { id: 'ui_126', key: 'verify_btn', zh: '驗證', en: 'Verify', category: '報名查詢' },
        { id: 'ui_127', key: 'phone_placeholder', zh: '請輸入電話', en: 'Enter phone number', category: '報名表單' },
        { id: 'ui_128', key: 'password_setup_label', zh: '設定密碼 (需要英文及數字混合)', en: 'Set Password (letters and numbers required)', category: '報名表單' },
        { id: 'ui_129', key: 'password_placeholder', zh: '請輸入自定密碼', en: 'Enter custom password', category: '報名表單' },
        { id: 'ui_130', key: 'discard_btn', zh: '放棄', en: 'Discard', category: '報名表單' },
        { id: 'ui_131', key: 'lookup_btn', zh: '查詢', en: 'Lookup', category: '報名表單' },
        { id: 'ui_132', key: 'submit_btn', zh: '送出', en: 'Submit', category: '報名表單' },
        { id: 'ui_133', key: 'processing_label', zh: '處理中...', en: 'Processing...', category: '報名表單' },
        { id: 'ui_134', key: 'confirm_edit_btn', zh: '確認修改', en: 'Confirm Edit', category: '報名表單' },
        { id: 'ui_135', key: 'maintenance_label', zh: '系統維護中', en: 'Maintenance', category: '報名表單' },
        { id: 'ui_136', key: 'reg_closed_label', zh: '本次活動報名已關閉，如有疑問請聯繫主辦人。', en: 'Registration Closed', category: '報名表單' },
        { id: 'ui_137', key: 'insured_not_cancel_hint', zh: '本次活動已投保無法取消，如有疑問請聯繫主辦人。', en: 'This event is insured and cannot be cancelled.', category: '報名表單' },
        { id: 'ui_138', key: 'payment_info_title', zh: '付款資訊', en: 'Payment Information', category: '付款資訊' },
        { id: 'ui_139', key: 'total_due_label', zh: '應付總額', en: 'Total Due', category: '付款資訊' },
        { id: 'ui_140', key: 'transfer_hint', zh: '請轉帳至以下帳號', en: 'Please transfer to the below account', category: '付款資訊' },
        { id: 'ui_141', key: 'bank_name_label', zh: '銀行名稱', en: 'Bank Name', category: '付款資訊' },
        { id: 'ui_142', key: 'bank_code_label', zh: '銀行編號', en: 'Bank Code', category: '付款資訊' },
        { id: 'ui_143', key: 'account_number_label', zh: '帳戶號碼', en: 'Account Number', category: '付款資訊' },
        { id: 'ui_144', key: 'account_name_label', zh: '帳戶名稱', en: 'Account Name', category: '付款資訊' },
        { id: 'ui_145', key: 'contact_phone_label', zh: '連絡電話', en: 'Contact Phone', category: '付款資訊' },
        { id: 'ui_146', key: 'transfer_last_5_label', zh: '您轉帳帳號的末五碼', en: 'Last 5 digits of your account', category: '付款資訊' },
        { id: 'ui_147', key: 'last_5_placeholder', zh: '請輸入後五碼', en: 'Enter 5 digits', category: '付款資訊' },
        { id: 'ui_148', key: 'reg_rules_title', zh: '各單位報名規則', en: 'Registration Rules', category: '報名表單' },
      ];

      setDictionary([...uiKeys, ...migrated]);
      setMsg(`已將 ${migrated.length} 筆資料 + ${uiKeys.length} 筆介面文字匯入字典 (請記得儲存)`);
      setTimeout(() => setMsg(null), 3000);
  };

  const handleSort = (field: 'zh' | 'en' | 'key') => {
      const isAsc = sortField === field && sortOrder === 'asc';
      setSortField(field);
      setSortOrder(isAsc ? 'desc' : 'asc');
  };

  const handleExportDictionary = () => {
    const dataStr = JSON.stringify(dictionary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format: Version_全站中英字典檔_YYYYMMDD.json
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `${engineeringVersion}_全站中英字典檔_${date}.json`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setMsg(`字典已匯出為: ${filename}`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleImportDictionary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target?.result as string);
            if (Array.isArray(imported)) {
                setDictionary(imported);
                setMsg(`成功匯入 ${imported.length} 筆字典資料 (請記得儲存)`);
            } else {
                setMsg('匯入失敗：JSON 格式不符合字典陣列結構');
            }
        } catch (err) {
            setMsg('匯入失敗：無效的 JSON 檔案');
        }
        setTimeout(() => setMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const startEditing = (entry: DictionaryEntry) => {
    setEditingEntryId(entry.id);
    setEditValues({ ...entry });
  };

  const saveEdit = () => {
    if (!editingEntryId) return;
    setDictionary(prev => prev.map(d => d.id === editingEntryId ? { ...d, ...editValues } as DictionaryEntry : d));
    setEditingEntryId(null);
    setEditValues({});
  };

  const sortedDictionary = [...dictionary].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const filteredDictionary = React.useMemo(() => {
    if (!dictionarySearch) return sortedDictionary;
    const q = dictionarySearch.toLowerCase();
    return sortedDictionary.filter(entry => 
        (entry.key || '').toLowerCase().includes(q) ||
        (entry.zh || '').toLowerCase().includes(q) ||
        (entry.en || '').toLowerCase().includes(q)
    );
  }, [sortedDictionary, dictionarySearch]);

  const calculateEngDays = () => {
      if (!maintenanceDate) return 0;
      try {
          const pubDate = new Date(maintenanceDate.replace(/\//g, '-'));
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - pubDate.getTime());
          return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } catch (e) {
          return 0;
      }
  };
  const tabs = [
      { id: 'system', label: t('engineer.tabs.system', '程式管理'), icon: Server },
      { id: 'users', label: t('engineer.tabs.users', '單位帳密'), icon: Users },
      { id: 'data', label: t('engineer.tabs.data', '資料保護'), icon: Database },
      { id: 'logs', label: t('engineer.tabs.logs', '登入記錄'), icon: FileText },
      { id: 'announcements', label: t('engineer.tabs.announcements', '公告設定'), icon: AlertTriangle },
      { id: 'translations', label: t('engineer.tabs.translations', '多國語言'), icon: Settings }
  ];

  // Rainbow Colors Definition (Light / Dark Pairs)
  const rainbowSchemes = [
      { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', active: 'bg-red-500', hover: 'hover:bg-red-100', shadow: 'rgba(185, 28, 28, 0.2)' },
      { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', active: 'bg-orange-500', hover: 'hover:bg-orange-100', shadow: 'rgba(194, 65, 12, 0.2)' },
      { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', active: 'bg-yellow-500', hover: 'hover:bg-yellow-100', shadow: 'rgba(161, 98, 7, 0.2)' },
      { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', active: 'bg-green-500', hover: 'hover:bg-green-100', shadow: 'rgba(21, 128, 61, 0.2)' },
      { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', active: 'bg-blue-500', hover: 'hover:bg-blue-100', shadow: 'rgba(29, 78, 216, 0.2)' },
      { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', active: 'bg-indigo-500', hover: 'hover:bg-indigo-100', shadow: 'rgba(67, 56, 202, 0.2)' },
      { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', active: 'bg-violet-500', hover: 'hover:bg-violet-100', shadow: 'rgba(109, 40, 217, 0.2)' },
  ];

  const getRainbowClass = (idx: number, type: 'btn' | 'block') => {
      const s = rainbowSchemes[idx % rainbowSchemes.length];
      if (type === 'btn') {
          return `${s.bg} ${s.text} ${s.border} ${s.hover} shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]`;
      }
      return `${s.bg} ${s.text} ${s.border}`;
  };

  const getActiveTabClass = (idx: number) => {
      const s = rainbowSchemes[idx % rainbowSchemes.length];
      return `${s.active} text-white ${s.border} shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] scale-105`;
  };

  return (
    <div className="bg-gray-50 flex flex-col relative">
      {/* V101: Toast Message */}
      {msg && (
          <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-lg shadow-2xl z-[100] transition-opacity animate-fade-in flex items-center border ${msg.includes('失敗') || msg.includes('Error') || msg.includes('錯誤') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-black bg-opacity-80 text-white border-transparent'}`}>
              {msg.includes('失敗') || msg.includes('Error') || msg.includes('錯誤') ? <AlertTriangle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3 text-green-400" />}
              <span className="font-bold">{msg}</span>
              <button onClick={() => setMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full"><Edit2 className="w-4 h-4" /></button>
          </div>
      )}

      {/* Confirm Dialogs */}
      {/* ... (Confirm Dialogs stay the same) ... */}
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'saveSettings'}
          title="確認修改"
          message="確認要執行修改設定嗎？這將會同步更新發佈版本與日期。"
          onConfirm={executeSaveSettings}
          onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'migrate'}
          title="一鍵上雲"
          message="確定要將目前的「本地資料」全部上傳覆蓋「雲端資料庫」嗎？此操作不可逆！"
          onConfirm={executeMigrate}
          onCancel={() => setConfirmAction(null)}
          isDangerous={true}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'saveCloudData'}
          title="重建資料庫"
          message="警告：此操作將把編輯框中的 JSON 資料全部寫入雲端資料庫，現有雲端資料將被覆蓋。確定繼續？"
          onConfirm={executeSaveCloudData}
          onCancel={() => setConfirmAction(null)}
          isDangerous={true}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'importSettings'}
          title="匯入設定"
          message="確定要匯入並覆蓋目前的基本設定嗎？"
          onConfirm={executeImportSettings}
          onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'exportCloudData'}
          title="匯出資料"
          message="確定要將編輯區的資料下載為 JSON 檔案嗎？"
          onConfirm={executeExportCloudData}
          onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'importCloudData'}
          title="載入資料"
          message="確定要載入此檔案內容至編輯區嗎？ (尚未寫入雲端)"
          onConfirm={executeImportCloudData}
          onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog 
          isOpen={confirmAction?.type === 'resetPasswords'}
          title="修正密碼確認"
          message={`確定要執行資料修正嗎？\n\n系統將掃描所有「家庭代表人」，若密碼以「XYZ」開頭，將自動改為「ID4」開頭。其他密碼將保持不變。`}
          onConfirm={executeResetPasswordsToID}
          onCancel={() => setConfirmAction(null)}
          isDangerous={true}
      />

      {/* Top Fixed Menu Container - Stacked under Global Header */}
      <div className="sticky top-16 z-[40] bg-white border-b shadow-md">
        <div className="max-w-7xl mx-auto">
          {/* Header Bar - Fixed Row */}
          <div 
            className="flex items-center justify-between w-full h-16 p-4 px-4 md:px-8 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsMenuExpanded(!isMenuExpanded)}
          >
            <div className="flex items-center">
              <Server className="w-6 h-6 text-purple-600 mr-3" />
              <span className="font-black text-xl text-gray-800">{t('engineer.menuTitle', '資管')}</span>
            </div>
            <motion.div
              animate={{ rotate: isMenuExpanded ? 0 : 180 }}
              className="flex items-center justify-center"
            >
              {isMenuExpanded ? <ChevronUp className="w-6 h-6 text-gray-500" /> : <ChevronDown className="w-6 h-6 text-gray-500" />}
            </motion.div>
          </div>

          {/* Floating / Roll-down Buttons Row */}
          <AnimatePresence>
            {isMenuExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 md:px-8 pb-6 overflow-hidden bg-white"
              >
                <div className="flex flex-wrap gap-4 pt-2 border-t mt-2">
                  {tabs.map((tab, idx) => (
                      <button 
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setIsMenuExpanded(false); // V410: Auto-collapse on selection to maximize view
                        }}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all whitespace-nowrap text-sm font-black border-2 border-transparent ${activeTab === tab.id ? getActiveTabClass(idx) : getRainbowClass(idx, 'btn')}`}
                      >
                        <tab.icon className={`w-5 h-5 mr-3 shrink-0 ${activeTab === tab.id ? 'text-white' : ''}`} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area - Flows with Global Scroll */}
      <div className="flex-1 p-4 md:p-8 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Content Views */}

          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* Maintenance Control - Orange Scheme */}
                <div className={`${getRainbowClass(1, 'block')} p-6 rounded-xl shadow-sm border-2`}>
                    <h3 className="font-black text-lg flex items-center mb-6">
                        <ShieldAlert className="w-6 h-6 mr-3" /> {t('engineer.system.control.title', '系統控制 (System Control)')}
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border-2 shadow-inner">
                            <label className="flex items-center cursor-pointer select-none">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={settings.maintenance_mode || false} 
                                        onChange={toggleMaintenance}
                                    />
                                    <div className={`w-12 h-7 rounded-full shadow-inner transition-colors ${settings.maintenance_mode ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow transition-transform ${settings.maintenance_mode ? 'transform translate-x-5' : ''}`}></div>
                                </div>
                                <div className="ml-4">
                                    <span className="block text-sm font-black">{t('engineer.system.control.maintenanceMode', '系統維護模式')}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Language Selection - Split from System Control */}
                <div className={`${getRainbowClass(5, 'block')} p-6 rounded-xl shadow-sm border-2`}>
                    <h3 className="font-black text-lg flex items-center mb-6">
                        <Languages className="w-6 h-6 mr-3" /> {t('engineer.system.control.languageLabel', '全站顯示語系 (Language)')}
                    </h3>
                    <div className="bg-white p-4 rounded-xl border-2 shadow-inner">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const next = { ...settings, language: 'zh' as const };
                                    saveSettings(next);
                                    setSettingsData(next);
                                    i18n.changeLanguage('zh');
                                    setMsg('已切換為：繁體中文');
                                    setTimeout(() => setMsg(null), 2000);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black border-2 transition-all ${settings.language === 'zh' || !settings.language ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-orange-900 border-orange-200 hover:bg-orange-50'}`}
                            >
                                {t('engineer.system.control.zh', '繁體中文 (ZH)')}
                            </button>
                            <button 
                                onClick={() => {
                                    const next = { ...settings, language: 'en' as const };
                                    saveSettings(next);
                                    setSettingsData(next);
                                    i18n.changeLanguage('en');
                                    setMsg('Language switched to English');
                                    setTimeout(() => setMsg(null), 2000);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black border-2 transition-all ${settings.language === 'en' ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-orange-900 border-orange-200 hover:bg-orange-50'}`}
                            >
                                {t('engineer.system.control.en', 'English (EN)')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Environment Check Card - Moved from Translations Tab */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-indigo-100 md:col-span-2">
                    <div className="flex items-center mb-4">
                        <Settings className="w-6 h-6 mr-3 text-indigo-600" />
                        <h2 className="text-xl font-black text-gray-900">{t('engineer.translations.envTitle', '系統環境檢查 (System Environment)')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Google Client ID (Public)</div>
                            <div className="font-mono text-sm break-all">
                                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 
                                    <span className="text-green-600 font-bold">✓ 已成功讀取 (Active)</span> : 
                                    <span className="text-red-500 font-bold">✗ 找不到 VITE_GOOGLE_CLIENT_ID</span>}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Google Refresh Token (Server Only)</div>
                            <div className="font-mono text-sm">
                                <span className="text-amber-600 font-bold italic text-xs">後台安全保護中 (Protected)</span>
                            </div>
                        </div>
                    </div>
                    {(!import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                        <div className="mt-4 p-5 bg-indigo-50 border-2 border-indigo-200 rounded-2xl text-indigo-900 text-sm leading-relaxed">
                            <div className="font-black text-lg mb-2">如何設定憑證？ / How to Setup:</div>
                            <ol className="list-decimal list-inside space-y-2 font-bold">
                                <li>點擊 AI Studio 網頁右上角的 <b>齒輪圖示 (Settings)</b>。</li>
                                <li>選擇左側選單的 <b>Environment Variables</b>。</li>
                                <li>點擊 <b>+ Add variable</b>，新增以下兩個：
                                    <ul className="list-disc list-inside ml-6 mt-1 text-indigo-700">
                                        <li>Key: <code className="bg-white px-1">VITE_GOOGLE_CLIENT_ID</code> (填入 Client ID)</li>
                                        <li>Key: <code className="bg-white px-1">GOOGLE_CLIENT_SECRET</code> (填入 Client Secret)</li>
                                    </ul>
                                </li>
                                <li>設定完成後，請重新整理頁面。</li>
                            </ol>
                        </div>
                    )}
                </div>
                
                {/* Basic Settings - Yellow Scheme */}
                <div className={`${getRainbowClass(2, 'block')} p-6 rounded-xl shadow-sm border-2 md:col-span-2`}>
                    <div className="mb-6">
                        <h3 className="font-black text-lg flex items-center mb-4">
                            <Settings className="w-5 h-5 mr-3" /> {t('engineer.system.params.title', '程式參數')}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleExportSettings} className="bg-white border-2 border-yellow-300 text-yellow-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-100 flex items-center shadow-sm"><Download className="w-4 h-4 mr-2"/>{t('engineer.system.params.export', '匯出設定')}</button>
                            <label className="bg-white border-2 border-yellow-300 text-yellow-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-100 cursor-pointer flex items-center shadow-sm">
                                <Upload className="w-4 h-4 mr-2"/>{t('engineer.system.params.import', '匯入設定')}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportSettingsChange}/>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-80">{t('engineer.system.params.headerName', '頁首名稱')}</label>
                            <input 
                                type="text" 
                                className="w-full border-2 border-yellow-200 rounded-lg p-2 text-xs mb-2 bg-white font-bold" 
                                value={stakeName} 
                                onChange={e => setStakeName(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-80">{t('engineer.system.params.internetFee', '網路費 (Internet Fee)')}</label>
                            <input 
                                type="number" 
                                className="w-full border-2 border-yellow-200 rounded-lg p-2 text-xs mb-2 bg-white font-bold" 
                                value={internetFee} 
                                onChange={e => setInternetFee(parseInt(e.target.value) || 0)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-80">{t('engineer.system.params.engVersion', '工程版本 (變更後發佈)')}</label>
                            <input 
                                type="text" 
                                className="w-full border-2 border-yellow-200 rounded-lg p-2 text-sm mb-2 bg-white font-black" 
                                value={engineeringVersion} 
                                onChange={e => setEngineeringVersion(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} 
                            />
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg border-2 border-dashed">
                            <label className="block text-xs font-bold opacity-60 mb-1">{t('engineer.system.params.appVersion', '發佈版本')}</label>
                            <div className="font-mono text-xs font-black">{appVersion}</div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg border-2 border-dashed">
                            <label className="block text-xs font-bold opacity-60 mb-1">{t('engineer.system.params.maintenanceDate', '維護日期')}</label>
                            <div className="font-mono text-xs font-black">{maintenanceDate}</div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg border-2 border-dashed">
                            <label className="block text-xs font-bold opacity-60 mb-1">{t('engineer.system.params.engDays', '工程天數')}</label>
                            <div className="font-mono text-xs font-black">{calculateEngDays()} 天</div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button 
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className={`flex items-center justify-center min-w-[120px] h-10 px-6 rounded-xl text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isSaving ? 'bg-gray-300' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                        >
                            {isSaving ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {t('engineer.system.params.publishButton', '發佈設定')}
                        </button>
                    </div>
                </div>

            </div>
        )}

        {/* Users Tab - Now using Shared Component */}
        {activeTab === 'users' && (
            <UsersTab settings={settings} hiddenRoles={[]} />
        )}

        {/* ... Data Tab ... */}
        {activeTab === 'data' && (
            <div className={`${getRainbowClass(2, 'block')} p-6 rounded-xl border-2 animate-fade-in`}>
                <div className="mb-6">
                    <h3 className="font-black text-xl flex items-center mb-4">
                        <Database className="w-6 h-6 mr-3" /> {t('engineer.data.title', '備份還原')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={fetchCloudData} disabled={isProcessing} className="bg-white border-2 border-yellow-300 text-yellow-900 px-4 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-100 flex items-center shadow-sm disabled:opacity-50">
                            {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2"/> : <RefreshCw className="w-5 h-5 mr-2"/>} {t('engineer.data.sync', '雲端同步')}
                        </button>
                        <button onClick={handleExportCloudData} disabled={!cloudDataJson} className="bg-white border-2 border-yellow-300 text-yellow-900 px-4 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-100 flex items-center shadow-sm disabled:opacity-50">
                            <Download className="w-5 h-5 mr-2"/> {t('engineer.data.export', '匯出 JSON')}
                        </button>
                        <label className="bg-white border-2 border-yellow-300 text-yellow-900 px-4 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-100 flex items-center shadow-sm cursor-pointer">
                            <Upload className="w-5 h-5 mr-2"/> {t('engineer.data.import', '匯入 JSON')}
                            <input type="file" className="hidden" accept=".json" onChange={handleImportCloudDataChange}/>
                        </label>
                        <button onClick={handleSaveCloudData} disabled={isProcessing || !cloudDataJson} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-red-700 flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                            <UploadCloud className="w-5 h-5 mr-2"/> {t('engineer.data.rebuild', '重建雲端')}
                        </button>
                    </div>
                </div>
                <div className="bg-white p-1 rounded-xl shadow-inner border-2">
                    <textarea 
                        className="w-full h-[400px] md:h-[600px] rounded-lg p-5 font-mono text-xs focus:ring-0 outline-none text-black bg-transparent" 
                        value={cloudDataJson} 
                        onChange={e => setCloudDataJson(e.target.value)}
                        placeholder={t('engineer.data.placeholder', '請先執行雲端同步...')}
                    />
                </div>
            </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
            <div className={`${getRainbowClass(3, 'block')} rounded-xl border-2 overflow-hidden animate-fade-in`}>
                <div className="p-6 border-b-2">
                    <h3 className="font-black text-xl flex items-center mb-4">
                        <FileText className="w-6 h-6 mr-3" /> {t('engineer.logs.title', '使用者登入軌跡')}
                    </h3>
                    <div className="flex">
                        <span className="text-sm bg-white px-4 py-1.5 rounded-full border-2 font-black shadow-sm">{t('engineer.logs.totalCount', '記錄總數: {{count}}', { count: logs.length })}</span>
                    </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="sticky top-0 bg-white/50 backdrop-blur-md border-b-2 font-black">
                            <tr>
                                <th className="p-4">{t('engineer.logs.columns.time', '時間軸')}</th>
                                <th className="p-4">{t('engineer.logs.columns.operator', '操作人員')}</th>
                                <th className="p-4">{t('engineer.logs.columns.user', '使用者')}</th>
                                <th className="p-4">{t('engineer.logs.columns.action', '動作項目')}</th>
                                <th className="p-4">{t('engineer.logs.columns.details', '詳細說明')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/30 transition-colors">
                                    <td className="p-4 font-mono opacity-60">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-black">{log.user}</td>
                                    <td className="p-4 font-mono">{log.account || '-'}</td>
                                    <td className="p-4 font-bold">{log.action}</td>
                                    <td className="p-4 opacity-80">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {announcementsCategories.map((cat, idx) => (
                    <div key={cat} className={`${getRainbowClass(idx + 4, 'block')} p-6 rounded-xl border-2 shadow-sm`}>
                        <div className="mb-6">
                            <h3 className="font-black text-lg flex items-center mb-4">
                                <AlertTriangle className="w-5 h-5 mr-3" /> {cat}
                            </h3>
                            <div className="flex">
                                <label className="flex items-center cursor-pointer bg-white px-4 py-2 rounded-xl border-2 shadow-sm">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={announcements[cat]?.isActive || false}
                                            onChange={e => {
                                                const newVal = e.target.checked;
                                                setAnnouncements(prev => ({
                                                    ...prev,
                                                    [cat]: { ...(prev[cat] || { content: '' }), isActive: newVal }
                                                }));
                                            }}
                                        />
                                        <div className={`w-10 h-6 rounded-full transition-colors ${announcements[cat]?.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${announcements[cat]?.isActive ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="ml-3 text-xs font-black">{announcements[cat]?.isActive ? t('engineer.announcements.show', '顯示中') : t('engineer.announcements.hide', '已隱藏')}</span>
                                </label>
                            </div>
                        </div>
                        <textarea 
                            className="w-full h-40 p-4 rounded-xl border-2 bg-white text-xs font-medium outline-none focus:border-blue-500 shadow-inner"
                            placeholder={t('engineer.announcements.placeholder', '在此輸入 {{category}} 的公告內容 (支援 HTML)...', { category: cat })}
                            value={announcements[cat]?.content || ''}
                            onChange={e => {
                                const val = e.target.value;
                                setAnnouncements(prev => ({
                                    ...prev,
                                    [cat]: { ...(prev[cat] || { isActive: false }), content: val }
                                }));
                            }}
                        />
                    </div>
                ))}
                <div className="md:col-span-2 flex justify-center mt-4">
                    <button onClick={handleSaveSettings} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:bg-blue-700 transition-all flex items-center">
                        <Save className="w-5 h-5 mr-2" /> {t('engineer.announcements.saveButton', '儲存公告變動')}
                    </button>
                </div>
            </div>
        )}

        {/* Translations Tab */}
        {activeTab === 'translations' && (
            <div className={`${getRainbowClass(5, 'block')} p-6 rounded-xl border-2 shadow-sm animate-fade-in`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl mb-0 flex items-center">
                        <Languages className="w-6 h-6 mr-3 text-indigo-600" /> {t('engineer.translations.dictionaryTitle', '全站字典管理 (Global Dictionary)')}
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleMigrateToDictionary}
                            className="text-xs bg-white border-2 border-orange-300 text-orange-900 px-4 py-2 rounded-xl font-black hover:bg-orange-100 flex items-center shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> {t('engineer.translations.etlButton', '字典數據初始化 (ETL)')}
                        </button>
                    </div>
                </div>

                {/* Dictionary File Actions Row 2 */}
                <div className="flex gap-3 mb-6 bg-white/30 p-4 rounded-xl border-2 border-dashed border-indigo-100">
                    <button 
                        onClick={handleExportDictionary}
                        className="text-xs bg-indigo-50 border-2 border-indigo-200 text-indigo-900 px-4 py-2 rounded-xl font-black hover:bg-indigo-100 flex items-center shadow-sm"
                    >
                        <FileJson className="w-4 h-4 mr-2" /> {t('engineer.translations.exportButton', '匯出字典 (.json)')}
                    </button>
                    <label className="text-xs bg-indigo-50 border-2 border-indigo-200 text-indigo-900 px-4 py-2 rounded-xl font-black hover:bg-indigo-100 flex items-center shadow-sm cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" /> {t('engineer.translations.importButton', '匯入字典 (.json)')}
                        <input type="file" accept=".json" className="hidden" onChange={handleImportDictionary} />
                    </label>
                    <p className="text-[10px] text-gray-500 font-bold flex items-center ml-auto">
                        {t('engineer.translations.formatHint', '格式: {版本號}_全站中英字典檔_{日期}.json')}
                    </p>
                </div>
                
                {/* Dictionary Search */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border-2 border-indigo-100 mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-3 w-5 h-5 text-indigo-400" />
                        <input 
                            type="text"
                            placeholder={t('engineer.translations.searchPlaceholder', '搜尋代碼、繁中或英文代碼...')}
                            className="w-full pl-12 pr-4 py-2.5 rounded-lg border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-bold text-sm"
                            value={dictionarySearch}
                            onChange={e => setDictionarySearch(e.target.value)}
                        />
                        {dictionarySearch && (
                            <button 
                                onClick={() => setDictionarySearch('')}
                                className="absolute right-3 top-2.5 p-1 hover:bg-gray-100 rounded-full text-gray-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Add New Translation */}
                <div className="bg-white/50 p-6 rounded-xl border-2 border-dashed mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-60">{t('engineer.translations.addKey', '系統代碼 (Key)')}</label>
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-lg border-2 font-bold text-sm"
                                placeholder="如: btn_save"
                                value={newTransKey}
                                onChange={e => setNewTransKey(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-60">{t('engineer.translations.addZh', '繁體中文 (ZH)')}</label>
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-lg border-2 font-bold text-sm"
                                placeholder="如: 儲存"
                                value={newTransZh}
                                onChange={e => setNewTransZh(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black mb-1 opacity-60">{t('engineer.translations.addEn', '英文對照 (EN)')}</label>
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-lg border-2 font-bold text-sm"
                                placeholder="如: Save"
                                value={newTransEn}
                                onChange={e => setNewTransEn(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={() => {
                                    if (!newTransKey || !newTransZh) return;
                                    setDictionary(prev => [
                                        { id: `t_${Date.now()}`, key: newTransKey, zh: newTransZh, en: newTransEn, category: newTransCategory },
                                        ...prev
                                    ]);
                                    setNewTransKey('');
                                    setNewTransZh('');
                                    setNewTransEn('');
                                }}
                                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-black shadow-md hover:bg-indigo-700 transition-all h-[48px] flex items-center justify-center"
                            >
                                <Save className="w-4 h-4 mr-2" /> {t('engineer.translations.addButton', '新增字典項')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Translation List */}
                <div className="bg-white rounded-xl border-2 shadow-inner overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 border-b-2 font-black">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('key')}>
                                        {t('engineer.translations.columns.key', '代碼')} {sortField === 'key' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('zh')}>
                                        {t('engineer.translations.columns.zh', '繁體中文')} {sortField === 'zh' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('en')}>
                                        {t('engineer.translations.columns.en', '英文對照')} {sortField === 'en' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4 w-24">{t('engineer.translations.columns.action', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2">
                                {filteredDictionary.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            {editingEntryId === entry.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-2 border-2 border-indigo-300 rounded font-mono text-xs bg-indigo-50"
                                                    value={editValues.key || ''}
                                                    onChange={e => setEditValues({ ...editValues, key: e.target.value })}
                                                />
                                            ) : (
                                                <span className="font-mono text-xs text-gray-500">{entry.key}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingEntryId === entry.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-2 border-2 border-indigo-300 rounded font-black bg-indigo-50"
                                                    value={editValues.zh || ''}
                                                    onChange={e => setEditValues({ ...editValues, zh: e.target.value })}
                                                />
                                            ) : (
                                                <span className="font-bold">{entry.zh}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingEntryId === entry.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-2 border-2 border-indigo-300 rounded bg-indigo-50"
                                                    value={editValues.en || ''}
                                                    onChange={e => setEditValues({ ...editValues, en: e.target.value })}
                                                />
                                            ) : (
                                                <span>{entry.en}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {editingEntryId === entry.id ? (
                                                    <>
                                                        <button 
                                                            onClick={saveEdit}
                                                            className="text-green-600 h-8 w-8 flex items-center justify-center rounded-full hover:bg-green-50 transition-colors"
                                                            title={t('common.save', '儲存')}
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingEntryId(null)}
                                                            className="text-gray-400 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors"
                                                            title={t('common.cancel', '取消')}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => startEditing(entry)}
                                                            className="text-indigo-600 h-8 w-8 flex items-center justify-center rounded-full hover:bg-indigo-50 transition-colors"
                                                            title={t('common.edit', '編輯')}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => setDictionary(dictionary.filter(d => d.id !== entry.id))}
                                                            className="text-red-500 h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                                                            title={t('common.delete', '刪除')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {dictionary.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-400 font-bold">
                                            {t('engineer.translations.emptyState', '目前字典尚無資料，請執行 ETL 初始化或手動新增。')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-8">
                    <p className="text-xs text-gray-500 font-bold">{t('engineer.translations.footerHint', '💡 說明：代碼是系統內部使用的識別碼，繁中與英文會根據語系設定自動切換顯示。')}</p>
                    <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:bg-indigo-700 flex items-center">
                        <Save className="w-5 h-5 mr-2" /> {t('engineer.translations.saveButton', '儲存字典更新')}
                    </button>
                </div>
            </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Engineer;
