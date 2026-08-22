'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { SummitEditorModal } from '@/components/summits/summit-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import {
  type AdminSummitDetail,
  type AdminSummitListItem,
  type SummitStatus,
  summitStatusLabels,
} from '@/lib/summit-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminSummitListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

const statusColors: Record<SummitStatus, string> = {
  upcoming: 'blue',
  registering: 'green',
  completed: 'default',
};

async function fetchDetail(id: string): Promise<AdminSummitDetail> {
  const r = await fetch(`/api/admin/summits/${id}`);
  if (!r.ok) throw new Error('加载详情失败');
  return r.json() as Promise<AdminSummitDetail>;
}

function toListItem(d: AdminSummitDetail): AdminSummitListItem {
  return {
    id: d.id, slug: d.slug, status: d.status,
    startDate: d.startDate, endDate: d.endDate,
    coverImage: d.coverImage,
    coverMode: d.coverMode,
    coverValue: d.coverValue,
    coverPreviewUrl: d.coverPreviewUrl,
    venueImage: d.venueImage,
    sortOrder: d.sortOrder, title: d.title,
    localeCount: d.translations.length, updatedAt: d.updatedAt,
  };
}

export function SummitListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminSummitDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((i) => i.slug.includes(kw) || i.title.toLowerCase().includes(kw));
  }, [items, keyword]);

  function deleteSummit(record: AdminSummitListItem) {
    startTransition(async () => {
      setPendingId(record.id);
      try {
        const r = await fetch(`/api/admin/summits/${record.id}`, { method: 'DELETE' });
        if (!r.ok) { message.error('删除失败'); return; }
        setItems((c) => c.filter((i) => i.id !== record.id));
        if (editingDetail?.id === record.id) { setEditorOpen(false); setEditingDetail(null); }
        message.success('已删除');
      } finally { setPendingId(null); }
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    {
      title: '标题', dataIndex: 'title', ellipsis: true, onHeaderCell: adminTableNowrapHeader,
      render: (v: string) => <Tooltip title={v}><Typography.Text ellipsis>{v}</Typography.Text></Tooltip>,
    },
    { title: 'Slug', dataIndex: 'slug', width: 180, ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    {
      title: '状态', dataIndex: 'status', width: 100, onHeaderCell: adminTableNowrapHeader,
      render: (v: SummitStatus) => <Tag color={statusColors[v]}>{summitStatusLabels[v]}</Tag>,
    },
    {
      title: '开始时间', dataIndex: 'startDate', width: 148, onHeaderCell: adminTableNowrapHeader,
      render: (v: string | null) => v ? <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(v)}</Typography.Text> : '—',
    },
    {
      title: '最近更新', dataIndex: 'updatedAt', width: 148, onHeaderCell: adminTableNowrapHeader,
      render: (v: string) => <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(v)}</Typography.Text>,
    },
    adminTableFixedActionsColumn({
      title: '操作', key: 'actions', width: 100,
      render: (_: unknown, record: AdminSummitListItem) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => {
            startTransition(async () => {
              try { const d = await fetchDetail(record.id); setEditingDetail(d); setEditorOpen(true); }
              catch (e) { message.error(e instanceof Error ? e.message : '加载失败'); }
            });
          }} />
          <Popconfirm title="确定删除吗？" onConfirm={() => deleteSummit(record)}>
            <Button type="text" danger icon={<DeleteOutlined />} loading={pendingId === record.id} />
          </Popconfirm>
        </Space>
      ),
    }),
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button type="primary" icon={<PlusOutlined />} loading={isPending} onClick={() => {
          if (!activeLanguages.length) { message.warning('请先在「多语言管理」中添加并启用语言'); return; }
          setEditingDetail(null); setEditorOpen(true);
        }}>新建行业峰会</Button>
      </Space>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search allowClear placeholder="搜索标题、slug" style={{ width: 280 }} onSearch={setKeyword} />
          <Table
            rowKey="id"
            pagination={false}
            tableLayout="fixed"
            style={{ width: '100%' }}
            scroll={adminTableScroll(960)}
            columns={columns}
            dataSource={filtered}
            locale={{ emptyText: '暂无行业峰会' }}
          />
        </Space>
      </Card>
      <SummitEditorModal
        open={editorOpen}
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => { setEditorOpen(false); setEditingDetail(null); }}
        onSaved={(saved) => {
          const li = toListItem(saved);
          setItems((c) => { const exists = c.some((i) => i.id === saved.id); return exists ? c.map((i) => (i.id === saved.id ? li : i)) : [li, ...c]; });
          setEditingDetail(saved);
        }}
      />
    </Space>
  );
}
