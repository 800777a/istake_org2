
import React from 'react';
import { useTranslation } from 'react-i18next';
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

const RatingSection: React.FC<RatingSectionProps> = ({
    ratings, isOpen, onToggle, sortKey, isDesc, onSort
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = React.useState('');

    const filtered = ratings.filter(r => r.plate.includes(search) || r.driver1Name.includes(search) || r.eventDate.includes(search));

    return (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
                className="px-6 py-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
                        <Star size={20} />
                    </div>
                    <h2 className="font-black text-xl uppercase tracking-tighter italic text-gray-900">{t('bus.rating_history')}</h2>
                </div>
                {isOpen ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>

            {isOpen && (
                <div className="p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input 
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t('bus.search_rating_placeholder')}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(r => (
                            <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-yellow-200 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{r.plate}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{r.eventDate} · {r.driver1Name}</p>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={14} className={s <= (r.manualAdjustment || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                        ))}
                                    </div>
                                </div>
                                {r.remarks && (
                                    <div className="flex gap-2 p-2 bg-white rounded-lg border border-gray-100 italic text-xs text-gray-600">
                                        <MessageSquare size={14} className="shrink-0 text-gray-400" />
                                        <p>{r.remarks}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 col-span-full">{t('common.no_data')}</p>}
                    </div>
                </div>
            )}
        </section>
    );
};

export default RatingSection;
