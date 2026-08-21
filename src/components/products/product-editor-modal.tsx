'use client';

import { Button, Col, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Tabs, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { AdminDateTimePicker } from '@/components/admin/admin-datetime-picker';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { ProductAttachmentsField } from '@/components/products/product-attachments-field';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductGeneralConfigPanel } from '@/components/products/product-general-config-panel';
import { ProductVideoField } from '@/components/products/product-video-field';
import type { ProductBoardOption } from '@/components/products/product-board-multi-select';
import { productLifecycleOptions } from '@/lib/admin-display';
import { confirmProductListingChange } from '@/lib/confirm-product-listing';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import { buildCategoryFlatIndex } from '@/lib/category-picker';
import { getCommonCurrencyGroupedSelectOptions, getDefaultCurrencyForLanguage } from '@/lib/currencies';
import {
  buildSnapshotFromConfig,
  convertProductPrices,
  type ExchangeRateSnapshot,
} from '@/lib/currency-exchange';
import {
  type AdminProductListItem,
  type AdminProductPayload,
  type AdminProductTranslation,
  type ProductPurchaseMode,
  type ProductStat,
  type ProductStatus,
  resolveProductId,
} from '@/lib/product-content';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { runDefaultLocaleSaveGate } from '@/lib/admin-default-locale-save';
import { textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'stats' | 'pricing' | 'attachments' | 'seo';

type LocaleFormValues = {
  name: string;
  badgeText: string;
  extraText: string;
  shortDescription: string;
  description: string;
  coverUrl: string;
  coverAlt: string;
  videoUrl: string;
  gallery: AdminProductPayload['gallery'];
  stats: ProductStat[];
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  stockQuantity: number;
  moq: number;
  lifecycleStatus: string;
  eolDate: Dayjs | null;
  lastTimeBuyDate: Dayjs | null;
  leadTimeMin: number;
  leadTimeMax: number;
  leadTimeUnit: string;
  efficiencyClass: string;
  certificationsText: string;
  attachments: AdminProductPayload['attachments'];
  slug: string;
  tagsText: string;
  seoTitle: string;
  seoDescription: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type ProductEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  categoryTree: AdminCategoryTreeNode[];
  editingEntry: AdminProductListItem | null;
  onClose: () => void;
  onSaved: (entry: AdminProductTranslation) => void;
};

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function normalizeStatRow(row: unknown): ProductStat {
  const record = row as { label?: unknown; value?: unknown };
  return {
    label: typeof record.label === 'string' ? record.label : String(record.label ?? ''),
    value: typeof record.value === 'string' ? record.value : String(record.value ?? ''),
  };
}

function serializeStatsText(stats: ProductStat[]): string {
  return (stats ?? [])
    .map((row) => `${row.label?.trim() ?? ''}|||${row.value?.trim() ?? ''}`)
    .filter((line) => line !== '|||')
    .join('\n');
}

function deserializeStatsText(text: string): ProductStat[] {
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
    // fall through to line parse
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => {
      const [label, ...rest] = line.split('|||');
      return {
        label: (label ?? '').trim(),
        value: rest.join('|||').trim(),
      };
    })
    .filter((row) => row.label || row.value);
}

function createEmptyDraft(currencyCode = 'USD'): LocaleDraft {
  return {
    name: '',
    badgeText: '',
    extraText: '',
    shortDescription: '',
    description: '',
    coverUrl: '',
    coverAlt: '',
    videoUrl: '',
    gallery: [],
    stats: [],
    price: 0,
    compareAtPrice: null,
    currencyCode,
    stockQuantity: 0,
    moq: 1,
    lifecycleStatus: 'active',
    eolDate: null,
    lastTimeBuyDate: null,
    leadTimeMin: 3,
    leadTimeMax: 15,
    leadTimeUnit: 'business_days',
    efficiencyClass: '',
    certificationsText: '',
    attachments: [],
    slug: '',
    tagsText: '',
    seoTitle: '',
    seoDescription: '',
    persisted: false,
  };
}

