'use client';

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, message } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import type {
  AcademyQuestionContent,
  AcademyQuestionType,
  AdminAcademyQuestionDetail,
} from '@/lib/academy-question-content';
import { academyQuestionTypeLabels, academyQuestionTypeValues } from '@/lib/academy-question-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  bankId: string;
  initialDetail: AdminAcademyQuestionDetail;
  activeLanguages: AdminSiteLanguageRow[];
};

type LocaleDraft = {
  questionType: AcademyQuestionType;
  score: number;
  content: AcademyQuestionContent;
};

function defaultContent(type: AcademyQuestionType): AcademyQuestionContent {
  switch (type) {
    case 'single_choice':
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndex: 0 };
    case 'multiple_choice':
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndexes: [0] };
    case 'true_false':
      return { prompt: '', correctAnswer: true };
    case 'fill_blank':
      return { promptBefore: '', promptAfter: '', correctAnswer: '' };
    default:
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndex: 0 };
  }
}

function buildDrafts(detail: AdminAcademyQuestionDetail, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail.translations.find((item) => item.locale === language.code);
    drafts[language.code] = {
      questionType: detail.questionType,
      score: detail.score,
      content: translation?.content ?? defaultContent(detail.questionType),
    };
  }
  return drafts;
}

function summarizePrompt(content: AcademyQuestionContent, type: AcademyQuestionType) {
  if (type === 'fill_blank') {
    const c = content as { promptBefore: string; promptAfter: string };
    return `${c.promptBefore}___${c.promptAfter}`;
  }
  return (content as { prompt: string }).prompt ?? '';
}

