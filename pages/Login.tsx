
import React, { useState, useEffect } from 'react';
import { User, EventData, GlobalSettings } from '../types';
import { subscribeToEvents, logAction, subscribeToSettings } from '../services/sheetService';
import { Info, ArrowRight, BarChart3, Ban, MessageSquare, Bus } from 'lucide-react';
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
      // 屬性與參數需使用 tString
      logAction('訪客', '登入', tString('stake.login.log_visitor_entry'));
      onGuestAccess();
  };

  const isUnavailable = !activeEvent || activeEvent.status === 'cancelled' || activeEvent.status === 'completed';

  if (showComments && activeEvent && settings) {
      return (
          <div className="min-h-[calc(100vh-64px)] bg-[#F0F4F8] p-4 pb-24">
              <div className="max-w-md mx-auto">
                <div className="mb-6 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900">留言</h1>
                </div>
                <div className="bg-white rounded-none md:rounded-[8px] shadow-xl border border-indigo-100 overflow-hidden">
                    <PublicCommentTab activeEvent={activeEvent} settings={settings} lang={lang} />
                </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-full bg-[#F0F4F8] flex flex-col">
      {/* Hero Section */}
      <section className="bg-white border-b border-indigo-100 pt-16 pb-20 px-6 md:px-12 text-center overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] bg-indigo-50/40 rounded-full -translate-y-1/2 -z-10 blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] md:leading-[1.1] lg:leading-[1.1]">
                  <span className="text-indigo-600 block mb-3 drop-shadow-sm">{activeEvent ? activeEvent.event_date : ''}</span>
                  <span className="block px-4">{activeEvent?.event_title || t('stake.login.default_event_title', '聖殿旅行團')}</span>
              </h1>
              
              <div className="pt-10 flex flex-wrap items-center justify-center gap-3 md:gap-5 px-4">
                  <button
                      onClick={isUnavailable ? undefined : handleGuestEntry}
                      disabled={isUnavailable}
                      className={`
                        w-full sm:w-auto rounded-none md:rounded-[8px] font-black transition-all shadow-xl flex items-center justify-center gap-3 group
                        h-12 px-8 text-base md:h-11 md:px-6 md:text-sm lg:h-10 lg:px-8 lg:text-sm
                        ${isUnavailable 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 shadow-indigo-200'}
                      `}
                  >
                      <span>{isUnavailable ? t('stake.login.paused') : t('stake.login.register')}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                  
                  <button
                      onClick={onGoToInstructions}
                      className="w-full sm:w-auto h-12 px-6 text-base md:h-11 md:px-5 md:text-sm lg:h-10 lg:px-8 lg:text-sm bg-white text-slate-700 border-2 border-slate-200 rounded-none md:rounded-[8px] font-black hover:bg-slate-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                  >
                      <Info size={20} className="text-indigo-500" />
                      <span>{t('stake.login.instructions')}</span>
                  </button>

                  <button
                      onClick={onGoToStats}
                      className="w-full sm:w-auto h-12 px-6 text-base md:h-11 md:px-5 md:text-sm lg:h-10 lg:px-8 lg:text-sm bg-blue-50 text-blue-700 border-2 border-blue-100 rounded-none md:rounded-[8px] font-black hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 group/btn"
                  >
                      <BarChart3 size={20} className="group-hover/btn:scale-110 transition-transform" />
                      <span>前往查詢</span>
                  </button>

                  <button
                      onClick={onGoToFeedback}
                      className="w-full sm:w-auto h-12 px-6 text-base md:h-11 md:px-5 md:text-sm lg:h-10 lg:px-8 lg:text-sm bg-amber-50 text-amber-700 border-2 border-amber-100 rounded-none md:rounded-[8px] font-black hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 group/btn"
                  >
                      <MessageSquare size={20} className="group-hover/btn:scale-110 transition-transform" />
                      <span>查看留言</span>
                  </button>
              </div>
          </div>
      </section>

      {/* Latest News Announcement */}
      <section className="px-6 md:px-12 py-12 bg-white/50 border-t border-indigo-50">
          <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-600 p-2 rounded-lg shadow-sm">
                      <Info className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">最新消息</h2>
              </div>
              
              <div className="bg-white border-2 border-red-100 rounded-none md:rounded-[8px] p-6 md:p-8 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 rounded-full translate-x-16 -translate-y-16 -z-0"></div>
                  
                  <div className="relative z-10">
                      {settings?.latest_news ? (
                          <div className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                              {settings.latest_news}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                              <Ban size={48} className="opacity-20" />
                              <p className="text-xs font-bold uppercase tracking-widest">目前尚無公告</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </section>

      <div className="mt-auto py-8"></div>
    </div>
  );
};

export default Login;
