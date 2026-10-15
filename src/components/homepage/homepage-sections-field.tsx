'use client';

import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space, Switch, Table, Tag, Typography } from 'antd';

import {
  HOMEPAGE_SECTION_LABELS,
  isHomepageSectionEnabled,
  type HomepageSectionConfig,
} from '@/lib/homepage-config';

type Props = {
  value?: HomepageSectionConfig[];
  onChange?: (value: HomepageSectionConfig[]) => void;
};

export function HomepageSectionsField({ value = [], onChange }: Props) {
  function moveRow(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onChange?.(next);
  }

  function setEnabled(index: number, enabled: boolean) {
    onChange?.(value.map((row, i) => (i === index ? { ...row, enabled } : row)));
  }

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        调整首页各区块的显示顺序与启用状态。停用后前台不展示对应区块；洞察与底部合作 CTA 不在此列表内。
      </Typography.Paragraph>
      <Table
        rowKey="key"
        size="middle"
        pagination={false}
        dataSource={value}
        columns={[
          {
            title: '区块',
            render: (_: unknown, record: HomepageSectionConfig) => HOMEPAGE_SECTION_LABELS[record.key],
          },
          {
            title: '状态',
            width: 100,
            render: (_: unknown, record: HomepageSectionConfig) => (
              isHomepageSectionEnabled(record)
                ? <Tag color="green">启用</Tag>
                : <Tag>停用</Tag>
            ),
          },
          {
            title: '排序',
            width: 100,
            render: (_: unknown, __: HomepageSectionConfig, index: number) => (
              <Space size={0}>
                <Button
                  type="text"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                />
                <Button
                  type="text"
                  icon={<DownOutlined />}
                  disabled={index === value.length - 1}
                  onClick={() => moveRow(index, 1)}
                />
              </Space>
            ),
          },
          {
            title: '启用',
            width: 100,
            render: (_: unknown, record: HomepageSectionConfig, index: number) => (
              <Switch
                checked={isHomepageSectionEnabled(record)}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={(checked) => setEnabled(index, checked)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
