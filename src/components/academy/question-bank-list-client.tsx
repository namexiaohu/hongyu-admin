'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Modal, Space, Table, message } from 'antd';
import { useMemo, useState, useTransition } from 'react';

import {
  ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialList: { items: AdminAcademyQuestionBankListItem[]; total: number };
  activeLanguages: AdminSiteLanguageRow[];
};

export function QuestionBankListClient({ initialList, activeLanguages }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [keyword, setKeyword] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.title.toLowerCase().includes(kw));
  }, [items, keyword]);

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

  function createBank() {
    if (!activeLanguages.length) {
      message.warning('请先启用语言');
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/academy/question-banks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passScorePercent: 60,
            translation: { locale: defaultLocale, title: 'New question bank' },
          }),
        });
        if (!response.ok) throw new Error('创建失败');
        const created = (await response.json()) as AdminAcademyQuestionBankListItem;
        window.location.href = `/admin/academy/question-banks/${created.id}`;
      } catch (error) {
        message.error(error instanceof Error ? error.message : '创建失败');
      }
    });
  }

  const columns = [
    buildAdminListRowIndexColumn(1, filtered.length || 1),
    { title: '标题', dataIndex: 'title', ellipsis: true, onHeaderCell: adminTableNowrapHeader },
    { title: '题目数', dataIndex: 'questionCount', width: 80, onHeaderCell: adminTableNowrapHeader },
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
          isActive={false}
          showToggle={false}
          onEdit={() => {
            window.location.href = `/admin/academy/question-banks/${record.id}`;
          }}
          onToggleActive={() => {}}
          onDelete={() => deleteBank(record)}
        />
      ),
    }),
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Input.Search allowClear placeholder="搜索题库" style={{ maxWidth: 320 }} onSearch={setKeyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button type="primary" icon={<PlusOutlined />} loading={isPending} onClick={createBank}>
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
  );
}
