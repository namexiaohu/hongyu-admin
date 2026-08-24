'use client';

import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Typography, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { NavColumnDrawer } from '@/components/website-config/nav-column-drawer';
import {
  ListHeroBoardFields,
  listHeroBoardFromFormValues,
} from '@/components/website-config/list-hero-board-fields';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import {
  type AdminWebsiteConfig,
  type NavColumn,
  compactNavColumns,
} from '@/lib/website-config';
import {
  listHeroBoardKeys,
  type AdminListHeroBoardsRecord,
  type ListHeroBoardKey,
} from '@/lib/list-hero-board';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialConfig: AdminWebsiteConfig;
  activeLanguages: AdminSiteLanguageRow[];
};

export function WebsiteConfigEditor({ initialConfig, activeLanguages: _activeLanguages }: Props) {
  const [navColumns, setNavColumns] = useState<NavColumn[]>(() => compactNavColumns(initialConfig.navColumns));
  const [listHeroBoards, setListHeroBoards] = useState<AdminListHeroBoardsRecord>(initialConfig.listHeroBoards);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<NavColumn | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setListHeroBoards(initialConfig.listHeroBoards);
  }, [initialConfig.listHeroBoards]);

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

  function updateListHeroBoard(key: ListHeroBoardKey, patch: ReturnType<typeof listHeroBoardFromFormValues>) {
    setListHeroBoards((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        setStatusMessage(null);
        const response = await fetch('/api/admin/website-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            navColumns,
            listHeroBoards: {
              insights: {
                coverMode: listHeroBoards.insights.coverMode,
                coverValue: listHeroBoards.insights.coverValue,
                videoUrl: listHeroBoards.insights.videoUrl,
                showCoverOnBackground: listHeroBoards.insights.showCoverOnBackground,
                coverDisplay: listHeroBoards.insights.coverDisplay,
                heroCopyStyle: listHeroBoards.insights.heroCopyStyle,
                backgroundFitMode: listHeroBoards.insights.backgroundFitMode,
                backgroundMode: listHeroBoards.insights.backgroundMode,
                backgroundValue: listHeroBoards.insights.backgroundValue,
              },
              surgeons: {
                coverMode: listHeroBoards.surgeons.coverMode,
                coverValue: listHeroBoards.surgeons.coverValue,
                videoUrl: listHeroBoards.surgeons.videoUrl,
                showCoverOnBackground: listHeroBoards.surgeons.showCoverOnBackground,
                coverDisplay: listHeroBoards.surgeons.coverDisplay,
                heroCopyStyle: listHeroBoards.surgeons.heroCopyStyle,
                backgroundFitMode: listHeroBoards.surgeons.backgroundFitMode,
                backgroundMode: listHeroBoards.surgeons.backgroundMode,
                backgroundValue: listHeroBoards.surgeons.backgroundValue,
              },
              centers: {
                coverMode: listHeroBoards.centers.coverMode,
                coverValue: listHeroBoards.centers.coverValue,
                videoUrl: listHeroBoards.centers.videoUrl,
                showCoverOnBackground: listHeroBoards.centers.showCoverOnBackground,
                coverDisplay: listHeroBoards.centers.coverDisplay,
                heroCopyStyle: listHeroBoards.centers.heroCopyStyle,
                backgroundFitMode: listHeroBoards.centers.backgroundFitMode,
                backgroundMode: listHeroBoards.centers.backgroundMode,
                backgroundValue: listHeroBoards.centers.backgroundValue,
              },
            },
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || '保存失败');
        }
        const updated = await response.json() as AdminWebsiteConfig;
        setNavColumns(compactNavColumns(updated.navColumns));
        setListHeroBoards(updated.listHeroBoards);
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
        description="维护全站导航栏目与条目，以及列表页看板媒体配置，保存后前台同步生效。"
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

      {listHeroBoardKeys.map((boardKey) => (
        <ListHeroBoardFields
          key={boardKey}
          boardKey={boardKey}
          value={listHeroBoards[boardKey]}
          onChange={(next) => updateListHeroBoard(boardKey, next)}
        />
      ))}

      <NavColumnDrawer
        open={drawerOpen}
        column={editingColumn}
        activeLanguages={_activeLanguages}
        onClose={() => { setDrawerOpen(false); setEditingColumn(null); }}
        onSave={handleColumnSave}
      />
    </Space>
  );
}
