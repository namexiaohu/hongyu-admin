'use client';

import { Form, Input, Modal, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { CoverOptionField, type CoverOptionValue } from '@/components/shared/cover-option-field';
import type { AdminAcademyUnitDetail } from '@/lib/academy-unit-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  courseId: string;
  detail: AdminAcademyUnitDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminAcademyUnitDetail) => void;
};

type LocaleDraft = { title: string };

function emptyDraft(): LocaleDraft {
  return { title: '' };
}

function buildDrafts(detail: AdminAcademyUnitDetail | null, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation ? { title: translation.title } : emptyDraft();
  }
  return drafts;
}

export function UnitEditorModal({ open, courseId, detail, activeLanguages, onClose, onSaved }: Props) {
  const [sharedForm] = Form.useForm<{ cover: CoverOptionValue }>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();
  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const isEdit = Boolean(detail);

  const currentDraft = useMemo(() => drafts[activeLocale] ?? emptyDraft(), [drafts, activeLocale]);

  useEffect(() => {
    if (!open) return;
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
    sharedForm.setFieldsValue({
      cover: {
        mode: detail?.coverMode || '',
        value: detail?.coverValue || '',
        previewUrl: detail?.coverPreviewUrl || '',
      },
    });
  }, [open, detail, activeLanguages, defaultLocale, sharedForm]);

  function updateDraft(patch: Partial<LocaleDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] ?? emptyDraft()), ...patch },
    }));
  }

  function handleOk() {
    startTransition(async () => {
      try {
        const shared = await sharedForm.validateFields();
        const defaultTitle = (drafts[defaultLocale]?.title ?? '').trim();
        if (!defaultTitle) {
          message.error('请填写默认语言标题');
          return;
        }

        let unitId = detail?.id;
        if (!unitId) {
          const created = await fetch(`/api/admin/academy/courses/${courseId}/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coverMode: shared.cover?.mode || '',
              coverValue: shared.cover?.value || '',
              translation: { locale: defaultLocale, title: defaultTitle },
            }),
          });
          if (!created.ok) throw new Error('创建失败');
          const payload = (await created.json()) as AdminAcademyUnitDetail;
          unitId = payload.id;
        } else {
          const patched = await fetch(`/api/admin/academy/units/${unitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coverMode: shared.cover?.mode || '',
              coverValue: shared.cover?.value || '',
            }),
          });
          if (!patched.ok) throw new Error('保存失败');
        }

        for (const language of activeLanguages) {
          const draft = drafts[language.code] ?? emptyDraft();
          if (!shouldPersistLocaleDraft({
            locale: language.code,
            defaultLocale,
            primaryText: draft.title,
          })) continue;
          const response = await fetch(`/api/admin/academy/units/${unitId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: language.code, title: draft.title }),
          });
          if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
        }

        const detailResponse = await fetch(`/api/admin/academy/units/${unitId}`);
        if (!detailResponse.ok) throw new Error('刷新失败');
        const saved = (await detailResponse.json()) as AdminAcademyUnitDetail;
        message.success(isEdit ? '单元已保存' : '单元已创建');
        onSaved(saved);
        onClose();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑单元' : '新建单元'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      width={720}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Form form={sharedForm} layout="vertical">
        <Form.Item label="封面图" name="cover">
          <CoverOptionField />
        </Form.Item>
      </Form>

      <div className="content-editor-layout">
        <div className="content-editor-locale-nav">
          {activeLanguages.map((language) => (
            <ContentEditorLocaleTab
              key={language.code}
              language={language}
              isActive={language.code === activeLocale}
              persisted={Boolean((drafts[language.code]?.title ?? '').trim()) || language.code === defaultLocale}
              onClick={() => setActiveLocale(language.code)}
            />
          ))}
        </div>
        <div className="content-editor-main">
          <Tabs
            activeKey="content"
            items={[
              {
                key: 'content',
                label: '内容',
                children: (
                  <Form layout="vertical">
                    <Form.Item label="标题" required={activeLocale === defaultLocale}>
                      <Input
                        value={currentDraft.title}
                        onChange={(event) => updateDraft({ title: event.target.value })}
                        maxLength={255}
                      />
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
