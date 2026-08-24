import { z } from 'zod';

import { normalizeCoverWrite } from '@/lib/cover-presets';
import {
  defaultHeroBackgroundFitMode,
  heroBackgroundFitModeOptionalSchema,
  normalizeHeroBackgroundFitModeForWrite,
  resolveStorefrontHeroBackgroundFitMode,
  type HeroBackgroundFitMode,
} from '@/lib/hero-background-fit';
import { defaultAdminHeroCopyStyle, heroCopyStyleOptionalSchema, normalizeHeroCopyStyleForWrite, resolveStorefrontHeroCopyStyle, type HeroCopyStyle } from '@/lib/hero-copy-style';
import { normalizeBackgroundWrite, resolvePartnerCenterBackgroundDisplay, type PartnerCenterBackgroundMode } from '@/lib/partner-center-background-presets';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import {
  defaultListHeroCoverDisplay,
  listHeroCoverDisplaySchema,
  normalizeListHeroCoverDisplay,
  resolveStorefrontListHeroCoverDisplay,
  type ListHeroCoverDisplay,
} from '@/lib/list-hero-cover-display';
import { resolveUploadStorageKey } from '@/lib/upload-storage-key';

export type { ListHeroCoverDisplay };

export const listHeroBoardKeys = ['insights', 'surgeons', 'centers'] as const;
export type ListHeroBoardKey = (typeof listHeroBoardKeys)[number];

export type ListHeroBoardConfig = {
  coverMode: string;
  coverValue: string;
  coverImage: string;
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: ListHeroCoverDisplay;
  heroCopyStyle: HeroCopyStyle | null;
  backgroundFitMode: HeroBackgroundFitMode;
  backgroundMode: string;
  backgroundValue: string;
  backgroundImage: string;
};

export type AdminListHeroBoard = ListHeroBoardConfig & {
  coverPreviewUrl: string;
  backgroundPreviewUrl: string;
};

export type StorefrontListHeroBoard = {
  coverImage: string;
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: ListHeroCoverDisplay;
  heroCopyStyle: HeroCopyStyle;
  backgroundFitMode: HeroBackgroundFitMode;
  backgroundMode: PartnerCenterBackgroundMode;
  backgroundImage: string;
  backgroundSolidCss: string;
};

export type ListHeroBoardsRecord = Record<ListHeroBoardKey, ListHeroBoardConfig>;
export type AdminListHeroBoardsRecord = Record<ListHeroBoardKey, AdminListHeroBoard>;
export type StorefrontListHeroBoardsRecord = Record<ListHeroBoardKey, StorefrontListHeroBoard>;

const coverModeSchema = z.enum(['', 'preset', 'upload']);
const backgroundModeSchema = z.enum(['', 'solid', 'preset', 'upload']);

export const listHeroBoardInputSchema = z.object({
  coverMode: coverModeSchema.optional(),
  coverValue: z.string().optional(),
  coverImage: z.string().optional(),
  videoUrl: z.string().optional(),
  showCoverOnBackground: z.boolean().optional(),
  coverDisplay: listHeroCoverDisplaySchema.optional(),
  heroCopyStyle: heroCopyStyleOptionalSchema,
  backgroundFitMode: heroBackgroundFitModeOptionalSchema,
  backgroundMode: backgroundModeSchema.optional(),
  backgroundValue: z.string().optional(),
  backgroundImage: z.string().optional(),
});

export const listHeroBoardsPutSchema = z.object({
  insights: listHeroBoardInputSchema.optional(),
  surgeons: listHeroBoardInputSchema.optional(),
  centers: listHeroBoardInputSchema.optional(),
});

export type ListHeroBoardPutInput = z.infer<typeof listHeroBoardInputSchema>;
export type ListHeroBoardsPutInput = z.infer<typeof listHeroBoardsPutSchema>;

export function createEmptyListHeroBoard(): ListHeroBoardConfig {
  return {
    coverMode: '',
    coverValue: '',
    coverImage: '',
    videoUrl: '',
    showCoverOnBackground: false,
    coverDisplay: defaultListHeroCoverDisplay(),
    heroCopyStyle: defaultAdminHeroCopyStyle(),
    backgroundFitMode: defaultHeroBackgroundFitMode(),
    backgroundMode: '',
    backgroundValue: '',
    backgroundImage: '',
  };
}

export function createEmptyListHeroBoards(): ListHeroBoardsRecord {
  return {
    insights: createEmptyListHeroBoard(),
    surgeons: createEmptyListHeroBoard(),
    centers: createEmptyListHeroBoard(),
  };
}

