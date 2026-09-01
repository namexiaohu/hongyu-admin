import { z } from 'zod';

import { heroCopyStyleSchema, type HeroCopyStyle } from '@/lib/hero-copy-style';
import {
  heroBackgroundFitModeSchema,
  type HeroBackgroundFitMode,
} from '@/lib/hero-background-fit';

export type HomepageMediaSlide = {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
};

export type HomepageStatItem = {
  title: string;
  subtitle: string;
  description: string;
};

export type HomepageEducationItem = {
  title: string;
  description: string;
  badgeText: string;
  extraText: string;
  href: string;
  coverImage: string;
};

export type HomepageSolutionItem = {
  title: string;
  description: string;
  badgeText: string;
  coverImage: string;
  href: string;
};

export type AdminHomepageConfigTranslation = {
  id: string;
  configId: string;
  locale: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerDescription: string;
  solutionsTitle: string;
  solutionsDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  stats: HomepageStatItem[];
  globalTitle: string;
  globalDescription: string;
  educationTitle: string;
  educationDescription: string;
  educationItems: HomepageEducationItem[];
  solutionItems: HomepageSolutionItem[];
  createdAt: string;
  updatedAt: string;
};

export type AdminHomepageConfig = {
  id: string;
  bannerSlides: HomepageMediaSlide[];
  aboutSlides: HomepageMediaSlide[];
  bannerHeroCopyStyle: HeroCopyStyle;
  aboutHeroCopyStyle: HeroCopyStyle;
  bannerCarouselFitMode: HeroBackgroundFitMode;
  aboutCarouselFitMode: HeroBackgroundFitMode;
  translations: AdminHomepageConfigTranslation[];
  createdAt: string;
  updatedAt: string;
};

export type StorefrontHomepageConfig = {
  locale: string;
  bannerSlides: HomepageMediaSlide[];
  aboutSlides: HomepageMediaSlide[];
  bannerHeroCopyStyle: HeroCopyStyle;
  aboutHeroCopyStyle: HeroCopyStyle;
  bannerCarouselFitMode: HeroBackgroundFitMode;
  aboutCarouselFitMode: HeroBackgroundFitMode;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerDescription: string;
  solutionsTitle: string;
  solutionsDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  stats: HomepageStatItem[];
  globalTitle: string;
  globalDescription: string;
  educationTitle: string;
  educationDescription: string;
  educationItems: HomepageEducationItem[];
  solutionItems: HomepageSolutionItem[];
};

const mediaSlideSchema = z.object({
  id: z.string().optional().default(''),
  url: z.string().optional().default(''),
  mediaType: z.enum(['image', 'video']).optional().default('image'),
});

const statItemSchema = z.object({
  title: z.string().optional().default(''),
  subtitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

const educationItemSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  extraText: z.string().optional().default(''),
  href: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
});

const solutionItemSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
  href: z.string().optional().default(''),
});

export const adminHomepageTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  bannerTitle: z.string().optional().default(''),
  bannerSubtitle: z.string().optional().default(''),
  bannerDescription: z.string().optional().default(''),
  solutionsTitle: z.string().optional().default(''),
  solutionsDescription: z.string().optional().default(''),
  aboutTitle: z.string().optional().default(''),
  aboutDescription: z.string().optional().default(''),
  stats: z.array(statItemSchema).optional().default([]),
  globalTitle: z.string().optional().default(''),
  globalDescription: z.string().optional().default(''),
  educationTitle: z.string().optional().default(''),
  educationDescription: z.string().optional().default(''),
  educationItems: z.array(educationItemSchema).optional().default([]),
  solutionItems: z.array(solutionItemSchema).optional().default([]),
});

