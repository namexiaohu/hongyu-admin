'use client';

import { EyeInvisibleOutlined, FileTextOutlined, PlusOutlined, ShoppingOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tag, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { AcademyEditorModal } from '@/components/academy/academy-editor-modal';
import { ExamManagerModal } from '@/components/academy/exam-manager-modal';
import { UnitManagerModal } from '@/components/academy/unit-manager-modal';
import {
  ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import {
  type AcademyStatus,
  academyStatusColors,
  academyStatusLabels,
} from '@/lib/academy-content-shared';
import type { AdminAcademyCourseDetail, AdminAcademyCourseListItem } from '@/lib/academy-course-content';
import { confirmAcademyListingChange } from '@/lib/confirm-academy-listing';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminAcademyCourseListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

async function fetchDetail(id: string): Promise<AdminAcademyCourseDetail> {
  const response = await fetch(`/api/admin/academy/courses/${id}`);
  if (!response.ok) throw new Error('加载详情失败');
  return response.json() as Promise<AdminAcademyCourseDetail>;
}

function toListItem(detail: AdminAcademyCourseDetail): AdminAcademyCourseListItem {
  const { translations: _translations, ...item } = detail;
  return item;
}

function listingStatus(status: string): AcademyStatus {
  return status === 'published' ? 'published' : 'draft';
}

export function AcademyCourseListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyCourseDetail | null>(null);
  const [unitManagerCourse, setUnitManagerCourse] = useState<AdminAcademyCourseListItem | null>(null);
  const [examManagerCourse, setExamManagerCourse] = useState<AdminAcademyCourseListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.slug.includes(kw) || item.title.toLowerCase().includes(kw));
  }, [items, keyword]);

  function patchStatus(record: AdminAcademyCourseListItem, nextStatus: AcademyStatus) {
    setPendingId(record.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/academy/courses/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          message.error(payload?.message ?? '状态更新失败');
          return;
        }
        const saved = (await response.json()) as AdminAcademyCourseDetail;
        setItems((current) => current.map((item) => (item.id === record.id ? toListItem(saved) : item)));
        message.success(`课程已${academyStatusLabels[nextStatus]}`);
      } finally {
        setPendingId(null);
      }
    })();
  }

  function deleteCourse(record: AdminAcademyCourseListItem) {
    setPendingId(record.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/academy/courses/${record.id}`, { method: 'DELETE' });
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
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => {
        const status = listingStatus(value);
        return <Tag color={academyStatusColors[status]}>{academyStatusLabels[status]}</Tag>;
      },
    },
    {
      title: '课时单元',
      width: 110,
      onHeaderCell: adminTableNowrapHeader,
      render: (_: unknown, record: AdminAcademyCourseListItem) => (
        <Button
          type="link"
          icon={<UnorderedListOutlined />}
          onClick={() => setUnitManagerCourse(record)}
        >
          管理
        </Button>
      ),
    },
    {
      title: '考试',
      width: 90,
      onHeaderCell: adminTableNowrapHeader,
      render: (_: unknown, record: AdminAcademyCourseListItem) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          onClick={() => setExamManagerCourse(record)}
        >
          管理
        </Button>
      ),
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 148, render: (value: string) => formatAdminDate(value) },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
      render: (_: unknown, record: AdminAcademyCourseListItem) => (
        <AdminEntityRowActions
          loading={pendingId === record.id}
          entityName="课程"
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
            confirmAcademyListingChange('课程', nextStatus, () => patchStatus(record, nextStatus));
          }}
          onDelete={() => deleteCourse(record)}
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
        }}>新建课程</Button>
      </Space>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search allowClear placeholder="搜索标题、slug" style={{ maxWidth: 360 }} onSearch={setKeyword} />
          <Table rowKey="id" pagination={false} tableLayout="fixed" style={{ width: '100%' }} scroll={adminTableScroll(960)} columns={columns} dataSource={filtered} locale={{ emptyText: '暂无课程' }} />
        </Space>
      </Card>
      <AcademyEditorModal
        open={editorOpen}
        entityType="course"
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => { setEditorOpen(false); setEditingDetail(null); }}
        onSaved={(saved) => {
          const listItem = toListItem(saved as AdminAcademyCourseDetail);
          setItems((current) => {
            const exists = current.some((item) => item.id === saved.id);
            return exists ? current.map((item) => (item.id === saved.id ? listItem : item)) : [listItem, ...current];
          });
          setEditingDetail(saved as AdminAcademyCourseDetail);
        }}
      />
      {unitManagerCourse ? (
        <UnitManagerModal
          open={Boolean(unitManagerCourse)}
          courseId={unitManagerCourse.id}
          courseTitle={unitManagerCourse.title}
          activeLanguages={activeLanguages}
          onClose={() => setUnitManagerCourse(null)}
        />
      ) : null}
      {examManagerCourse ? (
        <ExamManagerModal
          open={Boolean(examManagerCourse)}
          courseId={examManagerCourse.id}
          courseTitle={examManagerCourse.title}
          activeLanguages={activeLanguages}
          onClose={() => setExamManagerCourse(null)}
        />
      ) : null}
    </Space>
  );
}
