'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { PartnerCenterEditorModal } from '@/components/partner-centers/partner-center-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import {
  type AdminPartnerCenterDetail,
  type AdminPartnerCenterListItem,
  type CenterRegion,
  centerRegionLabels,
} from '@/lib/partner-center-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminPartnerCenterListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

const regionColors: Record<CenterRegion, string> = {
  'asia-pacific': 'blue',
  'europe': 'purple',
  'north-america': 'green',
  'latin-america': 'orange',
  'middle-east-africa': 'gold',
  'oceania': 'cyan',
};

async function fetchDetail(id: string): Promise<AdminPartnerCenterDetail> {
  const r = await fetch(`/api/admin/partner-centers/${id}`);
  if (!r.ok) throw new Error('加载详情失败');
  return r.json() as Promise<AdminPartnerCenterDetail>;
}

function toListItem(d: AdminPartnerCenterDetail): AdminPartnerCenterListItem {
  return {
    id: d.id,
    slug: d.slug,
    region: d.region,
    email: d.email,
    website: d.website,
    coverImage: d.coverImage,
    coverMode: d.coverMode,
    coverValue: d.coverValue,
    coverPreviewUrl: d.coverPreviewUrl,
    gallery: d.gallery ?? [],
    videoUrl: d.videoUrl ?? '',
    logo: d.logo,
    backgroundImage: d.backgroundImage,
    backgroundMode: d.backgroundMode,
    backgroundValue: d.backgroundValue,
    backgroundPreviewUrl: d.backgroundPreviewUrl,
    showCoverOnBackground: d.showCoverOnBackground,
    heroCopyStyle: d.heroCopyStyle,
    sortOrder: d.sortOrder,
    name: d.name,
    localeCount: d.translations.length,
    updatedAt: d.updatedAt,
  };
}

export function PartnerCenterListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [regionFilter, setRegionFilter] = useState<CenterRegion | ''>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminPartnerCenterDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let result = items;
    if (regionFilter) result = result.filter((i) => i.region === regionFilter);
    const kw = keyword.trim().toLowerCase();
    if (kw) result = result.filter((i) => i.slug.includes(kw) || i.name.toLowerCase().includes(kw));
    return result;
  }, [items, keyword, regionFilter]);

  function deleteCenter(record: AdminPartnerCenterListItem) {
    startTransition(async () => {
      setPendingId(record.id);
      try {
        const r = await fetch(`/api/admin/partner-centers/${record.id}`, { method: 'DELETE' });
        if (!r.ok) { message.error('删除失败'); return; }
        setItems((c) => c.filter((i) => i.id !== record.id));
        if (editingDetail?.id === record.id) { setEditorOpen(false); setEditingDetail(null); }
        message.success('已删除');
      } finally { setPendingId(null); }
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    { title: '名称', dataIndex: 'name', ellipsis: true, onHeaderCell: adminTableNowrapHeader, render: (v: string) => <Tooltip title={v}><Typography.Text ellipsis>{v}</Typography.Text></Tooltip> },
    { title: 'Slug', dataIndex: 'slug', width: 160, ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    {
      title: '地区', dataIndex: 'region', width: 130, onHeaderCell: adminTableNowrapHeader,
      render: (v: CenterRegion) => <Tag color={regionColors[v]}>{centerRegionLabels[v]}</Tag>,
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 148, onHeaderCell: adminTableNowrapHeader, render: (v: string) => <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(v)}</Typography.Text> },
    adminTableFixedActionsColumn({
      title: '操作', key: 'actions', width: 100,
      render: (_: unknown, record: AdminPartnerCenterListItem) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => {
            startTransition(async () => {
              try { const d = await fetchDetail(record.id); setEditingDetail(d); setEditorOpen(true); }
              catch (e) { message.error(e instanceof Error ? e.message : '加载失败'); }
            });
          }} />
          <Popconfirm title="确定删除吗？" onConfirm={() => deleteCenter(record)}>
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
        }}>新建合作中心</Button>
      </Space>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Input.Search allowClear placeholder="搜索名称、slug" style={{ width: 280 }} onSearch={setKeyword} />
            <Select
              allowClear placeholder="筛选地区" style={{ width: 160 }}
              onChange={(v) => setRegionFilter((v as CenterRegion) ?? '')}
              options={Object.entries(centerRegionLabels).map(([value, label]) => ({ value, label }))}
            />
          </Space>
          <Table rowKey="id" pagination={false} tableLayout="fixed" style={{ width: '100%' }} scroll={adminTableScroll(860)} columns={columns} dataSource={filtered} locale={{ emptyText: '暂无合作中心' }} />
        </Space>
      </Card>
      <PartnerCenterEditorModal
        open={editorOpen} detail={editingDetail} activeLanguages={activeLanguages}
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