export const adminHomepageConfigPutSchema = z.object({
  bannerSlides: z.array(mediaSlideSchema).optional().default([]),
  aboutSlides: z.array(mediaSlideSchema).optional().default([]),
  bannerHeroCopyStyle: heroCopyStyleSchema.optional().default('light'),
  aboutHeroCopyStyle: heroCopyStyleSchema.optional().default('dark'),
  bannerCarouselFitMode: heroBackgroundFitModeSchema.optional().default('contain'),
  aboutCarouselFitMode: heroBackgroundFitModeSchema.optional().default('contain-center'),
  translations: z.array(adminHomepageTranslationSchema).optional().default([]),
});

export type AdminHomepageConfigPutInput = z.infer<typeof adminHomepageConfigPutSchema>;

export function compactMediaSlides(rows: HomepageMediaSlide[] | undefined): HomepageMediaSlide[] {
  return (rows ?? [])
    .map((row, index) => ({
      id: row.id?.trim() || `slide-${index + 1}`,
      url: row.url?.trim() ?? '',
      mediaType: row.mediaType === 'video' ? 'video' as const : 'image' as const,
    }))
    .filter((row) => row.url);
}

export function compactStatItems(rows: HomepageStatItem[] | undefined): HomepageStatItem[] {
  return (rows ?? [])
    .map((row) => ({
      title: row.title?.trim() ?? '',
      subtitle: row.subtitle?.trim() ?? '',
      description: row.description?.trim() ?? '',
    }))
    .filter((row) => row.title || row.subtitle || row.description);
}

export function compactEducationItems(rows: HomepageEducationItem[] | undefined): HomepageEducationItem[] {
  return (rows ?? [])
    .map((row) => ({
      title: row.title?.trim() ?? '',
      description: row.description?.trim() ?? '',
      badgeText: row.badgeText?.trim() ?? '',
      extraText: row.extraText?.trim() ?? '',
      href: row.href?.trim() ?? '',
      coverImage: row.coverImage?.trim() ?? '',
    }))
    .filter((row) => row.title || row.description || row.badgeText || row.extraText || row.href || row.coverImage);
}

export function compactSolutionItems(rows: HomepageSolutionItem[] | undefined): HomepageSolutionItem[] {
  return (rows ?? [])
    .map((row) => ({
      title: row.title?.trim() ?? '',
      description: row.description?.trim() ?? '',
      badgeText: row.badgeText?.trim() ?? '',
      coverImage: row.coverImage?.trim() ?? '',
      href: row.href?.trim() ?? '',
    }))
    .filter((row) => row.title || row.description || row.badgeText || row.coverImage || row.href);
}

export function homepageTranslationHasContent(input: {
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerDescription?: string;
  solutionsTitle?: string;
  solutionsDescription?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  stats?: HomepageStatItem[];
  globalTitle?: string;
  globalDescription?: string;
  educationTitle?: string;
  educationDescription?: string;
  educationItems?: HomepageEducationItem[];
  solutionItems?: HomepageSolutionItem[];
}) {
  return Boolean(
    input.bannerTitle?.trim()
    || input.bannerSubtitle?.trim()
    || input.bannerDescription?.trim()
    || input.solutionsTitle?.trim()
    || input.solutionsDescription?.trim()
    || input.aboutTitle?.trim()
    || input.aboutDescription?.trim()
    || input.globalTitle?.trim()
    || input.globalDescription?.trim()
    || input.educationTitle?.trim()
    || input.educationDescription?.trim()
    || compactStatItems(input.stats).length
    || compactEducationItems(input.educationItems).length
    || compactSolutionItems(input.solutionItems).length,
  );
}

