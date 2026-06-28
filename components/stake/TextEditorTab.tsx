import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Copy, Trash2, Save, FileEdit, Grab, ChevronDown, ChevronUp, CheckCircle, ClipboardPaste, ShieldAlert } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { useTranslation } from 'react-i18next';

interface TextEditorTabProps {
    content: string;
    onContentChange: (content: string) => void;
    content2: string;
    onContentChange2: (content: string) => void;
}

interface EditorBlockProps {
    title: string;
    content: string;
    onChange: (content: string) => void;
    accentColor: string;
}

const EditorBlock: React.FC<EditorBlockProps> = ({ title, content, onChange, accentColor }) => {
    const { t } = useTranslation();
    const quillRef = useRef<ReactQuill>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2000);
    };

    const handleSelectAll = () => {
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            quill.setSelection(0, quill.getLength());
        }
    };

    const handleCopy = () => {
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const text = quill.getText();
            navigator.clipboard.writeText(text).then(() => {
                showToast(t('editor.toast.copied', '已複製到剪貼簿'));
            }).catch(() => {
                // Fallback for sandboxes that block clipboard API
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                showToast(t('editor.toast.copied', '已複製到剪貼簿'));
            });
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (quillRef.current) {
                const quill = quillRef.current.getEditor();
                const range = quill.getSelection();
                if (range) {
                    quill.insertText(range.index, text);
                } else {
                    quill.insertText(quill.getLength() - 1, text);
                }
                showToast(t('editor.toast.pasted', '已貼上內容'));
            }
        } catch (err) {
            showToast(t('editor.toast.paste_failed', '無法存取剪貼簿，請使用快捷鍵 Ctrl+V'));
        }
    };

    const handleDelete = () => {
        onChange('');
        setShowDeleteConfirm(false);
        showToast(t('editor.toast.cleared', '已清空內容'));
    };

    const handleSave = () => {
        localStorage.setItem(`temp_doc_${title}`, content);
        showToast(t('editor.toast.saved_cache', '內容已儲存到本地快取'));
    };

    // V410: Efficiency warning
    const isOverLimit = content.length > 50000;

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'color', 'background'],
            ['clean']
        ],
    };

    return (
        <div className={`bg-white rounded-[32px] shadow-xl border-2 border-gray-100 flex flex-col overflow-hidden transition-all duration-300 relative ${isExpanded ? 'flex-1 min-h-[600px]' : 'h-24'}`}>
            {toastMsg && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center shadow-lg animate-fade-in">
                    <CheckCircle size={14} className="mr-2 text-green-400" />
                    {toastMsg}
                </div>
            )}

            <ConfirmDialog 
                isOpen={showDeleteConfirm}
                title={t('common.confirm.clear_title', '清空確認')}
                message={t('editor.msg.delete_confirm', { title: title, defaultValue: `確定要刪除「${title}」的所有內容嗎？此動作無法復原。` })}
                confirmText={t('common.confirm.clear_btn', '確定清空')}
                cancelText={t('common.cancel', '取消')}
                isDangerous={true}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {/* Row 1: Title & Toggle */}
            <div 
                className={`px-8 py-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors border-b-2 border-gray-50`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center text-white mr-4 shadow-lg`}>
                        <FileEdit size={22} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
                </div>
                <div className="text-gray-400">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col flex-1 p-6 animate-fade-in">
                    {/* Efficiency Warning */}
                    {isOverLimit && (
                        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 animate-pulse">
                            <ShieldAlert size={20} className="flex-shrink-0" />
                            <div className="text-xs font-black">
                                <p>{t('editor.warn.content_too_long', '警示：目前文字內容過長（超過 50,000 字元）。')}</p>
                                <p>{t('editor.warn.efficiency_hint', '這可能會拖慢程式執行效率，建議將內容分段存放於「文字編輯1」與「文字編輯2」中。')}</p>
                            </div>
                        </div>
                    )}

                    {/* Row 2: Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button 
                            onClick={handleSelectAll} 
                            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm border-2 border-gray-200/50"
                        >
                            <Grab size={16} className="mr-2" /> {t('common.button.select_all', '全選')}
                        </button>
                        <button 
                            onClick={handleCopy} 
                            className="flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-all text-sm border-2 border-blue-100"
                        >
                            <Copy size={16} className="mr-2" /> {t('common.button.copy', '複製')}
                        </button>
                        <button 
                            onClick={handlePaste} 
                            className="flex items-center px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-all text-sm border-2 border-indigo-100"
                        >
                            <ClipboardPaste size={16} className="mr-2" /> {t('common.button.paste', '貼上')}
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(true)} 
                            className="flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold transition-all text-sm border-2 border-red-100"
                        >
                            <Trash2 size={16} className="mr-2" /> {t('common.button.delete', '刪除')}
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex items-center px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black transition-all shadow-lg shadow-green-100 ml-auto"
                        >
                            <Save size={16} className="mr-2" /> {t('common.button.save', '儲存')}
                        </button>
                    </div>

                    <div className="flex-1 border-2 border-gray-100 rounded-2xl overflow-hidden flex flex-col bg-gray-50/50">
                        <ReactQuill 
                            theme="snow"
                            ref={quillRef}
                            value={content}
                            onChange={onChange}
                            modules={modules}
                            className="h-full flex-1 bg-white"
                            placeholder={t('editor.placeholder.enter_text', '請輸入文字或從其他頁面匯入內容...')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


const TextEditorTab: React.FC<TextEditorTabProps> = ({ content, onContentChange, content2, onContentChange2 }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 md:p-8 flex flex-col lg:flex-row gap-6 min-h-screen bg-gray-50/30">
            <EditorBlock 
                title={t('editor.title.editor1', '文字編輯1')} 
                content={content} 
                onChange={onContentChange}
                accentColor="bg-indigo-500"
            />
            <EditorBlock 
                title={t('editor.title.editor2', '文字編輯2')} 
                content={content2} 
                onChange={onContentChange2}
                accentColor="bg-violet-500"
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .ql-container {
                    font-size: 16px;
                    border: none !important;
                    min-height: 400px;
                }
                .ql-toolbar {
                    border: none !important;
                    border-bottom: 2px solid #f3f4f6 !important;
                    background: #f9fafb;
                    padding: 8px !important;
                }
                .ql-editor {
                    min-height: 400px;
                    padding: 20px !important;
                    line-height: 1.8;
                }
                .ql-editor.ql-blank::before {
                    left: 20px !important;
                    font-weight: 600;
                    color: #9ca3af;
                }
            ` }} />
        </div>
    );
};

export default TextEditorTab;
