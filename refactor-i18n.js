const fs = require('fs');
const path = require('path');

/**
 * i18n 自動化遷移腳本 (Refactor-i18n)
 * 技術棧：Node.js + Regex
 */

// --- 配置區 ---
const TARGET_DIRS = ['pages', 'components', 'App.tsx']; // 要掃描的目錄或檔案
const CONTEXT_PATH = '/src/contexts/LanguageContext'; // LanguageContext 的絕對參考路徑 (相對於根目錄)
const EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

// --- 邏輯區 ---

function getRelativePath(fromFile, targetPath) {
    const fromDir = path.dirname(path.resolve(fromFile));
    const targetAbsPath = path.resolve(process.cwd() + targetPath);
    let rel = path.relative(fromDir, targetAbsPath);
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel.replace(/\\/g, '/'); // 統一使用斜線
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanged = false;

    // 1. 檢查是否包含舊版 useTranslation，若無則跳過
    if (!content.includes('useTranslation')) return;

    console.log(`\x1b[36m[處理中]\x1b[0m ${filePath}`);

    // 2. 替換 Import 邏輯
    // 移除舊的: import { useTranslation } from 'react-i18next';
    const oldImportRegex = /import\s+\{\s*useTranslation\s*\}\s+from\s+['"]react-i18next['"];?/g;
    if (oldImportRegex.test(content)) {
        const relPath = getRelativePath(filePath, CONTEXT_PATH);
        const newImport = `import { useI18n } from '${relPath}';`;
        content = content.replace(oldImportRegex, newImport);
        hasChanged = true;
    }

    // 3. 替換 Hook 宣告
    // 尋找 const { t } = useTranslation(); 
    // 換成 const { t, tString } = useI18n();
    const oldHookRegex = /const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);?/g;
    if (oldHookRegex.test(content)) {
        content = content.replace(oldHookRegex, 'const { t, tString } = useI18n();');
        hasChanged = true;
    }

    // 4. 智慧屬性替換 (Attributes Regex)
    // 偵測 placeholder={t('...')} 或 title={t('...')} 等屬性
    // 將內部的 t(...) 換成 tString(...)
    const attrRegex = /(placeholder|title|alt|label|msg|labelText|value)\s*=\s*\{\s*t\s*\(\s*(['"])(.*?)\2\s*\)\s*\}/g;
    if (attrRegex.test(content)) {
        content = content.replace(attrRegex, (match, attr, quote, key) => {
            console.log(`  └─ \x1b[33m[屬性修正]\x1b[0m ${attr}={tString('${key}')}`);
            return `${attr}={tString(${quote}${key}${quote})}`;
        });
        hasChanged = true;
    }

    // 5. 存檔
    if (hasChanged) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`\x1b[32m[完成]\x1b[0m ${filePath} 已重構完成。\n`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walkDir(fullPath);
            }
        } else if (EXTENSIONS.includes(path.extname(fullPath))) {
            processFile(fullPath);
        }
    });
}

// --- 執行 ---
console.log('\x1b[1m\x1b[35m=== i18n 系統自動化重構開始 ===\x1b[0m\n');

TARGET_DIRS.forEach(target => {
    const targetPath = path.resolve(target);
    if (fs.existsSync(targetPath)) {
        if (fs.statSync(targetPath).isDirectory()) {
            walkDir(target);
        } else {
            processFile(target);
        }
    }
});

console.log('\x1b[1m\x1b[32m\n✅ 所有符合條件的檔案已處理完畢。\x1b[0m');
