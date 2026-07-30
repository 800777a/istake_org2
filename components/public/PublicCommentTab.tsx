import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comment, EventData, User, GlobalSettings } from '../../types';
import { 
    subscribeToAllComments, addComment, markCommentAsSpam, getCurrentUser, deleteCommentByAdmin 
} from '../../services/sheetService';
import { translateComment } from '../../services/aiService';
import { 
    MessageSquare, Send, AlertTriangle, Clock, ChevronDown, ChevronUp, 
    HeartHandshake, Trash2, Plus, Search, Filter, Globe 
} from 'lucide-react';

import Toast, { ToastType } from '../Toast';

import { useI18n } from '../../src/contexts/LanguageContext';

interface PublicCommentTabProps {
    activeEvent: EventData;
    settings: GlobalSettings;
}

const rainbowThemes = [
    { border: 'border-red-200', title: 'bg-red-200', header: 'bg-red-100', content: 'bg-red-50', accent: 'text-red-900' },
    { border: 'border-orange-200', title: 'bg-orange-200', header: 'bg-orange-100', content: 'bg-orange-50', accent: 'text-orange-900' },
    { border: 'border-amber-200', title: 'bg-amber-200', header: 'bg-amber-100', content: 'bg-amber-50', accent: 'text-amber-950' },
    { border: 'border-emerald-200', title: 'bg-emerald-200', header: 'bg-emerald-100', content: 'bg-emerald-50', accent: 'text-emerald-900' },
    { border: 'border-blue-200', title: 'bg-blue-200', header: 'bg-blue-100', content: 'bg-blue-50', accent: 'text-blue-900' },
    { border: 'border-indigo-200', title: 'bg-indigo-200', header: 'bg-indigo-100', content: 'bg-indigo-50', accent: 'text-indigo-900' },
    { border: 'border-purple-200', title: 'bg-purple-200', header: 'bg-purple-100', content: 'bg-purple-50', accent: 'text-purple-900' },
];

