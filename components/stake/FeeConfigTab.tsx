import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../src/contexts/LanguageContext';
import { 
  GlobalSettings, 
  IdentityType, 
  EventData, 
  BillingEngineConfig, 
  UnitConfig, 
  PricingValue, 
  TripType,
  SpecialPromoRule,
  PaymentMethod
} from '../../types';
import { 
  saveSettings, 
} from '../../services/sheetService';
import { getEffectiveBankInfo } from '../../utils/bankInfo';
import { 
  Tabs, 
  Row, 
  Col, 
  Button, 
  Input, 
  Space, 
  Flex,
  Typography, 
  Modal, 
  message, 
  Divider, 
  Checkbox,
} from 'antd';
import { 
  Calculator, 
  ShieldCheck, 
  Globe, 
  CreditCard,
  Save,
  Upload,
  Coins,
  Settings
} from 'lucide-react';

// Modular components
import { RainbowCard, rainbowStyles } from './fee-config/RainbowCard';
import { BankInfoSection } from './fee-config/BankInfoSection';
import { UnitFeesStep } from './fee-config/UnitFeesStep';
import { ModifierStep } from './fee-config/ModifierStep';
import { SpecialPromosStep } from './fee-config/SpecialPromosStep';
import { LogicRoundingStep } from './fee-config/LogicRoundingStep';
import { FeeCalculationModal } from './fee-config/FeeCalculationModal';
import { FeeExplanationSection } from './fee-config/FeeExplanationSection';

const { Title, Text } = Typography;

interface FeeConfigTabProps {
  settings: GlobalSettings;
  currentEvent: EventData | null;
  onRefreshEvents: () => void;
}

