'use client';

import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { NavColumnDrawer } from '@/components/website-config/nav-column-drawer';
import { resolveNavName, type NavColumn } from '@/lib/website-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  title: string;
  description?: string;
  columns: NavColumn[];
  onChange: (columns: NavColumn[]) => void;
  activeLanguages: AdminSiteLanguageRow[];
};

export function NavColumnsEditor({ title, description, columns, onChange, activeLanguages }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<NavColumn | null>(null);
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code
    ?? activeLanguages[0]?.code
    ?? 'zh-CN';

  const tableColumns = useMemo(() => [
    {
      title: '栏目标题',
      ellipsis: true,
      render: (_: unknown, record: NavColumn) => resolveNavName(record, defaultLocale) || record.name || '—',
    },
    {
      title: '链接',
      dataIndex: 'href',
      width: 160,
      ellipsis: true,
      render: (value: string | undefined) => value?.trim() || '—',
    },
    {
      title: '条目数',
      width: 90,
      render: (_: unknown, record: NavColumn) => record.items.length,
    },
    {
      title: '排序',
      width: 100,
      render: (_: unknown, __: NavColumn, index: number) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<UpOutlined />}
            disabled={index === 0}
            onClick={() => moveColumn(index, -1)}
          />
          <Button
            type="text"
            icon={<DownOutlined />}
            disabled={index === columns.length - 1}
            onClick={() => moveColumn(index, 1)}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: NavColumn) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openColumnEditor(record)} />
          <Popconfirm title="确定删除该栏目？" onConfirm={() => removeColumn(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ], [columns, defaultLocale]);

  function moveColumn(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= columns.length) return;
    const next = [...columns];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  function removeColumn(id: string) {
    onChange(columns.filter((row) => row.id !== id));
  }

  function openColumnEditor(column: NavColumn | null) {
    setEditingColumn(column);
    setDrawerOpen(true);
  }

  function handleColumnSave(saved: NavColumn) {
    const exists = columns.some((row) => row.id === saved.id);
    onChange(exists ? columns.map((row) => (row.id === saved.id ? saved : row)) : [...columns, saved]);
    setDrawerOpen(false);
    setEditingColumn(null);
  }

  return (
    <div className="content-editor-shared-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          {description ? (
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {description}
            </Typography.Paragraph>
          ) : null}
        </div>
        <Button icon={<PlusOutlined />} onClick={() => openColumnEditor(null)}>添加导航栏目</Button>
      </div>
      <Table
        rowKey="id"
        size="middle"
        pagination={false}
        columns={tableColumns}
        dataSource={columns}
        locale={{ emptyText: '暂无导航栏目' }}
      />
      <NavColumnDrawer
        open={drawerOpen}
        column={editingColumn}
        activeLanguages={activeLanguages}
        onClose={() => { setDrawerOpen(false); setEditingColumn(null); }}
        onSave={handleColumnSave}
      />
    </div>
  );
}
