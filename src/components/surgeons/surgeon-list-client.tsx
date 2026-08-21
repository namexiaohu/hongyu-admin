'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { SurgeonEditorModal } from '@/components/surgeons/surgeon-editor-modal';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { AdminSurgeonDetail, AdminSurgeonListItem, SurgeonGradeKey } from '@/lib/surgeon-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminSurgeonListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

const gradeLabels: Record<SurgeonGradeKey, string> = { platinum: '铂金', gold: '金', silver: '银' };
const gradeColors: Record<SurgeonGradeKey, string> = { platinum: 'blue', gold: 'gold', silver: 'default' };

async function fetchDetail(id: string): Promise<AdminSurgeonDetail> {
  const r = await fetch(`/api/admin/surgeons/${id}`);
  if (!r.ok) throw new Error('加载详情失败');
  return r.json() as Promise<AdminSurgeonDetail>;
}

function toListItem(d: AdminSurgeonDetail): AdminSurgeonListItem {
  return {
    id: d.id,
    slug: d.slug,
    avatar: d.avatar,
    gradeKey: d.gradeKey,
    certificationYear: d.certificationYear,
    surgeryCount: d.surgeryCount,
    sortOrder: d.sortOrder,
    name: d.name,
    localeCount: d.translations.length,
    updatedAt: d.updatedAt,
  };
}

export function SurgeonListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminSurgeonDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((i) => i.slug.includes(kw) || i.name.toLowerCase().includes(kw));
  }, [items, keyword]);

  function deleteSurgeon(record: AdminSurgeonListItem) {
    startTransition(async () => {
      setPendingId(record.id);
      try {
        const r = await fetch(`/api/admin/surgeons/${record.id}`, { method: 'DELETE' });
        if (!r.ok) { message.error('删除失败'); return; }
        setItems((c) => c.filter((i) => i.id !== record.id));
        if (editingDetail?.id === record.id) { setEditorOpen(false); setEditingDetail(null); }
        message.success('已删除');
      } finally { setPendingId(null); }
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    { title: '姓名', dataIndex: 'name', ellipsis: true, onHeaderCell: adminTableNowrapHeader, render: (v: string) => <Tooltip title={v}><Typography.Text ellipsis>{v}</Typography.Text></Tooltip> },
    { title: 'Slug', dataIndex: 'slug', width: 140, ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    { title: '等级', dataIndex: 'gradeKey', width: 80, onHeaderCell: adminTableNowrapHeader, render: (v: SurgeonGradeKey) => <Tag color={gradeColors[v]}>{gradeLabels[v]}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', width: 148, onHeaderCell: adminTableNowrapHeader, render: (v: string) => <Typography.Text style={{ whiteSpace: 'nowrap' }}>{formatAdminDate(v)}</Typography.Text> },
    adminTableFixedActionsColumn({
      title: '操作', key: 'actions', width: 100,
      render: (_: unknown, record: AdminSurgeonListItem) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => {
            startTransition(async () => {
              try { const d = await fetchDetail(record.id); setEditingDetail(d); setEditorOpen(true); } catch (e) { message.error(e instanceof Error ? e.message : '加载失败'); }
            });
          }} />
          <Popconfirm title="确定删除吗？" onConfirm={() => deleteSurgeon(record)}>
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
        }}>新建认证术者</Button>
      </Space>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search allowClear placeholder="搜索姓名、slug" style={{ maxWidth: 360 }} onSearch={setKeyword} />
          <Table rowKey="id" pagination={false} tableLayout="fixed" style={{ width: '100%' }} scroll={adminTableScroll(800)} columns={columns} dataSource={filtered} locale={{ emptyText: '暂无认证术者' }} />
        </Space>
      </Card>
      <SurgeonEditorModal
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
