'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AdminEditorialRowActions } from '@/components/admin/admin-row-actions';
import { ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH, adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { BrandNarrativeEditorModal } from '@/components/brand-narratives/brand-narrative-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import {
  type AdminBrandNarrativeDetail,
  type AdminBrandNarrativeListItem,
  type BrandNarrativeStatus,
} from '@/lib/brand-narrative-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type BrandNarrativeListClientProps = {
  initialList: {
    items: AdminBrandNarrativeListItem[];
    total: number;
  };
  activeLanguages: AdminSiteLanguageRow[];
};

const narrativeStatusLabels: Record<BrandNarrativeStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const narrativeStatusColors: Record<BrandNarrativeStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'red',
};

async function fetchBrandNarrativeDetail(id: string): Promise<AdminBrandNarrativeDetail> {
  const response = await fetch(`/api/admin/brand-narratives/${id}`);
  if (!response.ok) throw new Error('加载详情失败');
  return response.json() as Promise<AdminBrandNarrativeDetail>;
}

function toListItem(detail: AdminBrandNarrativeDetail): AdminBrandNarrativeListItem {
  return {
    id: detail.id,
    slug: detail.slug,
    sortOrder: detail.sortOrder,
    status: detail.status,
    coverImage: detail.coverImage,
    gallery: detail.gallery ?? [],
    videoUrl: detail.videoUrl ?? '',
    backgroundMode: detail.backgroundMode,
    backgroundValue: detail.backgroundValue,
    backgroundImage: detail.backgroundImage,
    backgroundPreviewUrl: detail.backgroundPreviewUrl,
    showCoverOnBackground: detail.showCoverOnBackground,
    title: detail.title,
    localeCount: detail.translations.length,
    publishedAt: detail.publishedAt,
    updatedAt: detail.updatedAt,
  };
}

export function BrandNarrativeListClient({ initialList, activeLanguages }: BrandNarrativeListClientProps) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminBrandNarrativeDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return items;
    return items.filter((item) => item.slug.includes(normalizedKeyword) || item.title.toLowerCase().includes(normalizedKeyword));
  }, [items, keyword]);

  function patchNarrativeStatus(record: AdminBrandNarrativeListItem, status: BrandNarrativeStatus) {
    startTransition(async () => {
      setPendingId(record.id);
      try {
        const response = await fetch(`/api/admin/brand-narratives/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          message.error('更新状态失败');
          return;
        }
        const updated = (await response.json()) as AdminBrandNarrativeDetail;
        setItems((current) =>
          current.map((item) =>
            item.id === updated.id ? toListItem(updated) : item,
          ),
        );
        if (editingDetail?.id === updated.id) {
          setEditingDetail(updated);
        }
        message.success(`叙事已${narrativeStatusLabels[status]}`);
      } finally {
        setPendingId(null);
      }
    });
  }

  function deleteNarrative(record: AdminBrandNarrativeListItem) {
    startTransition(async () => {
      setPendingId(record.id);
      try {
        const response = await fetch(`/api/admin/brand-narratives/${record.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          message.error('删除失败');
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        if (editingDetail?.id === record.id) {
          setEditorOpen(false);
          setEditingDetail(null);
        }
        message.success('叙事已删除');
      } finally {
        setPendingId(null);
      }
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filteredItems.length || 1),
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      width: 160,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: BrandNarrativeStatus) => (
        <Tag color={narrativeStatusColors[value]}>{narrativeStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 140,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 148,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH,
      render: (_: unknown, record: AdminBrandNarrativeListItem) => (
        <AdminEditorialRowActions
          loading={pendingId === record.id}
          status={record.status}
          onEdit={() => {
            startTransition(async () => {
              try {
                const detail = await fetchBrandNarrativeDetail(record.id);
                setEditingDetail(detail);
                setEditorOpen(true);
              } catch (error) {
                message.error(error instanceof Error ? error.message : '加载失败');
              }
            });
          }}
          onPublish={() => patchNarrativeStatus(record, 'published')}
          onArchive={() => patchNarrativeStatus(record, 'archived')}
          onDelete={() => deleteNarrative(record)}
        />
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={isPending}
          onClick={() => {
            if (!activeLanguages.length) {
              message.warning('请先在「多语言管理」中添加并启用语言');
              return;
            }
            setEditingDetail(null);
            setEditorOpen(true);
          }}
        >
          新建企业叙事
        </Button>
      </Space>

      <Card>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="搜索标题、slug"
            style={{ maxWidth: 360 }}
            onSearch={setKeyword}
          />
          <Table
            rowKey="id"
            pagination={false}
            tableLayout="fixed"
            style={{ width: '100%' }}
            scroll={adminTableScroll(980)}
            columns={columns}
            dataSource={filteredItems}
            locale={{ emptyText: '暂无叙事' }}
          />
        </Space>
      </Card>

      <BrandNarrativeEditorModal
        open={editorOpen}
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => {
          setEditorOpen(false);
          setEditingDetail(null);
        }}
        onSaved={(savedDetail) => {
          const listItem = toListItem(savedDetail);
          setItems((current) => {
            const exists = current.some((item) => item.id === savedDetail.id);
            if (!exists) return [listItem, ...current];
            return current.map((item) => (item.id === savedDetail.id ? { ...item, ...listItem } : item));
          });
          setEditingDetail(savedDetail);
        }}
      />
    </Space>
  );
}
