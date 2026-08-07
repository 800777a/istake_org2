import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comment, EventData, GlobalSettings } from '../../types';
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

// 遵循系統規範：禁用 Tailwind 預設顏色類別，一律使用方括號任意值語法
const rainbowThemes = [
    { border: 'border-[#FECACA]', title: 'bg-[#FECACA]', header: 'bg-[#FEE2E2]', content: 'bg-[#FEF2F2]', accent: 'text-[#991B1B]', button: 'bg-[#DC2626] hover:bg-[#B91C1C]' },
    { border: 'border-[#FED7AA]', title: 'bg-[#FED7AA]', header: 'bg-[#FFEDD5]', content: 'bg-[#FFF7ED]', accent: 'text-[#9A3412]', button: 'bg-[#EA580C] hover:bg-[#C2410C]' },
    { border: 'border-[#FEF08A]', title: 'bg-[#FEF08A]', header: 'bg-[#FEF9C3]', content: 'bg-[#FEFCE8]', accent: 'text-[#854D0E]', button: 'bg-[#CA8A04] hover:bg-[#A16207]' },
    { border: 'border-[#A7F3D0]', title: 'bg-[#A7F3D0]', header: 'bg-[#D1FAE5]', content: 'bg-[#ECFDF5]', accent: 'text-[#065F46]', button: 'bg-[#059669] hover:bg-[#047857]' },
    { border: 'border-[#BAE6FD]', title: 'bg-[#BAE6FD]', header: 'bg-[#E0F2FE]', content: 'bg-[#F0F9FF]', accent: 'text-[#075985]', button: 'bg-[#0284C7] hover:bg-[#0369A1]' },
    { border: 'border-[#C7D2FE]', title: 'bg-[#C7D2FE]', header: 'bg-[#E0E7FF]', content: 'bg-[#EEF2FF]', accent: 'text-[#3730A3]', button: 'bg-[#4F46E5] hover:bg-[#4338CA]' },
    { border: 'border-[#E9D5FF]', title: 'bg-[#E9D5FF]', header: 'bg-[#F3E8FF]', content: 'bg-[#FAF5FF]', accent: 'text-[#6B21A8]', button: 'bg-[#9333EA] hover:bg-[#7E22CE]' },
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
        <div id={id} className={`rounded border-2 ${theme.border} overflow-hidden bg-[#FFFFFF] transition-all duration-300 mt-1 min-w-0 w-full`}>
            <div 
                className={`w-full flex items-center justify-between p-1 ${theme.title} cursor-pointer hover:opacity-95 transition-all border-b ${theme.border} select-none group`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded border shadow-sm bg-[#FFFFFF]/60 w-8 h-8 flex shrink-0 items-center justify-center ${theme.accent}`}>
                        {icon}
                    </div>
                    <h3 className={`text-sm md:text-base font-black tracking-tight leading-none truncate uppercase ${theme.accent}`}>{title}</h3>
                </div>
                <div className="text-[#64748B] shrink-0 p-1">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>
            
            <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className={`p-3 md:p-4 ${theme.content} min-w-0 w-full`}>
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
        <div className="flex flex-col gap-1 w-full max-w-full min-w-0 bg-[#F9FAFB] p-1 font-serif">
            <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
            
            {/* Page Header Area - 前台模組品牌主色漸層 #EAC100 */}
            <div className="bg-gradient-to-r from-[#EAC100] via-[#FDE047] to-[#EAC100] p-1 rounded border border-[#C6A300] shadow-sm min-w-0 w-full mb-1">
                <div className="flex items-center gap-2">
                    <div className="bg-[#FFFFFF]/40 p-1 rounded shrink-0 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-[#111827]" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-black text-[#111827] tracking-tight leading-none font-sans truncate">
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
                colorIndex={5} // Indigo/Purple accent
            >
                <form onSubmit={(e) => handleSubmit(e)} className="space-y-3 min-w-0 w-full font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 min-w-0 w-full">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#3730A3] uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-[#4F46E5] rounded-sm shrink-0"></div>
                                {t('顯示姓名', 'NAME')}
                            </label>
                            <input 
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder={t('姓名 (預設為成員)', 'Name')}
                                className="w-full h-8 sm:h-10 px-3 rounded border border-[#D1D5DB] bg-[#FFFFFF] text-xs font-bold text-[#111827] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#3730A3] uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-[#4F46E5] rounded-sm shrink-0"></div>
                                {t('所屬單位', 'UNIT')}
                            </label>
                            <select 
                                value={authorUnit}
                                onChange={(e) => setAuthorUnit(e.target.value)}
                                className="w-full h-8 sm:h-10 px-3 rounded border border-[#D1D5DB] bg-[#FFFFFF] text-xs font-bold text-[#111827] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all appearance-none cursor-pointer"
                            >
                                <option value="">{tString('-- 請選擇單位 --', '-- Unit --')}</option>
                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#3730A3] uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-[#4F46E5] rounded-sm shrink-0"></div>
                                {t('留言分類', 'CATEGORY')}
                            </label>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-8 sm:h-10 px-3 rounded border border-[#D1D5DB] bg-[#FFFFFF] text-xs font-bold text-[#111827] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all appearance-none cursor-pointer"
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
                        <label className="text-[10px] font-bold text-[#3730A3] uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-3 bg-[#4F46E5] rounded-sm shrink-0"></div>
                            {t('留言內容', 'CONTENT')}
                        </label>
                        <textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('在此分享您的建議或問題...', 'Message...')}
                            className="w-full min-h-[80px] p-2.5 rounded border border-[#D1D5DB] bg-[#FFFFFF] text-xs font-medium text-[#111827] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all leading-relaxed"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1">
                        <div className="flex items-center gap-2 text-[#4338CA] shrink-0">
                            <HeartHandshake size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{t('感謝您的建議', 'Thank you for your voice.')}</span>
                        </div>
                        <button 
                            type="submit"
                            disabled={isSubmitting || cooldown > 0 || !newComment.trim() || !category}
                            className="w-full sm:w-auto h-8 sm:h-10 px-6 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-[#FFFFFF] text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 min-w-0 cursor-pointer shadow-sm"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-[#FFFFFF]/30 border-t-[#FFFFFF] rounded-full animate-spin" />
                            ) : <Send size={16} />}
                            <span className="truncate">{cooldown > 0 ? `${t('冷卻中', 'Wait')} (${cooldown}s)` : t('確認送出', 'Submit')}</span>
                        </button>
                    </div>
                </form>
            </SectionWrapper>

            {/* Action Row: Consolidated Search, Filters, Count & Sort - 兩欄式佈局與標題外壁對齊 */}
            <div className="bg-[#FFFFFF] border-2 border-[#E2E8F0] p-2.5 shadow-sm flex flex-col items-stretch gap-2.5 rounded font-sans min-w-0 w-full mt-1">
                {/* Search & Sort Row */}
                <div className="flex flex-col md:flex-row items-center gap-2 w-full min-w-0">
                    <div className="relative flex-1 min-w-0 group w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] group-focus-within:text-[#4F46E5]" />
                        <input
                            type="text"
                            placeholder="搜尋留言、姓名或單位..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full h-8 sm:h-10 pl-9 pr-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all truncate"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        <div className="relative flex-1 md:w-48 min-w-0 group">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] group-focus-within:text-[#059669]" />
                            <select
                                value={searchCategory}
                                onChange={(e) => setSearchCategory(e.target.value)}
                                className="w-full h-8 sm:h-10 pl-9 pr-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all appearance-none cursor-pointer truncate"
                            >
                                <option value="all">全部分類 (All Categories)</option>
                                <option value="網站問題">網站問題</option>
                                <option value="報名問題">報名問題</option>
                                <option value="收費問題">收費問題</option>
                                <option value="行程安排">行程安排</option>
                                <option value="教儀安排">教儀安排</option>
                                <option value="特別需求">特別需求</option>
                                <option value="改善意見">改善意見</option>
                                <option value="其他問題">其他問題</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                            </div>
                        </div>

                        <button 
                            onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
                            className="flex-1 md:flex-none h-8 sm:h-10 px-4 rounded bg-[#FFFFFF] border border-[#CBD5E1] text-[#334155] text-xs font-bold hover:bg-[#F8FAFC] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                        >
                            {sortOrder === 'oldest' ? <ChevronDown size={16} className="text-[#64748B]" /> : <ChevronUp size={16} className="text-[#64748B]" />}
                            <span className="whitespace-nowrap">{sortOrder === 'oldest' ? t('舊在前', 'Old First') : t('新在前', 'New First')}</span>
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between gap-1.5 px-1 pt-1 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest shrink-0">{t('留言總數', 'TOTAL')}</span>
                        <span className="text-[#4338CA] font-black text-sm">{activeCommentsCount}</span>
                        <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest shrink-0">{t('則', 'comments')}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                         <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-tighter">Real-time Sync Active</span>
                    </div>
                </div>
            </div>

            {/* Comment List Area */}
            <div className="space-y-1 mt-1 min-w-0 w-full font-sans">
                {filteredComments.length === 0 ? (
                    <div className="p-8 text-center text-[#94A3B8] bg-[#FFFFFF] rounded border-2 border-dashed border-[#CBD5E1] font-bold uppercase tracking-widest text-xs w-full">
                        {t('目前尚無留言紀錄', 'No records found')}
                    </div>
                ) : (
                    filteredComments.map((comment, index) => {
                        const replies = getReplies(comment.id);
                        const style = rainbowThemes[index % rainbowThemes.length];

                        return (
                            <div key={comment.id} className={`rounded border-2 shadow-sm overflow-hidden transition-all bg-[#FFFFFF] ${style.border} min-w-0 w-full mt-1`}>
                                <div className={`px-2.5 py-1.5 ${style.header} flex justify-between items-start border-b ${style.border} min-w-0 w-full`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-[11px] font-black border-2 border-[#FFFFFF] shadow-sm ${style.title}`}>
                                            {comment.author_name.slice(0, 1)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 leading-none min-w-0">
                                                {comment.author_unit && (
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFFFFF] shadow-sm shrink-0 ${style.accent}`}>
                                                        {comment.author_unit}
                                                    </span>
                                                )}
                                                <span className={`font-bold text-xs tracking-tight shrink-0 ${style.accent}`}>
                                                    {maskName(comment.author_name)}
                                                </span>
                                                {comment.category && (
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-current shadow-sm shrink-0 ${style.accent}`}>
                                                        {comment.category}
                                                    </span>
                                                )}
                                                {comment.is_admin_reply && (
                                                    <span className="bg-[#1E1B4B] text-[#FFFFFF] text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm tracking-tighter shrink-0">
                                                        內部回覆
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[9px] flex items-center gap-1 mt-1 font-semibold text-[#64748B] shrink-0">
                                                <Clock size={10} />
                                                {new Date(comment.created_at).toLocaleString('zh-TW', { hour12: false })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {(currentUser?.role === 'stake_admin' || currentUser?.role === 'engineer') && (
                                            <button 
                                                onClick={() => handleDelete(comment.id)}
                                                title="刪除"
                                                className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                                                    confirmingState?.id === comment.id && confirmingState?.type === 'delete'
                                                    ? 'bg-[#DC2626] text-[#FFFFFF]' 
                                                    : 'hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#DC2626]'
                                                }`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleMarkSpam(comment.id)}
                                            title="標記垃圾留言"
                                            className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                                                confirmingState?.id === comment.id && confirmingState?.type === 'spam'
                                                ? 'bg-[#D97706] text-[#FFFFFF]' 
                                                : 'hover:bg-[#FEF3C7] text-[#94A3B8] hover:text-[#D97706]'
                                            }`}
                                        >
                                            <AlertTriangle size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className={`p-3 ${style.content} min-w-0 w-full`}>
                                    <div className={`text-xs ${comment.is_spam ? 'text-[#EF4444] font-bold italic' : 'text-[#1E293B]'} whitespace-pre-wrap leading-relaxed font-medium mb-2`}>
                                        {comment.is_spam 
                                            ? t('comment.spam_hidden', '此留言已被標記為不適當內容') 
                                            : (currentLang === 'en' && comment.content_en ? comment.content_en : comment.content)}
                                    </div>
                                    
                                    {/* 顯示原文/翻譯切換 (如果有的話) */}
                                    {!comment.is_spam && comment.content_en && (
                                        <div className="mb-2 flex items-center gap-1 text-[9px] text-[#64748B] italic">
                                            <Globe size={10} />
                                            <span>{currentLang === 'en' ? 'Original: ' + comment.content : '英文翻譯: ' + comment.content_en}</span>
                                        </div>
                                    )}
                                    
                                    {!comment.is_spam && (
                                        <div className="flex justify-end items-center pt-2 border-t border-[#E2E8F0]/60">
                                            <button 
                                                onClick={() => {
                                                    setReplyTo(replyTo === comment.id ? null : comment.id);
                                                    setReplyContent('');
                                                }}
                                                className={`h-7 px-3.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm cursor-pointer ${
                                                    replyTo === comment.id 
                                                    ? 'bg-[#0F172A] text-[#FFFFFF] border-[#0F172A]' 
                                                    : `bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#3730A3] border-[#C7D2FE]`
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
                                                className="w-full p-2.5 text-xs border border-[#C7D2FE] rounded focus:ring-2 focus:ring-[#FFFBEB] focus:border-[#EAC100] transition-all bg-[#FFFFFF]"
                                                autoFocus
                                            />
                                            <div className="flex justify-end mt-1.5">
                                                <button 
                                                    type="submit"
                                                    disabled={isSubmitting || !replyContent.trim()}
                                                    className="bg-[#4F46E5] hover:bg-[#4338CA] text-[#FFFFFF] px-4 py-1.5 rounded text-[10px] font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Send size={12} />
                                                    {t('確認回覆', 'Send')}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {replies.length > 0 && (
                                        <div className="mt-2.5 space-y-2 border-l-2 border-[#CBD5E1] pl-3">
                                            {replies.map(reply => (
                                                <div key={reply.id} className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                                                    <div className="flex justify-between items-start mb-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-bold text-[10px] text-[#0F172A] shrink-0">{maskName(reply.author_name)}</span>
                                                            {reply.is_admin_reply && (
                                                                <span className="bg-[#1E1B4B] text-[#FFFFFF] text-[7px] px-1 py-0.5 rounded font-bold tracking-tighter shrink-0">STAFF</span>
                                                            )}
                                                            <span className="text-[8px] text-[#64748B] font-semibold shrink-0">
                                                                {new Date(reply.created_at).toLocaleTimeString('zh-TW', { hour12: false })}
                                                            </span>
                                                        </div>
                                                        {(currentUser?.role === 'stake_admin' || currentUser?.role === 'engineer') && (
                                                            <button 
                                                                onClick={() => handleDelete(reply.id)} 
                                                                title="刪除回覆"
                                                                className="text-[#94A3B8] hover:text-[#DC2626] transition-colors shrink-0 p-0.5 cursor-pointer"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-[#334155] leading-relaxed font-medium">
                                                        {currentLang === 'en' && reply.content_en ? reply.content_en : reply.content}
                                                    </p>
                                                    {currentLang === 'zh-TW' && reply.content_en && (
                                                        <p className="text-[8px] text-[#64748B] italic mt-1 border-t border-[#E2E8F0] pt-1 flex items-center gap-1">
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
            <div className="mt-1 w-full min-w-0 font-sans">
                <SectionWrapper
                    id="guidelines"
                    title={t('互動指引', 'Guidelines')}
                    icon={<HeartHandshake size={18}/>}
                    colorIndex={6} // Purple
                >
                    <div className="space-y-2.5">
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
                            {t('歡迎分享您在教儀、交通或行政上的寶貴意見：', 'Suggestions are welcome:')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="bg-[#FFFFFF] p-2.5 rounded border border-[#E9D5FF] flex flex-col items-center text-center group hover:bg-[#FAF5FF] transition-colors shadow-sm">
                                <div className="w-6 h-6 rounded-full bg-[#F3E8FF] flex items-center justify-center font-black text-[#6B21A8] shadow-sm mb-1 border border-[#E9D5FF] text-[10px]">1</div>
                                <span className="font-bold text-[#334155] text-[10px] leading-relaxed uppercase tracking-wide">
                                    {t('教儀程序建議', 'Ordinance Ideas')}
                                </span>
                            </div>
                            <div className="bg-[#FFFFFF] p-2.5 rounded border border-[#E9D5FF] flex flex-col items-center text-center group hover:bg-[#FAF5FF] transition-colors shadow-sm">
                                <div className="w-6 h-6 rounded-full bg-[#F3E8FF] flex items-center justify-center font-black text-[#6B21A8] shadow-sm mb-1 border border-[#E9D5FF] text-[10px]">2</div>
                                <span className="font-bold text-[#334155] text-[10px] leading-relaxed uppercase tracking-wide">
                                    {t('交通安排回饋', 'Transport Feedback')}
                                </span>
                            </div>
                            <div className="bg-[#FFFFFF] p-2.5 rounded border border-[#E9D5FF] flex flex-col items-center text-center group hover:bg-[#FAF5FF] transition-colors shadow-sm">
                                <div className="w-6 h-6 rounded-full bg-[#F3E8FF] flex items-center justify-center font-black text-[#6B21A8] shadow-sm mb-1 border border-[#E9D5FF] text-[10px]">3</div>
                                <span className="font-bold text-[#334155] text-[10px] leading-relaxed uppercase tracking-wide">
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
