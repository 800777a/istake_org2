import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comment, EventData, User, GlobalSettings } from '../../types';
import { subscribeToComments, addComment, markCommentAsSpam, getCurrentUser, deleteCommentByAdmin } from '../../services/sheetService';
import { MessageSquare, Send, Reply, AlertTriangle, Clock, ChevronDown, ChevronUp, HeartHandshake, Trash2, Building, Plus, Ban } from 'lucide-react';

import Toast, { ToastType } from '../Toast';

interface PublicCommentTabProps {
    activeEvent: EventData;
    settings: GlobalSettings;
    lang: 'zh' | 'en';
}

const rainbowThemes = [
    { border: 'border-red-200', title: 'bg-red-200', header: 'bg-red-100', content: 'bg-red-50', accent: 'text-red-800' },
    { border: 'border-orange-200', title: 'bg-orange-200', header: 'bg-orange-100', content: 'bg-orange-50', accent: 'text-orange-800' },
    { border: 'border-amber-200', title: 'bg-amber-200', header: 'bg-amber-100', content: 'bg-amber-50', accent: 'text-amber-900' },
    { border: 'border-emerald-200', title: 'bg-emerald-200', header: 'bg-emerald-100', content: 'bg-emerald-50', accent: 'text-emerald-800' },
    { border: 'border-blue-200', title: 'bg-blue-200', header: 'bg-blue-100', content: 'bg-blue-50', accent: 'text-blue-800' },
    { border: 'border-indigo-200', title: 'bg-indigo-200', header: 'bg-indigo-100', content: 'bg-indigo-50', accent: 'text-indigo-800' },
    { border: 'border-purple-200', title: 'bg-purple-200', header: 'bg-purple-100', content: 'bg-purple-50', accent: 'text-purple-800' },
];

