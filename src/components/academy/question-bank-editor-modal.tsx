'use client';

import { Form, Input, InputNumber, Modal, Space, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import type { AdminAcademyQuestionBankDetail } from '@/lib/academy-question-bank-content';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  detail: AdminAcademyQuestionBankDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminAcademyQuestionBankDetail) => void;
};

type LocaleDraft = { title: string };

function emptyDraft(): LocaleDraft {
  return { title: '' };
}

function buildDrafts(detail: AdminAcademyQuestionBankDetail | null, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation ? { title: translation.title } : emptyDraft();
  }
  return drafts;
}

export function QuestionBankEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
  const [settingsForm] = Form.useForm<{ timeLimitMinutes: number | null; maxRetakes: number | null; passScorePercent: number }>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const isEdit = Boolean(detail);

  const translationByLocale = useMemo(() => {
    const persisted = new Set<string>();
    for (const translation of detail?.translations ?? []) {
      if (translation.title?.trim()) persisted.add(translation.locale);
    }
    return persisted;
  }, [detail]);

  const currentDraft = useMemo(() => drafts[activeLocale] ?? emptyDraft(), [drafts, activeLocale]);

  useEffect(() => {
    if (!open) return;
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
    settingsForm.setFieldsValue({
      timeLimitMinutes: detail?.timeLimitMinutes ?? null,
      maxRetakes: detail?.maxRetakes ?? null,
      passScorePercent: detail?.passScorePercent ?? 60,
    });
  }, [open, detail, activeLanguages, defaultLocale, settingsForm]);

  function updateDraft(patch: Partial<LocaleDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] ?? emptyDraft()), ...patch },
    }));
  }

  function handleTranslated(fields: Record<string, string>) {
    const current = drafts[activeLocale] ?? emptyDraft();
    updateDraft(applyNonemptyTranslatedFields(current, fields));
  }

  function handleOk() {
    startTransition(async () => {
      try {
        const settings = await settingsForm.validateFields();
        const defaultTitle = (drafts[defaultLocale]?.title ?? '').trim();
        if (!defaultTitle) {
          message.error('请填写默认语言标题');
          return;
        }

        let bankId = detail?.id;
        if (!bankId) {
          const createResponse = await fetch('/api/admin/academy/question-banks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              passScorePercent: settings.passScorePercent,
              timeLimitMinutes: settings.timeLimitMinutes ?? null,
              maxRetakes: settings.maxRetakes ?? null,
              translation: { locale: defaultLocale, title: defaultTitle },
            }),
          });
          if (!createResponse.ok) throw new Error('创建失败');
          const created = (await createResponse.json()) as AdminAcademyQuestionBankDetail;
          bankId = created.id;
        } else {
          const patchResponse = await fetch(`/api/admin/academy/question-banks/${bankId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timeLimitMinutes: settings.timeLimitMinutes ?? null,
              maxRetakes: settings.maxRetakes ?? null,
              passScorePercent: settings.passScorePercent,
            }),
          });
          if (!patchResponse.ok) throw new Error('保存设置失败');
        }

        for (const language of activeLanguages) {
          const draft = drafts[language.code] ?? emptyDraft();
          if (!shouldPersistLocaleDraft({ locale: language.code, defaultLocale, primaryText: draft.title })) continue;
          const response = await fetch(`/api/admin/academy/question-banks/${bankId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: language.code, title: draft.title }),
          });
          if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
        }

        const detailResponse = await fetch(`/api/admin/academy/question-banks/${bankId}`);
        if (!detailResponse.ok) throw new Error('刷新失败');
        const saved = (await detailResponse.json()) as AdminAcademyQuestionBankDetail;
        message.success(isEdit ? '题库已保存' : '题库已创建');
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
      title={isEdit ? '编辑题库' : '新建题库'}
      className="question-bank-editor-modal"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      width={720}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Form form={settingsForm} layout="vertical" style={{ marginBottom: 16 }}>
        <Space wrap size="large">
          <Form.Item name="timeLimitMinutes" label="考试限时时长（分钟，留空不限）">
            <InputNumber min={1} placeholder="不限" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="maxRetakes" label="允许重考次数（留空不限）">
            <InputNumber min={0} placeholder="不限" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="passScorePercent" label="及格线 (%)" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} addonAfter="%" style={{ width: 160 }} />
          </Form.Item>
        </Space>
      </Form>

      <div className="content-editor-layout">
        <div className="content-editor-locale-nav">
          {activeLanguages.map((language) => (
            <ContentEditorLocaleTab
              key={language.code}
              language={language}
              isActive={activeLocale === language.code}
              persisted={Boolean((drafts[language.code]?.title ?? '').trim()) || Boolean(detail?.translations.find((item) => item.locale === language.code)?.title?.trim())}
              onClick={() => setActiveLocale(language.code)}
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
              contentType="academyQuestionBank"
              defaultLocale={defaultLocale}
              activeLocale={activeLocale}
              disabled={isPending}
              getDefaultSourceFields={() => ({ title: drafts[defaultLocale]?.title ?? '' })}
              hasDefaultPersisted={() => Boolean(detail && translationByLocale.has(defaultLocale))}
              hasTargetContent={() => Boolean((drafts[activeLocale]?.title ?? '').trim())}
              onTranslated={handleTranslated}
            />
          </div>
          <Form layout="vertical">
            <Form.Item label="标题" required={activeLocale === defaultLocale}>
              <Input
                value={currentDraft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                maxLength={255}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
