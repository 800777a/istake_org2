
import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Plus } from 'lucide-react';
import { RegistrationMemberInput, EventData, GlobalSettings, OrdinanceItem } from '../../../types';
import MemberItem from './MemberItem';

interface MemberSectionProps {
    members: RegistrationMemberInput[];
    lang?: 'zh' | 'en';
    activeEvent: EventData;
    settings: GlobalSettings;
    enabledIdentities: string[];
    enabledTripTypes: string[];
    years: number[];
    months: number[];
    days: number[];
    proxyOptions: OrdinanceItem[];
    livingOptions: OrdinanceItem[];
    lockCountdown: number;
    personalInfoList: import('../../../types').PersonalInfo[];
    primaryUnit: string;
    primaryName: string;
    isPrimaryNameFinished?: boolean;
    onAddMember: () => void;
    onUpdateMember: (tempId: string, field: keyof RegistrationMemberInput, value: any) => void;
    onUpdateBirthday: (tempId: string, field: 'year' | 'month' | 'day', val: number) => void;
    onDeleteMember: (member: RegistrationMemberInput) => void;
    calculateMemberPrice: (m: RegistrationMemberInput) => number;
    errorField?: string | null;
}

const MemberSection: React.FC<MemberSectionProps> = ({
    members,
    lang,
    activeEvent,
    settings,
    enabledIdentities,
    enabledTripTypes,
    years,
    months,
    days,
    proxyOptions,
    livingOptions,
    lockCountdown,
    personalInfoList,
    primaryUnit,
    primaryName,
    isPrimaryNameFinished,
    onAddMember,
    onUpdateMember,
    onUpdateBirthday,
    onDeleteMember,
    calculateMemberPrice,
    errorField
}) => {
    const { t, tString } = useI18n();

    return (
        <div className="mb-2 space-y-1 min-w-0">
            {/* Level 1 Title - Rainbow Depth Level 1 (Orange) - 調整為 1/3 寬度且置中 */}
            <div className="bg-orange-200 px-3 py-2.5 md:px-4 md:py-3 rounded border-b-4 border-orange-200 shadow-sm flex items-center justify-center min-w-0 gap-2 w-full md:w-1/3 mx-auto mb-4">
                <h3 className="font-black text-orange-800 text-sm md:text-base flex items-center gap-2 uppercase tracking-tight truncate">
                    {t('stake.registration.form.members_section')} ({members.length} {t('人', 'Persons')})
                </h3>
            </div>

            <div className="space-y-1 min-w-0">
                {members.map((member, index) => (
                    <MemberItem 
                        key={member.temp_id}
                        member={member}
                        index={index}
                        lang={lang}
                        activeEvent={activeEvent}
                        settings={settings}
                        enabledIdentities={enabledIdentities}
                        enabledTripTypes={enabledTripTypes}
                        years={years}
                        months={months}
                        days={days}
                        proxyOptions={proxyOptions}
                        livingOptions={livingOptions}
                        personalInfoList={personalInfoList}
                        primaryUnit={primaryUnit}
                        primaryName={primaryName}
                        onUpdate={onUpdateMember}
                        onUpdateBirthday={onUpdateBirthday}
                        onDelete={onDeleteMember}
                        calculatePrice={calculateMemberPrice}
                        stopCancellation={activeEvent?.stop_cancellation}
                        forceShowPersonalInfo={index === 0 && isPrimaryNameFinished}
                        errorField={errorField}
                    />
                ))}
            </div>
            
            <div className="mt-4 flex justify-center pb-2 min-w-0">
                <button 
                    type="button" 
                    onClick={onAddMember} 
                    disabled={lockCountdown > 0}
                    className={`h-11 md:h-12 w-full md:w-1/3 rounded font-black transition-all flex items-center justify-center text-sm md:text-base shadow-md border-2 active:scale-95 ${lockCountdown > 0 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 hover:brightness-95'}`}
                >
                    <Plus className="w-5 h-5 mr-2" /> {t('stake.registration.form.add_member_btn')}
                </button>
            </div>
        </div>
    );
};

export default MemberSection;
