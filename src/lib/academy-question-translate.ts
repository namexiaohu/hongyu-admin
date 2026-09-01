import type { AcademyQuestionContent, AcademyQuestionType } from '@/lib/academy-question-content';
import { translateText } from '@/server/ai/translate';

async function translateString(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  context: string,
) {
  const trimmed = text.trim();
  if (!trimmed || sourceLocale === targetLocale) return text;
  return translateText({
    text: trimmed,
    sourceLocale,
    targetLocale,
    context,
  });
}

async function translateOptions(
  options: string[],
  sourceLocale: string,
  targetLocale: string,
) {
  const results: string[] = [];
  for (const option of options) {
    results.push(await translateString(option, sourceLocale, targetLocale, 'exam answer option'));
  }
  return results;
}

export async function translateAcademyQuestionContent(
  questionType: AcademyQuestionType,
  content: AcademyQuestionContent,
  sourceLocale: string,
  targetLocale: string,
): Promise<AcademyQuestionContent> {
  if (sourceLocale === targetLocale) return content;

  switch (questionType) {
    case 'single_choice': {
      const c = content as Extract<AcademyQuestionContent, { options: string[]; correctAnswerIndex: number }>;
      return {
        prompt: await translateString(c.prompt, sourceLocale, targetLocale, 'exam question prompt'),
        options: await translateOptions(c.options, sourceLocale, targetLocale),
        correctAnswerIndex: c.correctAnswerIndex,
      };
    }
    case 'multiple_choice': {
      const c = content as Extract<AcademyQuestionContent, { options: string[]; correctAnswerIndexes: number[] }>;
      return {
        prompt: await translateString(c.prompt, sourceLocale, targetLocale, 'exam question prompt'),
        options: await translateOptions(c.options, sourceLocale, targetLocale),
        correctAnswerIndexes: c.correctAnswerIndexes,
      };
    }
    case 'true_false': {
      const c = content as Extract<AcademyQuestionContent, { correctAnswer: boolean }>;
      return {
        prompt: await translateString(c.prompt, sourceLocale, targetLocale, 'exam true/false question'),
        correctAnswer: c.correctAnswer,
      };
    }
    case 'fill_blank': {
      const c = content as Extract<AcademyQuestionContent, { promptBefore: string; promptAfter: string; correctAnswer: string }>;
      return {
        promptBefore: await translateString(c.promptBefore, sourceLocale, targetLocale, 'fill-in-the-blank question prefix'),
        promptAfter: await translateString(c.promptAfter, sourceLocale, targetLocale, 'fill-in-the-blank question suffix'),
        correctAnswer: c.correctAnswer,
      };
    }
    default:
      return content;
  }
}
