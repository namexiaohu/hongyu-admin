import { resolveUploadStorageKey } from '@/lib/upload-storage-key';

export type CoverImageMode = 'preset' | 'upload' | '';

export type CoverImagePreset = {
  id: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
  credit: string;
};

function unsplashCover(photoId: string, w: number, h: number) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

function cover(id: string, label: string, photoId: string): CoverImagePreset {
  return {
    id,
    label,
    thumbUrl: unsplashCover(photoId, 640, 480),
    fullUrl: unsplashCover(photoId, 1200, 900),
    credit: 'Unsplash',
  };
}

/** 4:3 cover presets (30) — hospital / clinic / medical-care oriented */
export const COVER_IMAGE_PRESETS: CoverImagePreset[] = [
  cover('c-01', '医院大厅', 'photo-1519494026892-80bbd2d6fd0d'),
  cover('c-02', '洁净走廊', 'photo-1516549655169-df83a0774514'),
  cover('c-03', '手术准备', 'photo-1551076805-e1869033e561'),
  cover('c-04', '诊疗设备', 'photo-1579684385127-1ef15d508118'),
  cover('c-05', '医院外立面', 'photo-1586773860418-d37222d8fce3'),
  cover('c-06', '候诊区', 'photo-1538108149393-fbbd81895907'),
  cover('c-07', '检查手套', 'photo-1581595220892-b0739db3c9f4'),
  cover('c-08', '显微镜', 'photo-1582719471384-894fbb16e074'),
  cover('c-09', '听诊问诊', 'photo-1576091160399-112ba8d25d1d'),
  cover('c-10', '医护协作', 'photo-1559839734-2b71ea197ec2'),
  cover('c-11', '实验室', 'photo-1576086213369-97a306d36557'),
  cover('c-12', '药剂柜', 'photo-1587854693227-5bb3bb21f3b3'),
  cover('c-13', '超声诊室', 'photo-1666214280557-f1b5022eb634'),
  cover('c-14', '宠物医院', 'photo-1548199973-03cce0bbc87b'),
  cover('c-15', '犬只护理', 'photo-1587300003388-59208cc962cb'),
  cover('c-16', '猫咪诊疗', 'photo-1514888286974-6c03e2ca1dba'),
  cover('c-17', '兽医诊台', 'photo-1629909613654-28e377c37b09'),
  cover('c-18', '手术灯', 'photo-1551190822-a9333d879b1f'),
  cover('c-19', '白大褂', 'photo-1631815588090-d4bfec5b1ccb'),
  cover('c-20', '医学影像', 'photo-1530497610245-94d3c16cda28'),
  cover('c-21', '会诊讨论', 'photo-1576091160550-2173dba999ef'),
  cover('c-22', '学术研讨', 'photo-1579684453423-f84349ef60b0'),
  cover('c-23', '会议厅', 'photo-1540575467063-178a50c2df87'),
  cover('c-24', '现代诊室', 'photo-1519494140281-81acdae0aa6b'),
  cover('c-25', '医疗建筑', 'photo-1587351021759-3e566b6af7cc'),
  cover('c-26', '晨光诊廊', 'photo-1631217868264-e5b90bb7e133'),
  cover('c-27', '无菌准备', 'photo-1551601651-2a8555f1a136'),
  cover('c-28', '心脏监护', 'photo-1505751171710-1f6d0ace5a85'),
  cover('c-29', '诊疗椅', 'photo-1516549655169-df83a0774514'),
  cover('c-30', '合作握手', 'photo-1521737604893-d14cc237f11d'),
];

export function getCoverImagePreset(id: string) {
  return COVER_IMAGE_PRESETS.find((item) => item.id === id) ?? null;
}

export function normalizeCoverWrite(mode: string | undefined, value: string | undefined) {
  const nextMode = (mode ?? '') as CoverImageMode;
  const nextValue = (value ?? '').trim();
  if ((nextMode !== 'preset' && nextMode !== 'upload') || !nextValue) {
    return { coverMode: '' as CoverImageMode, coverValue: '', coverImage: '' };
  }
  return {
    coverMode: nextMode,
    coverValue: nextValue,
    coverImage: nextMode === 'upload' ? nextValue : '',
  };
}

export function resolveCoverDisplay(input: {
  mode?: string | null;
  value?: string | null;
  uploadUrl?: string;
  legacyCoverImage?: string;
}): { mode: CoverImageMode; imageUrl: string } {
  const mode = (input.mode || '') as CoverImageMode;
  const value = input.value?.trim() ?? '';

  if (mode === 'preset' && value) {
    const preset = getCoverImagePreset(value);
    return { mode: 'preset', imageUrl: preset?.fullUrl ?? '' };
  }
  if (mode === 'upload' && value) {
    return { mode: 'upload', imageUrl: input.uploadUrl || input.legacyCoverImage?.trim() || '' };
  }

  const legacy = input.legacyCoverImage?.trim() ?? '';
  if (legacy) {
    return { mode: 'upload', imageUrl: legacy };
  }

  return { mode: '', imageUrl: '' };
}

/** Storefront helper: resolve final public cover URL from mode/value + legacy key. */
export function resolveStorefrontCoverUrl(input: {
  mode?: string | null;
  value?: string | null;
  legacyCoverImageKey?: string | null;
  toPublicUrl: (storageKey: string) => string;
}): string {
  const mode = input.mode ?? '';
  const value = (input.value ?? '').trim();
  let uploadUrl = '';
  if (mode === 'upload' && value) {
    const key = resolveUploadStorageKey(value, input.legacyCoverImageKey);
    uploadUrl = key ? input.toPublicUrl(key) : '';
  }
  const legacyKey = input.legacyCoverImageKey?.trim() ?? '';
  return resolveCoverDisplay({
    mode,
    value,
    uploadUrl,
    legacyCoverImage: legacyKey ? input.toPublicUrl(legacyKey) : '',
  }).imageUrl;
}

export function resolveAdminCoverPreview(input: {
  mode: string;
  value: string;
  legacyCoverImageKey: string;
  toPublicUrl: (storageKey: string) => string;
}): { mode: CoverImageMode; value: string; previewUrl: string } {
  const mode = (input.mode ?? '') as CoverImageMode;
  const value = (input.value ?? '').trim();
  let uploadUrl = '';
  if (mode === 'upload' && value) {
    const key = resolveUploadStorageKey(value, input.legacyCoverImageKey);
    uploadUrl = key ? input.toPublicUrl(key) : '';
  }
  const legacyKey = input.legacyCoverImageKey?.trim() ?? '';
  const display = resolveCoverDisplay({
    mode,
    value,
    uploadUrl,
    legacyCoverImage: legacyKey ? input.toPublicUrl(legacyKey) : '',
  });
  return {
    mode: (mode || display.mode || '') as CoverImageMode,
    value,
    previewUrl: display.imageUrl,
  };
}
