
import React, { useState, useEffect } from 'react';
import { User, EventData, GlobalSettings } from '../types';
import { subscribeToEvents, logAction, subscribeToSettings } from '../services/sheetService';
import { Info, ArrowRight, BarChart3, Ban, MessageSquare } from 'lucide-react';
import PublicCommentTab from '../components/public/PublicCommentTab';
import { useI18n } from '../src/contexts/LanguageContext';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onGuestAccess: () => void;
  onGoToStats: () => void;
  onGoToInstructions: () => void;
  onGoToFeedback: () => void;
  initialShowComments?: boolean;
}

const Login: React.FC<LoginProps> = ({ onGuestAccess, onGoToStats, onGoToInstructions, onGoToFeedback, initialShowComments }) => {
  const { currentLang, t, tString } = useI18n();
  const lang = currentLang as 'zh' | 'en';
  
  const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
  const [showComments, setShowComments] = useState(initialShowComments || false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
      const unsubSettings = subscribeToSettings((s) => setSettings(s));
      const unsubEvents = subscribeToEvents((events) => {
          const active = events.find(e => e.is_active);
          setActiveEvent(active);
      });
      
      setShowComments(initialShowComments || false);

      return () => {
          unsubEvents();
          unsubSettings();
      };
  }, [initialShowComments]);

  const handleGuestEntry = () => {
      logAction('訪客', '登入', tString('stake.login.log_visitor_entry'));
      onGuestAccess();
  };

  const isUnavailable = !activeEvent || activeEvent.status === 'cancelled' || activeEvent.status === 'completed';

  if (showComments && activeEvent && settings) {
      return (
          <div className="min-h-[calc(100vh-64px)] bg-[#F0F4F8] p-4 pb-24">
              <div className="max-w-md mx-auto">
                <div className="mb-6 flex items-center gap-3">
                    <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 p-2 rounded shadow-sm">
                        <MessageSquare className="w-5 h-5 text-amber-950" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-amber-950">留言</h1>
                </div>
                <div className="bg-white rounded shadow-xl border-2 border-amber-300 overflow-hidden">
                    <PublicCommentTab activeEvent={activeEvent} settings={settings} lang={lang} />
                </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-full bg-[#F8F9FA] flex flex-col p-1 space-y-1 w-full max-w-full min-w-0">
      {/* Hero Section - Level 1 Gold Gradient - Rule 3.2 Space Maximization */}
      <section className="max-w-7xl mx-auto w-full min-w-0">
          <div className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 border-2 border-amber-400 rounded shadow-sm overflow-hidden animate-fade-in group">
              <div className="px-4 py-6 md:py-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-white/20 -z-0"></div>
                  <div className="relative z-10 space-y-2">
                      <div className="inline-block px-3 py-1 bg-amber-900 text-white text-[10px] font-black rounded uppercase tracking-widest mb-1">
                          {activeEvent ? activeEvent.event_date : t('stake.login.no_event', '尚無活動')}
                      </div>
                      <h1 className="text-xl md:text-3xl font-black text-amber-950 tracking-tight leading-tight px-2">
                          {activeEvent?.event_title || t('stake.login.default_event_title', '聖殿旅行團')}
                      </h1>
                  </div>
              </div>
              
              <div className="p-4 md:p-6 bg-white border-t-2 border-amber-400">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                          onClick={isUnavailable ? undefined : handleGuestEntry}
                          disabled={isUnavailable}
                          className={`
                            w-full rounded font-black transition-all shadow-sm flex items-center justify-center gap-3 group
                            h-12 px-6 text-base
                            ${isUnavailable 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-transparent' 
                                : 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 hover:brightness-105 active:scale-95 border-b-2 border-amber-700'}
                          `}
                      >
                          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                          <span>{isUnavailable ? t('stake.login.paused') : t('stake.login.register', '報名')}</span>
                      </button>
                      
                      <button
                          onClick={onGoToInstructions}
                          className="w-full h-12 px-6 text-base bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-amber-950 border-b-2 border-amber-700 rounded font-black hover:brightness-105 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
                      >
                          <Info size={20} className="text-amber-950" />
                          <span>{t('stake.login.instructions')}</span>
                      </button>

                      <button
                          onClick={onGoToStats}
                          className="w-full h-12 px-6 text-base bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-amber-950 border-b-2 border-amber-700 rounded font-black hover:brightness-105 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 group/btn"
                      >
                          <BarChart3 size={20} className="text-amber-950 group-hover/btn:scale-110 transition-transform" />
                          <span>查詢</span>
                      </button>

                      <button
                          onClick={onGoToFeedback}
                          className="w-full h-12 px-6 text-base bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-amber-950 border-b-2 border-amber-700 rounded font-black hover:brightness-105 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 group/btn"
                      >
                          <MessageSquare size={20} className="text-amber-950 group-hover/btn:scale-110 transition-transform" />
                          <span>留言</span>
                      </button>
                  </div>
              </div>
          </div>
      </section>

      {/* Latest News Announcement - Gold Header & Gray Content */}
      <section className="max-w-7xl mx-auto w-full min-w-0">
          <div className="bg-white border-2 border-amber-400 rounded shadow-sm overflow-hidden group hover:border-amber-500 transition-colors">
              <div className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 px-4 py-2 flex items-center gap-3 border-b-2 border-amber-400">
                  <Info className="w-4 h-4 text-amber-950" />
                  <h2 className="text-xs md:text-sm font-black text-amber-950 uppercase tracking-widest">最新消息</h2>
              </div>
              
              <div className="p-4 md:p-6 bg-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/50 rounded-full translate-x-16 -translate-y-16 -z-0"></div>
                  
                  <div className="relative z-10">
                      {settings?.latest_news ? (
                          <div className="text-slate-800 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              {settings.latest_news}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                              <Ban size={32} className="opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">目前尚無公告</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </section>

      <div className="mt-auto py-2"></div>
    </div>

  );
};

export default Login;
