
import React from 'react';
import { useI18n } from '../../../contexts/LanguageContext';
import { Star, Search, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { BusRatingRecord } from '../../../../types';

interface RatingSectionProps {
    ratings: BusRatingRecord[];
    isOpen: boolean;
    onToggle: () => void;
    sortKey: string;
    isDesc: boolean;
    onSort: (key: string) => void;
}

const METRIC_LABELS = [
    '準時到達', '安全駕駛', '行車平穩', '沒有抽煙', '服務禮貌',
    '車況良好', '車輛清潔', '車內氣味', '設備正常'
];

const RatingSection: React.FC<RatingSectionProps> = ({
    ratings, isOpen, onToggle, sortKey, isDesc, onSort
}) => {
    const { t, tString } = useI18n();
    const [search, setSearch] = React.useState('');

    const filtered = ratings.filter(r => r.plate.includes(search) || r.driver1Name.includes(search) || r.eventDate.includes(search));

    return (
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {/* Block Title Row */}
            <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100 bg-slate-50/30"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded-lg text-white">
                        <Star className="fill-amber-400 text-amber-400" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none">{t('bus.rating_history')}</h2>
                    </div>
                </div>
                <div className={`p-1.5 rounded-md transition-all ${isOpen ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </div>
            </div>

            {isOpen && (
                <div className="p-6 space-y-6">
                    {/* Action Row: Right Aligned Controls */}
                    <div className="flex justify-end">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={tString('bus.search_rating_placeholder', '搜尋車牌、司機或日期...')}
                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-medium transition-all text-slate-900 focus:bg-white focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(r => (
                            <div key={r.id} className="p-5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:border-indigo-500 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-900 leading-none mb-2">{r.plate}</h4>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-500 font-bold uppercase tracking-wider">{r.eventDate}</span>
                                            <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[9px] text-indigo-600 font-bold uppercase tracking-wider">{r.driver1Name}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={14} className={s <= (r.manualAdjustment || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mb-4">
                                    {(r.d1Metrics || []).map((m, i) => (
                                        <div key={i} className={`text-[8px] px-1 py-1.5 rounded border text-center font-bold transition-all ${m ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-300 line-through'}`}>
                                            {METRIC_LABELS[i] || `Item ${i+1}`}
                                        </div>
                                    ))}
                                </div>

                                {r.remarks && (
                                    <div className="flex gap-2 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 italic">
                                        <MessageSquare size={14} className="shrink-0 text-indigo-400" />
                                        <p>{r.remarks}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-slate-400 col-span-full border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <Star size={48} className="mx-auto mb-3 text-slate-200" />
                                <p className="font-bold text-base tracking-wider uppercase">{t('common.no_data')}</p>
                                <p className="text-xs mt-1 opacity-60">目前無評價記錄符合搜尋條件</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default RatingSection;