export function createSlideId() {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Default content mirrored from the previous static homepage. */
export function getDefaultHomepageBannerSlides(): HomepageMediaSlide[] {
  return [
    { id: 'banner-1', url: '/hero/banner0.mp4', mediaType: 'video' },
    { id: 'banner-2', url: '/hero/2.jpg', mediaType: 'image' },
    { id: 'banner-3', url: '/hero/3.jpg', mediaType: 'image' },
    { id: 'banner-4', url: '/hero/4.jpg', mediaType: 'image' },
  ];
}

export function getDefaultHomepageAboutSlides(): HomepageMediaSlide[] {
  return [
    { id: 'about-1', url: '/images/vet-1.jpg', mediaType: 'image' },
    { id: 'about-2', url: '/images/vet-2.jpg', mediaType: 'image' },
    { id: 'about-3', url: '/images/vet-3.jpg', mediaType: 'image' },
    { id: 'about-4', url: '/images/vet-4.jpg', mediaType: 'image' },
    { id: 'about-5', url: '/images/vet-5.jpg', mediaType: 'image' },
  ];
}

export function getDefaultHomepageZhTranslation() {
  return {
    bannerTitle: '引领宠物医疗\n器械创新',
    bannerSubtitle: 'Pioneering Veterinary Medical Innovation',
    bannerDescription:
      '专注于动物外科器械研发与制造，以精密工程技术赋能全球兽医学发展，为伴侣动物生命健康提供可靠保障。',
    solutionsTitle: '核心技术产品矩阵',
    solutionsDescription: '覆盖动物外科、心血管、运动医学三大领域，持续推动行业技术迭代。',
    aboutTitle: '以工程技术守护\n动物生命健康',
    aboutDescription:
      '竑宇医疗成立于动物医疗科技领域，致力于将精密工程技术与兽医学深度融合。从材料科学到机械设计，从临床验证到全球推广，每一步都以更高的手术精度和更好的术后预后为目标。\n我们拥有自主核心技术专利体系，产品通过多项国际认证，与全球数十家顶尖动物医院及研究机构建立深度合作，持续推动宠物医疗器械行业的技术升级。',
    stats: [
      {
        title: '12',
        subtitle: '年',
        description: '深耕动物医疗器械研发，持续推动行业技术迭代与标准化进程。',
      },
      {
        title: '98',
        subtitle: '%',
        description: '产品一次合格率，依托全链路质量管控体系确保每件器械的可靠性。',
      },
      {
        title: '200K',
        subtitle: '+',
        description: '累计服务手术案例，覆盖犬、猫及多种伴侣动物的临床应用场景。',
      },
    ] satisfies HomepageStatItem[],
    globalTitle: '构建全球化合作网络',
    globalDescription: '以认证术者体系与合作中心为支点，将前沿技术带入全球临床实践。',
    educationTitle: '赋能兽医专业能力成长',
    educationDescription: '从在线课程到线下实操培训，构建全周期持续教育体系。',
    educationItems: [
      {
        title: 'V-CLAMP 标准操作全流程',
        description: '系统讲解器械原理、操作步骤与并发症处理，适合初中级术者学习。',
        badgeText: '录播课程',
        extraText: '随到随学 · 12 个模块 · 结业证书',
        href: '/course',
        coverImage: '/images/edu-1.jpg',
      },
      {
        title: '认证术者进阶工作坊',
        description: '线下实操训练 + 病例讨论，由资深术者带教，完成考核后获得认证资质。',
        badgeText: '培训计划',
        extraText: '两日集训 · 导师带教 · 考核认证',
        href: '/training',
        coverImage: '/images/edu-2.jpg',
      },
      {
        title: '竑宇医疗年度学术大会',
        description: '汇聚全球兽医学者，分享最新临床研究成果与技术发展趋势。',
        badgeText: '行业峰会',
        extraText: '年度盛会 · 现场病例 · 继续教育学分',
        href: '/summit',
        coverImage: '/images/edu-3.jpg',
      },
    ] satisfies HomepageEducationItem[],
    solutionItems: [] satisfies HomepageSolutionItem[],
  };
}

/** English source copy imported from hongyutest homepage (translated from live ZH). */
export function getDefaultHomepageEnTranslation() {
  return {
    bannerTitle: 'Pioneering Veterinary\nMedical Innovation',
    bannerSubtitle: '',
    bannerDescription:
      'Focused on R&D and manufacturing of veterinary surgical instruments, we empower global veterinary medicine with precision engineering to safeguard companion animal health.',
    solutionsTitle: 'Core Technology Product Portfolio',
    solutionsDescription:
      'Covering animal surgery, cardiovascular care, and sports medicine — continuously driving industry technology advancement.',
    aboutTitle: 'Protecting Animal Lives\nThrough Engineering',
    aboutDescription:
      'Hongyu Medical was founded in veterinary medical technology, dedicated to deeply integrating precision engineering with veterinary science. From materials science to mechanical design, from clinical validation to global adoption, every step aims for higher surgical precision and better postoperative outcomes.\nWe hold an independent core patent portfolio. Our products carry multiple international certifications and collaborate with dozens of leading animal hospitals and research institutions worldwide, continuously advancing veterinary medical device technology.',
    stats: [
      {
        title: '12',
        subtitle: 'yrs',
        description:
          'Years of focused veterinary device R&D, continuously advancing industry technology and standardization.',
      },
      {
        title: '98',
        subtitle: '%',
        description:
          'First-pass product yield, backed by end-to-end quality control that ensures reliability for every instrument.',
      },
      {
        title: '200K',
        subtitle: '+',
        description:
          'Cumulative surgical cases served across dogs, cats, and other companion animal clinical scenarios.',
      },
    ] satisfies HomepageStatItem[],
    globalTitle: 'Building a Global Collaboration Network',
    globalDescription:
      'Anchored by our certified surgeon network and partner centers, we bring advanced technology into clinical practice worldwide.',
    educationTitle: 'Empowering Professional Growth for Veterinarians',
    educationDescription:
      'From online courses to hands-on practical training, we build a full-cycle continuing education system.',
    educationItems: [
      {
        title: 'V-CLAMP Standard Operating Workflow',
        description:
          'A systematic course on instrument principles, operating steps, and complication management for beginner to intermediate surgeons.',
        badgeText: 'Recorded Course',
        extraText: 'Self-paced · 12 modules · Completion certificate',
        href: '/course',
        coverImage: '/images/edu-1.jpg',
      },
      {
        title: 'Certified Surgeon Advanced Workshop',
        description:
          'Hands-on training plus case discussion, mentored by senior surgeons. Certification is awarded upon successful assessment.',
        badgeText: 'Training Program',
        extraText: '2-day intensive · Mentored practice · Certification exam',
        href: '/training',
        coverImage: '/images/edu-2.jpg',
      },
      {
        title: 'Hongyu Medical Annual Academic Summit',
        description:
          'Bringing together veterinary experts worldwide to share the latest clinical research and technology trends.',
        badgeText: 'Industry Summit',
        extraText: 'Annual gathering · Live cases · CME-eligible sessions',
        href: '/summit',
        coverImage: '/images/edu-3.jpg',
      },
    ] satisfies HomepageEducationItem[],
    solutionItems: [] satisfies HomepageSolutionItem[],
  };
}

export function getDefaultHomepageTranslationForLocale(locale: string) {
  const code = locale.trim().toLowerCase();
  if (code === 'en' || code.startsWith('en-')) {
    return getDefaultHomepageEnTranslation();
  }
  if (code === 'zh' || code.startsWith('zh-')) {
    return getDefaultHomepageZhTranslation();
  }
  // Fallback: English as the source of truth for other locales until translated.
  return getDefaultHomepageEnTranslation();
}

export const EMPTY_STOREFRONT_HOMEPAGE: StorefrontHomepageConfig = {
  locale: '',
  bannerSlides: [],
  aboutSlides: [],
  bannerHeroCopyStyle: 'light',
  aboutHeroCopyStyle: 'dark',
  bannerCarouselFitMode: 'contain',
  aboutCarouselFitMode: 'contain-center',
  bannerTitle: '',
  bannerSubtitle: '',
  bannerDescription: '',
  solutionsTitle: '',
  solutionsDescription: '',
  aboutTitle: '',
  aboutDescription: '',
  stats: [],
  globalTitle: '',
  globalDescription: '',
  educationTitle: '',
  educationDescription: '',
  educationItems: [],
  solutionItems: [],
};
