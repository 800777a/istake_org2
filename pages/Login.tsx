
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
  initialShowComments?: boolean;
}

const Login: React.FC<LoginProps> = ({ onGuestAccess, onGoToStats, onGoToInstructions, initialShowComments }) => {
  const { currentLang, t, tString } = useI18n();
  const lang = currentLang as 'zh' | 'en';
  
  const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showComments, setShowComments] = useState(initialShowComments || false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // V405: Note that the custom i18n system currently uses key-value strings. 
  // For arrays, we use a fallback or specific keys.
  const quotes = [
    tString('stake.login.quote_1') || 'Faith is the substance of things hoped for.',
    tString('stake.login.quote_2') || 'The temple is the house of the Lord.',
    tString('stake.login.quote_3') || 'Seek learning, even by study and also by faith.'
  ];

  useEffect(() => {
      const unsubSettings = subscribeToSettings((s) => setSettings(s));
      const unsubEvents = subscribeToEvents((events) => {
          const active = events.find(e => e.is_active);
          setActiveEvent(active);
      });
      
      setQuoteIndex(Math.floor(Math.random() * quotes.length));

      if (initialShowComments) {
          setShowComments(true);
      }

      return () => {
          unsubEvents();
          unsubSettings();
      };
  }, [initialShowComments, quotes.length]);

  const handleGuestEntry = () => {
      // 屬性與參數需使用 tString
      logAction('訪客', '登入', tString('stake.login.log_visitor_entry'));
      onGuestAccess();
  };

  const renderStatus = () => {
      if (!activeEvent) return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{t('stake.login.no_event')}</span>;
      
      let statusContent: React.ReactNode = null;
      let statusColor = '';

      switch (activeEvent.status) {
          case 'confirmed': 
              statusContent = t('stake.login.event_confirmed'); 
              statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200'; 
              break;
          case 'cancelled': 
              statusContent = t('stake.login.event_cancelled'); 
              statusColor = 'bg-red-100 text-red-700 border-red-200'; 
              break;
          case 'completed': 
              statusContent = t('stake.login.event_completed'); 
              statusColor = 'bg-gray-100 text-gray-700 border-gray-200'; 
              break;
          default: 
              statusContent = t('stake.login.open_for_reg'); 
              statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
      }

      return (
          <div className="flex flex-col items-center animate-fade-in mb-6 mt-2">
              <span className={`px-4 py-1.5 rounded-full text-base font-bold border shadow-sm ${statusColor}`}>
                  {statusContent}
              </span>
          </div>
      );
  };

  const isUnavailable = !activeEvent || activeEvent.status === 'cancelled' || activeEvent.status === 'completed';
  const currentQuote = quotes[quoteIndex];

  if (showComments && activeEvent && settings) {
      return (
          <div className="min-h-screen bg-slate-50 p-4 pb-24">
              <div className="max-w-md mx-auto">
                <button onClick={() => setShowComments(false)} className="mb-4 text-slate-600 font-bold underline">{t('stake.login.back_btn')}</button>
                <PublicCommentTab activeEvent={activeEvent} settings={settings} lang={lang} />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50 pb-24">
      <div className="w-full max-w-md relative">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-white/50 relative">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300"></div>

                <div className="p-10 md:p-12">
                    <div className="text-center">
                        <div className="flex flex-col justify-center items-center gap-1 mb-4">
                            <div className="text-2xl text-gray-700 tracking-widest mb-1">{t('stake.login.welcome_title')}</div>
                            <h1 className="text-xl text-gray-700 tracking-tight flex flex-wrap items-center justify-center gap-2">
                                <span>{activeEvent ? activeEvent.event_date : ''}</span>
                                <span>{activeEvent?.event_title || t('stake.login.default_event_title')}</span>
                            </h1>
                        </div>
                        
                        {renderStatus()}

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={isUnavailable ? undefined : handleGuestEntry}
                                disabled={isUnavailable}
                                className={`flex flex-col items-center justify-center font-bold px-2 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs ${
                                    isUnavailable 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                    : 'text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 hover:from-amber-400 hover:to-yellow-600'
                                }`}
                            >
                                <ArrowRight className="w-8 h-8 mb-2" />
                                {isUnavailable ? t('stake.login.paused') : t('stake.login.register')}
                            </button>
                            <button
                                onClick={onGoToInstructions}
                                className="flex flex-col items-center justify-center text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 hover:from-amber-400 hover:to-yellow-600 font-bold px-2 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs"
                            >
                                <Info className="w-8 h-8 mb-2 text-slate-800" />
                                {t('stake.login.instructions')}
                            </button>
                            <button
                                onClick={onGoToStats}
                                className="flex flex-col items-center justify-center text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 hover:from-amber-400 hover:to-yellow-600 font-bold px-2 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs"
                            >
                                <BarChart3 className="w-8 h-8 mb-2 text-slate-800" />
                                {t('stake.login.search')}
                            </button>
                            <button
                                onClick={() => setShowComments(true)}
                                className="flex flex-col items-center justify-center text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 hover:from-amber-400 hover:to-yellow-600 font-bold px-2 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs"
                            >
                                <MessageSquare className="w-8 h-8 mb-2 text-slate-800" />
                                {t('stake.login.comments')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-gray-400 italic font-serif text-center leading-relaxed">"{currentQuote}"</p>
                            {/* Legacy language switcher removed as it's now in the header */}
                        </div>
                    </div>
                </div>
          </div>
      </div>
    </div>
  );
};

export default Login;
