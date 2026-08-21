'use client';

import type { FormInstance } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Tabs, Tag, message } from 'antd';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  PartnerCenterBackgroundField,
  type PartnerCenterBackgroundValue,
} from '@/components/partner-centers/partner-center-background-field';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { BrandNarrativeBlockEditorModal, type BrandNarrativeBlockEditorHandle } from '@/components/brand-narratives/brand-narrative-block-editor-modal';
import { BrandNarrativeBlockList } from '@/components/brand-narratives/brand-narrative-block-list';
import type { BrandNarrativeBlockDraft } from '@/lib/brand-narrative-blocks';
import {
  type AdminBrandNarrativeDetail,
  type AdminBrandNarrativeTranslation,
  type BrandNarrativeStatus,
} from '@/lib/brand-narrative-content';
import type { ProductGalleryImage } from '@/lib/product-content';
import { MEDIA_ASSET_TYPE_BRAND_NARRATIVE_BACKGROUND } from '@/lib/partner-center-background-presets';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'hero' | 'stats' | 'seo' | 'seo-meta';
type PersistMode = 'save' | 'publish';

function resolveTargetStatus(
  mode: PersistMode,
  baselineStatus?: BrandNarrativeStatus,
): BrandNarrativeStatus {
  if (mode === 'publish') return 'published';
  if (baselineStatus === 'published') return 'published';
  if (baselineStatus === 'archived') return 'archived';
  return 'draft';
}

function EditorActionButtons({
  isArchived,
  isPublished,
  isPending,
  onSave,
  onPublish,
}: {
  isArchived: boolean;
  isPublished: boolean;
  isPending: boolean;
  onSave: () => void;
  onPublish: () => void;
}) {
  if (isArchived) return null;

  return (
    <Space wrap>
      <Button loading={isPending} onClick={onSave}>保存</Button>
      {isPublished ? null : (
        <Popconfirm
          title="确定立即发布吗？"
          description="发布后内容将对访客可见。"
          onConfirm={onPublish}
        >
          <Button type="primary" loading={isPending}>立即发布</Button>
        </Popconfirm>
      )}
    </Space>
  );
}

type LocaleFormValues = {
  heroTitle: string;
  heroSlogan: string;
  heroLead: string;
  seoTitle: string;
  seoDescription: string;
  stats: Array<{ label: string; value: string }>;
};

type LocaleDraft = Omit<LocaleFormValues, 'slug'>;

/** 封面图和 slug 是主表字段，不随语言变化，单独管理 */
type SharedFormValues = {
  coverImage: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  slug: string;
  showCoverOnBackground: boolean;
  background: PartnerCenterBackgroundValue;
};

type BrandNarrativeEditorModalProps = {
  open: boolean;
  detail: AdminBrandNarrativeDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminBrandNarrativeDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return {
    heroTitle: '',
    heroSlogan: '',
    heroLead: '',
    seoTitle: '',
    seoDescription: '',
    stats: [],
  };
}

function translationToDraft(translation: AdminBrandNarrativeTranslation): LocaleDraft {
  return {
    heroTitle: translation.title,
    heroSlogan: translation.largeTitle,
    heroLead: translation.description,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    stats: (translation.stats ?? []).map((stat) => ({ label: stat.label, value: stat.value })),
  };
}

function buildLocaleDrafts(
  detail: AdminBrandNarrativeDetail | null,
  languages: AdminSiteLanguageRow[],
): Record<string, LocaleDraft> {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation ? translationToDraft(translation) : emptyDraft();
  }
  return drafts;
}

function readLocaleDraft(values: LocaleFormValues): LocaleDraft {
  return {
    heroTitle: values.heroTitle ?? '',
    heroSlogan: values.heroSlogan ?? '',
    heroLead: values.heroLead ?? '',
    seoTitle: values.seoTitle ?? '',
    seoDescription: values.seoDescription ?? '',
    stats: values.stats ?? [],
  };
}

function hasNarrativeDraftContent(draft: LocaleDraft): boolean {
  return Boolean(
    draft.heroTitle.trim()
    || draft.heroSlogan.trim()
    || draft.heroLead.trim()
    || draft.stats.some((row) => row.label?.trim() || row.value?.trim()),
  );
}

