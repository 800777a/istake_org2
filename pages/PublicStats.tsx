
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
     onRoleChange?: (role: any, subTab?: string) => void;
 }
 
 const PublicStats: React.FC<PublicStatsProps> = ({ onGoHome, onGoRegister, onGoToInstructions, initialMessage, onClearMessage, activeTab: propsActiveTab, onTabChange, onRoleChange }) => {
   const { t, tString } = useI18n();

   const tabs = [
       { id: 'list', label: t('stake.stats.tab_registration'), icon: List },
       { id: 'schedule', label: t('stake.stats.tab_schedule'), icon: CalendarCheck },
       { id: 'service', label: t('stake.stats.tab_service'), icon: HeartHandshake },
       { id: 'stats', label: t('stake.stats.tab_stats'), icon: BarChart3 },
   ];
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

  const cycleTab = (direction: 'next' | 'prev') => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    
    setActiveTab(tabs[nextIndex].id as any);
    // Smooth scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleCycleEvent = (e: any) => {
      if (e.detail && e.detail.direction) {
        cycleTab(e.detail.direction);
      }
    };
    window.addEventListener('ais-cycle-tabs', handleCycleEvent);
    return () => window.removeEventListener('ais-cycle-tabs', handleCycleEvent);
  }, [activeTab]);

  const handlePanEnd = (event: any, info: any) => {
    // Only trigger swipe on mobile/tablet
    if (window.innerWidth >= 1024) return;
    
    const threshold = 100; // Increase threshold to avoid accidental swipes while scrolling tables
    const velocityThreshold = 0.5;
    
    // Check if horizontal movement is significant and dominant
    if (Math.abs(info.offset.x) > threshold && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (info.offset.x > 0) {
        cycleTab('prev');
      } else {
        cycleTab('next');
      }
    }
  };

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
                const valid = allRegs.filter(r => r.status !== RegStatus.CANCELLED && r.status !== RegStatus.DELETED);
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


  return (
    <div className="w-full max-w-full bg-[#F8F9FA] animate-fade-in flex flex-col min-w-0">
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

      {/* Header Area - Level 1 Gold Gradient - Rule 3.2 Compliance */}
      <div className="w-full max-w-7xl mx-auto p-1 min-w-0">
        <div className="px-1 py-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 shadow-md rounded w-full overflow-hidden min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 min-w-0 w-full">
                <div className="space-y-0 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="bg-white/10 p-1 md:p-1.5 rounded backdrop-blur-md border border-amber-600/20 shrink-0">
                            {activeTab === 'list' && <List className="w-5 h-5 md:w-6 md:h-6" />}
                            {activeTab === 'schedule' && <CalendarCheck className="w-5 h-5 md:w-6 md:h-6" />}
                            {activeTab === 'service' && <HeartHandshake className="w-5 h-5 md:w-6 md:h-6" />}
                            {activeTab === 'stats' && <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h1 className="text-base md:text-lg lg:text-xl font-black tracking-tight truncate">
                              {tabs.find(t => t.id === activeTab)?.label}
                          </h1>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto p-1 flex-1 flex flex-col min-w-0">
        {/* Content Area - Rule 3.2 Space Maximization */}
        <motion.div 
            onPanEnd={handlePanEnd}
            className="mt-1 pb-1 w-full max-w-full min-w-0 flex-1 flex flex-col"
        >
            <div className="bg-white border-none shadow-none rounded md:border md:rounded md:border-slate-200 md:shadow-sm min-h-[500px] w-full max-w-full min-w-0 flex-1 flex flex-col overflow-visible">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-0 w-full max-w-full min-w-0 flex-1 flex flex-col"
                    >
                        {activeTab === 'list' && (
                            <PublicRegistrationTab 
                                registrations={registrations} 
                                settings={settings} 
                                eventStatus={activeEvent.status}
                                activeEvent={activeEvent}
                                eventStats={eventStats}
                                busConfigs={activeEvent.busConfigs}
                                onRoleChange={onRoleChange}
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
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Subtle Mobile Register CTA */}
            <div className="mt-12 flex flex-col md:flex-row gap-6 items-center justify-center border-t border-slate-200 pt-12">
                <button 
                    onClick={onGoRegister}
                    className="w-full md:w-auto h-10 md:h-11 lg:h-12 px-10 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 font-black rounded shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 group hover:-translate-y-0.5 active:translate-y-0 text-xs md:text-sm lg:text-base border-b-2 border-amber-700"
                >
                    <span>報名</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicStats;
