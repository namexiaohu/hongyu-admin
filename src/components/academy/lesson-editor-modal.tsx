'use client';

import { Form, Input, InputNumber, Modal, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ProductVideoField } from '@/components/products/product-video-field';
import { SolutionMaterialsField } from '@/components/solutions/solution-materials-field';
import type { AcademyLessonMaterial, AdminAcademyLessonDetail } from '@/lib/academy-lesson-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  open: boolean;
  unitId: string;
  detail: AdminAcademyLessonDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminAcademyLessonDetail) => void;
};

type LocaleDraft = { title: string; description: string };

function emptyDraft(): LocaleDraft {
  return { title: '', description: '' };
}

function buildDrafts(detail: AdminAcademyLessonDetail | null, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation
      ? { title: translation.title, description: translation.description }
      : emptyDraft();
  }
  return drafts;
}

function probeVideoDurationSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      cleanup();
      resolve(duration && duration > 0 ? duration : null);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export function LessonEditorModal({ open, unitId, detail, activeLanguages, onClose, onSaved }: Props) {
  const [sharedForm] = Form.useForm<{ videoUrl: string; durationSeconds: number; materials: AcademyLessonMaterial[] }>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();
  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const isEdit = Boolean(detail);

  const currentDraft = useMemo(() => drafts[activeLocale] ?? emptyDraft(), [drafts, activeLocale]);

  const videoUrl = Form.useWatch('videoUrl', sharedForm);

  useEffect(() => {
    if (!open) return;
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
    sharedForm.setFieldsValue({
      videoUrl: detail?.videoUrl || '',
      durationSeconds: detail?.durationSeconds ?? 0,
      materials: detail?.materials ?? [],
    });
  }, [open, detail, activeLanguages, defaultLocale, sharedForm]);

  useEffect(() => {
    if (!open || !videoUrl) return;
    let cancelled = false;
    void (async () => {
      const duration = await probeVideoDurationSeconds(resolveOssAssetUrl(videoUrl));
      if (cancelled || duration == null) return;
      const current = sharedForm.getFieldValue('durationSeconds');
      if (!current) {
        sharedForm.setFieldValue('durationSeconds', duration);
        message.success(`已自动识别时长 ${duration} 秒`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, videoUrl, sharedForm]);

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

        let lessonId = detail?.id;
        if (!lessonId) {
          const created = await fetch(`/api/admin/academy/units/${unitId}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoUrl: shared.videoUrl || '',
              durationSeconds: shared.durationSeconds ?? 0,
              materials: shared.materials ?? [],
              translation: {
                locale: defaultLocale,
                title: defaultTitle,
                description: drafts[defaultLocale]?.description ?? '',
              },
            }),
          });
          if (!created.ok) throw new Error('创建失败');
          const payload = (await created.json()) as AdminAcademyLessonDetail;
          lessonId = payload.id;
        } else {
          const patched = await fetch(`/api/admin/academy/lessons/${lessonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoUrl: shared.videoUrl || '',
              durationSeconds: shared.durationSeconds ?? 0,
              materials: shared.materials ?? [],
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
          const response = await fetch(`/api/admin/academy/lessons/${lessonId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locale: language.code,
              title: draft.title,
              description: draft.description,
            }),
          });
          if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
        }

        const detailResponse = await fetch(`/api/admin/academy/lessons/${lessonId}`);
        if (!detailResponse.ok) throw new Error('刷新失败');
        const saved = (await detailResponse.json()) as AdminAcademyLessonDetail;
        message.success(isEdit ? '课时已保存' : '课时已创建');
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
      title={isEdit ? '编辑课时' : '新建课时'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      width={760}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Form form={sharedForm} layout="vertical">
        <Form.Item label="视频" name="videoUrl" getValueFromEvent={(value: string | null) => value || ''}>
          <ProductVideoField folder="academy/lesson-videos" />
        </Form.Item>
        <Form.Item
          label="视频时长（秒）"
          name="durationSeconds"
          rules={[{ required: true, message: '请填写视频时长' }]}
          extra="上传后会尝试自动识别；识别失败时请手动填写"
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="资料"
          name="materials"
          getValueFromEvent={(value: AcademyLessonMaterial[] | undefined) => value ?? []}
          extra="支持上传 PDF / Word / Excel 等文档，前台学习页「文件」标签展示"
        >
          <SolutionMaterialsField folder="academy/lesson-materials" />
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
                    <Form.Item label="描述">
                      <Input.TextArea
                        rows={4}
                        value={currentDraft.description}
                        onChange={(event) => updateDraft({ description: event.target.value })}
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
