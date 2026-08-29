'use client';

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { LessonManagerModal } from '@/components/academy/lesson-manager-modal';
import { UnitEditorModal } from '@/components/academy/unit-editor-modal';
import type { AdminAcademyUnitDetail, AdminAcademyUnitListItem } from '@/lib/academy-unit-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  courseId: string;
  courseTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
};

export function UnitManagerModal({ open, courseId, courseTitle, activeLanguages, onClose }: Props) {
  const [items, setItems] = useState<AdminAcademyUnitListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyUnitDetail | null>(null);
  const [lessonUnit, setLessonUnit] = useState<AdminAcademyUnitListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/academy/courses/${courseId}/units`);
      if (!response.ok) throw new Error('加载单元失败');
      const payload = (await response.json()) as { items: AdminAcademyUnitListItem[] };
      setItems(payload.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (open && courseId) void loadItems();
  }, [open, courseId, loadItems]);

  async function reorder(ids: string[]) {
    const response = await fetch(`/api/admin/academy/courses/${courseId}/units`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('排序失败');
    const payload = (await response.json()) as { items: AdminAcademyUnitListItem[] };
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

  function deleteUnit(record: AdminAcademyUnitListItem) {
    Modal.confirm({
      title: '确定删除该单元吗？',
      content: '单元下的课时也会一并删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setPendingId(record.id);
        try {
          const response = await fetch(`/api/admin/academy/units/${record.id}`, { method: 'DELETE' });
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
        title={`课时单元管理 · ${courseTitle}`}
        onCancel={onClose}
        footer={null}
        width={960}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Text type="secondary">可添加多个单元并调整顺序</Typography.Text>
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
              新建单元
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            pagination={false}
            dataSource={items}
            locale={{ emptyText: '暂无单元' }}
            columns={[
              { title: '#', width: 50, render: (_: unknown, __: AdminAcademyUnitListItem, index: number) => index + 1 },
              { title: '标题', dataIndex: 'title', ellipsis: true },
              { title: '课时数', dataIndex: 'lessonCount', width: 90 },
              {
                title: '课时管理',
                width: 120,
                render: (_: unknown, record: AdminAcademyUnitListItem) => (
                  <Button
                    type="link"
                    icon={<UnorderedListOutlined />}
                    onClick={() => setLessonUnit(record)}
                  >
                    课时管理
                  </Button>
                ),
              },
              {
                title: '操作',
                width: 220,
                render: (_: unknown, record: AdminAcademyUnitListItem, index: number) => (
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
                            const response = await fetch(`/api/admin/academy/units/${record.id}`);
                            if (!response.ok) throw new Error('加载失败');
                            setEditingDetail((await response.json()) as AdminAcademyUnitDetail);
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
                      onClick={() => deleteUnit(record)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Modal>

      <UnitEditorModal
        open={editorOpen}
        courseId={courseId}
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

      {lessonUnit ? (
        <LessonManagerModal
          open={Boolean(lessonUnit)}
          unitId={lessonUnit.id}
          unitTitle={lessonUnit.title}
          activeLanguages={activeLanguages}
          onClose={() => {
            setLessonUnit(null);
            void loadItems();
          }}
        />
      ) : null}
    </>
  );
}