const SectionWrapper: React.FC<{ 
    id: string,
    title: string, 
    icon: React.ReactNode, 
    children: React.ReactNode,
    colorIndex: number
}> = ({ id, title, icon, children, colorIndex }) => {
    const theme = rainbowThemes[colorIndex % rainbowThemes.length];
    const [isExpanded, setIsExpanded] = useState(true);
    
    return (
        <div id={id} className={`rounded border-2 ${theme.border} overflow-hidden bg-white transition-all duration-300 mt-1 min-w-0 w-full`}>
            <div 
                className={`w-full flex items-center justify-between p-1 ${theme.title} cursor-pointer hover:opacity-90 transition-all border-b ${theme.border} select-none group`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded border shadow-sm bg-white/50 w-8 h-8 flex shrink-0 items-center justify-center ${theme.accent}`}>
                        {icon}
                    </div>
                    <h3 className={`text-sm md:text-base font-bold tracking-tight leading-none truncate uppercase ${theme.accent}`}>{title}</h3>
                </div>
                <div className="text-slate-500 shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>
            
            <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className={`p-4 ${theme.content} min-w-0 w-full`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const PublicCommentTab: React.FC<PublicCommentTabProps> = ({ activeEvent, settings }) => {
    const { t, tString, currentLang } = useI18n();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [authorUnit, setAuthorUnit] = useState('');
    const [category, setCategory] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('info');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [cooldown, setCooldown] = useState(0);
    const [confirmingState, setConfirmingState] = useState<{id: string, type: 'spam' | 'delete'} | null>(null);

    const [searchCategory, setSearchCategory] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const unitOptions = settings.billingConfig?.units?.map(u => u.shortName) || settings.units || [];

    const currentUser = getCurrentUser();
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const maskName = (name: string) => {
        if (currentUser) return name;
        const memberLabel = tString('member_label', '成員');
        if (!name || name === memberLabel || name === 'Member') return name;
        const trimmed = name.trim();
        if (trimmed.length <= 1) return trimmed;
        if (trimmed.length === 2) return trimmed[0] + 'Ｏ';
        return trimmed[0] + 'Ｏ'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
    };

    useEffect(() => {
        const unsub = subscribeToAllComments((list) => {
            setComments(list);
        });

        const user = getCurrentUser();
        if (user) {
            if (user.name) setAuthorName(user.name);
            if (user.unit) setAuthorUnit(user.unit);
        }

        return () => unsub();
    }, []);

    useEffect(() => {
        let timer: any;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
        e.preventDefault();
        const content = parentId ? replyContent : newComment;
        const name = authorName.trim() || tString('common.member', '成員');

        if (!content.trim()) return;
        if (cooldown > 0) return;

        setIsSubmitting(true);
        try {
            // 自動翻譯留言內容
            let contentEn = '';
            try {
                contentEn = await translateComment(content.trim());
            } catch (err) {
                console.error("Auto translation failed", err);
            }

            await addComment(activeEvent.event_id, {
                author_name: name,
                author_unit: parentId ? undefined : (authorUnit || undefined),
                category: parentId ? undefined : (category || tString('common.other', '其他')),
                content: content.trim(),
                content_en: contentEn || undefined,
                is_admin_reply: !!currentUser,
                parent_id: parentId
            });

            if (parentId) {
                setReplyTo(null);
                setReplyContent('');
            } else {
                setNewComment('');
                setCategory('');
            }
            setMsg(t('common.msg.post_success', '發表成功！'));
            setMsgType('success');
            setCooldown(10);
        } catch (error) {
            setMsg(t('common.msg.post_failed', '發表失敗，請稍後再試'));
            setMsgType('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkSpam = async (id: string) => {
        if (confirmingState?.id === id && confirmingState?.type === 'spam') {
            try {
                await markCommentAsSpam(id);
                setMsg(t('已標記為垃圾留言', 'Marked as spam'));
                setMsgType('info');
            } catch (err) {
                setMsg(t('操作失敗', 'Action failed'));
            }
            setConfirmingState(null);
        } else {
            setConfirmingState({id, type: 'spam'});
            setTimeout(() => setConfirmingState(null), 3000);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirmingState?.id === id && confirmingState?.type === 'delete') {
            try {
                await deleteCommentByAdmin(id);
                setMsg(t('留言已刪除', 'Comment deleted'));
                setMsgType('success');
            } catch (err) {
                setMsg(t('刪除失敗', 'Delete failed'));
            }
            setConfirmingState(null);
        } else {
            setConfirmingState({id, type: 'delete'});
            setTimeout(() => setConfirmingState(null), 3000);
        }
    };

    const activeCommentsCount = useMemo(() => comments.filter(c => !c.is_spam && !c.parent_id).length, [comments]);
    
    const filteredComments = useMemo(() => {
        let result = comments.filter(c => !c.parent_id);
        
        if (searchCategory !== 'all') {
            result = result.filter(c => c.category === searchCategory);
        }
        
        if (searchKeyword.trim()) {
            const k = searchKeyword.toLowerCase();
            result = result.filter(c => 
                c.content.toLowerCase().includes(k) || 
                c.author_name.toLowerCase().includes(k) ||
                (c.author_unit && c.author_unit.toLowerCase().includes(k))
            );
        }

        return result.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
        });
    }, [comments, sortOrder, searchCategory, searchKeyword]);

    const getReplies = (parentId: string) => {
        return comments.filter(c => c.parent_id === parentId);
    };

    return (
        <div className="flex flex-col gap-1 w-full max-w-full min-w-0 bg-[#F8F9FA] p-1 font-serif">
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
            
            {/* Page Header Area - Rule 3.2 Level 1 Gradient */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 p-1 rounded shadow-sm min-w-0 w-full mb-1">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1 rounded shrink-0 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-amber-950" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-amber-950 tracking-tight leading-none font-sans truncate">
                            {tString('留言板', 'Message Board')}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Post New Comment Section */}
            <SectionWrapper
                id="post-form"
                title={t('我要留言', 'Post a comment')}
                icon={<Plus size={20} />}
                colorIndex={4} // Indigo
            >
                <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 min-w-0 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0 w-full">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-indigo-600 rounded-full shrink-0"></div>
                                {t('顯示姓名', 'NAME')}
                            </label>
                            <input 
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder={t('姓名 (預設為成員)', 'Name')}
                                className="w-full h-9 px-3 rounded border-2 border-indigo-100 bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-indigo-600 rounded-full shrink-0"></div>
                                {t('所屬單位', 'UNIT')}
                            </label>
                            <select 
                                value={authorUnit}
                                onChange={(e) => setAuthorUnit(e.target.value)}
                                className="w-full h-9 px-3 rounded border-2 border-indigo-100 bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">{tString('-- 請選擇單位 --', '-- Unit --')}</option>
                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-indigo-600 rounded-full shrink-0"></div>
                                {t('留言分類', 'CATEGORY')}
                            </label>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-9 px-3 rounded border-2 border-indigo-100 bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>{tString('請選擇分類', 'Category')}</option>
                                <option value="網站問題">網站問題</option>
                                <option value="報名問題">報名問題</option>
                                <option value="收費問題">收費問題</option>
                                <option value="行程安排">行程安排</option>
                                <option value="教儀安排">教儀安排</option>
                                <option value="特別需求">特別需求</option>
                                <option value="改善意見">改善意見</option>
                                <option value="其他問題">其他問題</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-3 bg-indigo-600 rounded-full shrink-0"></div>
                            {t('留言內容', 'CONTENT')}
                        </label>
                        <textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('在此分享您的建議或問題...', 'Message...')}
                            className="w-full min-h-[80px] p-3 rounded border-2 border-indigo-100 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1">
                        <div className="flex items-center gap-2 text-indigo-600/60 shrink-0">
                            <HeartHandshake size={16} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">{t('感謝您的建議', 'Thank you for your voice.')}</span>
                        </div>
                        <button 
                            type="submit"
                            disabled={isSubmitting || cooldown > 0 || !newComment.trim() || !category}
                            className={`w-full sm:w-auto h-9 px-8 rounded bg-indigo-600 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 min-w-0`}
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : <Send size={16} />}
                            <span className="truncate">{cooldown > 0 ? `${t('冷卻中', 'Wait')} (${cooldown}s)` : t('確認送出', 'Submit')}</span>
                        </button>
                    </div>
                </form>
            </SectionWrapper>

            {/* Action Row: Consolidated Search, Filters, Count & Sort */}
            <div className="bg-white border-2 border-slate-200 px-3 py-3 sticky top-0 z-[100] shadow-sm flex flex-col items-stretch gap-3 rounded font-sans min-w-0 w-full mt-1">
                {/* Search & Sort Row */}
                <div className="flex flex-col md:flex-row items-center gap-2 w-full min-w-0">
                    <div className="relative flex-1 min-w-0 group w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                        <input
                            type="text"
                            placeholder="搜尋留言、姓名或單位..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all truncate"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        <div className="relative flex-1 md:w-48 min-w-0 group">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500" />
                            <select
                                value={searchCategory}
                                onChange={(e) => setSearchCategory(e.target.value)}
                                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none cursor-pointer truncate"
                            >
                                <option value="all">全部分類 (All Categories)</option>
                                <option value="網站問題">網站問題</option>
                                <option value="報名問題">報名問題</option>
                                <option value="收費問題">收費問題</option>
                                <option value="行程安排">行程安排</option>
                                <option value="教儀安排">教儀安排</option>
                                <option value="特別需求">特別需求</option>
                                <option value="改善意見">改善意見</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>

                        <button 
                            onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
                            className="flex-1 md:flex-none h-10 px-4 rounded bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                        >
                            {sortOrder === 'oldest' ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronUp size={18} className="text-slate-400" />}
                            <span className="whitespace-nowrap">{sortOrder === 'oldest' ? t('舊在前', 'Old First') : t('新在前', 'New First')}</span>
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between gap-1.5 px-1 py-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">{t('留言總數', 'TOTAL')}</span>
                        <span className="text-indigo-600 font-bold text-sm">{activeCommentsCount}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">{t('則', 'comments')}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Real-time Sync Active</span>
                    </div>
                </div>
            </div>


            {/* Comment List Area */}
            <div className="space-y-1 mt-1 min-w-0 w-full">
                {filteredComments.length === 0 ? (
                    <div className="p-10 text-center text-slate-300 bg-white rounded border-2 border-dashed border-slate-200 font-bold uppercase tracking-widest text-[10px] w-full">
                        {t('目前尚無留言紀錄', 'No records found')}
                    </div>
                ) : (
                    filteredComments.map((comment, index) => {
                        const replies = getReplies(comment.id);
                        const style = rainbowThemes[index % rainbowThemes.length];

                        return (
                            <div key={comment.id} className={`rounded border-2 shadow-sm overflow-hidden transition-all bg-white ${style.border} min-w-0 w-full mt-1`}>
                                <div className={`px-2 py-1.5 ${style.header} flex justify-between items-start border-b ${style.border} min-w-0 w-full`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ${style.title}`}>
                                            {comment.author_name.slice(0, 1)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 leading-none min-w-0">
                                                {comment.author_unit && <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white shadow-sm shrink-0 ${style.accent}`}>{comment.author_unit}</span>}
                                                <span className={`font-bold text-xs tracking-tight shrink-0 ${style.accent}`}>{maskName(comment.author_name)}</span>
                                                {comment.category && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-current shadow-sm shrink-0 ${style.accent}`}>{comment.category}</span>}
                                                {comment.is_admin_reply && <span className="bg-indigo-900 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-sm tracking-tighter shrink-0">內部回覆</span>}
                                            </div>
                                            <span className="text-[8px] flex items-center gap-1 mt-1 font-bold text-slate-400 shrink-0">
                                                <Clock size={8} />
                                                {new Date(comment.created_at).toLocaleString('zh-TW', { hour12: false })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {(currentUser?.role === 'stake_admin' || currentUser?.role === 'engineer') && (
                                            <button 
                                                onClick={() => handleDelete(comment.id)}
                                                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                                    confirmingState?.id === comment.id && confirmingState?.type === 'delete'
                                                    ? 'bg-red-600 text-white' 
                                                    : 'hover:bg-red-100 text-slate-300 hover:text-red-600'
                                                }`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleMarkSpam(comment.id)}
                                            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                                confirmingState?.id === comment.id && confirmingState?.type === 'spam'
                                                ? 'bg-amber-600 text-white' 
                                                : 'hover:bg-slate-200 text-slate-300 hover:text-amber-600'
                                            }`}
                                        >
                                            <AlertTriangle size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className={`p-3 ${style.content} min-w-0 w-full`}>
                                    <div className={`text-xs ${comment.is_spam ? 'text-red-500 font-bold italic' : 'text-slate-800'} whitespace-pre-wrap leading-relaxed font-medium mb-2`}>
                                        {comment.is_spam 
                                            ? t('comment.spam_hidden', '此留言已被標記為不適當內容') 
                                            : (currentLang === 'en' && comment.content_en ? comment.content_en : comment.content)}
                                    </div>
                                    
                                    {/* 顯示原文/翻譯切換 (如果有的話) */}
                                    {!comment.is_spam && comment.content_en && (
                                        <div className="mb-2 flex items-center gap-1 text-[9px] text-slate-400 italic">
                                            <Globe size={10} />
                                            <span>{currentLang === 'en' ? 'Original: ' + comment.content : '英文翻譯: ' + comment.content_en}</span>
                                        </div>
                                    )}
                                    
                                    {!comment.is_spam && (
                                        <div className="flex justify-end items-center pt-2 border-t border-slate-200/50">
                                            <button 
                                                onClick={() => {
                                                    setReplyTo(replyTo === comment.id ? null : comment.id);
                                                    setReplyContent('');
                                                }}
                                                className={`h-7 px-4 rounded text-[9px] font-bold uppercase tracking-widest transition-all border-2 shadow-sm ${
                                                    replyTo === comment.id 
                                                    ? 'bg-slate-900 text-white border-slate-900' 
                                                    : `bg-white hover:bg-slate-50 text-indigo-700 border-indigo-100`
                                                }`}
                                            >
                                                {replyTo === comment.id ? t('取消', 'Cancel') : t('回覆', 'Reply')}
                                            </button>
                                        </div>
                                    )}

                                    {replyTo === comment.id && (
                                        <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-2 animate-in slide-in-from-top-1 duration-200">
                                            <textarea 
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                placeholder={t('輸入回覆內容...', 'Reply...')}
                                                className="w-full p-2 text-xs border-2 border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white/50"
                                                autoFocus
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button 
                                                    type="submit"
                                                    disabled={isSubmitting || !replyContent.trim()}
                                                    className="bg-indigo-600 text-white px-4 py-1.5 rounded text-[10px] font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                                                >
                                                    <Send size={12} />
                                                    {t('確認回覆', 'Send')}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {replies.length > 0 && (
                                        <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3">
                                            {replies.map(reply => (
                                                <div key={reply.id} className="bg-slate-50/80 p-2 rounded border border-slate-100">
                                                    <div className="flex justify-between items-start mb-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-bold text-[10px] text-slate-800 shrink-0">{maskName(reply.author_name)}</span>
                                                            {reply.is_admin_reply && <span className="bg-indigo-900 text-white text-[7px] px-1 py-0.5 rounded font-bold tracking-tighter shrink-0">STAFF</span>}
                                                            <span className="text-[8px] text-slate-400 font-bold shrink-0">{new Date(reply.created_at).toLocaleTimeString('zh-TW', { hour12: false })}</span>
                                                        </div>
                                                        {(currentUser?.role === 'stake_admin' || currentUser?.role === 'engineer') && (
                                                            <button onClick={() => handleDelete(reply.id)} className="text-slate-300 hover:text-red-600 transition-colors shrink-0">
                                                                <Trash2 size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                                        {currentLang === 'en' && reply.content_en ? reply.content_en : reply.content}
                                                    </p>
                                                    {currentLang === 'zh-TW' && reply.content_en && (
                                                        <p className="text-[8px] text-slate-400 italic mt-0.5 border-t border-slate-200/30 pt-0.5 flex items-center gap-1">
                                                            <Globe size={8} /> {reply.content_en}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Guidelines Section */}
            <div className="mt-1 w-full min-w-0">
                <SectionWrapper
                    id="guidelines"
                    title={t('互動指引', 'Guidelines')}
                    icon={<HeartHandshake size={18}/>}
                    colorIndex={6} // Purple
                >
                    <div className="space-y-3">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
                            {t('歡迎分享您在教儀、交通或行政上的寶貴意見：', 'Suggestions are welcome:')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="bg-white p-2 rounded border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-800 shadow-sm mb-1.5 border border-purple-200 text-[10px]">1</div>
                                <span className="font-bold text-slate-700 text-[9px] leading-relaxed uppercase tracking-wide">
                                    {t('教儀程序建議', 'Ordinance Ideas')}
                                </span>
                            </div>
                            <div className="bg-white p-2 rounded border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-800 shadow-sm mb-1.5 border border-purple-200 text-[10px]">2</div>
                                <span className="font-bold text-slate-700 text-[9px] leading-relaxed uppercase tracking-wide">
                                    {t('交通安排回饋', 'Transport Feedback')}
                                </span>
                            </div>
                            <div className="bg-white p-2 rounded border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-800 shadow-sm mb-1.5 border border-purple-200 text-[10px]">3</div>
                                <span className="font-bold text-slate-700 text-[9px] leading-relaxed uppercase tracking-wide">
                                    {t('行程與食宿意見', 'Trip Suggestions')}
                                </span>
                            </div>
                        </div>
                    </div>
                </SectionWrapper>
            </div>

            <div ref={commentsEndRef} className="h-4" />
        </div>
    );
};

export default PublicCommentTab;
