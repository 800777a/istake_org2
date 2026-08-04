import React from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Table, Space, Button, Popconfirm, Modal, Input, InputNumber, Select, Typography } from 'antd';
import { Edit2, Trash2, Plus, User, Car } from 'lucide-react';
import { BillingEngineConfig, PricingValue } from '../../../types';
import { RainbowCard, rainbowStyles } from './RainbowCard';

const { Text } = Typography;

interface ModifierStepProps {
  type: 'identity' | 'trip';
  billingConfig: BillingEngineConfig;
  onConfigChange: (config: BillingEngineConfig) => void;
  isExpanded: boolean;
  onToggle: () => void;
  colorIndex?: number;
}

interface ModifierTableData {
  key: string;
  label: string;
  price: PricingValue;
  priceRecord: any; 
  sortOrder: number;
}

const SortOrderInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [localVal, setLocalVal] = React.useState<number | null>(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    const finalVal = localVal === null || isNaN(Number(localVal)) ? 0 : Number(localVal);
    if (finalVal !== value) {
      onChange(finalVal);
    }
  };

  return (
    <InputNumber
      size="small"
      value={localVal}
      onChange={(v) => setLocalVal(v)}
      onBlur={handleBlur}
      onPressEnter={handleBlur}
      className={className}
    />
  );
};

