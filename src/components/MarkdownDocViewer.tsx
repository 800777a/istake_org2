import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../contexts/LanguageContext';

interface MarkdownDocViewerProps {
    titleKey: string;
    docIdKey: string;
    defaultDocId?: string;
}

const MarkdownDocViewer: React.FC<MarkdownDocViewerProps> = ({ titleKey, docIdKey, defaultDocId }) => {
    const { t, tString, currentLang } = useI18n();
    const [content, setContent] = useState('');
    const docId = tString(docIdKey, defaultDocId || docIdKey);

    useEffect(() => {
        // 使用相對路徑匹配 src/docs 下的 md 檔案
        const modules = import.meta.glob('../docs/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
        
        // 嘗試多種路徑，考慮語言後綴
        const langSuffix = currentLang.startsWith('zh') ? 'zh' : 'en';
        const pathsToTry = [
            `../docs/${docId}.md`,
            `../docs/${docId}_${langSuffix}.md`
        ];

        let foundPath = pathsToTry.find(p => modules[p]);

        if (foundPath) {
            modules[foundPath]()
                .then((rawContent) => {
                    setContent(rawContent);
                })
                .catch((err) => {
                    console.error('Failed to load markdown:', err);
                    setContent('Error loading content.');
                });
        } else {
            console.warn(`Markdown file not found for docId: ${docId}, tried:`, pathsToTry);
            setContent('Content not found.');
        }
    }, [docId, currentLang]);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">{t(titleKey)}</h1>
            <div className="prose prose-blue max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownDocViewer;
