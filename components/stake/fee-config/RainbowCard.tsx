import React from 'react';
import { Card, Space, Typography } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const rainbowStyles = [
  { bg: '#FFF1F0', text: '#A8071A', border: '#FFA39E' }, // 紅
  { bg: '#FFF7E6', text: '#AD4E00', border: '#FFD591' }, // 橙
  { bg: '#FEFFE6', text: '#AD8B00', border: '#FFF1B8' }, // 黃
  { bg: '#F6FFED', text: '#237804', border: '#B7EB8F' }, // 綠
  { bg: '#E6F7FF', text: '#0050B3', border: '#91D5FF' }, // 藍
  { bg: '#F0F5FF', text: '#061178', border: '#ADC6FF' }, // 靛
  { bg: '#F9F0FF', text: '#391085', border: '#D3ADF7' }, // 紫
];

interface RainbowCardProps {
  title: string;
  icon: React.ReactNode;
  colorIndex: number;
  extra?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const RainbowCard: React.FC<RainbowCardProps> = ({ 
  title, 
  icon, 
  colorIndex, 
  extra, 
  isExpanded,
  onToggle,
  children 
}) => {
  const style = rainbowStyles[colorIndex % rainbowStyles.length];
  
  return (
    <Card 
      className="mb-6 shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: style.bg, 
        borderColor: style.border,
        color: style.text 
      }}
      styles={{
        header: { 
          cursor: 'pointer', 
          borderBottom: isExpanded ? `1px solid ${style.border}` : 'none',
          padding: 0
        },
        body: { 
          padding: isExpanded ? '16px 24px' : '0', 
          display: isExpanded ? 'block' : 'none' 
        }
      }}
      title={
        <div 
          className="flex items-center justify-between w-full px-6 py-4"
          onClick={onToggle}
        >
          <Space size="middle">
            <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{icon}</span>
            <Text strong style={{ color: style.text, fontSize: '1.1rem' }}>{title}</Text>
          </Space>
          <Space>
            {isExpanded ? <UpOutlined style={{ color: style.text }} /> : <DownOutlined style={{ color: style.text }} />}
          </Space>
        </div>
      }
    >
      {isExpanded && (
        <>
          {extra && (
            <div className="flex justify-end mb-4">
               <Space>{extra}</Space>
            </div>
          )}
          {children}
        </>
      )}
    </Card>
  );
};
