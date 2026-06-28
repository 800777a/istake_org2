
export type Role = 'member' | 'stake_admin' | 'engineer';

// V002: 動態單位，此 Enum 僅作代碼參考，實際清單由 GlobalSettings 定義
export enum Area {
  XINYING = '新營',
  TAIBAO = '太保',
  CHIAYI = '嘉義',
  MINXIONG = '民雄',
  DOULIU = '斗六',
  HUWEI = '虎尾',
}

// V002: 擴充身分
export enum IdentityType {
  ADULT = '成人',      // 18-64
  SENIOR = '敬老',     // 65+
  STUDENT = '學生',    // 12-25 (依設定)
  YOUTH = '青少',      // 3-11
  INFANT = '嬰兒',     // 0-2 (免費)
  SINGLE = '單身',     // 單身成人
  GROUP = '團體',      // 團體票
  STAFF = '工作人員',   // V043: 半價
  FIRST_TIME = '首次參加', // V043: 免費
  EXTENDED = '延用',    // V114: 新增延用
  MISSIONARY = '傳教'   // V118: 新增傳教
}

// V002: 擴充行程
export enum TripType {
  ROUND_TRIP = '來回',
  ONE_WAY_TO = '去程',
  ONE_WAY_BACK = '回程',
  SELF_MANAGED = '自理', // 不佔位，不收費
  RETAINED = '留用', // V224: 新增留用
}

// V018: 餐點偏好
export enum DietaryType {
  NO_MEAL = '不吃', // Modified label
  GENERAL = '葷食',
  VEGETARIAN = '素食',
  NO_BEEF = '不吃牛',
  NO_PORK = '不吃豬',
}

export enum RegStatus {
  NORMAL = '正常',
  WAITING = '候補',
  CANCELLED = '取消',
  RESERVED = '保留',
  COMPLETED = '完成',
  RESTRICTED = '限制',
  DELETED = '刪除',
  RETAINED = '留用',
  REFUNDED = '退款',
}

// V002: 教儀性質
export enum OrdinanceType {
  PROXY = '代替',
  CHILD = '兒童', 
  LIVING = '活人',
  NONE = '不會', // V320: Changed from 略過 to 不會
}

// V002: 教儀項目
export enum OrdinanceItem {
  BAPTISM = '洗禮',
  CONFIRMATION = '證實',
  INITIATORY = '先行禮',
  ENDOWMENT = '恩道門',
  SEALING = '印證',
  OBSERVER = '觀禮', // V090: Added Observer
  CHILD = '兒童',
  NONE = '不會', // V320: Changed from 略過 to 不會
}

// V300: Bus Management Types
export interface BusCompany {
  id: string; // 公司編號 (Unique ID)
  name1: string;
  name2: string;
  name3: string;
  manager: string;
  phone: string;
  address: string;
  serviceCount: number;
  totalRating: number;
  avgRating: number;
  notes: string;
  status: 'normal' | 'excellent' | 'bad';
}

export interface BusVehicle {
  plate: string;
  companyId: string;
  companyName: string; // Currently used name from name1-3
  seats: number;
  year: string;
  color: string;
  serviceCount: number;
  totalRating: number;
  avgRating: number;
  notes: string;
  status: 'normal' | 'excellent' | 'bad';
}

export interface BusDriver {
  id: string;
  name: string;
  phone: string;
  companyId: string;
  companyName: string;
  plate: string; // Primary assigned vehicle
  serviceCount: number;
  totalRating: number;
  avgRating: number;
  notes: string;
  status: 'normal' | 'excellent' | 'bad';
}

export interface BusRatingRecord {
  id: string;
  eventId: string;
  eventDate: string;
  busId: string; // The bus_index or ID in the event
  companyId: string;
  plate: string;
  driver1Id: string;
  driver2Id: string;
  driver1Name: string;
  driver2Name: string;
  // Metrics for Driver 1
  d1Metrics: boolean[]; // 9 items
  // Metrics for Driver 2
  d2Metrics: boolean[]; // 9 items
  remarks: string;
  raterUnit: string;
  raterName: string;
  manualAdjustment: number;
  isProcessed: boolean;
  isSubmitted: boolean; // Front-end submitted status
}

// V002: 付款方式
export enum PaymentMethod {
  CASH = '現金',
  TRANSFER = '轉帳',
  EXTENDED = '延用',
}

