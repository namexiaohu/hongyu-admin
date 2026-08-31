'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { QuestionBankPickerField } from '@/components/academy/question-bank-picker-field';
import type { AdminAcademyCertificateQuestionBankItem } from '@/server/admin/academy-certificate-exams';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  certificateId: string;
  certificateTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
};

export function ExamManagerModal({ open, certificateId, certificateTitle, onClose }: Props) {
  const [items, setItems] = useState<AdminAcademyCertificateQuestionBankItem[]>([]);
  const [questionBankIds, setQuestionBankIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/academy/certificates/${certificateId}/question-banks`);
      if (!response.ok) throw new Error('加载失败');
      const payload = (await response.json()) as { items: AdminAcademyCertificateQuestionBankItem[] };
      setItems(payload.items);
      setQuestionBankIds(payload.items.map((item) => item.questionBankId));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (open && certificateId) void loadItems();
  }, [open, certificateId, loadItems]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/academy/certificates/${certificateId}/question-banks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankIds }),
      });
      if (!response.ok) throw new Error('保存失败');
      const payload = (await response.json()) as { items: AdminAcademyCertificateQuestionBankItem[] };
      setItems(payload.items);
      message.success('考试关联已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`考试管理 · ${certificateTitle}`}
      onCancel={onClose}
      onOk={() => void save()}
      okText="保存"
      confirmLoading={saving}
      width={720}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          关联一个或多个题库。学员完成证书全部课程后参加综合考试，系统会随机抽取其中一份题库。
        </Typography.Text>
        <QuestionBankPickerField value={questionBankIds} onChange={setQuestionBankIds} />
        {items.length ? (
          <Table
            rowKey="questionBankId"
            loading={loading}
            dataSource={items}
            pagination={false}
            size="small"
            columns={[
              { title: '题库', dataIndex: 'title', ellipsis: true },
              { title: '题目数', dataIndex: 'questionCount', width: 80 },
              { title: '总分', dataIndex: 'totalScore', width: 80 },
              { title: '及格线', dataIndex: 'passScorePercent', width: 80, render: (v: number) => `${v}%` },
            ]}
          />
        ) : null}
      </Space>
    </Modal>
  );
}
