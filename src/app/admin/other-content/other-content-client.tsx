'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEditorialRowActions } from '@/components/admin/admin-row-actions';
import {
  ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { ContentEditorModal } from '@/components/editorial/content-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import {
  type AdminListPageSize,
  type AdminListQuery,
  buildAdminListRowIndexColumn,
  buildAdminListUrl,
  parseAdminListQuery,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/admin-list-query';
import {
  OTHER_BOARD_KEY,
  type AdminEditorialContentListItem,
  type AdminEditorialContentTranslation,
  type EditorialEntryStatus,
} from '@/lib/editorial-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

const entryStatusLabels: Record<EditorialEntryStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const entryStatusColors: Record<EditorialEntryStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'red',
};

type ListState = {
  items: AdminEditorialContentListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

async function fetchOtherContentList(options: {
  keyword: string;
  page: number;
  pageSize: AdminListPageSize;
}) {
  const params = new URLSearchParams();
  params.set('module', 'other');
  params.set('page', String(options.page));
  params.set('page_size', String(options.pageSize));
  if (options.keyword) params.set('keyword', options.keyword);

  const response = await fetch(`/api/admin/editorial/content?${params.toString()}`);
  if (!response.ok) {
    throw new Error('加载内容列表失败');
  }

  const payload = (await response.json()) as {
    items: AdminEditorialContentListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function AdminOtherContentClient({
  initialList,
  initialQuery,
  activeLanguages,
}: {
  initialList: ListState;
  initialQuery: AdminListQuery;
  activeLanguages: AdminSiteLanguageRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [listState, setListState] = useState(initialList);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isListLoading, startListTransition] = useTransition();
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminEditorialContentListItem | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const skipUrlSyncRef = useRef(true);

  const replaceUrl = useCallback((nextQuery: AdminListQuery) => {
    router.replace(buildAdminListUrl('/admin/other-content', nextQuery));
  }, [router]);

  const reloadList = useCallback((nextQuery: AdminListQuery) => {
    setQuery(nextQuery);
    startListTransition(() => {
      void (async () => {
        try {
          const result = await fetchOtherContentList({
            keyword: nextQuery.keyword,
            page: nextQuery.page,
            pageSize: nextQuery.pageSize,
          });
          setListState(result);
        } catch {
          void messageApi.error('加载内容列表失败');
        }
      })();
    });
  }, [messageApi]);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const urlQuery = parseAdminListQuery(Object.fromEntries(searchParams.entries()));
    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    } else {
      urlQuery.pageSize = readStoredPageSize() ?? urlQuery.pageSize;
    }

    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  const summaryStats = useMemo(() => [
    { label: '内容总量', value: listState.total },
    { label: '已发布', value: listState.items.filter((item) => item.status === 'published').length },
    { label: '当前页', value: listState.items.length },
  ], [listState]);

  function applyQueryChange(patch: Partial<AdminListQuery>) {
    const nextQuery: AdminListQuery = {
      board: '',
      parentId: patch.parentId ?? query.parentId,
      keyword: patch.keyword ?? query.keyword,
      page: patch.page ?? query.page,
      pageSize: patch.pageSize ?? query.pageSize,
    };

    if (patch.pageSize) {
      writeStoredPageSize(patch.pageSize);
    }

    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  function openContentModal(entry?: AdminEditorialContentListItem) {
    if (!entry && !activeLanguages.length) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
    }
    setEditingEntry(entry ?? null);
    setContentModalOpen(true);
  }

  function closeContentModal() {
    setContentModalOpen(false);
    setEditingEntry(null);
  }

  function handleEntrySaved(saved: AdminEditorialContentTranslation) {
    void (async () => {
      const response = await fetch(`/api/admin/editorial/content/${saved.contentId}`);
      if (response.ok) {
        const payload = (await response.json()) as { item: AdminEditorialContentListItem };
        setEditingEntry(payload.item);
      }
      reloadList(query);
    })();
  }

  function patchEntryStatus(entry: AdminEditorialContentListItem, status: EditorialEntryStatus) {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/content/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          void messageApi.error('状态更新失败');
          return;
        }

        void messageApi.success(`内容已${entryStatusLabels[status]}`);
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  function deleteContent(entry: AdminEditorialContentListItem) {
    setPendingEntryId(entry.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/content/${entry.id}`, { method: 'DELETE' });
        if (!response.ok) {
          void messageApi.error('内容删除失败');
          return;
        }
        void messageApi.success('内容已删除');
        reloadList(query);
      } finally {
        setPendingEntryId(null);
      }
    })();
  }

  const columns = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text ellipsis title={value}>{value}</Typography.Text>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      width: 180,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text ellipsis title={value}>{value}</Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 72,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: EditorialEntryStatus) => (
        <Tag color={entryStatusColors[value]}>{entryStatusLabels[value]}</Tag>
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
      width: 140,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(value)}</Typography.Text>
      ),
    },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_EDITORIAL_ACTIONS_WIDTH,
      render: (_: unknown, row: AdminEditorialContentListItem) => (
        <AdminEditorialRowActions
          loading={pendingEntryId === row.id}
          status={row.status}
          onEdit={() => openContentModal(row)}
          onPublish={() => patchEntryStatus(row, 'published')}
          onArchive={() => patchEntryStatus(row, 'archived')}
          onDelete={() => deleteContent(row)}
        />
      ),
    }),
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openContentModal()}>
          新建其他内容
        </Button>
      </Space>

      <Card>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search
            placeholder="搜索标题、Slug、正文"
            allowClear
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
            style={{ maxWidth: 360 }}
          />
          <Table
            rowKey="id"
            loading={isListLoading}
            pagination={false}
            tableLayout="fixed"
            style={{ width: '100%' }}
            scroll={adminTableScroll(980)}
            dataSource={listState.items}
            columns={columns}
            locale={{ emptyText: '暂无其他内容' }}
          />
          <AdminListPagination
            page={listState.page}
            pageSize={listState.pageSize}
            total={listState.total}
            disabled={isListLoading}
            onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
          />
        </Space>
      </Card>

      <ContentEditorModal
        open={contentModalOpen}
        boardKey={OTHER_BOARD_KEY}
        boardLabel="其他内容"
        availableBoards={[]}
        activeLanguages={activeLanguages}
        editingEntry={editingEntry}
        contentModule="other"
        hideBoardSelect
        translateContentType="other"
        onClose={closeContentModal}
        onSaved={handleEntrySaved}
      />
    </Space>
  );
}