function normalizeBoardWrite(input: ListHeroBoardPutInput | undefined, current: ListHeroBoardConfig): ListHeroBoardConfig {
  const cover = normalizeCoverWrite(
    input?.coverMode ?? current.coverMode,
    input?.coverValue ?? current.coverValue,
  );
  const bg = normalizeBackgroundWrite(
    input?.backgroundMode ?? current.backgroundMode,
    input?.backgroundValue ?? current.backgroundValue,
  );

  return {
    coverMode: cover.coverMode,
    coverValue: cover.coverValue,
    coverImage: input?.coverImage !== undefined ? (input.coverImage ?? '') : cover.coverImage || current.coverImage,
    videoUrl: (input?.videoUrl ?? current.videoUrl ?? '').trim(),
    showCoverOnBackground: input?.showCoverOnBackground ?? current.showCoverOnBackground ?? false,
    coverDisplay: input?.coverDisplay !== undefined
      ? normalizeListHeroCoverDisplay(input.coverDisplay, current.coverDisplay)
      : normalizeListHeroCoverDisplay(current.coverDisplay),
    heroCopyStyle: input?.heroCopyStyle !== undefined
      ? normalizeHeroCopyStyleForWrite(input.heroCopyStyle)
      : current.heroCopyStyle,
    backgroundFitMode: input?.backgroundFitMode !== undefined
      ? normalizeHeroBackgroundFitModeForWrite(input.backgroundFitMode)
      : current.backgroundFitMode,
    backgroundMode: bg.backgroundMode,
    backgroundValue: bg.backgroundValue,
    backgroundImage: input?.backgroundImage !== undefined ? (input.backgroundImage ?? '') : bg.backgroundImage || current.backgroundImage,
  };
}

export function normalizeListHeroBoardsWrite(
  input: ListHeroBoardsPutInput | undefined,
  current: ListHeroBoardsRecord,
): ListHeroBoardsRecord {
  if (!input) return current;
  return {
    insights: normalizeBoardWrite(input.insights, current.insights),
    surgeons: normalizeBoardWrite(input.surgeons, current.surgeons),
    centers: normalizeBoardWrite(input.centers, current.centers),
  };
}

export function compactListHeroBoards(input: ListHeroBoardsRecord | undefined): ListHeroBoardsRecord {
  const empty = createEmptyListHeroBoards();
  if (!input) return empty;
  return {
    insights: {
      ...empty.insights,
      ...input.insights,
      coverDisplay: normalizeListHeroCoverDisplay(input.insights?.coverDisplay, empty.insights.coverDisplay),
    },
    surgeons: {
      ...empty.surgeons,
      ...input.surgeons,
      coverDisplay: normalizeListHeroCoverDisplay(input.surgeons?.coverDisplay, empty.surgeons.coverDisplay),
    },
    centers: {
      ...empty.centers,
      ...input.centers,
      coverDisplay: normalizeListHeroCoverDisplay(input.centers?.coverDisplay, empty.centers.coverDisplay),
    },
  };
}

export function resolveStorefrontListHeroBoard(row: ListHeroBoardConfig): StorefrontListHeroBoard {
  const mode = row.backgroundMode ?? '';
  const value = row.backgroundValue ?? '';
  let uploadUrl = '';
  if (mode === 'upload' && value) {
    const key = resolveUploadStorageKey(value, row.backgroundImage);
    uploadUrl = key ? resolveOssAssetUrl(key) : '';
  }

  const bg = resolvePartnerCenterBackgroundDisplay({
    mode,
    value,
    uploadUrl,
    legacyBackgroundImage: row.backgroundImage ? resolveOssAssetUrl(row.backgroundImage) : '',
    fallbackSolidWhenEmpty: true,
  });

  return {
    coverImage: resolveStorefrontCoverUrl({
      mode: row.coverMode,
      value: row.coverValue,
      legacyCoverImageKey: row.coverImage,
      toPublicUrl: resolveOssAssetUrl,
    }),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    coverDisplay: resolveStorefrontListHeroCoverDisplay(row.coverDisplay),
    heroCopyStyle: resolveStorefrontHeroCopyStyle(row.heroCopyStyle),
    backgroundFitMode: resolveStorefrontHeroBackgroundFitMode(row.backgroundFitMode),
    backgroundMode: bg.mode,
    backgroundImage: bg.imageUrl,
    backgroundSolidCss: bg.solidCss,
  };
}

export function resolveStorefrontListHeroBoards(input: ListHeroBoardsRecord | undefined): StorefrontListHeroBoardsRecord {
  const boards = compactListHeroBoards(input);
  return {
    insights: resolveStorefrontListHeroBoard(boards.insights),
    surgeons: resolveStorefrontListHeroBoard(boards.surgeons),
    centers: resolveStorefrontListHeroBoard(boards.centers),
  };
}

export function listHeroBoardHasConfiguredHero(board: StorefrontListHeroBoard): boolean {
  return Boolean(
    board.backgroundImage
    || board.backgroundSolidCss
    || board.coverImage
    || board.videoUrl,
  );
}