const PublicCommentTab: React.FC<PublicCommentTabProps> = ({ activeEvent, settings, lang = 'zh' }) => {
    const t = (zh: string, en: string) => lang === 'zh' ? zh : en;
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [authorUnit, setAuthorUnit] = useState('');
    const [category, setCategory] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [confirmingState, setConfirmingState] = useState<{ id: string, type: 'delete' | 'spam' } | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<ToastType>('error');
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const maskName = (name: string) => {
        if (currentUser) return name;
        if (!name || name === (lang === 'zh' ? '成員' : 'Member')) return name;
        const trimmed = name.trim();
        if (trimmed.length <= 1) return trimmed;
        if (trimmed.length === 2) return trimmed[0] + 'Ｏ';
        return trimmed[0] + 'Ｏ' + trimmed.slice(2);
    };

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (user) {
            setAuthorName(user.name);
            if (user.unit) setAuthorUnit(user.unit);
        }

        const unsub = subscribeToComments(activeEvent.event_id, (list) => {
            setComments(list);
        });

        const lastCommentTime = localStorage.getItem('last_comment_time');
        if (lastCommentTime) {
            const diff = Math.floor((Date.now() - parseInt(lastCommentTime)) / 1000);
            if (diff < 180) {
                setCooldown(180 - diff);
            }
        }
        return () => unsub();
    }, [activeEvent.event_id]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const scrollToLast = () => {
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
        e.preventDefault();
        const content = parentId ? replyContent : newComment;
        const name = authorName.trim() || (lang === 'zh' ? '成員' : 'Member');

        if (!content.trim()) return;
        if (cooldown > 0) return;

        setIsSubmitting(true);
        try {
            await addComment(activeEvent.event_id, {
                author_name: name,
                author_unit: parentId ? undefined : (authorUnit || undefined),
                category: parentId ? undefined : category,
                content: content.trim(),
                is_admin_reply: !!currentUser,
                parent_id: parentId
            });
            if (parentId) {
                setReplyContent('');
                setReplyTo(null);
            } else {
                setNewComment('');
            }
            setCooldown(180);
            localStorage.setItem('last_comment_time', Date.now().toString());
            scrollToLast();
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkSpam = async (commentId: string) => {
        if (confirmingState?.id === commentId && confirmingState?.type === 'spam') {
            try {
                await markCommentAsSpam(commentId);
                setConfirmingState(null);
            } catch (e) {
                setMsgType('error');
                setMsg(t('操作失敗，請稍後再試', 'Operation failed, please try again later'));
            }
        } else {
            setConfirmingState({ id: commentId, type: 'spam' });
            setTimeout(() => setConfirmingState(null), 3000);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (confirmingState?.id === commentId && confirmingState?.type === 'delete') {
            try {
                await deleteCommentByAdmin(commentId);
                setConfirmingState(null);
            } catch (e) {
                setMsgType('error');
                setMsg(t('操作失敗，請稍後再試', 'Operation failed, please try again later'));
            }
        } else {
            setConfirmingState({ id: commentId, type: 'delete' });
            setTimeout(() => setConfirmingState(null), 3000);
        }
    };

    const activeCommentsCount = useMemo(() => comments.filter(c => !c.is_spam && !c.parent_id).length, [comments]);
    
    const sortedComments = useMemo(() => {
        const mainComments = comments.filter(c => !c.parent_id);
        const sorted = [...mainComments].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
        });
        return sorted;
    }, [comments, sortOrder]);

    const getReplies = (parentId: string) => {
        return comments.filter(c => c.parent_id === parentId).sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    };

    return (
        <div className="space-y-4 md:space-y-8 animate-fade-in pb-12">
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
            
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-sm p-5 md:p-8 rounded-none md:rounded-lg shadow-none md:shadow-sm border-none md:border border-indigo-100">
                <div className="flex items-center gap-5">
                    <div className="bg-indigo-900 p-4 rounded-xl text-white shadow-lg">
                        <MessageSquare className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                            {t('留言板 (FEEDBACK)', 'Feedback & Comments')}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">{t('目前共有', 'Total')}</span>
                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-black">{activeCommentsCount}</span>
                            <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">{t('條真實的心聲回饋', 'records')}</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
                    className="h-8 md:h-10 lg:h-12 px-6 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs md:text-sm lg:text-base font-black hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 active:scale-95 group shadow-sm"
                >
                    {sortOrder === 'oldest' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    <span>{sortOrder === 'oldest' ? t('舊留言在上面', 'Oldest first') : t('新留言在上面', 'Newest first')}</span>
                </button>
            </div>

            {/* Post New Comment Section - Rainbow 5 (Indigo) */}
            <SectionWrapper 
                id="post-form"
                title={t('發表新留言 (POST NEW)', 'Post New Comment')} 
                icon={<Plus size={20}/>}
                theme={rainbowThemes[5]}
            >
                <form onSubmit={e => handleSubmit(e)} className="p-4 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('所屬單位 (Unit)', 'Unit')}</label>
                            <select 
                                className="w-full h-8 md:h-10 lg:h-12 text-xs md:text-sm border-slate-200 border rounded-md px-3 focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-bold text-slate-900 transition-all shadow-sm"
                                value={authorUnit}
                                onChange={e => setAuthorUnit(e.target.value)}
                            >
                                <option value="" disabled>{t('請選擇單位', 'Select Unit')}</option>
                                {(settings.units || []).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('您的稱呼 (Name)', 'Your Name')}</label>
                            <input 
                                type="text" 
                                placeholder={t("選填 (預設為成員)", "Optional")}
                                className="w-full h-8 md:h-10 lg:h-12 text-xs md:text-sm border-slate-200 border rounded-md px-3 focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-slate-900 bg-white transition-all shadow-sm"
                                value={authorName}
                                onChange={e => setAuthorName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('留言分類 (Category)', 'Category')}</label>
                            <select 
                                className={`w-full h-8 md:h-10 lg:h-12 text-xs md:text-sm border-slate-200 border rounded-md px-3 focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-bold transition-all shadow-sm ${category ? 'text-indigo-600' : 'text-slate-400'}`}
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="" disabled>{t('請選擇分類', 'Select Category')}</option>
                                <option value="網站問題">{t('網站問題', 'Website Issue')}</option>
                                <option value="報名問題">{t('報名問題', 'Registration Issue')}</option>
                                <option value="收費問題">{t('收費問題', 'Payment Issue')}</option>
                                <option value="行程安排">{t('行程安排', 'Travel Schedule')}</option>
                                <option value="教儀安排">{t('教儀安排', 'Temple Ordinances')}</option>
                                <option value="服務安排">{t('服務安排', 'Service Schedule')}</option>
                                <option value="特別需求">{t('特別需求', 'Special Needs')}</option>
                                <option value="改善意見">{t('改善意見', 'Improvements')}</option>
                                <option value="意外事故">{t('意外事故', 'Accident')}</option>
                                <option value="東西掉了">{t('東西掉了', 'Lost Item')}</option>
                                <option value="其他問題">{t('其他問題', 'Other')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('內容詳述 (Content)', 'Description')}</label>
                        <textarea 
                            placeholder={t("想對主辦單位說什麼，或對這次活動有什麼建議嗎？", "Any suggestions or questions?")}
                            className="w-full text-xs md:text-sm border-slate-200 border rounded-md p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-300 outline-none resize-none font-medium text-slate-700 leading-relaxed bg-white transition-all shadow-sm"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row justify-end gap-3 items-center">
                        {cooldown > 0 && (
                            <span className="text-[10px] font-black text-amber-600 flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 uppercase tracking-widest">
                                <Clock size={12} className="animate-pulse" />
                                {t(`冷卻中: ${cooldown}秒`, `Cooldown: ${cooldown}s`)}
                            </span>
                        )}
                        <button 
                            disabled={isSubmitting || !newComment.trim() || !category || cooldown > 0}
                            className={`
                                w-full md:w-auto h-8 md:h-10 lg:h-12 px-10 rounded-md font-black text-xs md:text-sm lg:text-base transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 uppercase tracking-widest
                                ${isSubmitting || !newComment.trim() || !category || cooldown > 0 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-indigo-800 text-white hover:bg-indigo-900 shadow-indigo-200'
                                }
                            `}
                        >
                            <Send size={16} /> 
                            <span>{t('發表留言', 'Post Message')}</span>
                        </button>
                    </div>
                </form>
            </SectionWrapper>

            {/* Comment List Area */}
            <div className="space-y-4 md:space-y-6">
                {sortedComments.length === 0 ? (
                    <div className="p-16 text-center text-slate-300 bg-white rounded-lg border border-dashed border-slate-200 font-bold uppercase tracking-widest text-xs md:text-sm">
                        {t('目前還沒有留言', 'No comments yet')}
                    </div>
                ) : (
                    sortedComments.map((comment, index) => {
                        const replies = getReplies(comment.id);
                        const style = rainbowThemes[index % rainbowThemes.length];

                        return (
                            <div key={comment.id} className={`rounded-none md:rounded-lg border-none md:border shadow-none md:shadow-sm overflow-hidden transition-all bg-white ${style.border}`}>
                                <div className={`px-5 py-4 ${style.header} flex justify-between items-start border-b ${style.border}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 border-white shadow-sm ${style.title.replace('bg-', 'bg-')}`}>
                                            {comment.author_name.slice(0, 1)}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {comment.author_unit && <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white shadow-sm ${style.accent}`}>{comment.author_unit}</span>}
                                                <span className={`font-black text-sm md:text-base tracking-tight ${style.accent}`}>{maskName(comment.author_name)}</span>
                                                {comment.category && <span className={`text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-current shadow-sm ${style.accent}`}>{comment.category}</span>}
                                                {comment.is_admin_reply && <span className="bg-indigo-900 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm uppercase tracking-tighter ring-1 ring-white">STAFF</span>}
                                            </div>
                                            <span className="text-[10px] flex items-center gap-1 mt-0.5 font-bold text-slate-400">
                                                <Clock size={10} />
                                                {new Date(comment.created_at).toLocaleString('zh-TW', { hour12: false })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {currentUser && (
                                            <button 
                                                onClick={() => handleDelete(comment.id)}
                                                className={`w-8 h-8 rounded flex items-center justify-center transition-all active:scale-90 ${
                                                    confirmingState?.id === comment.id && confirmingState?.type === 'delete'
                                                    ? 'bg-red-600 text-white animate-pulse'
                                                    : 'hover:bg-red-100 text-slate-300 hover:text-red-600'
                                                }`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleMarkSpam(comment.id)}
                                            className={`w-8 h-8 rounded flex items-center justify-center transition-all active:scale-90 ${
                                                confirmingState?.id === comment.id && confirmingState?.type === 'spam'
                                                ? 'bg-amber-600 text-white animate-pulse'
                                                : 'hover:bg-slate-200 text-slate-300 hover:text-amber-600'
                                            }`}
                                        >
                                            <AlertTriangle size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className={`p-5 ${style.content}`}>
                                    <div className={`text-xs ${comment.is_spam ? 'text-red-500 font-bold italic' : 'text-slate-800'} whitespace-pre-wrap leading-relaxed font-medium mb-4`}>
                                        {comment.is_spam ? t('此留言已被標記為不適當', 'This comment has been marked as inappropriate') : comment.content}
                                    </div>
                                    
                                    {!comment.is_spam && (
                                        <div className="flex justify-end pt-3 border-t border-slate-200">
                                            <button 
                                                onClick={() => {
                                                    setReplyTo(replyTo === comment.id ? null : comment.id);
                                                    setReplyContent('');
                                                }}
                                                className={`h-8 px-4 rounded text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                                                    replyTo === comment.id 
                                                    ? 'bg-slate-900 text-white border-slate-900' 
                                                    : `bg-white hover:bg-slate-50 text-indigo-700 border-indigo-100`
                                                }`}
                                            >
                                                <Reply size={14} className="mr-1 inline" /> 
                                                <span>{cooldown > 0 && replyTo !== comment.id ? `${t('回覆', 'Reply')} (${cooldown}s)` : (replyTo === comment.id ? t('取消', 'Cancel') : t('回覆', 'Reply'))}</span>
                                            </button>
                                        </div>
                                    )}

                                    {replyTo === comment.id && !comment.is_spam && (
                                        <form onSubmit={e => handleSubmit(e, comment.id)} className="mt-4 p-4 bg-white rounded-md border border-slate-200 shadow-lg animate-slide-down">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                <Reply size={12} />
                                                <span>{t('撰寫回覆 (WRITE REPLY)', 'Write Reply')}</span>
                                            </div>
                                            <textarea 
                                                placeholder={t("輸入回覆內容...", "Type reply...")}
                                                className="w-full text-xs md:text-sm border-slate-200 border rounded p-3 focus:ring-2 focus:ring-indigo-300 outline-none resize-none h-24 bg-slate-50 focus:bg-white font-medium text-slate-700 shadow-inner"
                                                autoFocus
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button type="button" onClick={() => setReplyTo(null)} className="h-8 px-4 text-[10px] font-black text-slate-500 hover:bg-slate-50 rounded border border-slate-200 uppercase tracking-widest">{t('取消', 'Cancel')}</button>
                                                <button 
                                                    disabled={isSubmitting || !replyContent.trim() || cooldown > 0} 
                                                    className={`h-8 px-6 text-[10px] font-black rounded shadow-sm transition-all flex items-center gap-2 uppercase tracking-widest ${isSubmitting || !replyContent.trim() || cooldown > 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-indigo-800 text-white hover:bg-indigo-900 active:scale-95'}`}
                                                >
                                                    <Send size={12} />
                                                    <span>{t('發表回覆', 'Post reply')}</span>
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>

                                {replies.length > 0 && (
                                    <div className={`border-t ${style.border} ${comment.is_admin_reply ? 'bg-indigo-50/10' : 'bg-slate-50/30'}`}>
                                        {replies.map(reply => (
                                            <div key={reply.id} className={`p-4 md:pl-12 border-b last:border-b-0 ${style.border} relative`}>
                                                <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                                <div className="flex justify-between items-start mb-2 relative">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border shadow-sm ${reply.is_admin_reply ? 'bg-indigo-900 text-white' : 'bg-slate-400 text-white'}`}>
                                                            {reply.author_name.slice(0, 1)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-black text-xs md:text-sm tracking-tight ${reply.is_admin_reply ? 'text-indigo-900' : 'text-slate-800'}`}>{maskName(reply.author_name)}</span>
                                                                {reply.is_admin_reply && <span className="bg-indigo-900 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm uppercase tracking-tighter">STAFF</span>}
                                                            </div>
                                                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(reply.created_at).toLocaleString('zh-TW', { hour12: false })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {currentUser && (
                                                            <button 
                                                                onClick={() => handleDelete(reply.id)}
                                                                className={`w-7 h-7 rounded flex items-center justify-center transition-all active:scale-90 ${confirmingState?.id === reply.id && confirmingState?.type === 'delete' ? 'bg-red-600 text-white animate-pulse' : 'hover:bg-red-50 text-slate-200 hover:text-red-600'}`}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleMarkSpam(reply.id)}
                                                            className={`w-7 h-7 rounded flex items-center justify-center transition-all active:scale-90 ${confirmingState?.id === reply.id && confirmingState?.type === 'spam' ? 'bg-amber-600 text-white animate-pulse' : 'hover:bg-slate-200 text-slate-200 hover:text-amber-600'}`}
                                                        >
                                                            <AlertTriangle size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={`text-xs ml-11 ${reply.is_spam ? 'text-red-500 font-bold italic' : (reply.is_admin_reply ? 'text-slate-900' : 'text-slate-600')} whitespace-pre-wrap leading-relaxed font-medium`}>
                                                    {reply.is_spam ? t('此回覆已被標記為不適當', 'This reply has been marked as inappropriate') : reply.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={commentsEndRef} className="h-4" />
            </div>

            {/* Guidelines Section - Rainbow 6 (Purple) */}
            <SectionWrapper 
                id="guidelines"
                title={t('互動指引與建議方向 (GUIDELINES)', 'Guidelines & Suggestions')} 
                icon={<HeartHandshake size={18}/>}
                theme={rainbowThemes[6]}
            >
                <div className="p-5 md:p-8 space-y-6">
                    <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest text-center md:text-left">
                        {t('我們非常重視您的聲音！如果不確定要說什麼，可以參考以下問題：', 'We value your voice! If unsure what to say, consider these:')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-lg border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-800 shadow-sm mb-3 border border-purple-200 group-hover:scale-110 transition-transform">1</div>
                            <span className="font-bold text-slate-700 text-xs leading-relaxed uppercase tracking-wide">
                                {t('對本次活動的教儀安排有什麼感想 or 建議嗎？', 'Thoughts or suggestions for temple ordinances?')}
                            </span>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-800 shadow-sm mb-3 border border-purple-200 group-hover:scale-110 transition-transform">2</div>
                            <span className="font-bold text-slate-700 text-xs leading-relaxed uppercase tracking-wide">
                                {t('交通接駁安排是否還有改進的空間？', 'Any improvements for transport?')}
                            </span>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-purple-200 flex flex-col items-center text-center group hover:bg-purple-50 transition-colors shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-800 shadow-sm mb-3 border border-purple-200 group-hover:scale-110 transition-transform">3</div>
                            <span className="font-bold text-slate-700 text-xs leading-relaxed uppercase tracking-wide">
                                {t('您最期待在未來的聖殿旅行團中看到什麼樣的新服務？', 'What new services do you look forward to in future Temple Trips?')}
                            </span>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-purple-100 text-center">
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] leading-loose">
                            {t('您的建議是我們進步的最大動力，願神祝福您！', 'Your suggestions drive us forward. God bless you!')}
                        </p>
                    </div>
                </div>
            </SectionWrapper>
        </div>
    );
};

// Helper Section Wrapper Component for consistent layout
const SectionWrapper: React.FC<{ 
    id: string,
    title: string, 
    icon: React.ReactNode, 
    children: React.ReactNode,
    theme: { border: string, title: string, content: string, accent: string }
}> = ({ id, title, icon, children, theme }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    return (
        <div className={`rounded-none md:rounded-lg shadow-none md:shadow-sm border-none md:border ${theme.border} overflow-hidden bg-white transition-all duration-300`}>
            <div 
                className={`w-full flex items-center justify-between px-5 py-3.5 ${theme.title} cursor-pointer hover:opacity-90 transition-all border-b ${theme.border} select-none group`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border shadow-sm bg-white/50 ${theme.accent}`}>
                        {icon}
                    </div>
                    <h3 className="text-sm md:text-base lg:text-lg font-black text-slate-900 tracking-tight leading-none uppercase">{title}</h3>
                </div>
                <div className="text-slate-500">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>
            
            <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className={theme.content}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PublicCommentTab;
