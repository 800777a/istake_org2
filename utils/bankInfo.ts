
export interface BankInfo {
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number: string;
  contact_phone?: string;
}

export const DEFAULT_BANK_INFO: BankInfo = {
  bank_name: '中華郵政',
  bank_code: '700',
  account_name: '蕭萬祥',
  account_number: '0071001 1140643',
  contact_phone: ''
};

export const getEffectiveBankInfo = (info: Partial<BankInfo> | null | undefined): BankInfo => {
  if (!info || info.account_name === '嘉義支聯會' || info.account_number === '00000000000000' || !info.account_name || !info.account_number) {
    return {
      bank_name: info?.bank_name || DEFAULT_BANK_INFO.bank_name,
      bank_code: info?.bank_code || DEFAULT_BANK_INFO.bank_code,
      account_name: DEFAULT_BANK_INFO.account_name,
      account_number: DEFAULT_BANK_INFO.account_number,
      contact_phone: info?.contact_phone || DEFAULT_BANK_INFO.contact_phone
    };
  }
  return {
    bank_name: info.bank_name || DEFAULT_BANK_INFO.bank_name,
    bank_code: info.bank_code || DEFAULT_BANK_INFO.bank_code,
    account_name: info.account_name,
    account_number: info.account_number,
    contact_phone: info.contact_phone || ''
  };
};
