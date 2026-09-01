import {
  contentBlockSplitLayouts,
  contentBlockSummaryIcons,
  contentBlockSummaryLayouts,
  defaultContentBlockSummaryIcon,
  isContentBlockSummaryIcon,
  type ContentBlockCarouselSlide,
  type ContentBlockLocaleCopy,
  type ContentBlockSplitLayout,
  type ContentBlockSummaryIcon,
  type ContentBlockSummaryLayout,
} from '@/lib/content-blocks-shared';
import type { HeroBackgroundFitMode } from '@/lib/hero-background-fit';
import { defaultHeroBackgroundFitMode } from '@/lib/hero-background-fit';
import type { HeroCopyStyle } from '@/lib/hero-copy-style';

export const solutionBlockTypes = ['split', 'summary', 'timeline', 'course', 'specifications', 'relatedProducts'] as const;
export type SolutionBlockType = (typeof solutionBlockTypes)[number];

export const solutionSplitLayouts = contentBlockSplitLayouts;
export type SolutionSplitLayout = ContentBlockSplitLayout;

export const solutionSummaryLayouts = contentBlockSummaryLayouts;
export type SolutionSummaryLayout = ContentBlockSummaryLayout;

export type SolutionBlockLayout = SolutionSplitLayout | SolutionSummaryLayout;

export const solutionSummaryIcons = contentBlockSummaryIcons;
export type SolutionSummaryIcon = ContentBlockSummaryIcon;

export const defaultSolutionSummaryIcon = defaultContentBlockSummaryIcon;

export function isSummaryIcon(value: string | undefined): value is SolutionSummaryIcon {
  return isContentBlockSummaryIcon(value);
}

export type SolutionBlockLocaleCopy = ContentBlockLocaleCopy;

export type SolutionBlockItemDraft = {
  id: string;
  icon?: SolutionSummaryIcon;
  coverMode?: '' | 'preset' | 'upload';
  coverValue?: string;
  coverImage?: string;
  /** Admin-only resolved preview URL */
  coverPreviewUrl?: string;
  locales?: Record<string, SolutionBlockLocaleCopy>;
};

export type SolutionCarouselSlide = ContentBlockCarouselSlide;

export type SolutionBlockDraft = {
  id: string;
  type: SolutionBlockType;
  layout?: SolutionBlockLayout;
  heroCopyStyle?: HeroCopyStyle;
  carouselFitMode?: HeroBackgroundFitMode;
  carouselImages?: SolutionCarouselSlide[];
  videoUrl?: string;
  href?: string;
  productIds?: string[];
  locales: Record<string, SolutionBlockLocaleCopy>;
  items: SolutionBlockItemDraft[];
};

export const solutionBlockTypeLabels: Record<SolutionBlockType, string> = {
  split: '图文分栏',
  summary: '摘要点',
  timeline: '时间节点',
  course: '课程',
  specifications: '产品参数',
  relatedProducts: '关联产品',
};

export const solutionSplitLayoutLabels: Record<SolutionSplitLayout, string> = {
  'image-left': '文字在右',
  'image-right': '文字在左',
};

export const solutionSummaryLayoutLabels: Record<SolutionSummaryLayout, string> = {
  'single-row': '单行',
  'multi-2': '每行两个',
  'multi-3': '每行三个',
};

export function isSplitLayout(value: string | undefined): value is SolutionSplitLayout {
  return solutionSplitLayouts.includes(value as SolutionSplitLayout);
}

export function isSummaryLayout(value: string | undefined): value is SolutionSummaryLayout {
  return solutionSummaryLayouts.includes(value as SolutionSummaryLayout);
}

const summaryIconBlockIds = new Set(['values', 'certs']);

/** 摘要点「每行三个」用封面图卡片；特定 id 仍用图标。 */
export function summaryItemUsesCoverImage(block: Pick<SolutionBlockDraft, 'type' | 'layout' | 'id'>): boolean {
  if (block.type !== 'summary') return false;
  if (summaryIconBlockIds.has(block.id)) return false;
  return block.layout === 'multi-3' || block.id === 'innovation';
}