// V002: 使用者帳號
export interface User {
  username: string;
  password: string; // Mock mode: plain text
  role: Role;
  roles?: Role[]; // V099: Multi-role support
  name: string;
  unit?: string; // 承辦人所屬單位
  order?: number; // V123: Sort Order
  email?: string; // V550: Added email field
  phone?: string; // V330: Added phone field
  permission?: 'edit' | 'read'; // V330: Added permission field
}

export interface DictionaryEntry {
  id: string;
  key: string;      // 系統代碼 (e.g., btn_submit)
  zh: string;       // 繁體中文
  en: string;       // 英文翻譯
  category: string; // 分類 (如: 按鈕, 標籤, 訊息)
}

// V002: 全域設定 (可由 Admin 修改)
export interface GlobalSettings {
  stake_name: string; // Header Title (Managed by Supervisor)
  footer_name?: string; // Footer Text (Managed by Engineer)
  app_version?: string; // V097: App Version
  maintenance_date?: string; // V121: Maintenance Date
  internet_fee?: number; // V300: Internet Fee
  engineering_version?: string; // V192: Engineer Version
  engineering_date?: string; // V192: Engineer Date
  maintenance_mode?: boolean; // V117: System Maintenance Mode
  language?: 'zh' | 'en'; // V410: 全站切換語系
  temple_name: '台北聖殿' | '高雄聖殿' | '台中聖殿';
  units: string[]; // 支分會清單
  boarding_places: string[]; // V004: 上車地點清單
  bank_info: {
    bank_name: string;
    bank_code: string;
    account_name: string;
    account_number: string;
    contact_phone?: string;
  };
  bank_info2?: {
    bank_name: string;
    bank_code: string;
    account_name: string;
    account_number: string;
    contact_phone?: string;
  };
  payment_methods?: string[]; // V104: Enable/Disable methods
  price_config: PriceConfig;
  billingConfig?: BillingEngineConfig; // V320: Composite Billing Engine
  system_notice?: string; // V010: 系統公告
  site_announcements?: Record<string, { content: string; isActive: boolean }>; // V405: Announcement Settings
  translations?: Record<string, string>; // V405: Global Translation Dictionary (Legacy)
  dictionary?: DictionaryEntry[]; // V410: 結構化字典表
  sessions: string[]; // V013: 聖殿場次時間表
  stations?: Station[]; // V500: 站點資料庫
  staff_roles: string[]; // V016: 工作人員職務清單
  rules_content?: string; // V073: 活動辦法內容
  custom_identities?: string[]; // V076: 自訂收費項目
  active_identities?: string[]; // V120: 啟用生效清單 (Sidebar)
  hidden_identities?: string[]; // V180: 隱藏的標準身分 (Standard Identities)
  identity_categories?: Record<string, '車資' | '餐費' | '房價' | '其他'>; // V202: Item Category Mapping
  
  // V300: Bus Global Database
  busCompanies?: BusCompany[];
  busVehicles?: BusVehicle[];
  busDrivers?: BusDriver[];
  busRatings?: BusRatingRecord[];
}

// V002: 票價矩陣 [單位][身分] = { 來回價, 單程價 }
// V075: Added enabled flag
// V076: Allow string key for custom identities
// V202: Added amount for flat fee items (Meal/Room)
export interface PriceConfig {
  [unitName: string]: {
    [identity: string]: {
      round_trip: number;
      one_way: number;
      amount?: number; // New: Flat fee amount
      enabled?: boolean; 
    } | undefined;
  };
}

// V019: 行程表項目
export interface ScheduleItem {
  id: string;
  time: string; // "HH:MM"
  title: string;
  description?: string;
  icon?: 'bus' | 'temple' | 'food' | 'home' | 'star';
}

// V020: 車輛狀態與突發事件
export type BusStatusType = 'waiting' | 'boarding' | 'departed' | 'arrived';

export interface Incident {
  id: string;
  timestamp: string;
  type: 'medical' | 'logistics' | 'personnel' | 'other';
  description: string;
  status: 'open' | 'resolved';
  logged_by: string;
}

// V021: 回饋調查
export interface Feedback {
  id: string;
  reg_id: string;
  event_id: string;
  rating_transport: number;
  rating_food: number;
  rating_experience: number;
  comment: string;
  created_at: string;
}

// V022: 失物招領與花絮
export interface LostItem {
  id: string;
  itemName: string;
  description: string;
  foundLocation: string;
  status: 'unclaimed' | 'claimed';
  timestamp: string;
}

// V033: Update EventPhoto for community upload
export interface EventPhoto {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
  uploader?: string; // Name
  status: 'approved' | 'pending';
  likes: number;
}

