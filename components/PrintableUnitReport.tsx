import React from 'react';
import { Registration, EventData } from '../types';
import { Printer, X } from 'lucide-react';

interface PrintableUnitReportProps {
  unit: string;
  event: EventData;
  registrations: Registration[];
  onClose: () => void;
}

const PrintableUnitReport: React.FC<PrintableUnitReportProps> = ({ unit, event, registrations, onClose }) => {
  const totalAmount = registrations.reduce((sum, r) => sum + r.amount_due, 0);
  const paidAmount = registrations.filter(r => r.is_paid).reduce((sum, r) => sum + r.amount_due, 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center py-10">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-lg relative print:w-full print:shadow-none print:p-0">
        
        {/* Actions - Hidden in Print */}
        <div className="absolute top-4 right-4 flex space-x-2 print:hidden">
            <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center shadow"
            >
                <Printer className="w-4 h-4 mr-2" /> 列印
            </button>
            <button 
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 flex items-center shadow"
            >
                <X className="w-4 h-4 mr-1" /> 關閉
            </button>
        </div>

        {/* Report Content */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold border-b-2 border-black inline-block pb-1 px-4">聖殿旅行團 單位財務報表</h1>
            <div className="mt-2 text-gray-700 font-medium">
                <div>活動日期：{event.event_date}</div>
                <div>申請單位：{unit}</div>
                <div>列印時間：{new Date().toLocaleDateString()}</div>
            </div>
        </div>

        {/* Summary Box */}
        <div className="border border-black p-4 mb-6 flex justify-between text-sm">
            <div>
                <p>報名總人數：<span className="font-bold">{registrations.length}</span> 人</p>
                <p>應繳總金額：<span className="font-bold">${totalAmount.toLocaleString()}</span></p>
            </div>
            <div className="text-right">
                <p>已收金額：<span className="font-bold text-green-700">${paidAmount.toLocaleString()}</span></p>
                <p>未收金額：<span className="font-bold text-red-700">${unpaidAmount.toLocaleString()}</span></p>
            </div>
        </div>

        {/* Detail Table */}
        <table className="w-full border-collapse border border-black text-sm mb-8">
            <thead>
                <tr className="bg-gray-100 text-center">
                    <th className="border border-black p-1 w-10">序號</th>
                    <th className="border border-black p-1">姓名</th>
                    <th className="border border-black p-1">身分</th>
                    <th className="border border-black p-1">行程</th>
                    <th className="border border-black p-1">應繳金額</th>
                    <th className="border border-black p-1">繳費狀態</th>
                    <th className="border border-black p-1">備註</th>
                </tr>
            </thead>
            <tbody>
                {registrations.map((reg, index) => (
                    <tr key={reg.reg_id} className="text-center">
                        <td className="border border-black p-1">{index + 1}</td>
                        <td className="border border-black p-1 text-left px-2">{reg.name}</td>
                        <td className="border border-black p-1">{reg.identity_type}</td>
                        <td className="border border-black p-1">{reg.trip_type}</td>
                        <td className="border border-black p-1 text-right px-2">${reg.amount_due}</td>
                        <td className="border border-black p-1">{reg.is_paid ? '已繳' : '未繳'}</td>
                        <td className="border border-black p-1 text-left px-1 text-xs">{reg.admin_note}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-10">
            <div className="border-t border-black pt-2 text-center">
                <p className="text-sm mb-8">主教 / 分會會長 簽核</p>
            </div>
            <div className="border-t border-black pt-2 text-center">
                <p className="text-sm mb-8">文書 / 財務書記 簽核</p>
            </div>
        </div>
        
        <div className="text-xs text-center text-gray-500 mt-10">
            此報表由聖殿旅行團管理系統自動產生
        </div>
      </div>
    </div>
  );
};

export default PrintableUnitReport;