function buildTranslationBody(draft: LocaleDraft, locale: string) {
  return {
    locale,
    title: draft.heroTitle.trim(),
    largeTitle: draft.heroSlogan.trim(),
    description: draft.heroLead.trim(),
    seoTitle: draft.seoTitle.trim(),
    seoDescription: draft.seoDescription.trim(),
    stats: (draft.stats ?? [])
      .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
      .filter((row) => row.label && row.value),
  };
}

function getValidateErrorTab(error: unknown): SectionTabKey | null {
  if (!error || typeof error !== 'object' || !('errorFields' in error)) return null;
  const errorFields = (error as { errorFields?: Array<{ name: Array<string | number> }> }).errorFields;
  const first = errorFields?.[0]?.name?.[0];
  if (first === 'slug') return 'seo';
  if (first === 'stats') return 'stats';
  if (first === 'seoTitle' || first === 'seoDescription') return 'seo-meta';
  if (first === 'heroTitle' || first === 'heroSlogan' || first === 'heroLead') return 'hero';
  return 'hero';
}

function mergeActiveFormIntoDrafts(
  currentDrafts: Record<string, LocaleDraft>,
  locale: string,
  form: FormInstance<LocaleFormValues>,
): Record<string, LocaleDraft> {
  return {
    ...currentDrafts,
    [locale]: readLocaleDraft(form.getFieldsValue(true)),
  };
}

function normalizeStatRow(row: unknown): { label: string; value: string } {
  if (!row || typeof row !== 'object') return { label: '', value: '' };
  const record = row as { label?: unknown; value?: unknown };
  return {
    label: typeof record.label === 'string' ? record.label : String(record.label ?? ''),
    value: typeof record.value === 'string' ? record.value : String(record.value ?? ''),
  };
}

function serializeStatsText(stats: LocaleDraft['stats']): string {
  return (stats ?? [])
    .map((row) => `${row.label?.trim() ?? ''}|||${row.value?.trim() ?? ''}`)
    .filter((line) => line !== '|||')
    .join('\n');
}

function deserializeStatsText(text: string): LocaleDraft['stats'] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeStatRow).filter((row) => row.label.trim() || row.value.trim());
    }
    if (typeof parsed === 'string' && parsed.trim() && parsed.trim() !== trimmed) {
      return deserializeStatsText(parsed);
    }
  } catch {
    // 按行解析 LABEL|||VALUE
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => {
      const [label, ...rest] = line.split('|||');
      return {
        label: label.trim(),
        value: rest.join('|||').trim(),
      };
    })
    .filter((row) => row.label || row.value);
}

