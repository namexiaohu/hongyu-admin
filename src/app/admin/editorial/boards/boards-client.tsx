'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Space, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';

import { AdminPageHeaderStats } from '@/components/admin/admin-page-header-stats';
import { AdminEntityRowActions } from '@/components/admin/admin-row-actions';
import { adminTableFixedActionsColumn, adminTableNowrapHeader, adminTableScroll } from '@/components/admin/admin-table';
import { EditorialBoardEditorModal } from '@/components/editorial/editorial-board-editor-modal';
import { buildAdminListRowIndexColumn } from '@/lib/admin-list-query';
import type { AdminEditorialContentListItem } from '@/lib/editorial-content';
import type {
  AdminEditorialDashboard,
  EditorialCoverageMetric,
} from '@/lib/editorial-automation';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export function AdminEditorialBoardsClient({
  initialDashboard,
  initialEntries,
  activeLanguages,
}: {
  initialDashboard: AdminEditorialDashboard;
  initialEntries: AdminEditorialContentListItem[];
  activeLanguages: AdminSiteLanguageRow[];
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [entries] = useState(initialEntries);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<EditorialCoverageMetric | null>(null);
  const [pendingBoardKey, setPendingBoardKey] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const boards = dashboard.coverage;

  const summary = useMemo(() => ({
    boards: boards.length,
    customBoards: boards.filter((item) => item.custom).length,
    documents: entries.length,
  }), [boards, entries.length]);

  const summaryStats = useMemo(() => [
    { label: '看板总数', value: summary.boards },
    { label: '自定义', value: summary.customBoards },
    { label: '关联内容', value: summary.documents },
  ], [summary]);

  function openBoardModal(board?: EditorialCoverageMetric) {
    setEditingBoard(board ?? null);
    setBoardModalOpen(true);
  }

  function closeBoardModal() {
    setBoardModalOpen(false);
    setEditingBoard(null);
  }

  function confirmDeleteBoard(board: EditorialCoverageMetric) {
    if (board.count > 0) {
      void messageApi.warning('该看板下已有内容，无法删除');
      return;
    }
    if (!board.custom) {
      void messageApi.warning('系统默认看板不可删除');
      return;
    }

    setPendingBoardKey(board.key);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/boards/${encodeURIComponent(board.key)}`, {
          method: 'DELETE',
        });
        const payload = await response.json().catch(() => null) as { dashboard?: AdminEditorialDashboard; message?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? '看板删除失败');
        }
        if (payload?.dashboard) setDashboard(payload.dashboard);
        void messageApi.success('看板已删除');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板删除失败');
      } finally {
        setPendingBoardKey(null);
      }
    })();
  }

  function toggleBoardEnabled(board: EditorialCoverageMetric, enabled: boolean) {
    setPendingBoardKey(board.key);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/editorial/boards/${encodeURIComponent(board.key)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        const payload = await response.json().catch(() => null) as { dashboard?: AdminEditorialDashboard; message?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? '看板状态更新失败');
        }
        if (payload?.dashboard) setDashboard(payload.dashboard);
        void messageApi.success(enabled ? '看板已启用' : '看板已停用');
      } catch (error) {
        void messageApi.error(error instanceof Error ? error.message : '看板状态更新失败');
      } finally {
        setPendingBoardKey(null);
      }
    })();
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap align="center">
        <AdminPageHeaderStats items={summaryStats} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openBoardModal()}>新增看板</Button>
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
              render: (_: boolean | undefined, row: EditorialCoverageMetric) => (
                row.custom
                  ? <Tag>自定义</Tag>
                  : <Tag color="blue">系统内置</Tag>
              ),
            },
            {
              title: 'Key',
              dataIndex: 'key',
              width: 130,
              onHeaderCell: adminTableNowrapHeader,
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: '内容数量',
              dataIndex: 'count',
              width: 88,
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
              render: (_: unknown, row: EditorialCoverageMetric) => (
                <AdminEntityRowActions
                  loading={pendingBoardKey === row.key}
                  isActive={row.enabled}
                  entityName="看板"
                  onEdit={() => openBoardModal(row)}
                  onToggleActive={() => toggleBoardEnabled(row, !row.enabled)}
                  onDelete={() => confirmDeleteBoard(row)}
                  showDelete={Boolean(row.custom)}
                  toggleDisableDescription="停用后内容管理页将不再显示该看板。"
                  toggleEnableDescription="启用后该看板将恢复在内容管理页展示。"
                />
              ),
            }),
          ]}
        />
      </Card>

      <EditorialBoardEditorModal
        open={boardModalOpen}
        activeLanguages={activeLanguages}
        editingBoard={editingBoard}
        existingKeys={boards.map((board) => board.key)}
        onClose={closeBoardModal}
        onSaved={(saved) => setDashboard(saved)}
      />
    </Space>
  );
}
