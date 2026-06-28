import Papa from 'papaparse';
import { TranslationRow } from './translationService';

/**
 * CSV 處理服務
 */
export const csvService = {
  /**
   * 將翻譯資料匯出為 CSV 並下載
   * @param data 翻譯資料陣列
   * @param fileName 檔案名稱
   */
  exportToCsv: (data: TranslationRow[], fileName: string = 'translations.csv') => {
    if (!data.length) return;

    // 使用 PapaParse 轉換為 CSV 字串
    const csv = Papa.unparse(data);

    // 加入 BOM 標頭防止 Excel 開啟時亂碼
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * 解析上傳的 CSV 檔案
   * @param file CSV 檔案物件
   * @returns 解析後的翻譯資料陣列
   */
  parseCsv: (file: File): Promise<TranslationRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as TranslationRow[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
};