// V033: Testimony Structure
export interface Testimony {
  id: string;
  eventId: string;
  regId?: string;
  authorName: string;
  content: string;
  createdAt: string;
  isPublic: boolean;
}

// V034: Ancestor Structure for Family History
export interface Ancestor {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  ordinances: OrdinanceItem[]; // Requested ordinances
  status: 'ready' | 'printed' | 'completed';
  idNumber?: string; // Mock record ID
}

// V024: 廣播公告
export interface Announcement {
  id: string;
  message: string;
  type: 'urgent' | 'normal' | 'info';
  isActive: boolean;
  createdAt: string;
  expirationTime?: string;
}

// V025: 籌備任務
export interface Task {
  id: string;
  title: string;
  type: 'global' | 'per_unit'; // global = 負責人自己做, per_unit = 每個單位都要做
  status: Record<string, boolean>; // key: 'admin' (for global) or unit_name (for per_unit) -> true/false
  dueDate?: string;
}

// V030: 結案報告數據結構
export interface FinalReportData {
  generatedAt: string;
  totalAttendance: number;
  attendanceRate: number; // 0-100
  totalRevenue: number;
  totalExpense: number;
  netBalance: number;
  avgSatisfaction: number;
  incidentCount: number;
  aiSummary?: string;
}

// V032: 安全回報狀態
export type SafetyStatus = 'unknown' | 'safe' | 'help_needed';

// V032: 緊急模式設定
export interface EmergencyConfig {
  isActive: boolean;
  message: string;
  triggeredAt?: string;
}

// V102: Bus Stop Config
export interface BusStop {
    code: string; // e.g. "A1"
    location: string; // e.g. "新營"
    time?: string; // e.g. "07:30"
}

// V500: Station (Bus Stop Database)
export interface Station {
  id: string;
  area: string;    // 地名 (Area/Landmark)
  place: string;   // 地點 (Station Name)
  address: string; // 地址
  mapUrl: string;  // 地圖網址
}

// V073: 車輛配置詳細資訊
// V080: Added Cost Fields
// V084: Added Capacity
// V087: Added Navigator Info
// V102: Added Stops
export interface BusConfig {
  name: string; // e.g., "A車", "甲車"
  company?: string;
  companyId?: string; // V300: Link to BusCompany
  licensePlate?: string;
  driverName1?: string; // V300: Renamed from driverName
  driverPhone1?: string; // V300: Renamed from driverPhone
  driverName2?: string; // V300: Added
  driverPhone2?: string; // V300: Added
  bookingCost?: number; // V080
  driverMealCost?: number; // V080
  parkingCost?: number; // V080
  otherCost?: number; // V225: Added otherCost
  capacity?: number; // V084: Default 42 (Rename to 座位總數 in UI)
  navigatorUnit?: string; // V087
  navigatorName?: string; // V087
  stops?: BusStop[]; // V102
}

// V084: Staff Contact
export interface StaffContact {
    id: string;
    unit: string;
    position: string;
    name: string;
    gender: string;
    phone: string;
    line?: string;
}

// V122: Service Person
export interface ServicePerson {
  id: string;
  order: number;
  unit: string;
  calling: string;
  name: string;
}

// V129: Volunteer Structure
export interface Volunteer {
    id: string;
    unit: string;
    name: string;
    roleKey: string; // 'A', 'B', etc.
}

// V090: Route Planning Item Structure
export interface RoutePlanItem {
    duration: string; // 行駛 (分)
    arrivalTime: string; // 到達 (時間)
    departureTime: string; // 離開 (時間) - was Departure
    location: string; // 地點 (Place/Station)
    area?: string;    // 地名 (Area) - V501: Added area field
    // New fields
    stay?: string; // 停留
    stopCode?: string; // 停靠站代碼
    address?: string; // 地址
    mapUrl?: string; // 地圖網址
}

// V150: Road Sign Item Structure
export interface RoadSignItem {
    label: string; // 項目 (Legacy, or used for ID)
    instruction: string; // 指示
    checked?: boolean; // V155: Check status
}

// V091: Per Bus Route Config
export interface BusRoute {
    outboundTitle: string; // 去程: A車
    returnTitle: string; // 回程: A車
    outbound: RoutePlanItem[];
    returnTrip: RoutePlanItem[];
    // V143: Route Time Configs
    outboundStartTime?: string;
    outboundEndTime?: string;
    returnStartTime?: string;
    returnEndTime?: string;
    // V146: Bus Route Publish State
    isPublished?: boolean; // Legacy: General publish
    isOutboundPublished?: boolean; // V165: Independent Outbound Control
    isReturnPublished?: boolean; // V165: Independent Return Control
    
