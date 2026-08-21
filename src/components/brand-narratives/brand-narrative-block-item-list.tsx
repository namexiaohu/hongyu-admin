'use client';

import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Typography } from 'antd';

import {
  createBrandNarrativeBlockItem,
  type BrandNarrativeBlockItemDraft,
} from '@/lib/brand-narrative-blocks';

type BrandNarrativeBlockItemListProps = {
  items: BrandNarrativeBlockItemDraft[];
  /** 节点 | 课程 | 内容 */
  itemLabel?: string;
  onChange: (items: BrandNarrativeBlockItemDraft[]) => void;
  onEdit: (item: BrandNarrativeBlockItemDraft) => void;
};

export function BrandNarrativeBlockItemList({
  items,
  itemLabel = '内容',
  onChange,
  onEdit,
}: BrandNarrativeBlockItemListProps) {
  function moveItem(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Typography.Text strong>{itemLabel}</Typography.Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => onChange([...items, createBrandNarrativeBlockItem()])}
        >
          添加{itemLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`尚未添加${itemLabel}`} />
      ) : (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                background: '#fff',
              }}
            >
              <Typography.Text>
                {itemLabel} {index + 1}
              </Typography.Text>
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DownOutlined />}
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                />
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)}>
                  编辑
                </Button>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onChange(items.filter((current) => current.id !== item.id))}
                />
              </Space>
            </div>
          ))}
        </Space>
      )}
    </Space>
  );
}
