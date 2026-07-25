import React, { useState } from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Typography, Card, Space, Divider, Tag, Tooltip, Button, Row, Col, Flex } from 'antd';
import { 
  Info, 
  User, 
  Car, 
  Gift, 
  Zap,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BillingEngineConfig, IdentityType, TripType, PricingMethod } from '../../../types';

import { RainbowCard } from './RainbowCard';

const { Title, Text, Paragraph } = Typography;

interface FeeExplanationSectionProps {
  billingConfig: BillingEngineConfig;
  onOpenCalcModal: () => void;
  defaultCollapsed?: boolean;
  colorIndex?: number;
}

export const FeeExplanationSection: React.FC<FeeExplanationSectionProps> = ({ 
  billingConfig, 
  onOpenCalcModal,
  defaultCollapsed = false,
  colorIndex = 0
}) => {
  const { t, tString } = useI18n();
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
    <RainbowCard
      title={tString('stake.fee_config.explanation_title', '收費說明 / Fee Explanation')}
      icon={<Info size={20} />}
      colorIndex={colorIndex}
      isExpanded={!isCollapsed}
      onToggle={() => setIsCollapsed(!isCollapsed)}
    >
      <div className="space-y-8">
        <div className="px-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block border-l-4 border-slate-300 pl-3 py-1">
            {t('stake.fee_config.explanation_help', '幫助報名代表人了解車資計算邏輯')}
          </span>
        </div>
        
        <div className="space-y-8">
          {/* Step 1: Base Fee */}
          <div>
            <h4 className="flex items-center text-slate-800 font-bold mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black mr-2">1</div>
              {t('stake.fee_config.base_fee_label', '基礎金額 (Base Fee)')}
            </h4>
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm space-y-3">
              <p className="text-sm text-slate-500">
                {t('stake.fee_config.base_fee_desc', '車資計算的起始點。各單位可以設定不同的基礎金額。')}
              </p>
              <div className="flex flex-wrap gap-2">
                {(billingConfig.units || []).map(unit => (
                  <div key={unit.shortName} className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center">
                    <span className="text-xs font-bold text-slate-600 mr-2">{unit.shortName}</span>
                    <span className="text-xs font-bold text-blue-600">${(billingConfig.baseFees || {})[unit.shortName] ?? (billingConfig.baseFees || {})['GLOBAL'] ?? 0}</span>
                  </div>
                ))}
              </div>
              {(billingConfig.baseFees || {})['GLOBAL'] !== undefined && (
                <p className="text-[10px] text-slate-400 italic">
                  * {t('stake.fee_config.default_base_fee_prefix', '若未特別列出，預設金額為：')}${billingConfig.baseFees['GLOBAL']}
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Identity Pricing */}
          <div>
            <h4 className="flex items-center text-slate-800 font-bold mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black mr-2">2</div>
              {t('stake.fee_config.identity_pricing_label', '身份別調整 (Identity Pricing)')}
            </h4>
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500 mb-3">
                {t('stake.fee_config.identity_pricing_desc', '根據參加者的身份進行調整（例如：成人、兒童）。')}
                <span className="text-[10px] text-slate-400 block mt-1">* {t('stake.fee_config.identity_tooltip_tip', '游標移至身份上方可查看年齡說明')}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(billingConfig.identityPricings || []).length > 0 ? (
                  (billingConfig.identityPricings || []).map((p, idx) => (
                    <div key={`${p.identity}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <User className="text-slate-400 w-4 h-4" />
                        <Tooltip title={p.description || t('common.no_desc', "暫無說明")}>
                          <span className="text-sm font-bold text-slate-700 cursor-help border-b border-dotted border-slate-300">{p.identity}</span>
                        </Tooltip>
                      </div>
                      <span className="bg-white text-blue-700 font-black text-xs px-3 py-1 rounded-lg border border-blue-100">
                        {getPricingText(p.price.method, p.price.value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
                    {t('stake.fee_config.no_identity_pricing', '目前無身份別調整規則 (100% 原價)')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Trip Pricing */}
          <div>
            <h4 className="flex items-center text-slate-800 font-bold mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black mr-2">3</div>
              {t('stake.fee_config.trip_pricing_label', '行程別調整 (Trip Pricing)')}
            </h4>
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500 mb-3">
                {t('stake.fee_config.trip_pricing_desc', '根據參加者的行程（來回、單程等）進行調整。')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(billingConfig.tripPricings || []).length > 0 ? (
                  (billingConfig.tripPricings || []).map((p, idx) => (
                    <div key={`${p.trip}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Car className="text-slate-400 w-4 h-4" />
                        <span className="text-sm font-bold text-slate-700">{p.trip}</span>
                      </div>
                      <span className="bg-white text-cyan-700 font-black text-xs px-3 py-1 rounded-lg border border-cyan-100">
                        {getPricingText(p.price.method, p.price.value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
                    {t('stake.fee_config.no_trip_pricing', '目前無行程別調整規則 (100% 原價)')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Special Promos */}
          <div>
            <h4 className="flex items-center text-slate-800 font-bold mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black mr-2">4</div>
              {t('stake.fee_config.special_promos_label', '特別優惠與加減項 (Special Promotions)')}
            </h4>
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500 mb-3">
                {t('stake.fee_config.special_promos_desc', '符合特定條件（單位、身份）時觸發的額外增減項。')}
              </p>
              <div className="space-y-3">
                {(billingConfig.specialPromos || []).filter(p => p.enabled).length > 0 ? (
                  (billingConfig.specialPromos || []).filter(p => p.enabled).map(p => (
                    <div key={p.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Gift className="text-slate-400 w-5 h-5 mt-1" />
                        <div>
                          <span className="font-bold text-slate-700 block mb-1">{p.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {p.units && p.units.length > 0 ? p.units.map(u => <span key={u} className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-white border border-slate-100 text-slate-500">{u}</span>) : <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-white border border-slate-100 text-slate-400">{t('stake.fee_config.all_units', '全單位')}</span>}
                            {p.identities && p.identities.length > 0 ? p.identities.map(i => <span key={i} className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-slate-600 text-white">{i}</span>) : <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-slate-200 text-slate-500">{t('stake.fee_config.all_identities', '全身份')}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="font-black text-lg text-blue-600">{getPricingText(p.price.method, p.price.value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
                    {t('stake.fee_config.no_special_promos', '目前無特別優惠規則')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 5: Calculation Logic */}
          <div>
            <h4 className="flex items-center text-slate-800 font-bold mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black mr-2">5</div>
              {t('stake.fee_config.calc_logic_label', '最後計算邏輯 (Rounding & Strategy)')}
            </h4>
            <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="text-amber-400 w-4 h-4" />
                    <span className="font-bold">{t('stake.fee_config.promo_strategy_label', '優惠套用策略')}</span>
                  </div>
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-black">{billingConfig.calcStrategy === 'stack' ? t('stake.fee_config.strategy_stack_mode', '疊加模式 (Stack)') : t('stake.fee_config.strategy_min_mode', '最優模式 (Minimal)')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="text-indigo-300 w-4 h-4" />
                    <span className="font-bold">{t('stake.fee_config.rounding_label', '四捨五入')}</span>
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-black">{billingConfig.roundingToTen ? t('stake.fee_config.round_to_ten_short', '進位到十位數') : t('stake.fee_config.no_rounding', '無進位')}</span>
                </div>
              </div>
              <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
            </div>
          </div>

          <hr className="border-slate-100" />
          
          <div className="bg-amber-50/50 p-6 rounded-lg border border-amber-100/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-3">
                <Info className="text-amber-600 w-6 h-6 mt-1" />
                <div>
                  <span className="text-amber-900 font-bold block mb-2 text-sm uppercase tracking-wider">{t('stake.fee_config.formula_overview_label', '計算公式概覽 / Formula Overview')}</span>
                  <div className="space-y-2">
                    <span className="text-xs text-amber-800 font-bold">{t('stake.fee_config.formula_label', '計算公式：')}</span>
                    <div className="font-mono text-amber-700 text-sm bg-white p-3 rounded-lg border border-amber-200 inline-block shadow-sm">
                      {t('stake.fee_config.formula_text', '單位 × 身份 × 行程 ± 優惠(折扣 & 進位) = 車資金額')}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={onOpenCalcModal}
                className="h-14 px-8 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-all flex items-center gap-3 self-center md:self-auto"
              >
                <Calculator size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Sandbox</span>
                  <span className="text-sm font-bold">{t('stake.fee_config.sandbox_btn_short', '收費試算按鈕')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </RainbowCard>
  );
};