    // V200: Bus Specific Road Signs
    outboundRoadSigns?: RoadSignItem[];
    returnRoadSigns?: RoadSignItem[];
    // V201: Bus Specific Road Signs Publish State
    isOutboundRoadSignsPublished?: boolean;
    isReturnRoadSignsPublished?: boolean;

    // Legacy (Deprecated)
    roadSigns?: {
        isPublished: boolean;
        items: RoadSignItem[];
    };
}

// V301: Ordinance Session Item
export interface OrdinanceSessionItem {
  name: string;
  time: string;
  capacity: number;
}

// S1 活動主檔
export interface EventData {
  event_id: string;
  event_date: string;
  event_title?: string;
  organizer?: string;
  status: 'planning' | 'confirmed' | 'cancelled' | 'completed';
  
  // Historical Stats (V410 for HistoryTab)
  attendance_total?: number;
  attendance_bus?: number;
  attendance_self?: number;
  attendance_retained?: number;
  revenue_fare?: number;
  expense_total?: number;
  settlement_returned?: number;
  bus_total?: number;
  bus_booking_fee?: number;
  church_subsidy?: number;
  event_notes?: string;
  is_historical?: boolean; // V410: History record flag

  is_registration_open?: boolean; // V119: Control registration open/close separately
  is_seat_limited?: boolean; // Add seat limit flag
  registrationDeadline?: string; // V162: New Deadline Field (ISO String)
  bus_count: number;
  paymentDeadlineDays?: number; // V160: 繳費日數限制 (0 = 無限制)
  cost_per_bus?: number; // V006: 單車成本預估 (Legacy, now use detailed config)
  is_active: boolean; // 是否為當前開放報名的活動
  schedule?: ScheduleItem[]; // V019: 行程表
  bus_statuses?: Record<string, BusStatusType>; // V020: 車輛狀態
  busConfigs?: BusConfig[]; // V073: 車輛詳細設定
  insuranceCost?: number; // V081: 保險費用總額
  // V086: Added staffRole to unitStaffInfo
  unitStaffInfo?: Record<string, { staff?: string, staffRole?: string }>; // V082: 各單位工作人員名單
  
  // V084 Additions
  sop_progress?: boolean[]; // Array of 11 booleans corresponding to 11 steps
  temple_workers?: Record<string, { name: string, unit: string } | string>; // V088: Update type to support unit
  staff_directory?: StaffContact[]; // Tab 10 data
  servicePersonnel?: ServicePerson[]; // V122: Service Personnel List
  volunteers?: Volunteer[]; // V129: Volunteer list
  paymentDisplayMode?: 'none' | 'forced' | 'confirmed_only'; // V310: Payment display control

  // V088: Session Config (Deprecated field, replaced by below)
  sessionConfig?: {
      slots: string[]; 
      unitAllocations: Record<string, string>; 
  };

  // V089: Specific Session Configs
  endowmentSessions?: {
      slots: string[]; // 4 slots
      unitAllocations: Record<string, string>; // Unit -> Slot
  };
  baptismSessions?: {
      slots: string[]; // 2 slots
  };
  endowment_capacity?: number; // Vxxx: Endowment Capacity
  baptism_capacity?: number; // Vxxx: Baptism Capacity
  sealing_capacity?: number; // Vxxx: Sealing Capacity

  // V301: Detailed Ordinance Settings
  endowmentSettingsV2?: OrdinanceSessionItem[];
  baptismSettingsV2?: OrdinanceSessionItem[];
  sealingSettingsV2?: OrdinanceSessionItem[];

  // V090: Detailed Route Planning (Legacy single route)
  routePlanV2?: {
      stopsSetting: string; // 停靠站設定文字
      outboundTitle: string; // 去程標題 (e.g. A.新營->台北)
      returnTitle: string; // 回程標題
      outbound: RoutePlanItem[]; // 去程表格
      returnTrip: RoutePlanItem[]; // 回程表格
  };

  // V091: Multiple Bus Routes
  busRoutes?: Record<string, BusRoute>;

  // V151: Global Road Signs
  globalRoadSigns?: {
      isPublished: boolean;
      items: RoadSignItem[]; // Legacy support
      outboundItems?: RoadSignItem[]; // New V152
      returnItems?: RoadSignItem[]; // New V152
      isOutboundLocked?: boolean; // V156
      isReturnLocked?: boolean; // V156
  };

