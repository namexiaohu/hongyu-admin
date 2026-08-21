export type PartnerCenterBackgroundMode = 'solid' | 'preset' | 'upload' | '';

export type PartnerCenterSolidPreset = {
  id: string;
  label: string;
  /** Full CSS background value (usually linear-gradient) */
  css: string;
};

export type PartnerCenterImagePreset = {
  id: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
  credit: string;
};

/** Shared solid hero gradient: 135deg, base mixed with black 72% → base */
function solidHeroCss(base: string) {
  return `linear-gradient(135deg, color-mix(in oklch, ${base}, black 72%) 0%, ${base} 100%)`;
}

export const PARTNER_CENTER_SOLID_PRESETS: PartnerCenterSolidPreset[] = [
  { id: 'slate-deep', label: '品牌蓝', css: solidHeroCss('#1e3a5f') },
  { id: 'navy-depth', label: '深蓝', css: solidHeroCss('#1e40af') },
  { id: 'teal-clinic', label: '青绿', css: solidHeroCss('#0f766e') },
  { id: 'charcoal', label: '炭灰', css: solidHeroCss('#3f3f46') },
  { id: 'indigo-soft', label: '靛紫', css: solidHeroCss('#3730a3') },
  { id: 'ocean-dusk', label: '暮海', css: solidHeroCss('#0369a1') },
  { id: 'forest', label: '森绿', css: solidHeroCss('#166534') },
  { id: 'wine', label: '酒红', css: solidHeroCss('#9f1239') },
];