function entryToDraft(entry: AdminProductTranslation): LocaleDraft {
  return {
    entryId: entry.id,
    name: entry.name,
    badgeText: entry.badgeText ?? '',
    extraText: entry.extraText ?? '',
    shortDescription: entry.shortDescription ?? '',
    description: entry.description ?? '',
    coverUrl: entry.payload.coverUrl ?? '',
    coverAlt: entry.payload.coverAlt ?? '',
    videoUrl: entry.payload.videoUrl ?? '',
    gallery: entry.payload.gallery ?? [],
    stats: (entry.stats ?? []).map((stat) => ({ label: stat.label, value: stat.value })),
    price: Number(entry.price) || 0,
    compareAtPrice: entry.compareAtPrice == null ? null : Number(entry.compareAtPrice),
    currencyCode: entry.currencyCode,
    stockQuantity: entry.stockQuantity,
    moq: entry.moq,
    lifecycleStatus: entry.lifecycleStatus,
    eolDate: entry.eolDate ? dayjs(entry.eolDate) : null,
    lastTimeBuyDate: entry.lastTimeBuyDate ? dayjs(entry.lastTimeBuyDate) : null,
    leadTimeMin: entry.leadTimeMin,
    leadTimeMax: entry.leadTimeMax,
    leadTimeUnit: entry.leadTimeUnit,
    efficiencyClass: entry.efficiencyClass ?? '',
    certificationsText: (entry.payload.certifications ?? []).join('\n'),
    attachments: entry.payload.attachments ?? [],
    slug: entry.slug,
    tagsText: (entry.payload.tags ?? []).join('\n'),
    seoTitle: entry.seoTitle ?? '',
    seoDescription: entry.seoDescription ?? '',
    persisted: true,
  };
}

function mergeActiveFormIntoDrafts(
  drafts: Record<string, LocaleDraft>,
  activeLocale: string,
  form: FormInstance<LocaleFormValues>,
): Record<string, LocaleDraft> {
  if (!activeLocale) return drafts;
  const previous = drafts[activeLocale] ?? createEmptyDraft();
  const values = form.getFieldsValue(true);
  return {
    ...drafts,
    [activeLocale]: {
      ...previous,
      ...values,
      description: hasMeaningfulHtmlBody(values.description ?? '')
        ? values.description
        : previous.description,
      coverUrl: values.coverUrl?.trim() ? values.coverUrl : previous.coverUrl,
      coverAlt: values.coverAlt?.trim() ? values.coverAlt : previous.coverAlt,
      videoUrl: values.videoUrl?.trim() ? values.videoUrl : previous.videoUrl,
      gallery: values.gallery?.length ? values.gallery : previous.gallery,
      attachments: values.attachments?.length ? values.attachments : previous.attachments,
    },
  };
}

function inheritDefaultLocaleMedia(draft: LocaleDraft, defaultDraft: LocaleDraft | undefined): LocaleDraft {
  if (!defaultDraft) return draft;
  return {
    ...draft,
    coverUrl: draft.coverUrl.trim() ? draft.coverUrl : defaultDraft.coverUrl,
    coverAlt: draft.coverAlt.trim() ? draft.coverAlt : defaultDraft.coverAlt,
    videoUrl: draft.videoUrl.trim() ? draft.videoUrl : defaultDraft.videoUrl,
    gallery: draft.gallery.length ? draft.gallery : defaultDraft.gallery,
    attachments: draft.attachments.length ? draft.attachments : defaultDraft.attachments,
  };
}

