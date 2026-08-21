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
import { ProductBoardMultiSelect, type ProductBoardOption } from '@/components/products/product-board-multi-select';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { SolutionBlockEditorModal, type SolutionBlockEditorHandle } from '@/components/solutions/solution-block-editor-modal';
import { SolutionBlockList } from '@/components/solutions/solution-block-list';
import { SolutionMaterialsField } from '@/components/solutions/solution-materials-field';
import type { SolutionBlockDraft } from '@/lib/solution-blocks';
import {
  type AdminSolutionDetail,
  type AdminSolutionTranslation,
  type SolutionMaterial,
  type SolutionStatus,
} from '@/lib/solution-content';
import type { ProductGalleryImage } from '@/lib/product-content';
import { MEDIA_ASSET_TYPE_SOLUTION_BACKGROUND } from '@/lib/partner-center-background-presets';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'hero' | 'stats' | 'params' | 'tags' | 'seo-meta';
type PersistMode = 'save' | 'publish';

function resolveTargetStatus(
  mode: PersistMode,
  baselineStatus?: SolutionStatus,
): SolutionStatus {
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
  badgeText: string;
  seoTitle: string;
  seoDescription: string;
  stats: Array<{ label: string; value: string }>;
  productParams: Array<{ label: string; value: string }>;
  tags: Array<{ name: string }>;
};

type LocaleDraft = {
  heroTitle: string;
  heroSlogan: string;
  heroLead: string;
  badgeText: string;
  seoTitle: string;
  seoDescription: string;
  stats: Array<{ label: string; value: string }>;
  productParams: Array<{ label: string; value: string }>;
  tags: string[];
};

type SharedFormValues = {
  coverImage: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  slug: string;
  boardKeys: string[];
  materials: SolutionMaterial[];
  showCoverOnBackground: boolean;
  background: PartnerCenterBackgroundValue;
};

type SolutionEditorModalProps = {
  open: boolean;
  detail: AdminSolutionDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  boardOptions: ProductBoardOption[];
  categoryTree: AdminCategoryTreeNode[];
  onClose: () => void;
  onSaved: (detail: AdminSolutionDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return {
    heroTitle: '',
    heroSlogan: '',
    heroLead: '',
    badgeText: '',
    seoTitle: '',
    seoDescription: '',
    stats: [],
    productParams: [],
    tags: [],
  };
}

function translationToDraft(translation: AdminSolutionTranslation): LocaleDraft {
  return {
    heroTitle: translation.title,
    heroSlogan: translation.largeTitle,
    heroLead: translation.description,
    badgeText: translation.badgeText ?? '',
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    stats: (translation.stats ?? []).map((stat) => ({ label: stat.label, value: stat.value })),
    productParams: (translation.productParams ?? []).map((row) => ({ label: row.label, value: row.value })),
    tags: (translation.tags ?? []).filter((tag) => tag.trim()),
  };
}

function buildLocaleDrafts(
  detail: AdminSolutionDetail | null,
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
    badgeText: values.badgeText ?? '',
    seoTitle: values.seoTitle ?? '',
    seoDescription: values.seoDescription ?? '',
    stats: values.stats ?? [],
    productParams: values.productParams ?? [],
    tags: (values.tags ?? []).map((row) => (typeof row === 'string' ? row : row?.name ?? '')).filter(Boolean),
  };
}

function draftToFormValues(draft: LocaleDraft): LocaleFormValues {
  return {
    ...draft,
    tags: (draft.tags ?? []).map((name) => ({ name })),
  };
}

function hasSolutionDraftContent(draft: LocaleDraft): boolean {
  return Boolean(
    draft.heroTitle.trim()
    || draft.heroSlogan.trim()
    || draft.heroLead.trim()
    || draft.badgeText.trim()
    || draft.stats.some((row) => row.label?.trim() || row.value?.trim())
    || draft.productParams.some((row) => row.label?.trim() || row.value?.trim())
    || draft.tags.some((tag) => tag.trim()),
  );
}

