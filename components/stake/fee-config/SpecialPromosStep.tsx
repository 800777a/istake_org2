import React from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Table, Space, Button, Popconfirm, Tag, Switch, Modal, Input, InputNumber, Select, Typography } from 'antd';
import { Edit2, Trash2, Plus, Gift, ArrowRight } from 'lucide-react';
import { BillingEngineConfig, SpecialPromoRule } from '../../../types';
import { RainbowCard, rainbowStyles } from './RainbowCard';

const { Text } = Typography;

interface SpecialPromosStepProps {
  billingConfig: BillingEngineConfig;
  onConfigChange: (config: BillingEngineConfig) => void;
  isExpanded: boolean;
  onToggle: () => void;
  colorIndex?: number;
}

export const SpecialPromosStep: React.FC<SpecialPromosStepProps> = ({ 
  billingConfig, 
  onConfigChange, 
  isExpanded, 
  onToggle,
  colorIndex = 4
}) => {
  const { t, tString } = useI18n();
  const data = [...(billingConfig.specialPromos || [])]
    .map(p => ({ ...p, key: p.id }))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const editPromo = (id: string, record: SpecialPromoRule) => {
    let name = record.name;
    let method = record.price.method;
    let value = record.price.value;
    let selectedUnits = record.units || [];
    let selectedIdentities = record.identities || [];
    let sort = record.sortOrder ?? 0;
    
    Modal.confirm({
      title: <div className="text-white font-black text-lg p-2 -m-2 mb-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg">{t('stake.fee_config.edit_promo_title', '編輯優惠')}</div>,
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      width: 600,
      styles: { body: { backgroundColor: '#FFFBE6', padding: '24px' } },
      content: (
        <div className="space-y-4">
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
            <InputNumber defaultValue={sort} onChange={v => sort = Number(v) || 0} className="w-full border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.promo_name', '優惠名稱')}</Text>
            <Input defaultValue={name} onChange={e => name = e.target.value} className="border-amber-200" />
          </div>
          <div className="flex gap-4">
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.value', '數值')}</Text>
               <InputNumber defaultValue={value} onChange={v => value = v || 0} className="w-full border-amber-200" />
             </div>
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.fee_method', '收費方式')}</Text>
               <Select 
                 defaultValue={method} 
                 onChange={v => method = v} 
                 className="w-full border-amber-200"
                 options={[
                   { value: 'percent', label: t('stake.fee_config.method_percent', '百分比 (%)') },
                   { value: 'fixed', label: t('stake.fee_config.method_fixed', '固定金額 ($)') },
                   { value: 'adjustment', label: t('stake.fee_config.method_adjustment', '增減金額 (+/-)') }
                 ]}
               />
             </div>
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.limit_units_desc', '限制套用單位 (留空則全部)')}</Text>
            <Select 
              mode="multiple" 
              defaultValue={selectedUnits}
              placeholder={t('stake.fee_config.select_unit_placeholder', "選擇單位")}
              onChange={v => selectedUnits = v} 
              className="w-full border-amber-200"
              options={(billingConfig.units || []).map(u => ({ value: u.shortName, label: u.shortName }))}
            />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.limit_identities_desc', '限制套用身分 (留空則全部)')}</Text>
            <Select 
              mode="multiple" 
              defaultValue={selectedIdentities}
              placeholder={t('stake.fee_config.select_identity_placeholder', "選擇身分")}
              onChange={v => selectedIdentities = v} 
              className="w-full border-amber-200"
              options={(billingConfig.identityPricings || []).map(p => ({ value: p.identity, label: p.identity }))}
            />
          </div>
        </div>
      ),
      onOk: () => {
        const newList = [...(billingConfig.specialPromos || [])];
        const idx = newList.findIndex(p => p.id === id);
        if (idx > -1) {
          newList[idx] = {
            ...record,
            name,
            units: selectedUnits,
            identities: selectedIdentities,
            price: { method: method as any, value },
            sortOrder: sort
          };
          onConfigChange({ ...billingConfig, specialPromos: newList });
        }
      }
    });
  };

  const addPromo = () => {
    let name = '';
    let method = 'percent';
    let value = 100;
    let selectedUnits: string[] = [];
    let selectedIdentities: string[] = [];
    const maxSort = (billingConfig.specialPromos || []).reduce((max, p) => Math.max(max, p.sortOrder || 0), 0);
    let sort = maxSort + 1;
    
    Modal.confirm({
      title: <div className="text-white font-black text-lg p-2 -m-2 mb-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg">{t('stake.fee_config.add_promo_title', '新增優惠')}</div>,
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      width: 600,
      styles: { body: { backgroundColor: '#FFFBE6', padding: '24px' } },
      content: (
        <div className="space-y-4">
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
            <InputNumber defaultValue={sort} onChange={v => sort = Number(v) || 0} className="w-full border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.promo_name', '優惠名稱')}</Text>
            <Input placeholder={t('stake.fee_config.promo_name_example', "例如: 端午特惠")} onChange={e => name = e.target.value} className="border-amber-200" />
          </div>
          <div className="flex gap-4">
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.value', '數值')}</Text>
               <InputNumber defaultValue={100} onChange={v => value = v || 0} className="w-full border-amber-200" />
             </div>
             <div className="flex-1">
               <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.fee_method', '收費方式')}</Text>
               <Select 
                 defaultValue="percent" 
                 onChange={v => method = v} 
                 className="w-full border-amber-200"
                 options={[
                   { value: 'percent', label: t('stake.fee_config.method_percent', '百分比 (%)') },
                   { value: 'fixed', label: t('stake.fee_config.method_fixed', '固定金額 ($)') },
                   { value: 'adjustment', label: t('stake.fee_config.method_adjustment', '增減金額 (+/-)') }
                 ]}
               />
             </div>
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.limit_units_desc', '限制套用單位 (留空則全部)')}</Text>
            <Select 
              mode="multiple" 
              placeholder={t('stake.fee_config.apply_units', "套用單位")}
              onChange={v => selectedUnits = v} 
              className="w-full border-amber-200"
              options={(billingConfig.units || []).map(u => ({ value: u.shortName, label: u.shortName }))}
            />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.limit_identities_desc', '限制套用身分 (留空則全部)')}</Text>
            <Select 
              mode="multiple" 
              placeholder={t('stake.fee_config.apply_identities', "套用身分")}
              onChange={v => selectedIdentities = v} 
              className="w-full border-amber-200"
              options={(billingConfig.identityPricings || []).map(p => ({ value: p.identity, label: p.identity }))}
            />
          </div>
        </div>
      ),
      onOk: () => {
        if (!name) return;
        const newPromo: SpecialPromoRule = {
          id: `PROMO-${Date.now()}`,
          name,
          enabled: true,
          units: selectedUnits,
          identities: selectedIdentities,
          price: { method: method as any, value },
          sortOrder: sort
        };
        onConfigChange({ ...billingConfig, specialPromos: [...(billingConfig.specialPromos || []), newPromo] });
      }
    });
  };

  const style = rainbowStyles[colorIndex % rainbowStyles.length];

  const columns = [
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
            const newList = [...(billingConfig.specialPromos || [])];
            const idx = newList.findIndex(p => p.id === record.id);
            if (idx > -1) {
              newList[idx] = { ...newList[idx], sortOrder: Number(v) || 0 };
              onConfigChange({ ...billingConfig, specialPromos: newList });
            }
          }}
          className="w-full"
        />
      )
    },
    { 
      title: t('stake.fee_config.col_promo', '優惠'), 
      dataIndex: 'name', 
      key: 'name', 
      fixed: 'left' as const, 
      width: 120,
      sorter: (a: any, b: any) => a.name.localeCompare(b.name)
    },
    { 
      title: t('stake.fee_config.col_rule_summary', '規則摘要'), 
      key: 'rule', 
      render: (_: any, record: SpecialPromoRule) => (
        <Space wrap>
          {record.units && record.units.length > 0 && <Tag color="blue">{t('stake.fee_config.unit_label', '單位')}: {record.units.join(',')}</Tag>}
          {record.identities && record.identities.length > 0 && <Tag color="green">{t('stake.fee_config.identity_label', '身份')}: {record.identities.join(',')}</Tag>}
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <Tag color="orange">
            {record.price.method === 'percent' 
              ? `${record.price.value}%` 
              : record.price.method === 'adjustment'
                ? `${record.price.value > 0 ? '+' : ''}${record.price.value}`
                : `$${record.price.value}`}
          </Tag>
        </Space>
      )
    },
    {
      title: t('stake.fee_config.col_enabled', '啟用'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (val: boolean, record: SpecialPromoRule) => (
        <Switch checked={val} onChange={(checked) => {
           const newList = [...(billingConfig.specialPromos || [])];
           const idx = newList.findIndex(p => p.id === record.id);
           if (idx > -1) {
             newList[idx] = { ...record, enabled: checked };
             onConfigChange({ ...billingConfig, specialPromos: newList });
           }
        }} />
      )
    },
    {
      title: t('stake.fee_config.col_actions', '操作'),
      key: 'action',
      render: (_: any, record: SpecialPromoRule) => (
        <Space>
          <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => editPromo(record.id, record)} />
          <Popconfirm 
            title={t('stake.fee_config.delete_promo_confirm', "確定刪除此優惠？")}
            onConfirm={() => {
              const newList = (billingConfig.specialPromos || []).filter(p => p.id !== record.id);
              onConfigChange({ ...billingConfig, specialPromos: newList });
            }}
            okText={t('common.confirm', "確認")}
            cancelText={t('common.cancel', "取消")}
          >
            <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <RainbowCard
      title={tString('stake.fee_config.step4_title', '第4步：優惠設定 (Promos)')}
      icon={<Gift size={20} />}
      colorIndex={colorIndex}
      isExpanded={isExpanded}
      onToggle={onToggle}
      extra={
        <button 
          onClick={addPromo}
          className="h-10 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
          style={{ 
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}
        >
          <Plus size={16} /> {t('stake.fee_config.add_promo_title', '新增優惠')}
        </button>
      }
    >
      <Table 
        dataSource={data} 
        columns={columns} 
        pagination={false} 
        size="small"
        rowKey="id"
        className="custom-table"
      />
    </RainbowCard>
  );
};
