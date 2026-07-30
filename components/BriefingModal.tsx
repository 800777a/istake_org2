
import React from 'react';
import { Registration, EventData, ScheduleItem, DietaryType, IdentityType, OrdinanceType } from '../types';
import { X, Printer, MapPin, Clock, Calendar, CheckCircle, Utensils, Bus } from 'lucide-react';

interface BriefingModalProps {
  registration: Registration;
  event: EventData;
  onClose: () => void;
}

const BriefingModal: React.FC<BriefingModalProps> = ({ registration, event, onClose }) => {
  const schedule = event.schedule || [];

  // Helper to determine checklist items
  const getChecklist = () => {
      const items = ['身分證 / 健保卡 (保險查驗用)', '個人常備藥品', '禦寒外套 (遊覽車上較冷)'];
      
      // Temple Recommend
      if (registration.identity_type === IdentityType.ADULT || registration.identity_type === IdentityType.SENIOR || registration.identity_type === IdentityType.SINGLE) {
          items.unshift('有效聖殿推薦書');
      } else if (registration.identity_type === IdentityType.YOUTH || registration.identity_type === IdentityType.STUDENT) {
          items.unshift('聖殿推薦書 (限用途)');
      }

      // Temple Clothes
      if (registration.ordinance_type !== OrdinanceType.NONE) {
          items.push('聖殿服裝 (白襯衫/白洋裝)');
      }

      // Money
      if (registration.payment_method === '現金' && !registration.is_paid) {
          items.push(`報名費現金 $${registration.amount_due}`);
      }

      return items;
  };

  const getIcon = (icon: string) => {
      switch(icon) {
          case 'bus': return <Bus className="w-4 h-4" />;
          case 'temple': return <div className="w-4 h-4 border-2 border-current rounded-t-full"></div>; // Custom temple-ish icon
          case 'food': return <Utensils className="w-4 h-4" />;
          case 'home': return <MapPin className="w-4 h-4" />;
          default: return <Clock className="w-4 h-4" />;
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-[500px] max-w-full rounded shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-blue-800 text-white p-6 relative shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-blue-700 rounded-full p-1 transition-colors">
                <X className="w-6 h-6" />
            </button>
            <div className="text-center">
                <h2 className="text-xl font-bold tracking-wider mb-1">行前通知單</h2>
                <div className="text-blue-200 text-sm">{event.event_date} 聖殿旅行團</div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
            
            {/* 1. Personal Info Card */}
            <div className="bg-gray-50 rounded p-4 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <div className="text-lg font-bold text-gray-800">{registration.name}</div>
                        <div className="text-xs text-gray-500">{registration.unit}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{registration.bus_assigned || '--'}</div>
                        <div className="text-xs text-gray-400">搭乘車次</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-red-500" />
                        <div>
                            <div className="text-xs text-gray-400">上車地點</div>
                            <div className="font-medium text-gray-700">{registration.boarding_place}</div>
                        </div>
                    </div>
                    <div className="bg-white p-2 rounded border flex items-center">
                        <Utensils className="w-4 h-4 mr-2 text-green-500" />
                        <div>
                            <div className="text-xs text-gray-400">餐點</div>
                            <div className="font-medium text-gray-700">{registration.dietary_preference || '葷食'}</div>
                        </div>
                    </div>
                </div>
                
                {registration.is_staff && (
                    <div className="mt-3 bg-purple-100 text-purple-800 text-center text-xs py-1 rounded font-bold border border-purple-200">
                        工作人員職務：{registration.staff_role || '一般同工'}
                    </div>
                )}
            </div>

            {/* 2. Schedule Timeline */}
            <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    當日行程
                </h3>
                <div className="relative border-l-2 border-blue-100 ml-3 space-y-6 pb-2">
                    {schedule.map((item, idx) => (
                        <div key={item.id} className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded-full flex items-center justify-center text-[8px] text-blue-800">
                                {/* Dot */}
                            </div>
                            <div className="flex items-start">
                                <span className="font-mono text-sm font-bold text-blue-600 w-12 pt-0.5">{item.time}</span>
                                <div>
                                    <div className="font-bold text-gray-800 text-sm flex items-center">
                                        {item.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {schedule.length === 0 && <div className="text-gray-400 text-sm italic pl-6">行程尚未公佈</div>}
                </div>
            </div>

            {/* 3. Checklist */}
            <div className="bg-yellow-50 rounded p-4 border border-yellow-100">
                <h3 className="font-bold text-yellow-800 mb-3 flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    攜帶物品檢核
                </h3>
                <ul className="space-y-2">
                    {getChecklist().map((item, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-700">
                            <div className="w-4 h-4 border-2 border-yellow-400 rounded mr-2 flex-shrink-0"></div>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-end shrink-0">
            <button 
                onClick={() => window.print()}
                className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 flex items-center"
            >
                <Printer className="w-4 h-4 mr-2" /> 列印 / 截圖
            </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; z-index: 9999; }
          .fixed * { visibility: visible; }
          .fixed .overflow-y-auto { overflow: visible; height: auto; max-height: none; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default BriefingModal;