function buildTranslationBody(draft: LocaleDraft, locale: string) {
  return {
    locale,
    title: draft.heroTitle.trim(),
    largeTitle: draft.heroSlogan.trim(),
    description: draft.heroLead.trim(),
    badgeText: draft.badgeText.trim(),
    seoTitle: draft.seoTitle.trim(),
    seoDescription: draft.seoDescription.trim(),
    stats: (draft.stats ?? [])
      .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
      .filter((row) => row.label && row.value),
    productParams: (draft.productParams ?? [])
      .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
      .filter((row) => row.label && row.value),
    tags: (draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
  };
}

function getValidateErrorTab(error: unknown): SectionTabKey | null {
  if (!error || typeof error !== 'object' || !('errorFields' in error)) return null;
  const errorFields = (error as { errorFields?: Array<{ name: Array<string | number> }> }).errorFields;
  const first = errorFields?.[0]?.name?.[0];
  if (first === 'slug') return 'hero';
  if (first === 'stats') return 'stats';
  if (first === 'productParams') return 'params';
  if (first === 'tags') return 'tags';
  if (first === 'seoTitle' || first === 'seoDescription') return 'seo-meta';
  if (first === 'heroTitle' || first === 'heroSlogan' || first === 'heroLead' || first === 'badgeText') return 'hero';
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

function normalizePairRow(row: unknown): { label: string; value: string } {
  if (!row || typeof row !== 'object') return { label: '', value: '' };
  const record = row as { label?: unknown; value?: unknown };
  return {
    label: typeof record.label === 'string' ? record.label : String(record.label ?? ''),
    value: typeof record.value === 'string' ? record.value : String(record.value ?? ''),
  };
}

function serializePairText(rows: Array<{ label: string; value: string }>): string {
  return (rows ?? [])
    .map((row) => `${row.label?.trim() ?? ''}|||${row.value?.trim() ?? ''}`)
    .filter((line) => line !== '|||')
    .join('\n');
}

function deserializePairText(text: string): Array<{ label: string; value: string }> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizePairRow).filter((row) => row.label.trim() || row.value.trim());
    }
    if (typeof parsed === 'string' && parsed.trim() && parsed.trim() !== trimmed) {
      return deserializePairText(parsed);
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

function serializeTagsText(tags: string[]): string {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean).join('\n');
}

