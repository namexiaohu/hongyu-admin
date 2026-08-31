'use client';

import { EyeInvisibleOutlined, PlusOutlined, ShoppingOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Input, Modal, Space, Table, Tag, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import { QuestionBankEditorModal } from '@/components/academy/question-bank-editor-modal';
import { QuestionManagerModal } from '@/components/academy/question-manager-modal';
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
  normalizeAcademyListingStatus,
} from '@/lib/academy-content-shared';
import type { AdminAcademyQuestionBankDetail, AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import { confirmAcademyListingChange } from '@/lib/confirm-academy-listing';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminAcademyQuestionBankListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

async function fetchDetail(id: string): Promise<AdminAcademyQuestionBankDetail> {
  const response = await fetch(`/api/admin/academy/question-banks/${id}`);
  if (!response.ok) throw new Error('加载详情失败');
  return response.json() as Promise<AdminAcademyQuestionBankDetail>;
}

function toListItem(detail: AdminAcademyQuestionBankDetail): AdminAcademyQuestionBankListItem {
  const { translations: _translations, ...item } = detail;
  return item;
}

export function QuestionBankListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyQuestionBankDetail | null>(null);
  const [questionManagerBank, setQuestionManagerBank] = useState<AdminAcademyQuestionBankListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.title.toLowerCase().includes(kw));
  }, [items, keyword]);

  function patchStatus(record: AdminAcademyQuestionBankListItem, nextStatus: AcademyStatus) {
    setPendingId(record.id);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/academy/question-banks/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          message.error(payload?.message ?? '状态更新失败');
          return;
        }
        const saved = (await response.json()) as AdminAcademyQuestionBankDetail;
        setItems((current) => current.map((item) => (item.id === record.id ? toListItem(saved) : item)));
        message.success(`题库已${academyStatusLabels[nextStatus]}`);
      } finally {
        setPendingId(null);
      }
    })();
  }

  function deleteBank(record: AdminAcademyQuestionBankListItem) {
    Modal.confirm({
      title: '确定删除该题库吗？',
      content: '题库下的题目也会一并删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setPendingId(record.id);
        try {
          const response = await fetch(`/api/admin/academy/question-banks/${record.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('删除失败');
          setItems((current) => current.filter((item) => item.id !== record.id));
          message.success('已删除');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败');
        } finally {
          setPendingId(null);
        }
      },
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    { title: '标题', dataIndex: 'title', ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => {
        const status = normalizeAcademyListingStatus(value);
        return <Tag color={academyStatusColors[status]}>{academyStatusLabels[status]}</Tag>;
      },
    },
    {
      title: '题目',
      width: 110,
      onHeaderCell: adminTableNowrapHeader,
      render: (_: unknown, record: AdminAcademyQuestionBankListItem) => (
        <Button
          type="link"
          icon={<UnorderedListOutlined />}
          onClick={() => setQuestionManagerBank(record)}
        >
          管理（{record.questionCount}）
        </Button>
      ),
    },
    { title: '总分', dataIndex: 'totalScore', width: 80, onHeaderCell: adminTableNowrapHeader },
    { title: '及格线', dataIndex: 'passScorePercent', width: 80, render: (v: number) => `${v}%`, onHeaderCell: adminTableNowrapHeader },
    {
      title: '限时',
      dataIndex: 'timeLimitMinutes',
      width: 80,
      render: (v: number | null) => (v == null ? '不限' : `${v} 分钟`),
      onHeaderCell: adminTableNowrapHeader,
    },
    {
      title: '重考',
      dataIndex: 'maxRetakes',
      width: 80,
      render: (v: number | null) => (v == null ? '不限' : v),
      onHeaderCell: adminTableNowrapHeader,
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 148, render: (value: string) => formatAdminDate(value) },
    adminTableFixedActionsColumn({
      title: '操作',
      key: 'actions',
      width: ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
      render: (_: unknown, record: AdminAcademyQuestionBankListItem) => (
        <AdminEntityRowActions
          loading={pendingId === record.id}
          entityName="题库"
          isActive={normalizeAcademyListingStatus(record.status) === 'published'}
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
            const nextStatus: AcademyStatus = normalizeAcademyListingStatus(record.status) === 'published' ? 'draft' : 'published';
            confirmAcademyListingChange('题库', nextStatus, () => patchStatus(record, nextStatus));
          }}
          onDelete={() => deleteBank(record)}
          toggleActiveActionTitle="下架"
          toggleInactiveActionTitle="上架"
          toggleActiveActionIcon={<EyeInvisibleOutlined />}
          toggleInactiveActionIcon={<ShoppingOutlined />}
        />
      ),
    }),
  ];

  return (
    <>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Input.Search allowClear placeholder="搜索题库" style={{ maxWidth: 320 }} onSearch={setKeyword} onChange={(e) => setKeyword(e.target.value)} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={isPending}
              onClick={() => {
                if (!activeLanguages.length) {
                  message.warning('请先启用语言');
                  return;
                }
                setEditingDetail(null);
                setEditorOpen(true);
              }}
            >
              新建题库
            </Button>
          </div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            scroll={adminTableScroll(960)}
            pagination={false}
          />
        </Space>
      </Card>

      <QuestionBankEditorModal
        open={editorOpen}
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => {
          setEditorOpen(false);
          setEditingDetail(null);
        }}
        onSaved={(saved) => {
          const listItem = toListItem(saved);
          setItems((current) => {
            const exists = current.some((item) => item.id === saved.id);
            return exists ? current.map((item) => (item.id === saved.id ? listItem : item)) : [listItem, ...current];
          });
        }}
      />

      {questionManagerBank ? (
        <QuestionManagerModal
          open={Boolean(questionManagerBank)}
          bankId={questionManagerBank.id}
          bankTitle={questionManagerBank.title}
          activeLanguages={activeLanguages}
          onClose={() => setQuestionManagerBank(null)}
          onSaved={(stats) => {
            setItems((current) => current.map((item) => (
              item.id === questionManagerBank.id ? { ...item, ...stats } : item
            )));
          }}
        />
      ) : null}
    </>
  );
}