const FeeConfigTab: React.FC<FeeConfigTabProps> = ({ settings: initialSettings, currentEvent, onRefreshEvents }) => {
  const { t, tString } = useI18n();
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    'payment_info': true,
    'payment_methods': true,
    'step1': true,
    'step2': true,
    'step3': true,
    'step4': true,
    'step5': true,
    'step6': true,
  });

  const [inputCode, setInputCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [originalBankInfo, setOriginalBankInfo] = useState<{info1: any, info2: any} | null>(null);

  const [bankInfoDraft, setBankInfoDraft] = useState(getEffectiveBankInfo(initialSettings.bank_info));
  const [bankInfo2Draft, setBankInfo2Draft] = useState(initialSettings.bank_info2 || { bank_name: '', bank_code: '', account_name: '', account_number: '' });

  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0 && isVerifying && !isVerified) {
      if (originalBankInfo) {
        setBankInfoDraft(originalBankInfo.info1);
        setBankInfo2Draft(originalBankInfo.info2);
        setSettings({
          ...settings,
          bank_info: originalBankInfo.info1,
          bank_info2: originalBankInfo.info2
        });
      }
      setIsVerifying(false);
      setIsVerified(false);
      setOriginalBankInfo(null);
      message.error(t('stake.fee_config.auth_timeout', '認證超時，資料已還原'));
    }
    return () => clearInterval(timer);
  }, [countdown, isVerifying, originalBankInfo, settings, isVerified, t]);

  const [billingConfig, setBillingConfig] = useState<BillingEngineConfig>(settings.billingConfig || {
    units: (settings.units || []).map(u => ({ shortName: u, fullName: u })),
    baseFees: { 'GLOBAL': 500 },
    unitGroups: {},
    identityPricings: [],
    tripPricings: [],
    specialPromos: [],
    calcStrategy: 'stack',
    roundingToTen: true
  });

  useEffect(() => {
    setSettings(initialSettings);
    if (!isVerifying) {
      setBankInfoDraft(getEffectiveBankInfo(initialSettings.bank_info));
      setBankInfo2Draft(initialSettings.bank_info2 || { bank_name: '', bank_code: '', account_name: '', account_number: '' });
    }
    if (initialSettings.billingConfig) {
      setBillingConfig(initialSettings.billingConfig);
    }
  }, [initialSettings, isVerifying]);

  const handleSave = async (newConfig?: BillingEngineConfig, customSettings?: GlobalSettings) => {
    setLoading(true);
    try {
      const configToSave = newConfig || billingConfig;
      
      // Sort all lists by sortOrder before saving
      if (configToSave.units) {
        configToSave.units.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      if (configToSave.identityPricings) {
        configToSave.identityPricings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      if (configToSave.tripPricings) {
        configToSave.tripPricings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      if (configToSave.specialPromos) {
        configToSave.specialPromos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }

      const updatedSettings = customSettings || { ...settings, billingConfig: configToSave };
      await saveSettings(updatedSettings);
      message.success(t('common.save_success', '設定已儲存'));
    } catch (err) {
      message.error(t('common.save_fail', '儲存失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (newConfig: BillingEngineConfig) => {
    // Sort all lists by sortOrder before updating state
    if (newConfig.units) {
      newConfig.units.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    if (newConfig.identityPricings) {
      newConfig.identityPricings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    if (newConfig.tripPricings) {
      newConfig.tripPricings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    if (newConfig.specialPromos) {
      newConfig.specialPromos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    
    setBillingConfig(newConfig);
    handleSave(newConfig);
  };

  const toggleStep = (step: string) => {
    setExpandedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const sendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '800777a@gmail.com' })
      });
      const data = await response.json();
      if (data.success) {
        setCountdown(300);
        setIsVerifying(true);
        setOriginalBankInfo({ info1: settings.bank_info, info2: settings.bank_info2 });
        message.success(t('stake.fee_config.otp_sent', '驗證碼已發送至您的信箱'));
      } else {
        message.error(data.error || t('stake.fee_config.otp_fail', '驗證碼發送失敗'));
        if (data.error?.includes('Gmail') || data.details?.includes('Gmail') || data.details?.includes('refresh_token')) {
          Modal.warning({
            title: 'Gmail 授權失效',
            content: (
              <div>
                <p>Gmail 發信授權已失效或尚未設定。請聯繫資管人員至「資管專區」重新連結 Gmail 帳號並更新 Refresh Token。</p>
                <p className="text-xs text-gray-500 mt-2">錯誤詳情: {data.details || '無'}</p>
              </div>
            ),
            okText: '知道了'
          });
        }
      }
    } catch (err) {
      message.error(t('common.send_fail_retry', '發送失敗，請稍後再試'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!inputCode) {
      message.warning(t('common.enter_verification_code', '請輸入驗證碼'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode })
      });
      const data = await response.json();
      if (data.success) {
        setIsVerified(true);
        setIsVerifying(false);
        setCountdown(0);
        const updatedSettings = {
          ...settings,
          bank_info: bankInfoDraft,
          bank_info2: bankInfo2Draft
        };
        setSettings(updatedSettings);
        await saveSettings(updatedSettings);
        message.success(t('stake.fee_config.bank_info_success', '銀行資訊更新成功'));
      } else {
        message.error(t('common.verification_code_error', '驗證碼錯誤'));
      }
    } catch (err) {
      message.error(t('common.verification_fail', '驗證失敗'));
    } finally {
      setLoading(false);
    }
  };

  const [isMainHeaderExpanded, setIsMainHeaderExpanded] = useState(true);

  const handleExportLogic = () => {
    Modal.confirm({
      title: t('stake.fee_config.confirm_save_logic', '確定要儲存收費邏輯檔嗎？'),
      okText: t('common.confirm', '確定'),
      cancelText: t('common.cancel', '取消'),
      onOk: () => {
        const data = {
          fee_logic_config: billingConfig,
          exportedAt: new Date().toISOString(),
          version: "1.0"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = tString('stake.fee_config.logic_filename', '收費邏輯檔.json');
        link.click();
        URL.revokeObjectURL(url);
        message.success(t('stake.fee_config.export_success', '收費邏輯檔已匯出'));
      }
    });
  };

  const handleImportLogic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      message.error(t('stake.fee_config.invalid_extension', '檔案格式不符 (僅支援 .json)'));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.fee_logic_config) {
          message.error(t('stake.fee_config.invalid_format', '檔案格式不符 (缺少 fee_logic_config)'));
          return;
        }

        Modal.confirm({
          title: t('stake.fee_config.confirm_read_logic', '確定要讀取收費邏輯檔嗎？'),
          content: t('stake.fee_config.confirm_read_logic_desc', '這將會覆蓋現有的第1步到第6步設定值。'),
          okText: t('common.confirm', '確定'),
          cancelText: t('common.cancel', '取消'),
          onOk: () => {
            handleConfigChange(json.fee_logic_config);
            message.success(t('stake.fee_config.import_success', '收費邏輯檔匯入成功'));
          }
        });
      } catch (err) {
        message.error(t('stake.fee_config.parse_error', '檔案解析失敗'));
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Tab Title Row - Static, no toggle */}
      <div className="bg-indigo-900 text-white px-6 py-4 rounded shadow-md flex items-center gap-4 mb-6">
        <div className="p-3 bg-white/10 rounded border border-white/10">
          <Settings className="text-blue-300" size={24} />
        </div>
        <div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
            {t('stake.fee_config.title', '收費設定')}
          </h2>
        </div>
      </div>

      <div className="space-y-8">
        <RainbowCard
          title={tString('stake.fee_config.payment_info_title', '付款資訊')}
          icon={<CreditCard size={20} />}
          colorIndex={0}
          isExpanded={expandedSteps['payment_info']}
          onToggle={() => toggleStep('payment_info')}
          extra={
            !isVerifying ? (
              <button 
                onClick={sendOTP}
                className="h-10 px-5 rounded text-xs font-bold transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: rainbowStyles[0].bg,
                  color: rainbowStyles[0].text,
                  border: `1px solid ${rainbowStyles[0].border}`
                }}
              >
                <ShieldCheck size={16} /> {t('stake.fee_config.edit_payment_btn', '修改付款資訊 (OTP 驗證)')}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <input 
                  placeholder={tString('common.verification_code', '驗證碼')} 
                  className="w-24 h-10 bg-white border border-slate-200 rounded px-3 text-sm"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                />
                <button 
                  onClick={verifyOTP}
                  className="h-10 px-5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  {t('common.verify_and_save', '驗證並儲存')}
                </button>
                <span className="text-rose-600 font-bold text-xs">{t('common.remaining', '剩餘')} {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
              </div>
            )
          }
        >
          <BankInfoSection 
            info1={bankInfoDraft}
            info2={bankInfo2Draft}
            onChange1={setBankInfoDraft}
            onChange2={setBankInfo2Draft}
          />
        </RainbowCard>

        <RainbowCard
          title={tString('stake.fee_config.payment_methods_title', '付款方式設定')}
          icon={<Globe size={20} />}
          colorIndex={1}
          isExpanded={expandedSteps['payment_methods']}
          onToggle={() => toggleStep('payment_methods')}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              {t('stake.fee_config.payment_methods_hint', '勾選欲開放的付款方式，報名表單將僅顯示已啟用的項目：')}
            </p>
            <div className="flex flex-wrap gap-6">
              {[
                { value: PaymentMethod.CASH, label: t('stake.fee_config.payment_methods.cash', '現金') },
                { value: PaymentMethod.TRANSFER, label: t('stake.fee_config.payment_methods.transfer', '轉帳') },
                { value: PaymentMethod.EXTENDED, label: t('stake.fee_config.payment_methods.extended', '留用') }
              ].map(method => (
                <label key={method.value} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={(settings.payment_methods || [PaymentMethod.CASH, PaymentMethod.TRANSFER]).includes(method.value)}
                    onChange={(e) => {
                      const current = settings.payment_methods || [PaymentMethod.CASH, PaymentMethod.TRANSFER];
                      let next;
                      if (e.target.checked) next = [...current, method.value];
                      else next = current.filter(v => v !== method.value);
                      const updated = { ...settings, payment_methods: next };
                      setSettings(updated);
                      handleSave(undefined, updated);
                    }}
                  />
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{method.label}</span>
                </label>
              ))}
            </div>
          </div>
        </RainbowCard>

        {/* Sandbox button moved here */}
        <div className="flex justify-end gap-3 mt-12 mb-4">
          <button 
            onClick={() => setSandboxVisible(true)}
            className="h-11 px-6 bg-amber-500 text-white rounded text-sm font-bold shadow-md hover:bg-amber-600 transition-all flex items-center gap-2"
          >
            <Calculator size={18} /> {t('stake.fee_config.sandbox_btn', '收費試算')}
          </button>
        </div>

        {/* Billing Rules Header Row - Independent row as per rules */}
        <div className="bg-indigo-900 text-white px-6 py-4 rounded shadow-md flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded border border-white/10">
              <Coins className="text-blue-300" size={20} />
            </div>
            <h3 className="font-bold text-base md:text-lg tracking-tight">
              {t('stake.fee_config.billing_rules_title', '收費邏輯配置')}
            </h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportLogic}
              className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <Save size={16} /> {t('stake.fee_config.save_logic_file', '儲存收費邏輯檔')}
            </button>
            <button 
              onClick={() => document.getElementById('logic-file-input')?.click()}
              className="h-10 px-4 bg-amber-50 border border-amber-200 text-amber-700 rounded text-xs font-bold hover:bg-amber-100 transition-all flex items-center gap-2"
            >
              <Upload size={16} /> {t('stake.fee_config.read_logic_file', '讀取收費邏輯檔')}
            </button>
            <input 
              id="logic-file-input" 
              type="file" 
              accept=".json" 
              className="hidden"
              onChange={handleImportLogic} 
            />
          </div>
        </div>

        <UnitFeesStep 
          billingConfig={billingConfig}
          onConfigChange={handleConfigChange}
          isExpanded={expandedSteps['step1']}
          onToggle={() => toggleStep('step1')}
          colorIndex={2}
        />

        <ModifierStep 
          type="identity"
          billingConfig={billingConfig}
          onConfigChange={handleConfigChange}
          isExpanded={expandedSteps['step2']}
          onToggle={() => toggleStep('step2')}
          colorIndex={3}
        />

        <ModifierStep 
          type="trip"
          billingConfig={billingConfig}
          onConfigChange={handleConfigChange}
          isExpanded={expandedSteps['step3']}
          onToggle={() => toggleStep('step3')}
          colorIndex={4}
        />

        <SpecialPromosStep 
          billingConfig={billingConfig}
          onConfigChange={handleConfigChange}
          isExpanded={expandedSteps['step4']}
          onToggle={() => toggleStep('step4')}
          colorIndex={5}
        />

        <LogicRoundingStep 
          billingConfig={billingConfig}
          onConfigChange={handleConfigChange}
          expandedSteps={expandedSteps}
          onToggle={toggleStep}
          onOpenSandbox={() => setSandboxVisible(true)}
          colorIndexStart={6}
        />

        <FeeExplanationSection 
          billingConfig={billingConfig} 
          onOpenCalcModal={() => setSandboxVisible(true)}
          colorIndex={1}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center text-amber-900">
            <Calculator size={20} className="mr-2" /> {t('stake.fee_config.sandbox_modal_title', '收費試算')}
          </div>
        }
        open={sandboxVisible}
        onCancel={() => setSandboxVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSandboxVisible(false)}>{t('common.close', '關閉')}</Button>
        ]}
        width={500}
        styles={{ body: { padding: '24px', backgroundColor: '#FFFBE6' } }}
      >
        <FeeCalculationModal billingConfig={billingConfig} />
      </Modal>

      <style>{`
        .custom-table .ant-table-thead > tr > th {
          background: transparent !important;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FeeConfigTab;