export function QuestionEditorClient({ bankId, initialDetail, activeLanguages }: Props) {
  const [detail, setDetail] = useState(initialDetail);
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const currentDraft = useMemo(() => drafts[activeLocale] ?? {
    questionType: detail.questionType,
    score: detail.score,
    content: defaultContent(detail.questionType),
  }, [drafts, activeLocale, detail.questionType, detail.score]);

  useEffect(() => {
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
  }, [detail, activeLanguages, defaultLocale]);

  function updateDraft(patch: Partial<LocaleDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] ?? currentDraft), ...patch },
    }));
  }

  function updateContent(patch: Partial<AcademyQuestionContent>) {
    updateDraft({ content: { ...currentDraft.content, ...patch } as AcademyQuestionContent });
  }

  function changeQuestionType(type: AcademyQuestionType) {
    updateDraft({ questionType: type, content: defaultContent(type) });
  }

  async function saveAll() {
    const promptText = summarizePrompt(currentDraft.content, currentDraft.questionType).trim();
    if (activeLocale === defaultLocale && !promptText) {
      message.error('请填写默认语言题目内容');
      return;
    }

    const patchResponse = await fetch(`/api/admin/academy/questions/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionType: currentDraft.questionType,
        score: currentDraft.score,
      }),
    });
    if (!patchResponse.ok) throw new Error('保存题目设置失败');

    for (const language of activeLanguages) {
      const draft = drafts[language.code] ?? currentDraft;
      const primaryText = summarizePrompt(draft.content, draft.questionType);
      if (!shouldPersistLocaleDraft({ locale: language.code, defaultLocale, primaryText })) continue;
      const response = await fetch(`/api/admin/academy/questions/${detail.id}/translations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: language.code, content: draft.content }),
      });
      if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
    }

    const detailResponse = await fetch(`/api/admin/academy/questions/${detail.id}`);
    if (!detailResponse.ok) throw new Error('刷新失败');
    const saved = (await detailResponse.json()) as AdminAcademyQuestionDetail;
    setDetail(saved);
    message.success('题目已保存');
  }

  function renderContentFields() {
    const type = currentDraft.questionType;
    const content = currentDraft.content;

    if (type === 'single_choice' || type === 'multiple_choice') {
      const c = content as { prompt: string; options: string[]; correctAnswerIndex?: number; correctAnswerIndexes?: number[] };
      return (
        <>
          <Form.Item label="题目" required={activeLocale === defaultLocale}>
            <Input.TextArea rows={3} value={c.prompt} onChange={(e) => updateContent({ prompt: e.target.value })} />
          </Form.Item>
          <Form.Item label="选项">
            <Space direction="vertical" style={{ width: '100%' }}>
              {c.options.map((option, index) => (
                <Space key={index} style={{ width: '100%' }}>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const next = [...c.options];
                      next[index] = e.target.value;
                      updateContent({ options: next });
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    disabled={c.options.length <= 2}
                    onClick={() => updateContent({ options: c.options.filter((_, i) => i !== index) })}
                  />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => updateContent({ options: [...c.options, `Option ${String.fromCharCode(65 + c.options.length)}`] })}>
                添加选项
              </Button>
            </Space>
          </Form.Item>
          <Form.Item label="正确答案">
            {type === 'single_choice' ? (
              <Select
                value={c.correctAnswerIndex ?? 0}
                onChange={(value) => updateContent({ correctAnswerIndex: value })}
                options={c.options.map((option, index) => ({ value: index, label: option || `选项 ${index + 1}` }))}
                style={{ width: '100%' }}
              />
            ) : (
              <Select
                mode="multiple"
                value={c.correctAnswerIndexes ?? []}
                onChange={(value) => updateContent({ correctAnswerIndexes: value })}
                options={c.options.map((option, index) => ({ value: index, label: option || `选项 ${index + 1}` }))}
                style={{ width: '100%' }}
              />
            )}
          </Form.Item>
        </>
      );
    }

    if (type === 'true_false') {
      const c = content as { prompt: string; correctAnswer: boolean };
      return (
        <>
          <Form.Item label="题目" required={activeLocale === defaultLocale}>
            <Input.TextArea rows={3} value={c.prompt} onChange={(e) => updateContent({ prompt: e.target.value })} />
          </Form.Item>
          <Form.Item label="正确答案">
            <Select
              value={c.correctAnswer}
              onChange={(value) => updateContent({ correctAnswer: value })}
              options={[
                { value: true, label: '正确' },
                { value: false, label: '错误' },
              ]}
              style={{ width: 200 }}
            />
          </Form.Item>
        </>
      );
    }

    const c = content as { promptBefore: string; promptAfter: string; correctAnswer: string };
    return (
      <>
        <Form.Item label="填空前" required={activeLocale === defaultLocale}>
          <Input value={c.promptBefore} onChange={(e) => updateContent({ promptBefore: e.target.value })} />
        </Form.Item>
        <Form.Item label="填空后">
          <Input value={c.promptAfter} onChange={(e) => updateContent({ promptAfter: e.target.value })} />
        </Form.Item>
        <Form.Item label="正确答案" required={activeLocale === defaultLocale}>
          <Input value={c.correctAnswer} onChange={(e) => updateContent({ correctAnswer: e.target.value })} />
        </Form.Item>
      </>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>编辑题目</Typography.Title>
        <Space>
          <Link href={`/admin/academy/question-banks/${bankId}`}>返回题库</Link>
          <Button type="primary" loading={isPending} onClick={() => startTransition(() => void saveAll().catch((e) => message.error(e instanceof Error ? e.message : '保存失败')))}>
            保存
          </Button>
        </Space>
      </div>

      <Card title="通用设置">
        <Space wrap size="large">
          <Form.Item label="题型" style={{ marginBottom: 0 }}>
            <Select
              value={currentDraft.questionType}
              onChange={changeQuestionType}
              options={academyQuestionTypeValues.map((value) => ({ value, label: academyQuestionTypeLabels[value] }))}
              style={{ width: 160 }}
            />
          </Form.Item>
          <Form.Item label="分数" style={{ marginBottom: 0 }}>
            <InputNumber min={1} value={currentDraft.score} onChange={(value) => updateDraft({ score: value ?? 1 })} />
          </Form.Item>
        </Space>
      </Card>

      <Card title="多语言内容">
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={activeLocale === language.code}
                persisted={Boolean(detail.translations.find((item) => item.locale === language.code))}
                onClick={() => setActiveLocale(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <Form layout="vertical">{renderContentFields()}</Form>
          </div>
        </div>
      </Card>
    </Space>
  );
}
