'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, Input, Select, Space, Table, Tag } from 'antd';

import {
  ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
  adminTableFixedActionsColumn,
  adminTableNowrapHeader,
  adminTableScroll,
} from '@/components/admin/admin-table';
import { formatAdminDate } from '@/lib/admin-display';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { AdminExamRecordListItem } from '@/lib/academy-exam-records';

type Props = {
  initialList: { items: AdminExamRecordListItem[]; total: number };
};

export function ExamRecordListClient({ initialList }: Props) {
  const [keyword, setKeyword] = useState('');
  const [passed, setPassed] = useState<string>('');
  const [mailStatus, setMailStatus] = useState<string>('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return initialList.items.filter((item) => {
      if (passed === 'true' && !item.passed) return false;
      if (passed === 'false' && item.passed) return false;
      if (mailStatus && item.certificateMailStatus !== mailStatus) return false;
      if (!kw) return true;
      return (
        item.userName.toLowerCase().includes(kw)
        || item.userEmail.toLowerCase().includes(kw)
        || item.courseTitle.toLowerCase().includes(kw)
      );
    });
  }, [initialList.items, keyword, mailStatus, passed]);

  return (
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="姓名 / 邮箱 / 课程"
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="通过状态"
          style={{ width: 140 }}
          value={passed || undefined}
          onChange={(v) => setPassed(v ?? '')}
          options={[
            { value: 'true', label: '已通过' },
            { value: 'false', label: '未通过' },
          ]}
        />
        <Select
          allowClear
          placeholder="发证书状态"
          style={{ width: 140 }}
          value={mailStatus || undefined}
          onChange={(v) => setMailStatus(v ?? '')}
          options={[
            { value: 'unsent', label: '未发' },
            { value: 'sent', label: '已发' },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        size="middle"
        dataSource={filtered}
        pagination={false}
        scroll={adminTableScroll(1100)}
        columns={[
          buildAdminListRowIndexColumn(1, filtered.length || 1),
          {
            title: '学员',
            dataIndex: 'userName',
            onHeaderCell: adminTableNowrapHeader,
            render: (_: unknown, record: AdminExamRecordListItem) => (
              <div>
                <div>{record.userName}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{record.userEmail}</div>
              </div>
            ),
          },
          { title: '课程', dataIndex: 'courseTitle', onHeaderCell: adminTableNowrapHeader },
          {
            title: '得分',
            onHeaderCell: adminTableNowrapHeader,
            render: (_: unknown, record: AdminExamRecordListItem) =>
              `${record.score} / ${record.totalScore} (${record.scorePercent}%)`,
          },
          {
            title: '结果',
            dataIndex: 'passed',
            onHeaderCell: adminTableNowrapHeader,
            render: (value: boolean) =>
              value ? <Tag color="#00b81e">通过</Tag> : <Tag color="#ee1d36">未通过</Tag>,
          },
          {
            title: '交卷时间',
            dataIndex: 'submittedAt',
            onHeaderCell: adminTableNowrapHeader,
            render: (value: string) => formatAdminDate(value),
          },
          {
            title: '发证书',
            dataIndex: 'certificateMailStatus',
            onHeaderCell: adminTableNowrapHeader,
            render: (value: string) =>
              value === 'sent' ? <Tag color="blue">已发</Tag> : <Tag>未发</Tag>,
          },
          adminTableFixedActionsColumn({
            title: '操作',
            key: 'actions',
            width: ADMIN_TABLE_ENTITY_ACTIONS_WIDTH,
            render: (_: unknown, record: AdminExamRecordListItem) => (
              <Link href={`/admin/academy/exam-records/${record.id}`}>详情</Link>
            ),
          }),
        ]}
      />
    </Card>
  );
}