function generateRandomSpu() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SPU-${stamp}-${rand}`;
}

function buildPayload(draft: LocaleDraft): AdminProductPayload {
  return {
    coverUrl: draft.coverUrl.trim() || null,
    coverAlt: draft.coverAlt.trim() || null,
    videoUrl: draft.videoUrl.trim() || null,
    gallery: draft.gallery ?? [],
    tags: splitMultiline(draft.tagsText),
    attachments: draft.attachments ?? [],
    certifications: splitMultiline(draft.certificationsText),
  };
}

export function ProductEditorModal({
  open,
  activeLanguages,
  categoryTree,
  editingEntry,
  onClose,
  onSaved,
}: ProductEditorModalProps) {
  const [productId, setProductId] = useState<string | undefined>();
  const [spu, setSpu] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);
  const [featuredSortOrder, setFeaturedSortOrder] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<ProductPurchaseMode>('buy');
  const [paidSampleEnabled, setPaidSampleEnabled] = useState(false);
  const [status, setStatus] = useState<ProductStatus>('active');
  const [boardKeys, setBoardKeys] = useState<string[]>([]);
  const [boardOptions, setBoardOptions] = useState<ProductBoardOption[]>([]);
  const [activeLocale, setActiveLocale] = useState('');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [exchangeSnapshot, setExchangeSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<LocaleFormValues>();
  const activeLocaleRef = useRef(activeLocale);

  useEffect(() => {
    activeLocaleRef.current = activeLocale;
  }, [activeLocale]);

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingEntry);
  const currencyOptions = useMemo(() => getCommonCurrencyGroupedSelectOptions(), []);
  const defaultCategoryId = categoryIds[0] ?? null;

  function resolveCurrencyForLocale(locale: string) {
    const language = activeLanguages.find((item) => item.code === locale);
    return language?.currencyCode ?? getDefaultCurrencyForLanguage(locale);
  }

  function makeEmptyDraft(locale: string) {
    return createEmptyDraft(resolveCurrencyForLocale(locale));
  }

  useEffect(() => {
    if (!open) return;
    void fetch('/api/admin/exchange-rates')
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (config) {
          setExchangeSnapshot(buildSnapshotFromConfig(config));
        }
      })
      .catch(() => setExchangeSnapshot(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/admin/products/boards')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        const dashboard = payload as { coverage?: Array<{ key: string; title: string; enabled: boolean }> };
        setBoardOptions(
          (dashboard.coverage ?? [])
            .filter((board) => board.enabled)
            .map((board) => ({ key: board.key, title: board.title })),
        );
      })
      .catch(() => setBoardOptions([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!activeLanguages.length) {
      setProductId(undefined);
      setActiveLocale('');
      setDrafts({});
      form.resetFields();
      return;
    }

    const nextDefaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
    setActiveLocale(nextDefaultLocale);
    setSectionTab('content');

    if (!editingEntry) {
      setProductId(undefined);
      setSpu(generateRandomSpu());
      setBrandId(null);
      const categoryNodes = buildCategoryFlatIndex(categoryTree);
      setCategoryIds(categoryNodes.length === 1 && categoryNodes[0] ? [categoryNodes[0].id] : []);
      setFeatured(false);
      setFeaturedSortOrder(0);
      setPurchaseMode('buy');
      setPaidSampleEnabled(false);
      setStatus('active');
      setBoardKeys([]);
      const emptyDrafts = Object.fromEntries(
        activeLanguages.map((language) => [language.code, makeEmptyDraft(language.code)]),
      );
      setDrafts(emptyDrafts);
      form.setFieldsValue(makeEmptyDraft(nextDefaultLocale));
      setEditorRevision((value) => value + 1);

      let cancelled = false;
      void fetch('/api/admin/brands/picker?page=1&page_size=2')
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { items?: Array<{ id: string }>; meta?: { total?: number } } | null) => {
          if (cancelled) return;
          if (payload?.meta?.total === 1 && payload.items?.[0]?.id) {
            setBrandId(payload.items[0].id);
          }
        })
        .catch(() => undefined);

      return () => {
        cancelled = true;
      };
    }

    setProductId(editingEntry.id);
    setSpu(editingEntry.spu);
    setBrandId(editingEntry.brandId);
    setCategoryIds(
      editingEntry.categoryIds?.length
        ? editingEntry.categoryIds
        : editingEntry.defaultCategoryId
          ? [editingEntry.defaultCategoryId]
          : [],
    );
    setFeatured(editingEntry.featured);
    setPaidSampleEnabled(editingEntry.paidSampleEnabled);
    setPurchaseMode(editingEntry.purchaseMode);
    setStatus(editingEntry.status);
    setBoardKeys(editingEntry.boardKeys ?? []);
    setLoadingGroup(true);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/products/${editingEntry.id}`);
        if (!response.ok) throw new Error('load failed');
        const payload = (await response.json()) as {
          item: AdminProductListItem;
          translations: AdminProductTranslation[];
        };

        const firstTranslation = payload.translations[0];
        if (firstTranslation) {
          setFeaturedSortOrder(firstTranslation.featuredSortOrder);
        }

        setCategoryIds(
          payload.item.categoryIds?.length
            ? payload.item.categoryIds
            : payload.item.defaultCategoryId
              ? [payload.item.defaultCategoryId]
              : [],
        );
        setBrandId(payload.item.brandId);
        setBoardKeys(payload.item.boardKeys ?? []);

        const nextDrafts = Object.fromEntries(
          activeLanguages.map((language) => {
            const translation = payload.translations.find((item) => item.locale === language.code);
            return [language.code, translation ? entryToDraft(translation) : makeEmptyDraft(language.code)];
          }),
        );
        setDrafts(nextDrafts);
        loadDraft(activeLocaleRef.current, nextDrafts);
        setEditorRevision((value) => value + 1);
      } catch {
        void messageApi.error('加载产品详情失败');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingEntry, activeLanguages, categoryTree, form, messageApi]);

  function loadDraft(locale: string, source: Record<string, LocaleDraft>) {
    let draft = source[locale] ?? makeEmptyDraft(locale);
    if (!draft.persisted && !draft.name.trim()) {
      draft = { ...draft, currencyCode: resolveCurrencyForLocale(locale) };
    }
    form.setFieldsValue(draft);
    setEditorRevision((value) => value + 1);
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    loadDraft(nextLocale, merged);
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale, form);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? createEmptyDraft();
    const stats = draft.stats.some((row) => row.label?.trim() || row.value?.trim())
      ? draft.stats
      : [];
    return {
      name: draft.name,
      badgeText: draft.badgeText,
      extraText: draft.extraText,
      shortDescription: draft.shortDescription,
      description: draft.description,
      coverUrl: draft.coverUrl,
      coverAlt: draft.coverAlt,
      videoUrl: draft.videoUrl,
      galleryJson: JSON.stringify(draft.gallery ?? []),
      attachmentsJson: JSON.stringify(draft.attachments ?? []),
      certificationsText: draft.certificationsText,
      tagsText: draft.tagsText,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      statsText: serializeStatsText(stats),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? createEmptyDraft();
    return Boolean(
      draft.name.trim()
      || draft.badgeText.trim()
      || draft.extraText.trim()
      || draft.shortDescription.trim()
      || hasMeaningfulHtmlBody(draft.description)
      || draft.coverAlt.trim()
      || draft.certificationsText.trim()
      || draft.tagsText.trim()
      || draft.seoTitle.trim()
      || draft.seoDescription.trim()
      || draft.stats.some((row) => row.label?.trim() || row.value?.trim()),
    );
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? makeEmptyDraft(activeLocale);
    const { galleryJson, attachmentsJson, coverUrl, videoUrl, statsText, stats: statsField, ...textFields } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, textFields);
    const defaultDraft = merged[defaultLocale] ?? makeEmptyDraft(defaultLocale);
    const targetCurrency = resolveCurrencyForLocale(activeLocale);
    const sourceStats = defaultDraft.stats ?? [];
    const translatedStats = deserializeStatsText(statsText || statsField || '');
    nextDraft.stats = (translatedStats.length ? translatedStats : sourceStats).map((row) => ({
      label: row.label,
      value: row.value,
    }));

    if (coverUrl?.trim()) {
      nextDraft.coverUrl = coverUrl;
    } else if (defaultDraft.coverUrl.trim()) {
      nextDraft.coverUrl = defaultDraft.coverUrl;
    }

    if (videoUrl?.trim()) {
      nextDraft.videoUrl = videoUrl;
    } else if (defaultDraft.videoUrl.trim()) {
      nextDraft.videoUrl = defaultDraft.videoUrl;
    }

    try {
      const gallery = galleryJson ? JSON.parse(galleryJson) as LocaleDraft['gallery'] : null;
      if (Array.isArray(gallery) && gallery.length) nextDraft.gallery = gallery;
      else if (defaultDraft.gallery.length) nextDraft.gallery = defaultDraft.gallery;
    } catch {
      if (defaultDraft.gallery.length) nextDraft.gallery = defaultDraft.gallery;
    }

    try {
      const attachments = attachmentsJson ? JSON.parse(attachmentsJson) as LocaleDraft['attachments'] : null;
      if (Array.isArray(attachments) && attachments.length) nextDraft.attachments = attachments;
      else if (defaultDraft.attachments.length) nextDraft.attachments = defaultDraft.attachments;
    } catch {
      if (defaultDraft.attachments.length) nextDraft.attachments = defaultDraft.attachments;
    }

    if (exchangeSnapshot) {
      const converted = convertProductPrices({
        price: defaultDraft.price,
        compareAtPrice: defaultDraft.compareAtPrice,
        fromCurrency: defaultDraft.currencyCode,
        toCurrency: targetCurrency,
        snapshot: exchangeSnapshot,
      });
      if (converted.missingRate) {
        void messageApi.warning(`未配置 ${converted.missingRate} 汇率，价格未换算`);
      } else {
        if (converted.price != null) nextDraft.price = converted.price;
        if (converted.compareAtPrice != null) nextDraft.compareAtPrice = converted.compareAtPrice;
        nextDraft.currencyCode = converted.currencyCode;
      }
    }

    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue({
      name: nextDraft.name,
      badgeText: nextDraft.badgeText,
      extraText: nextDraft.extraText,
      shortDescription: nextDraft.shortDescription,
      description: nextDraft.description,
      slug: nextDraft.slug,
      coverUrl: nextDraft.coverUrl,
      coverAlt: nextDraft.coverAlt,
      videoUrl: nextDraft.videoUrl,
      gallery: nextDraft.gallery,
      attachments: nextDraft.attachments,
      certificationsText: nextDraft.certificationsText,
      tagsText: nextDraft.tagsText,
      seoTitle: nextDraft.seoTitle,
      seoDescription: nextDraft.seoDescription,
      stats: nextDraft.stats,
      price: nextDraft.price,
      compareAtPrice: nextDraft.compareAtPrice,
      currencyCode: nextDraft.currencyCode,
    });
    setEditorRevision((value) => value + 1);
  }

  function validateDraft(locale: string, draft: LocaleDraft) {
    if (!spu.trim()) return { ok: false as const, locale, message: '请填写 SPU', section: 'content' as const };
    if (!categoryIds.length) return { ok: false as const, locale, message: '请选择至少一个分类', section: 'content' as const };
    if (!brandId) return { ok: false as const, locale, message: '请选择品牌', section: 'content' as const };
    if (draft.leadTimeMin > draft.leadTimeMax) {
      return { ok: false as const, locale, message: '最短交期不能大于最长交期', section: 'content' as const };
    }
    return validateSourceThenAutoSlug({
      locale,
      sourceText: draft.name,
      slug: draft.slug,
      emptySourceMessage: '请填写产品名称',
      section: 'content',
    });
  }

  function buildTranslationPayload(draft: LocaleDraft, locale: string) {
    return {
      productId,
      locale,
      spu: spu.trim(),
      brandId,
      defaultCategoryId,
      categoryIds,
      purchaseMode,
      paidSampleEnabled,
      featured,
      featuredSortOrder,
      status,
      name: draft.name.trim(),
      badgeText: draft.badgeText.trim(),
      extraText: draft.extraText.trim(),
      stats: (draft.stats ?? [])
        .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
        .filter((row) => row.label || row.value),
      slug: draft.slug.trim(),
      shortDescription: draft.shortDescription.trim() || null,
      description: draft.description.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      price: draft.price,
      compareAtPrice: draft.compareAtPrice,
      currencyCode: draft.currencyCode,
      stockQuantity: draft.stockQuantity,
      moq: draft.moq,
      leadTimeMin: draft.leadTimeMin,
      leadTimeMax: draft.leadTimeMax,
      leadTimeUnit: draft.leadTimeUnit,
      lifecycleStatus: draft.lifecycleStatus,
      eolDate: draft.eolDate ? draft.eolDate.toISOString() : null,
      lastTimeBuyDate: draft.lastTimeBuyDate ? draft.lastTimeBuyDate.toISOString() : null,
      efficiencyClass: draft.efficiencyClass.trim() || null,
      payload: buildPayload(draft),
    };
  }

  function persistAllLocales() {
    if (!hasLanguages) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
      return;
    }

    const mergedDrafts = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    const gate = runDefaultLocaleSaveGate({
      defaultLocale,
      mergedDrafts,
      createEmptyDraft,
      validateDraft,
    });
    if (!gate.ok) {
      setDrafts(mergedDrafts);
      setActiveLocale(gate.validation.locale || defaultLocale);
      setSectionTab(gate.validation.section === 'seo' ? 'seo' : 'content');
      loadDraft(gate.validation.locale || defaultLocale, mergedDrafts);
      void messageApi.error(gate.validation.message);
      return;
    }
    const workingDrafts = gate.mergedDrafts;
    if (workingDrafts[defaultLocale]?.slug) {
      form.setFieldValue('slug', workingDrafts[defaultLocale].slug);
    }

    const defaultDraft = workingDrafts[defaultLocale];
    const targets = activeLanguages
      .map((language) => {
        const draft = workingDrafts[language.code] ?? createEmptyDraft();
        return {
          locale: language.code,
          draft: inheritDefaultLocaleMedia(draft, defaultDraft),
        };
      })
      .filter((target) => shouldPersistLocaleDraft({
        locale: target.locale,
        defaultLocale,
        primaryText: target.draft.name,
      }));

    if (!targets.length) {
      void messageApi.warning('请至少填写一个语言版本的内容');
      return;
    }

    for (const target of targets) {
      const validation = validateDraft(target.locale, target.draft);
      if (!validation.ok) {
        setDrafts(workingDrafts);
        setActiveLocale(validation.locale);
        setSectionTab(validation.section === 'seo' ? 'seo' : 'content');
        loadDraft(validation.locale, workingDrafts);
        const language = activeLanguages.find((item) => item.code === validation.locale);
        void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
        return;
      }
      if (validation.autoSlug) {
        target.draft.slug = validation.autoSlug;
        workingDrafts[target.locale] = { ...workingDrafts[target.locale], slug: validation.autoSlug };
      }
    }

    setDrafts(workingDrafts);
    if (workingDrafts[activeLocale]?.slug) {
      form.setFieldValue('slug', workingDrafts[activeLocale].slug);
    }

    startTransition(async () => {
      let nextProductId = productId;
      const nextDrafts = { ...workingDrafts };
      const savedEntries: AdminProductTranslation[] = [];
      const shared = {
        spu: spu.trim(),
        brandId,
        defaultCategoryId,
        categoryIds,
        featured,
        featuredSortOrder,
        purchaseMode,
        paidSampleEnabled,
        status,
        boardKeys,
      };

      if (nextProductId) {
        const patchResponse = await fetch(`/api/admin/products/${nextProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          const payload = await patchResponse.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? '产品基础信息保存失败');
          return;
        }
      }

      for (const { locale, draft } of targets) {
        const response = await fetch(
          draft.entryId
            ? `/api/admin/products/translations/${draft.entryId}`
            : '/api/admin/products',
          {
            method: draft.entryId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationPayload(draft, locale)),
          },
        );

        if (!response.ok) {
          const language = activeLanguages.find((item) => item.code === locale);
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? `${language?.nativeName ?? locale} 保存失败`);
          if (savedEntries.length > 0) {
            for (const saved of savedEntries) onSaved(saved);
          }
          return;
        }

        const saved = (await response.json()) as AdminProductTranslation;
        nextProductId = resolveProductId(saved);
        nextDrafts[locale] = { ...draft, entryId: saved.id, persisted: true };
        savedEntries.push(saved);
      }

      if (nextProductId && !productId) {
        const patchResponse = await fetch(`/api/admin/products/${nextProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shared),
        });
        if (!patchResponse.ok) {
          const payload = await patchResponse.json().catch(() => null) as { message?: string } | null;
          void messageApi.error(payload?.message ?? '产品基础信息保存失败');
          return;
        }
      }

      setDrafts(nextDrafts);
      setProductId(nextProductId);
      loadDraft(activeLocale, nextDrafts);
      for (const saved of savedEntries) onSaved(saved);
      void messageApi.success('保存成功');
      onClose();
    });
  }

  const sharedFieldsPanel = (
    <ProductGeneralConfigPanel
      spu={spu}
      onSpuChange={setSpu}
      categoryTree={categoryTree}
      categoryIds={categoryIds}
      onCategoryIdsChange={setCategoryIds}
      brandId={brandId}
      onBrandIdChange={setBrandId}
      boardOptions={boardOptions}
      boardKeys={boardKeys}
      onBoardKeysChange={setBoardKeys}
      status={status}
      onStatusChange={(nextStatus) => {
        if (nextStatus === status) return;
        confirmProductListingChange(nextStatus, () => setStatus(nextStatus));
      }}
    />
  );

  return (
    <>
      {contextHolder}
      <Modal
        title={isEditing ? `编辑产品 · ${editingEntry?.name ?? ''}` : '新建产品'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1180}
        destroyOnHidden
        confirmLoading={isPending || loadingGroup}
        className="content-editor-modal product-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
      >
        {!hasLanguages ? (
          <Empty description="尚未配置站点语言，请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages"><Button type="primary">前往多语言管理</Button></Link>
          </Empty>
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" loading={isPending} onClick={() => persistAllLocales()}>
                {isEditing ? '保存' : '保存产品'}
              </Button>
            </div>
            {sharedFieldsPanel}
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((language) => (
                  <ContentEditorLocaleTab
                    key={language.code}
                    language={language}
                    isActive={language.code === activeLocale}
                    persisted={drafts[language.code]?.persisted}
                    onClick={() => handleLocaleChange(language.code)}
                  />
                ))}
              </div>
              <div className="content-editor-main">
                <Form<LocaleFormValues> form={form} layout="vertical" preserve>
                  <Tabs
                    activeKey={sectionTab}
                    onChange={(key) => setSectionTab(key as SectionTabKey)}
                    tabBarExtraContent={(
                      <ContentTranslateButton
                        contentType="product"
                        defaultLocale={defaultLocale}
                        activeLocale={activeLocale}
                        disabled={loadingGroup}
                        getDefaultSourceFields={getDefaultSourceFields}
                        hasDefaultPersisted={() => Boolean(getMergedDrafts()[defaultLocale]?.persisted)}
                        hasTargetContent={hasTargetLocaleContent}
                        onTranslated={handleTranslated}
                      />
                    )}
                    items={[
                      {
                        key: 'content',
                        label: '内容',
                        children: (
                          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Form.Item label="产品名称" name="name" rules={[{ required: true, message: '请填写产品名称' }]}>
                              <Input placeholder="产品名称" onBlur={() => {
                                const name = form.getFieldValue('name');
                                const slug = form.getFieldValue('slug');
                                if (!slug?.trim() && name?.trim()) {
                                  form.setFieldValue('slug', textToSlug(name));
                                }
                              }} />
                            </Form.Item>
                            <Form.Item label="角标文案" name="badgeText">
                              <Input placeholder="非必填，如：热销 / New" maxLength={120} />
                            </Form.Item>
                            <Form.Item label="附加文案" name="extraText">
                              <Input placeholder="非必填" maxLength={255} />
                            </Form.Item>
                            <Form.Item label="简短描述" name="shortDescription"><Input.TextArea rows={3} /></Form.Item>
                            <Form.Item label="详细描述" name="description">
                              <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
                            </Form.Item>
                            <Form.Item
                              label="封面图"
                              name="coverUrl"
                              getValueFromEvent={(value: string | null) => value ?? ''}
                            >
                              <CoverImageField folder="products/covers" />
                            </Form.Item>
                            <Form.Item label="轮播图" name="gallery"><ProductGalleryField /></Form.Item>
                            <Form.Item
                              label="产品视频"
                              name="videoUrl"
                              getValueFromEvent={(value: string | null) => value ?? ''}
                            >
                              <ProductVideoField folder="products/videos" />
                            </Form.Item>
                          </Space>
                        ),
                      },
                      {
                        key: 'stats',
                        label: '数据指标',
                        children: (
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
                        ),
                      },
                      {
                        key: 'pricing',
                        label: '价格与库存',
                        children: (
                          <Row gutter={16}>
                            <Col xs={24} md={8}><Form.Item label="销售价" name="price"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="原价" name="compareAtPrice"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="币种" name="currencyCode"><Select options={currencyOptions} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="默认库存" name="stockQuantity"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="最小起订量 (MOQ)" name="moq"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col xs={24} md={8}><Form.Item label="生命周期" name="lifecycleStatus"><Select options={productLifecycleOptions} /></Form.Item></Col>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.lifecycleStatus !== cur.lifecycleStatus}>
                              {({ getFieldValue }) => {
                                const status = getFieldValue('lifecycleStatus');
                                if (status === 'eol' || status === 'last_time_buy') {
                                  return (
                                    <Col xs={24} md={8}>
                                      <Form.Item label="EOL 日期" name="eolDate">
                                        <AdminDateTimePicker mode="date" />
                                      </Form.Item>
                                    </Col>
                                  );
                                }
                                return null;
                              }}
                            </Form.Item>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.lifecycleStatus !== cur.lifecycleStatus}>
                              {({ getFieldValue }) => {
                                const status = getFieldValue('lifecycleStatus');
                                if (status === 'last_time_buy') {
                                  return (
                                    <Col xs={24} md={8}>
                                      <Form.Item label="最后采购日期" name="lastTimeBuyDate">
                                        <AdminDateTimePicker mode="date" />
                                      </Form.Item>
                                    </Col>
                                  );
                                }
                                return null;
                              }}
                            </Form.Item>
                          </Row>
                        ),
                      },
                      {
                        key: 'attachments',
                        label: '资料附件',
                        children: <Form.Item name="attachments"><ProductAttachmentsField /></Form.Item>,
                      },
                      {
                        key: 'seo',
                        label: 'SEO',
                        children: (
                          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请填写 Slug' }]} extra="留空将根据产品名称自动生成；同一语言下的产品 slug 不可重复"><Input /></Form.Item>
                            <Form.Item label="标签" name="tagsText" extra="每行一个标签"><Input.TextArea rows={3} /></Form.Item>
                            <Form.Item label="SEO 标题" name="seoTitle"><Input /></Form.Item>
                            <Form.Item label="SEO 描述" name="seoDescription"><Input.TextArea rows={3} /></Form.Item>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Form>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
