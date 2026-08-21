'use client';

import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { SurgeonPickerModal } from '@/components/surgeons/surgeon-picker-modal';
import {
  type SurgeonPickerItem,
  formatSurgeonSelectedDisplay,
} from '@/lib/surgeon-picker';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

type SurgeonPickerFieldBaseProps = {
  addButtonLabel?: string;
};

type SurgeonPickerFieldSingleProps = SurgeonPickerFieldBaseProps & {
  mode: 'single';
  value?: string;
  onChange?: (value: string) => void;
  disabledIds?: never;
};

type SurgeonPickerFieldMultipleProps = SurgeonPickerFieldBaseProps & {
  mode: 'multiple';
  value?: string[];
  onChange?: (value: string[]) => void;
  disabledIds?: ReadonlySet<string>;
};

export type SurgeonPickerFieldProps = SurgeonPickerFieldSingleProps | SurgeonPickerFieldMultipleProps;

async function lookupSurgeons(ids: string[]): Promise<SurgeonPickerItem[]> {
  if (!ids.length) return [];
  const response = await fetch('/api/admin/surgeons/picker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items: SurgeonPickerItem[] };
  return payload.items ?? [];
}

export function SurgeonPickerField(props: SurgeonPickerFieldProps) {
  const { mode, addButtonLabel = '添加术者' } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cache, setCache] = useState<Map<string, SurgeonPickerItem>>(new Map());

  const selectedIds = useMemo(() => {
    if (mode === 'single') return props.value ? [props.value] : [];
    return props.value ?? [];
  }, [mode, props]);

  const disabledIds = useMemo(() => {
    if (mode === 'multiple') return props.disabledIds ?? new Set(selectedIds);
    return new Set<string>();
  }, [mode, props, selectedIds]);

  useEffect(() => {
    const missing = selectedIds.filter((id) => !cache.has(id));
    if (!missing.length) return;
    void lookupSurgeons(missing).then((items) => {
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
      if (!item) {
        return {
          id,
          name: id,
          meta: null as string | null,
          avatar: null as string | null,
        };
      }
      const display = formatSurgeonSelectedDisplay(item);
      return {
        id,
        name: display.name,
        meta: display.meta,
        avatar: item.avatar,
      };
    }),
    [cache, selectedIds],
  );

  function removeSelected(id: string) {
    if (mode === 'single') {
      props.onChange?.('');
      return;
    }
    props.onChange?.(selectedIds.filter((item) => item !== id));
  }

  function mergeCacheItems(items: SurgeonPickerItem[]) {
    if (!items.length) return;
    setCache((current) => {
      const next = new Map(current);
      for (const item of items) next.set(item.id, item);
      return next;
    });
  }

  function handleConfirm(newIds: string[], confirmedItems: SurgeonPickerItem[]) {
    mergeCacheItems(confirmedItems);
    const missingIds = newIds.filter((id) => !confirmedItems.some((item) => item.id === id));
    if (missingIds.length) {
      void lookupSurgeons(missingIds).then(mergeCacheItems);
    }

    if (mode === 'single') {
      props.onChange?.(newIds[0] ?? '');
      setPickerOpen(false);
      return;
    }

    props.onChange?.([...new Set([...selectedIds, ...newIds])]);
    setPickerOpen(false);
  }

  return (
    <div className="entity-picker-field">
      <div className="entity-picker-selected">
        {!selectedItems.length ? (
          <Typography.Text type="secondary">尚未选择</Typography.Text>
        ) : (
          selectedItems.map((item) => (
            <div key={item.id} className="entity-picker-selected__item">
              <div className="entity-picker-selected__content">
                {item.avatar ? (
                  <Avatar size={36} src={resolveOssAssetUrl(item.avatar) || undefined} className="entity-picker-selected__thumb" />
                ) : null}
                <div className="entity-picker-selected__body">
                  <div className="entity-picker-selected__name">{item.name}</div>
                  {item.meta ? (
                    <div className="entity-picker-selected__meta">{item.meta}</div>
                  ) : null}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                aria-label={`移除 ${item.name}`}
                onClick={() => removeSelected(item.id)}
              />
            </div>
          ))
        )}
      </div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
        {addButtonLabel}
      </Button>

      <SurgeonPickerModal
        open={pickerOpen}
        mode={mode}
        disabledIds={disabledIds}
        onCancel={() => setPickerOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
