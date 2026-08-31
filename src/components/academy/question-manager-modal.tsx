'use client';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Modal, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { QuestionEditorModal } from '@/components/academy/question-editor-modal';
import type { AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import type { AdminAcademyQuestionDetail, AdminAcademyQuestionListItem } from '@/lib/academy-question-content';
import { academyQuestionTypeLabels } from '@/lib/academy-question-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  bankId: string;
  bankTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved?: (stats: Pick<AdminAcademyQuestionBankListItem, 'questionCount' | 'totalScore'>) => void;
};

function computeStats(questions: AdminAcademyQuestionListItem[]) {
  return {
    questionCount: questions.length,
    totalScore: questions.reduce((sum, item) => sum + item.score, 0),
  };
}

export function QuestionManagerModal({
  open,
  bankId,
  bankTitle,
  activeLanguages,
  onClose,
  onSaved,
}: Props) {
  const [questions, setQuestions] = useState<AdminAcademyQuestionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AdminAcademyQuestionDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/academy/question-banks/${bankId}/questions`);
      if (!response.ok) throw new Error('加载失败');
      const payload = (await response.json()) as { items: AdminAcademyQuestionListItem[] };
      const items = payload.items ?? [];
      setQuestions(items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    if (!open || !bankId) return;
    setQuestions([]);
    void loadItems();
  }, [open, bankId, loadItems]);

  function notifySaved(items: AdminAcademyQuestionListItem[]) {
    onSavedRef.current?.(computeStats(items));
  }

  async function reorder(ids: string[]) {
    const response = await fetch(`/api/admin/academy/question-banks/${bankId}/questions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('排序失败');
    const payload = (await response.json()) as { items: AdminAcademyQuestionListItem[] };
    setQuestions(payload.items);
    notifySaved(payload.items);
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const next = [...questions];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setQuestions(next);
    void reorder(next.map((item) => item.id)).catch(() => {
      message.error('排序失败');
      void loadItems();
    });
  }

  function deleteQuestion(record: AdminAcademyQuestionListItem) {
    Modal.confirm({
      title: '确定删除该题目吗？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setPendingId(record.id);
        try {
          const response = await fetch(`/api/admin/academy/questions/${record.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('删除失败');
          setQuestions((current) => {
            const next = current.filter((item) => item.id !== record.id);
            notifySaved(next);
            return next;
          });
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
        title={`题目管理 · ${bankTitle}`}
        onCancel={onClose}
        footer={null}
        width={960}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Text type="secondary">可添加多个题目并调整顺序</Typography.Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={isPending}
              disabled={loading}
              onClick={() => {
                if (!activeLanguages.length) {
                  message.warning('请先启用语言');
                  return;
                }
                setEditingDetail(null);
                setEditorOpen(true);
              }}
            >
              添加题目
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={questions}
            pagination={false}
            locale={{ emptyText: '暂无题目' }}
            columns={[
              { title: '#', width: 48, render: (_: unknown, __: AdminAcademyQuestionListItem, index: number) => index + 1 },
              {
                title: '题型',
                dataIndex: 'questionType',
                width: 100,
                render: (value: keyof typeof academyQuestionTypeLabels) => academyQuestionTypeLabels[value],
              },
              { title: '分数', dataIndex: 'score', width: 72 },
              { title: '摘要', dataIndex: 'summary', ellipsis: true },
              {
                title: '操作',
                width: 220,
                render: (_: unknown, record: AdminAcademyQuestionListItem, index: number) => (
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={loading || index === 0}
                      onClick={() => moveQuestion(index, -1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={loading || index === questions.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                    />
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      loading={pendingId === record.id}
                      disabled={loading}
                      onClick={() => {
                        startTransition(async () => {
                          setPendingId(record.id);
                          try {
                            const response = await fetch(`/api/admin/academy/questions/${record.id}`);
                            if (!response.ok) throw new Error('加载失败');
                            setEditingDetail((await response.json()) as AdminAcademyQuestionDetail);
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
                      disabled={loading}
                      onClick={() => deleteQuestion(record)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Modal>

      <QuestionEditorModal
        open={editorOpen}
        bankId={bankId}
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
