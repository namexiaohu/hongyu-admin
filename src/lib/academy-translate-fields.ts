import type { AcademyStat } from '@/lib/academy-content-shared';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';

export type AcademyEntityLocaleDraft = {
  title: string;
  subtitle: string;
  badgeLabel: string;
  summary: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  stats: AcademyStat[];
  learnings: string[];
  skills: string[];
  tools: string[];
};

function normalizePairRow(record: unknown): AcademyStat {
  if (!record || typeof record !== 'object') {
    return { label: '', value: '' };
  }
  const row = record as Record<string, unknown>;
  return {
    label: typeof row.label === 'string' ? row.label : String(row.label ?? ''),
    value: typeof row.value === 'string' ? row.value : String(row.value ?? ''),
  };
}

export function serializePairText(rows: AcademyStat[]): string {
  return (rows ?? [])
    .map((row) => `${row.label?.trim() ?? ''}|||${row.value?.trim() ?? ''}`)
    .filter((line) => line !== '|||')
    .join('\n');
}

export function deserializePairText(text: string): AcademyStat[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizePairRow).filter((row) => row.label.trim() || row.value.trim());
    }
  } catch {
    // line-based LABEL|||VALUE
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => {
      const [label = '', value = ''] = line.split('|||');
      return { label: label.trim(), value: value.trim() };
    })
    .filter((row) => row.label || row.value);
}

export function serializeLines(items: string[]): string {
  return (items ?? []).map((item) => item.trim()).filter(Boolean).join('\n');
}

export function deserializeLines(text: string): string[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // one item per line
  }

  return trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function academyEntityDraftToTranslateFields(draft: AcademyEntityLocaleDraft): Record<string, string> {
  return {
    title: draft.title,
    subtitle: draft.subtitle,
    badgeLabel: draft.badgeLabel,
    summary: draft.summary,
    description: draft.description,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    statsText: serializePairText(draft.stats),
    learningsText: serializeLines(draft.learnings),
    skillsText: serializeLines(draft.skills),
    toolsText: serializeLines(draft.tools),
  };
}

export function applyTranslatedToAcademyEntityDraft(
  current: AcademyEntityLocaleDraft,
  fields: Record<string, string>,
): AcademyEntityLocaleDraft {
  const merged = applyNonemptyTranslatedFields(current, fields);
  const statsText = fields.statsText?.trim();
  const learningsText = fields.learningsText?.trim();
  const skillsText = fields.skillsText?.trim();
  const toolsText = fields.toolsText?.trim();

  return {
    ...merged,
    stats: statsText ? deserializePairText(statsText) : merged.stats,
    learnings: learningsText ? deserializeLines(learningsText) : merged.learnings,
    skills: skillsText ? deserializeLines(skillsText) : merged.skills,
    tools: toolsText ? deserializeLines(toolsText) : merged.tools,
  };
}
