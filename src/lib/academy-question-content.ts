import { z } from 'zod';

export const academyQuestionTypeValues = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
] as const;

export type AcademyQuestionType = (typeof academyQuestionTypeValues)[number];

export type SingleChoiceContent = {
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
};

export type MultipleChoiceContent = {
  prompt: string;
  options: string[];
  correctAnswerIndexes: number[];
};

export type TrueFalseContent = {
  prompt: string;
  correctAnswer: boolean;
};

export type FillBlankContent = {
  promptBefore: string;
  promptAfter: string;
  correctAnswer: string;
};

export type AcademyQuestionContent =
  | SingleChoiceContent
  | MultipleChoiceContent
  | TrueFalseContent
  | FillBlankContent;

export type ExamUserAnswer = number | number[] | boolean | string;

const optionSchema = z.string().max(2000);

export const singleChoiceContentSchema = z.object({
  prompt: z.string().max(10000),
  options: z.array(optionSchema).min(2),
  correctAnswerIndex: z.number().int().min(0),
});

export const multipleChoiceContentSchema = z.object({
  prompt: z.string().max(10000),
  options: z.array(optionSchema).min(2),
  correctAnswerIndexes: z.array(z.number().int().min(0)).min(1),
});

export const trueFalseContentSchema = z.object({
  prompt: z.string().max(10000),
  correctAnswer: z.boolean(),
});

export const fillBlankContentSchema = z.object({
  promptBefore: z.string().max(5000),
  promptAfter: z.string().max(5000),
  correctAnswer: z.string().max(2000),
});

export function normalizeFillBlankAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeFillBlankContent(content: FillBlankContent): FillBlankContent {
  return {
    promptBefore: content.promptBefore.trim(),
    promptAfter: content.promptAfter.trim(),
    correctAnswer: normalizeFillBlankAnswer(content.correctAnswer),
  };
}

export function validateQuestionContent(type: AcademyQuestionType, content: unknown): AcademyQuestionContent {
  switch (type) {
    case 'single_choice': {
      const parsed = singleChoiceContentSchema.parse(content);
      if (parsed.correctAnswerIndex >= parsed.options.length) {
        throw new Error('INVALID_ANSWER_INDEX');
      }
      return parsed;
    }
    case 'multiple_choice': {
      const parsed = multipleChoiceContentSchema.parse(content);
      const maxIndex = parsed.options.length - 1;
      if (parsed.correctAnswerIndexes.some((index) => index > maxIndex)) {
        throw new Error('INVALID_ANSWER_INDEX');
      }
      return {
        ...parsed,
        correctAnswerIndexes: [...new Set(parsed.correctAnswerIndexes)].sort((a, b) => a - b),
      };
    }
    case 'true_false':
      return trueFalseContentSchema.parse(content);
    case 'fill_blank':
      return normalizeFillBlankContent(fillBlankContentSchema.parse(content));
    default:
      throw new Error('INVALID_QUESTION_TYPE');
  }
}

export function gradeQuestion(
  type: AcademyQuestionType,
  content: AcademyQuestionContent,
  userAnswer: ExamUserAnswer | undefined,
): boolean {
  if (userAnswer === undefined || userAnswer === null) return false;

  switch (type) {
    case 'single_choice': {
      const c = content as SingleChoiceContent;
      return typeof userAnswer === 'number' && userAnswer === c.correctAnswerIndex;
    }
    case 'multiple_choice': {
      const c = content as MultipleChoiceContent;
      if (!Array.isArray(userAnswer)) return false;
      const a = [...userAnswer].sort((x, y) => x - y);
      const b = [...c.correctAnswerIndexes].sort((x, y) => x - y);
      return a.length === b.length && a.every((value, index) => value === b[index]);
    }
    case 'true_false': {
      const c = content as TrueFalseContent;
      return typeof userAnswer === 'boolean' && userAnswer === c.correctAnswer;
    }
    case 'fill_blank': {
      const c = content as FillBlankContent;
      if (typeof userAnswer !== 'string') return false;
      return normalizeFillBlankAnswer(userAnswer) === normalizeFillBlankAnswer(c.correctAnswer);
    }
    default:
      return false;
  }
}

export function stripCorrectAnswers(type: AcademyQuestionType, content: AcademyQuestionContent) {
  switch (type) {
    case 'single_choice': {
      const c = content as SingleChoiceContent;
      return { prompt: c.prompt, options: c.options };
    }
    case 'multiple_choice': {
      const c = content as MultipleChoiceContent;
      return { prompt: c.prompt, options: c.options };
    }
    case 'true_false': {
      const c = content as TrueFalseContent;
      return { prompt: c.prompt };
    }
    case 'fill_blank': {
      const c = content as FillBlankContent;
      return { promptBefore: c.promptBefore, promptAfter: c.promptAfter };
    }
    default:
      return {};
  }
}

export function summarizeQuestionContent(type: AcademyQuestionType, content: AcademyQuestionContent): string {
  switch (type) {
    case 'single_choice':
    case 'multiple_choice':
      return (content as SingleChoiceContent).prompt.slice(0, 80);
    case 'true_false':
      return (content as TrueFalseContent).prompt.slice(0, 80);
    case 'fill_blank': {
      const c = content as FillBlankContent;
      return `${c.promptBefore}___${c.promptAfter}`.slice(0, 80);
    }
    default:
      return '';
  }
}

export const academyQuestionTypeLabels: Record<AcademyQuestionType, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
};

export type AdminAcademyQuestionListItem = {
  id: string;
  questionBankId: string;
  sortOrder: number;
  questionType: AcademyQuestionType;
  score: number;
  summary: string;
  localeCount: number;
  updatedAt: string;
};

export type AdminAcademyQuestionTranslation = {
  id: string;
  questionId: string;
  locale: string;
  content: AcademyQuestionContent;
  createdAt: string;
  updatedAt: string;
};

export type AdminAcademyQuestionDetail = AdminAcademyQuestionListItem & {
  translations: AdminAcademyQuestionTranslation[];
};

export const adminAcademyQuestionTranslationSchema = z.object({
  locale: z.string().min(2).max(16),
  content: z.unknown(),
});

export const adminAcademyQuestionCreateSchema = z.object({
  questionType: z.enum(academyQuestionTypeValues),
  score: z.number().int().min(1).optional().default(1),
  translation: adminAcademyQuestionTranslationSchema,
});

export const adminAcademyQuestionPatchSchema = z.object({
  questionType: z.enum(academyQuestionTypeValues).optional(),
  score: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const adminAcademyQuestionReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