export const ModifierStep: React.FC<ModifierStepProps> = ({ 
  type, 
  billingConfig, 
  onConfigChange, 
  isExpanded, 
  onToggle,
  colorIndex = 2
}) => {
  const { t, tString } = useI18n();
  const isIdentity = type === 'identity';
  const data: ModifierTableData[] = (isIdentity 
    ? (billingConfig.identityPricings || []).map((p, idx) => ({ key: `${p.identity}_${idx}`, label: p.identity, price: p.price, priceRecord: p, sortOrder: p.sortOrder ?? 0 }))
    : (billingConfig.tripPricings || []).map((p, idx) => ({ key: `${p.trip}_${idx}`, label: p.trip, price: p.price, priceRecord: p, sortOrder: p.sortOrder ?? 0 })))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const deleteModifier = (tableKey: string) => {
    if (isIdentity) {
      const newList = (billingConfig.identityPricings || []).filter((p, idx) => `${p.identity}_${idx}` !== tableKey);
      onConfigChange({ ...billingConfig, identityPricings: newList });
    } else {
      const newList = (billingConfig.tripPricings || []).filter((p, idx) => `${p.trip}_${idx}` !== tableKey);
      onConfigChange({ ...billingConfig, tripPricings: newList });
    }
  };

  const editModifier = (tableKey: string, currentPrice: PricingValue, currentDesc?: string, currentSort?: number, currentSubsidy?: boolean) => {
    // Extract original name from tableKey (everything before the last underscore)
    const originalName = tableKey.substring(0, tableKey.lastIndexOf('_'));
    let mKey = originalName;
    let method = currentPrice.method;
    let value = currentPrice.value;
    let desc = currentDesc || '';
    let sort = currentSort ?? 0;
    let subsidy = currentSubsidy !== false; 
    Modal.confirm({
      title: isIdentity ? t('stake.fee_config.edit_identity_title', '編輯身份規則') : t('stake.fee_config.edit_trip_title', '編輯行程規則'),
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.sort_order', '排序')}</Text>
            <InputNumber defaultValue={sort} onChange={v => sort = Number(v) || 0} className="w-full" />
          </div>
          <div>
            <Text className="text-xs text-gray-500 mb-1 block">{isIdentity ? t('stake.fee_config.identity_name', '身份名稱') : t('stake.fee_config.trip_name', '行程名稱')}</Text>
            <Input 
              defaultValue={mKey} 
              onChange={e => mKey = e.target.value} 
              disabled={!isIdentity}
            />
          </div>
          {isIdentity && (
            <div className="flex gap-4">
              <div className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 block">補助</Text>
                <Select 
                  defaultValue={subsidy ? 'yes' : 'no'} 
                  onChange={v => subsidy = v === 'yes'} 
                  className="w-full"
                  options={[{ value: 'yes', label: '有' }, { value: 'no', label: '無' }]}
                />
              </div>
              <div className="flex-[2]">
                <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.identity_desc', '說明 (身份說明)')}</Text>
                <Input defaultValue={desc} onChange={e => desc = e.target.value} />
              </div>
            </div>
          )}
          <div>
            <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.fee_method', '收費方式')}</Text>
            <Select 
              defaultValue={method} 
              onChange={v => method = v as any} 
              className="w-full"
              options={[
                { value: 'percent', label: t('stake.fee_config.method_percent', '百分比 (%)') },
                { value: 'fixed', label: t('stake.fee_config.method_fixed', '固定金額 ($)') },
                { value: 'adjustment', label: t('stake.fee_config.method_adjustment', '增減金額 (+/-)') }
              ]}
            />
          </div>
          <div>
            <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.value', '數值')}</Text>
            <InputNumber defaultValue={value} onChange={v => value = Number(v) || 0} className="w-full" />
          </div>
        </div>
      ),
      onOk: () => {
        if (isIdentity) {
          const newList = [...(billingConfig.identityPricings || [])];
          const idx = newList.findIndex((p, i) => `${p.identity}_${i}` === tableKey);
          if (idx > -1) {
            newList[idx] = { identity: mKey, price: { method, value }, description: desc, hasSubsidy: subsidy, sortOrder: sort };
          }
          onConfigChange({ ...billingConfig, identityPricings: newList });
        } else {
          const newList = [...(billingConfig.tripPricings || [])];
          const idx = newList.findIndex((p, i) => `${p.trip}_${i}` === tableKey);
          if (idx > -1) {
            newList[idx] = { trip: mKey, price: { method, value }, sortOrder: sort };
          }
          onConfigChange({ ...billingConfig, tripPricings: newList });
        }
      }
    });
  };

  const addModifier = () => {
    let mKey = '';
    let method: 'fixed' | 'percent' | 'adjustment' = 'percent';
    let value = 100;
    let desc = '';
    let subsidy = true;
    const currentList = isIdentity ? (billingConfig.identityPricings || []) : (billingConfig.tripPricings || []);
    const maxSort = currentList.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0);
    let sort = maxSort + 1;

    Modal.confirm({
      title: <div className="text-white font-black text-lg p-2 -m-2 mb-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg">{isIdentity ? t('stake.fee_config.add_identity_title', '新增身份') : t('stake.fee_config.add_trip_title', '新增行程')}</div>,
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      width: 400,
      styles: { body: { backgroundColor: '#FFFBE6', padding: '24px' } },
      content: (
        <div className="space-y-4">
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序')}</Text>
            <InputNumber defaultValue={sort} onChange={v => sort = Number(v) || 0} className="w-full border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{isIdentity ? t('stake.fee_config.identity', '身份') : t('stake.fee_config.trip', '行程')}{t('stake.fee_config.col_name', '名稱')}</Text>
            <Input placeholder={t('stake.fee_config.enter_name_placeholder', "請輸入名稱")} onChange={e => mKey = e.target.value} className="border-amber-200" />
          </div>
          <div className="flex gap-4">
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.value', '數值')}</Text>
               <InputNumber min={0} defaultValue={100} onChange={v => value = Number(v) || 0} className="w-full border-amber-200" />
             </div>
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.fee_method', '收費方式')}</Text>
               <Select 
                 defaultValue="percent" 
                 onChange={v => method = v as any} 
                 className="w-full border-amber-200"
                 options={[
                   { value: 'percent', label: t('stake.fee_config.method_percent', '百分比 (%)') },
                   { value: 'fixed', label: t('stake.fee_config.method_fixed', '固定金額 ($)') },
                   { value: 'adjustment', label: t('stake.fee_config.method_adjustment', '增減金額 (+/-)') }
                 ]}
               />
             </div>
          </div>
          {isIdentity && (
            <div className="flex gap-4">
              <div className="flex-1">
                <Text className="text-xs font-black text-amber-900 mb-1 block">補助</Text>
                <Select 
                  defaultValue="yes" 
                  onChange={v => subsidy = v === 'yes'} 
                  className="w-full border-amber-200"
                  options={[{ value: 'yes', label: '有' }, { value: 'no', label: '無' }]}
                />
              </div>
              <div className="flex-[2]">
                <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.desc_optional', '說明 (選填)')}</Text>
                <Input placeholder={t('common.optional', "選填")} onChange={e => desc = e.target.value} className="border-amber-200" />
              </div>
            </div>
          )}
        </div>
      ),
      onOk: () => {
        if (!mKey) return;
        if (isIdentity) {
          const newList = [...(billingConfig.identityPricings || []), { identity: mKey, price: { method, value }, description: desc, hasSubsidy: subsidy, sortOrder: sort }];
          onConfigChange({ ...billingConfig, identityPricings: newList });
        } else {
          const newList = [...(billingConfig.tripPricings || []), { trip: mKey, price: { method, value }, sortOrder: sort }];
          onConfigChange({ ...billingConfig, tripPricings: newList });
        }
      }
    });
  };

  const style = rainbowStyles[colorIndex % rainbowStyles.length];

  const columns: any[] = [
    {
      title: t('stake.fee_config.col_sort', '排序'),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      render: (val: number, record: any) => (
        <SortOrderInput 
          value={val} 
          onChange={v => {
            if (isIdentity) {
              const newList = [...(billingConfig.identityPricings || [])];
              const idx = newList.findIndex((p, i) => `${p.identity}_${i}` === record.key);
              if (idx > -1) {
                newList[idx] = { ...newList[idx], sortOrder: v };
                onConfigChange({ ...billingConfig, identityPricings: newList });
              }
            } else {
              const newList = [...(billingConfig.tripPricings || [])];
              const idx = newList.findIndex((p, i) => `${p.trip}_${i}` === record.key);
              if (idx > -1) {
                newList[idx] = { ...newList[idx], sortOrder: v };
                onConfigChange({ ...billingConfig, tripPricings: newList });
              }
            }
          }}
          className="w-full"
        />
      )
    },
    { 
      title: isIdentity ? t('stake.fee_config.col_identity', '身份') : t('stake.fee_config.col_trip', '行程'), 
      dataIndex: 'label', 
      key: 'label',
      fixed: 'left' as const,
      width: 120,
      sorter: (a: any, b: any) => a.label.localeCompare(b.label)
    },
    {
      title: t('stake.fee_config.col_value', '數值'),
      dataIndex: 'value',
      key: 'value',
      sorter: (a: any, b: any) => (a.price?.value || 0) - (b.price?.value || 0),
      render: (_: any, record: any) => record.price?.value
    },
    { 
      title: t('stake.fee_config.col_fee_method', '收費方式'), 
      dataIndex: 'method', 
      key: 'method',
      render: (_: any, record: any) => {
        if (record.price?.method === 'percent') return t('stake.fee_config.method_percent', '百分比 (%)');
        if (record.price?.method === 'adjustment') return t('stake.fee_config.method_adjustment', '增減金額 (+/-)');
        return t('stake.fee_config.method_fixed', '固定金額 ($)');
      }
    }
  ];

  if (isIdentity) {
    columns.push({
      title: t('stake.fee_config.col_has_subsidy', '補助'),
      dataIndex: 'hasSubsidy',
      key: 'hasSubsidy',
      width: 100,
      sorter: (a: any, b: any) => {
        const aVal = a.priceRecord?.hasSubsidy !== false ? 1 : 0;
        const bVal = b.priceRecord?.hasSubsidy !== false ? 1 : 0;
        return aVal - bVal;
      },
      render: (_: any, record: any) => {
        const hasSubsidy = record.priceRecord?.hasSubsidy !== false; 
        return (
          <Select 
            size="small" 
            value={hasSubsidy ? 'yes' : 'no'} 
            onChange={v => {
              const newList = [...(billingConfig.identityPricings || [])];
              const idx = newList.findIndex((p, i) => `${p.identity}_${i}` === record.key);
              if (idx > -1) {
                newList[idx] = { ...newList[idx], hasSubsidy: v === 'yes' };
                onConfigChange({ ...billingConfig, identityPricings: newList });
              }
            }}
            options={[
              { value: 'yes', label: <span className="text-green-700 font-black">有</span> },
              { value: 'no', label: <span className="text-red-700 font-black">無</span> }
            ]}
            className="w-full"
            style={{ color: hasSubsidy ? '#15803d' : '#b91c1c' }}
          />
        );
      }
    });
    columns.push({
      title: t('stake.fee_config.col_desc', '說明'),
      dataIndex: 'description',
      key: 'description',
      render: (_: any, record: any) => record.priceRecord?.description || '-'
    });
  }

  columns.push({
    title: t('stake.fee_config.col_actions', '操作'),
    key: 'action',
    render: (_: any, record: any) => (
      <Space>
        <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => editModifier(record.key, record.price, record.priceRecord?.description, record.sortOrder, record.priceRecord?.hasSubsidy)} />
        <Popconfirm 
          title={t('stake.fee_config.remove_rule_confirm', "移除此規則？")}
          onConfirm={() => deleteModifier(record.key)}
          okText={t('common.confirm', "確認")}
          cancelText={t('common.cancel', "取消")}
        >
           <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
        </Popconfirm>
      </Space>
    )
  });

  return (
    <RainbowCard
      title={isIdentity ? t('stake.fee_config.step2_title', "第2步：身份規則") : t('stake.fee_config.step3_title', "第3步：行程規則")}
      icon={isIdentity ? <User size={20} /> : <Car size={20} />}
      colorIndex={colorIndex}
      isExpanded={isExpanded}
      onToggle={onToggle}
      extra={
        <button 
          onClick={addModifier}
          className="h-10 px-5 rounded text-xs font-bold transition-all flex items-center gap-2"
          style={{ 
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}
        >
          <Plus size={16} /> {isIdentity ? t('stake.fee_config.add_identity_title', '新增身份') : t('stake.fee_config.add_trip_title', '新增行程')}
        </button>
      }
    >
      <div className="overflow-x-auto">
        <Table dataSource={data} columns={columns} pagination={false} size="small" rowKey="key" scroll={{ x: 'max-content' }} />
      </div>
    </RainbowCard>
  );
};