function unsplash(photoId: string, w: number) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&q=80`;
}

/** Unsplash landscape presets (30) */
export const PARTNER_CENTER_IMAGE_PRESETS: PartnerCenterImagePreset[] = [
  { id: 'u-01', label: '现代医院大厅', thumbUrl: unsplash('photo-1519494026892-80bbd2d6fd0d', 480), fullUrl: unsplash('photo-1519494026892-80bbd2d6fd0d', 1920), credit: 'Unsplash' },
  { id: 'u-02', label: '洁净手术空间', thumbUrl: unsplash('photo-1551076805-e1869033e561', 480), fullUrl: unsplash('photo-1551076805-e1869033e561', 1920), credit: 'Unsplash' },
  { id: 'u-03', label: '实验室设备', thumbUrl: unsplash('photo-1579684385127-1ef15d508118', 480), fullUrl: unsplash('photo-1579684385127-1ef15d508118', 1920), credit: 'Unsplash' },
  { id: 'u-04', label: '医疗走廊', thumbUrl: unsplash('photo-1516549655169-df83a0774514', 480), fullUrl: unsplash('photo-1516549655169-df83a0774514', 1920), credit: 'Unsplash' },
  { id: 'u-05', label: '城市天际线', thumbUrl: unsplash('photo-1449824913935-59a10b8d2000', 480), fullUrl: unsplash('photo-1449824913935-59a10b8d2000', 1920), credit: 'Unsplash' },
  { id: 'u-06', label: '玻璃幕墙建筑', thumbUrl: unsplash('photo-1486406146926-c627a92ad1ab', 480), fullUrl: unsplash('photo-1486406146926-c627a92ad1ab', 1920), credit: 'Unsplash' },
  { id: 'u-07', label: '学术报告厅', thumbUrl: unsplash('photo-1540575467063-178a50c2df87', 480), fullUrl: unsplash('photo-1540575467063-178a50c2df87', 1920), credit: 'Unsplash' },
  { id: 'u-08', label: '晨光窗景', thumbUrl: unsplash('photo-1497366216548-37526070297c', 480), fullUrl: unsplash('photo-1497366216548-37526070297c', 1920), credit: 'Unsplash' },
  { id: 'u-09', label: '极简白空间', thumbUrl: unsplash('photo-1497366811353-6870744d04b2', 480), fullUrl: unsplash('photo-1497366811353-6870744d04b2', 1920), credit: 'Unsplash' },
  { id: 'u-10', label: '柔和光影', thumbUrl: unsplash('photo-1503387762-592deb58ef4e', 480), fullUrl: unsplash('photo-1503387762-592deb58ef4e', 1920), credit: 'Unsplash' },
  { id: 'u-11', label: '蓝色抽象', thumbUrl: unsplash('photo-1557683316-973673baf926', 480), fullUrl: unsplash('photo-1557683316-973673baf926', 1920), credit: 'Unsplash' },
  { id: 'u-12', label: '科技纹理', thumbUrl: unsplash('photo-1451187580459-43490279c0fa', 480), fullUrl: unsplash('photo-1451187580459-43490279c0fa', 1920), credit: 'Unsplash' },
  { id: 'u-13', label: '山脉远景', thumbUrl: unsplash('photo-1464822759023-fed622ff2c3b', 480), fullUrl: unsplash('photo-1464822759023-fed622ff2c3b', 1920), credit: 'Unsplash' },
  { id: 'u-14', label: '海岸线', thumbUrl: unsplash('photo-1507525428034-b723cf961d3e', 480), fullUrl: unsplash('photo-1507525428034-b723cf961d3e', 1920), credit: 'Unsplash' },
  { id: 'u-15', label: '森林薄雾', thumbUrl: unsplash('photo-1441974231531-c6227db76b6e', 480), fullUrl: unsplash('photo-1441974231531-c6227db76b6e', 1920), credit: 'Unsplash' },
  { id: 'u-16', label: '沙漠曲线', thumbUrl: unsplash('photo-1509316785289-025f5b846b35', 480), fullUrl: unsplash('photo-1509316785289-025f5b846b35', 1920), credit: 'Unsplash' },
  { id: 'u-17', label: '夜城灯光', thumbUrl: unsplash('photo-1519501025264-65ba15a82390', 480), fullUrl: unsplash('photo-1519501025264-65ba15a82390', 1920), credit: 'Unsplash' },
  { id: 'u-18', label: '桥梁结构', thumbUrl: unsplash('photo-1477959858617-67f85cf4f1df', 480), fullUrl: unsplash('photo-1477959858617-67f85cf4f1df', 1920), credit: 'Unsplash' },
  { id: 'u-19', label: '会议室', thumbUrl: unsplash('photo-1497366754035-f200968a6e72', 480), fullUrl: unsplash('photo-1497366754035-f200968a6e72', 1920), credit: 'Unsplash' },
  { id: 'u-20', label: '接待前台', thumbUrl: unsplash('photo-1568992687947-868a62a9f521', 480), fullUrl: unsplash('photo-1568992687947-868a62a9f521', 1920), credit: 'Unsplash' },
  { id: 'u-21', label: '显微镜特写', thumbUrl: unsplash('photo-1582719471384-894fbb16e074', 480), fullUrl: unsplash('photo-1582719471384-894fbb16e074', 1920), credit: 'Unsplash' },
  { id: 'u-22', label: '手套与器械', thumbUrl: unsplash('photo-1581595220892-b0739db3c9f4', 480), fullUrl: unsplash('photo-1581595220892-b0739db3c9f4', 1920), credit: 'Unsplash' },
  { id: 'u-23', label: '柔白室内', thumbUrl: unsplash('photo-1600585154340-be6161a56a0c', 480), fullUrl: unsplash('photo-1600585154340-be6161a56a0c', 1920), credit: 'Unsplash' },
  { id: 'u-24', label: '混凝土质感', thumbUrl: unsplash('photo-1487958449943-2429e8be8624', 480), fullUrl: unsplash('photo-1487958449943-2429e8be8624', 1920), credit: 'Unsplash' },
  { id: 'u-25', label: '日落剪影', thumbUrl: unsplash('photo-1495616811223-4d98c6e9c869', 480), fullUrl: unsplash('photo-1495616811223-4d98c6e9c869', 1920), credit: 'Unsplash' },
  { id: 'u-26', label: '水面反光', thumbUrl: unsplash('photo-1439066615861-d1af74d74000', 480), fullUrl: unsplash('photo-1439066615861-d1af74d74000', 1920), credit: 'Unsplash' },
  { id: 'u-27', label: '图书馆长廊', thumbUrl: unsplash('photo-1521587760476-6c12a4b040da', 480), fullUrl: unsplash('photo-1521587760476-6c12a4b040da', 1920), credit: 'Unsplash' },
  { id: 'u-28', label: '绿植中庭', thumbUrl: unsplash('photo-1466692476866-aef53dfdf3a2', 480), fullUrl: unsplash('photo-1466692476866-aef53dfdf3a2', 1920), credit: 'Unsplash' },
  { id: 'u-29', label: '几何立面', thumbUrl: unsplash('photo-1486325212027-8081e485255e', 480), fullUrl: unsplash('photo-1486325212027-8081e485255e', 1920), credit: 'Unsplash' },
  { id: 'u-30', label: '云层航拍', thumbUrl: unsplash('photo-1419242902214-272b3f66ee7a', 480), fullUrl: unsplash('photo-1419242902214-272b3f66ee7a', 1920), credit: 'Unsplash' },
];

export const MEDIA_ASSET_TYPE_PARTNER_CENTER_BACKGROUND = 'partner_center_background';
export const MEDIA_ASSET_TYPE_BRAND_NARRATIVE_BACKGROUND = 'brand_narrative_background';
export const MEDIA_ASSET_TYPE_SOLUTION_BACKGROUND = 'solution_background';
export const MEDIA_ASSET_TYPE_PRODUCT_BACKGROUND = 'product_background';

export function normalizeBackgroundWrite(mode: string | undefined, value: string | undefined) {
  const nextMode = (mode ?? '') as PartnerCenterBackgroundMode;
  const nextValue = (value ?? '').trim();
  if (!nextMode || !nextValue) {
    return { backgroundMode: '', backgroundValue: '', backgroundImage: '' };
  }
  return {
    backgroundMode: nextMode,
    backgroundValue: nextValue,
    backgroundImage: '',
  };
}

export function getPartnerCenterSolidPreset(id: string) {
  return PARTNER_CENTER_SOLID_PRESETS.find((item) => item.id === id) ?? null;
}

export function getPartnerCenterImagePreset(id: string) {
  return PARTNER_CENTER_IMAGE_PRESETS.find((item) => item.id === id) ?? null;
}

export function resolvePartnerCenterBackgroundDisplay(input: {
  mode: string;
  value: string;
  /** Resolved public URL for upload mode (from media_assets.storage_key) */
  uploadUrl?: string;
  /** Legacy R2 key / URL fallback */
  legacyBackgroundImage?: string;
  /** When unset, fall back to first solid preset for storefront display */
  fallbackSolidWhenEmpty?: boolean;
}): { mode: PartnerCenterBackgroundMode; imageUrl: string; solidCss: string } {
  const mode = (input.mode || '') as PartnerCenterBackgroundMode;
  const value = input.value?.trim() ?? '';

  if (mode === 'solid' && value) {
    const preset = getPartnerCenterSolidPreset(value);
    return { mode: 'solid', imageUrl: '', solidCss: preset?.css ?? PARTNER_CENTER_SOLID_PRESETS[0]?.css ?? '' };
  }
  if (mode === 'preset' && value) {
    const preset = getPartnerCenterImagePreset(value);
    return { mode: 'preset', imageUrl: preset?.fullUrl ?? '', solidCss: '' };
  }
  if (mode === 'upload' && value) {
    return { mode: 'upload', imageUrl: input.uploadUrl ?? '', solidCss: '' };
  }

  const legacy = input.legacyBackgroundImage?.trim() ?? '';
  if (legacy) {
    return { mode: 'upload', imageUrl: legacy, solidCss: '' };
  }

  if (input.fallbackSolidWhenEmpty !== false) {
    const first = PARTNER_CENTER_SOLID_PRESETS[0];
    if (first) {
      return { mode: 'solid', imageUrl: '', solidCss: first.css };
    }
  }

  return { mode: '', imageUrl: '', solidCss: '' };
}

/** Admin list/detail preview: resolve mode/value + public preview URL (no solid fallback). */
export function resolveAdminBackgroundPreview(input: {
  mode: string;
  value: string;
  legacyBackgroundImageKey: string;
  uploadKeyById: Map<string, string>;
  toPublicUrl: (storageKey: string) => string;
}): { mode: PartnerCenterBackgroundMode; value: string; previewUrl: string } {
  const mode = (input.mode ?? '') as PartnerCenterBackgroundMode;
  const value = (input.value ?? '').trim();
  let uploadUrl = '';
  if (mode === 'upload' && value) {
    const key = input.uploadKeyById.get(value);
    uploadUrl = key ? input.toPublicUrl(key) : '';
  }
  const legacyKey = input.legacyBackgroundImageKey?.trim() ?? '';
  const display = resolvePartnerCenterBackgroundDisplay({
    mode,
    value,
    uploadUrl,
    legacyBackgroundImage: legacyKey ? input.toPublicUrl(legacyKey) : '',
    fallbackSolidWhenEmpty: false,
  });
  return {
    mode: (mode || display.mode || '') as PartnerCenterBackgroundMode,
    value,
    previewUrl: display.imageUrl,
  };
}
