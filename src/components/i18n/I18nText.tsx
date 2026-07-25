import React from 'react';
import { useI18n } from '../../contexts/LanguageContext';

interface I18nTextProps {
  stringKey: string;
  className?: string;
}

const I18nText: React.FC<I18nTextProps> = ({ stringKey, className = "" }) => {
  const { t, tString, isEditMode, activeKey, setActiveKey } = useI18n();
  
  const isActive = activeKey === stringKey;

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      setActiveKey(stringKey);
    }
  };

  return (
    <span
      onClick={handleClick}
      data-i18n-key={stringKey}
      className={`
        transition-all duration-200
        ${className}
        ${isEditMode ? 'cursor-help border-b-2 border-dashed border-blue-400/50 hover:bg-blue-50/50 px-0.5' : ''}
        ${isActive && isEditMode ? 'bg-yellow-100 ring-2 ring-yellow-400 border-solid z-10' : ''}
      `}
      title={isEditMode ? `Key: ${stringKey}` : undefined}
    >
      {t(stringKey)}
    </span>
  );
};

export default I18nText;
