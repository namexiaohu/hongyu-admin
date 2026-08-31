'use client';

import { ArrowDownOutlined, ArrowUpOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AcademyCoursePickerItem } from '@/lib/academy-course-picker';
import { formatAcademyCourseSelectedDisplay } from '@/lib/academy-course-picker';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

import { AcademyCoursePickerModal } from './academy-course-picker-modal';

type Props = {
  value?: string[];
  onChange?: (value: string[]) => void;
  seedItems?: AcademyCoursePickerItem[];
  loading?: boolean;
  disabled?: boolean;
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

function courseStub(id: string): AcademyCoursePickerItem {
  return { id, slug: id, title: id, coverPreviewUrl: '', status: 'draft' };
}

export function CoursePickerField({ value = [], onChange, seedItems, loading = false, disabled = false }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cache, setCache] = useState<Map<string, AcademyCoursePickerItem>>(new Map());
  const selectedIds = value ?? [];

  useEffect(() => {
    if (!seedItems?.length) return;
    setCache((current) => {
      const next = new Map(current);
      for (const item of seedItems) next.set(item.id, item);
      return next;
    });
  }, [seedItems]);

  const missingIds = useMemo(
    () => selectedIds.filter((id) => !cache.has(id)),
    [selectedIds, cache],
  );

  useEffect(() => {
    if (!missingIds.length) return;
    let cancelled = false;
    void lookupCourses(missingIds)
      .then((items) => {
        if (cancelled) return;
        setCache((current) => {
          const next = new Map(current);
          for (const item of items) next.set(item.id, item);
          for (const id of missingIds) {
            if (!next.has(id)) next.set(id, courseStub(id));
          }
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [missingIds]);

  const showSpinner = loading || missingIds.length > 0;
  const ready = !showSpinner;

  const selectedItems = useMemo(
    () => selectedIds.map((id) => {
      const item = cache.get(id) ?? courseStub(id);
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
    <Spin spinning={showSpinner}>
      <div className="entity-picker-field" style={showSpinner ? { minHeight: 120 } : undefined}>
        <div className="entity-picker-selected">
          {!ready ? null : !selectedItems.length ? (
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
                  <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={disabled || index === 0} onClick={() => move(item.id, -1)} />
                  <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={disabled || index === selectedItems.length - 1} onClick={() => move(item.id, 1)} />
                  <Button type="text" size="small" icon={<CloseOutlined />} disabled={disabled} aria-label={`移除 ${item.name}`} onClick={() => onChange?.(selectedIds.filter((value) => value !== item.id))} />
                </div>
              </div>
            ))
          )}
        </div>
        <Button type="dashed" icon={<PlusOutlined />} disabled={disabled || showSpinner} onClick={() => setPickerOpen(true)}>
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
    </Spin>
  );
}
