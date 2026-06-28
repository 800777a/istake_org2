
import React from 'react';
import { useTranslation } from 'react-i18next';
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
    calculateMemberPrice
}) => {
    const { t } = useTranslation();

    return (
        <div className="mb-6">
            <h3 className="font-bold text-green-700 mb-4 text-sm text-center bg-green-50 py-2 rounded-lg ring-1 ring-green-200">
                {t('stake.registration.form.members_section')} ({members.length}{t('stake.registration.form.person_unit')})
            </h3>
            <div className="space-y-4">
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
                    />
                ))}
            </div>
            
            <div className="mt-6 flex justify-center">
                <button 
                    type="button" 
                    onClick={onAddMember} 
                    disabled={lockCountdown > 0}
                    className={`bg-green-50 text-green-700 px-6 py-2 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center text-sm shadow-sm ring-1 ring-green-200 ${lockCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Plus className="w-4 h-4 mr-2" /> {t('stake.registration.form.add_member_btn')}
                </button>
            </div>
        </div>
    );
};

export default MemberSection;
