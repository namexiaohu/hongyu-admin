export const brandNarrativeBlockTypes = ['split', 'summary', 'timeline', 'course', 'cta'] as const;
export type BrandNarrativeBlockType = (typeof brandNarrativeBlockTypes)[number];

export const brandNarrativeSplitLayouts = ['image-left', 'image-right'] as const;
export type BrandNarrativeSplitLayout = (typeof brandNarrativeSplitLayouts)[number];

export const brandNarrativeSummaryLayouts = ['single-row', 'multi-2', 'multi-3'] as const;
export type BrandNarrativeSummaryLayout = (typeof brandNarrativeSummaryLayouts)[number];

export type BrandNarrativeBlockLayout = BrandNarrativeSplitLayout | BrandNarrativeSummaryLayout;

export const brandNarrativeSummaryIcons = [
  'layers',
  'check',
  'users',
  'award',
  'shield',
  'heart',
  'globe',
  'clock',
  'book',
  'flask',
  'lightbulb',
  'target',
  'star',
  'building',
  'cpu',
  'activity',
] as const;
export type BrandNarrativeSummaryIcon = (typeof brandNarrativeSummaryIcons)[number];

export const defaultBrandNarrativeSummaryIcon: BrandNarrativeSummaryIcon = 'layers';

export function isSummaryIcon(value: string | undefined): value is BrandNarrativeSummaryIcon {
  return brandNarrativeSummaryIcons.includes(value as BrandNarrativeSummaryIcon);
}

export type BrandNarrativeBlockLocaleCopy = {
  smallTitle: string;
  largeTitle: string;
  description: string;
  buttonLabel?: string;
  badge?: string;
  totalHours?: string;
  teachingFormat?: string;
  trainingCycle?: string;
};

export type BrandNarrativeBlockItemDraft = {
  id: string;
  icon?: BrandNarrativeSummaryIcon;
  coverImage?: string;
  locales?: Record<string, BrandNarrativeBlockLocaleCopy>;
};

export type BrandNarrativeCarouselSlide = {
  id: string;
  url: string;
};

export type BrandNarrativeBlockDraft = {
  id: string;
  type: BrandNarrativeBlockType;
  layout?: BrandNarrativeBlockLayout;
  carouselImages?: BrandNarrativeCarouselSlide[];
  videoUrl?: string;
  href?: string;
  locales: Record<string, BrandNarrativeBlockLocaleCopy>;
  items: BrandNarrativeBlockItemDraft[];
};

export const brandNarrativeBlockTypeLabels: Record<BrandNarrativeBlockType, string> = {
  split: '图文分栏',
  summary: '摘要点',
  timeline: '时间节点',
  course: '课程',
  cta: '合作咨询',
};

export const brandNarrativeSplitLayoutLabels: Record<BrandNarrativeSplitLayout, string> = {
  'image-left': '图在左',
  'image-right': '图在右',
};

export const brandNarrativeSummaryLayoutLabels: Record<BrandNarrativeSummaryLayout, string> = {
  'single-row': '单行',
  'multi-2': '每行两个',
  'multi-3': '每行三个',
};

export function isSplitLayout(value: string | undefined): value is BrandNarrativeSplitLayout {
  return brandNarrativeSplitLayouts.includes(value as BrandNarrativeSplitLayout);
}

export function isSummaryLayout(value: string | undefined): value is BrandNarrativeSummaryLayout {
  return brandNarrativeSummaryLayouts.includes(value as BrandNarrativeSummaryLayout);
}

const summaryIconBlockIds = new Set(['values', 'certs']);

/** 摘要点「每行三个」用封面图卡片；核心价值/认证仍用图标。 */
export function summaryItemUsesCoverImage(block: Pick<BrandNarrativeBlockDraft, 'type' | 'layout' | 'id'>): boolean {
  if (block.type !== 'summary') return false;
  if (summaryIconBlockIds.has(block.id)) return false;
  return block.layout === 'multi-3' || block.id === 'innovation';
}

export function getBrandNarrativeBlockLabel(block: BrandNarrativeBlockDraft) {
  const typeLabel = brandNarrativeBlockTypeLabels[block.type];
  if (block.type === 'split' && isSplitLayout(block.layout)) {
    return `${typeLabel} · ${brandNarrativeSplitLayoutLabels[block.layout]}`;
  }
  if (block.type === 'summary' && isSummaryLayout(block.layout)) {
    return `${typeLabel} · ${brandNarrativeSummaryLayoutLabels[block.layout]}`;
  }
  return typeLabel;
}

export function createBrandNarrativeBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBrandNarrativeBlockItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBrandNarrativeCarouselSlide(url = ''): BrandNarrativeCarouselSlide {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
  };
}

export function createBrandNarrativeBlockItem(): BrandNarrativeBlockItemDraft {
  return {
    id: createBrandNarrativeBlockItemId(),
    icon: defaultBrandNarrativeSummaryIcon,
    coverImage: '',
    locales: {},
  };
}

export function createEmptyBlockLocaleCopy(): BrandNarrativeBlockLocaleCopy {
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

export function hasLocaleCopyContent(copy: BrandNarrativeBlockLocaleCopy | undefined): boolean {
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
  locales: Record<string, BrandNarrativeBlockLocaleCopy> | undefined,
  locale: string,
  copy: BrandNarrativeBlockLocaleCopy,
): Record<string, BrandNarrativeBlockLocaleCopy> {
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
  locales: Record<string, BrandNarrativeBlockLocaleCopy> | undefined,
  locale: string,
): BrandNarrativeBlockLocaleCopy {
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

export function createBrandNarrativeBlock(type: BrandNarrativeBlockType): BrandNarrativeBlockDraft {
  const block: BrandNarrativeBlockDraft = {
    id: createBrandNarrativeBlockId(),
    type,
    locales: {},
    items: [],
  };
  if (type === 'split') {
    block.layout = 'image-left';
    block.carouselImages = [];
    block.videoUrl = '';
  }
  if (type === 'summary') {
    block.layout = 'single-row';
  }
  if (type === 'cta') {
    block.href = '';
  }
  return block;
}
