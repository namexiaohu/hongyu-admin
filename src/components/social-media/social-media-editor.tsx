'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { deserializeFeaturedPosts, serializeFeaturedPosts } from '@/lib/content-translate-serialize';
import { centerRegionLabels, centerRegions } from '@/lib/partner-center-content';
import {
  type AdminSocialMediaProfile,
  type FeaturedPost,
  type OverseasContact,
  type SocialChannel,
  socialPlatformLabels,
  socialPlatformTypes,
  translationHasContent,
} from '@/lib/social-media';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SharedFormValues = {
  socialChannels: SocialChannel[];
  overseasContacts: OverseasContact[];
};

type LocaleDraft = {
  featuredPosts: FeaturedPost[];
};

function emptyDraft(): LocaleDraft {
  return { featuredPosts: [] };
}

function translationToDraft(translation?: AdminSocialMediaProfile['translations'][number]): LocaleDraft {
  if (!translation) return emptyDraft();
  return {
    featuredPosts: translation.featuredPosts.length ? translation.featuredPosts : [],
  };
}

function readLocaleForm(values: Partial<LocaleDraft>): LocaleDraft {
  return { featuredPosts: values.featuredPosts ?? [] };
}

const platformOptions = socialPlatformTypes.map((type) => ({
  value: type,
  label: socialPlatformLabels[type],
}));

const regionOptions = centerRegions.map((region) => ({
  value: region,
  label: centerRegionLabels[region],
}));

type SocialMediaEditorProps = {
  initialProfile: AdminSocialMediaProfile;
  activeLanguages: AdminSiteLanguageRow[];
};

export function SocialMediaEditor({ initialProfile, activeLanguages }: SocialMediaEditorProps) {
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [form] = Form.useForm<LocaleDraft>();
  const [profile, setProfile] = useState(initialProfile);
  const [activeLocale, setActiveLocale] = useState(activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  const translationByLocale = useMemo(() => {
    const map = new Map<string, AdminSocialMediaProfile['translations'][number]>();
    profile.translations.forEach((translation) => map.set(translation.locale, translation));
    return map;
  }, [profile]);

  useEffect(() => {
    sharedForm.setFieldsValue({
      socialChannels: profile.socialChannels,
      overseasContacts: profile.overseasContacts,
    });
    const nextDrafts: Record<string, LocaleDraft> = {};
    activeLanguages.forEach((language) => {
      nextDrafts[language.code] = translationToDraft(translationByLocale.get(language.code));
    });
    setDrafts(nextDrafts);
    const locale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
    setActiveLocale(locale);
    form.setFieldsValue(nextDrafts[locale] ?? emptyDraft());
  }, [profile, activeLanguages, form, sharedForm, translationByLocale]);

  function mergeActiveFormIntoDrafts(current: Record<string, LocaleDraft>, locale: string) {
    return { ...current, [locale]: readLocaleForm(form.getFieldsValue()) };
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    const saved = translationByLocale.get(defaultLocale);
    const posts = draft.featuredPosts.some((post) => post.title?.trim() || post.badgeText?.trim() || post.description?.trim())
      ? draft.featuredPosts
      : (saved?.featuredPosts ?? []);
    return {
      featuredPostsText: serializeFeaturedPosts(posts),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return translationHasContent(draft);
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const sourcePosts = merged[defaultLocale]?.featuredPosts
      ?? translationByLocale.get(defaultLocale)?.featuredPosts
      ?? [];
    const translatedPosts = deserializeFeaturedPosts(fields.featuredPostsText ?? '', sourcePosts);
    const nextDraft = {
      ...current,
      featuredPosts: translatedPosts,
    };
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
            primaryText: item.featuredPosts[0]?.title ?? '',
          }) || (item.locale !== defaultLocale && translationHasContent(item)));

        const response = await fetch('/api/admin/social-media', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialChannels: shared.socialChannels ?? [],
            overseasContacts: shared.overseasContacts ?? [],
            translations,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }
        const updated = (await response.json()) as AdminSocialMediaProfile;
        setProfile(updated);
        setStatusMessage('保存成功');
        message.success('社交媒体已保存');
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
        title="社交媒体"
        description="维护海外社媒账号、区域联系方式与精选内容，前台 /media 将直接展示。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={handleSave}
      />

      <div className="content-editor-shared-section">
        <Form form={sharedForm} layout="vertical">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>各大社媒</div>
          <Form.List name="socialChannels">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" size="middle" style={{ width: '100%', marginBottom: 24 }}>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      padding: 16,
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>社媒账号</strong>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    </div>
                    <Form.Item name={[field.name, 'type']} label="社媒类型">
                      <Select options={platformOptions} placeholder="选择平台" allowClear style={{ maxWidth: 280 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'name']} label="名称">
                      <Input placeholder="@hongyu-medical" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'url']} label="链接">
                      <Input placeholder="https://" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'qrCode']}
                      label="二维码"
                      getValueFromEvent={(value: string | null) => value ?? ''}
                    >
                      <CoverImageField folder="social-media/qr" />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加社媒
                </Button>
              </Space>
            )}
          </Form.List>

          <div style={{ fontWeight: 600, marginBottom: 12 }}>海外联系方式</div>
          <Form.List name="overseasContacts">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      padding: 16,
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>联系条目</strong>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    </div>
                    <Form.Item name={[field.name, 'region']} label="所属地区">
                      <Select options={regionOptions} placeholder="选择地区" allowClear style={{ maxWidth: 280 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'location']} label="地理位置">
                      <Input placeholder="Europe · Munich Office" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'phone']} label="联系方式">
                      <Input placeholder="+49 89 XXXX XXXX" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'contactPerson']} label="联系人">
                      <Input placeholder="姓名" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'email']} label="电子邮箱">
                      <Input placeholder="europe@hongyuvet.com" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'address']} label="详细地址">
                      <Input.TextArea rows={2} placeholder="详细地址" />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加联系方式
                </Button>
              </Space>
            )}
          </Form.List>
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
                activeKey="featured"
                className="content-editor-section-tabs"
                items={[{ key: 'featured', label: '社媒精选内容' }]}
              />
              <ContentTranslateButton
                contentType="socialMedia"
                defaultLocale={defaultLocale}
                activeLocale={activeLocale}
                disabled={isPending}
                getDefaultSourceFields={getDefaultSourceFields}
                hasDefaultPersisted={() => translationByLocale.has(defaultLocale)}
                hasTargetContent={hasTargetLocaleContent}
                onTranslated={handleTranslated}
              />
            </div>

            <Form.List name="featuredPosts">
              {(fields, { add, remove }) => (
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      style={{
                        padding: 16,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>精选内容</strong>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                          删除
                        </Button>
                      </div>
                      <Form.Item
                        name={[field.name, 'coverImage']}
                        label="封面图"
                        getValueFromEvent={(value: string | null) => value ?? ''}
                      >
                        <CoverImageField folder="social-media/featured" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'badgeText']} label="角标文案">
                        <Input placeholder="LinkedIn" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'title']} label="标题">
                        <Input placeholder="标题" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'description']} label="描述">
                        <Input.TextArea rows={2} placeholder="描述" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'url']} label="内容链接">
                        <Input placeholder="https://" />
                      </Form.Item>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    添加精选内容
                  </Button>
                </Space>
              )}
            </Form.List>
          </div>
        </div>
      </Form>
    </Space>
  );
}