  // V144: Temple Schedule (教儀時間安排)
  templeConfig?: {
      title: string;
      startTime: string;
      endTime: string;
      items: RoutePlanItem[];
      isPublished?: boolean; // V145: Public visibility
      
      // V197: New Temple Days & Closed Days
      templeDays?: { content: string; isPublished: boolean; };
      templeClosedDays?: { content: string; isPublished: boolean; };
  };

  // V175: Registration Field Configuration
  registrationConfig?: {
      showBirthday: boolean; // V185: New Birthday Control
      showID: boolean; // 身分證
      showOrdinance: boolean; // 教儀性質/項目
      showSession?: boolean; // V211: 場次 (獨立控管)
      showDining: boolean; // 用餐 (餐點)
      // V208: Extended Controls
      showTrip?: boolean; // 行程
      showIdentity?: boolean; // 車資(身分)
      showRoom?: boolean; // 住宿
      showOther?: boolean; // 其他
      showTotal?: boolean; // V210: 合計金額
  };

  incidents?: Incident[]; // V020: 突發事件
  lostItems?: LostItem[]; // V022: 失物招領
  photos?: EventPhoto[]; // V022: 活動花絮
  testimonies?: Testimony[]; // V033: 見證牆
  announcements?: Announcement[]; // V024: 即時公告
  tasks?: Task[]; // V025: 籌備任務
  finalReport?: FinalReportData; // V030: 結案報告
  emergencyConfig?: EmergencyConfig; // V032: 緊急狀態
  stop_cancellation?: boolean; // V180: 停止取消功能
}

// V135: New Family Group Structure
export interface FamilyGroup {
    id: string;
    event_id: string;
    primary_name: string;
    primary_phone: string; // Acts as password
    contact_phone?: string; // V137: Real Contact Phone (ensure it is saved here)
    primary_unit: string;
    payment_method: PaymentMethod;
    transfer_last_5?: string;
    created_at: string;
}

// S2 報名資料 (V002 擴充)
export interface Registration {
  reg_id: string;
  serial_number?: number; // 編號
  endowment_serial_number?: number; // 恩道門編號
  baptism_serial_number?: number; // 洗禮編號
  sealing_serial_number?: number; // 印證編號
  event_id: string;
  family_group_id: string;
  is_primary_contact: boolean;
  
  // V135: Denormalized Primary Contact Info for Display
  primary_contact_name?: string; 

  // 個人資料
  name: string;
  phone?: string; // Acts as password for primary contact in current schema
  contact_phone?: string; // V136: Actual Contact Phone
  identity_id: string; // 身分證 (承辦人不可見)
  birth_date: string;  // 生日 (承辦人不可見)
  unit: string;
  
  // V002: 身分與行程
  identity_type: string; // V076: Changed to string to support custom identities (Transport Item)
  meal_item?: string; // V205: New Meal Item (餐費項目)
  room_item?: string; // V205: New Room Item (房價項目)
  other_item?: string; // V207: New Other Item (其他項目)
  guardian?: string; // V310: Guardian for minors
  trip_type: TripType;
  
  // V002: 教儀
  ordinance_type: OrdinanceType;
  ordinance_item: OrdinanceItem;
  ceremony_session?: string; // V013: 預約場次

  // V002: 財務與行政
  is_staff: boolean;
  staff_role?: string; // V016: 具體職務
  is_new_member: boolean;
  boarding_place?: string; // 負責人指派 或 使用者選擇
  payment_method: PaymentMethod;
  transfer_last_5?: string; // 若轉帳則必填
  amount_due: number; // 系統計算應繳金額
  
  // V018: 餐點
  dietary_preference?: string; // Changed to string to accommodate custom values or simple mapping

  // V005: 狀態追蹤
  is_paid: boolean;
  is_checked_in: boolean; // Legacy: General check-in
  
  // V061: Split Check-in
  is_checked_in_to?: boolean; // 去程
  is_checked_in_back?: boolean; // 回程

  admin_note?: string;

  // 系統狀態
  status: RegStatus;
  bus_assigned?: string; // V004: 分車資訊 (e.g. "A車", "B車")
  seat_no?: string; // V028: 座位號碼 (1-45)
  created_at: string;
  
  // V021: 是否已填寫回饋
  has_feedback?: boolean;

  // V023: 職務指派細節
  duty_description?: string;

  // V031: 個人靈性目標
  personal_goal?: string;

  // V032: 安全狀態
  safety_status?: SafetyStatus;

