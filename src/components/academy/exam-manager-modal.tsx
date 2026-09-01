'use client';

import { Modal, Space, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { QuestionBankPickerField } from '@/components/academy/question-bank-picker-field';
import type { AcademyQuestionBankPickerItem } from '@/lib/academy-question-bank-content';
import type { AdminAcademyCertificateQuestionBankItem } from '@/server/admin/academy-certificate-exams';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  certificateId: string;
  certificateTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved?: (examCount: number) => void;
};

function toPickerItems(items: AdminAcademyCertificateQuestionBankItem[]): AcademyQuestionBankPickerItem[] {
  return items.map((item) => ({
    id: item.questionBankId,
    title: item.title,
    questionCount: item.questionCount,
    totalScore: item.totalScore,
    passScorePercent: item.passScorePercent,
  }));
}

export function ExamManagerModal({ open, certificateId, certificateTitle, onClose, onSaved }: Props) {
  const [questionBankIds, setQuestionBankIds] = useState<string[]>([]);
  const [seedItems, setSeedItems] = useState<AcademyQuestionBankPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setQuestionBankIds([]);
    setSeedItems([]);
    try {
      const response = await fetch(`/api/admin/academy/certificates/${certificateId}/question-banks`);
      if (!response.ok) throw new Error('加载失败');
      const payload = (await response.json()) as { items: AdminAcademyCertificateQuestionBankItem[] };
      const items = payload.items ?? [];
      setSeedItems(toPickerItems(items));
      setQuestionBankIds(items.map((item) => item.questionBankId));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (!open || !certificateId) return;
    void loadItems();
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
      const items = payload.items ?? [];
      setSeedItems(toPickerItems(items));
      setQuestionBankIds(items.map((item) => item.questionBankId));
      onSaved?.(items.length);
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
      okButtonProps={{ disabled: loading }}
      width={720}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          关联一个或多个题库。学员完成证书全部课程后参加综合考试，系统会随机抽取其中一份题库。
        </Typography.Text>
        <QuestionBankPickerField
          value={questionBankIds}
          onChange={setQuestionBankIds}
          seedItems={seedItems}
          loading={loading}
          disabled={loading || saving}
        />
      </Space>
    </Modal>
  );
}
