import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';
import { Info } from 'lucide-react';
import { GlobalSettings } from '../../../types';

interface UnitRulesSectionProps {
    settings: GlobalSettings;
    lang: 'zh' | 'en';
}

const UnitRulesSection: React.FC<UnitRulesSectionProps> = ({ settings, lang }) => {
    const { t, tString } = useI18n();
    if (!settings.rules_content) return null;

    return (
        <div className="bg-orange-50 p-6 rounded shadow-sm border border-orange-200 mb-6">
            <h3 className="font-bold text-orange-900 mb-4 text-sm flex items-center">
                <Info className="w-5 h-5 mr-2" /> {t('stake.registration.form.reg_rules_title')}
            </h3>
            <div className="text-orange-800 text-sm leading-relaxed whitespace-pre-wrap">
                {settings.rules_content}
            </div>
        </div>
    );
};

export default UnitRulesSection;
