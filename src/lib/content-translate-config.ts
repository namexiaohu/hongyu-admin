import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';

export type ContentTranslateType =
  | 'blog'
  | 'faq'
  | 'brand'
  | 'category'
  | 'product'
  | 'feature'
  | 'shippingMethod'
  | 'editorialBoard'
  | 'brandNarrative'
  | 'brandNarrativeBlock'
  | 'brandNarrativeBlockItem'
  | 'solution'
  | 'solutionBlock'
  | 'solutionBlockItem'
  | 'socialMedia'
  | 'companyProfile'
  | 'homepageConfig'
  | 'surgeon'
  | 'partnerCenter'
  | 'summit'
  | 'summitAgendaGroup'
  | 'summitAgendaItem'
  | 'websiteNavColumn'
  | 'websiteNavItem';

type ContentTranslateProfile = {
  sourceFields: readonly string[];
  plainTextFields: readonly string[];
  htmlField?: string;
  passthroughFields?: readonly string[];
  serverLabel: string;
  tooltip: string;
  translateNotes?: string;
};

export const CONTENT_TRANSLATE_PROFILES: Record<ContentTranslateType, ContentTranslateProfile> = {
  blog: {
    sourceFields: [
      'title',
      'category',
      'summary',
      'body',
      'authorName',
      'authorTitle',
      'authorBio',
      'tagsText',
      'seoTitle',
      'seoDescription',
      'relatedProductSlugsText',
    ],
    plainTextFields: [
      'title',
      'category',
      'summary',
      'authorName',
      'authorTitle',
      'authorBio',
      'tagsText',
      'seoTitle',
      'seoDescription',
    ],
    htmlField: 'body',
    passthroughFields: ['relatedProductSlugsText'],
    serverLabel: 'engineering blog article',
    tooltip: '将默认语言已保存的标题、摘要、正文、作者与 SEO 字段翻译到当前语言；Slug 与关联产品 Slug 不会翻译；保留原文排版结构与链接，仅翻译可见文字',
  },
  faq: {
    sourceFields: ['title', 'body', 'seoTitle', 'seoDescription'],
    plainTextFields: ['title', 'seoTitle', 'seoDescription'],
    htmlField: 'body',
    serverLabel: 'FAQ entry',
    tooltip: '将默认语言已保存的问答标题、正文与 SEO 字段翻译到当前语言；Slug 不会翻译；保留原文排版结构与链接，仅翻译可见文字',
  },
  brand: {
    sourceFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    plainTextFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    serverLabel: 'product brand',
    tooltip: '将默认语言已保存的品牌名称、描述与 SEO 字段翻译到当前语言；Slug 不会翻译，翻译后请校对',
  },
  category: {
    sourceFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    plainTextFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    serverLabel: 'product category',
    tooltip: '将默认语言已保存的分类名称、描述与 SEO 字段翻译到当前语言；Slug 不会翻译，翻译后请校对',
  },
  product: {
    sourceFields: [
      'name',
      'badgeText',
      'extraText',
      'shortDescription',
      'description',
      'attachmentsJson',
      'certificationsText',
      'tagsText',
      'seoTitle',
      'seoDescription',
      'statsText',
    ],
    plainTextFields: [
      'name',
      'badgeText',
      'extraText',
      'shortDescription',
      'certificationsText',
      'tagsText',
      'seoTitle',
      'seoDescription',
      'statsText',
    ],
    htmlField: 'description',
    passthroughFields: ['attachmentsJson'],
    serverLabel: 'catalog product',
    tooltip: '将默认语言已保存的产品名称、角标、附加文案、描述、数据指标、认证与 SEO 字段翻译到当前语言，并按汇率换算销售价与原价；附件直接沿用默认语言；封面图、视频与轮播图为各语言共用；Slug 不会翻译；详细描述保留排版结构',
  },
  feature: {
    sourceFields: ['name', 'unit', 'textOptionsText'],
    plainTextFields: ['name', 'unit', 'textOptionsText'],
    serverLabel: 'product feature definition',
    tooltip: '将默认语言已保存的特性名称、单位与可选值翻译到当前语言，Key 与值类型不会翻译',
  },
  shippingMethod: {
    sourceFields: ['name', 'etaLabel', 'note'],
    plainTextFields: ['name', 'etaLabel', 'note'],
    serverLabel: 'shipping method',
    tooltip: '将默认语言已保存的物流方式名称、时效与说明翻译到当前语言；编码不会翻译，翻译后请校对',
  },
  editorialBoard: {
    sourceFields: ['name', 'description'],
    plainTextFields: ['name', 'description'],
    serverLabel: 'editorial coverage board',
    tooltip: '将默认语言已保存的看板名称与说明翻译到当前语言；Key 不会翻译',
  },
  brandNarrative: {
    sourceFields: ['heroTitle', 'heroSlogan', 'heroLead', 'statsText'],
    plainTextFields: ['heroTitle', 'heroSlogan', 'heroLead', 'statsText'],
    serverLabel: 'brand narrative page',
    tooltip: '将默认语言已保存的看板与数据指标覆盖并翻译到当前语言；Slug 与封面图不会翻译，翻译后请校对',
    translateNotes:
      'statsText has one metric per line as LABEL|||VALUE. Translate LABEL only. Keep VALUE exactly, including numbers, units, and +. Keep the same line count and the ||| separator. Do not return a JSON array.',
  },
  brandNarrativeBlock: {
    sourceFields: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
    plainTextFields: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
    serverLabel: 'brand narrative content block',
    tooltip: '将默认语言已填写的区块标题与描述翻译到当前语言，翻译后请校对',
  },
  brandNarrativeBlockItem: {
    sourceFields: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
    plainTextFields: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
    serverLabel: 'brand narrative block item',
    tooltip: '将默认语言已填写的内容项标题与描述翻译到当前语言，翻译后请校对',
  },
  solution: {
    sourceFields: ['heroTitle', 'heroSlogan', 'heroLead', 'badgeText', 'statsText', 'productParamsText', 'tagsText', 'seoTitle', 'seoDescription'],
    plainTextFields: ['heroTitle', 'heroSlogan', 'heroLead', 'badgeText', 'statsText', 'productParamsText', 'tagsText', 'seoTitle', 'seoDescription'],
    serverLabel: 'solution page',
    tooltip: '将默认语言已保存的看板、数据指标、产品参数与标签翻译到当前语言；Slug 与封面图 URL 不会翻译，翻译后请校对',
    translateNotes:
      'statsText and productParamsText have one row per line as LABEL|||VALUE. Translate LABEL only. Keep VALUE exactly. tagsText has one tag per line. Keep the same line count. Do not return a JSON array.',
  },
  solutionBlock: {
    sourceFields: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
    plainTextFields: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
    serverLabel: 'solution content block',
    tooltip: '将默认语言已填写的区块标题与描述翻译到当前语言，翻译后请校对',
  },
  solutionBlockItem: {
    sourceFields: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
    plainTextFields: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
    serverLabel: 'solution block item',
    tooltip: '将默认语言已填写的内容项标题与描述翻译到当前语言，翻译后请校对',
  },
  socialMedia: {
    sourceFields: ['featuredPostsText'],
    plainTextFields: ['featuredPostsText'],
    serverLabel: 'social media featured posts',
    tooltip: '将默认语言已保存的精选内容（角标、标题、描述）翻译到当前语言；封面图与链接直接沿用默认语言',
    translateNotes:
      'featuredPostsText has one post per line as BADGE|||TITLE|||DESCRIPTION. Translate BADGE, TITLE, and DESCRIPTION only. Keep the same line count and the ||| separator. Do not return a JSON array.',
  },
  companyProfile: {
    sourceFields: [
      'companyName',
      'slogan',
      'positioning',
      'copyright',
      'contactPhone',
      'address',
      'businessHours',
      'businessHotline',
      'basicInfoText',
      'executivesText',
      'managersText',
      'officesText',
    ],
    plainTextFields: [
      'companyName',
      'slogan',
      'positioning',
      'copyright',
      'contactPhone',
      'address',
      'businessHours',
      'businessHotline',
      'basicInfoText',
      'executivesText',
      'managersText',
      'officesText',
    ],
    serverLabel: 'company profile page',
    tooltip: '将默认语言已保存的企业资料翻译到当前语言；办公地点封面图与公开文件直接沿用默认语言',
    translateNotes:
      'basicInfoText uses LABEL|||VALUE per line. executivesText and managersText use TITLE|||NAME per line. officesText uses NAME|||LOCATION|||PHONE|||CONTACT|||EMAIL per line. Translate human-readable text only; keep numbers, emails, and ||| separators.',
  },
  homepageConfig: {
    sourceFields: [
      'bannerTitle',
      'bannerSubtitle',
      'bannerDescription',
      'solutionsTitle',
      'solutionsDescription',
      'aboutTitle',
      'aboutDescription',
      'globalTitle',
      'globalDescription',
      'educationTitle',
      'educationDescription',
      'statsText',
      'educationText',
    ],
    plainTextFields: [
      'bannerTitle',
      'bannerSubtitle',
      'bannerDescription',
      'solutionsTitle',
      'solutionsDescription',
      'aboutTitle',
      'aboutDescription',
      'globalTitle',
      'globalDescription',
      'educationTitle',
      'educationDescription',
      'statsText',
      'educationText',
    ],
    serverLabel: 'homepage configuration',
    tooltip: '将默认语言已保存的首页文案翻译到当前语言；轮播媒体、资讯封面与链接直接沿用默认语言',
    translateNotes:
      'statsText uses TITLE|||SUBTITLE|||DESCRIPTION per line. educationText uses TITLE|||DESCRIPTION|||BADGE|||EXTRA per line. Keep line count and ||| separators. Do not translate URLs or image paths.',
  },
  surgeon: {
    sourceFields: [
      'name',
      'position',
      'institution',
      'expertise',
      'experience',
      'gradeTitle',
      'detailDescription',
      'tagsText',
      'otherCertificationsText',
      'specialtiesText',
    ],
    plainTextFields: [
      'name',
      'position',
      'institution',
      'expertise',
      'experience',
      'gradeTitle',
      'tagsText',
      'otherCertificationsText',
      'specialtiesText',
    ],
    htmlField: 'detailDescription',
    serverLabel: 'certified surgeon profile',
    tooltip: '将默认语言已保存的术者资料、详细描述、其他认证信息、专业方向与标签翻译到当前语言，翻译后请校对',
    translateNotes:
      'detailDescription is HTML rich text — preserve structure. otherCertificationsText has one row per line as LABEL|||VALUE. Translate LABEL only. Keep VALUE exactly. specialtiesText and tagsText have one item per line. Keep the same line count.',
  },
  partnerCenter: {
    sourceFields: [
      'name',
      'badgeText',
      'location',
      'description',
      'detailDescription',
      'address',
      'businessHours',
      'contact',
      'tagsText',
      'statsText',
      'cooperationInfoText',
    ],
    plainTextFields: [
      'name',
      'badgeText',
      'location',
      'description',
      'address',
      'businessHours',
      'contact',
      'tagsText',
      'statsText',
      'cooperationInfoText',
    ],
    htmlField: 'detailDescription',
    serverLabel: 'partner center profile',
    tooltip: '将默认语言已保存的合作中心简介、详细描述、数据指标、合作信息与标签翻译到当前语言；邮箱、网址、封面、Logo、大背景图与关联术者为各语言共用，无需翻译',
    translateNotes:
      'detailDescription is HTML rich text — preserve structure. statsText and cooperationInfoText have one row per line as LABEL|||VALUE. Translate LABEL only. Keep VALUE exactly. tagsText has one tag per line. Keep the same line count.',
  },
  summit: {
    sourceFields: ['title', 'description', 'detailDescription', 'scale', 'duration', 'location', 'address', 'transportation', 'statsText', 'speakersText', 'sponsorsText'],
    plainTextFields: ['title', 'description', 'scale', 'duration', 'location', 'address', 'transportation', 'statsText', 'speakersText', 'sponsorsText'],
    htmlField: 'detailDescription',
    serverLabel: 'industry summit page',
    tooltip: '将默认语言已保存的峰会资料与嘉宾信息翻译到当前语言；封面与嘉宾头像直接沿用默认语言',
    translateNotes:
      'detailDescription is HTML rich text — preserve structure. statsText has one row per line as LABEL|||VALUE. Translate LABEL only. Keep VALUE exactly. speakersText has one speaker per line as NAME|||REGION|||BIO|||BADGE|||EXPERTISE. Translate those text fields only; keep the same line count and ||| separator; avatar and description HTML follow the default locale. sponsorsText has one sponsor per line as NAME|||BADGE|||INTRO. Translate those text fields only; tier and logo follow the default locale.',
  },
  summitAgendaGroup: {
    sourceFields: ['dayLabel', 'groupTitle'],
    plainTextFields: ['dayLabel', 'groupTitle'],
    serverLabel: 'summit agenda group',
    tooltip: '将默认语言已填写的议程分组时间文案与标题翻译到当前语言，翻译后请校对',
  },
  summitAgendaItem: {
    sourceFields: ['title', 'desc', 'speaker'],
    plainTextFields: ['title', 'desc', 'speaker'],
    serverLabel: 'summit agenda item',
    tooltip: '将默认语言已填写的议程环节标题、描述与演讲人翻译到当前语言，翻译后请校对',
  },
  websiteNavColumn: {
    sourceFields: ['name'],
    plainTextFields: ['name'],
    serverLabel: 'website navigation column',
    tooltip: '将默认语言已填写的导航栏目标题翻译到当前语言，翻译后请校对',
  },
  websiteNavItem: {
    sourceFields: ['name'],
    plainTextFields: ['name'],
    serverLabel: 'website navigation item',
    tooltip: '将默认语言已填写的导航条目标题翻译到当前语言，翻译后请校对',
  },
};

