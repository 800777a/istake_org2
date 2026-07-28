import React from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Row, Col, Radio, Typography, Switch, Button } from 'antd';
import { Layers, Target, Calculator } from 'lucide-react';
import { BillingEngineConfig } from '../../../types';
import { RainbowCard, rainbowStyles } from './RainbowCard';

const { Text, Paragraph } = Typography;

interface LogicRoundingStepProps {
  billingConfig: BillingEngineConfig;
  onConfigChange: (config: BillingEngineConfig) => void;
  expandedSteps: Record<string, boolean>;
  onToggle: (step: string) => void;
  onOpenSandbox?: () => void;
  colorIndexStart?: number;
}

export const LogicRoundingStep: React.FC<LogicRoundingStepProps> = ({ 
  billingConfig, 
  onConfigChange, 
  expandedSteps, 
  onToggle,
  onOpenSandbox,
  colorIndexStart = 5
}) => {
  const { t, tString } = useI18n();
  return (
    <>
      <RainbowCard
        title={tString('stake.fee_config.step5_title', '第5步：折扣設定 (Discounts)')}
        icon={<Layers size={20} />}
        colorIndex={colorIndexStart}
        isExpanded={expandedSteps['step5']}
        onToggle={() => onToggle('step5')}
      >
        <div className="overflow-x-auto">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Text strong className="block mb-2 text-xs opacity-70">{t('stake.fee_config.calc_strategy_label', '折扣計算策略 (Calc Strategy)')}</Text>
              <Radio.Group 
                value={billingConfig.calcStrategy} 
                onChange={e => onConfigChange({ ...billingConfig, calcStrategy: e.target.value })}
              >
                <Radio value="stack">{t('stake.fee_config.strategy_stack', '優惠疊加 (Stackable)')}</Radio>
                <Radio value="min">{t('stake.fee_config.strategy_min', '取最低價者 (Cheapest Mode)')}</Radio>
              </Radio.Group>
              <Paragraph className="mt-2 text-[10px] text-gray-400">
                {t('stake.fee_config.strategy_stack_desc', '疊加：依序計算 身份 → 行程 → 特惠。')}<br/>
                {t('stake.fee_config.strategy_min_desc', '最低價：從上述所有計算路徑中挑選最便宜的一個結果。')}
              </Paragraph>
            </Col>
          </Row>
        </div>
      </RainbowCard>

      <RainbowCard
        title={tString('stake.fee_config.step6_title', '第6步：四捨五入 (Rounding)')}
        icon={<Target size={20} />}
        colorIndex={colorIndexStart + 1}
        isExpanded={expandedSteps['step6']}
        onToggle={() => onToggle('step6')}
      >
        <div className="flex items-center space-x-4 p-4 bg-white/50 rounded">
          <Text strong className="text-xs opacity-70">{t('stake.fee_config.round_to_ten_label', '進位到十位數 (Rounding to Ten):')}</Text>
          <Switch 
            checked={billingConfig.roundingToTen} 
            onChange={checked => onConfigChange({ ...billingConfig, roundingToTen: checked })}
          />
          <Text className="text-[10px] text-gray-400">{t('stake.fee_config.round_to_ten_desc', '開啟後計算結果將自動進位到最接近的 10 (例如: 455 → 460)')}</Text>
        </div>
      </RainbowCard>

      {onOpenSandbox && (
        <div className="mt-4 mb-8 flex justify-center">
          <button 
            onClick={onOpenSandbox}
            className="h-12 px-8 bg-amber-500 text-white rounded text-sm font-bold shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2"
          >
            <Calculator size={20} /> {t('stake.fee_config.sandbox_btn', '收費試算 / Fee Calculation Sandbox')}
          </button>
        </div>
      )}
    </>
  );
};
