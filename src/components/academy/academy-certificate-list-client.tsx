'use client';

import { EyeInvisibleOutlined, PlusOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tag, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AcademyEditorModal } from '@/components/academy/academy-editor-modal';
import {
  ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { AdminAcademyCertificateDetail, AdminAcademyCertificateListItem } from '@/lib/academy-certificate-content';
import {
  type AcademyStatus,
  academyStatusColors,
  academyStatusLabels,
} from '@/lib/academy-content-shared';
import { confirmAcademyListingChange } from '@/lib/confirm-academy-listing';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminAcademyCertificateListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

async function fetchDetail(id: string): Promise<AdminAcademyCertificateDetail> {
  const response = await fetch(`/api/admin/academy/certificates/${id}`);
  if (!response.ok) throw new Error('加载详情失败');
  return response.json() as Promise<AdminAcademyCertificateDetail>;
}

function toListItem(detail: AdminAcademyCertificateDetail): AdminAcademyCertificateListItem {
  const { translations: _translations, courseIds: _courseIds, ...item } = detail;
  return item;
}

function listingStatus(status: string): AcademyStatus {
  return status === 'published' ? 'published' : 'draft';
}

export function AcademyCertificateListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyCertificateDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.slug.includes(kw) || item.title.toLowerCase().includes(kw));
  }, [items, keyword]);

  function patchStatus(record: AdminAcademyCertificateListItem, nextStatus: AcademyStatus) {
    setPendingId(record.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/academy/certificates/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          message.error(payload?.message ?? '状态更新失败');
          return;
        }
        const saved = (await response.json()) as AdminAcademyCertificateDetail;
        setItems((current) => current.map((item) => (item.id === record.id ? toListItem(saved) : item)));
        message.success(`证书已${academyStatusLabels[nextStatus]}`);
      } finally {
        setPendingId(null);
      }
    })();
  }

  function deleteCertificate(record: AdminAcademyCertificateListItem) {
    setPendingId(record.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/academy/certificates/${record.id}`, { method: 'DELETE' });
        if (!response.ok) {
          message.error('删除失败');
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        message.success('已删除');
      } finally {
        setPendingId(null);
      }
    })();
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    { title: '标题', dataIndex: 'title', ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    { title: 'Slug', dataIndex: 'slug', width: 180, onHeaderCell: adminTableNowrapHeader },
    { title: '课程数', dataIndex: 'courseCount', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => {
        const status = listingStatus(value);
        return <Tag color={academyStatusColors[status]}>{academyStatusLabels[status]}</Tag>;
      },
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 148, render: (value: string) => formatAdminDate(value) },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
      render: (_: unknown, record: AdminAcademyCertificateListItem) => (
        <AdminEntityRowActions
          loading={pendingId === record.id}
          entityName="证书"
          isActive={listingStatus(record.status) === 'published'}
          toggleUsePopconfirm={false}
          onEdit={() => {
            startTransition(async () => {
              try {
                const detail = await fetchDetail(record.id);
                setEditingDetail(detail);
                setEditorOpen(true);
              } catch (error) {
                message.error(error instanceof Error ? error.message : '加载失败');
              }
            });
          }}
          onToggleActive={() => {
            const nextStatus: AcademyStatus = listingStatus(record.status) === 'published' ? 'draft' : 'published';
            confirmAcademyListingChange('证书', nextStatus, () => patchStatus(record, nextStatus));
          }}
          onDelete={() => deleteCertificate(record)}
          toggleActiveActionTitle="下架"
          toggleInactiveActionTitle="上架"
          toggleActiveActionIcon={<EyeInvisibleOutlined />}
          toggleInactiveActionIcon={<ShoppingOutlined />}
        />
      ),
    }),
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button type="primary" icon={<PlusOutlined />} loading={isPending} onClick={() => {
          if (!activeLanguages.length) { message.warning('请先在「多语言管理」中添加并启用语言'); return; }
          setEditingDetail(null);
          setEditorOpen(true);
        }}>新建证书</Button>
      </Space>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search allowClear placeholder="搜索标题、slug" style={{ maxWidth: 360 }} onSearch={setKeyword} />
          <Table rowKey="id" pagination={false} tableLayout="fixed" style={{ width: '100%' }} scroll={adminTableScroll(800)} columns={columns} dataSource={filtered} locale={{ emptyText: '暂无证书' }} />
        </Space>
      </Card>
      <AcademyEditorModal
        open={editorOpen}
        entityType="certificate"
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => { setEditorOpen(false); setEditingDetail(null); }}
        onSaved={(saved) => {
          const listItem = toListItem(saved as AdminAcademyCertificateDetail);
          setItems((current) => {
            const exists = current.some((item) => item.id === saved.id);
            return exists ? current.map((item) => (item.id === saved.id ? listItem : item)) : [listItem, ...current];
          });
          setEditingDetail(saved as AdminAcademyCertificateDetail);
        }}
      />
    </Space>
  );
}
