'use client';

import { Button, Form, Input, Modal, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import type { AgendaItem } from '@/lib/summit-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleItemDraft = { title: string; desc: string; speaker: string };
type SharedValues = { startTime: string; endTime: string };

type Props = {
  open: boolean;
  item: AgendaItem | null;
  activeLanguages: AdminSiteLanguageRow[];
  activeLocale: string;
  onLocaleChange: (locale: string) => void;
  drafts: Record<string, LocaleItemDraft>;
  onDraftsChange: (d: Record<string, LocaleItemDraft>) => void;
  onClose: () => void;
  onSave: (item: AgendaItem) => void;
};

function emptyDraft(): LocaleItemDraft {
  return { title: '', desc: '', speaker: '' };
}

export function AgendaItemModal({ open, item, activeLanguages, activeLocale, onLocaleChange, drafts, onDraftsChange, onClose, onSave }: Props) {
  const [sharedForm] = Form.useForm<SharedValues>();
  const [localeForm] = Form.useForm<LocaleItemDraft>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    sharedForm.setFieldsValue({
      startTime: item?.startTime ?? '',
      endTime: item?.endTime ?? '',
    });
    localeForm.setFieldsValue(drafts[activeLocale] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    localeForm.setFieldsValue(drafts[activeLocale] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale]);

  function switchLocale(locale: string) {
    const cur = localeForm.getFieldsValue(true) as LocaleItemDraft;
    onDraftsChange({ ...drafts, [activeLocale]: cur });
    onLocaleChange(locale);
    localeForm.setFieldsValue(drafts[locale] ?? emptyDraft());
  }

  function handleSave() {
    startTransition(async () => {
      const shared = sharedForm.getFieldsValue(true) as SharedValues;
      const cur = localeForm.getFieldsValue(true) as LocaleItemDraft;
      const merged = { ...drafts, [activeLocale]: cur };
      onDraftsChange(merged);

      const primaryDraft = merged[activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? activeLocale] ?? cur;

      onSave({
        id: item?.id ?? crypto.randomUUID(),
        startTime: shared.startTime ?? '',
        endTime: shared.endTime ?? '',
        title: primaryDraft.title ?? '',
        desc: primaryDraft.desc ?? '',
        speaker: primaryDraft.speaker ?? '',
      });
    });
  }

  return (
    <Modal
      open={open}
      title={item ? '编辑议程环节' : '新建议程环节'}
      width={640}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      style={{ top: 80 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" loading={isPending} onClick={handleSave}>保存</Button>
        </div>

        {/* 通用区：时间 */}
        <div className="content-editor-shared-section">
          <Form form={sharedForm} layout="vertical">
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="startTime" label="开始时间" style={{ flex: 1 }}>
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  value={sharedForm.getFieldValue('startTime') ? dayjs(sharedForm.getFieldValue('startTime'), 'HH:mm') : null}
                  onChange={(_, str) => sharedForm.setFieldValue('startTime', str as string)}
                />
              </Form.Item>
              <Form.Item name="endTime" label="结束时间" style={{ flex: 1 }}>
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  value={sharedForm.getFieldValue('endTime') ? dayjs(sharedForm.getFieldValue('endTime'), 'HH:mm') : null}
                  onChange={(_, str) => sharedForm.setFieldValue('endTime', str as string)}
                />
              </Form.Item>
            </div>
          </Form>
        </div>

        {/* 多语言区 */}
        <Form form={localeForm} layout="vertical" preserve>
          <div className="content-editor-layout">
            <div className="content-editor-locale-nav">
              {activeLanguages.map((l) => (
                <ContentEditorLocaleTab
                  key={l.code}
                  language={l}
                  isActive={l.code === activeLocale}
                  persisted={Boolean(item)}
                  onClick={() => switchLocale(l.code)}
                />
              ))}
            </div>
            <div className="content-editor-main">
              <Form.Item name="title" label="标题"><Input /></Form.Item>
              <Form.Item name="desc" label="描述"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="speaker" label="演讲人"><Input placeholder="如：张明远 · 主任医师" /></Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
