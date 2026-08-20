'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { HomepageMediaSlidesField } from '@/components/homepage/homepage-media-slides-field';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import {
  type AdminHomepageConfig,
  type HomepageEducationItem,
  type HomepageMediaSlide,
  type HomepageStatItem,
  homepageTranslationHasContent,
} from '@/lib/homepage-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'banner' | 'solutions' | 'about' | 'stats' | 'global' | 'education';

type SharedFormValues = {
  bannerSlides: HomepageMediaSlide[];
  aboutSlides: HomepageMediaSlide[];
};

type LocaleDraft = {
  bannerTitle: string;
  bannerSubtitle: string;
  bannerDescription: string;
  solutionsTitle: string;
  solutionsDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  stats: HomepageStatItem[];
  globalTitle: string;
  globalDescription: string;
  educationTitle: string;
  educationDescription: string;
  educationItems: HomepageEducationItem[];
};

function emptyDraft(): LocaleDraft {
  return {
    bannerTitle: '',
    bannerSubtitle: '',
    bannerDescription: '',
    solutionsTitle: '',
    solutionsDescription: '',
    aboutTitle: '',
    aboutDescription: '',
    stats: [],
    globalTitle: '',
    globalDescription: '',
    educationTitle: '',
    educationDescription: '',
    educationItems: [],
  };
}

function translationToDraft(translation?: AdminHomepageConfig['translations'][number]): LocaleDraft {
  if (!translation) return emptyDraft();
  return {
    bannerTitle: translation.bannerTitle,
    bannerSubtitle: translation.bannerSubtitle,
    bannerDescription: translation.bannerDescription,
    solutionsTitle: translation.solutionsTitle,
    solutionsDescription: translation.solutionsDescription,
    aboutTitle: translation.aboutTitle,
    aboutDescription: translation.aboutDescription,
    stats: translation.stats.length ? translation.stats : [],
    globalTitle: translation.globalTitle,
    globalDescription: translation.globalDescription,
    educationTitle: translation.educationTitle,
    educationDescription: translation.educationDescription,
    educationItems: translation.educationItems.length ? translation.educationItems : [],
  };
}

function readLocaleForm(values: Partial<LocaleDraft>): LocaleDraft {
  return {
    bannerTitle: values.bannerTitle ?? '',
    bannerSubtitle: values.bannerSubtitle ?? '',
    bannerDescription: values.bannerDescription ?? '',
    solutionsTitle: values.solutionsTitle ?? '',
    solutionsDescription: values.solutionsDescription ?? '',
    aboutTitle: values.aboutTitle ?? '',
    aboutDescription: values.aboutDescription ?? '',
    stats: values.stats ?? [],
    globalTitle: values.globalTitle ?? '',
    globalDescription: values.globalDescription ?? '',
    educationTitle: values.educationTitle ?? '',
    educationDescription: values.educationDescription ?? '',
    educationItems: values.educationItems ?? [],
  };
}

function serializeStats(rows: HomepageStatItem[]) {
  return rows
    .map((row) => [row.title, row.subtitle, row.description].join('|||'))
    .join('\n');
}

function deserializeStats(text: string): HomepageStatItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = '', subtitle = '', description = ''] = line.split('|||');
      return { title, subtitle, description };
    });
}

function serializeEducation(rows: HomepageEducationItem[]) {
  return rows
    .map((row) => [row.title, row.description, row.badgeText, row.extraText].join('|||'))
    .join('\n');
}

function deserializeEducation(text: string, source: HomepageEducationItem[]): HomepageEducationItem[] {
  if (!text.trim()) {
    return source.map((item) => ({
      title: item.title ?? '',
      description: item.description ?? '',
      badgeText: item.badgeText ?? '',
      extraText: item.extraText ?? '',
      href: item.href ?? '',
      coverImage: item.coverImage ?? '',
    }));
  }
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line, index) => {
    const [title = '', description = '', badgeText = '', extraText = ''] = line.split('|||');
    const prev = source[index];
    return {
      title,
      description,
      badgeText,
      extraText,
      href: prev?.href ?? '',
      coverImage: prev?.coverImage ?? '',
    };
  });
}

type HomepageConfigEditorProps = {
  initialConfig: AdminHomepageConfig;
  activeLanguages: AdminSiteLanguageRow[];
};

