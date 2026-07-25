import React from 'react';
import { useI18n } from '../../../src/contexts/LanguageContext';
import { Table, InputNumber, Space, Button, Popconfirm, Alert, Modal, Input, Typography, message } from 'antd';
import { Edit2, Trash2, Plus, LayoutGrid } from 'lucide-react';
import { BillingEngineConfig, UnitConfig } from '../../../types';
import { RainbowCard, rainbowStyles } from './RainbowCard';

const { Text } = Typography;

interface UnitFeesStepProps {
  billingConfig: BillingEngineConfig;
  onConfigChange: (config: BillingEngineConfig) => void;
  isExpanded: boolean;
  onToggle: () => void;
  colorIndex?: number;
}

export const UnitFeesStep: React.FC<UnitFeesStepProps> = ({ 
  billingConfig, 
  onConfigChange, 
  isExpanded, 
  onToggle,
  colorIndex = 1
}) => {
  const { t, tString } = useI18n();
  const data = [
    { 
      isGlobal: true, 
      shortName: t('stake.fee_config.stake_name', '支聯會'), 
      fullName: t('stake.fee_config.stake_name', '支聯會'), 
      fee: billingConfig.baseFees['GLOBAL'] || 0,
      sortOrder: -999 // Always first
    },
    ... (billingConfig.units || []).map(u => ({ 
      isGlobal: false,
      shortName: u.shortName, 
      fullName: u.fullName, 
      fee: billingConfig.baseFees[u.shortName],
      sortOrder: u.sortOrder ?? 0
    }))
  ];

  const deleteUnit = (index: number) => {
    const newUnits = [...(billingConfig.units || [])];
    newUnits.splice(index, 1);
    onConfigChange({ ...billingConfig, units: newUnits });
  };

  const editUnit = (index: number, record: UnitConfig) => {
    let val1 = record.shortName;
    let val2 = record.fullName;
    let val3 = record.sortOrder ?? 0;
    Modal.confirm({
      title: <div className="text-white font-black text-lg p-2 -m-2 mb-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg">{t('stake.fee_config.edit_unit_title', '編輯單位資訊')}</div>,
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      width: 450,
      styles: { body: { backgroundColor: '#FFFBE6', padding: '24px' } },
      content: (
        <div className="space-y-4">
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
            <InputNumber defaultValue={val3} onChange={v => val3 = Number(v) || 0} className="w-full border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.short_name', '簡稱')}</Text>
            <Input defaultValue={val1} onChange={e => val1 = e.target.value} className="border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.full_name', '全名')}</Text>
            <Input defaultValue={val2} onChange={e => val2 = e.target.value} className="border-amber-200" />
          </div>
        </div>
      ),
      onOk: () => {
        const newUnits = [...(billingConfig.units || [])];
        newUnits[index] = { shortName: val1, fullName: val2, sortOrder: val3 };
        onConfigChange({ ...billingConfig, units: newUnits });
      }
    });
  };

  const addUnit = () => {
    let val1 = '';
    let val2 = '';
    const maxSort = (billingConfig.units || []).reduce((max, u) => Math.max(max, u.sortOrder || 0), 0);
    let val3 = maxSort + 1;
    Modal.confirm({
      title: <div className="text-white font-black text-lg p-2 -m-2 mb-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg">{t('stake.fee_config.add_unit_title', '新增單位')}</div>,
      okText: t('common.confirm', '確認'),
      cancelText: t('common.cancel', '取消'),
      width: 450,
      styles: { body: { backgroundColor: '#FFFBE6', padding: '24px' } },
      content: (
        <div className="space-y-4">
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.sort_order', '排序 (Sorting)')}</Text>
            <InputNumber defaultValue={val3} onChange={v => val3 = Number(v) || 0} className="w-full border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.short_name_placeholder', '簡稱 (例如: 北一)')}</Text>
            <Input placeholder={t('stake.fee_config.short_name', "簡稱")} onChange={e => val1 = e.target.value} className="border-amber-200" />
          </div>
          <div>
            <Text className="text-xs font-black text-amber-900 mb-1 block">{t('stake.fee_config.full_name_placeholder', '全名 (例如: 台北第一支聯會)')}</Text>
            <Input placeholder={t('stake.fee_config.full_name', "全名")} onChange={e => val2 = e.target.value} className="border-amber-200" />
          </div>
        </div>
      ),
      onOk: () => {
        if (!val1) {
          message.warning(t('stake.fee_config.enter_short_name', '請輸入單位簡稱'));
          return;
        }
        const exists = (billingConfig.units || []).find(u => u.shortName === val1 || u.fullName === val2);
        if (exists) {
          message.error(t('stake.fee_config.unit_exists', '單位簡稱或全稱已存在'));
          return;
        }

        onConfigChange({ ...billingConfig, units: [...(billingConfig.units || []), { shortName: val1, fullName: val2 || val1, sortOrder: val3 }] });
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
      sorter: (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
      render: (val: number, record: any) => (
        record.isGlobal ? '-' : (
          <InputNumber 
            size="small" 
            value={val} 
            onChange={v => {
              const newUnits = [...(billingConfig.units || [])];
              const idx = newUnits.findIndex(u => u.shortName === record.shortName);
              if (idx > -1) {
                newUnits[idx] = { ...newUnits[idx], sortOrder: Number(v) || 0 };
                onConfigChange({ ...billingConfig, units: newUnits });
              }
            }}
            className="w-full"
          />
        )
      )
    },
    { 
      title: t('stake.fee_config.col_short_name', '簡稱'), 
      dataIndex: 'shortName', 
      key: 'shortName', 
      fixed: 'left' as const, 
      width: 100,
      sorter: (a: any, b: any) => a.shortName.localeCompare(b.shortName)
    },
    { 
      title: t('stake.fee_config.col_full_name', '全名'), 
      dataIndex: 'fullName', 
      key: 'fullName',
      sorter: (a: any, b: any) => a.fullName.localeCompare(b.fullName)
    },
    { 
      title: t('stake.fee_config.col_full_fare', '全額車資'), 
      dataIndex: 'fee', 
      key: 'fee',
      width: 120,
      sorter: (a: any, b: any) => (a.fee || 0) - (b.fee || 0),
      render: (val: number | undefined, record: any) => (
        <InputNumber 
          status={!record.isGlobal && val === undefined ? 'warning' : ''}
          placeholder={record.isGlobal ? t('stake.fee_config.set_fare_placeholder', "設定車資") : t('stake.fee_config.follow_stake_placeholder', "依照支聯會")}
          value={val} 
          onChange={v => {
            const newBaseFees = { ...billingConfig.baseFees };
            const key = record.isGlobal ? 'GLOBAL' : record.shortName;
            if (v === null) delete newBaseFees[key];
            else newBaseFees[key] = v;
            onConfigChange({ ...billingConfig, baseFees: newBaseFees });
          }}
          className="w-full"
        />
      )
    },
    {
      title: t('stake.fee_config.col_actions', '操作'),
      key: 'action',
      render: (_: any, record: any, index: number) => (
        record.isGlobal ? null : (
          <Space>
            <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => editUnit(index - 1, record)} />
            <Popconfirm 
              title={t('common.delete_confirm', "確定刪除？")}
              onConfirm={() => deleteUnit(index - 1)}
              okText={t('common.confirm', "確認")}
              cancelText={t('common.cancel', "取消")}
            >
              <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
            </Popconfirm>
          </Space>
        )
      ),
    },
  ];

  return (
    <RainbowCard
      title={tString('stake.fee_config.step1_title', '第1步：單位車資 (Unit Fees)')}
      icon={<LayoutGrid size={20} />}
      colorIndex={colorIndex}
      isExpanded={isExpanded}
      onToggle={onToggle}
      extra={
        <button 
          onClick={addUnit}
          className="h-10 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
          style={{ 
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}
        >
          <Plus size={16} /> {t('stake.fee_config.add_unit_title', '新增單位')}
        </button>
      }
    >
      <div className="overflow-x-auto">
        <Alert 
          title={tString('common.tip', '提示')}
          description={t('stake.fee_config.step1_desc', '若單位未設定金額，則依照支聯會設定金額。')} 
          type="warning"
          showIcon 
          className="mb-4" 
          style={{ backgroundColor: '#FFF7E6', border: '1px solid #FFD591', color: '#AD4E00' }}
        />
        <Table 
          dataSource={data} 
          columns={columns} 
          pagination={false} 
          size="small" 
          rowKey={(record) => record.isGlobal ? 'GLOBAL' : record.shortName} 
          scroll={{ x: 'max-content' }} 
        />
      </div>
    </RainbowCard>
  );
};
