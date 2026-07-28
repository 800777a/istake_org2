
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
        <div className="mb-4 space-y-2 min-w-0">
            <div className="bg-orange-200 px-3 py-3 md:px-6 md:py-4 rounded border-2 border-orange-300 shadow-sm flex items-center justify-center min-w-0 gap-2">
                <h3 className="font-black text-orange-900 text-sm md:text-lg flex items-center gap-2 uppercase tracking-tighter truncate">
                    {t('stake.registration.form.members_section')} ({members.length}人)
                </h3>
            </div>

            <div className="space-y-4 min-w-0">
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
            
            <div className="mt-8 flex justify-center pb-4 min-w-0">
                <button 
                    type="button" 
                    onClick={onAddMember} 
                    disabled={lockCountdown > 0}
                    className={`h-12 px-10 rounded font-black transition-all flex items-center text-sm md:text-base shadow-lg border-2 ${lockCountdown > 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-200 hover:scale-105 active:scale-95'}`}
                >
                    <Plus className="w-5 h-5 mr-2" /> {t('stake.registration.form.add_member_btn')}
                </button>
            </div>
        </div>
    );
};

export default MemberSection;
