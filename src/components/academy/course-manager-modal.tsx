'use client';

import { Modal, Space, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { CoursePickerField } from '@/components/academy/course-picker-field';
import type { AdminAcademyCertificateCourseItem } from '@/lib/academy-certificate-content';
import type { AcademyCoursePickerItem } from '@/lib/academy-course-picker';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  certificateId: string;
  certificateTitle: string;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved?: (courseCount: number) => void;
};

function toPickerItems(items: AdminAcademyCertificateCourseItem[]): AcademyCoursePickerItem[] {
  return items.map((item) => ({
    id: item.courseId,
    slug: item.slug,
    title: item.title,
    coverPreviewUrl: item.coverPreviewUrl,
    status: item.status,
  }));
}

export function CourseManagerModal({
  open,
  certificateId,
  certificateTitle,
  onClose,
  onSaved,
}: Props) {
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [seedItems, setSeedItems] = useState<AcademyCoursePickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setCourseIds([]);
    setSeedItems([]);
    try {
      const response = await fetch(`/api/admin/academy/certificates/${certificateId}/courses`);
      if (!response.ok) throw new Error('加载失败');
      const payload = (await response.json()) as { items: AdminAcademyCertificateCourseItem[] };
      const items = payload.items ?? [];
      setSeedItems(toPickerItems(items));
      setCourseIds(items.map((item) => item.courseId));
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
      const response = await fetch(`/api/admin/academy/certificates/${certificateId}/courses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds }),
      });
      if (!response.ok) throw new Error('保存失败');
      const payload = (await response.json()) as { items: AdminAcademyCertificateCourseItem[] };
      const items = payload.items ?? [];
      setSeedItems(toPickerItems(items));
      setCourseIds(items.map((item) => item.courseId));
      onSaved?.(payload.items.length);
      message.success('课程关联已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`课程管理 · ${certificateTitle}`}
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
          关联一个或多个课程。使用上下箭头调整课程在证书中的展示顺序。
        </Typography.Text>
        <CoursePickerField
          value={courseIds}
          onChange={setCourseIds}
          seedItems={seedItems}
          loading={loading}
          disabled={loading || saving}
        />
      </Space>
    </Modal>
  );
}
