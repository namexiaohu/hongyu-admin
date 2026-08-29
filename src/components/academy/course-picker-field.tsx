'use client';

import { ArrowDownOutlined, ArrowUpOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AcademyCoursePickerItem } from '@/lib/academy-course-picker';
import { formatAcademyCourseSelectedDisplay } from '@/lib/academy-course-picker';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

import { AcademyCoursePickerModal } from './academy-course-picker-modal';

type Props = {
  value?: string[];
  onChange?: (value: string[]) => void;
};

async function lookupCourses(ids: string[]): Promise<AcademyCoursePickerItem[]> {
  if (!ids.length) return [];
  const response = await fetch('/api/admin/academy/courses/picker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items: AcademyCoursePickerItem[] };
  return payload.items ?? [];
}

export function CoursePickerField({ value = [], onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cache, setCache] = useState<Map<string, AcademyCoursePickerItem>>(new Map());
  const selectedIds = value ?? [];

  useEffect(() => {
    const missing = selectedIds.filter((id) => !cache.has(id));
    if (!missing.length) return;
    void lookupCourses(missing).then((items) => {
      setCache((current) => {
        const next = new Map(current);
        for (const item of items) next.set(item.id, item);
        return next;
      });
    });
  }, [cache, selectedIds]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => {
      const item = cache.get(id);
      if (!item) return { id, name: id, meta: null as string | null, coverPreviewUrl: '' };
      const display = formatAcademyCourseSelectedDisplay(item);
      return { id, name: display.name, meta: display.meta, coverPreviewUrl: item.coverPreviewUrl };
    }),
    [cache, selectedIds],
  );

  function move(id: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange?.(next);
  }

  return (
    <div className="entity-picker-field">
      <div className="entity-picker-selected">
        {!selectedItems.length ? (
          <Typography.Text type="secondary">尚未选择课程</Typography.Text>
        ) : (
          selectedItems.map((item, index) => (
            <div key={item.id} className="entity-picker-selected__item">
              <div className="entity-picker-selected__content">
                {item.coverPreviewUrl ? (
                  <Avatar shape="square" size={36} src={resolveOssAssetUrl(item.coverPreviewUrl) || item.coverPreviewUrl} className="entity-picker-selected__thumb" />
                ) : null}
                <div className="entity-picker-selected__body">
                  <div className="entity-picker-selected__name">{index + 1}. {item.name}</div>
                  {item.meta ? <div className="entity-picker-selected__meta">{item.meta}</div> : null}
                </div>
              </div>
              <div className="entity-picker-selected__actions">
                <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(item.id, -1)} />
                <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === selectedItems.length - 1} onClick={() => move(item.id, 1)} />
                <Button type="text" size="small" icon={<CloseOutlined />} aria-label={`移除 ${item.name}`} onClick={() => onChange?.(selectedIds.filter((value) => value !== item.id))} />
              </div>
            </div>
          ))
        )}
      </div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
        添加课程
      </Button>
      <AcademyCoursePickerModal
        open={pickerOpen}
        disabledIds={new Set(selectedIds)}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(ids, items) => {
          setCache((current) => {
            const next = new Map(current);
            for (const item of items) next.set(item.id, item);
            return next;
          });
          onChange?.([...new Set([...selectedIds, ...ids])]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
