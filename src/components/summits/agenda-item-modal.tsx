'use client';

import { Button, Form, Input, Modal, Tabs, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
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
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleItemDraft };
  }

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
    const merged = getMergedDrafts();
    onDraftsChange(merged);
    onLocaleChange(locale);
    localeForm.setFieldsValue(merged[locale] ?? emptyDraft());
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return { title: draft.title, desc: draft.desc, speaker: draft.speaker };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return Boolean(draft.title.trim() || draft.desc.trim() || draft.speaker.trim());
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const nextDraft = applyNonemptyTranslatedFields(current, fields);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    onDraftsChange(nextDrafts);
    localeForm.setFieldsValue(nextDraft);
  }

  function handleSave() {
    startTransition(async () => {
      const shared = sharedForm.getFieldsValue(true) as SharedValues;
      const merged = getMergedDrafts();
      onDraftsChange(merged);
      const primaryDraft = merged[defaultLocale] ?? merged[activeLocale] ?? emptyDraft();
      const locales: NonNullable<AgendaItem['locales']> = {};
      for (const language of activeLanguages) {
        const draft = merged[language.code] ?? emptyDraft();
        if (draft.title.trim() || draft.desc.trim() || draft.speaker.trim()) {
          locales[language.code] = {
            title: draft.title.trim(),
            desc: draft.desc.trim(),
            speaker: draft.speaker.trim(),
          };
        }
      }

      onSave({
        id: item?.id ?? crypto.randomUUID(),
        startTime: shared.startTime ?? '',
        endTime: shared.endTime ?? '',
        title: primaryDraft.title ?? '',
        desc: primaryDraft.desc ?? '',
        speaker: primaryDraft.speaker ?? '',
        locales,
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

        <Form form={localeForm} layout="vertical" preserve>
          <div className="content-editor-layout">
            <div className="content-editor-locale-nav">
              {activeLanguages.map((language) => (
                <ContentEditorLocaleTab
                  key={language.code}
                  language={language}
                  isActive={language.code === activeLocale}
                  persisted={Boolean(item?.locales?.[language.code] || (language.code === defaultLocale && item))}
                  onClick={() => switchLocale(language.code)}
                />
              ))}
            </div>
            <div className="content-editor-main">
              <div className="content-editor-section-toolbar">
                <Tabs
                  activeKey="content"
                  className="content-editor-section-tabs"
                  items={[{ key: 'content', label: '内容' }]}
                />
                <ContentTranslateButton
                  contentType="summitAgendaItem"
                  defaultLocale={defaultLocale}
                  activeLocale={activeLocale}
                  disabled={isPending}
                  getDefaultSourceFields={getDefaultSourceFields}
                  hasDefaultPersisted={() => {
                    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
                    return Boolean(draft.title.trim() || draft.desc.trim() || draft.speaker.trim());
                  }}
                  hasTargetContent={hasTargetLocaleContent}
                  onTranslated={handleTranslated}
                />
              </div>
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