function deserializeTagsText(text: string): string[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // 按行解析
  }
  return trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function SolutionEditorModal({
  open,
  detail,
  activeLanguages,
  boardOptions,
  categoryTree,
  onClose,
  onSaved,
}: SolutionEditorModalProps) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('hero');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [blocks, setBlocks] = useState<SolutionBlockDraft[]>([]);
  const [editingBlock, setEditingBlock] = useState<SolutionBlockDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const blocksRef = useRef<SolutionBlockDraft[]>([]);
  const blockEditorRef = useRef<SolutionBlockEditorHandle>(null);
  const isCreate = !detail;
  const isArchived = detail?.status === 'archived';
  const isPublished = detail?.status === 'published';
  const isReadOnly = isArchived;

  const translationByLocale = useMemo(() => {
    const map = new Map<string, AdminSolutionTranslation>();
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
    const stats = draft.stats.some((row) => row.label?.trim() || row.value?.trim())
      ? draft.stats
      : (saved?.stats ?? []);
    const productParams = draft.productParams.some((row) => row.label?.trim() || row.value?.trim())
      ? draft.productParams
      : (saved?.productParams ?? []);
    const tags = draft.tags.some((tag) => tag.trim()) ? draft.tags : (saved?.tags ?? []);
    return {
      heroTitle: draft.heroTitle,
      heroSlogan: draft.heroSlogan,
      heroLead: draft.heroLead,
      badgeText: draft.badgeText,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      statsText: serializePairText(stats),
      productParamsText: serializePairText(productParams),
      tagsText: serializeTagsText(tags),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return hasSolutionDraftContent(draft);
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const {
      statsText,
      stats: statsField,
      productParamsText,
      tagsText,
      ...plainFields
    } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const translatedStats = deserializePairText(statsText || statsField || '');
    nextDraft.stats = (translatedStats.length ? translatedStats : source.stats).map((row) => ({
      label: row.label ?? '',
      value: row.value ?? '',
    }));
    const translatedParams = deserializePairText(productParamsText || '');
    nextDraft.productParams = (translatedParams.length ? translatedParams : source.productParams).map((row) => ({
      label: row.label ?? '',
      value: row.value ?? '',
    }));
    const translatedTags = deserializeTagsText(tagsText || '');
    nextDraft.tags = translatedTags.length ? translatedTags : source.tags;
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue(draftToFormValues(nextDraft));
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
    form.setFieldsValue(draftToFormValues(nextDrafts[firstLocale] ?? emptyDraft()));
    sharedForm.setFieldsValue({
      coverImage: detail?.coverImage ?? '',
      gallery: detail?.gallery ?? [],
      videoUrl: detail?.videoUrl ?? '',
      slug: detail?.slug ?? '',
      boardKeys: detail?.boardKeys ?? [],
      materials: detail?.materials ?? [],
      showCoverOnBackground: detail?.showCoverOnBackground ?? true,
      background: {
        mode: detail?.backgroundMode ?? '',
        value: detail?.backgroundValue ?? '',
        previewUrl: detail?.backgroundPreviewUrl ?? '',
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const currentValues = form.getFieldsValue(true);
    const nextDrafts = { ...drafts, [activeLocale]: readLocaleDraft(currentValues) };
    setDrafts(nextDrafts);
    setActiveLocale(locale);
    form.setFieldsValue(draftToFormValues(nextDrafts[locale] ?? emptyDraft()));
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
        const boardKeys = sharedValues.boardKeys ?? [];

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
            form.setFieldsValue(draftToFormValues(mergedDrafts[defaultLocale] ?? emptyDraft()));
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
          form.setFieldsValue(draftToFormValues(defaultDraft));
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
          }) || (target.locale !== defaultLocale && hasSolutionDraftContent(target.draft)));

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
        const materials = (sharedValues.materials ?? []).filter((item) => item.url?.trim());
        const showCoverOnBackground = Boolean(sharedValues.showCoverOnBackground);
        const backgroundMode = sharedValues.background?.mode ?? '';
        const backgroundValue = sharedValues.background?.value?.trim() ?? '';
        const sharedBgPayload = { showCoverOnBackground, backgroundMode, backgroundValue, gallery, videoUrl };

        async function upsertTranslation(solutionId: string, locale: string, draft: LocaleDraft) {
          const saveDraft = draft.heroTitle.trim()
            ? draft
            : { ...draft, heroTitle: defaultDraft.heroTitle };
          const response = await fetch(`/api/admin/solutions/${solutionId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, locale)),
          });
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? '保存失败');
          }
        }

        let solutionId = detail?.id;

        if (!detail) {
          const response = await fetch('/api/admin/solutions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: resolvedSlug,
              boardKeys,
              status,
              coverImage,
              ...sharedBgPayload,
              materials,
              blocks: blocksToSave,
              translation: buildTranslationBody(defaultDraft, defaultLocale),
            }),
          });
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? '创建失败');
          }
          const created = (await response.json()) as AdminSolutionDetail;
          solutionId = created.id;
        }

        if (!solutionId) throw new Error('保存失败');

        for (const target of targets) {
          if (!detail && target.locale === defaultLocale) continue;
          await upsertTranslation(solutionId, target.locale, target.draft);
        }

        const statusResponse = await fetch(`/api/admin/solutions/${solutionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            blocks: blocksToSave,
            slug: resolvedSlug,
            coverImage,
            ...sharedBgPayload,
            boardKeys,
            materials,
          }),
        });
        if (!statusResponse.ok) {
          const errorBody = await statusResponse.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }

        const detailResponse = await fetch(`/api/admin/solutions/${solutionId}`);
        if (!detailResponse.ok) throw new Error('刷新详情失败');
        const refreshed = (await detailResponse.json()) as AdminSolutionDetail;
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

  function saveEditingBlock(next: SolutionBlockDraft) {
    const nextBlocks = blocksRef.current.map((item) => (item.id === next.id ? next : item));
    blocksRef.current = nextBlocks;
    setBlocks(nextBlocks);
    setEditingBlock(next);

    if (!detail) {
      message.success('区块已更新，请保存解决方案');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/solutions/${detail.id}`, {
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
      <span>{detail ? `编辑解决方案 · ${detail.slug}` : '新建解决方案'}</span>
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
                  placeholder="v-clamp"
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
                name="boardKeys"
                label="看板关联"
                getValueFromEvent={(value: string[]) => value ?? []}
              >
                <ProductBoardMultiSelect
                  boards={boardOptions}
                  value={sharedForm.getFieldValue('boardKeys') ?? []}
                  onChange={(value) => sharedForm.setFieldValue('boardKeys', value)}
                />
              </Form.Item>
              <Form.Item
                name="coverImage"
                label="封面图（各语言共用）"
                getValueFromEvent={(value: string | null) => value ?? ''}
              >
                <CoverImageField folder="solutions/covers" />
              </Form.Item>
              <Form.Item
                name="gallery"
                label="轮播图"
                getValueFromEvent={(value: ProductGalleryImage[] | undefined) => value ?? []}
              >
                <ProductGalleryField folder="solutions/gallery" />
              </Form.Item>
              <Form.Item
                name="videoUrl"
                label="视频"
                getValueFromEvent={(value: string | null) => value ?? ''}
              >
                <ProductVideoField folder="solutions/videos" />
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
                <PartnerCenterBackgroundField assetType={MEDIA_ASSET_TYPE_SOLUTION_BACKGROUND} />
              </Form.Item>
              <Form.Item
                name="materials"
                label="产品资料"
                getValueFromEvent={(value: SolutionMaterial[]) => value ?? []}
              >
                <SolutionMaterialsField folder="solutions/materials" />
              </Form.Item>
            </Form>
          </div>

          <div className="content-editor-shared-section">
            <SolutionBlockList
              blocks={blocks}
              onChange={(next) => {
                blocksRef.current = next;
                setBlocks(next);
              }}
              onEdit={setEditingBlock}
            />
          </div>

          <Form form={form} layout="vertical" preserve disabled={isReadOnly}>
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
                      { key: 'params', label: '产品参数' },
                      { key: 'tags', label: '标签' },
                      { key: 'seo-meta', label: 'SEO' },
                    ]}
                  />
                  <ContentTranslateButton
                    contentType="solution"
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
                  <Form.Item name="badgeText" label="角标文案">
                    <Input placeholder="如 Flagship Product" />
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

                <div style={{ display: sectionTab === 'params' ? 'block' : 'none' }}>
                  <Form.List name="productParams">
                    {(fields, { add, remove }) => (
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Form.Item name={[field.name, 'label']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="参数" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="规格" />
                            </Form.Item>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          添加参数
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

                <div style={{ display: sectionTab === 'tags' ? 'block' : 'none' }}>
                  <Form.List name="tags">
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

      <SolutionBlockEditorModal
        ref={blockEditorRef}
        open={Boolean(editingBlock)}
        block={editingBlock}
        activeLanguages={activeLanguages}
        categoryTree={categoryTree}
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
