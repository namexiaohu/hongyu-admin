'use client';

import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminListPagination } from '@/components/admin/admin-list-pagination';
import { AdminActionIconButton, AdminConfirmActionIconButton } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { ComplaintViewSwitch } from '@/components/complaints/complaint-view-switch';
import { formatAdminDate } from '@/lib/admin-display';
import { type AdminListPageSize, buildAdminListRowIndexColumn, readStoredPageSize, writeStoredPageSize } from '@/lib/admin-list-query';
import {
  buildComplaintDetailUrl,
  buildComplaintHistoryListUrl,
  parseComplaintHistoryListQuery,
  type ComplaintHistoryListQuery,
} from '@/lib/complaint-list-query';
import {
  complaintDisplayContact,
  complaintDisplayName,
  complaintExcerpt,
  complaintStatusColors,
  complaintStatusLabels,
  complaintStatusOptions,
} from '@/lib/complaint-display';
import type { AdminComplaintListItem } from '@/server/admin/complaints';

type ComplaintHistoryListState = {
  items: AdminComplaintListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

type ComplaintHistoryListClientProps = {
  initialList: ComplaintHistoryListState;
  initialQuery: ComplaintHistoryListQuery;
};

async function fetchHistoryComplaints(query: ComplaintHistoryListQuery): Promise<ComplaintHistoryListState> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.status) params.set('status', query.status);

  const response = await fetch(`/api/admin/complaints/history?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载历史投诉建议失败');

  const payload = (await response.json()) as {
    items: AdminComplaintListItem[];
    meta: { total: number; page: number; pageSize: number };
  };

  return {
    items: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    pageSize: payload.meta.pageSize as AdminListPageSize,
  };
}

export function ComplaintHistoryListClient({ initialList, initialQuery }: ComplaintHistoryListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);
  const hydratedPageSizeRef = useRef(false);

  const [listState, setListState] = useState(initialList);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isListLoading, startListTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: ComplaintHistoryListQuery) => {
    router.replace(buildComplaintHistoryListUrl('/admin/complaints/history', nextQuery), { scroll: false });
  }, [router]);

  const reloadList = useCallback((nextQuery: ComplaintHistoryListQuery) => {
    startListTransition(async () => {
      const result = await fetchHistoryComplaints(nextQuery);
      setListState(result);
      setQuery(nextQuery);
    });
  }, []);

  useEffect(() => {
    if (hydratedPageSizeRef.current) return;
    hydratedPageSizeRef.current = true;
    const stored = readStoredPageSize();
    if (!searchParams.get('page_size') && stored && stored !== initialQuery.pageSize) {
      replaceUrl({ ...initialQuery, pageSize: stored, page: 1 });
    }
  }, [searchParams, initialQuery, replaceUrl]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const urlQuery = parseComplaintHistoryListQuery(Object.fromEntries(searchParams.entries()), {
      storedPageSize: readStoredPageSize(),
    });
    if (searchParams.get('page_size')) {
      writeStoredPageSize(urlQuery.pageSize);
    }
    setSearchInput(urlQuery.keyword);
    reloadList(urlQuery);
  }, [searchParams, reloadList]);

  function applyQueryChange(patch: Partial<ComplaintHistoryListQuery>) {
    const nextQuery: ComplaintHistoryListQuery = {
      keyword: patch.keyword ?? query.keyword,
      status: patch.status ?? query.status,
      page: patch.page ?? 1,
      pageSize: patch.pageSize ?? query.pageSize,
    };
    if (patch.pageSize) writeStoredPageSize(patch.pageSize);
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  async function deleteComplaint(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/complaints/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        void message.error('删除失败');
        return;
      }
      void message.success('已删除');
      reloadList(query);
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnsType<AdminComplaintListItem> = [
    buildAdminListRowIndexColumn(listState.page, listState.pageSize),
    {
      title: '姓名',
      dataIndex: 'fullName',
      width: 140,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => complaintDisplayName(value),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      width: 180,
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string | null) => complaintDisplayContact(value),
    },
    {
      title: '内容',
      dataIndex: 'message',
      ellipsis: true,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => complaintExcerpt(value, 60),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: AdminComplaintListItem['status']) => (
        <Tag color={complaintStatusColors[value]}>{complaintStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 168,
      onHeaderCell: adminTableNowrapHeader,
      render: (value: string) => formatAdminDate(value),
    },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: 96,
      render: (_: unknown, record: AdminComplaintListItem) => (
        <Space size={0}>
          <AdminActionIconButton
            title="查看"
            icon={<EyeOutlined />}
            onClick={() => router.push(buildComplaintDetailUrl(record.id, 'history', query))}
          />
          <AdminConfirmActionIconButton
            title="删除"
            icon={<DeleteOutlined />}
            danger
            loading={deletingId === record.id}
            confirmTitle="确定删除该投诉建议吗？"
            okText="删除"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteComplaint(record.id)}
          />
        </Space>
      ),
    }),
  ];

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0 }}>投诉建议</h1>
      </div>
      <ComplaintViewSwitch current="history" />
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索姓名、联系方式、内容"
              style={{ width: 320 }}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onSearch={(value) => applyQueryChange({ keyword: value.trim(), page: 1 })}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              value={query.status || undefined}
              options={complaintStatusOptions}
              onChange={(value) => applyQueryChange({ status: value ?? '', page: 1 })}
            />
          </Space>
          <Table
            rowKey="id"
            loading={isListLoading}
            pagination={false}
            tableLayout="fixed"
            scroll={adminTableScroll(960)}
            columns={columns}
            dataSource={listState.items}
            locale={{ emptyText: '暂无历史投诉建议' }}
          />
          <AdminListPagination
            page={listState.page}
            pageSize={listState.pageSize}
            total={listState.total}
            disabled={isListLoading}
            onChange={({ page, pageSize }) => applyQueryChange({ page, pageSize })}
          />
          <Typography.Text type="secondary">共 {listState.total} 条</Typography.Text>
        </Space>
      </Card>
    </main>
  );
}
