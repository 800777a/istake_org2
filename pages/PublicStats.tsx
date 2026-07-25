
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../src/contexts/LanguageContext';
import { subscribeToEvents, subscribeToRegistrations, subscribeToSettings } from '../services/sheetService';
import { EventData, Registration, RegStatus, GlobalSettings } from '../types';
import { BarChart3, AlertCircle, X, Info, Home, ArrowRight, List, CalendarCheck, HeartHandshake, MessageSquare } from 'lucide-react';
import PaymentInfoModal from '../components/PaymentInfoModal';
 
 // Import New Tab Components
 import PublicRegistrationTab from '../components/public/PublicRegistrationTab';
 import PublicScheduleTab from '../components/public/PublicScheduleTab';
 import PublicServiceTab from '../components/public/PublicServiceTab';
 import PublicAnalysisTab from '../components/public/PublicAnalysisTab';
 import PublicCommentTab from '../components/public/PublicCommentTab';
 import { TripType } from '../types';
 
 import { useStats } from '../hooks/useStats';
 
 interface PublicStatsProps {
     onGoHome?: () => void;
     onGoRegister?: () => void;
     onGoToInstructions?: () => void;
     initialMessage?: string;
     onClearMessage?: () => void;
     activeTab?: 'list' | 'schedule' | 'service' | 'stats';
     onTabChange?: (tab: 'list' | 'schedule' | 'service' | 'stats') => void;
 }
 
 const PublicStats: React.FC<PublicStatsProps> = ({ onGoHome, onGoRegister, onGoToInstructions, initialMessage, onClearMessage, activeTab: propsActiveTab, onTabChange }) => {
   const { t, tString } = useI18n();
   const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
   const [registrations, setRegistrations] = useState<Registration[]>([]);
   
   // Tab State - Internal fallback if not provided
   const [internalActiveTab, setInternalActiveTab] = useState<'list' | 'schedule' | 'service' | 'stats'>('list');
   const activeTab = propsActiveTab || internalActiveTab;
   const setActiveTab = onTabChange || setInternalActiveTab;
 
   const [settings, setSettings] = useState<GlobalSettings | null>(null);
  // Removed showRules state as we now redirect
  
  const [selectedPaymentReg, setSelectedPaymentReg] = useState<Registration | null>(null);

  const { vehicleStats: eventStats } = useStats(activeEvent, registrations);

  useEffect(() => {
    let unsubRegs = () => {};
    const unsubSettings = subscribeToSettings((s) => setSettings(s));
    const unsubEvents = subscribeToEvents((events) => {
        setAllEvents(events);
        const active = events.find(e => e.is_active);
        setActiveEvent(active);
        
        if (active) {
            if (unsubRegs) unsubRegs(); 
            unsubRegs = subscribeToRegistrations(active.event_id, (allRegs) => {
                const valid = allRegs.filter(r => r.status === RegStatus.NORMAL);
                setRegistrations(valid);
            });
        }
    });

    return () => {
        unsubSettings();
        unsubEvents();
        unsubRegs();
    };
  }, []);

  if (!activeEvent || !settings) {
      return <div className="p-8 text-center text-slate-500 bg-[#F0F4F8] min-h-screen">{t('stake.stats.no_data')}</div>;
  }

  const tabs = [
    { id: 'list', label: t('stake.stats.tab_registration'), icon: List },
    { id: 'schedule', label: t('stake.stats.tab_schedule'), icon: CalendarCheck },
    { id: 'service', label: t('stake.stats.tab_service'), icon: HeartHandshake },
    { id: 'stats', label: t('stake.stats.tab_stats'), icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F0F4F8] animate-fade-in">
      {selectedPaymentReg && (
          <PaymentInfoModal 
              key={`${selectedPaymentReg.reg_id}-${Date.now()}`}
              currentReg={selectedPaymentReg}
              allRegistrations={registrations}
              settings={settings}
              onClose={() => setSelectedPaymentReg(null)}
              onRefresh={() => {}}
          />
      )}

      {/* Header Area - Indigo-900 Structural Element */}
      <div className="px-4 py-8 md:px-8 bg-indigo-900 text-white shadow-lg w-full max-w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto">
              <div className="space-y-2">
                  <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20">
                          <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
                            {activeTab === 'list' ? '報名' : 
                             activeTab === 'schedule' ? '行程' : 
                             activeTab === 'service' ? '服務' : 
                             activeTab === 'stats' ? '統計' : 
                             t('stake.stats.page_title')}
                        </h1>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] opacity-80">
                            {t('stake.stats.subtitle', 'Public Inquiry & Analytics')}
                        </p>
                      </div>
                  </div>
              </div>
              
              <div className="flex flex-col items-start md:items-end gap-1">
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 md:px-4 lg:px-8 -mt-6 w-full">
        {/* Content Area */}
        <div className="mt-2 md:mt-6 pb-6 w-full max-w-full min-w-0">
            <div className="bg-white border-none shadow-none rounded-none md:border md:rounded-[8px] md:border-slate-200 md:shadow-sm overflow-hidden min-h-[500px] w-full max-w-full min-w-0">
                <div className="p-0 md:p-4 lg:p-6 w-full max-w-full min-w-0">
                    {activeTab === 'list' && (
                        <PublicRegistrationTab 
                            registrations={registrations} 
                            settings={settings} 
                            eventStatus={activeEvent.status}
                            activeEvent={activeEvent}
                            eventStats={eventStats}
                            busConfigs={activeEvent.busConfigs}
                        />
                    )}

                    {activeTab === 'schedule' && (
                        <PublicScheduleTab activeEvent={activeEvent} />
                    )}

                    {activeTab === 'service' && (
                        <PublicServiceTab activeEvent={activeEvent} settings={settings} registrations={registrations} />
                    )}

                    {activeTab === 'stats' && (
                        <PublicAnalysisTab 
                            activeEvent={activeEvent} 
                            registrations={registrations} 
                            settings={settings} 
                            allEvents={allEvents}
                        />
                    )}
                </div>
            </div>

            {/* Subtle Mobile Register CTA */}
            <div className="mt-12 flex flex-col md:flex-row gap-6 items-center justify-center border-t border-slate-200 pt-12">
                <div className="text-center md:text-left">
                    <p className="text-base md:text-lg text-slate-900 font-bold">還沒報名本次聖殿旅行團嗎？</p>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">立即點擊按鈕，預約您的靈性之旅</p>
                </div>
                <button 
                    onClick={onGoRegister}
                    className="w-full md:w-auto h-10 md:h-11 lg:h-12 px-10 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 text-xs md:text-sm lg:text-base"
                >
                    <span>立即前往報名</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStats;