export function pickTranslatePayload(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): Record<string, string> {
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const passthrough = new Set(profile.passthroughFields ?? []);
  const payload: Record<string, string> = {};
  for (const key of profile.sourceFields) {
    if (passthrough.has(key)) continue;
    const value = fields[key];
    if (!value?.trim()) continue;
    if (key === profile.htmlField) {
      if (hasMeaningfulHtmlBody(value)) payload[key] = value;
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

/** 将无需翻译的透传字段（图片/文件 URL 等）从默认语言源值合并进翻译结果。 */
export function mergePassthroughFromSource(
  contentType: ContentTranslateType,
  sourceFields: Record<string, string>,
  translatedFields: Record<string, string>,
): Record<string, string> {
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const next = { ...translatedFields };
  for (const key of profile.passthroughFields ?? []) {
    const value = sourceFields[key];
    if (value?.trim()) next[key] = value;
  }
  return next;
}

/** 丢弃空字符串；富文本字段需有实质内容才保留。 */
export function filterNonemptyTranslateFields(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): Record<string, string> {
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!value?.trim()) continue;
    if (key === profile.htmlField) {
      if (hasMeaningfulHtmlBody(value)) result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** 仅将非空翻译结果合并进当前草稿，避免空字符串覆盖已有内容。 */
export function applyNonemptyTranslatedFields<T extends Record<string, unknown>>(
  current: T,
  translated: Record<string, string>,
): T {
  const next = { ...current };
  for (const [key, value] of Object.entries(translated)) {
    if (value?.trim()) {
      (next as Record<string, string>)[key] = value;
    }
  }
  return next;
}

export function validateDefaultTranslateSource(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): string | null {
  if (contentType === 'blog' || contentType === 'faq') {
    const titleKey = contentType === 'blog' ? 'title' : 'title';
    if (!fields[titleKey]?.trim()) {
      return '默认语言内容不完整，请先完善标题与正文';
    }
    if (!hasMeaningfulHtmlBody(fields.body ?? '')) {
      return '默认语言内容不完整，请先完善标题与正文';
    }
    return null;
  }

  if (contentType === 'brandNarrative' || contentType === 'solution') {
    if (!fields.heroTitle?.trim()) {
      return '默认语言内容不完整，请先完善标题';
    }
    return null;
  }

  if (contentType === 'summit') {
    if (!fields.title?.trim()) {
      return '默认语言内容不完整，请先完善标题';
    }
    return null;
  }

  if (contentType === 'socialMedia') {
    if (!fields.featuredPostsText?.trim()) {
      return '默认语言内容不完整，请先完善精选内容';
    }
    return null;
  }

  if (contentType === 'companyProfile') {
    if (!fields.companyName?.trim()) {
      return '默认语言内容不完整，请先完善企业名称';
    }
    return null;
  }

  if (contentType === 'homepageConfig') {
    if (!fields.bannerTitle?.trim() && !fields.solutionsTitle?.trim() && !fields.aboutTitle?.trim()) {
      return '默认语言内容不完整，请先完善首页文案';
    }
    return null;
  }

  if (contentType === 'surgeon' || contentType === 'partnerCenter') {
    if (!fields.name?.trim()) {
      return '默认语言内容不完整，请先完善名称';
    }
    return null;
  }

  if (contentType === 'summitAgendaGroup') {
    if (!fields.dayLabel?.trim() && !fields.groupTitle?.trim()) {
      return '默认语言内容不完整，请先完善分组文案';
    }
    return null;
  }

  if (contentType === 'summitAgendaItem') {
    if (!fields.title?.trim() && !fields.desc?.trim() && !fields.speaker?.trim()) {
      return '默认语言内容不完整，请先完善环节文案';
    }
    return null;
  }

  if (contentType === 'websiteNavColumn' || contentType === 'websiteNavItem') {
    if (!fields.name?.trim()) {
      return '默认语言内容不完整，请先填写名称';
    }
    return null;
  }

  if (
    contentType === 'brandNarrativeBlock'
    || contentType === 'brandNarrativeBlockItem'
    || contentType === 'solutionBlock'
    || contentType === 'solutionBlockItem'
  ) {
    if (
      !fields.smallTitle?.trim()
      && !fields.largeTitle?.trim()
      && !fields.description?.trim()
      && !fields.buttonLabel?.trim()
    ) {
      return '默认语言内容不完整，请先完善区块文案';
    }
    return null;
  }

  if (!fields.name?.trim()) {
    return '默认语言内容不完整，请先完善名称';
  }

  return null;
}

export function getHtmlContentLabel(contentType: ContentTranslateType): string {
  switch (contentType) {
    case 'blog':
      return 'engineering blog article body';
    case 'faq':
      return 'FAQ answer body';
    case 'product':
      return 'product detail description HTML';
    default:
      return 'rich text body';
  }
}
