import type {
  AcademyQuestionContent,
  AcademyQuestionType,
  ExamUserAnswer,
} from '@/lib/academy-question-content';

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeChoiceIndex(answer: unknown): number | null {
  if (typeof answer === 'number' && Number.isFinite(answer)) return answer;
  if (typeof answer === 'string' && answer.trim() !== '' && Number.isFinite(Number(answer))) {
    return Number(answer);
  }
  return null;
}

function normalizeChoiceIndexes(answer: unknown): number[] {
  if (!Array.isArray(answer)) return [];
  return answer.map(Number).filter((index) => Number.isFinite(index));
}

export function formatExamQuestionOptions(
  type: AcademyQuestionType,
  content: AcademyQuestionContent,
): string {
  if (type === 'single_choice' || type === 'multiple_choice') {
    const options = (content as { options?: string[] }).options ?? [];
    if (!options.length) return '—';
    return options
      .map((text, index) => `${optionLetter(index)}. ${text || `选项 ${index + 1}`}`)
      .join('\n');
  }
  if (type === 'true_false') {
    return 'A. 正确\nB. 错误';
  }
  if (type === 'fill_blank') {
    const c = content as { promptBefore: string; promptAfter: string };
    const before = c.promptBefore?.trim() ?? '';
    const after = c.promptAfter?.trim() ?? '';
    if (!before && !after) return '—';
    return `${before}【___】${after}`;
  }
  return '—';
}

export function formatExamUserAnswer(
  type: AcademyQuestionType,
  content: AcademyQuestionContent,
  userAnswer: ExamUserAnswer | null | undefined,
): string {
  if (userAnswer === null || userAnswer === undefined) return '—';

  if (type === 'single_choice') {
    const options = (content as { options?: string[] }).options ?? [];
    const index = normalizeChoiceIndex(userAnswer);
    if (index === null) return String(userAnswer);
    const text = options[index]?.trim();
    return text ? `${optionLetter(index)}. ${text}` : `${optionLetter(index)}（选项 ${index + 1}）`;
  }

  if (type === 'multiple_choice') {
    const options = (content as { options?: string[] }).options ?? [];
    const indexes = normalizeChoiceIndexes(userAnswer);
    if (!indexes.length) return String(userAnswer);
    return indexes
      .map((index) => {
        const text = options[index]?.trim();
        return text ? `${optionLetter(index)}. ${text}` : `${optionLetter(index)}（选项 ${index + 1}）`;
      })
      .join('、');
  }

  if (type === 'true_false') {
    if (userAnswer === true) return '正确';
    if (userAnswer === false) return '错误';
    return String(userAnswer);
  }

  return String(userAnswer);
}

export function formatExamCorrectAnswer(
  type: AcademyQuestionType,
  content: AcademyQuestionContent,
): string {
  if (type === 'single_choice') {
    const c = content as { options: string[]; correctAnswerIndex: number };
    const index = c.correctAnswerIndex;
    const text = c.options[index]?.trim();
    return text ? `${optionLetter(index)}. ${text}` : `${optionLetter(index)}（选项 ${index + 1}）`;
  }

  if (type === 'multiple_choice') {
    const c = content as { options: string[]; correctAnswerIndexes: number[] };
    return (c.correctAnswerIndexes ?? [])
      .map((index) => {
        const text = c.options[index]?.trim();
        return text ? `${optionLetter(index)}. ${text}` : `${optionLetter(index)}（选项 ${index + 1}）`;
      })
      .join('、') || '—';
  }

  if (type === 'true_false') {
    const c = content as { correctAnswer: boolean };
    return c.correctAnswer ? '正确' : '错误';
  }

  const c = content as { correctAnswer: string };
  return c.correctAnswer?.trim() || '—';
}
