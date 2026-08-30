'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Tabs, Typography, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { CoverOptionField, type CoverOptionValue } from '@/components/shared/cover-option-field';
import {
  HeroCoverDisplayField,
  HERO_COVER_DISPLAY_FIELD_EXTRA,
} from '@/components/shared/hero-cover-display-field';
import type { AcademyStat, AcademyStatus } from '@/lib/academy-content-shared';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { defaultHeroCoverDisplay, type HeroCoverDisplay } from '@/lib/hero-cover-display';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { ProductGalleryImage } from '@/lib/product-content';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

import { CoursePickerField } from './course-picker-field';

type LocaleDraft = {
  title: string;
  subtitle: string;
  badgeLabel: string;
  summary: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  stats: AcademyStat[];
  learnings: string[];
  skills: string[];
  tools: string[];
};

type SharedFormValues = {
  slug: string;
  cover: CoverOptionValue;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  teacherCount: number;
  studentCount: number;
  courseIds: string[];
};

type EntityDetail = {
  id: string;
  slug: string;
  status: AcademyStatus;
  coverMode: '' | 'preset' | 'upload';
  coverValue: string;
  coverImage: string;
  coverPreviewUrl: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  teacherCount: number;
  studentCount: number;
  courseIds?: string[];
  translations: Array<{
    locale: string;
    title: string;
    subtitle?: string;
    badgeLabel?: string;
    summary: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    stats: AcademyStat[];
    learnings: string[];
    skills: string[];
    tools: string[];
  }>;
};

type Props = {
  open: boolean;
  entityType: 'course' | 'certificate';
  detail: EntityDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: EntityDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return {
    title: '',
    subtitle: '',
    badgeLabel: '',
    summary: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    stats: [],
    learnings: [],
    skills: [],
    tools: [],
  };
}

function buildDrafts(detail: EntityDetail | null, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation
      ? {
        title: translation.title,
        subtitle: translation.subtitle ?? '',
        badgeLabel: translation.badgeLabel ?? '',
        summary: translation.summary,
        description: translation.description,
        seoTitle: translation.seoTitle,
        seoDescription: translation.seoDescription,
        stats: translation.stats ?? [],
        learnings: translation.learnings ?? [],
        skills: translation.skills ?? [],
        tools: translation.tools ?? [],
      }
      : emptyDraft();
  }
  return drafts;
}

function hasDraftContent(draft: LocaleDraft) {
  return Boolean(
    draft.title.trim()
    || draft.subtitle.trim()
    || draft.badgeLabel.trim()
    || draft.summary.trim()
    || hasMeaningfulHtmlBody(draft.description)
    || draft.seoTitle.trim()
    || draft.seoDescription.trim()
    || draft.stats.some((row) => row.label || row.value)
    || draft.learnings.some(Boolean)
    || draft.skills.some(Boolean)
    || draft.tools.some(Boolean),
  );
}

