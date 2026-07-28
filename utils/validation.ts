
import { IdentityType } from '../types';

// 身分證字號開頭字母對應數值表 (A=10, B=11... 依縣市代碼)
const idLetterMap: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, J: 18, K: 19, L: 20, M: 21,
  N: 22, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, X: 30, Y: 31, W: 32, Z: 33,
  I: 34, O: 35
};

/**
 * 驗證台灣身分證字號 (含檢查碼邏輯)
 * 規則:
 * 1. 長度 10 碼
 * 2. 第一碼為英文字母，後九碼為數字
 * 3. 檢查碼邏輯:
 *    - 將英文字母轉換為兩位數字 (例如 A -> 1, 0)
 *    - 各數字乘以對應權重:
 *      L1(1), L2(9), D1(8), D2(7), D3(6), D4(5), D5(4), D6(3), D7(2), D8(1), D9(1)
 *    - 加總 S
 *    - 檢查碼 = 10 - (S % 10) (若餘數為 0 則檢查碼為 0)
 *    - 比對最後一碼
 */
export const validateIdentityId = (id: string): boolean => {
  const cleanId = id.trim().toUpperCase();

  // 基本格式: 1英 + 9數
  if (!/^[A-Z][1-2]\d{8}$/.test(cleanId)) {
    // 若不符合身分證，檢查是否為居留證 (簡單格式檢查: 1碼英文+1碼英文/數字+8碼數字)
    // 這裡保留舊有的居留證寬鬆檢查，主要針對本國身分證做嚴格驗證
    const arcRegex = /^[A-Z]{1,2}\d{8,9}$/;
    if (cleanId.length === 10 && arcRegex.test(cleanId)) return true;
    return false;
  }

  // 取得首字母對應數值
  const firstLetter = cleanId.charAt(0);
  const letterCode = idLetterMap[firstLetter];
  
  if (letterCode === undefined) return false;

  // 將字母轉為兩個數字: X1, X2
  const x1 = Math.floor(letterCode / 10);
  const x2 = letterCode % 10;

  // 取得後續 9 個數字
  const d = cleanId.slice(1).split('').map(Number);

  // 計算加權總和 S
  // 權重: X1(1), X2(9), D1(8), D2(7), D3(6), D4(5), D5(4), D6(3), D7(2), D8(1)
  // 注意：最後一碼是檢查碼，這裡先不算入 D9，或是算法不同
  // 常見算法: (X1*1 + X2*9 + D1*8 + D2*7 + ... + D8*1) % 10 = R
  // 檢查碼 D9 = (10 - R) % 10
  
  const sum = 
    x1 * 1 + 
    x2 * 9 + 
    d[0] * 8 + 
    d[1] * 7 + 
    d[2] * 6 + 
    d[3] * 5 + 
    d[4] * 4 + 
    d[5] * 3 + 
    d[6] * 2 + 
    d[7] * 1;

  const remainder = sum % 10;
  const checkCode = (10 - remainder) % 10;
  
  // 比對最後一碼
  return checkCode === d[8];
};

/**
 * 驗證姓名
 * 規則:
 * 1. 中文姓名: 不超過 5 個字，不可夾雜英文、數字、符號 (純中文)
 * 2. 英文姓名: 不超過 3 個字串 (以空白分隔)，不可夾雜中文、數字、符號 (除了 "." 號)
 */
export const validateNameFormat = (name: string): { isValid: boolean; isEnglish: boolean; error?: string } => {
  const cleanName = name.trim();
  if (!cleanName) return { isValid: false, isEnglish: false, error: '姓名不能為空' };

  // 檢查是否只包含 "." (無論幾個)
  if (/^[\.]+$/.test(cleanName)) {
      return { isValid: false, isEnglish: false, error: '姓名不能僅包含 "." 號' };
  }

  // 判斷是否包含中文字
  const hasChinese = /[\u4e00-\u9fa5]/.test(cleanName);

  if (hasChinese) {
    // 中文規則: 純中文，長度 2-5 (通常至少2個字)
    // Regex: ^[\u4e00-\u9fa5]{2,5}$
    if (!/^[\u4e00-\u9fa5]+$/.test(cleanName)) {
      return { isValid: false, isEnglish: false, error: '中文姓名不可夾雜英文、數字或符號' };
    }
    if (cleanName.length > 5) {
      return { isValid: false, isEnglish: false, error: '中文姓名不可超過 5 個字' };
    }
    // V134: 中文姓名不可僅有一個中文字
    if (cleanName.length < 2) {
        return { isValid: false, isEnglish: false, error: '中文姓名至少需包含兩個字' };
    }
    return { isValid: true, isEnglish: false };
  } else {
    // 英文規則: 允許 a-z, A-Z, 空白, .
    // 檢查非法字元 (數字、其他符號)
    if (/[^a-zA-Z\s.]/.test(cleanName)) {
      return { isValid: false, isEnglish: true, error: '英文姓名不可包含數字或特殊符號 (僅允許 ".")' };
    }
    
    // 檢查字串數量 (以空白分隔)
    const parts = cleanName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length > 3) {
      return { isValid: false, isEnglish: true, error: '英文姓名不可超過 3 個單字' };
    }
    if (parts.length === 0) {
        return { isValid: false, isEnglish: true, error: '請輸入姓名' };
    }
    
    return { isValid: true, isEnglish: true };
  }
};

export const calculateAge = (birthDate: string, eventDate: string): number => {
  const birth = new Date(birthDate);
  const event = new Date(eventDate);
  
  let age = event.getFullYear() - birth.getFullYear();
  const monthDiff = event.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && event.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const determineAgeGroup = (age: number): IdentityType | null => {
  if (age < 0 || age >= 120) return null; // 不合理
  if (age <= 2) return IdentityType.INFANT;
  if (age <= 17) return IdentityType.YOUTH;
  return IdentityType.ADULT;
};

export const formatDate = (dateString: string): string => {
  return dateString; // 若需要格式化可在此處理
};

export const maskName = (name: string) => {
  if (!name) return '';
  const cleanName = name.trim();
  
  // 判斷是否包含中文字
  const hasChinese = /[\u4e00-\u9fa5]/.test(cleanName);

  if (hasChinese) {
    if (cleanName.length <= 1) return cleanName;
    if (cleanName.length === 2) return cleanName[0] + 'Ｏ';
    // For 3 or more characters, replace middle characters with O
    const first = cleanName[0];
    const last = cleanName[cleanName.length - 1];
    const middle = 'Ｏ'.repeat(cleanName.length - 2);
    return first + middle + last;
  } else {
    // 英文姓名規則: 顯示第一個單字，其餘單字 (中間名、姓氏) 各用一個 "Ｏ" 代替
    const parts = cleanName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length <= 1) return cleanName;
    
    const firstName = parts[0];
    const restMasked = parts.slice(1).map(() => 'Ｏ');
    return [firstName, ...restMasked].join(' ');
  }
};

/**
 * 從身分證字號或居留證號碼判斷性別
 * - 本國身分證/舊式居留證：第 2 碼為 '1' 代表男性，'2' 代表女性
 * - 新式外來人口統一證號：第 2 碼為 '8' 代表男性，'9' 代表女性
 */
export const getGenderFromId = (idx: string): '1' | '2' | '0' => {
  if (!idx || idx.length < 2) return '0';
  const genderChar = idx.charAt(1);
  if (genderChar === '1' || genderChar === '8') return '1';
  if (genderChar === '2' || genderChar === '9') return '2';
  return '0';
};
