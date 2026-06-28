import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Space, Button, Popconfirm, Modal, Input, InputNumber, Select, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { BillingEngineConfig, PricingValue } from '../../../types';
import { RainbowCard } from './RainbowCard';

const { Text } = Typography;

interface ModifierStepProps {
  type: 'identity' | 'trip';
  billingConfig: BillingEngineConfig;
  onConfigChange: (config: BillingEngineConfig) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

interface ModifierTableData {
  key: string;
  label: string;
  price: PricingValue;
  priceRecord: any; 
  sortOrder: number;
}

export const ModifierStep: React.FC<ModifierStepProps> = ({ 
  type, 
  billingConfig, 
  onConfigChange, 
  isExpanded, 
  onToggle 
}) => {
  const { t } = useTranslation();
  const isIdentity = type === 'identity';
  const data: ModifierTableData[] = (isIdentity 
    ? billingConfig.identityPricings.map(p => ({ key: p.identity, label: p.identity, price: p.price, priceRecord: p, sortOrder: p.sortOrder ?? 0 }))
    : billingConfig.tripPricings.map(p => ({ key: p.trip, label: p.trip, price: p.price, priceRecord: p, sortOrder: p.sortOrder ?? 0 })))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const deleteModifier = (key: string) => {
    if (isIdentity) {
      const newList = billingConfig.identityPricings.filter(p => p.identity !== key);
      onConfigChange({ ...billingConfig, identityPricings: newList });
    } else {
      const newList = billingConfig.tripPricings.filter(p => p.trip !== key);
      onConfigChange({ ...billingConfig, tripPricings: newList });
    }
  };

  const editModifier = (key: string, currentPrice: PricingValue, currentDesc?: string, currentSort?: number) => {
    let mKey = key;
    let method = currentPrice.method;
    let value = currentPrice.value;
    let desc = currentDesc || '';
    let sort = currentSort ?? 0;
    Modal.confirm({
      title: isIdentity ? t('stake.fee_config.edit_identity_title', '編輯身份規則') : t('stake.fee_config.edit_trip_title', '編輯行程規則'),
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
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
            <div>
              <Text className="text-xs text-gray-500 mb-1 block">{t('stake.fee_config.identity_desc', '說明 (身份說明)')}</Text>
              <Input defaultValue={desc} onChange={e => desc = e.target.value} />
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
          const newList = [...billingConfig.identityPricings];
          const idx = newList.findIndex(p => p.identity === key);
          if (idx > -1) {
            newList[idx] = { identity: mKey, price: { method, value }, description: desc, sortOrder: sort };
          }
          onConfigChange({ ...billingConfig, identityPricings: newList });
        } else {
          const newList = [...billingConfig.tripPricings];
          const idx = newList.findIndex(p => p.trip === key);
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
    const currentList = isIdentity ? billingConfig.identityPricings : billingConfig.tripPricings;
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
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
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
            <div>
              <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.desc_optional', '說明 (選填)')}</Text>
              <Input placeholder={t('common.optional', "選填")} onChange={e => desc = e.target.value} className="border-amber-200" />
            </div>
          )}
        </div>
      ),
      onOk: () => {
        if (!mKey) return;
        if (isIdentity) {
          const newList = [...billingConfig.identityPricings, { identity: mKey, price: { method, value }, description: desc, sortOrder: sort }];
          onConfigChange({ ...billingConfig, identityPricings: newList });
        } else {
          const newList = [...billingConfig.tripPricings, { trip: mKey, price: { method, value }, sortOrder: sort }];
          onConfigChange({ ...billingConfig, tripPricings: newList });
        }
      }
    });
  };

  const columns: any[] = [
    {
      title: t('stake.fee_config.col_sort', '排序'),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      render: (val: number, record: any) => (
        <InputNumber 
          size="small" 
          value={val} 
          onChange={v => {
            if (isIdentity) {
              const newList = [...billingConfig.identityPricings];
              const idx = newList.findIndex(p => p.identity === record.key);
              if (idx > -1) {
                newList[idx] = { ...newList[idx], sortOrder: Number(v) || 0 };
                onConfigChange({ ...billingConfig, identityPricings: newList });
              }
            } else {
              const newList = [...billingConfig.tripPricings];
              const idx = newList.findIndex(p => p.trip === record.key);
              if (idx > -1) {
                newList[idx] = { ...newList[idx], sortOrder: Number(v) || 0 };
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
        <Button size="small" icon={<EditOutlined />} onClick={() => editModifier(record.key, record.price, record.priceRecord?.description, record.sortOrder)} />
        <Popconfirm 
          title={t('stake.fee_config.remove_rule_confirm', "移除此規則？")}
          onConfirm={() => deleteModifier(record.key)}
          okText={t('common.confirm', "確認")}
          cancelText={t('common.cancel', "取消")}
        >
           <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )
  });

  return (
    <RainbowCard
      title={isIdentity ? t('stake.fee_config.step2_title', "第2步：身份規則 (Identity Rules)") : t('stake.fee_config.step3_title', "第3步：行程規則 (Trip Rules)")}
      icon={isIdentity ? <Typography.Text>👤</Typography.Text> : <Typography.Text>🚗</Typography.Text>}
      colorIndex={isIdentity ? 2 : 3}
      isExpanded={isExpanded}
      onToggle={onToggle}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={addModifier}>
          {isIdentity ? t('stake.fee_config.add_identity_title', '新增身份') : t('stake.fee_config.add_trip_title', '新增行程')}
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table dataSource={data} columns={columns} pagination={false} size="small" rowKey="key" scroll={{ x: 'max-content' }} />
      </div>
    </RainbowCard>
  );
};
