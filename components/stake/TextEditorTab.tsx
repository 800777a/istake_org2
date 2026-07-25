import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Copy, Trash2, Save, FileEdit, Grab, ChevronDown, ChevronUp, CheckCircle, ClipboardPaste, ShieldAlert } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { useI18n } from '../../src/contexts/LanguageContext';

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
}

const EditorBlock: React.FC<EditorBlockProps> = ({ title, content, onChange }) => {
    const { t, tString } = useI18n();
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
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden transition-all duration-500 ease-in-out relative ${isExpanded ? 'flex-1 min-h-[600px]' : 'h-20'}`}>
            {toastMsg && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-bold flex items-center shadow-2xl animate-fade-in border border-slate-700">
                    <CheckCircle size={14} className="mr-2 text-emerald-400" />
                    {toastMsg}
                </div>
            )}

            <ConfirmDialog 
                isOpen={showDeleteConfirm}
                title={tString('common.confirm.clear_title', '清空確認')}
                message={t('editor.msg.delete_confirm', { title: title, defaultValue: `確定要刪除「${title}」的所有內容嗎？此動作無法復原。` })}
                confirmText={t('common.confirm.clear_btn', '確定清空')}
                cancelText={t('common.cancel', '取消')}
                isDangerous={true}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {/* Header Area */}
            <div 
                className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 rounded-lg">
                        <FileEdit size={20} className="text-sky-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Document Editor</p>
                    </div>
                </div>
                <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col flex-1 p-6 animate-fade-in gap-6">
                    {/* Warning Zone */}
                    {isOverLimit && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-4 text-rose-800">
                            <div className="p-2 bg-rose-100 rounded-full shrink-0">
                                <ShieldAlert size={20} />
                            </div>
                            <div className="text-xs">
                                <p className="font-bold mb-0.5">{t('editor.warn.content_too_long', '警示：目前文字內容過長（超過 50,000 字元）。')}</p>
                                <p className="opacity-80 leading-relaxed">{t('editor.warn.efficiency_hint', '這可能會拖慢程式執行效率，建議將內容分段存放於「文字編輯1」與「文字編輯2」中。')}</p>
                            </div>
                        </div>
                    )}

                    {/* Toolbar / Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={handleSelectAll} 
                                className="flex items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md font-bold transition-all text-xs border border-slate-200"
                            >
                                <Grab size={14} className="mr-2" /> {t('common.button.select_all', '全選')}
                            </button>
                            <button 
                                onClick={handleCopy} 
                                className="flex items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md font-bold transition-all text-xs border border-slate-200"
                            >
                                <Copy size={14} className="mr-2" /> {t('common.button.copy', '複製')}
                            </button>
                            <button 
                                onClick={handlePaste} 
                                className="flex items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md font-bold transition-all text-xs border border-slate-200"
                            >
                                <ClipboardPaste size={14} className="mr-2" /> {t('common.button.paste', '貼上')}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(true)} 
                                className="flex items-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold transition-all text-xs border border-rose-100"
                            >
                                <Trash2 size={14} className="mr-2" /> {t('common.button.delete', '清空')}
                            </button>
                        </div>
                        
                        <button 
                            onClick={handleSave} 
                            className="flex items-center px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-bold transition-all shadow-sm text-xs ml-auto"
                        >
                            <Save size={14} className="mr-2" /> {t('common.button.save', '本地存檔')}
                        </button>
                    </div>

                    {/* Editor Zone */}
                    <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white">
                        <ReactQuill 
                            theme="snow"
                            ref={quillRef}
                            value={content}
                            onChange={onChange}
                            modules={modules}
                            className="h-full flex-1"
                            placeholder={tString('editor.placeholder.enter_text', '請輸入文字或從其他頁面匯入內容...')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


const TextEditorTab: React.FC<TextEditorTabProps> = ({ content, onContentChange, content2, onContentChange2 }) => {
    const { tString } = useI18n();
    return (
        <div className="p-6 md:p-8 flex flex-col xl:flex-row gap-8 min-h-screen bg-slate-50/50">
            <EditorBlock 
                title={tString('editor.title.editor1', '文字編輯 1')} 
                content={content} 
                onChange={onContentChange}
            />
            <EditorBlock 
                title={tString('editor.title.editor2', '文字編輯 2')} 
                content={content2} 
                onChange={onContentChange2}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .ql-container {
                    font-size: 15px;
                    border: none !important;
                    min-height: 450px;
                    font-family: ui-sans-serif, system-ui, sans-serif;
                }
                .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    background: #f8fafc;
                    padding: 10px 15px !important;
                }
                .ql-editor {
                    min-height: 450px;
                    padding: 24px 30px !important;
                    line-height: 1.8;
                    color: #334155;
                }
                .ql-editor.ql-blank::before {
                    left: 30px !important;
                    font-weight: 500;
                    color: #94a3b8;
                    font-style: normal;
                }
                .ql-snow .ql-stroke {
                    stroke: #64748b;
                }
                .ql-snow .ql-fill {
                    fill: #64748b;
                }
                .ql-snow .ql-picker {
                    color: #64748b;
                    font-weight: 600;
                }
            ` }} />
        </div>
    );
};

export default TextEditorTab;