export function BrandNarrativeEditorModal({
  open,
  detail,
  activeLanguages,
  onClose,
  onSaved,
}: BrandNarrativeEditorModalProps) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('hero');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [blocks, setBlocks] = useState<BrandNarrativeBlockDraft[]>([]);
  const [editingBlock, setEditingBlock] = useState<BrandNarrativeBlockDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const blocksRef = useRef<BrandNarrativeBlockDraft[]>([]);
  const blockEditorRef = useRef<BrandNarrativeBlockEditorHandle>(null);
  const isCreate = !detail;
  const isArchived = detail?.status === 'archived';
  const isPublished = detail?.status === 'published';
  const isReadOnly = isArchived;

  const translationByLocale = useMemo(() => {
    const map = new Map<string, AdminBrandNarrativeTranslation>();
    detail?.translations.forEach((translation) => map.set(translation.locale, translation));
    return map;
  }, [detail]);

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  blocksRef.current = blocks;

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale, form);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    const saved = translationByLocale.get(defaultLocale);
    const savedStats = saved?.stats ?? [];
    const stats = draft.stats.some((row) => row.label?.trim() || row.value?.trim())
      ? draft.stats
      : savedStats;
    return {
      heroTitle: draft.heroTitle,
      heroSlogan: draft.heroSlogan,
      heroLead: draft.heroLead,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      statsText: serializeStatsText(stats),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return Boolean(
      draft.heroTitle.trim()
      || draft.heroSlogan.trim()
      || draft.heroLead.trim()
      || draft.stats.some((row) => row.label?.trim() || row.value?.trim()),
    );
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const sourceStats = merged[defaultLocale]?.stats ?? [];
    const { statsText, stats: statsField, ...plainFields } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const translatedStats = deserializeStatsText(statsText || statsField || '');
    nextDraft.stats = (translatedStats.length ? translatedStats : sourceStats).map((row) => ({
      label: row.label ?? '',
      value: row.value ?? '',
    }));
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue({
      heroTitle: nextDraft.heroTitle,
      heroSlogan: nextDraft.heroSlogan,
      heroLead: nextDraft.heroLead,
      seoTitle: nextDraft.seoTitle,
      seoDescription: nextDraft.seoDescription,
    });
    form.setFieldValue('stats', nextDraft.stats);
  }

  useEffect(() => {
    if (!open) return;
    const firstLocale = activeLanguages[0]?.code ?? 'zh';
    const nextDrafts = buildLocaleDrafts(detail, activeLanguages);
    setActiveLocale(firstLocale);
    setSectionTab('hero');
    setDrafts(nextDrafts);
    setBlocks(detail?.blocks ?? []);
    setEditingBlock(null);
    blocksRef.current = detail?.blocks ?? [];
    form.setFieldsValue(nextDrafts[firstLocale] ?? emptyDraft());
    sharedForm.setFieldsValue({
      coverImage: detail?.coverImage ?? '',
      gallery: detail?.gallery ?? [],
      videoUrl: detail?.videoUrl ?? '',
      slug: detail?.slug ?? '',
      showCoverOnBackground: detail?.showCoverOnBackground ?? true,
      background: {
        mode: detail?.backgroundMode ?? '',
        value: detail?.backgroundValue ?? '',
        previewUrl: detail?.backgroundPreviewUrl ?? '',
      },
    });
    // 只在打开弹窗时初始化；保存后父组件刷新 detail 不应丢掉区块草稿。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const currentValues = form.getFieldsValue(true);
    const nextDrafts = { ...drafts, [activeLocale]: readLocaleDraft(currentValues) };
    setDrafts(nextDrafts);
    setActiveLocale(locale);
    form.setFieldsValue(nextDrafts[locale] ?? emptyDraft());
  }

  function persist(mode: PersistMode) {
    if (isReadOnly) return;
    startTransition(async () => {
      try {
        const values = await form.validateFields();
        const sharedValues = sharedForm.getFieldsValue(true) as SharedFormValues;
        const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
        setDrafts(mergedDrafts);
        const defaultDraft = mergedDrafts[defaultLocale] ?? emptyDraft();
        const slugSourceTitle = defaultDraft.heroTitle.trim() || readLocaleDraft(values).heroTitle.trim();
        let resolvedSlug = detail?.slug ?? '';

        if (isCreate) {
          const slugCheck = validateSourceThenAutoSlug({
            locale: defaultLocale || activeLocale,
            sourceText: slugSourceTitle,
            slug: sharedValues.slug ?? '',
            emptySourceMessage: '请输入标题',
            section: 'content',
          });
          if (!slugCheck.ok) {
            setActiveLocale(defaultLocale || activeLocale);
            form.setFieldsValue(mergedDrafts[defaultLocale] ?? emptyDraft());
            setSectionTab('hero');
            message.error(slugCheck.message);
            return;
          }
          resolvedSlug = slugCheck.autoSlug
            ?? resolveSlugForSave({ sourceText: slugSourceTitle, slug: sharedValues.slug })
            ?? '';
          if (slugCheck.autoSlug) {
            sharedForm.setFieldsValue({ slug: resolvedSlug });
          }
        } else {
          resolvedSlug = resolveSlugForSave({ sourceText: slugSourceTitle, slug: sharedValues.slug }) ?? '';
        }

        if (!resolvedSlug) {
          message.error('请填写 Slug');
          return;
        }

        if (!defaultDraft.heroTitle.trim()) {
          setActiveLocale(defaultLocale);
          form.setFieldsValue(defaultDraft);
          setSectionTab('hero');
          message.error('请输入标题');
          return;
        }

        const targets = activeLanguages
          .map((language) => ({
            locale: language.code,
            draft: mergedDrafts[language.code] ?? emptyDraft(),
          }))
          .filter((target) => shouldPersistLocaleDraft({
            locale: target.locale,
            defaultLocale,
            primaryText: target.draft.heroTitle,
          }) || (target.locale !== defaultLocale && hasNarrativeDraftContent(target.draft)));

        const status = resolveTargetStatus(mode, detail?.status);
        const flushedBlock = editingBlock ? (blockEditorRef.current?.flush() ?? null) : null;
        const blocksToSave = (() => {
          const current = blocksRef.current;
          if (!flushedBlock) return current;
          const next = current.map((item) => (item.id === flushedBlock.id ? flushedBlock : item));
          blocksRef.current = next;
          return next;
        })();

        const coverImage = sharedValues.coverImage?.trim() ?? '';
        const gallery = (sharedValues.gallery ?? []).filter((item) => item.url?.trim());
        const videoUrl = sharedValues.videoUrl?.trim() ?? '';
        const showCoverOnBackground = Boolean(sharedValues.showCoverOnBackground);
        const backgroundMode = sharedValues.background?.mode ?? '';
        const backgroundValue = sharedValues.background?.value?.trim() ?? '';
        const sharedBgPayload = { showCoverOnBackground, backgroundMode, backgroundValue, gallery, videoUrl };

        async function upsertTranslation(narrativeId: string, locale: string, draft: LocaleDraft) {
          const saveDraft = draft.heroTitle.trim()
            ? draft
            : { ...draft, heroTitle: defaultDraft.heroTitle };
          const response = await fetch(`/api/admin/brand-narratives/${narrativeId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, locale)),
          });
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? '保存失败');
          }
        }

        let narrativeId = detail?.id;

        if (!detail) {
          const response = await fetch('/api/admin/brand-narratives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: resolvedSlug,

              status,
              coverImage,
              ...sharedBgPayload,
              blocks: blocksToSave,
              translation: buildTranslationBody(defaultDraft, defaultLocale),
            }),
          });
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? '创建失败');
          }
          const created = (await response.json()) as AdminBrandNarrativeDetail;
          narrativeId = created.id;
        }

        if (!narrativeId) throw new Error('保存失败');

        for (const target of targets) {
          if (!detail && target.locale === defaultLocale) continue;
          await upsertTranslation(narrativeId, target.locale, target.draft);
        }

        const statusResponse = await fetch(`/api/admin/brand-narratives/${narrativeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            blocks: blocksToSave,
            slug: resolvedSlug,
            coverImage,
            ...sharedBgPayload,
          }),
        });
        if (!statusResponse.ok) {
          const errorBody = await statusResponse.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }

        const detailResponse = await fetch(`/api/admin/brand-narratives/${narrativeId}`);
        if (!detailResponse.ok) throw new Error('刷新详情失败');
        const refreshed = (await detailResponse.json()) as AdminBrandNarrativeDetail;
        blocksRef.current = refreshed.blocks ?? [];
        setBlocks(blocksRef.current);
        onSaved(refreshed);
        message.success(mode === 'publish' ? '发布成功' : '保存成功');
      } catch (error) {
        const tab = getValidateErrorTab(error);
        if (tab) {
          setSectionTab(tab);
          return;
        }
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const actionButtons = (
    <EditorActionButtons
      isArchived={isArchived}
      isPublished={isPublished}
      isPending={isPending}
      onSave={() => persist('save')}
      onPublish={() => persist('publish')}
    />
  );

  function saveEditingBlock(next: BrandNarrativeBlockDraft) {
    const nextBlocks = blocksRef.current.map((item) => (item.id === next.id ? next : item));
    blocksRef.current = nextBlocks;
    setBlocks(nextBlocks);
    setEditingBlock(next);

    if (!detail) {
      message.success('区块已更新，请保存叙事');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/brand-narratives/${detail.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks: nextBlocks }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }
        message.success('区块已保存');
      } catch (error) {
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const modalTitle = (
    <Space wrap>
      <span>{detail ? `编辑企业叙事 · ${detail.slug}` : '新建企业叙事'}</span>
      {isArchived ? <Tag color="red">已归档</Tag> : null}
    </Space>
  );

  return (
    <>
      <Modal
        open={open}
        title={modalTitle}
        width={1080}
        onCancel={onClose}
        footer={null}
        className="content-editor-modal brand-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
        destroyOnHidden
      >
        <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{actionButtons}</div>

          <div className="content-editor-shared-section">
            <Form form={sharedForm} layout="vertical" disabled={isReadOnly}>
              <Form.Item
                name="slug"
                label="Slug（各语言共用）"
                extra="留空将根据标题自动生成"
                rules={[{ required: true, message: '请填写 Slug' }]}
              >
                <Input
                  placeholder="about"
                  onBlur={() => {
                    if (!isCreate) return;
                    const slug = sharedForm.getFieldValue('slug');
                    const title = form.getFieldValue('heroTitle');
                    if (!slug?.trim() && title?.trim()) {
                      sharedForm.setFieldValue('slug', textToSlug(title));
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="coverImage"
                label="封面图（各语言共用）"
                getValueFromEvent={(value: string | null) => value ?? ''}
              >
                <CoverImageField folder="brand-narratives/covers" />
              </Form.Item>
              <Form.Item
                name="gallery"
                label="轮播图"
                getValueFromEvent={(value: ProductGalleryImage[] | undefined) => value ?? []}
              >
                <ProductGalleryField folder="brand-narratives/gallery" />
              </Form.Item>
              <Form.Item
                name="videoUrl"
                label="视频"
                getValueFromEvent={(value: string | null) => value ?? ''}
              >
                <ProductVideoField folder="brand-narratives/videos" />
              </Form.Item>
              <Form.Item
                name="showCoverOnBackground"
                label="大背景图同时显示封面"
                valuePropName="checked"
                extra="开启后，详情页看板在大背景图右侧同时展示封面图"
              >
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
              <Form.Item
                name="background"
                label="大背景图（各语言共用）"
                getValueFromEvent={(v: PartnerCenterBackgroundValue | null) => v ?? { mode: '', value: '', previewUrl: '' }}
              >
                <PartnerCenterBackgroundField assetType={MEDIA_ASSET_TYPE_BRAND_NARRATIVE_BACKGROUND} />
              </Form.Item>
            </Form>
          </div>

          <div className="content-editor-shared-section">
            <BrandNarrativeBlockList
              blocks={blocks}
              onChange={(next) => {
                blocksRef.current = next;
                setBlocks(next);
              }}
              onEdit={setEditingBlock}
            />
          </div>

          <Form
            form={form}
            layout="vertical"
            preserve
            disabled={isReadOnly}
          >
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
                    onChange={(key) => setSectionTab(key as SectionTabKey)}
                    className="content-editor-section-tabs"
                    items={[
                      { key: 'hero', label: '看板' },
                      { key: 'stats', label: '数据指标' },
                      { key: 'seo-meta', label: 'SEO' },
                    ]}
                  />
                  <ContentTranslateButton
                    contentType="brandNarrative"
                    defaultLocale={defaultLocale}
                    activeLocale={activeLocale}
                    disabled={isPending || isReadOnly}
                    getDefaultSourceFields={getDefaultSourceFields}
                    hasDefaultPersisted={() => Boolean(detail && translationByLocale.has(defaultLocale))}
                    hasTargetContent={hasTargetLocaleContent}
                    onTranslated={handleTranslated}
                  />
                </div>

                <div style={{ display: sectionTab === 'hero' ? 'block' : 'none' }}>
                  <Form.Item
                    name="heroTitle"
                    label="标题"
                    rules={activeLocale === defaultLocale ? [{ required: true, message: '请输入标题' }] : []}
                  >
                    <Input
                      onBlur={() => {
                        if (!isCreate) return;
                        const title = form.getFieldValue('heroTitle');
                        const slug = sharedForm.getFieldValue('slug');
                        if (!slug?.trim() && title?.trim()) {
                          sharedForm.setFieldValue('slug', textToSlug(title));
                        }
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="heroSlogan" label="大标题">
                    <Input placeholder="选填" />
                  </Form.Item>
                  <Form.Item name="heroLead" label="描述">
                    <Input.TextArea rows={3} placeholder="选填" />
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
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          添加指标
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

                <div style={{ display: sectionTab === 'seo-meta' ? 'block' : 'none' }}>
                  <Form.Item name="seoTitle" label="SEO 标题">
                    <Input placeholder="留空则使用页面标题" />
                  </Form.Item>
                  <Form.Item name="seoDescription" label="SEO 描述">
                    <Input.TextArea rows={3} placeholder="留空则使用页面描述" />
                  </Form.Item>
                </div>

              </div>
            </div>
          </Form>
        </Space>
      </Modal>

      <BrandNarrativeBlockEditorModal
        ref={blockEditorRef}
        open={Boolean(editingBlock)}
        block={editingBlock}
        activeLanguages={activeLanguages}
        disabled={isReadOnly}
        saving={isPending}
        onChange={(next) => {
          setEditingBlock(next);
          setBlocks((current) => {
            const nextBlocks = current.map((item) => (item.id === next.id ? next : item));
            blocksRef.current = nextBlocks;
            return nextBlocks;
          });
        }}
        onSave={saveEditingBlock}
        onClose={() => setEditingBlock(null)}
      />
    </>
  );
}
