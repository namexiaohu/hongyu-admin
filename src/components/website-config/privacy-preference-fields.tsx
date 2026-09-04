'use client';

import { Form, Input, Tabs } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import {
  emptyPrivacyPreferenceLocale,
  hasPrivacyPreferenceLocaleContent,
  type PrivacyPreferenceConfig,
  type PrivacyPreferenceLocaleCopy,
} from '@/lib/website-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  value: PrivacyPreferenceConfig;
  onChange: (next: PrivacyPreferenceConfig) => void;
  activeLanguages: AdminSiteLanguageRow[];
};

type FormValues = PrivacyPreferenceLocaleCopy;

export function PrivacyPreferenceFields({ value, onChange, activeLanguages }: Props) {
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code
    ?? activeLanguages[0]?.code
    ?? 'zh-CN';
  const [activeLocale, setActiveLocale] = useState(defaultLocale);
  const draftsRef = useRef<Record<string, PrivacyPreferenceLocaleCopy>>({ ...value.locales });
  const [persistedTick, setPersistedTick] = useState(0);
  const [form] = Form.useForm<FormValues>();
  const [editorRevision, setEditorRevision] = useState(0);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    draftsRef.current = { ...value.locales };
    const draft = draftsRef.current[activeLocale] ?? emptyPrivacyPreferenceLocale();
    form.setFieldsValue(draft);
    setEditorRevision((prev) => prev + 1);
    setPersistedTick((prev) => prev + 1);
  }, [value, activeLocale, form]);

  useEffect(() => {
    if (!activeLanguages.some((language) => language.code === activeLocale)) {
      setActiveLocale(defaultLocale);
    }
  }, [activeLanguages, activeLocale, defaultLocale]);

  useEffect(() => {
    const draft = draftsRef.current[activeLocale] ?? emptyPrivacyPreferenceLocale();
    form.setFieldsValue(draft);
    setEditorRevision((prev) => prev + 1);
  }, [activeLocale, form]);

  function emitChange(nextLocales: Record<string, PrivacyPreferenceLocaleCopy>) {
    draftsRef.current = nextLocales;
    const next = { locales: nextLocales };
    lastExternalValue.current = next;
    onChange(next);
    setPersistedTick((prev) => prev + 1);
  }

  function readFormDraft(): PrivacyPreferenceLocaleCopy {
    const values = form.getFieldsValue(true) as FormValues;
    return {
      title: values.title?.trim() ?? '',
      summary: values.summary?.trim() ?? '',
      detailHtml: values.detailHtml?.trim() ?? '',
    };
  }

  function switchLocale(nextLocale: string) {
    if (nextLocale === activeLocale) return;
    emitChange({
      ...draftsRef.current,
      [activeLocale]: readFormDraft(),
    });
    setActiveLocale(nextLocale);
  }

  function handleValuesChange(_: unknown, allValues: FormValues) {
    emitChange({
      ...draftsRef.current,
      [activeLocale]: {
        title: allValues.title?.trim() ?? '',
        summary: allValues.summary?.trim() ?? '',
        detailHtml: allValues.detailHtml?.trim() ?? '',
      },
    });
  }

  function getDefaultSourceFields() {
    const draft = draftsRef.current[defaultLocale] ?? emptyPrivacyPreferenceLocale();
    return {
      title: draft.title,
      summary: draft.summary,
      detailHtml: draft.detailHtml,
    };
  }

  function handleTranslated(fields: Record<string, string>) {
    const current = readFormDraft();
    const next = applyNonemptyTranslatedFields(current, fields);
    form.setFieldsValue(next);
    setEditorRevision((prev) => prev + 1);
    emitChange({
      ...draftsRef.current,
      [activeLocale]: next,
    });
  }

  void persistedTick;

  return (
    <div className="content-editor-shared-section">
      <Form form={form} layout="vertical" preserve onValuesChange={handleValuesChange}>
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={language.code === activeLocale}
                persisted={hasPrivacyPreferenceLocaleContent(
                  { locales: draftsRef.current },
                  language.code,
                )}
                onClick={() => switchLocale(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <div className="content-editor-section-toolbar">
              <Tabs
                activeKey="privacy"
                className="content-editor-section-tabs"
                items={[{ key: 'privacy', label: '隐私偏好' }]}
              />
              <ContentTranslateButton
                contentType="privacyPreference"
                defaultLocale={defaultLocale}
                activeLocale={activeLocale}
                getDefaultSourceFields={getDefaultSourceFields}
                hasDefaultPersisted={() => hasPrivacyPreferenceLocaleContent(
                  { locales: draftsRef.current },
                  defaultLocale,
                )}
                hasTargetContent={() => hasPrivacyPreferenceLocaleContent(
                  { locales: draftsRef.current },
                  activeLocale,
                )}
                onTranslated={handleTranslated}
              />
            </div>
            <Form.Item name="title" label="标题">
              <Input placeholder="Cookie 使用说明" />
            </Form.Item>
            <Form.Item name="summary" label="简介">
              <RichTextEditor key={`${activeLocale}-privacy-summary-${editorRevision}`} minHeight={220} />
            </Form.Item>
            <Form.Item name="detailHtml" label="详细描述">
              <RichTextEditor key={`${activeLocale}-privacy-detail-${editorRevision}`} minHeight={280} />
            </Form.Item>
          </div>
        </div>
      </Form>
    </div>
  );
}
