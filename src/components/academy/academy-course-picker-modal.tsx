'use client';

import { Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import type { AcademyCoursePickerItem } from '@/lib/academy-course-picker';
import type { AdminAcademyCourseListItem } from '@/lib/academy-course-content';
import { academyStatusLabels, normalizeAcademyListingStatus } from '@/lib/academy-content-shared';

type Props = {
  open: boolean;
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[], items: AcademyCoursePickerItem[]) => void;
};

export function AcademyCoursePickerModal({ open, disabledIds = new Set(), onCancel, onConfirm }: Props) {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<AdminAcademyCourseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetch('/api/admin/academy/courses')
      .then((response) => response.json())
      .then((payload: { items: AdminAcademyCourseListItem[] }) => setItems(payload.items ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.title.toLowerCase().includes(kw) || item.slug.includes(kw));
  }, [items, keyword]);

  const columns: ColumnsType<AdminAcademyCourseListItem> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: 'Slug', dataIndex: 'slug', width: 180 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => academyStatusLabels[normalizeAcademyListingStatus(value)] },
  ];

  return (
    <Modal
      open={open}
      title="选择课程"
      width={720}
      onCancel={onCancel}
      onOk={() => {
        const selected = filtered.filter((item) => selectedRowKeys.includes(item.id));
        onConfirm(
          selected.map((item) => item.id),
          selected.map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            coverPreviewUrl: item.coverPreviewUrl,
            status: item.status,
          })),
        );
      }}
      destroyOnHidden
    >
      <Input.Search allowClear placeholder="搜索课程" style={{ marginBottom: 12 }} onSearch={setKeyword} />
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
