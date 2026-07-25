import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useI18n } from '../src/contexts/LanguageContext';
import i18n from '../i18n';
import { subscribeToLogs, getSettings, saveSettings, migrateToCloud, subscribeToEvents, db, getDocs, collection, query, where, writeBatch, COLL_TRANSLATIONS, onSnapshot, doc, getDoc } from '../services/sheetService';
import { AuditLog, GlobalSettings, DictionaryEntry, Role } from '../types';
import { fetchAllTranslations, TranslationDoc } from '../services/translationService';
import { Server, Users, Database, FileText, Download, Upload, Save, Activity, Settings, CheckCircle, Edit2, UploadCloud, AlertTriangle, Loader, ShieldAlert, RefreshCw, KeyRound, ChevronUp, ChevronDown, Languages, ArrowUpDown, ChevronRight, FileJson, Trash2, Edit, X, Search, Bell, FileSearch, LayoutDashboard, Menu, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';
import UsersTab from '../components/stake/UsersTab';

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
  { id: 'ui_132', key: 'submit_btn', zh: '提交', en: 'Submit', category: '報名表單' },
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

interface EngineerProps {
    activeTab?: 'system' | 'users' | 'data' | 'logs' | 'announcements' | 'translations';
    onTabChange?: (tab: 'system' | 'users' | 'data' | 'logs' | 'announcements' | 'translations') => void;
    onRoleChange?: (role: Role | 'public_stats' | 'instructions' | 'feedback' | 'member') => void;
}

const rainbowColors = [
    { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' },
    { bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600' },
    { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600' },
    { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
    { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600' },
    { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600' },
];

const Engineer: React.FC<EngineerProps> = ({ onRoleChange, activeTab: passedActiveTab, onTabChange }) => {
  const { t, tString, isEditMode, setIsEditMode } = useI18n();
  // Swap order: System first for visibility during migration
  const [internalActiveTab, setInternalActiveTab] = useState<'system' | 'users' | 'data' | 'logs' | 'announcements' | 'translations'>('system');
  const activeTab = passedActiveTab || internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<Record<string, { content: string, isActive: boolean }>>({});
  const announcementsCategories = ['聖殿副殿', '家譜中心', '發行中心', '交通資訊', '用餐資訊', '手冊擷選'];
  
  // Translations State
  const [translations, setTranslations] = useState<Record<string, TranslationDoc>>({});
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [newTransKey, setNewTransKey] = useState('');
  const [newTransZh, setNewTransZh] = useState('');
  const [newTransEn, setNewTransEn] = useState('');
  const [newTransCategory, setNewTransCategory] = useState('一般');
  
  // Sorting for Dictionary
  const [isDictExpanded, setIsDictExpanded] = useState(true);
  const [sortField, setSortField] = useState<'zh' | 'en' | 'key'>('key');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DictionaryEntry>>({});

  const [dictionarySearch, setDictionarySearch] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  // Sync scrollbars
  useEffect(() => {
      const table = tableContainerRef.current;
      const top = topScrollRef.current;
      if (!table || !top) return;

      const syncTable = () => { top.scrollLeft = table.scrollLeft; };
      const syncTop = () => { table.scrollLeft = top.scrollLeft; };

      table.addEventListener('scroll', syncTable);
      top.addEventListener('scroll', syncTop);
      return () => {
          table.removeEventListener('scroll', syncTable);
          top.removeEventListener('scroll', syncTop);
      };
  }, [isDictExpanded, dictionary]);

  // Cloud Data Editor State
  const [cloudDataJson, setCloudDataJson] = useState('');
  const [eventDate, setEventDate] = useState('N/A');
  // V096: Stake Name State
  // V097: App Version State
  const [stakeName, setStakeName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [latestNews, setLatestNews] = useState('');
  const [internetFee, setInternetFee] = useState<number>(0);
  const [settings, setSettingsData] = useState<GlobalSettings>(getSettings());

  // V101: Toast State
  const [msg, setMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Loading state
  const [isSaving, setIsSaving] = useState(false); // New saving state for the button

  // Dialog State
  const [confirmAction, setConfirmAction] = useState<{
      type: 'migrate' | 'manualImport' | 'saveCloudData' | 'importSettings' | 'exportSettings' | 'exportCloudData' | 'importCloudData' | 'resetPasswords' | 'saveSettings' | 'publishTranslations' | 'exportDictionaryExcel' | 'importDictionaryExcel',
      payload?: any
  } | null>(null);

  // V192: Engineering States
  const [engineeringVersion, setEngineeringVersion] = useState<number>(0);

    // 合併字典與翻譯的輔助函式
    const updateMergedDictionary = (baseDict: DictionaryEntry[], currentTrans: Record<string, TranslationDoc>) => {
        let merged = [...baseDict];
        const transKeys = Object.keys(currentTrans);

        // A. 將 translations 中存在但字典中缺失的 Key 加入字典 (自動偵測)
        transKeys.forEach(k => {
            if (!merged.find(d => d.key === k)) {
                merged.push({
                    id: `sync_${k}_${Date.now()}`,
                    key: k,
                    zh: currentTrans[k]['zh-TW'] || currentTrans[k]['zh'] || '',
                    en: currentTrans[k]['en'] || '',
                    category: '自動偵測'
                });
            }
        });

        // B. 內容對齊：確保字典中的翻譯內容與 translations 對象一致
        merged = merged.map(d => {
            const trans = currentTrans[d.key];
            if (trans) {
                return {
                    ...d,
                    zh: trans['zh-TW'] || trans['zh'] || d.zh,
                    en: trans['en'] || d.en
                };
            }
            return d;
        });

        // C. 確保 UI 必備 Key 存在 (uiKeys 在下方定義)
        uiKeys.forEach(u => {
            if (!merged.find(m => m.key === u.key)) {
                merged.push(u);
            }
        });

        setDictionary(merged);
    };

    // 當 settings 或 translations 變更時，自動更新 merged dictionary
    useEffect(() => {
        updateMergedDictionary(settings.dictionary || [], translations);
    }, [settings.dictionary, translations]);

    useEffect(() => {
        // Subscribe to cloud logs
        const unsubLogs = subscribeToLogs((l) => setLogs(l));

        // Fix: Subscribe to events to get active event date correctly
        const unsubEvents = subscribeToEvents((events) => {
            const active = events.find(e => e.is_active);
            if (active) setEventDate(active.event_date);
        });

        // 1. 監聽全域設定 (包含 Dictionary 結構)
        const unsubSettings = onSnapshot(doc(db, 'settings', 'siteSettings'), (docSnap) => {
            if (docSnap.exists()) {
                const s = docSnap.data() as any;
                setSettingsData(s);
                setStakeName(s.stake_name || '');
                setAppVersion(s.app_version || 'V 1.0.0');
                setMaintenanceDate(s.maintenance_date || '');
                setInternetFee(s.internet_fee || 0);
                setLatestNews(s.latest_news || '');
                setEngineeringVersion(parseInt(s.engineering_version || '1'));
                setAnnouncements(s.site_announcements || {});
            }
        });

        // 2. 監聽翻譯集合 (i18n Management 的數據源)
        const unsubTranslations = onSnapshot(collection(db, COLL_TRANSLATIONS), (querySnapshot) => {
            const transData: Record<string, TranslationDoc> = {};
            querySnapshot.forEach((doc) => {
                transData[doc.id] = doc.data() as TranslationDoc;
            });
            setTranslations(transData);
        });
        
        return () => {
            unsubLogs();
            unsubEvents();
            unsubSettings();
            unsubTranslations();
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
                latest_news: latestNews,
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
      // ETL: Convert TranslationDoc Record to DictionaryEntry[]
      const migrated: DictionaryEntry[] = Object.entries(translations).map(([key, doc], idx) => ({
          id: `trans_${idx}_${Date.now()}`,
          key: key,
          zh: doc['zh-TW'] || doc['zh'] || '',
          en: doc['en'] || '',
          category: '自動匯入'
      }));

      setDictionary([...uiKeys, ...migrated]);
      setMsg(`已將 ${migrated.length} 筆資料 + ${uiKeys.length} 筆介面文字匯入字典 (請記得儲存)`);
      setTimeout(() => setMsg(null), 3000);
  };

  const handleSort = (field: 'zh' | 'en' | 'key') => {
      const isAsc = sortField === field && sortOrder === 'asc';
      setSortField(field);
      setSortOrder(isAsc ? 'desc' : 'asc');
  };

  const handleExportExcel = () => {
    try {
      const data = dictionary.map(d => ({
        '代碼 (Key)': d.key,
        '英文對照 (EN)': d.en,
        '繁體中文 (ZH)': d.zh
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dictionary");
      XLSX.writeFile(wb, "字典檔.xlsx");
      setMsg("字典檔.xlsx 已匯出");
    } catch (e) {
      setMsg("匯出失敗");
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmAction({ type: 'importCloudData', payload: file });
    e.target.value = '';
  };

  const executeImportExcel = () => {
    if (!confirmAction?.payload || !(confirmAction.payload instanceof File)) return;
    const file = confirmAction.payload;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const imported: DictionaryEntry[] = json.map((row, idx) => ({
          id: `t_xl_${Date.now()}_${idx}`,
          key: row['代碼 (Key)'] || '',
          en: row['英文對照 (EN)'] || '',
          zh: row['繁體中文 (ZH)'] || '',
          category: 'Excel 匯入'
        }));

        if (imported.length > 0) {
          setDictionary(imported);
          setMsg(`成功匯入 ${imported.length} 筆字典資料`);
        } else {
          setMsg('匯入失敗：Excel 檔案中無有效資料');
        }
      } catch (err) {
        setMsg('匯入失敗：無效的 Excel 檔案');
      }
      setTimeout(() => setMsg(null), 3000);
    };
    reader.readAsArrayBuffer(file);
    setConfirmAction(null);
  };

  const handlePublishTranslations = () => {
    setConfirmAction({ type: 'publishTranslations' });
  };

  const executePublishTranslations = async () => {
    setIsProcessing(true);
    try {
        const batch = writeBatch(db);
        const transObj: Record<string, any> = {};

        // 1. 同步到 translations 集合
        dictionary.forEach(entry => {
            if (!entry.key) return;
            const docRef = doc(db, COLL_TRANSLATIONS, entry.key);
            const data = {
                'zh-TW': entry.zh,
                'en': entry.en,
                'category': entry.category || '一般',
                'last_updated': new Date().toISOString()
            };
            batch.set(docRef, data, { merge: true });
            transObj[entry.key] = data;
        });

        // 2. 同步到 siteSettings.translations (Legacy/Context Source)
        const settingsRef = doc(db, 'settings', 'siteSettings');
        batch.set(settingsRef, {
            translations: transObj,
            dictionary: dictionary // 同時儲存結構化字典
        }, { merge: true });

        await batch.commit();
        setMsg(`成功發佈 ${dictionary.length} 筆翻譯到全站`);
    } catch (error) {
        console.error('Publish failed:', error);
        setMsg('發佈失敗，請檢查權限或網路');
    } finally {
        setIsProcessing(false);
        setConfirmAction(null);
        setTimeout(() => setMsg(null), 3000);
    }
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

  const filteredDictionary = React.useMemo(() => {
    const sortedDict = [...dictionary].sort((a, b) => {
        const valA = a[sortField] || '';
        const valB = b[sortField] || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    if (!dictionarySearch) return sortedDict;
    const q = dictionarySearch.toLowerCase();
    return sortedDict.filter(entry => 
        (entry.key || '').toLowerCase().includes(q) ||
        (entry.zh || '').toLowerCase().includes(q) ||
        (entry.en || '').toLowerCase().includes(q)
    );
  }, [dictionary, sortField, sortOrder, dictionarySearch]);

  const getDaysSinceUpdate = () => {
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
  // --- Gmail Auth Handler ---
  const handleLinkGmail = async () => {
    setIsProcessing(true);
    setMsg('正在取得授權連結...');
    try {
      const response = await fetch('/api/auth/url');
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
        setMsg('請在開啟的視窗中完成 Google 授權，並將取得的 Refresh Token 告知開發人員或填入設定。');
      } else {
        setMsg(`失敗：${data.error || '無法取得授權網址'}`);
      }
    } catch (e: any) {
      setMsg(`錯誤：${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
      { id: 'system', label: t('engineer.tabs.system', '系統管理'), icon: Server },
      { id: 'users', label: t('engineer.tabs.users', '帳號權限'), icon: Users },
      { id: 'data', label: t('engineer.tabs.data', '資料維護'), icon: Database },
      { id: 'logs', label: t('engineer.tabs.logs', '系統日誌'), icon: FileText },
      { id: 'announcements', label: t('engineer.tabs.announcements', '公告設定'), icon: Bell },
      { id: 'translations', label: t('engineer.tabs.translations', '語言翻譯'), icon: Languages }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F0F4F8]">
      {/* V101: Toast Message - Professional Style */}
      {msg && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-[100] transition-all animate-in fade-in slide-in-from-top-4 flex items-center border ${msg.includes('失敗') || msg.includes('Error') || msg.includes('錯誤') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-950 text-white border-transparent'}`}>
              {msg.includes('失敗') || msg.includes('Error') || msg.includes('錯誤') ? <AlertTriangle className="w-5 h-5 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3 text-emerald-400" />}
              <span className="font-bold text-sm">{msg}</span>
              <button onClick={() => setMsg(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          </div>
      )}

      {/* Main Content Area - Integrated with Unified Layout */}
      <div id="engineer-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth min-h-0">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Content Views */}
            {activeTab === 'system' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Maintenance & Security */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-white">
                      <h3 className="font-bold text-slate-900 flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-3 text-rose-600" /> 系統狀態與安全性
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-[#F0F4F8] border border-indigo-100/50">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">系統維護模式 (Maintenance)</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">開啟後，全站將顯示維護中頁面</p>
                        </div>
                        <div 
                          onClick={toggleMaintenance}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.maintenance_mode ? 'bg-amber-600' : 'bg-slate-300'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.maintenance_mode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Google API 整合狀態</p>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                            <span className="text-xs text-slate-700 font-medium">Client ID 讀取狀態</span>
                            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 
                              <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-tighter">Connected</span> : 
                              <span className="flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-tighter">Missing Key</span>}
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                            <span className="text-xs text-slate-700 font-medium">Gmail 授權</span>
                            <button 
                              onClick={handleLinkGmail}
                              disabled={isProcessing}
                              className="flex items-center bg-indigo-950 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                            >
                              <KeyRound className="w-3 h-3 mr-2 text-blue-400" /> 立即連結 Gmail
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Parameters */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 flex items-center">
                        <Settings className="w-5 h-5 mr-3 text-blue-600" /> 系統核心參數
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={handleExportSettings} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="匯出設定">
                          <Download className="w-4 h-4" />
                        </button>
                        <label className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer" title="匯入設定">
                          <Upload className="w-4 h-4" />
                          <input type="file" className="hidden" accept=".json" onChange={handleImportSettingsChange}/>
                        </label>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">單位主標題 (Header Name)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-bold" 
                          value={stakeName} 
                          onChange={e => setStakeName(e.target.value)} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">版本序號 (Version)</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-mono focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-bold" 
                            value={settings.app_version || ''} 
                            onChange={e => setSettingsData({ ...settings, app_version: e.target.value })} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">最後更新 (Last Publish)</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono outline-none" 
                            value={settings.maintenance_date || ''} 
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Database Maintenance - Full Width */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center">
                      <Database className="w-5 h-5 mr-3 text-amber-600" /> 全站資料一鍵同步與修正 (Core DB Sync)
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="animate-pulse w-2 h-2 rounded-full bg-rose-600"></span>
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                        High Risk Operations
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-[#F0F4F8] p-6 rounded-xl border border-indigo-100/50 space-y-4">
                        <div className="bg-white p-3 rounded-full w-10 h-10 flex items-center justify-center border border-slate-100 shadow-sm">
                          <UploadCloud className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">全域快取上雲</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">將此裝置暫存的 coreData 全面覆蓋 Firestore 雲端庫。</p>
                        </div>
                        <button 
                          onClick={() => setConfirmAction({ type: 'migrate' })}
                          className="w-full bg-indigo-950 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                        >
                          立即執行同步
                        </button>
                      </div>

                      <div className="bg-[#F0F4F8] p-6 rounded-xl border border-indigo-100/50 space-y-4">
                        <div className="bg-white p-3 rounded-full w-10 h-10 flex items-center justify-center border border-slate-100 shadow-sm">
                          <RefreshCw className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">資料全域修正</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">修復全站代表人密碼格式 (XYZ &rarr; ID)。</p>
                        </div>
                        <button 
                          onClick={() => setConfirmAction({ type: 'resetPasswords' })}
                          className="w-full bg-amber-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-all shadow-md active:scale-95"
                        >
                          執行密碼重設
                        </button>
                      </div>

                      <div className="bg-[#F0F4F8] p-6 rounded-xl border border-indigo-100/50 space-y-4">
                        <div className="bg-white p-3 rounded-full w-10 h-10 flex items-center justify-center border border-slate-100 shadow-sm">
                          <Save className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">儲存所有變動</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">發佈系統設定到全站，同步更新快取。</p>
                        </div>
                        <button 
                          onClick={handleSaveSettings}
                          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                          發佈系統設定
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Users Tab - Now using Shared Component */}
        {activeTab === 'users' && (
            <UsersTab settings={settings} hiddenRoles={[]} />
        )}

        {/* Data Tab - Modern Business Style */}
        {activeTab === 'data' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-900 flex items-center text-lg">
                                <Database className="w-5 h-5 mr-3 text-blue-600" /> {t('engineer.data.title', '核心資料庫管理')}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                                執行備份、還原與雲端同步作業
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={fetchCloudData} 
                                disabled={isProcessing} 
                                className="inline-flex items-center bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 active:scale-95"
                            >
                                {isProcessing ? <Loader className="w-4 h-4 animate-spin mr-2 text-blue-600"/> : <RefreshCw className="w-4 h-4 mr-2 text-blue-600"/>} 
                                {t('engineer.data.sync', '雲端同步')}
                            </button>
                            <button 
                                onClick={handleExportCloudData} 
                                disabled={!cloudDataJson} 
                                className="inline-flex items-center bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 mr-2 text-amber-600"/> {t('engineer.data.export', '匯出 JSON')}
                            </button>
                            <label className="inline-flex items-center bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                                <Upload className="w-4 h-4 mr-2 text-emerald-600"/> {t('engineer.data.import', '匯入 JSON')}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportCloudDataChange}/>
                            </label>
                            <button 
                                onClick={handleSaveCloudData} 
                                disabled={isProcessing || !cloudDataJson} 
                                className="inline-flex items-center bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200 disabled:bg-slate-300 disabled:shadow-none"
                            >
                                <UploadCloud className="w-4 h-4 mr-2"/> {t('engineer.data.rebuild', '重建雲端資料庫')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-0 border-t border-slate-100">
                    <div className="relative group bg-white">
                        <div className="absolute top-4 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold bg-indigo-950 text-white px-3 py-1 rounded-full shadow-lg border border-slate-700">JSON Editor Mode</span>
                        </div>
                        <textarea 
                            className="w-full h-[500px] md:h-[700px] p-8 font-mono text-[13px] leading-relaxed focus:ring-0 outline-none text-slate-900 bg-white border-none resize-none selection:bg-sky-100" 
                            value={cloudDataJson} 
                            onChange={e => setCloudDataJson(e.target.value)}
                            placeholder={tString('engineer.data.placeholder', '請先執行雲端同步以讀取資料...')}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Logs Tab - Modern Business Style */}
        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-slate-900 flex items-center text-lg">
                            <FileText className="w-5 h-5 mr-3 text-blue-600" /> {t('engineer.logs.title', '系統稽核日誌')}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">追蹤全站使用者的登入與重要操作行為</p>
                    </div>
                    <div className="bg-indigo-950 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        {t('engineer.logs.totalCount', '共 {{count}} 筆記錄', { count: logs.length })}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#F0F4F8] border-b border-indigo-100/50 text-indigo-900 text-[11px] font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">{t('engineer.logs.columns.time', '時間軸')}</th>
                                <th className="px-6 py-4">{t('engineer.logs.columns.operator', '操作員')}</th>
                                <th className="px-6 py-4">{t('engineer.logs.columns.user', '對象')}</th>
                                <th className="px-6 py-4">{t('engineer.logs.columns.action', '動作')}</th>
                                <th className="px-6 py-4">{t('engineer.logs.columns.details', '詳情')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500 group-hover:text-slate-900">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                                                {log.user?.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">{log.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{log.account || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            log.action?.includes('登入') ? 'bg-blue-100 text-blue-900 border border-blue-200' : 
                                            log.action?.includes('刪除') ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                                            'bg-slate-100 text-slate-900 border border-slate-200'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600 leading-relaxed max-w-xs" title={log.details}>
                                        <div className="line-clamp-2">{log.details}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {logs.length === 0 && (
                    <div className="py-20 text-center">
                        <FileSearch className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 text-sm">目前尚無稽核日誌</p>
                    </div>
                )}
            </div>
        )}

        {/* Announcements Tab - Modern Business Style */}
        {activeTab === 'announcements' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* 最新消息管理 - 新增區塊 */}
                <div className="bg-white rounded-xl border-2 border-red-100 shadow-xl overflow-hidden flex flex-col group hover:border-red-300 transition-colors">
                    <div className="p-5 border-b border-red-50 bg-red-50/30 flex items-center justify-between">
                        <h3 className="font-bold text-red-900 flex items-center">
                            < Bell className="w-5 h-5 mr-3 text-red-600 animate-pulse" /> 最新消息管理 (Home Page Banner)
                        </h3>
                        <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Global Announcement
                        </div>
                    </div>
                    <div className="p-6 flex-1 bg-white">
                        <textarea 
                            className="w-full h-32 p-4 rounded-lg border border-red-100 bg-white text-sm text-slate-900 outline-none focus:ring-4 focus:ring-red-50 focus:border-red-600 transition-all resize-none font-medium leading-relaxed"
                            placeholder="輸入將在首頁顯示的最新消息內容..."
                            value={latestNews}
                            onChange={e => setLatestNews(e.target.value)}
                        />
                        <div className="mt-4 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Info size={14} className="text-red-400" />
                                <span className="font-bold uppercase tracking-widest">此內容將立即同步至首頁底部公告區</span>
                            </div>
                            <span className="text-red-600 font-black">
                                {latestNews ? '已輸入內容' : '尚未設定'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {announcementsCategories.map((cat) => (
                        <div key={cat} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-blue-300 transition-colors">
                            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 flex items-center">
                                    <Bell className={`w-4 h-4 mr-2.5 transition-colors ${announcements[cat]?.isActive ? 'text-blue-600' : 'text-slate-400'}`} /> {cat}
                                </h3>
                                <div 
                                    onClick={() => {
                                        setAnnouncements(prev => ({
                                            ...prev,
                                            [cat]: { ...(prev[cat] || { content: '' }), isActive: !prev[cat]?.isActive }
                                        }));
                                    }}
                                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${announcements[cat]?.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${announcements[cat]?.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            <div className="p-5 flex-1 bg-white">
                                <textarea 
                                    className="w-full h-40 p-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all resize-none placeholder:text-slate-400"
                                    placeholder={t('engineer.announcements.placeholder', '輸入 {{category}} 的公告內容...', { category: cat })}
                                    value={announcements[cat]?.content || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setAnnouncements(prev => ({
                                            ...prev,
                                            [cat]: { ...(prev[cat] || { isActive: false }), content: val }
                                        }));
                                    }}
                                />
                                <div className="mt-3 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500 font-bold uppercase tracking-widest">支援 HTML 標籤</span>
                                    <span className={announcements[cat]?.isActive ? 'text-blue-600 font-bold' : 'text-slate-500 font-bold'}>
                                        {announcements[cat]?.isActive ? '發佈中 (Live)' : '已關閉 (Draft)'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center pt-6">
                    <button 
                        onClick={handleSaveSettings} 
                        className="bg-indigo-950 text-white px-12 py-4 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center active:scale-95 group"
                    >
                        <Save className="w-5 h-5 mr-3 text-blue-400 group-hover:scale-110 transition-transform" /> {t('engineer.announcements.saveButton', '儲存公告變動')}
                    </button>
                </div>
            </div>
        )}

        {/* Translations Tab - Modern Business Style */}
        {activeTab === 'translations' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header & Main Control Row */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center">
                        <div className="bg-blue-600 p-3 rounded-xl mr-4 shadow-lg shadow-blue-100">
                            <Languages className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg leading-tight">全站語言與字典管理</h3>
                            <p className="text-xs text-slate-600 mt-1 uppercase tracking-widest font-bold">Total {dictionary.length} Entries</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-[#F0F4F8] p-1.5 rounded-lg border border-indigo-100/50 flex gap-1">
                            <button 
                                onClick={() => {
                                    const next = { ...settings, language: 'zh' as const };
                                    saveSettings(next);
                                    setSettingsData(next);
                                    i18n.changeLanguage('zh');
                                    setMsg('介面已切換：繁體中文');
                                }}
                                className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${settings.language === 'zh' || !settings.language ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                ZH-TW
                            </button>
                            <button 
                                onClick={() => {
                                    const next = { ...settings, language: 'en' as const };
                                    saveSettings(next);
                                    setSettingsData(next);
                                    i18n.changeLanguage('en');
                                    setMsg('UI Switched to English');
                                }}
                                className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${settings.language === 'en' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                EN-US
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dictionary List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-white flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="搜尋代碼、翻譯內容..."
                                className="w-full pl-11 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all outline-none text-sm text-slate-900"
                                value={dictionarySearch}
                                onChange={e => setDictionarySearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <button onClick={() => setConfirmAction({ type: 'exportDictionaryExcel' })} className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">匯出 Excel</button>
                            <button onClick={handlePublishTranslations} className="flex-1 lg:flex-none px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-100">發佈更新</button>
                        </div>
                    </div>
                        
                    <div className="overflow-x-auto max-h-[800px]">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-[#F0F4F8] border-b border-indigo-100/50 text-indigo-900 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Key 代碼</th>
                                    <th className="px-6 py-4">English</th>
                                    <th className="px-6 py-4">繁體中文</th>
                                    <th className="px-6 py-4 w-20 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredDictionary.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-500 group-hover:text-blue-600">{entry.key}</td>
                                        <td className="px-6 py-4 text-xs text-slate-700">
                                          {editingEntryId === entry.id ? (
                                            <input 
                                              type="text" 
                                              className="w-full px-2 py-1 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 outline-none text-slate-900"
                                              value={editValues.en || ''}
                                              onChange={e => setEditValues({ ...editValues, en: e.target.value })}
                                            />
                                          ) : entry.en}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-900">
                                          {editingEntryId === entry.id ? (
                                            <input 
                                              type="text" 
                                              className="w-full px-2 py-1 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 outline-none text-slate-900"
                                              value={editValues.zh || ''}
                                              onChange={e => setEditValues({ ...editValues, zh: e.target.value })}
                                            />
                                          ) : entry.zh}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {editingEntryId === entry.id ? (
                                              <div className="flex items-center justify-center gap-1">
                                                <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all">
                                                  <CheckCircle size={14} />
                                                </button>
                                                <button onClick={() => setEditingEntryId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-all">
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button onClick={() => startEditing(entry)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
                                                <Edit2 size={14} />
                                              </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredDictionary.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                                            未找到匹配的字典項目
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Engineer;