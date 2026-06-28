
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EventData, FinalReportData } from '../types';
import { X, Printer, TrendingUp, DollarSign, AlertCircle, Award } from 'lucide-react';

interface FinalReportModalProps {
  event: EventData;
  onClose: () => void;
}

const FinalReportModal: React.FC<FinalReportModalProps> = ({ event, onClose }) => {
  const { t } = useTranslation();
  const report = event.finalReport;

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in">
      <div className="bg-white w-[210mm] max-w-full h-[90vh] rounded-xl shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header (No print) */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center shrink-0 print:hidden">
            <h2 className="text-xl font-bold flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-400" />
                {t('report.final_report_title', '活動結案報告 (Final Report)')}
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 text-sm flex items-center"
                >
                    <Printer className="w-4 h-4 mr-1" /> {t('common.print', '列印')}
                </button>
                <button onClick={onClose} className="hover:bg-gray-700 rounded-full p-1"><X className="w-5 h-5"/></button>
            </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-10 print:p-0 print:overflow-visible">
            <div className="text-center mb-10 border-b-2 border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('report.temple_trip_report', '聖殿之旅 成果報告書')}</h1>
                <p className="text-gray-500 font-mono">Event ID: {event.event_id}</p>
                <p className="text-gray-600 mt-2">{t('common.event_date', '活動日期')}：{event.event_date}</p>
                <p className="text-gray-400 text-xs mt-1">{t('report.generated_at', '報告生成時間')}：{new Date(report.generatedAt).toLocaleString()}</p>
            </div>

            {/* Executive Summary */}
            <div className="mb-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-3 text-lg border-b border-blue-200 pb-2">{t('report.executive_summary', '執行摘要 (Executive Summary)')}</h3>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {report.aiSummary || t('report.no_ai_summary', '無 AI 摘要內容。')}
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Attendance */}
                <div className="border rounded-lg p-5 shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> {t('report.attendance_metrics', '出席成效')}
                    </h4>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-gray-500">{t('report.actual_attendance', '實際出席')}</span>
                        <span className="text-2xl font-bold">{report.totalAttendance} {t('common.label.people', '人')}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-gray-500">{t('report.attendance_rate', '出席率')}</span>
                        <span className={`text-xl font-bold ${report.attendanceRate >= 90 ? 'text-green-600' : 'text-orange-500'}`}>
                            {report.attendanceRate}%
                        </span>
                    </div>
                </div>

                {/* Satisfaction */}
                <div className="border rounded-lg p-5 shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-yellow-500" /> {t('report.satisfaction_metrics', '滿意度指標')}
                    </h4>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-gray-500">{t('report.avg_satisfaction', '平均評分 (5分制)')}</span>
                        <span className="text-2xl font-bold text-yellow-600">{report.avgSatisfaction}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-gray-500">{t('report.incident_count', '突發事件數')}</span>
                        <span className={`text-xl font-bold ${report.incidentCount === 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {report.incidentCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="border rounded-lg p-6 shadow-sm mb-8">
                <h4 className="font-bold text-gray-700 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" /> {t('report.financial_summary', '財務結算')}
                </h4>
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 text-gray-600">{t('report.total_revenue', '總收入 (Revenue)')}</td>
                            <td className="py-2 text-right font-medium text-green-700">+${report.totalRevenue.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 text-gray-600">{t('report.total_expense', '總支出 (Expense)')}</td>
                            <td className="py-2 text-right font-medium text-red-700">-${report.totalExpense.toLocaleString()}</td>
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="py-3 font-bold text-gray-800 pl-2">{t('report.net_balance', '最終結餘 (Net Balance)')}</td>
                            <td className={`py-3 text-right font-bold text-lg pr-2 ${report.netBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                ${report.netBalance.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t flex justify-between text-sm text-gray-500">
                <div>
                    <p>{t('report.approved_by', '報告核准：')}_________________</p>
                </div>
                <div>
                    <p>{t('common.date', '日期')}：_________________</p>
                </div>
            </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; z-index: 9999; }
          .fixed * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .overflow-y-auto { overflow: visible !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
};

export default FinalReportModal;
