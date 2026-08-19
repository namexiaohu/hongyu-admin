'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Space, Tabs, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  type AdminPartnerCenterDetail,
  type AdminPartnerCenterTranslation,
  type CenterRegion,
  centerRegionLabels,
  centerRegions,
} from '@/lib/partner-center-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'detail' | 'tags';

type LocaleDraft = {
  name: string;
  description: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  website: string;
  tags: string[];
};

type LocaleFormValues = {
  name: string;
  description: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  website: string;
  tags: Array<{ name: string }>;
};

type SharedFormValues = {
  slug: string;
  region: CenterRegion;
  coverImage: string;
  logo: string;
};

type Props = {
  open: boolean;
  detail: AdminPartnerCenterDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminPartnerCenterDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return { name: '', description: '', location: '', badgeText: '', address: '', businessHours: '', contact: '', website: '', tags: [] };
}

function translationToDraft(t: AdminPartnerCenterTranslation): LocaleDraft {
  return { name: t.name, description: t.description, location: t.location, badgeText: t.badgeText, address: t.address, businessHours: t.businessHours, contact: t.contact, website: t.website, tags: (t.tags ?? []).filter(Boolean) };
}

function buildDrafts(detail: AdminPartnerCenterDetail | null, languages: AdminSiteLanguageRow[]): Record<string, LocaleDraft> {
  const d: Record<string, LocaleDraft> = {};
  for (const l of languages) {
    const t = detail?.translations.find((i) => i.locale === l.code);
    d[l.code] = t ? translationToDraft(t) : emptyDraft();
  }
  return d;
}

function draftToForm(d: LocaleDraft): LocaleFormValues {
  return { ...d, tags: d.tags.map((n) => ({ name: n })) };
}

function readDraft(v: LocaleFormValues): LocaleDraft {
  return { name: v.name ?? '', description: v.description ?? '', location: v.location ?? '', badgeText: v.badgeText ?? '', address: v.address ?? '', businessHours: v.businessHours ?? '', contact: v.contact ?? '', website: v.website ?? '', tags: (v.tags ?? []).map((r) => (typeof r === 'string' ? r : r?.name ?? '')).filter(Boolean) };
}

function hasDraftContent(d: LocaleDraft): boolean {
  return Boolean(d.name.trim() || d.description.trim() || d.location.trim());
}

function buildTranslationBody(d: LocaleDraft, locale: string) {
  return { locale, name: d.name.trim(), description: d.description.trim(), location: d.location.trim(), badgeText: d.badgeText.trim(), address: d.address.trim(), businessHours: d.businessHours.trim(), contact: d.contact.trim(), website: d.website.trim(), tags: d.tags.map((t) => t.trim()).filter(Boolean) };
}

const regionOptions = centerRegions.map((v) => ({ value: v, label: centerRegionLabels[v] }));

