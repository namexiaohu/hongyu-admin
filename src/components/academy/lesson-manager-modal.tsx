'use client';

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { LessonEditorModal } from '@/components/academy/lesson-editor-modal';
import type { AdminAcademyLessonDetail, AdminAcademyLessonListItem } from '@/lib/academy-lesson-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  unitId: string;
  unitTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
};

function formatDuration(seconds: number) {
  if (!seconds || seconds < 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LessonManagerModal({ open, unitId, unitTitle, activeLanguages, onClose }: Props) {
  const [items, setItems] = useState<AdminAcademyLessonListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyLessonDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/academy/units/${unitId}/lessons`);
      if (!response.ok) throw new Error('加载课时失败');
      const payload = (await response.json()) as { items: AdminAcademyLessonListItem[] };
      setItems(payload.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (open && unitId) void loadItems();
  }, [open, unitId, loadItems]);

  async function reorder(ids: string[]) {
    const response = await fetch(`/api/admin/academy/units/${unitId}/lessons`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('排序失败');
    const payload = (await response.json()) as { items: AdminAcademyLessonListItem[] };
    setItems(payload.items);
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setItems(next);
    void reorder(next.map((item) => item.id)).catch((error) => {
      message.error(error instanceof Error ? error.message : '排序失败');
      void loadItems();
    });
  }

  function deleteLesson(record: AdminAcademyLessonListItem) {
    Modal.confirm({
      title: '确定删除该课时吗？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setPendingId(record.id);
        try {
          const response = await fetch(`/api/admin/academy/lessons/${record.id}`, { method: 'DELETE' });
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

  return (
    <>
      <Modal
        open={open}
        title={`课时管理 · ${unitTitle}`}
        onCancel={onClose}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Text type="secondary">可添加多个课时并调整顺序</Typography.Text>
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
              新建课时
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            pagination={false}
            dataSource={items}
            locale={{ emptyText: '暂无课时' }}
            columns={[
              { title: '#', width: 50, render: (_: unknown, __: AdminAcademyLessonListItem, index: number) => index + 1 },
              { title: '标题', dataIndex: 'title', ellipsis: true },
              {
                title: '时长',
                dataIndex: 'durationSeconds',
                width: 90,
                render: (value: number) => formatDuration(value),
              },
              {
                title: '操作',
                width: 220,
                render: (_: unknown, record: AdminAcademyLessonListItem, index: number) => (
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    />
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      loading={pendingId === record.id}
                      onClick={() => {
                        startTransition(async () => {
                          setPendingId(record.id);
                          try {
                            const response = await fetch(`/api/admin/academy/lessons/${record.id}`);
                            if (!response.ok) throw new Error('加载失败');
                            setEditingDetail((await response.json()) as AdminAcademyLessonDetail);
                            setEditorOpen(true);
                          } catch (error) {
                            message.error(error instanceof Error ? error.message : '加载失败');
                          } finally {
                            setPendingId(null);
                          }
                        });
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={pendingId === record.id}
                      onClick={() => deleteLesson(record)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Modal>

      <LessonEditorModal
        open={editorOpen}
        unitId={unitId}
        detail={editingDetail}
        activeLanguages={activeLanguages}
        onClose={() => {
          setEditorOpen(false);
          setEditingDetail(null);
        }}
        onSaved={() => {
          void loadItems();
        }}
      />
    </>
  );
}
