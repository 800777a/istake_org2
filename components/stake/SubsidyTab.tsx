import React, { useMemo, useState } from 'react';
import { Registration, GlobalSettings, RegStatus, EventData } from '../../types';
import { useI18n } from '../../src/contexts/LanguageContext';
import { FileText, CheckCircle, ChevronDown, ChevronUp, Users, DollarSign, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExportChoiceModal from '../ExportChoiceModal';
import Toast from '../Toast';
import { maskName } from '../../utils/maskUtils';

interface SubsidyTabProps {
  registrations: Registration[];
  settings: GlobalSettings;
  currentEvent: EventData;
  onRefresh: () => void;
  onPushToEditor?: (content: string) => void;
}

const SubsidyTab: React.FC<SubsidyTabProps> = ({ registrations, settings, currentEvent, onRefresh, onPushToEditor }) => {
  const { t, tString } = useI18n();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const billingConfig = settings.billingConfig;

  const subsidyData = useMemo(() => {
    if (!billingConfig) return [];
    const activeRegs = registrations.filter(r => r.status === RegStatus.NORMAL);
    const subsidyIdentities = new Set<string>();
    (billingConfig.identityPricings || []).forEach(p => {
        if (p.hasSubsidy !== false) subsidyIdentities.add(p.identity);
    });

    return activeRegs.filter(r => subsidyIdentities.has(r.identity_type)).map(r => {
        const unit = r.unit || '';
        let baseFee = billingConfig.baseFees['GLOBAL'] || 0;
        let foundInGroup = false;
        if (billingConfig.unitGroups) {
            for (const [groupName, units] of Object.entries(billingConfig.unitGroups)) {
                if ((units as string[]).includes(unit)) {
                    if (billingConfig.baseFees[groupName] !== undefined) {
                        baseFee = billingConfig.baseFees[groupName];
                        foundInGroup = true;
                        break;
                    }
                }
            }
        }
        if (!foundInGroup && billingConfig.baseFees[unit] !== undefined) baseFee = billingConfig.baseFees[unit];
        const subsidyAmount = baseFee - r.amount_due;
        return { ...r, baseFee, subsidyAmount: subsidyAmount > 0 ? subsidyAmount : 0 };
    }).filter(r => r.subsidyAmount > 0);
  }, [registrations, billingConfig]);

  const identityStats = useMemo(() => {
    const stats: Record<string, { count: number, totalAmount: number }> = {};
    (billingConfig?.identityPricings || []).filter(p => p.hasSubsidy !== false).forEach(p => {
        stats[p.identity] = { count: 0, totalAmount: 0 };
    });
    subsidyData.forEach(r => {
        if (!stats[r.identity_type]) stats[r.identity_type] = { count: 0, totalAmount: 0 };
        stats[r.identity_type].count += 1;
        stats[r.identity_type].totalAmount += r.subsidyAmount;
    });
    return Object.entries(stats).map(([identity, data]) => ({ identity, ...data })).filter(s => s.count > 0);
  }, [subsidyData, billingConfig]);

  const totals = useMemo(() => {
      return identityStats.reduce((acc, curr) => ({
          count: acc.count + curr.count,
          totalAmount: acc.totalAmount + curr.totalAmount
      }), { count: 0, totalAmount: 0 });
  }, [identityStats]);

  const handleExportTxt = (shouldMask: boolean, toEditor: boolean = false) => {
    if (!subsidyData.length) return;
    const eventDate = currentEvent.event_date || '';
    const eventName = currentEvent.event_title || '聖殿旅行團';
    let content = `${eventDate}\n${eventName} 補助名單\n`;
    content += `補助金額 合計 ${totals.totalAmount.toLocaleString()}元\n\n`;
    const billingUnits = (settings.billingConfig?.units || []).map(u => u.shortName);
    const sortedUnits = [...billingUnits].sort(new Intl.Collator('zh-Hant-TW-u-co-stroke').compare);

    sortedUnits.forEach(unit => {
        const unitSubs = subsidyData.filter(r => r.unit === unit);
        if (unitSubs.length === 0) return;
        content += `${unit}\n姓名 行程 補助金額 身份\n`;
        unitSubs.forEach(s => content += `${maskName(s.name, shouldMask)} ${s.trip_type} ${s.subsidyAmount} ${s.identity_type}\n`);
        content += `\n`;
    });
    content += `網址 https://istake.org/\n如需服務, 系統可留言, 感謝您.`;

    if (toEditor && onPushToEditor) {
        onPushToEditor(content);
        setMsg('已傳送至文書處理');
    } else {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `補助名單.txt`; link.click();
        setMsg('補助名單下載成功');
    }
    setIsExportModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-fade-in relative text-sm">
      {msg && <Toast message={msg} type="success" onClose={() => setMsg(null)} />}
      
      {/* Main Header */}
      <div className="bg-indigo-900 text-white p-6 rounded shadow-lg flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded border border-white/10">
            <DollarSign className="text-blue-300" size={24} />
          </div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">
            {t('subsidy.title', '補助款計算平台')}
          </h2>
        </div>
        <div className="flex justify-end items-center gap-3">
          <p className="hidden md:block text-xs text-indigo-200 font-medium uppercase tracking-wider opacity-60 mr-auto">Automated Subsidy Analytics & Billing</p>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="h-10 px-6 bg-blue-600 text-white rounded text-xs font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <FileText size={16} /> 導出補助名單
          </button>
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded"><Users size={24} /></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">總補助人數</div>
                  <div className="text-2xl font-bold text-slate-900">{totals.count} <span className="text-sm font-medium text-slate-400">人</span></div>
              </div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded"><Activity size={24} /></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">補助項目類別</div>
                  <div className="text-2xl font-bold text-slate-900">{identityStats.length} <span className="text-sm font-medium text-slate-400">類</span></div>
              </div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded"><DollarSign size={24} /></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">補助總金額</div>
                  <div className="text-2xl font-bold text-rose-600">${totals.totalAmount.toLocaleString()}</div>
              </div>
          </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
        <div 
          className="w-full px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100"
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded"><CheckCircle size={18} /></div>
             <h3 className="font-bold text-slate-900 text-base">補助計算明細 (SUBSIDY AUDIT)</h3>
          </div>
          <div className="text-slate-400">{isHeaderExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
        </div>

        <AnimatePresence>
            {isHeaderExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">身份類別</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">補助人數</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">補助金額</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {identityStats.map((item, idx) => (
                                    <tr key={item.identity} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className="px-6 py-4 font-bold text-slate-900">{item.identity}</td>
                                        <td className="px-6 py-4 text-right font-bold text-indigo-600">{item.count.toLocaleString()} 人</td>
                                        <td className="px-6 py-4 text-right font-bold text-rose-600">${item.totalAmount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-indigo-50/50 font-bold">
                                    <td className="px-6 py-4 text-indigo-900">總計 (TOTAL)</td>
                                    <td className="px-6 py-4 text-right text-indigo-900">{totals.count.toLocaleString()} 人</td>
                                    <td className="px-6 py-4 text-right text-indigo-900">${totals.totalAmount.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <ExportChoiceModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={(mask, toEditor) => handleExportTxt(mask, toEditor)} />
    </div>
  );
};

export default SubsidyTab;
