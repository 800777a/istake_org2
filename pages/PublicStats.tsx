
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
 }
 
 const PublicStats: React.FC<PublicStatsProps> = ({ onGoHome, onGoRegister, onGoToInstructions, initialMessage, onClearMessage }) => {
   const { t } = useTranslation();
   const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
   const [registrations, setRegistrations] = useState<Registration[]>([]);
   
   // Tab State
   const [activeTab, setActiveTab] = useState<'list' | 'schedule' | 'service' | 'stats'>('list');
 
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
      return <div className="p-8 text-center text-gray-500">{t('stake.stats.no_data')}</div>;
  }

  return (
    <div className="p-2 md:p-6 max-w-6xl mx-auto space-y-4 animate-fade-in relative min-h-screen pb-24">
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

      {/* Header - No wrap on mobile */}
      <div className="flex flex-row justify-between items-center gap-2 mb-2 whitespace-nowrap">
          <div className="flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">{t('stake.stats.page_title')}</h2>
          </div>
          {/* Modified Date Display - No background */}
          <span className="text-base font-medium text-gray-500 truncate">{t('stake.stats.event_date_label')}{activeEvent.event_date}</span>
      </div>

     {/* Tab Navigation */}
     <div className="flex flex-wrap md:grid md:grid-cols-4 gap-2 md:gap-4 mb-4">
         <button 
             onClick={() => setActiveTab('list')}
             className={`flex-1 md:flex-none py-3 rounded-lg font-bold text-sm md:text-base flex flex-col md:flex-row items-center justify-center transition-all ${activeTab === 'list' ? 'bg-red-300 text-red-900 border-red-400 shadow-md scale-[1.02]' : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'}`}
         >
             <List className="w-5 h-5 md:mr-2 mb-1 md:mb-0" /> {t('stake.stats.tab_registration')}
         </button>
         <button 
             onClick={() => setActiveTab('schedule')}
             className={`flex-1 md:flex-none py-3 rounded-lg font-bold text-sm md:text-base flex flex-col md:flex-row items-center justify-center transition-all ${activeTab === 'schedule' ? 'bg-orange-300 text-orange-900 border-orange-400 shadow-md scale-[1.02]' : 'bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100'}`}
         >
             <CalendarCheck className="w-5 h-5 md:mr-2 mb-1 md:mb-0" /> {t('stake.stats.tab_schedule')}
         </button>
         <button 
             onClick={() => setActiveTab('service')}
             className={`flex-1 md:flex-none py-3 rounded-lg font-bold text-sm md:text-base flex flex-col md:flex-row items-center justify-center transition-all ${activeTab === 'service' ? 'bg-yellow-300 text-yellow-900 border-yellow-400 shadow-md scale-[1.02]' : 'bg-yellow-50 text-yellow-900 border border-yellow-200 hover:bg-yellow-100'}`}
         >
             <HeartHandshake className="w-5 h-5 md:mr-2 mb-1 md:mb-0" /> {t('stake.stats.tab_service')}
         </button>
         <button 
             onClick={() => setActiveTab('stats')}
             className={`flex-1 md:flex-none py-3 rounded-lg font-bold text-sm md:text-base flex flex-col md:flex-row items-center justify-center transition-all ${activeTab === 'stats' ? 'bg-green-300 text-green-900 border-green-400 shadow-md scale-[1.02]' : 'bg-green-50 text-green-900 border border-green-200 hover:bg-green-100'}`}
         >
             <BarChart3 className="w-5 h-5 md:mr-2 mb-1 md:mb-0" /> {t('stake.stats.tab_stats')}
         </button>
     </div>

      {/* Render Active Tab Component */}
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

      {/* Footer Actions - Fixed Bottom or Margin Top */}
      <div className="mt-8 mb-4 border-t pt-4">
          <div className="flex flex-row gap-2 md:gap-4 justify-between items-center">
              <button 
                  onClick={onGoToInstructions}
                  className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-lg shadow-sm hover:bg-red-200 transition-colors text-xs md:text-sm flex items-center justify-center touch-manipulation"
              >
                  <Info className="w-4 h-4 mr-1 md:mr-2" /> {t('stake.stats.btn_instructions')}
              </button>
              
              <button 
                  onClick={onGoHome}
                  className="flex-1 py-3 bg-green-100 text-green-700 font-bold rounded-lg shadow-sm hover:bg-green-200 transition-colors text-xs md:text-sm flex items-center justify-center touch-manipulation"
              >
                  <Home className="w-4 h-4 mr-1 md:mr-2" /> {t('stake.stats.btn_home')}
              </button>

              <button 
                  onClick={onGoRegister}
                  className="flex-1 py-3 bg-blue-100 text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-200 transition-colors text-xs md:text-sm flex items-center justify-center touch-manipulation"
              >
                  <ArrowRight className="w-4 h-4 mr-1 md:mr-2" /> {t('stake.stats.btn_register')}
              </button>
          </div>
      </div>
    </div>
  );
};

export default PublicStats;
