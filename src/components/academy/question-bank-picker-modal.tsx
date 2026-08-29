'use client';

import { Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import type { AcademyQuestionBankPickerItem } from '@/lib/academy-question-bank-content';
import type { AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';

type Props = {
  open: boolean;
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[], items: AcademyQuestionBankPickerItem[]) => void;
};

export function QuestionBankPickerModal({ open, disabledIds = new Set(), onCancel, onConfirm }: Props) {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<AdminAcademyQuestionBankListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetch('/api/admin/academy/question-banks')
      .then((response) => response.json())
      .then((payload: { items: AdminAcademyQuestionBankListItem[] }) => setItems(payload.items ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.title.toLowerCase().includes(kw));
  }, [items, keyword]);

  const columns: ColumnsType<AdminAcademyQuestionBankListItem> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '题目数', dataIndex: 'questionCount', width: 90 },
    { title: '总分', dataIndex: 'totalScore', width: 80 },
    { title: '及格线', dataIndex: 'passScorePercent', width: 90, render: (v: number) => `${v}%` },
  ];

  return (
    <Modal
      open={open}
      title="选择题库"
      width={720}
      onCancel={onCancel}
      onOk={() => {
        const selected = filtered.filter((item) => selectedRowKeys.includes(item.id));
        onConfirm(
          selected.map((item) => item.id),
          selected.map((item) => ({
            id: item.id,
            title: item.title,
            questionCount: item.questionCount,
            totalScore: item.totalScore,
          })),
        );
      }}
      destroyOnHidden
    >
      <Input.Search allowClear placeholder="搜索题库" style={{ marginBottom: 12 }} onSearch={setKeyword} />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        columns={columns}
        pagination={false}
        scroll={{ y: 360 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
          getCheckboxProps: (record) => ({ disabled: disabledIds.has(record.id) }),
        }}
      />
    </Modal>
  );
}
