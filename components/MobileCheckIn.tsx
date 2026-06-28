import React, { useState, useMemo } from 'react';
import { Registration, RegStatus } from '../types';
import { Search, Filter, UserCheck, UserX, Bus } from 'lucide-react';

interface MobileCheckInProps {
  data: Registration[];
  onToggleCheckIn: (reg: Registration) => void;
  allowedBuses?: string[]; // 若有傳入，則顯示車次篩選
  title?: string;
}

const MobileCheckIn: React.FC<MobileCheckInProps> = ({ data, onToggleCheckIn, allowedBuses, title }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBus, setFilterBus] = useState<string>('all');
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);

  // 1. 整理出所有車次 (如果沒有傳入 allowedBuses，就從資料中抓)
  const busOptions = useMemo(() => {
    if (allowedBuses) return allowedBuses;
    const buses = new Set<string>();
    data.forEach(r => {
      if (r.bus_assigned) buses.add(r.bus_assigned);
    });
    return Array.from(buses).sort();
  }, [data, allowedBuses]);

  // 2. 篩選資料
  const filteredData = data.filter(r => {
    // 狀態必須正常
    if (r.status !== RegStatus.NORMAL) return false;
    
    // 搜尋 (姓名 或 電話)
    const matchSearch = r.name.includes(searchTerm) || (r.phone && r.phone.includes(searchTerm));
    if (!matchSearch) return false;

    // 車次篩選
    if (filterBus !== 'all') {
      if (filterBus === 'unassigned' && r.bus_assigned) return false;
      if (filterBus !== 'unassigned' && r.bus_assigned !== filterBus) return false;
    }

    // 只顯示未到
    if (showUncheckedOnly && r.is_checked_in) return false;

    return true;
  });

  // 3. 計算統計
  const totalCount = filteredData.length;
  const checkedInCount = filteredData.filter(r => r.is_checked_in).length;
  const progress = totalCount === 0 ? 0 : Math.round((checkedInCount / totalCount) * 100);

  return (
    <div className="bg-gray-100 min-h-[500px] pb-20">
      {/* Header & Stats */}
      <div className="bg-blue-800 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                {title || '現場點名'}
            </h3>
            <div className="text-sm bg-blue-700 px-2 py-1 rounded">
                已到: {checkedInCount} / {totalCount}
            </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-900 rounded-full h-2.5 mb-4">
            <div className="bg-green-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="搜尋姓名或電話..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded text-gray-800 text-sm focus:outline-none"
                />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {/* 車次 Filter */}
                <select 
                    value={filterBus}
                    onChange={e => setFilterBus(e.target.value)}
                    className="bg-blue-700 text-white text-sm border-none rounded px-3 py-2 outline-none"
                >
                    <option value="all">全部車次</option>
                    {busOptions.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="unassigned">未分車</option>
                </select>

                {/* Status Toggle */}
                <button 
                    onClick={() => setShowUncheckedOnly(!showUncheckedOnly)}
                    className={`text-sm px-3 py-2 rounded whitespace-nowrap transition-colors flex items-center ${showUncheckedOnly ? 'bg-yellow-500 text-white' : 'bg-blue-700 text-blue-200'}`}
                >
                    <Filter className="w-3 h-3 mr-1" />
                    {showUncheckedOnly ? '只看未到' : '顯示全部'}
                </button>
            </div>
        </div>
      </div>

      {/* Check-in List */}
      <div className="p-4 space-y-3">
          {filteredData.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                  沒有符合條件的成員
              </div>
          ) : (
              filteredData.map(reg => (
                  <div 
                    key={reg.reg_id}
                    onClick={() => onToggleCheckIn(reg)}
                    className={`
                        relative p-4 rounded-lg shadow-sm border-l-4 transition-all duration-200 cursor-pointer active:scale-95 select-none
                        ${reg.is_checked_in ? 'bg-white border-green-500' : 'bg-white border-gray-300'}
                    `}
                  >
                      <div className="flex justify-between items-center">
                          <div>
                              <div className="flex items-center">
                                  <span className={`text-lg font-bold ${reg.is_checked_in ? 'text-green-800' : 'text-gray-800'}`}>
                                      {reg.name}
                                  </span>
                                  {reg.bus_assigned && (
                                      <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center">
                                          <Bus className="w-3 h-3 mr-1" />
                                          {reg.bus_assigned}
                                      </span>
                                  )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                  {reg.unit} • {reg.trip_type}
                              </div>
                              {reg.boarding_place && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                      上車: {reg.boarding_place}
                                  </div>
                              )}
                          </div>

                          <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center transition-colors
                              ${reg.is_checked_in ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}
                          `}>
                              {reg.is_checked_in ? <UserCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                          </div>
                      </div>
                      
                      {/* 轉帳未繳費警示 */}
                      {!reg.is_paid && reg.amount_due > 0 && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" title="尚未繳費"></div>
                      )}
                  </div>
              ))
          )}
      </div>
      
      {/* Simple Legend */}
      <div className="fixed bottom-0 w-full bg-white border-t p-2 text-xs text-gray-500 flex justify-around items-center">
          <div className="flex items-center"><span className="w-3 h-3 bg-green-500 mr-1 block"></span> 已報到</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-gray-300 mr-1 block"></span> 未報到</div>
          <div className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1 block"></span> 未繳費</div>
      </div>
    </div>
  );
};

export default MobileCheckIn;