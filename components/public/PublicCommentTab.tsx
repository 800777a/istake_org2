import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comment, EventData, User, GlobalSettings } from '../../types';
import { subscribeToComments, addComment, markCommentAsSpam, getCurrentUser, deleteCommentByAdmin } from '../../services/sheetService';
import { MessageSquare, Send, Reply, AlertTriangle, Clock, ChevronDown, ChevronUp, HeartHandshake, Trash2, Building } from 'lucide-react';

import Toast, { ToastType } from '../Toast';

interface PublicCommentTabProps {
    activeEvent: EventData;
    settings: GlobalSettings;
    lang: 'zh' | 'en';
}

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
        <div className="space-y-6">
            <Toast 
                message={msg} 
                type={msgType} 
                onClose={() => setMsg(null)} 
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 px-2">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800 text-lg">{t('留言', 'Comments')}</h3>
                    <span className="text-xs text-gray-400">{t('目前共有', 'Total')} {activeCommentsCount} {t('條留言', 'comments')}</span>
                </div>
                <button 
                    onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
                    className="text-xs font-bold px-3 py-1 bg-white border rounded-full text-indigo-600 hover:bg-indigo-50 flex items-center gap-1 transition-colors"
                >
                    {sortOrder === 'oldest' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    {sortOrder === 'oldest' ? t('舊留言在上面', 'Oldest first') : t('新留言在上面', 'Newest first')} ({t('切換', 'Toggle')})
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-100">
                    <span className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> {t('發表新留言', 'New comment')}
                    </span>
                </div>
                <form onSubmit={e => handleSubmit(e)} className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative md:w-1/4">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <Building className="w-4 h-4" />
                                </div>
                                <select 
                                    className="w-full text-sm border-gray-300 border-2 rounded-xl pl-9 p-2.5 focus:ring-2 focus:ring-indigo-300 outline-none appearance-none bg-white font-bold text-gray-800"
                                    value={authorUnit}
                                    onChange={e => setAuthorUnit(e.target.value)}
                                >
                                    <option value="" disabled className="text-gray-500">{t('請選擇單位', 'Select Unit')}</option>
                                    {settings.units.map(u => <option key={u} value={u} className="text-gray-800">{u}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input 
                                    type="text" 
                                    placeholder={t("您的稱呼 (選填)", "Your name (opt)")}
                                    className="w-full text-sm border-gray-300 border-2 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-300 outline-none font-bold placeholder:text-gray-400"
                                    value={authorName}
                                    onChange={e => setAuthorName(e.target.value)}
                                />
                                <div className="relative w-full">
                                    <select 
                                        className={`w-full text-sm border-gray-300 border-2 rounded-xl px-3 p-2.5 focus:ring-2 focus:ring-indigo-300 outline-none appearance-none bg-white font-bold ${category ? 'text-indigo-700' : 'text-gray-500'}`}
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                    >
                                        <option value="" disabled className="text-gray-500">{t('請選擇分類', 'Select Category')}</option>
                                        <option value="網站問題" className="text-gray-800">{t('網站問題', 'Website Issue')}</option>
                                        <option value="報名問題" className="text-gray-800">{t('報名問題', 'Registration Issue')}</option>
                                        <option value="收費問題" className="text-gray-800">{t('收費問題', 'Payment Issue')}</option>
                                        <option value="行程安排" className="text-gray-800">{t('行程安排', 'Travel Schedule')}</option>
                                        <option value="教儀安排" className="text-gray-800">{t('教儀安排', 'Temple Ordinances')}</option>
                                        <option value="服務安排" className="text-gray-800">{t('服務安排', 'Service Schedule')}</option>
                                        <option value="特別需求" className="text-gray-800">{t('特別需求', 'Special Needs')}</option>
                                        <option value="改善意見" className="text-gray-800">{t('改善意見', 'Improvements')}</option>
                                        <option value="意外事故" className="text-gray-800">{t('意外事故', 'Accident')}</option>
                                        <option value="東西掉了" className="text-gray-800">{t('東西掉了', 'Lost Item')}</option>
                                        <option value="其他問題" className="text-gray-800">{t('其他問題', 'Other')}</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                                        <ChevronDown className="w-4 h-4 shadow-sm" />
                                    </div>
                                </div>
                            </div>
                    </div>
                    <textarea 
                        placeholder={t("想對主辦單位說什麼，或對這次活動有什麼建議嗎？", "Any suggestions or questions?")}
                        className="w-full text-base border-gray-200 border rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-300 outline-none resize-none font-medium text-gray-600 leading-relaxed transition-all"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button 
                            disabled={isSubmitting || !newComment.trim() || !category || cooldown > 0}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all focus:ring-4 focus:ring-indigo-100 ${
                                isSubmitting || !newComment.trim() || !category || cooldown > 0 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg active:scale-95'
                            }`}
                        >
                            <Send className="w-4 h-4" /> 
                            {!category ? t('請選擇分類', 'Select category') : (cooldown > 0 ? `${t('發表留言', 'Post')} (${cooldown}s)` : t('發表留言', 'Post'))}
                        </button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                {sortedComments.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                        {t('目前還沒有留言，快來當第一個留言的人吧！', 'No comments yet, be the first!')}
                    </div>
                ) : (
                    sortedComments.map((comment, index) => {
                        const replies = getReplies(comment.id);
                        const rainbowStyles = [
                            { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', circle: 'bg-red-100 text-red-900' },
                            { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', circle: 'bg-orange-100 text-orange-900' },
                            { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', circle: 'bg-yellow-100 text-yellow-900' },
                            { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', circle: 'bg-green-100 text-green-900' },
                            { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', circle: 'bg-blue-100 text-blue-900' },
                            { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', circle: 'bg-indigo-100 text-indigo-900' },
                            { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', circle: 'bg-purple-100 text-purple-900' },
                        ];
                        const style = rainbowStyles[index % rainbowStyles.length];

                        return (
                            <div key={comment.id} className={`rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${style.border}`}>
                                <div className={`p-5 ${style.bg}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm ${style.circle}`}>
                                                {comment.author_name.slice(0, 1)}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    {comment.author_unit && <span className={`text-[11px] font-bold opacity-70 px-1.5 py-0.5 rounded bg-white/40 border border-black/5 ${style.text}`}>[{comment.author_unit}]</span>}
                                                    <span className={`font-bold text-base ${style.text}`}>{maskName(comment.author_name)}</span>
                                                    {comment.category && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 border border-current opacity-80 ${style.text}`}>{comment.category}</span>}
                                                    {comment.is_admin_reply && <span className="bg-orange-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold shadow-sm ring-2 ring-white">{t('主辦', 'Admin')}</span>}
                                                </div>
                                                <span className={`text-[10px] flex items-center gap-1 mt-0.5 opacity-60 font-medium ${style.text}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(comment.created_at).toLocaleString('zh-TW', { hour12: false })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {currentUser && (
                                                <button 
                                                    onClick={() => handleDelete(comment.id)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                                        confirmingState?.id === comment.id && confirmingState?.type === 'delete'
                                                        ? 'bg-red-600 text-white animate-pulse'
                                                        : 'hover:bg-red-50 text-gray-300 hover:text-red-600'
                                                    }`}
                                                    title={confirmingState?.id === comment.id && confirmingState?.type === 'delete' ? t('再點一次確認刪除', 'Confirm delete') : t('刪除留言', 'Delete')}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleMarkSpam(comment.id)}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                                    confirmingState?.id === comment.id && confirmingState?.type === 'spam'
                                                    ? 'bg-orange-600 text-white animate-pulse'
                                                    : 'hover:bg-black/5 text-gray-300 hover:text-red-400'
                                                }`}
                                                title={confirmingState?.id === comment.id && confirmingState?.type === 'spam' ? t('再點一次標記為不適當', 'Confirm spam') : t('標記為不適當', 'Mark as inappropriate')}
                                            >
                                                <AlertTriangle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`text-base ml-2 ${comment.is_spam ? 'text-red-500 font-bold italic' : style.text} whitespace-pre-wrap leading-relaxed font-serif opacity-95`}>
                                        {comment.is_spam ? t('此留言已被標記為不適當', 'This comment has been marked as inappropriate') : comment.content}
                                    </div>
                                    
                                    {!comment.is_spam && (
                                        <div className="mt-4 flex justify-end">
                                            <button 
                                                onClick={() => {
                                                    setReplyTo(replyTo === comment.id ? null : comment.id);
                                                    setReplyContent('');
                                                }}
                                                className={`text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-full transition-all border shadow-sm ${
                                                    replyTo === comment.id 
                                                    ? 'bg-gray-800 text-white border-gray-800' 
                                                    : `bg-white/60 hover:bg-white text-indigo-700 border-indigo-100`
                                                }`}
                                            >
                                                <Reply className="w-3.5 h-3.5" /> 
                                                {cooldown > 0 ? (replyTo === comment.id ? `${t('取消', 'Cancel')} (${cooldown}s)` : `${t('回覆', 'Reply')} (${cooldown}s)`) : (replyTo === comment.id ? t('取消', 'Cancel') : t('回覆', 'Reply'))}
                                            </button>
                                        </div>
                                    )}

                                    {replyTo === comment.id && !comment.is_spam && (
                                        <form onSubmit={e => handleSubmit(e, comment.id)} className="mt-4 p-4 bg-white/60 rounded-2xl border border-black/5 shadow-inner animate-in slide-in-from-top-4 duration-300">
                                            <textarea 
                                                placeholder={t("輸入回覆內容...", "Type reply...")}
                                                className="w-full text-sm border-gray-100 border rounded-xl p-3 focus:ring-2 focus:ring-indigo-300 outline-none resize-none h-24 bg-white font-medium text-gray-600 leading-relaxed"
                                                autoFocus
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button type="button" onClick={() => setReplyTo(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-white rounded-lg border border-gray-200">{t('取消', 'Cancel')}</button>
                                                <button disabled={isSubmitting || !replyContent.trim() || cooldown > 0} className={`px-6 py-2 text-xs font-bold rounded-lg shadow-md transition-all ${isSubmitting || !replyContent.trim() || cooldown > 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
                                                    {cooldown > 0 ? `${t('發表回覆', 'Post reply')} (${cooldown}s)` : t('發表回覆', 'Post reply')}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                                {replies.length > 0 && (
                                    <div className={`border-t border-black/5 ${comment.is_admin_reply ? 'bg-orange-100/20' : 'bg-black/5'}`}>
                                        {replies.map(reply => (
                                            <div key={reply.id} className="p-5 border-l-8 border-black/5 ml-4 border-b last:border-b-0 border-black/5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border border-white shadow-sm ${reply.is_admin_reply ? 'bg-orange-600 text-white' : 'bg-gray-400 text-white'}`}>
                                                            {reply.author_name.slice(0, 1)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-bold text-sm ${reply.is_admin_reply ? 'text-orange-900' : 'text-gray-700'}`}>{maskName(reply.author_name)}</span>
                                                                {reply.is_admin_reply && <span className="bg-orange-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold shadow-sm">{t('主辦', 'Admin')}</span>}
                                                            </div>
                                                            <span className="text-[10px] opacity-40 font-medium flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {new Date(reply.created_at).toLocaleString('zh-TW', { hour12: false })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {currentUser && (
                                                            <button 
                                                                onClick={() => handleDelete(reply.id)}
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${confirmingState?.id === reply.id && confirmingState?.type === 'delete' ? 'bg-red-600 text-white animate-pulse' : 'hover:bg-red-50 text-gray-200 hover:text-red-600'}`}
                                                                title={confirmingState?.id === reply.id && confirmingState?.type === 'delete' ? t('再點一次確認刪除', 'Confirm delete') : t('刪除', 'Delete')}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleMarkSpam(reply.id)}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${confirmingState?.id === reply.id && confirmingState?.type === 'spam' ? 'bg-orange-600 text-white animate-pulse' : 'hover:bg-black/5 text-gray-200 hover:text-red-400'}`}
                                                    >
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={`text-sm ml-11 ${reply.is_spam ? 'text-red-500 font-bold italic' : (reply.is_admin_reply ? 'text-orange-900/90' : 'text-gray-600')} whitespace-pre-wrap leading-relaxed opacity-90 font-serif`}>
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

            <div className="p-6 bg-indigo-50 rounded-2xl shadow-sm border border-indigo-200 text-indigo-900 transition-all hover:shadow-md">
                <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-indigo-600" /> {t('互動指引', 'Guidelines')}
                </h4>
                <p className="opacity-80 text-sm mb-4">{t('我們非常重視您的聲音！如果不確定要說什麼，可以參考以下問題：', 'We value your voice! If unsure what to say, consider these:')}</p>
                <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2.5"><div className="w-6 h-6 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-indigo-800 shadow-sm">1</div><span className="font-medium mt-0.5">{t('對本次活動的教儀安排有什麼感想 or 建議嗎？', 'Thoughts or suggestions for temple ordinances?')}</span></li>
                    <li className="flex items-start gap-2.5"><div className="w-6 h-6 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-indigo-800 shadow-sm">2</div><span className="font-medium mt-0.5 text-sm">{t('交通接駁安排是否還有改進的空間？', 'Any improvements for transport?')}</span></li>
                    <li className="flex items-start gap-2.5"><div className="w-6 h-6 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-indigo-800 shadow-sm">3</div><span className="font-medium mt-0.5">{t('您最期待在未來的聖殿之旅中看到什麼樣的新服務？', 'What new services do you look forward to in future Temple Trips?')}</span></li>
                </ul>
                <div className="mt-5 pt-4 border-t border-indigo-200 text-xs opacity-60 text-center font-bold">{t('您的建議是我們進步的最大動力，願神祝福您！', 'Your suggestions drive us forward. God bless you!')}</div>
            </div>
        </div>
    );
};
export default PublicCommentTab;
