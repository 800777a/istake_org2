import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GlobalSettings, 
  IdentityType, 
  EventData, 
  BillingEngineConfig, 
  UnitConfig, 
  PricingValue, 
  TripType,
  SpecialPromoRule
} from '../../types';
import { 
  saveSettings, 
} from '../../services/sheetService';
import { 
  Tabs, 
  Row, 
  Col, 
  Button, 
  Input, 
  Space, 
  Typography, 
  Modal, 
  message, 
  Divider, 
} from 'antd';
import { 
  CalculatorOutlined, 
  SafetyOutlined, 
  GlobalOutlined, 
  CreditCardOutlined,
  SaveOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';

// Modular components
import { RainbowCard } from './fee-config/RainbowCard';
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
  const { t } = useTranslation();
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    'payment_info': true,
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
  const [bankInfoDraft, setBankInfoDraft] = useState(initialSettings.bank_info || { bank_name: '', bank_code: '', account_name: '', account_number: '' });
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
    units: settings.units.map(u => ({ shortName: u, fullName: u })),
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
      setBankInfoDraft(initialSettings.bank_info || { bank_name: '', bank_code: '', account_name: '', account_number: '' });
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

  return (
    <div className="animate-fade-in">
      <div 
        className="flex justify-between items-center mb-4 p-4 bg-white/60 rounded-xl cursor-pointer border border-white/80 shadow-sm hover:bg-white/80 transition-all"
        onClick={() => setIsMainHeaderExpanded(!isMainHeaderExpanded)}
      >
        <Title level={4} className="mb-0 flex items-center">
          <GlobalOutlined className="mr-3 text-indigo-600" /> {t('stake.fee_config.title', '收費設定 / Fee Config')}
        </Title>
        {isMainHeaderExpanded ? <UpOutlined /> : <DownOutlined />}
      </div>

      {isMainHeaderExpanded && (
        <div className="mb-6 animate-fade-in">
          <Row justify="end" gutter={8}>
            <Col>
               <Button 
                type="primary" 
                icon={<CalculatorOutlined />} 
                onClick={() => setSandboxVisible(true)}
                className="bg-amber-500 border-amber-600 hover:bg-amber-600"
              >
                {t('stake.fee_config.sandbox_btn', '收費試算 / Sandbox')}
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {isMainHeaderExpanded && (
        <>
          <RainbowCard
        title={t('stake.fee_config.payment_info_title', '付款資訊 (Payment Info)')}
        icon={<CreditCardOutlined />}
        colorIndex={0}
        isExpanded={expandedSteps['payment_info']}
        onToggle={() => toggleStep('payment_info')}
        extra={
          !isVerifying ? (
            <Button 
              size="small" 
              type="primary" 
              icon={<SafetyOutlined />}
              onClick={sendOTP}
              className="bg-indigo-600 border-indigo-700"
            >
              {t('stake.fee_config.edit_payment_btn', '修改付款資訊 (OTP 驗證)')}
            </Button>
          ) : (
            <Space>
              <Input 
                placeholder={t('common.verification_code', '驗證碼')} 
                size="small" 
                className="w-24"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
              />
              <Button size="small" type="primary" onClick={verifyOTP}>{t('common.verify_and_save', '驗證並儲存')}</Button>
              <Text type="danger" className="text-[10px]">{t('common.remaining', '剩餘')} {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</Text>
            </Space>
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

      <Divider>{t('stake.fee_config.billing_rules_divider', '收費邏輯配置 (Billing Rules)')}</Divider>

      <UnitFeesStep 
        billingConfig={billingConfig}
        onConfigChange={handleConfigChange}
        isExpanded={expandedSteps['step1']}
        onToggle={() => toggleStep('step1')}
      />

      <ModifierStep 
        type="identity"
        billingConfig={billingConfig}
        onConfigChange={handleConfigChange}
        isExpanded={expandedSteps['step2']}
        onToggle={() => toggleStep('step2')}
      />

      <ModifierStep 
        type="trip"
        billingConfig={billingConfig}
        onConfigChange={handleConfigChange}
        isExpanded={expandedSteps['step3']}
        onToggle={() => toggleStep('step3')}
      />

      <SpecialPromosStep 
        billingConfig={billingConfig}
        onConfigChange={handleConfigChange}
        isExpanded={expandedSteps['step4']}
        onToggle={() => toggleStep('step4')}
      />

      <LogicRoundingStep 
        billingConfig={billingConfig}
        onConfigChange={handleConfigChange}
        expandedSteps={expandedSteps}
        onToggle={toggleStep}
        onOpenSandbox={() => setSandboxVisible(true)}
      />

      <Row className="mt-6">
        <Col span={24}>
          <FeeExplanationSection 
            billingConfig={billingConfig} 
            onOpenCalcModal={() => setSandboxVisible(true)}
          />
        </Col>
      </Row>

      <Modal
        title={
          <div className="flex items-center text-amber-900">
            <CalculatorOutlined className="mr-2" /> {t('stake.fee_config.sandbox_modal_title', '收費試算 (Fee Calculation Sandbox)')}
          </div>
        }
        open={sandboxVisible}
        onCancel={() => setSandboxVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSandboxVisible(false)}>{t('common.close', '關閉 (Close)')}</Button>
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
        </>
      )}
    </div>
  );
};

export default FeeConfigTab;