  // V034: Ancestors List
  ancestors?: Ancestor[];

  // V035: Trivia Score
  trivia_score?: number;
}

// V170: Blacklist Item
export interface BlacklistItem {
    id: string;
    unit: string;
    name: string;
    reason: 'unpaid' | 'violation' | '欠費' | '犯規';
    created_at: string;
}

// V172: Representative (代表人)
export interface Representative {
    id: string;
    unit: string;
    name: string;
    phone: string;
    password: string;
    created_at: string;
}

// V180: Comment (留言)
export interface Comment {
    id: string;
    event_id: string;
    author_name: string;
    author_unit?: string; // V180: 所屬單位
    category?: string; // V180: 留言分類
    content: string;
    is_admin_reply: boolean;
    parent_id?: string; // For replies
    is_spam?: boolean;
    created_at: string; // ISO string
}

// V012: Personal Info (個資)
export interface PersonalInfo {
    id: string;
    unit: string;
    name: string;
    birth_date: string;
    identity_id: string;
    service_qualification?: string; // V220: Added service_qualification
    guardian?: string; // V310: Guardian for minors
    created_at: string;
}

// V012: 稽核紀錄
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  account?: string; // V158: Login Account
  action: string;
  details: string;
  password?: string; // V131: Log password if available
}

// V003: 支出紀錄 (Legacy, integrated into EventData for V030)
export interface ExpenseRecord {
  id: string;
  event_id: string;
  category: string;
  amount: number;
  note: string;
  created_at: string;
  // TODO: Add receipt image support
}

// V007: Weather Cache
export interface WeatherInfo {
  temp_high: number;
  temp_low: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  rainProb: number;
}

// V320: Composite Billing Engine Types
export type PricingMethod = 'fixed' | 'percent' | 'adjustment'; // 固定金額、百分比 或 增減金額

export interface PricingValue {
  method: PricingMethod;
  value: number;
}

export interface UnitConfig {
  shortName: string;
  fullName: string;
  sortOrder?: number;
}

export interface IdentityPricing {
  identity: string;
  price: PricingValue; // Layer 3
  description?: string;
  sortOrder?: number;
}

export interface TripPricing {
  trip: string; // TripType label or 'ROUND_TRIP' etc
  price: PricingValue; // Layer 4
  sortOrder?: number;
}

export interface SpecialPromoRule {
  id: string;
  name: string;
  units?: string[];
  identities?: string[];
  tripTypes?: string[];
  price: PricingValue; // Layer 5
  enabled: boolean;
  sortOrder?: number;
}

export interface BillingEngineConfig {
  units: UnitConfig[]; // Layer 0
  baseFees: Record<string, number>; // Layer 1 & 2: Unit ShortName or "GLOBAL" -> amount
  unitGroups: Record<string, string[]>; // GroupName -> Array of shortNames
  identityPricings: IdentityPricing[]; // Layer 3
  tripPricings: TripPricing[]; // Layer 4
  specialPromos: SpecialPromoRule[]; // Layer 5
  calcStrategy: 'stack' | 'min'; // Layer 6: 疊加 或 取低
  roundingToTen: boolean; // Layer 7: 四捨五入到十位數
}
export interface RegistrationMemberInput {
  temp_id: string;
  serial_number?: number;
  endowment_serial_number?: number;
  baptism_serial_number?: number;
  sealing_serial_number?: number;
  created_at?: string; // Preserve creation time during updates
  name: string;
  identity_id: string;
  birth_date: string;
  trip_type: TripType;
  identity_type: string; 
  meal_item?: string; // New: Selected Meal Item
  room_item?: string; // New: Selected Room Item
  other_item?: string; // New: Selected Other Item
  guardian?: string; // V310: Guardian for minors
  ordinance_type: OrdinanceType;
  ordinance_item: OrdinanceItem;
  ceremony_session?: string;
  is_staff: boolean;
  staff_role?: string;
  is_new_member: boolean;
  boarding_place?: string;
  dietary_preference?: string; // String for flexible input
  unit?: string; // V206: Allow per-member unit override
  service_qualification?: string; // V220: Added service_qualification
  is_personal_info_matched?: boolean; // Hide fields if matched
}

export interface FamilyGroupInput {
  primary_name: string;
  primary_phone: string; // Password
  primary_real_phone?: string; // V136: Actual Contact Phone
  primary_unit: string;
  payment_method: PaymentMethod;
  transfer_last_5?: string;
  members: RegistrationMemberInput[];
}
