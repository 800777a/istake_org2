import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Card, Space, Divider, Tag, Tooltip, Button, Row, Col } from 'antd';
import { 
  InfoCircleOutlined, 
  UserOutlined, 
  CarOutlined, 
  GiftOutlined, 
  ThunderboltOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'motion/react';
import { BillingEngineConfig, IdentityType, TripType, PricingMethod } from '../../../types';

const { Title, Text, Paragraph } = Typography;

interface FeeExplanationSectionProps {
  billingConfig: BillingEngineConfig;
  onOpenCalcModal: () => void;
  defaultCollapsed?: boolean;
}

export const FeeExplanationSection: React.FC<FeeExplanationSectionProps> = ({ 
  billingConfig, 
  onOpenCalcModal,
  defaultCollapsed = false 
}) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (!billingConfig) {
    return null;
  }

  const getPricingText = (method: PricingMethod, value: number) => {
    if (method === 'percent') {
      return `${value}%`;
    }
    if (method === 'adjustment') {
      return value >= 0 ? `+ $${value}` : `- $${Math.abs(value)}`;
    }
    return `$${value}`;
  };

  return (
    <Card 
      className="mt-6 border-2 border-indigo-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-indigo-50/30 to-white"
      title={
        <div 
          className="flex items-center justify-between text-indigo-900 py-2 cursor-pointer select-none"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center">
            <InfoCircleOutlined className="mr-3 text-indigo-600 text-xl" />
            <span className="text-lg font-black tracking-tight">{t('stake.fee_config.explanation_title', '收費說明 / Fee Explanation')}</span>
          </div>
          <div className="text-indigo-400">
            {isCollapsed ? <DownOutlined className="text-lg" /> : <UpOutlined className="text-lg" />}
          </div>
        </div>
      }
      styles={{ body: { padding: isCollapsed ? 0 : '24px' } }}
    >
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mb-6 px-1">
              <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black block border-l-4 border-indigo-500 pl-3 py-1">
                {t('stake.fee_config.explanation_help', '幫助報名代表人了解車資計算邏輯')}
              </span>
            </div>
            <Space orientation="vertical" className="w-full" size="large">
              {/* Step 1: Base Fee */}
        <div>
          <Title level={5} className="flex items-center text-indigo-800 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black mr-2">1</div>
            {t('stake.fee_config.base_fee_label', '基礎金額 (Base Fee)')}
          </Title>
          <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50 space-y-2">
            <Paragraph className="mb-0 text-gray-600 text-sm">
              {t('stake.fee_config.base_fee_desc', '車資計算的起始點。各單位可以設定不同的基礎金額。')}
            </Paragraph>
            <div className="flex flex-wrap gap-2">
              {billingConfig.units.map(unit => (
                <div key={unit.shortName} className="px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center">
                  <Text className="text-xs font-black text-indigo-900 mr-2">{unit.shortName}</Text>
                  <Text className="text-xs font-bold text-indigo-600">${billingConfig.baseFees[unit.shortName] ?? billingConfig.baseFees['GLOBAL'] ?? 0}</Text>
                </div>
              ))}
            </div>
            {billingConfig.baseFees['GLOBAL'] !== undefined && (
              <div className="text-[10px] text-gray-400 italic">
                * {t('stake.fee_config.default_base_fee_prefix', '若未特別列出，預設金額為：')}${billingConfig.baseFees['GLOBAL']}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Identity Pricing */}
        <div>
          <Title level={5} className="flex items-center text-indigo-800 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black mr-2">2</div>
            {t('stake.fee_config.identity_pricing_label', '身份別調整 (Identity Pricing)')}
          </Title>
          <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50">
            <Paragraph className="mb-3 text-gray-600 text-sm">
              {t('stake.fee_config.identity_pricing_desc', '根據參加者的身份進行調整（例如：成人、兒童）。')}
              <Text className="text-[10px] text-gray-400 block mt-1">* {t('stake.fee_config.identity_tooltip_tip', '游標移至身份上方可查看年齡說明')}</Text>
            </Paragraph>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {billingConfig.identityPricings.length > 0 ? (
                billingConfig.identityPricings.map(p => (
                  <div key={p.identity} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Space size="small">
                      <UserOutlined className="text-indigo-400" />
                      <Tooltip title={p.description || t('common.no_desc', "暫無說明")}>
                        <Text className="font-bold text-gray-700 cursor-help border-b border-dotted border-gray-300">{p.identity}</Text>
                      </Tooltip>
                    </Space>
                    <Tag color="blue" className="rounded-lg border-none font-black text-xs px-3 py-1">
                      {getPricingText(p.price.method, p.price.value)}
                    </Tag>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                  {t('stake.fee_config.no_identity_pricing', '目前無身份別調整規則 (100% 原價)')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Trip Pricing */}
        <div>
          <Title level={5} className="flex items-center text-indigo-800 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black mr-2">3</div>
            {t('stake.fee_config.trip_pricing_label', '行程別調整 (Trip Pricing)')}
          </Title>
          <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50">
            <Paragraph className="mb-3 text-gray-600 text-sm">
              {t('stake.fee_config.trip_pricing_desc', '根據參加者的行程（來回、單程等）進行調整。')}
            </Paragraph>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {billingConfig.tripPricings.length > 0 ? (
                billingConfig.tripPricings.map(p => (
                  <div key={p.trip} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Space size="small">
                      <CarOutlined className="text-indigo-400" />
                      <Text className="font-bold text-gray-700">{p.trip}</Text>
                    </Space>
                    <Tag color="cyan" className="rounded-lg border-none font-black text-xs px-3 py-1">
                      {getPricingText(p.price.method, p.price.value)}
                    </Tag>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                  {t('stake.fee_config.no_trip_pricing', '目前無行程別調整規則 (100% 原價)')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Special Promos */}
        <div>
          <Title level={5} className="flex items-center text-indigo-800 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black mr-2">4</div>
            {t('stake.fee_config.special_promos_label', '特別優惠與加減項 (Special Promotions)')}
          </Title>
          <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50">
            <Paragraph className="mb-3 text-gray-600 text-sm">
              {t('stake.fee_config.special_promos_desc', '符合特定條件（單位、身份）時觸發的額外增減項。')}
            </Paragraph>
            <div className="space-y-3">
              {billingConfig.specialPromos.filter(p => p.enabled).length > 0 ? (
                billingConfig.specialPromos.filter(p => p.enabled).map(p => (
                  <div key={p.id} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <GiftOutlined className="text-indigo-500 mt-1" />
                      <div>
                        <Text className="font-black text-indigo-900 block leading-none mb-1">{p.name}</Text>
                        <div className="flex flex-wrap gap-1">
                          {p.units && p.units.length > 0 ? p.units.map(u => <Tag key={u} className="text-[9px] font-bold rounded-md bg-white border-indigo-100 text-indigo-600">{u}</Tag>) : <Tag className="text-[9px] font-bold rounded-md bg-white border-indigo-100 text-gray-400">{t('stake.fee_config.all_units', '全單位')}</Tag>}
                          {p.identities && p.identities.length > 0 ? p.identities.map(i => <Tag key={i} className="text-[9px] font-bold rounded-md bg-indigo-600 text-white border-none">{i}</Tag>) : <Tag className="text-[9px] font-bold rounded-md bg-gray-200 text-gray-600 border-none">{t('stake.fee_config.all_identities', '全身份')}</Tag>}
                        </div>
                      </div>
                    </div>
                    <Text className="font-black text-lg text-indigo-600">{getPricingText(p.price.method, p.price.value)}</Text>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                  {t('stake.fee_config.no_special_promos', '目前無特別優惠規則')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: Calculation Logic */}
        <div>
          <Title level={5} className="flex items-center text-indigo-800 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black mr-2">5</div>
            {t('stake.fee_config.calc_logic_label', '最後計算邏輯 (Rounding & Strategy)')}
          </Title>
          <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <Space>
                  <ThunderboltOutlined className="text-yellow-400" />
                  <Text className="text-white font-bold">{t('stake.fee_config.promo_strategy_label', '優惠套用策略')}</Text>
                </Space>
                <Tag color="orange" className="font-black border-none rounded-lg">{billingConfig.calcStrategy === 'stack' ? t('stake.fee_config.strategy_stack_mode', '疊加模式 (Stack)') : t('stake.fee_config.strategy_min_mode', '最優模式 (Minimal)')}</Tag>
              </div>
              <div className="flex items-center justify-between">
                <Space>
                  <ArrowRightOutlined className="text-blue-300" />
                  <Text className="text-white font-bold">{t('stake.fee_config.rounding_label', '四捨五入')}</Text>
                </Space>
                <Tag color="blue" className="font-black border-none rounded-lg">{billingConfig.roundingToTen ? t('stake.fee_config.round_to_ten_short', '進位到十位數') : t('stake.fee_config.no_rounding', '無進位')}</Tag>
              </div>
            </div>
            <ThunderboltOutlined className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12" />
          </div>
        </div>

        <Divider className="my-0 opacity-50" />
        
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-inner">
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-start gap-3 mb-4 md:mb-0">
                <InfoCircleOutlined className="text-amber-600 mt-1 text-lg" />
                <div>
                  <Text className="text-amber-900 font-black block mb-2 text-sm uppercase tracking-wider">{t('stake.fee_config.formula_overview_label', '計算公式概覽 / Formula Overview')}</Text>
                  <Paragraph className="mb-0 text-amber-900 text-xs font-bold leading-relaxed">
                    {t('stake.fee_config.formula_label', '計算公式：')}<br/>
                    <span className="font-mono text-amber-700 text-sm bg-white/50 px-3 py-1 rounded-lg border border-amber-200 inline-block mt-1">
                      {t('stake.fee_config.formula_text', '單位 × 身份 × 行程 ± 優惠(折扣 & 進位) = 車資金額')}
                    </span>
                  </Paragraph>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8} className="text-center md:text-right">
              <Button 
                type="primary" 
                size="large"
                icon={<CalculatorOutlined />} 
                onClick={onOpenCalcModal}
                className="bg-amber-500 border-amber-600 hover:bg-amber-600 h-auto py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs opacity-80 font-bold uppercase tracking-widest">Sandbox</span>
                  <span className="text-sm font-black">{t('stake.fee_config.sandbox_btn_short', '收費試算按鈕')}</span>
                </div>
              </Button>
            </Col>
          </Row>
        </div>
            </Space>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
