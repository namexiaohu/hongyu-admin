'use client';

import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { NavColumnDrawer } from '@/components/website-config/nav-column-drawer';
import {
  type AdminWebsiteConfig,
  type NavColumn,
  compactNavColumns,
} from '@/lib/website-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialConfig: AdminWebsiteConfig;
  activeLanguages: AdminSiteLanguageRow[];
};

export function WebsiteConfigEditor({ initialConfig, activeLanguages }: Props) {
  const [navColumns, setNavColumns] = useState<NavColumn[]>(() => compactNavColumns(initialConfig.navColumns));
  const [activeLocale, setActiveLocale] = useState(
    activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? 'zh',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<NavColumn | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  const columns = useMemo(() => [
    {
      title: '栏目标题',
      dataIndex: 'name',
      ellipsis: true,
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
            disabled={index === navColumns.length - 1}
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
  ], [navColumns]);

  function moveColumn(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= navColumns.length) return;
    setNavColumns((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeColumn(id: string) {
    setNavColumns((prev) => prev.filter((row) => row.id !== id));
  }

  function openColumnEditor(column: NavColumn | null) {
    setEditingColumn(column);
    setDrawerOpen(true);
  }

  function handleColumnSave(saved: NavColumn) {
    setNavColumns((prev) => {
      const exists = prev.some((row) => row.id === saved.id);
      return exists ? prev.map((row) => (row.id === saved.id ? saved : row)) : [...prev, saved];
    });
    setDrawerOpen(false);
    setEditingColumn(null);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        setStatusMessage(null);
        const response = await fetch('/api/admin/website-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ navColumns }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || '保存失败');
        }
        const updated = await response.json() as AdminWebsiteConfig;
        setNavColumns(compactNavColumns(updated.navColumns));
        setStatusMessage('网站配置已保存');
        message.success('网站配置已保存');
      } catch (error) {
        const text = error instanceof Error ? error.message : '保存失败';
        setStatusMessage(text.includes('失败') ? text : `${text}失败`);
        message.error(text);
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="网站配置"
        description="维护全站导航栏目与条目，保存后前台头部与底部导航将同步使用。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={handleSave}
      />

      <div className="content-editor-shared-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography.Text strong>导航</Typography.Text>
          <Button icon={<PlusOutlined />} onClick={() => openColumnEditor(null)}>添加导航栏目</Button>
        </div>
        <Table
          rowKey="id"
          size="middle"
          pagination={false}
          columns={columns}
          dataSource={navColumns}
          locale={{ emptyText: '暂无导航栏目' }}
        />
      </div>

      <div className="content-editor-layout">
        <div className="content-editor-locale-nav">
          {activeLanguages.map((language) => (
            <ContentEditorLocaleTab
              key={language.code}
              language={language}
              isActive={language.code === activeLocale}
              persisted={language.code === defaultLocale}
              onClick={() => setActiveLocale(language.code)}
            />
          ))}
        </div>
        <div className="content-editor-main">
          <Typography.Text type="secondary">
            暂无多语言字段，后续在此配置站点级多语言内容。导航栏目与条目标题请在对应编辑弹层中维护。
          </Typography.Text>
        </div>
      </div>

      <NavColumnDrawer
        open={drawerOpen}
        column={editingColumn}
        activeLanguages={activeLanguages}
        onClose={() => { setDrawerOpen(false); setEditingColumn(null); }}
        onSave={handleColumnSave}
      />
    </Space>
  );
}
