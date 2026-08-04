import React from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Row, Col, Typography, Input } from 'antd';

const { Text } = Typography;

interface BankInfo {
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number: string;
}

interface BankInputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}

const BankInputField: React.FC<BankInputFieldProps> = ({ label, value, onChange, id }) => (
  <Row align="middle" gutter={8} className="mb-2">
    <Col span={8}><Text className="text-xs opacity-70 font-bold">{label}:</Text></Col>
    <Col span={16}>
      <Input 
        id={id}
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="hover:border-indigo-400 focus:border-indigo-600 font-bold" 
      />
    </Col>
  </Row>
);

interface BankInfoSectionProps {
  info1: BankInfo;
  info2: BankInfo;
  onChange1: (val: BankInfo) => void;
  onChange2: (val: BankInfo) => void;
}

export const BankInfoSection: React.FC<BankInfoSectionProps> = React.memo(({ 
  info1, 
  info2, 
  onChange1, 
  onChange2 
}) => {
  const { t, tString } = useI18n();
  return (
    <Row gutter={[24, 24]}>
      <Col span={24} md={12}>
        <Text strong className="block mb-4 text-xs opacity-70">{t('stake.fee_config.payment_info_1', '轉帳資訊1')}</Text>
        <div className="bg-white/40 p-4 rounded border border-white/60 shadow-sm">
          <BankInputField id="bank1_name" label={tString('stake.fee_config.bank_label', '銀行')} value={info1.bank_name} onChange={v => onChange1({ ...info1, bank_name: v })} />
          <BankInputField id="bank1_code" label={tString('stake.fee_config.bank_code_label', '代碼')} value={info1.bank_code} onChange={v => onChange1({ ...info1, bank_code: v })} />
          <BankInputField id="bank1_accname" label={tString('stake.fee_config.account_name_label', '戶名')} value={info1.account_name} onChange={v => onChange1({ ...info1, account_name: v })} />
          <BankInputField id="bank1_accnum" label={tString('stake.fee_config.account_number_label', '帳號')} value={info1.account_number} onChange={v => onChange1({ ...info1, account_number: v })} />
        </div>
      </Col>
      <Col span={24} md={12}>
        <Text strong className="block mb-4 text-xs opacity-70">{t('stake.fee_config.payment_info_2', '轉帳資訊2')}</Text>
        <div className="bg-white/40 p-4 rounded border border-white/60 shadow-sm">
          <BankInputField id="bank2_name" label={tString('stake.fee_config.bank_label', '銀行')} value={info2.bank_name} onChange={v => onChange2({ ...info2, bank_name: v })} />
          <BankInputField id="bank2_code" label={tString('stake.fee_config.bank_code_label', '代碼')} value={info2.bank_code} onChange={v => onChange2({ ...info2, bank_code: v })} />
          <BankInputField id="bank2_accname" label={tString('stake.fee_config.account_name_label', '戶名')} value={info2.account_name} onChange={v => onChange2({ ...info2, account_name: v })} />
          <BankInputField id="bank2_accnum" label={tString('stake.fee_config.account_number_label', '帳號')} value={info2.account_number} onChange={v => onChange2({ ...info2, account_number: v })} />
        </div>
      </Col>
    </Row>
  );
});
