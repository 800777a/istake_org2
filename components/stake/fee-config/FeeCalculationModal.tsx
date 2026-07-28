import React, { useMemo, useState } from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Form, Row, Col, Select, Typography, Divider, Badge } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { BillingEngineConfig, IdentityType, TripType } from '../../../types';
import { calculateFeeV2 } from '../../../utils/billingEngine';

const { Text } = Typography;

interface FeeCalculationModalProps {
  billingConfig: BillingEngineConfig;
}

export const FeeCalculationModal: React.FC<FeeCalculationModalProps> = ({ billingConfig }) => {
  const { t, tString } = useI18n();
  const [testUnit, setTestUnit] = useState((billingConfig.units || [])[0]?.shortName || '');
  const [testIden, setTestIden] = useState((billingConfig.identityPricings || [])[0]?.identity || IdentityType.ADULT);
  const [testTrip, setTestTrip] = useState((billingConfig.tripPricings || [])[0]?.trip || TripType.ROUND_TRIP);
  
  const calculatedPrice = useMemo(() => {
    return calculateFeeV2({ unit: testUnit }, billingConfig, testIden, testTrip);
  }, [testUnit, testIden, testTrip, billingConfig]);

  const idenOptions = useMemo(() => {
      if (billingConfig.identityPricings && billingConfig.identityPricings.length > 0) {
          return (billingConfig.identityPricings || []).map(p => ({ value: p.identity, label: p.identity }));
      }
      return Object.values(IdentityType).map(it => ({ value: it, label: it }));
  }, [billingConfig.identityPricings]);

  const tripOptions = useMemo(() => {
      if (billingConfig.tripPricings && billingConfig.tripPricings.length > 0) {
          return (billingConfig.tripPricings || []).map(p => ({ value: p.trip, label: p.trip }));
      }
      return Object.values(TripType).map(it => ({ value: it, label: it }));
  }, [billingConfig.tripPricings]);

  // L5 Active Promos Calculation
  const activePromos = useMemo(() => {
    return (billingConfig.specialPromos || []).filter(promo => {
      if (!promo.enabled) return false;
      const unitMatch = !promo.units || promo.units.length === 0 || promo.units.includes(testUnit);
      const idenMatch = !promo.identities || promo.identities.length === 0 || promo.identities.includes(testIden);
      // Note: tripTypes might be missing in some versions of types, assuming it exists or handling gracefully
      return unitMatch && idenMatch;
    });
  }, [testUnit, testIden, billingConfig.specialPromos]);

  return (
    <div className="space-y-4">
      <Form layout="vertical">
        <Row gutter={12}>
          <Col span={24}>
            <Form.Item label={<Text strong className="text-amber-900">{t('stake.fee_config.simulate_unit', '模擬單位 (Unit)')}</Text>}>
              <Select 
                value={testUnit} 
                onChange={setTestUnit}
                className="w-full border-amber-200"
                options={(billingConfig.units || []).map(u => ({ value: u.shortName, label: u.shortName }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<Text strong className="text-amber-900">{t('stake.fee_config.simulate_identity', '模擬身份 (Identity)')}</Text>}>
              <Select 
                value={testIden} 
                onChange={setTestIden}
                className="w-full border-amber-200"
                options={idenOptions}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<Text strong className="text-amber-900">{t('stake.fee_config.simulate_trip', '模擬行程 (Trip)')}</Text>}>
              <Select 
                value={testTrip} 
                onChange={setTestTrip}
                className="w-full border-amber-200"
                options={tripOptions}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      
      <div className="bg-amber-900 text-amber-50 p-6 rounded shadow-xl border border-amber-400/30 overflow-hidden relative">
        <div className="flex justify-between items-start relative z-10">
           <div>
              <Text className="text-amber-300 text-xs font-black uppercase tracking-widest block mb-1">{t('stake.fee_config.calc_result', '計算結果 (Live Result)')}</Text>
              <div className="text-4xl font-black tracking-tighter flex items-baseline">
                 <span className="text-xl mr-1 opacity-50">$</span>
                 {calculatedPrice}
              </div>
           </div>
           <CalculatorOutlined className="text-5xl opacity-10 absolute -right-2 -bottom-2" />
        </div>
        
        <Divider className="border-amber-400/20 my-4" />
        
        <div className="space-y-2">
           <div className="flex justify-between items-center text-[11px] opacity-70">
              <span>{t('stake.fee_config.calc_path', '計算路徑 (Calculation Path)')}</span>
              <Badge status="processing" text={t('stake.fee_config.realtime_sync', '實時同步')} className="text-[10px] text-amber-200" />
           </div>
            <div className="bg-black/20 p-3 rounded border border-white/5 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between">
                 <span className="opacity-50">L1/L2 Base:</span>
                 <span className="font-bold">${(billingConfig.baseFees || {})[testUnit] ?? (billingConfig.baseFees || {})['GLOBAL'] ?? 0}</span>
              </div>
              <div className="flex justify-between">
                 <span className="opacity-50">L3 {testIden}:</span>
                 <span className="text-green-400 font-bold">
                   {(() => {
                      const p = (billingConfig.identityPricings || []).find(i => i.identity === testIden);
                      return p ? (p.price.method === 'percent' ? `${p.price.value}%` : `$${p.price.value}`) : t('stake.fee_config.no_rule_desc', '100% (無規則)');
                   })()}
                 </span>
              </div>
              <div className="flex justify-between">
                 <span className="opacity-50">L4 {testTrip}:</span>
                 <span className="text-blue-400 font-bold">
                   {(() => {
                      const p = (billingConfig.tripPricings || []).find(t => t.trip === testTrip);
                      return p ? (p.price.method === 'percent' ? `${p.price.value}%` : `$${p.price.value}`) : t('stake.fee_config.no_rule_desc', '100% (無規則)');
                   })()}
                 </span>
              </div>
              
              {/* FIXED: Added L5 Logic Display */}
              <div className="flex flex-col border-t border-white/5 pt-1 mt-1">
                 <div className="flex justify-between">
                    <span className="opacity-50">L5 優惠/策略 (Promo):</span>
                    <span className="text-amber-400 font-bold uppercase">{billingConfig.calcStrategy === 'stack' ? t('stake.fee_config.strategy_stack_short', '疊加 (Stack)') : t('stake.fee_config.strategy_min_short', '最優 (Min)')}</span>
                 </div>
                 {activePromos.length > 0 ? (
                    <div className="mt-1 space-y-1">
                       {activePromos.map(p => (
                          <div key={p.id} className="flex justify-between pl-2 border-l border-amber-500/30">
                             <span className="opacity-40 italic">└ {p.name}:</span>
                             <span className="text-amber-300">{p.price.method === 'percent' ? `${p.price.value}%` : `$${p.price.value}`}</span>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-[9px] opacity-30 italic pl-2">{t('stake.fee_config.no_active_promos', '無符合優惠 (No active promos)')}</div>
                 )}
              </div>

              <div className="flex justify-between border-t border-white/5 pt-1">
                 <span className="opacity-50">L6 四捨五入:</span>
                 <span className="opacity-70">{billingConfig.roundingToTen ? t('stake.fee_config.round_to_ten_short', '進位到十位') : t('common.none', '無')}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
