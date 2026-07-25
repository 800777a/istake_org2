
import React from 'react';
import { Registration, EventData } from '../types';
import { Printer, X, Bus, CheckSquare } from 'lucide-react';

interface BusManifestProps {
  busName: string;
  event: EventData;
  registrations: Registration[];
  onClose: () => void;
}

const BusManifest: React.FC<BusManifestProps> = ({ busName, event, registrations, onClose }) => {
  // Sort by boarding place then name
  const sortedRegs = [...registrations].sort((a, b) => {
      const placeA = a.boarding_place || '';
      const placeB = b.boarding_place || '';
      if (placeA !== placeB) return placeA.localeCompare(placeB);
      return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 overflow-y-auto flex justify-center py-10">
      <div className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-lg relative print:w-full print:shadow-none print:p-0">
        
        {/* Actions - Hidden in Print */}
        <div className="absolute top-4 right-4 flex space-x-2 print:hidden">
            <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center shadow"
            >
                <Printer className="w-4 h-4 mr-2" /> 列印名冊
            </button>
            <button 
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 flex items-center shadow"
            >
                <X className="w-4 h-4 mr-1" /> 關閉
            </button>
        </div>

        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold">{busName} 領車人名冊</h1>
                <p className="text-gray-600 mt-2">
                    活動日期：<span className="font-mono font-bold text-black">{event.event_date}</span>
                </p>
                <p className="text-gray-600">
                    總人數：<span className="font-bold text-black">{sortedRegs.length}</span> 人
                </p>
            </div>
            <div className="text-right text-sm">
                <div className="mb-2">領車人簽名：________________</div>
                <div>發車時間：________________</div>
            </div>
        </div>

        {/* Legend */}
        <div className="mb-4 text-xs text-gray-500 flex space-x-4 print:hidden">
            <span>* 此名冊依「上車地點」排序，方便各站點名。</span>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-sm">
            <thead>
                <tr className="bg-gray-100 text-center">
                    <th className="border border-black p-2 w-12">序號</th>
                    <th className="border border-black p-2">姓名</th>
                    <th className="border border-black p-2">單位</th>
                    <th className="border border-black p-2 w-32">上車地點</th>
                    <th className="border border-black p-2 w-32">聯絡電話</th>
                    <th className="border border-black p-2 w-16">去程</th>
                    <th className="border border-black p-2 w-16">回程</th>
                    <th className="border border-black p-2">備註</th>
                </tr>
            </thead>
            <tbody>
                {sortedRegs.map((reg, index) => (
                    <tr key={reg.reg_id} className="text-center">
                        <td className="border border-black p-2">{index + 1}</td>
                        <td className="border border-black p-2 text-left font-bold">{reg.name}</td>
                        <td className="border border-black p-2">{reg.unit}</td>
                        <td className="border border-black p-2">{reg.boarding_place}</td>
                        <td className="border border-black p-2 font-mono text-gray-700">{reg.phone || '-'}</td>
                        <td className="border border-black p-2"><div className="w-4 h-4 border border-gray-400 mx-auto"></div></td>
                        <td className="border border-black p-2"><div className="w-4 h-4 border border-gray-400 mx-auto"></div></td>
                        <td className="border border-black p-2 text-left text-xs text-gray-500">{reg.admin_note}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-center text-gray-400">
            聖殿旅行團管理系統 • 自動產生
        </div>
      </div>
    </div>
  );
};

export default BusManifest;