export function HomepageConfigEditor({ initialConfig, activeLanguages }: HomepageConfigEditorProps) {
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [form] = Form.useForm<LocaleDraft>();
  const [config, setConfig] = useState(initialConfig);
  const [activeLocale, setActiveLocale] = useState(
    activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '',
  );
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('banner');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  const translationByLocale = useMemo(() => {
    const map = new Map<string, AdminHomepageConfig['translations'][number]>();
    config.translations.forEach((translation) => map.set(translation.locale, translation));
    return map;
  }, [config]);

  useEffect(() => {
    sharedForm.setFieldsValue({
      bannerSlides: config.bannerSlides,
      aboutSlides: config.aboutSlides,
    });
    const nextDrafts: Record<string, LocaleDraft> = {};
    activeLanguages.forEach((language) => {
      nextDrafts[language.code] = translationToDraft(translationByLocale.get(language.code));
    });
    setDrafts(nextDrafts);
    const locale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
    setActiveLocale(locale);
    form.setFieldsValue(nextDrafts[locale] ?? emptyDraft());
  }, [config, activeLanguages, form, sharedForm, translationByLocale]);

  function mergeActiveFormIntoDrafts(current: Record<string, LocaleDraft>, locale: string) {
    return { ...current, [locale]: readLocaleForm(form.getFieldsValue()) };
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return {
      bannerTitle: draft.bannerTitle,
      bannerSubtitle: draft.bannerSubtitle,
      bannerDescription: draft.bannerDescription,
      solutionsTitle: draft.solutionsTitle,
      solutionsDescription: draft.solutionsDescription,
      aboutTitle: draft.aboutTitle,
      aboutDescription: draft.aboutDescription,
      globalTitle: draft.globalTitle,
      globalDescription: draft.globalDescription,
      educationTitle: draft.educationTitle,
      educationDescription: draft.educationDescription,
      statsText: serializeStats(draft.stats),
      educationText: serializeEducation(draft.educationItems),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return homepageTranslationHasContent(draft);
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const { statsText, educationText, ...plainFields } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const stats = deserializeStats(statsText ?? '');
    nextDraft.stats = stats.length ? stats : source.stats;
    nextDraft.educationItems = deserializeEducation(educationText ?? '', source.educationItems);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue(nextDraft);
  }

  function switchLocale(nextLocale: string) {
    if (nextLocale === activeLocale) return;
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    form.setFieldsValue(merged[nextLocale] ?? emptyDraft());
  }

  function handleSave() {
    startTransition(async () => {
      setStatusMessage(null);
      try {
        const shared = await sharedForm.validateFields();
        const merged = mergeActiveFormIntoDrafts(drafts, activeLocale);
        setDrafts(merged);

        const translations = activeLanguages
          .map((language) => ({
            locale: language.code,
            ...(merged[language.code] ?? emptyDraft()),
          }))
          .filter((item) => shouldPersistLocaleDraft({
            locale: item.locale,
            defaultLocale,
            primaryText: item.bannerTitle || item.solutionsTitle || item.aboutTitle,
          }) || (item.locale !== defaultLocale && homepageTranslationHasContent(item)));

        const response = await fetch('/api/admin/homepage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bannerSlides: shared.bannerSlides ?? [],
            aboutSlides: shared.aboutSlides ?? [],
            translations,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }
        const updated = (await response.json()) as AdminHomepageConfig;
        setConfig(updated);
        setStatusMessage('保存成功');
        message.success('首页配置已保存');
      } catch (error) {
        const text = error instanceof Error ? error.message : '保存失败';
        setStatusMessage(`保存失败：${text}`);
        message.error(text);
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="首页配置"
        description="维护首页轮播媒体与多语言文案，保存后前台首页将直接使用。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={handleSave}
      />

      <div className="content-editor-shared-section">
        <Form form={sharedForm} layout="vertical">
          <Form.Item
            name="bannerSlides"
            label="Banner 轮播"
            getValueFromEvent={(value: HomepageMediaSlide[]) => value ?? []}
          >
            <HomepageMediaSlidesField folder="homepage/banner" />
          </Form.Item>
          <Form.Item
            name="aboutSlides"
            label="企业介绍轮播"
            getValueFromEvent={(value: HomepageMediaSlide[]) => value ?? []}
          >
            <HomepageMediaSlidesField folder="homepage/about" />
          </Form.Item>
        </Form>
      </div>

      <Form form={form} layout="vertical" preserve>
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
                  { key: 'banner', label: 'Banner' },
                  { key: 'solutions', label: '解决方案' },
                  { key: 'about', label: '企业介绍' },
                  { key: 'stats', label: '核心数据' },
                  { key: 'global', label: '全球布局' },
                  { key: 'education', label: '持续教育' },
                ]}
              />
              <ContentTranslateButton
                contentType="homepageConfig"
                defaultLocale={defaultLocale}
                activeLocale={activeLocale}
                disabled={isPending}
                getDefaultSourceFields={getDefaultSourceFields}
                hasDefaultPersisted={() => translationByLocale.has(defaultLocale)}
                hasTargetContent={hasTargetLocaleContent}
                onTranslated={handleTranslated}
              />
            </div>

            <div style={{ display: sectionTab === 'banner' ? 'block' : 'none' }}>
              <Form.Item name="bannerTitle" label="标题">
                <Input.TextArea rows={2} placeholder="支持换行，前台按行拆分标题" />
              </Form.Item>
              <Form.Item name="bannerSubtitle" label="副标题">
                <Input />
              </Form.Item>
              <Form.Item name="bannerDescription" label="描述">
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'solutions' ? 'block' : 'none' }}>
              <Form.Item name="solutionsTitle" label="标题">
                <Input />
              </Form.Item>
              <Form.Item name="solutionsDescription" label="描述">
                <Input.TextArea rows={3} />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'about' ? 'block' : 'none' }}>
              <Form.Item name="aboutTitle" label="标题">
                <Input.TextArea rows={2} placeholder="支持换行" />
              </Form.Item>
              <Form.Item name="aboutDescription" label="描述">
                <Input.TextArea rows={5} placeholder="多段可用换行分隔" />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'stats' ? 'block' : 'none' }}>
              <Form.List name="stats">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <Space orientation="vertical" style={{ width: '100%' }} size="small">
                          <Form.Item {...field} name={[field.name, 'title']} label="标题">
                            <Input placeholder="如 12" />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'subtitle']} label="副标题">
                            <Input placeholder="如 年 / % / +" />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'description']} label="描述">
                            <Input.TextArea rows={2} />
                          </Form.Item>
                          <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                            删除
                          </Button>
                        </Space>
                      </div>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ title: '', subtitle: '', description: '' })}>
                      添加指标
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>

            <div style={{ display: sectionTab === 'global' ? 'block' : 'none' }}>
              <Form.Item name="globalTitle" label="标题">
                <Input />
              </Form.Item>
              <Form.Item name="globalDescription" label="描述">
                <Input.TextArea rows={3} />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'education' ? 'block' : 'none' }}>
              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 12 }}>内容组</div>
                <Form.Item name="educationTitle" label="标题">
                  <Input placeholder="Empowering Professional Growth for Veterinarians" />
                </Form.Item>
                <Form.Item name="educationDescription" label="描述">
                  <Input.TextArea
                    rows={3}
                    placeholder="From online courses to hands-on practical training, we build a full-cycle continuing education system."
                  />
                </Form.Item>
              </div>

              <div style={{ fontWeight: 600, marginBottom: 12 }}>资讯组</div>
              <Form.List name="educationItems">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <Space orientation="vertical" style={{ width: '100%' }} size="small">
                          <Form.Item {...field} name={[field.name, 'badgeText']} label="角标文案">
                            <Input placeholder="如 录播课程" />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'title']} label="标题">
                            <Input />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'description']} label="描述">
                            <Input.TextArea rows={2} />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'extraText']} label="附加文案">
                            <Input placeholder="Self-paced · 12 modules · Completion certificate" />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'href']} label="链接地址">
                            <Input placeholder="/course" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'coverImage']}
                            label="封面图"
                            getValueFromEvent={(value: string | null) => value ?? ''}
                          >
                            <CoverImageField folder="homepage/education" />
                          </Form.Item>
                          <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                            删除
                          </Button>
                        </Space>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add({
                        title: '',
                        description: '',
                        badgeText: '',
                        extraText: '',
                        href: '',
                        coverImage: '',
                      })}
                    >
                      添加课程条目
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>
          </div>
        </div>
      </Form>
    </Space>
  );
}
