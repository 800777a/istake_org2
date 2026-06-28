import { 
    collection, getDocs, setDoc, doc, db, COLL_TRANSLATIONS, writeBatch 
} from './firebaseConfig';

/**
 * 國際化翻譯資料結構
 */
export interface TranslationDoc {
    [lang: string]: string; // 語言代碼 (如 en, zh-TW) 為欄位名稱，值為翻譯文字
}

/**
 * 完整翻譯資料列 (包含內碼)
 */
export interface TranslationRow extends TranslationDoc {
    string_key: string;
}

/**
 * Firestore 操作錯誤處理
 */
enum OperationType {
    GET = 'get',
    WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType,
        path
    };
    console.error(`Firestore Error [${operationType}] at ${path}:`, errInfo);
    throw new Error(JSON.stringify(errInfo));
}

/**
 * 撈取所有翻譯資料
 * @returns 翻譯資料物件，Key 為 string_key
 */
export const fetchAllTranslations = async (): Promise<Record<string, TranslationDoc>> => {
    try {
        const querySnapshot = await getDocs(collection(db, COLL_TRANSLATIONS));
        const translations: Record<string, TranslationDoc> = {};
        
        querySnapshot.forEach((doc) => {
            translations[doc.id] = doc.data() as TranslationDoc;
        });
        
        return translations;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, COLL_TRANSLATIONS);
        return {};
    }
};

/**
 * 更新或新增單筆翻譯資料
 * @param stringKey 內碼 (Document ID)
 * @param data 翻譯內容 (語言代碼: 翻譯文字)
 */
export const updateTranslation = async (stringKey: string, data: TranslationDoc): Promise<void> => {
    const docRef = doc(db, COLL_TRANSLATIONS, stringKey);
    try {
        // 使用 setDoc 並加上 merge: true，確保只覆蓋或新增指定的語言欄位
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${COLL_TRANSLATIONS}/${stringKey}`);
    }
};

/**
 * 批次更新翻譯資料 (用於 CSV 匯入)
 * @param rows 翻譯資料陣列
 */
export const batchUpdateTranslations = async (rows: TranslationRow[]): Promise<void> => {
    const batch = writeBatch(db);
    
    rows.forEach(row => {
        const { string_key, ...data } = row;
        const docRef = doc(db, COLL_TRANSLATIONS, string_key);
        // 使用 setDoc 並加上 merge: true，確保只覆蓋或新增指定的語言欄位
        batch.set(docRef, data, { merge: true });
    });
    
    try {
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, COLL_TRANSLATIONS);
    }
};