export function PartnerCenterEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();
  const isCreate = !detail;
  const defaultLocale = activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: readDraft(form.getFieldsValue(true)) };
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    const next = buildDrafts(detail, activeLanguages);
    setActiveLocale(first);
    setSectionTab('content');
    setDrafts(next);
    form.setFieldsValue(draftToForm(next[first] ?? emptyDraft()));
    sharedForm.setFieldsValue({ slug: detail?.slug ?? '', region: detail?.region ?? 'asia-pacific', coverImage: detail?.coverImage ?? '', logo: detail?.logo ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const next = { ...drafts, [activeLocale]: readDraft(form.getFieldsValue(true)) };
    setDrafts(next);
    setActiveLocale(locale);
    form.setFieldsValue(draftToForm(next[locale] ?? emptyDraft()));
  }

  function save() {
    startTransition(async () => {
      try {
        await form.validateFields();
        const shared = sharedForm.getFieldsValue(true) as SharedFormValues;
        const merged = getMergedDrafts();
        setDrafts(merged);
        const defaultDraft = merged[defaultLocale] ?? emptyDraft();

        if (!defaultDraft.name.trim()) {
          setActiveLocale(defaultLocale);
          form.setFieldsValue(draftToForm(defaultDraft));
          setSectionTab('content');
          message.error('请输入名称');
          return;
        }

        let resolvedSlug = detail?.slug ?? '';
        if (isCreate) {
          const check = validateSourceThenAutoSlug({ locale: defaultLocale || activeLocale, sourceText: defaultDraft.name.trim(), slug: shared.slug ?? '', emptySourceMessage: '请输入名称', section: 'content' });
          if (!check.ok) { message.error(check.message); return; }
          resolvedSlug = check.autoSlug ?? resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
          if (check.autoSlug) sharedForm.setFieldsValue({ slug: resolvedSlug });
        } else {
          resolvedSlug = resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
        }
        if (!resolvedSlug) { message.error('请填写 Slug'); return; }

        const targets = activeLanguages
          .map((l) => ({ locale: l.code, draft: merged[l.code] ?? emptyDraft() }))
          .filter((t) => shouldPersistLocaleDraft({ locale: t.locale, defaultLocale, primaryText: t.draft.name }) || (t.locale !== defaultLocale && hasDraftContent(t.draft)));

        let centerId = detail?.id;

        if (!detail) {
          const r = await fetch('/api/admin/partner-centers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: resolvedSlug, region: shared.region, coverImage: shared.coverImage?.trim() ?? '', logo: shared.logo?.trim() ?? '', translation: buildTranslationBody(defaultDraft, defaultLocale) }),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '创建失败'); }
          const created = (await r.json()) as AdminPartnerCenterDetail;
          centerId = created.id;
        }

        if (!centerId) throw new Error('保存失败');

        for (const t of targets) {
          if (!detail && t.locale === defaultLocale) continue;
          const saveDraft = t.draft.name.trim() ? t.draft : { ...t.draft, name: defaultDraft.name };
          const r = await fetch(`/api/admin/partner-centers/${centerId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, t.locale)),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存翻译失败'); }
        }

        if (detail) {
          const r = await fetch(`/api/admin/partner-centers/${centerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: resolvedSlug, region: shared.region, coverImage: shared.coverImage?.trim() ?? '', logo: shared.logo?.trim() ?? '' }),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存失败'); }
        }

        const dr = await fetch(`/api/admin/partner-centers/${centerId}`);
        if (!dr.ok) throw new Error('刷新详情失败');
        const refreshed = (await dr.json()) as AdminPartnerCenterDetail;
        onSaved(refreshed);
        message.success('保存成功');
      } catch (error) {
        if (error && typeof error === 'object' && 'errorFields' in error) return;
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const modalTitle = detail ? `编辑合作中心 · ${detail.slug}` : '新建合作中心';

  return (
    <Modal open={open} title={modalTitle} width={960} onCancel={onClose} footer={null} className="content-editor-modal" rootClassName="content-editor-modal-wrap" style={{ top: 48 }} styles={{ body: { overflow: 'visible', minWidth: 0 } }} destroyOnHidden>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" loading={isPending} onClick={save}>保存</Button>
        </div>

        <div className="content-editor-shared-section">
          <Form form={sharedForm} layout="vertical">
            <Form.Item name="slug" label="Slug（各语言共用）" extra="留空将根据名称自动生成">
              <Input placeholder="beijing-companion-animal-hospital" onBlur={() => {
                if (!isCreate) return;
                const slug = sharedForm.getFieldValue('slug');
                const name = form.getFieldValue('name');
                if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
              }} />
            </Form.Item>
            <Form.Item name="region" label="所在地区" rules={[{ required: true, message: '请选择地区' }]}>
              <Select options={regionOptions} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="coverImage" label="封面图（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
              <CoverImageField folder="partner-centers/covers" />
            </Form.Item>
            <Form.Item name="logo" label="Logo（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
              <CoverImageField folder="partner-centers/logos" />
            </Form.Item>
          </Form>
        </div>

        <Form form={form} layout="vertical" preserve>
          <div className="content-editor-layout">
            <div className="content-editor-locale-nav">
              {activeLanguages.map((l) => (
                <ContentEditorLocaleTab key={l.code} language={l} isActive={l.code === activeLocale} persisted={detail?.translations.some((t) => t.locale === l.code) ?? false} onClick={() => switchLocale(l.code)} />
              ))}
            </div>
            <div className="content-editor-main">
              <Tabs activeKey={sectionTab} onChange={(k) => setSectionTab(k as SectionTabKey)} className="content-editor-section-tabs" items={[{ key: 'content', label: '内容' }, { key: 'detail', label: '详情' }, { key: 'tags', label: '标签' }]} />

              <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
                <Form.Item name="name" label="名称" rules={activeLocale === defaultLocale ? [{ required: true, message: '请输入名称' }] : []}>
                  <Input onBlur={() => {
                    if (!isCreate) return;
                    const name = form.getFieldValue('name');
                    const slug = sharedForm.getFieldValue('slug');
                    if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
                  }} />
                </Form.Item>
                <Form.Item name="badgeText" label="角标文案"><Input placeholder="如：临床合作 / Clinical Partner" /></Form.Item>
                <Form.Item name="location" label="地理位置"><Input placeholder="如：中国 · 北京" /></Form.Item>
                <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
              </div>

              <div style={{ display: sectionTab === 'detail' ? 'block' : 'none' }}>
                <Form.Item name="address" label="地址"><Input /></Form.Item>
                <Form.Item name="businessHours" label="营业时间"><Input placeholder="如：周一至周五 09:00–18:00" /></Form.Item>
                <Form.Item name="contact" label="联系方式"><Input placeholder="电话或邮箱" /></Form.Item>
                <Form.Item name="website" label="网址"><Input placeholder="https://" /></Form.Item>
              </div>

              <div style={{ display: sectionTab === 'tags' ? 'block' : 'none' }}>
                <Form.List name="tags">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}><Input placeholder="标签名" /></Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add({ name: '' })} icon={<PlusOutlined />}>添加标签</Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            </div>
          </div>
        </Form>
      </Space>
    </Modal>
  );
}