export function getSolutionBlockLabel(block: SolutionBlockDraft) {
  const typeLabel = solutionBlockTypeLabels[block.type];
  if (block.type === 'split' && isSplitLayout(block.layout)) {
    return `${typeLabel} · ${solutionSplitLayoutLabels[block.layout]}`;
  }
  if (block.type === 'summary' && isSummaryLayout(block.layout)) {
    return `${typeLabel} · ${solutionSummaryLayoutLabels[block.layout]}`;
  }
  return typeLabel;
}

export function createSolutionBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSolutionBlockItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSolutionCarouselSlide(url = ''): SolutionCarouselSlide {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
  };
}

export function createSolutionBlockItem(): SolutionBlockItemDraft {
  return {
    id: createSolutionBlockItemId(),
    icon: defaultSolutionSummaryIcon,
    coverImage: '',
    locales: {},
  };
}

export function createEmptyBlockLocaleCopy(): SolutionBlockLocaleCopy {
  return {
    smallTitle: '',
    largeTitle: '',
    description: '',
    buttonLabel: '',
    badge: '',
    totalHours: '',
    teachingFormat: '',
    trainingCycle: '',
  };
}

export function hasLocaleCopyContent(copy: SolutionBlockLocaleCopy | undefined): boolean {
  if (!copy) return false;
  return Boolean(
    copy.smallTitle.trim()
    || copy.largeTitle.trim()
    || copy.description.trim()
    || copy.buttonLabel?.trim()
    || copy.badge?.trim()
    || copy.totalHours?.trim()
    || copy.teachingFormat?.trim()
    || copy.trainingCycle?.trim(),
  );
}

export function writeLocaleCopy(
  locales: Record<string, SolutionBlockLocaleCopy> | undefined,
  locale: string,
  copy: SolutionBlockLocaleCopy,
): Record<string, SolutionBlockLocaleCopy> {
  const next = { ...(locales ?? {}) };
  if (hasLocaleCopyContent(copy)) {
    next[locale] = copy;
  } else {
    delete next[locale];
  }
  return next;
}

function localeKeysMatch(stored: string, requested: string) {
  const left = stored.trim().toLowerCase();
  const right = requested.trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  const leftBase = left.split('-')[0];
  const rightBase = right.split('-')[0];
  return left === rightBase || right === leftBase || left.startsWith(`${rightBase}-`) || right.startsWith(`${leftBase}-`);
}

export function pickBlockLocaleCopy(
  locales: Record<string, SolutionBlockLocaleCopy> | undefined,
  locale: string,
): SolutionBlockLocaleCopy {
  const empty = createEmptyBlockLocaleCopy();
  if (!locales) return empty;

  const entries = Object.entries(locales).filter(([, copy]) => hasLocaleCopyContent(copy));
  if (!entries.length) return empty;

  const exact = entries.find(([key]) => key.toLowerCase() === locale.trim().toLowerCase());
  if (exact) return exact[1];

  const prefix = entries.find(([key]) => localeKeysMatch(key, locale));
  if (prefix) return prefix[1];

  const fallbackZh = entries.find(([key]) => localeKeysMatch(key, 'zh-CN') || localeKeysMatch(key, 'zh'));
  return fallbackZh?.[1] ?? entries[0][1];
}

export function createSolutionBlock(type: SolutionBlockType): SolutionBlockDraft {
  const block: SolutionBlockDraft = {
    id: createSolutionBlockId(),
    type,
    locales: {},
    items: [],
  };
  if (type === 'split') {
    block.layout = 'image-left';
    block.heroCopyStyle = 'light';
    block.carouselFitMode = defaultHeroBackgroundFitMode();
    block.carouselImages = [];
    block.videoUrl = '';
  }
  if (type === 'summary') {
    block.layout = 'single-row';
  }
  if (type === 'relatedProducts') {
    block.productIds = [];
  }
  return block;
}
