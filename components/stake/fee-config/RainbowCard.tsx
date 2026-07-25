import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface RainbowStyle {
  bg: string;
  text: string;
  border: string;
  hover: string;
  header: string;
  title: string;
  level1: string;
}

export const rainbowStyles: RainbowStyle[] = [
  { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', hover: 'hover:bg-red-100', header: 'bg-red-100', title: 'bg-red-200 text-red-900', level1: 'bg-red-200' }, // 紅
  { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', hover: 'hover:bg-orange-100', header: 'bg-orange-100', title: 'bg-orange-200 text-orange-900', level1: 'bg-orange-200' }, // 橙
  { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hover: 'hover:bg-amber-100', header: 'bg-amber-100', title: 'bg-amber-200 text-amber-900', level1: 'bg-amber-200' }, // 黃
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', header: 'bg-emerald-100', title: 'bg-emerald-200 text-emerald-900', level1: 'bg-emerald-200' }, // 綠
  { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', hover: 'hover:bg-blue-100', header: 'bg-blue-100', title: 'bg-blue-200 text-blue-900', level1: 'bg-blue-200' }, // 藍
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', hover: 'hover:bg-indigo-100', header: 'bg-indigo-100', title: 'bg-indigo-200 text-indigo-900', level1: 'bg-indigo-200' }, // 靛
  { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', hover: 'hover:bg-purple-100', header: 'bg-purple-100', title: 'bg-purple-200 text-purple-900', level1: 'bg-purple-200' }, // 紫
];

interface RainbowCardProps {
  title: string;
  icon: React.ReactNode;
  colorIndex: number;
  extra?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  noPadding?: boolean; // 新增：可選，移除內部 Padding 以適應全寬表格
}

export const RainbowCard: React.FC<RainbowCardProps> = ({ 
  title, 
  icon, 
  colorIndex, 
  extra, 
  isExpanded: propExpanded,
  onToggle: propToggle,
  children,
  noPadding = false
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(true);
  
  const isExpanded = propExpanded ?? internalExpanded;
  const onToggle = propToggle ?? (() => setInternalExpanded(!internalExpanded));
  
  const style = rainbowStyles[colorIndex % rainbowStyles.length];
  
  return (
    <div 
      className={`mb-6 shadow-sm overflow-hidden border rounded-lg transition-all ${style.bg} ${style.border} md:rounded-lg rounded-none md:border border-none md:shadow-sm shadow-none`}
    >
      {/* Level 1: Block Title Row */}
      <div 
        className={`w-full flex justify-between items-center cursor-pointer select-none transition-colors ${style.title} px-4 py-3 md:px-6 md:py-4`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-1.5 md:p-2 bg-white/40 rounded-lg flex items-center justify-center border border-white/20">
             {icon}
          </div>
          <h3 className="font-black text-sm md:text-lg tracking-tight">
            {title}
          </h3>
        </div>
        <div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Level 2: Action/Extra Row */}
            {extra && (
              <div className={`px-4 py-2 md:px-6 md:py-3 flex justify-end gap-3 border-b ${style.border} ${style.header}`}>
                {extra}
              </div>
            )}

            {/* Level 4: Content Area */}
            <div className={`${noPadding ? 'p-0' : 'p-1 md:p-6'}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