export function AcademyEditorModal({ open, entityType, detail, activeLanguages, onClose, onSaved }: Props) {
  const [form] = Form.useForm<LocaleDraft & { stats: Array<{ label: string; value: string }>; learnings: Array<{ name: string }>; skills: Array<{ name: string }>; tools: Array<{ name: string }> }>();
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [sectionTab, setSectionTab] = useState('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [editorRevision, setEditorRevision] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isCreate = !detail;
  const apiBase = entityType === 'course' ? '/api/admin/academy/courses' : '/api/admin/academy/certificates';
  const entityLabel = entityType === 'course' ? '课程' : '证书';

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const translationByLocale = useMemo(() => {
    const persisted = new Set<string>();
    for (const translation of detail?.translations ?? []) {
      if (translation.title?.trim()) persisted.add(translation.locale);
    }
    return persisted;
  }, [detail]);

  function readDraftFromForm(): LocaleDraft {
    const values = form.getFieldsValue(true);
    return {
      title: values.title ?? '',
      subtitle: values.subtitle ?? '',
      badgeLabel: values.badgeLabel ?? '',
      summary: values.summary ?? '',
      description: values.description ?? '',
      seoTitle: values.seoTitle ?? '',
      seoDescription: values.seoDescription ?? '',
      stats: (values.stats ?? []).map((row: AcademyStat) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' })).filter((row: AcademyStat) => row.label || row.value),
      learnings: (values.learnings ?? []).map((row: { name?: string }) => row?.name?.trim() ?? '').filter(Boolean),
      skills: (values.skills ?? []).map((row: { name?: string }) => row?.name?.trim() ?? '').filter(Boolean),
      tools: (values.tools ?? []).map((row: { name?: string }) => row?.name?.trim() ?? '').filter(Boolean),
    };
  }

  function applyDraftToForm(draft: LocaleDraft) {
    form.setFieldsValue({
      ...draft,
      stats: draft.stats.length ? draft.stats : [{ label: '', value: '' }],
      learnings: draft.learnings.map((name) => ({ name })),
      skills: draft.skills.map((name) => ({ name })),
      tools: draft.tools.map((name) => ({ name })),
    });
    setEditorRevision((value) => value + 1);
  }

  useEffect(() => {
    if (!open) return;
    const nextDrafts = buildDrafts(detail, activeLanguages);
    setDrafts(nextDrafts);
    const locale = activeLanguages.find((item) => item.code === activeLocale)?.code ?? defaultLocale;
    setActiveLocale(locale);
    applyDraftToForm(nextDrafts[locale] ?? emptyDraft());
    sharedForm.setFieldsValue({
      slug: detail?.slug ?? '',
      cover: {
        mode: detail?.coverMode ?? '',
        value: detail?.coverValue ?? '',
        previewUrl: detail?.coverPreviewUrl ?? '',
      },
      gallery: detail?.gallery ?? [],
      videoUrl: detail?.videoUrl ?? '',
      showCoverOnBackground: detail?.showCoverOnBackground ?? false,
      coverDisplay: detail?.coverDisplay ?? defaultHeroCoverDisplay(true),
      teacherCount: detail?.teacherCount ?? 0,
      studentCount: detail?.studentCount ?? 0,
      courseIds: detail?.courseIds ?? [],
    });
  }, [open, detail, activeLanguages, defaultLocale, sharedForm]);

  function switchLocale(nextLocale: string) {
    const currentDraft = readDraftFromForm();
    const merged = { ...drafts, [activeLocale]: currentDraft };
    setDrafts(merged);
    setActiveLocale(nextLocale);
    applyDraftToForm(merged[nextLocale] ?? emptyDraft());
  }

  async function persist() {
    const currentDraft = readDraftFromForm();
    const mergedDrafts = { ...drafts, [activeLocale]: currentDraft };
    const shared = sharedForm.getFieldsValue(true);
    const sourceTitle = mergedDrafts[defaultLocale]?.title?.trim() || currentDraft.title.trim();
    if (!sourceTitle) {
      message.error(`请填写默认语言（${defaultLocale}）标题`);
      return;
    }

    const slug = resolveSlugForSave({ sourceText: sourceTitle, slug: shared.slug }) ?? '';
    const slugValidation = validateSourceThenAutoSlug({
      locale: defaultLocale,
      sourceText: sourceTitle,
      slug: shared.slug ?? '',
      emptySourceMessage: `请填写默认语言（${defaultLocale}）标题`,
    });
    if (!slugValidation.ok) {
      message.error(slugValidation.message);
      return;
    }

    startTransition(async () => {
      try {
        let entityId = detail?.id;
        const coverMode = shared.cover?.mode ?? '';
        const coverValue = shared.cover?.value?.trim() ?? '';
        const gallery = (shared.gallery ?? []).filter((item: ProductGalleryImage) => item.url?.trim());
        const videoUrl = shared.videoUrl?.trim() ?? '';
        const showCoverOnBackground = Boolean(shared.showCoverOnBackground);
        const coverDisplay = shared.coverDisplay ?? defaultHeroCoverDisplay(true);

        if (isCreate) {
          const createBody = {
            slug,
            coverMode,
            coverValue,
            gallery,
            videoUrl,
            showCoverOnBackground,
            coverDisplay,
            teacherCount: shared.teacherCount ?? 0,
            studentCount: shared.studentCount ?? 0,
            translation: {
              locale: defaultLocale,
              ...mergedDrafts[defaultLocale],
              title: mergedDrafts[defaultLocale]?.title?.trim() || sourceTitle,
            },
            ...(entityType === 'certificate' ? { courseIds: shared.courseIds ?? [] } : {}),
          };
          const response = await fetch(apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createBody),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message ?? '创建失败');
          }
          const created = await response.json() as EntityDetail;
          entityId = created.id;
        }

        if (!entityId) throw new Error('保存失败');

        for (const language of activeLanguages) {
          const draft = mergedDrafts[language.code];
          if (!shouldPersistLocaleDraft({
            locale: language.code,
            defaultLocale,
            primaryText: draft?.title ?? '',
          })) continue;
          if (!draft?.title?.trim()) continue;
          await fetch(`${apiBase}/${entityId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: language.code, ...draft, title: draft.title.trim() }),
          });
        }

        const patchBody = {
          slug,
          coverMode,
          coverValue,
          gallery,
          videoUrl,
          showCoverOnBackground,
          coverDisplay,
          teacherCount: shared.teacherCount ?? 0,
          studentCount: shared.studentCount ?? 0,
          ...(entityType === 'certificate' ? { courseIds: shared.courseIds ?? [] } : {}),
        };
        const patchResponse = await fetch(`${apiBase}/${entityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        if (!patchResponse.ok) {
          const payload = await patchResponse.json().catch(() => null);
          throw new Error(payload?.message ?? '更新失败');
        }
        const saved = await patchResponse.json() as EntityDetail;
        onSaved(saved);
        message.success(isCreate ? `已创建${entityLabel}` : `已保存${entityLabel}`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  return (
    <Modal
      open={open}
      title={isCreate ? `新建${entityLabel}` : `编辑${entityLabel}`}
      width={1080}
      onCancel={onClose}
      onOk={() => void persist()}
      confirmLoading={isPending}
      destroyOnHidden
    >
      <Form form={sharedForm} layout="vertical" style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }} size="middle">
          <Form.Item name="teacherCount" label="教师数量">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="studentCount" label="学生数量">
            <InputNumber min={0} />
          </Form.Item>
        </Space>
        <Form.Item name="slug" label="Slug" extra="留空则根据标题自动生成">
          <Input placeholder={textToSlug(form.getFieldValue('title') || 'example-slug')} />
        </Form.Item>
        <Form.Item
          name="cover"
          label="封面"
          getValueFromEvent={(value: CoverOptionValue | null) => value ?? { mode: '', value: '', previewUrl: '' }}
        >
          <CoverOptionField />
        </Form.Item>
        <Form.Item
          name="gallery"
          label="轮播图"
          getValueFromEvent={(value: ProductGalleryImage[] | undefined) => value ?? []}
        >
          <ProductGalleryField folder="academy/gallery" />
        </Form.Item>
        <Form.Item
          name="videoUrl"
          label="视频"
          getValueFromEvent={(value: string | null) => value ?? ''}
        >
          <ProductVideoField folder="academy/videos" />
        </Form.Item>
        <Form.Item
          name="showCoverOnBackground"
          label="大背景图同时显示封面"
          valuePropName="checked"
          extra="开启后，详情页看板右侧同时展示封面/视频/轮播图；关闭则显示装饰图形"
        >
          <Switch checkedChildren="开" unCheckedChildren="关" />
        </Form.Item>
        <Form.Item
          name="coverDisplay"
          label="封面显示"
          extra={HERO_COVER_DISPLAY_FIELD_EXTRA}
          initialValue={defaultHeroCoverDisplay(true)}
        >
          <HeroCoverDisplayField />
        </Form.Item>
        {entityType === 'certificate' ? (
          <Form.Item name="courseIds" label="关联课程" getValueFromEvent={(value: string[] | undefined) => value ?? []}>
            <CoursePickerField />
          </Form.Item>
        ) : null}
      </Form>

      <div className="content-editor-layout">
        <div className="content-editor-locale-nav">
          {activeLanguages.map((language) => (
            <ContentEditorLocaleTab
              key={language.code}
              language={language}
              isActive={language.code === activeLocale}
              persisted={translationByLocale.has(language.code)}
              onClick={() => switchLocale(language.code)}
            />
          ))}
        </div>
        <div className="content-editor-main">
          <div className="content-editor-section-toolbar">
            <Tabs
              activeKey={sectionTab}
              onChange={setSectionTab}
              className="content-editor-section-tabs"
              items={[
                { key: 'content', label: '内容' },
                { key: 'stats', label: '数据指标' },
                { key: 'learnings', label: '学到什么' },
                { key: 'skills', label: '获得技能' },
                { key: 'tools', label: '学习工具' },
                { key: 'seo', label: 'SEO' },
              ]}
            />
          </div>

          <Form form={form} layout="vertical">
            <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
              <Form.Item name="title" label="标题" rules={[{ required: activeLocale === defaultLocale, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="subtitle" label="副标题">
                <Input placeholder="显示在标题下方" />
              </Form.Item>
              <Form.Item name="badgeLabel" label="角标文案">
                <Input placeholder="卡片左上角蓝色角标" maxLength={40} />
              </Form.Item>
              <Form.Item name="summary" label="简介">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'stats' ? 'block' : 'none' }}>
              <Form.List name="stats">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    {fields.map((field) => (
                      <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Form.Item name={[field.name, 'label']} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="指标名" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="指标值，如 120+" />
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add({ label: '', value: '' })} icon={<PlusOutlined />}>
                      添加指标
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>

            {(['learnings', 'skills', 'tools'] as const).map((listName) => (
              <div key={listName} style={{ display: sectionTab === listName ? 'block' : 'none' }}>
                <Form.List name={listName}>
                  {(fields, { add, remove }) => (
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="标签名" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add({ name: '' })} icon={<PlusOutlined />}>
                        添加标签
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            ))}

            <div style={{ display: sectionTab === 'seo' ? 'block' : 'none' }}>
              <Form.Item name="seoTitle" label="SEO 标题">
                <Input placeholder="留空则使用页面标题" />
              </Form.Item>
              <Form.Item name="seoDescription" label="SEO 描述">
                <Input.TextArea rows={3} placeholder="留空则使用页面描述" />
              </Form.Item>
            </div>
          </Form>
        </div>
      </div>
      {entityType === 'certificate' ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          使用上下箭头在证书中调整课程顺序：在关联课程列表中按顺序保存。
        </Typography.Paragraph>
      ) : null}
    </Modal>
  );
}
