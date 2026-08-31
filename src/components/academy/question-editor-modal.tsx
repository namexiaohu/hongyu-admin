'use client';

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Tabs, message } from 'antd';
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
  open: boolean;
  bankId: string;
  detail: AdminAcademyQuestionDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminAcademyQuestionDetail) => void;
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

function buildDrafts(detail: AdminAcademyQuestionDetail | null, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  const questionType = detail?.questionType ?? 'single_choice';
  const score = detail?.score ?? 1;
  for (const language of languages) {
    const translation = detail?.translations.find((item) => item.locale === language.code);
    drafts[language.code] = {
      questionType,
      score,
      content: translation?.content ?? defaultContent(questionType),
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

export function QuestionEditorModal({ open, bankId, detail, activeLanguages, onClose, onSaved }: Props) {
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const isEdit = Boolean(detail);
  const currentDraft = useMemo(() => drafts[activeLocale] ?? {
    questionType: detail?.questionType ?? 'single_choice',
    score: detail?.score ?? 1,
    content: defaultContent(detail?.questionType ?? 'single_choice'),
  }, [drafts, activeLocale, detail?.questionType, detail?.score]);

  useEffect(() => {
    if (!open) return;
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
  }, [open, detail, activeLanguages, defaultLocale]);

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
    setDrafts((current) => {
      const next: Record<string, LocaleDraft> = {};
      for (const language of activeLanguages) {
        const existing = current[language.code] ?? currentDraft;
        next[language.code] = {
          questionType: type,
          score: existing.score,
          content: defaultContent(type),
        };
      }
      return next;
    });
  }

  function handleOk() {
    startTransition(async () => {
      try {
        const defaultDraft = drafts[defaultLocale] ?? currentDraft;
        const promptText = summarizePrompt(defaultDraft.content, defaultDraft.questionType).trim();
        if (!promptText) {
          message.error('请填写默认语言题目内容');
          return;
        }

        let questionId = detail?.id;
        if (!questionId) {
          const createResponse = await fetch(`/api/admin/academy/question-banks/${bankId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionType: defaultDraft.questionType,
              score: defaultDraft.score,
              translation: {
                locale: defaultLocale,
                content: defaultDraft.content,
              },
            }),
          });
          if (!createResponse.ok) throw new Error('创建失败');
          const created = (await createResponse.json()) as AdminAcademyQuestionDetail;
          questionId = created.id;
        } else {
          const patchResponse = await fetch(`/api/admin/academy/questions/${questionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionType: currentDraft.questionType,
              score: currentDraft.score,
            }),
          });
          if (!patchResponse.ok) throw new Error('保存题目设置失败');
        }

        for (const language of activeLanguages) {
          const draft = drafts[language.code] ?? currentDraft;
          const primaryText = summarizePrompt(draft.content, draft.questionType);
          if (!shouldPersistLocaleDraft({ locale: language.code, defaultLocale, primaryText })) continue;
          const response = await fetch(`/api/admin/academy/questions/${questionId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: language.code, content: draft.content }),
          });
          if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
        }

        const detailResponse = await fetch(`/api/admin/academy/questions/${questionId}`);
        if (!detailResponse.ok) throw new Error('刷新失败');
        const saved = (await detailResponse.json()) as AdminAcademyQuestionDetail;
        message.success(isEdit ? '题目已保存' : '题目已创建');
        onSaved(saved);
        onClose();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
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
    <Modal
      open={open}
      title={isEdit ? '编辑题目' : '新建题目'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      width={800}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Space wrap size="large" style={{ marginBottom: 16 }}>
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

      <div className="content-editor-layout">
        <div className="content-editor-locale-nav">
          {activeLanguages.map((language) => (
            <ContentEditorLocaleTab
              key={language.code}
              language={language}
              isActive={activeLocale === language.code}
              persisted={Boolean(detail?.translations.find((item) => item.locale === language.code))}
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
                children: <Form layout="vertical">{renderContentFields()}</Form>,
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
