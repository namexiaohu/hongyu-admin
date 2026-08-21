'use client';

import { Avatar, Input, Modal, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SurgeonGradeKey } from '@/lib/surgeon-content';
import {
  type SurgeonPickerItem,
  buildSurgeonPickerQueryString,
  surgeonPickerGradeOptions,
} from '@/lib/surgeon-picker';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

type SurgeonPickerModalProps = {
  open: boolean;
  mode: 'single' | 'multiple';
  disabledIds?: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (ids: string[], items: SurgeonPickerItem[]) => void;
};

const PAGE_SIZE = 50;
const SCROLL_Y = 360;
const SELECTION_COLUMN_WIDTH = 48;
const SURGEON_LIST_COLUMN_WIDTH = 360;
const GRADE_COLUMN_WIDTH = 80;
const TABLE_SCROLL_X = SELECTION_COLUMN_WIDTH + SURGEON_LIST_COLUMN_WIDTH + GRADE_COLUMN_WIDTH;

const gradeLabels: Record<SurgeonGradeKey, string> = {
  platinum: '铂金',
  gold: '金',
  silver: '银',
};

const gradeColors: Record<SurgeonGradeKey, string> = {
  platinum: 'blue',
  gold: 'gold',
  silver: 'default',
};

async function fetchSurgeonPickerPage(params: {
  keyword: string;
  gradeKey?: SurgeonGradeKey;
  page: number;
}): Promise<{ items: SurgeonPickerItem[]; total: number }> {
  const response = await fetch(`/api/admin/surgeons/picker${buildSurgeonPickerQueryString({
    keyword: params.keyword,
    gradeKey: params.gradeKey,
    page: params.page,
    pageSize: PAGE_SIZE,
  })}`);
  if (!response.ok) throw new Error('加载术者失败');
  const payload = (await response.json()) as {
    items: SurgeonPickerItem[];
    meta: { total: number };
  };
  return { items: payload.items, total: payload.meta.total };
}

export function SurgeonPickerModal({
  open,
  mode,
  disabledIds = new Set(),
  onCancel,
  onConfirm,
}: SurgeonPickerModalProps) {
  const [keyword, setKeyword] = useState('');
  const [gradeKey, setGradeKey] = useState<SurgeonGradeKey | undefined>();
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [items, setItems] = useState<SurgeonPickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword, open]);

  const loadPage = useCallback(async (
    nextPage: number,
    search: string,
    grade: SurgeonGradeKey | undefined,
    append: boolean,
  ) => {
    setLoading(true);
    loadingMoreRef.current = true;
    try {
      const result = await fetchSurgeonPickerPage({
        keyword: search,
        gradeKey: grade,
        page: nextPage,
      });
      setTotal(result.total);
      setPage(nextPage);
      setItems((current) => (append ? [...current, ...result.items] : result.items));
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setKeyword('');
    setDebouncedKeyword('');
    setGradeKey(undefined);
    setPendingKeys([]);
    setItems([]);
    setTotal(0);
    setPage(1);
    void loadPage(1, '', undefined, false);
  }, [open, loadPage]);

  useEffect(() => {
    if (!open) return;
    void loadPage(1, debouncedKeyword, gradeKey, false);
  }, [debouncedKeyword, gradeKey, loadPage, open]);

  const columns = useMemo<ColumnsType<SurgeonPickerItem>>(() => [
    {
      title: '术者',
      key: 'surgeon',
      width: SURGEON_LIST_COLUMN_WIDTH,
      render: (_: unknown, row: SurgeonPickerItem) => (
        <div className="brand-picker-row">
          <Avatar
            size={36}
            src={resolveOssAssetUrl(row.avatar) || undefined}
            className="brand-picker-row__logo"
          >
            {row.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="brand-picker-row__body">
            <div className="brand-picker-row__name">{row.name}</div>
            <div className="brand-picker-row__meta">
              {[row.position, row.institution].filter(Boolean).join(' · ') || row.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '等级',
      dataIndex: 'gradeKey',
      width: GRADE_COLUMN_WIDTH,
      render: (value: SurgeonGradeKey) => (
        <Tag color={gradeColors[value]}>{gradeLabels[value]}</Tag>
      ),
    },
  ], []);

  const hasActiveFilter = debouncedKeyword.length > 0 || Boolean(gradeKey);

  const rowSelection = useMemo<TableRowSelection<SurgeonPickerItem>>(() => ({
    type: mode === 'single' ? 'radio' : 'checkbox',
    columnWidth: SELECTION_COLUMN_WIDTH,
    hideSelectAll: mode === 'single' || !hasActiveFilter,
    selectedRowKeys: pendingKeys,
    getCheckboxProps: (row) => ({
      disabled: disabledIds.has(row.id),
    }),
    onChange: (keys) => {
      const nextKeys = keys.map(String);
      if (mode === 'single') {
        setPendingKeys(nextKeys.length ? [nextKeys[nextKeys.length - 1]!] : []);
        return;
      }
      setPendingKeys(nextKeys);
    },
  }), [disabledIds, hasActiveFilter, mode, pendingKeys]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 48;
    if (!nearBottom || loading || loadingMoreRef.current) return;
    if (items.length >= total) return;
    void loadPage(page + 1, debouncedKeyword, gradeKey, true);
  }

  return (
    <Modal
      title="选择术者"
      open={open}
      width={720}
      destroyOnHidden
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => {
        const itemMap = new Map(items.map((row) => [row.id, row]));
        const selectedItems = pendingKeys
          .map((id) => itemMap.get(id))
          .filter((row): row is SurgeonPickerItem => Boolean(row));
        onConfirm(pendingKeys, selectedItems);
      }}
      okButtonProps={{ disabled: pendingKeys.length === 0 }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input
            allowClear
            placeholder="搜索姓名 / 机构 / 职位 / slug"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Select
            allowClear
            placeholder="等级"
            style={{ width: 120 }}
            options={surgeonPickerGradeOptions}
            value={gradeKey}
            onChange={(value) => setGradeKey(value)}
          />
        </div>
        <Table<SurgeonPickerItem>
          className="entity-picker-table"
          rowKey="id"
          size="small"
          tableLayout="fixed"
          pagination={false}
          loading={loading && page === 1}
          columns={columns}
          dataSource={items}
          rowSelection={rowSelection}
          virtual
          scroll={{ x: TABLE_SCROLL_X, y: SCROLL_Y }}
          onScroll={handleScroll}
          locale={{ emptyText: hasActiveFilter ? '未找到匹配的术者' : '暂无术者' }}
        />
        <Typography.Text type="secondary">
          已勾选 {pendingKeys.length} 项 · 已加载 {items.length} / 共 {total} 条
          {mode === 'multiple' && disabledIds.size ? `（表单中已有 ${disabledIds.size} 项不可重复）` : ''}
        </Typography.Text>
      </div>
    </Modal>
  );
}
