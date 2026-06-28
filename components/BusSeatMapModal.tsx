
import React, { useState } from 'react';
import { Registration, IdentityType } from '../types';
import { X, User, Disc } from 'lucide-react';
import { assignSeat } from '../services/sheetService';

interface BusSeatMapModalProps {
  busName: string;
  assignedPassengers: Registration[]; // Already on this bus
  onClose: () => void;
  onRefresh: () => void; // Trigger parent refresh
}

const BusSeatMapModal: React.FC<BusSeatMapModalProps> = ({ busName, assignedPassengers, onClose, onRefresh }) => {
  // passengers who are assigned to this bus but have no seat_no
  const unseated = assignedPassengers.filter(p => !p.seat_no);
  
  // map of seatNo -> passenger
  const seatedMap = new Map<string, Registration>();
  assignedPassengers.forEach(p => {
      if (p.seat_no) seatedMap.set(p.seat_no, p);
  });

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Layout Config: 11 rows of 4, + last row 5 seats = 45 + driver
  // Left: A, B. Right: C, D.
  // Rows 1-10
  const rows = Array.from({ length: 10 }, (_, i) => i + 1);
  const lastRow = 11; // 5 seats

  const handleSeatClick = (seatNo: string) => {
      setSelectedSeat(seatNo);
  };

  const handleAssign = (regId: string) => {
      if (selectedSeat) {
          assignSeat(regId, selectedSeat);
          onRefresh(); // Refresh data locally via parent
          setSelectedSeat(null);
      }
  };

  const handleUnseat = (regId: string) => {
      assignSeat(regId, ''); // Clear seat
      onRefresh();
      setSelectedSeat(null);
  };

  const getSeatColor = (reg: Registration) => {
      // Color by identity
      if (reg.identity_type === IdentityType.ADULT || reg.identity_type === IdentityType.SINGLE) return 'bg-blue-200 border-blue-400 text-blue-800';
      if (reg.identity_type === IdentityType.SENIOR) return 'bg-purple-200 border-purple-400 text-purple-800'; // Priority
      if (reg.identity_type === IdentityType.YOUTH || reg.identity_type === IdentityType.STUDENT) return 'bg-green-200 border-green-400 text-green-800';
      return 'bg-gray-200 border-gray-400 text-gray-800';
  };

  const renderSeat = (seatNo: string) => {
      const passenger = seatedMap.get(seatNo);
      const isSelected = selectedSeat === seatNo;

      return (
          <div 
              onClick={() => handleSeatClick(seatNo)}
              className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all relative
                  ${isSelected ? 'ring-4 ring-yellow-400 z-10' : ''}
                  ${passenger ? getSeatColor(passenger) : 'bg-white border-gray-300 hover:border-blue-400'}
              `}
          >
              <span className="text-[10px] absolute top-0.5 right-1 opacity-50">{seatNo}</span>
              {passenger ? (
                  <div className="text-center overflow-hidden w-full px-0.5">
                      <div className="text-[10px] font-bold truncate">{passenger.name}</div>
                  </div>
              ) : (
                  <div className="text-gray-200 text-xs">空</div>
              )}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 p-4 animate-fade-in">
      <div className="bg-white w-[900px] max-w-full h-[90vh] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Map */}
        <div className="flex-1 bg-gray-100 p-4 overflow-y-auto flex flex-col items-center border-r">
            <div className="mb-4 flex items-center justify-between w-full max-w-md px-4">
                <h2 className="text-xl font-bold text-gray-800">{busName} 座位表</h2>
                <div className="flex gap-2 text-xs">
                    <div className="flex items-center"><span className="w-3 h-3 bg-blue-200 border border-blue-400 mr-1 block"></span>成人</div>
                    <div className="flex items-center"><span className="w-3 h-3 bg-purple-200 border border-purple-400 mr-1 block"></span>長輩</div>
                    <div className="flex items-center"><span className="w-3 h-3 bg-white border border-gray-300 mr-1 block"></span>空位</div>
                </div>
            </div>

            {/* Bus Body */}
            <div className="bg-white border-4 border-gray-300 rounded-[2rem] p-6 w-full max-w-[320px] shadow-lg relative min-h-[600px]">
                {/* Driver */}
                <div className="flex justify-end mb-8 border-b-2 border-dashed border-gray-200 pb-4">
                    <div className="w-12 h-12 rounded-full border-4 border-gray-400 flex items-center justify-center bg-gray-200 text-gray-500 font-bold">
                        <Disc className="w-6 h-6 animate-spin-slow" />
                    </div>
                </div>

                {/* Seats Grid */}
                <div className="space-y-3">
                    {/* Rows 1-10 */}
                    {rows.map(r => (
                        <div key={r} className="flex justify-between items-center">
                            <div className="flex space-x-2">
                                {renderSeat(`${(r-1)*4 + 1}`)} {/* A */}
                                {renderSeat(`${(r-1)*4 + 2}`)} {/* B */}
                            </div>
                            <div className="text-gray-300 text-xs w-6 text-center">{r}</div>
                            <div className="flex space-x-2">
                                {renderSeat(`${(r-1)*4 + 3}`)} {/* C */}
                                {renderSeat(`${(r-1)*4 + 4}`)} {/* D */}
                            </div>
                        </div>
                    ))}
                    
                    {/* Row 11 (Back) */}
                    <div className="flex justify-between items-center pt-4">
                        {renderSeat('41')}
                        {renderSeat('42')}
                        {renderSeat('43')}
                        {renderSeat('44')}
                        {renderSeat('45')}
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Sidebar / Interaction Panel */}
        <div className="w-full md:w-80 bg-white flex flex-col h-1/3 md:h-full">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">乘客操作區</h3>
                <button onClick={onClose} className="hover:bg-gray-100 p-1 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {selectedSeat ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                            <div className="text-sm text-yellow-800 mb-1">目前選取座位</div>
                            <div className="text-4xl font-bold text-gray-800">{selectedSeat}</div>
                        </div>

                        {seatedMap.has(selectedSeat) ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 border rounded-lg bg-blue-50">
                                    <User className="w-12 h-12 mx-auto text-blue-500 mb-2" />
                                    <div className="font-bold text-lg">{seatedMap.get(selectedSeat)?.name}</div>
                                    <div className="text-sm text-gray-500">{seatedMap.get(selectedSeat)?.unit}</div>
                                </div>
                                <button 
                                    onClick={() => handleUnseat(seatedMap.get(selectedSeat)!.reg_id)}
                                    className="w-full py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-bold"
                                >
                                    取消座位 (移回待劃位)
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h4 className="font-bold text-gray-600 mb-2 flex items-center text-sm">
                                    選擇此車次未劃位乘客 ({unseated.length}人)
                                </h4>
                                {unseated.length === 0 ? (
                                    <div className="text-gray-400 text-sm text-center py-4">無待劃位乘客</div>
                                ) : (
                                    <div className="space-y-2">
                                        {unseated.map(p => (
                                            <button 
                                                key={p.reg_id}
                                                onClick={() => handleAssign(p.reg_id)}
                                                className="w-full text-left p-2 border rounded hover:bg-blue-50 flex justify-between items-center group"
                                            >
                                                <span>{p.name}</span>
                                                <span className="text-xs text-gray-400 group-hover:text-blue-500">{p.unit}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-10">
                        <p>請點選左側座位以進行操作</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 text-xs text-gray-500 text-center">
                尚未劃位：{unseated.length} 人 / 已劃位：{seatedMap.size} 人
            </div>
        </div>

      </div>
    </div>
  );
};

export default BusSeatMapModal;
