'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Space, Table, Tag, message } from 'antd';
import { useState, useTransition } from 'react';

import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { ProductBoardEditorModal } from '@/components/products/product-board-editor-modal';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type {
  AdminProductBoardsDashboard,
  ProductCoverageMetric,
} from '@/lib/product-boards';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminProductBoardsClient({
  initialDashboard,
  activeLanguages,
}: {
  initialDashboard: AdminProductBoardsDashboard;
  activeLanguages: AdminSiteLanguageRow[];
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<ProductCoverageMetric | null>(null);
  const [pendingBoardKey, setPendingBoardKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const boards = dashboard.coverage;
  const existingKeys = boards.map((b) => b.key);

  const summaryStats = [
    { label: '看板总数', value: dashboard.summary.boardCount },
    { label: '自定义', value: dashboard.summary.customBoardCount },
    { label: '关联产品', value: dashboard.summary.assignedProductCount },
  ];

  function openEditor(board?: ProductCoverageMetric) {
    setEditingBoard(board ?? null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingBoard(null);
  }

  function handleSaved(nextDashboard: AdminProductBoardsDashboard) {
    setDashboard(nextDashboard);
  }

  function toggleBoardEnabled(board: ProductCoverageMetric, enabled: boolean) {
    setPendingBoardKey(board.key);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/products/boards/${encodeURIComponent(board.key)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        if (!response.ok) throw new Error('操作失败');
        const payload = (await response.json()) as { dashboard: AdminProductBoardsDashboard };
        setDashboard(payload.dashboard);
        void messageApi.success(enabled ? '看板已启用' : '看板已停用');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '操作失败');
      } finally {
        setPendingBoardKey(null);
      }
    });
  }

  function confirmDeleteBoard(board: ProductCoverageMetric) {
    if (board.count > 0) {
      void messageApi.warning('该看板下已有产品，无法删除');
      return;
    }
    if (!board.custom) {
      void messageApi.warning('系统默认看板不可删除');
      return;
    }

    setPendingBoardKey(board.key);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/products/boards/${encodeURIComponent(board.key)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? '删除失败');
        }
        const payload = (await response.json()) as { dashboard: AdminProductBoardsDashboard };
        setDashboard(payload.dashboard);
        void messageApi.success('看板已删除');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '删除失败');
      } finally {
        setPendingBoardKey(null);
      }
    });
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增看板</Button>
      </Space>

      <Card>
        <Table
          rowKey="key"
          pagination={false}
          tableLayout="fixed"
          style={{ width: '100%' }}
          scroll={adminTableScroll(1000)}
          dataSource={boards}
          columns={[
            buildAdminListRowIndexColumn(1, Math.max(boards.length, 1)),
            {
              title: '看板',
              dataIndex: 'title',
              width: 160,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '类型',
              dataIndex: 'custom',
              width: 96,
              align: 'center' as const,
              onHeaderCell: adminTableNowrapHeader,
              render: (_: boolean | undefined, row: ProductCoverageMetric) =>
                row.custom ? <Tag>自定义</Tag> : <Tag color="blue">系统内置</Tag>,
            },
            {
              title: 'Key',
              dataIndex: 'key',
              width: 130,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: '关联产品数',
              dataIndex: 'count',
              width: 100,
              align: 'center' as const,
              onHeaderCell: adminTableNowrapHeader,
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              width: 72,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: boolean) => (
                <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
              ),
            },
            {
              title: '说明',
              dataIndex: 'note',
              width: 240,
              ellipsis: true,
              onHeaderCell: adminTableNowrapHeader,
            },
            adminTableFixedActionsColumn({
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: ProductCoverageMetric) => (
                <AdminEntityRowActions
                  loading={pendingBoardKey === row.key}
                  isActive={row.enabled}
                  entityName="看板"
                  onEdit={() => openEditor(row)}
                  onToggleActive={() => toggleBoardEnabled(row, !row.enabled)}
                  onDelete={() => confirmDeleteBoard(row)}
                  showDelete={Boolean(row.custom)}
                  toggleDisableDescription="停用后产品编辑页将不再显示该看板。"
                  toggleEnableDescription="启用后该看板将恢复在产品编辑页展示。"
                />
              ),
            }),
          ]}
        />
      </Card>

      <ProductBoardEditorModal
        open={editorOpen}
        activeLanguages={activeLanguages}
        editingBoard={editingBoard}
        existingKeys={existingKeys}
        onClose={closeEditor}
        onSaved={handleSaved}
      />
    </Space>
  );
}
