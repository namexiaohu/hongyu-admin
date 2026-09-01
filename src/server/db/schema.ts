// Summit jsonb types
export type AgendaItemLocaleCopy = {
  title: string;
  desc: string;
  speaker: string;
};

export type AgendaItem = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  desc: string;
  speaker: string;
  locales?: Record<string, AgendaItemLocaleCopy>;
};

export type AgendaGroupLocaleCopy = {
  dayLabel: string;
  groupTitle: string;
};

export type AgendaGroup = {
  id: string;
  dayLabel: string;
  groupTitle: string;
  items: AgendaItem[];
  locales?: Record<string, AgendaGroupLocaleCopy>;
};

export type SpeakerItem = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string;
  region?: string;
  badgeText?: string;
  description?: string;
};

export type SponsorItem = {
  id: string;
  tier: 'diamond' | 'gold' | 'silver';
  name: string;
  logo: string;
  badgeText: string;
  intro: string;
};

export type SummitStat = {
  label: string;
  value: string;
};

import {
  type AnyPgColumn,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { ShippingCountryRateConfig, VolumePricingRuleConfig } from '@/lib/commerce-config';
import type { EditorialContentPayload } from '@/lib/editorial-content';
import type { VerificationDocument } from '@/lib/customer-profile';
import type { BrandNarrativeBlockDraft } from '@/lib/brand-narrative-blocks';
import type { BrandNarrativeStat } from '@/lib/brand-narrative-content';
import type {
  CompanyLabelValue,
  CompanyOffice,
  CompanyPublicFile,
  CompanyTeamMember,
} from '@/lib/company-profile';
import type {
  HomepageEducationItem,
  HomepageMediaSlide,
  HomepageSolutionItem,
  HomepageStatItem,
} from '@/lib/homepage-config';
import type { NavColumn } from '@/lib/website-config';
import type { ListHeroBoardsRecord } from '@/lib/list-hero-board';
import type { HeroCoverDisplay } from '@/lib/hero-cover-display';
import type {
  FeaturedPost,
  OverseasContact,
  SocialChannel,
} from '@/lib/social-media';
import type { AdminProductPayload, ProductGalleryImage, ProductStat } from '@/lib/product-content';
import type { SolutionBlockDraft } from '@/lib/solution-blocks';
import type { SolutionMaterial, SolutionProductParam, SolutionStat } from '@/lib/solution-content';
import type { PartnerCenterMetric } from '@/lib/partner-center-content';
import type { ProductCoverageBoard } from '@/lib/product-boards';
import type { SurgeonMetric } from '@/lib/surgeon-content';
import type { AcademyStat } from '@/lib/academy-content-shared';
import type { AcademyLessonMaterial } from '@/lib/academy-lesson-content';
import type { AcademyQuestionContent } from '@/lib/academy-question-content';
import {
  defaultEditorialAutomationConfig,
  type EditorialAiTemplate,
  type EditorialAutomationRule,
  type EditorialCoverageBoard,
  type EditorialBrief,
  type EditorialGenerationRun,
  type EditorialWorkflowSettings,
} from '@/lib/editorial-automation';

export const userRoleEnum = pgEnum('user_role', ['customer', 'staff', 'admin']);
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'super_admin']);
export const adminStatusEnum = pgEnum('admin_status', ['active', 'disabled']);
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled', 'pending']);
export const categoryStatusEnum = pgEnum('category_status', ['active', 'inactive']);
export const brandStatusEnum = pgEnum('brand_status', ['active', 'inactive']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'inactive', 'archived']);
export const purchaseModeEnum = pgEnum('purchase_mode', ['buy', 'inquiry']);
export const simpleStatusEnum = pgEnum('simple_status', ['active', 'inactive']);
export const cartStatusEnum = pgEnum('cart_status', ['active', 'converted', 'abandoned']);
export const orderStatusEnum = pgEnum('order_status', ['unpaid', 'pending_processing', 'partially_shipped', 'shipped', 'completed', 'cancelled', 'terminated']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid']);
export const shippingStatusEnum = pgEnum('shipping_status', ['unshipped', 'shipped', 'delivered']);
export const refundStatusEnum = pgEnum('refund_status', ['none', 'pending', 'refunded', 'partially_refunded', 'refund_rejected']);
export const refundTypeEnum = pgEnum('refund_type', ['full_refund', 'partial_refund', 'no_refund']);
export const returnTypeEnum = pgEnum('return_type', ['return_goods', 'no_return']);
export const orderActionTypeEnum = pgEnum('order_action_type', ['status_change', 'shipment_added', 'refund_processed', 'terminated', 'note_updated', 'completed']);
export const inquiryStatusEnum = pgEnum('inquiry_status', ['new', 'contacted', 'quoted', 'closed']);
export const inquiryQueueKindEnum = pgEnum('inquiry_queue_kind', ['new_inquiry', 'customer_replied']);
export const inquirySalesStatusEnum = pgEnum('inquiry_sales_status', ['unset', 'following', 'negotiating', 'won', 'lost']);
export const inquiryMessageSenderTypeEnum = pgEnum('inquiry_message_sender_type', ['customer', 'admin']);
export const contentStatusEnum = pgEnum('content_status', ['active', 'inactive']);
export const cmsStatusEnum = pgEnum('cms_status', ['draft', 'published', 'archived']);
export const newsletterStatusEnum = pgEnum('newsletter_status', ['subscribed', 'unsubscribed']);
export const accountTypeEnum = pgEnum('account_type', ['oauth', 'oidc', 'email', 'credentials']);
export const customerMessageSenderTypeEnum = pgEnum('customer_message_sender_type', ['admin', 'customer']);
export const editorialContentTypeEnum = pgEnum('editorial_content_type', ['content']);
export const editorialContentModuleEnum = pgEnum('editorial_content_module', ['editorial', 'faq']);
export const productRelationTypeEnum = pgEnum('product_relation_type', ['drivers', 'mechanical-integration', 'power-control', 'custom']);
export const textDirectionEnum = pgEnum('text_direction', ['ltr', 'rtl']);
export const geoDivisionLevelEnum = pgEnum('geo_division_level', ['country', 'admin1', 'admin2', 'admin3', 'locality', 'postal']);
export const couponStatusEnum = pgEnum('coupon_status', ['active', 'inactive']);
export const couponScopeEnum = pgEnum('coupon_scope', ['all', 'category', 'brand', 'product']);
export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', ['direct_amount', 'percent', 'fixed_amount', 'special_price']);
export const couponGrantSourceEnum = pgEnum('coupon_grant_source', ['admin_send', 'registration', 'self_claim']);
export const couponDistributionTargetModeEnum = pgEnum('coupon_distribution_target_mode', ['all_customers', 'selected_customers']);
export const academyQuestionTypeEnum = pgEnum('academy_question_type', ['single_choice', 'multiple_choice', 'true_false', 'fill_blank']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 32 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    company: varchar('company', { length: 150 }),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: text('avatar_url'),
    jobTitle: varchar('job_title', { length: 100 }),
    industry: varchar('industry', { length: 80 }),
    companyCountryCode: varchar('company_country_code', { length: 2 }),
    companyState: varchar('company_state', { length: 100 }),
    companyCity: varchar('company_city', { length: 100 }),
    companyAddressLine1: varchar('company_address_line1', { length: 255 }),
    companyAddressLine2: varchar('company_address_line2', { length: 255 }),
    companyPostalCode: varchar('company_postal_code', { length: 30 }),
    website: varchar('website', { length: 255 }),
    taxId: varchar('tax_id', { length: 100 }),
    companySize: varchar('company_size', { length: 50 }),
    annualVolumeEstimate: varchar('annual_volume_estimate', { length: 255 }),
    internalNote: text('internal_note'),
    verificationDocuments: jsonb('verification_documents').$type<VerificationDocument[]>().notNull().default([]),
    role: userRoleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    industryIdx: index('users_industry_idx').on(table.industry),
    companyCountryCodeIdx: index('users_company_country_code_idx').on(table.companyCountryCode),
    statusIdx: index('users_status_idx').on(table.status),
  }),
);

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 32 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    role: adminRoleEnum('role').notNull().default('admin'),
    status: adminStatusEnum('status').notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('admins_email_unique').on(table.email),
  }),
);

export const customerMessages = pgTable('customer_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderType: customerMessageSenderTypeEnum('sender_type').notNull(),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: accountTypeEnum('type').notNull(),
    provider: varchar('provider', { length: 100 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 191 }).notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerUnique: uniqueIndex('accounts_provider_unique').on(table.provider, table.providerAccountId),
  }),
);

export const siteLanguages = pgTable(
  'site_languages',
  {
    code: varchar('code', { length: 16 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    nativeName: varchar('native_name', { length: 120 }).notNull(),
    region: varchar('region', { length: 80 }).notNull(),
    direction: textDirectionEnum('direction').notNull().default('ltr'),
    countryCodes: jsonb('country_codes').$type<string[]>().notNull().default([]),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    status: simpleStatusEnum('status').notNull().default('active'),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusSortIdx: index('site_languages_status_sort_idx').on(table.status, table.sortOrder),
    defaultIdx: index('site_languages_default_idx').on(table.isDefault),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('sessions_token_unique').on(table.sessionToken),
  }),
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token], name: 'verification_tokens_pk' }),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
    imageUrl: text('image_url'),
    status: categoryStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredOrder: integer('featured_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    featuredIdx: index('categories_featured_idx').on(table.isFeatured, table.featuredOrder),
    parentIdx: index('categories_parent_id_idx').on(table.parentId),
  }),
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    payload: jsonb('payload').$type<{ tags: string[] }>().notNull().default({ tags: [] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryLocaleUnique: uniqueIndex('category_translations_category_locale_unique').on(table.categoryId, table.locale),
    slugLocaleUnique: uniqueIndex('category_translations_slug_locale_unique').on(table.slug, table.locale),
    categoryIdIdx: index('category_translations_category_id_idx').on(table.categoryId),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    logoUrl: text('logo_url'),
    websiteUrl: text('website_url'),
    status: brandStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('brands_status_idx').on(table.status),
  }),
);

export const brandTranslations = pgTable(
  'brand_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    payload: jsonb('payload').$type<{ tags: string[] }>().notNull().default({ tags: [] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandLocaleUnique: uniqueIndex('brand_translations_brand_locale_unique').on(table.brandId, table.locale),
    slugLocaleUnique: uniqueIndex('brand_translations_slug_locale_unique').on(table.slug, table.locale),
    brandIdIdx: index('brand_translations_brand_id_idx').on(table.brandId),
  }),
);

export const featureDefinitions = pgTable(
  'feature_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 120 }).notNull(),
    specCategory: varchar('spec_category', { length: 50 }).notNull().default('general'),
    valueType: varchar('value_type', { length: 20 }).notNull().default('text'),
    unit: varchar('unit', { length: 50 }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex('feature_definitions_key_unique').on(table.key),
    statusIdx: index('feature_definitions_status_idx').on(table.status),
  }),
);

export const featureDefinitionTranslations = pgTable(
  'feature_definition_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    definitionId: uuid('definition_id').notNull().references(() => featureDefinitions.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    valueText: varchar('value_text', { length: 255 }),
    valueMin: numeric('value_min', { precision: 12, scale: 4 }),
    valueMax: numeric('value_max', { precision: 12, scale: 4 }),
    unit: varchar('unit', { length: 50 }),
    textOptions: jsonb('text_options').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    definitionLocaleUnique: uniqueIndex('feature_definition_translations_definition_locale_unique').on(table.definitionId, table.locale),
    definitionIdIdx: index('feature_definition_translations_definition_id_idx').on(table.definitionId),
  }),
);

export const productLifecycleEnum = pgEnum('product_lifecycle', ['new', 'active', 'nfd', 'eol', 'last_time_buy']);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    defaultCategoryId: uuid('default_category_id').references(() => categories.id, { onDelete: 'set null' }),
    spu: varchar('spu', { length: 100 }).notNull(),
    purchaseMode: purchaseModeEnum('purchase_mode').notNull().default('buy'),
    status: productStatusEnum('status').notNull().default('inactive'),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    paidSampleEnabled: boolean('paid_sample_enabled').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    featuredSortOrder: integer('featured_sort_order').notNull().default(0),
    hasMultipleSpecs: boolean('has_multiple_specs').notNull().default(false),
    boardKey: varchar('board_key', { length: 100 }),
    configurationRules: jsonb('configuration_rules'),
    torqueCurveData: jsonb('torque_curve_data'),
    /** @deprecated use backgroundMode + backgroundValue */
    backgroundImage: text('background_image').notNull().default(''),
    /** solid | preset | upload | '' */
    backgroundMode: text('background_mode').notNull().default(''),
    /** solid token | preset id | R2 storage key when mode=upload */
    backgroundValue: text('background_value').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(true),
    /** Which hero right-slot sources are eligible: video / cover / gallery */
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    /** light | dark — billboard left copy style; null = legacy light on storefront */
    heroCopyStyle: text('hero_copy_style'),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    spuUnique: uniqueIndex('products_spu_unique').on(table.spu),
    featuredIdx: index('products_featured_idx').on(table.featured, table.status),
  }),
);

export const productSettings = pgTable('product_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  coverageBoards: jsonb('coverage_boards').$type<ProductCoverageBoard[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productBoardAssignments = pgTable(
  'product_board_assignments',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    boardKey: varchar('board_key', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.boardKey], name: 'product_board_assignments_pk' }),
    boardKeyIdx: index('product_board_assignments_board_key_idx').on(table.boardKey),
  }),
);

/* ───── Product Coverage Boards (产品看板，多语言) ───── */

export const productCoverageBoards = pgTable(
  'product_coverage_boards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    boardKey: varchar('board_key', { length: 100 }).notNull(),
    sourceMode: varchar('source_mode', { length: 32 }).notNull().default('admin-managed'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardKeyUnique: uniqueIndex('product_coverage_boards_board_key_unique').on(table.boardKey),
  }),
);

export const productCoverageBoardTranslations = pgTable(
  'product_coverage_boards_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    boardId: uuid('board_id').notNull().references(() => productCoverageBoards.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 200 }).notNull().default(''),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardLocaleUnique: uniqueIndex('product_coverage_boards_i18n_board_locale_unique').on(table.boardId, table.locale),
    boardIdIdx: index('product_coverage_boards_i18n_board_id_idx').on(table.boardId),
  }),
);

export const shippingMethods = pgTable(
  'shipping_methods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 100 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex('shipping_methods_code_unique').on(table.code),
    enabledIdx: index('shipping_methods_enabled_idx').on(table.enabled),
  }),
);

export const shippingMethodTranslations = pgTable(
  'shipping_method_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shippingMethodId: uuid('shipping_method_id')
      .notNull()
      .references(() => shippingMethods.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    etaLabel: varchar('eta_label', { length: 100 }).notNull().default(''),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    methodLocaleUnique: uniqueIndex('shipping_method_translations_method_locale_unique').on(table.shippingMethodId, table.locale),
    localeIdx: index('shipping_method_translations_locale_idx').on(table.locale),
  }),
);

export const commerceSettings = pgTable('commerce_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  defaultShippingMethodCode: varchar('default_shipping_method_code', { length: 100 }).notNull().default('dhl-express'),
  volumePricingRules: jsonb('volume_pricing_rules').$type<VolumePricingRuleConfig[]>().notNull().default([]),
  shippingCountryRates: jsonb('shipping_country_rates').$type<ShippingCountryRateConfig[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  defaultCurrencyCode: varchar('default_currency_code', { length: 3 }).notNull().default('USD'),
  defaultCountryCode: varchar('default_country_code', { length: 16 }).notNull().default('US'),
  paymentSandboxMode: boolean('payment_sandbox_mode').notNull().default(true),
  extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exchangeRateSettings = pgTable('exchange_rate_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  baseCurrencyCode: varchar('base_currency_code', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exchangeRates = pgTable('exchange_rates', {
  currencyCode: varchar('currency_code', { length: 3 }).primaryKey(),
  rateToBase: numeric('rate_to_base', { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    couponKey: varchar('coupon_key', { length: 64 }).notNull(),
    scope: couponScopeEnum('scope').notNull(),
    stackable: boolean('stackable').notNull().default(false),
    discountType: couponDiscountTypeEnum('discount_type').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    status: couponStatusEnum('status').notNull().default('inactive'),
    note: text('note'),
    totalQuota: integer('total_quota'),
    issuedQuantity: integer('issued_quantity').notNull().default(0),
    perUserLimit: integer('per_user_limit'),
    grantOnRegister: boolean('grant_on_register').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponKeyUnique: uniqueIndex('coupons_coupon_key_unique').on(table.couponKey),
    codeUnique: uniqueIndex('coupons_code_unique').on(table.code),
    statusDatesIdx: index('coupons_status_dates_idx').on(table.status, table.startsAt, table.endsAt),
  }),
);

export const couponLocalePricing = pgTable(
  'coupon_locale_pricing',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    thresholdAmount: numeric('threshold_amount', { precision: 12, scale: 2 }),
    discountValue: numeric('discount_value', { precision: 12, scale: 4 }).notNull(),
    maxDiscountAmount: numeric('max_discount_amount', { precision: 12, scale: 2 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.locale] }),
    couponIdIdx: index('coupon_locale_pricing_coupon_id_idx').on(table.couponId),
  }),
);

export const couponCategories = pgTable(
  'coupon_categories',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.categoryId] }),
  }),
);

export const couponBrands = pgTable(
  'coupon_brands',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.brandId] }),
  }),
);

export const couponProducts = pgTable(
  'coupon_products',
  {
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.productId] }),
  }),
);

export const couponDistributionBatches = pgTable(
  'coupon_distribution_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'restrict' }),
    targetMode: couponDistributionTargetModeEnum('target_mode').notNull(),
    quantityPerUser: integer('quantity_per_user').notNull(),
    recipientCount: integer('recipient_count').notNull(),
    totalQuantity: integer('total_quantity').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponCreatedIdx: index('coupon_distribution_batches_coupon_created_idx').on(table.couponId, table.createdAt),
  }),
);

export const couponGrants = pgTable(
  'coupon_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    source: couponGrantSourceEnum('source').notNull(),
    batchId: uuid('batch_id').references(() => couponDistributionBatches.id, { onDelete: 'set null' }),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponCreatedIdx: index('coupon_grants_coupon_created_idx').on(table.couponId, table.createdAt),
    couponUserIdx: index('coupon_grants_coupon_user_idx').on(table.couponId, table.userId),
    batchIdx: index('coupon_grants_batch_idx').on(table.batchId),
  }),
);

export const geoDivisions = pgTable(
  'geo_divisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => geoDivisions.id, { onDelete: 'cascade' }),
    level: geoDivisionLevelEnum('level').notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    isoAlpha2: varchar('iso_alpha2', { length: 2 }),
    isoAlpha3: varchar('iso_alpha3', { length: 3 }),
    continentCode: varchar('continent_code', { length: 32 }),
    nameEn: varchar('name_en', { length: 200 }).notNull(),
    nameZh: varchar('name_zh', { length: 200 }),
    nameNative: varchar('name_native', { length: 200 }),
    nameEnTitle: varchar('name_en_title', { length: 200 }).notNull(),
    postalCode: varchar('postal_code', { length: 32 }),
    postalCodePattern: varchar('postal_code_pattern', { length: 120 }),
    sortOrder: integer('sort_order').notNull().default(0),
    enabled: boolean('enabled').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentCodeUnique: uniqueIndex('geo_divisions_parent_code_unique').on(table.parentId, table.code),
    parentIdx: index('geo_divisions_parent_idx').on(table.parentId),
    levelIdx: index('geo_divisions_level_idx').on(table.level),
    continentIdx: index('geo_divisions_continent_idx').on(table.continentCode),
    isoAlpha2Unique: uniqueIndex('geo_divisions_iso_alpha2_unique').on(table.isoAlpha2),
  }),
);

export const editorialSettings = pgTable('editorial_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  workflowSettings: jsonb('workflow_settings').$type<EditorialWorkflowSettings>().notNull().default(defaultEditorialAutomationConfig.workflowSettings),
  coverageBoards: jsonb('coverage_boards').$type<EditorialCoverageBoard[]>().notNull().default([]),
  templates: jsonb('templates').$type<EditorialAiTemplate[]>().notNull().default([]),
  rules: jsonb('rules').$type<EditorialAutomationRule[]>().notNull().default([]),
  briefs: jsonb('briefs').$type<EditorialBrief[]>().notNull().default([]),
  runs: jsonb('runs').$type<EditorialGenerationRun[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const editorialCoverageBoards = pgTable(
  'editorial_coverage_boards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    boardKey: varchar('board_key', { length: 100 }).notNull(),
    contentType: editorialContentTypeEnum('content_type').notNull().default('content'),
    sourceMode: varchar('source_mode', { length: 32 }).notNull().default('admin-managed'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardKeyUnique: uniqueIndex('editorial_coverage_boards_board_key_unique').on(table.boardKey),
  }),
);

export const editorialCoverageBoardTranslations = pgTable(
  'editorial_coverage_boards_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    boardId: uuid('board_id').notNull().references(() => editorialCoverageBoards.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardLocaleUnique: uniqueIndex('editorial_coverage_boards_i18n_board_locale_unique').on(table.boardId, table.locale),
    boardIdIdx: index('editorial_coverage_boards_i18n_board_id_idx').on(table.boardId),
  }),
);

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: varchar('alt', { length: 255 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
  isDimension: boolean('is_dimension').notNull().default(false), // 是否为尺寸图
  imageType: varchar('image_type', { length: 50 }).notNull().default('gallery'), // gallery, dimension, detail
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    attributes: jsonb('attributes').$type<Array<{ group: string; value: string }>>().notNull().default([]),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    status: simpleStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSkuPerProduct: uniqueIndex('product_variants_product_sku_unique').on(table.productId, table.sku),
  }),
);

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    availableQuantity: integer('available_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueInventory: uniqueIndex('inventory_product_variant_unique').on(table.productId, table.variantId),
  }),
);

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productFeatureAssignments = pgTable(
  'product_feature_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    definitionId: uuid('definition_id').notNull().references(() => featureDefinitions.id, { onDelete: 'restrict' }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productDefinitionUnique: uniqueIndex('product_feature_assignments_product_definition_unique').on(table.productId, table.definitionId),
    productIdIdx: index('product_feature_assignments_product_id_idx').on(table.productId),
  }),
);

export const productFeatureValues = pgTable(
  'product_feature_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assignmentId: uuid('assignment_id').notNull().references(() => productFeatureAssignments.id, { onDelete: 'cascade' }),
    status: brandStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assignmentIdIdx: index('product_feature_values_assignment_id_idx').on(table.assignmentId),
  }),
);

export const productFeatureValueTranslations = pgTable(
  'product_feature_value_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    valueId: uuid('value_id').notNull().references(() => productFeatureValues.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    valueText: text('value_text'),
    valueNumber: numeric('value_number', { precision: 12, scale: 4 }),
    valueBoolean: boolean('value_boolean'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    valueLocaleUnique: uniqueIndex('product_feature_value_translations_value_locale_unique').on(table.valueId, table.locale),
  }),
);

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  anonymousToken: varchar('anonymous_token', { length: 255 }),
  status: cartStatusEnum('status').notNull().default('active'),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
  couponCode: varchar('coupon_code', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    configurationKey: varchar('configuration_key', { length: 64 }).notNull().default(''),
    featureSelections: jsonb('feature_selections').$type<Array<{
      definitionId: string;
      definitionKey: string;
      definitionName: string;
      valueId: string;
      display: string;
      unit?: string | null;
    }>>().notNull().default([]),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCartLine: uniqueIndex('cart_items_unique_line').on(table.cartId, table.productId, table.configurationKey),
  }),
);

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    company: varchar('company', { length: 150 }),
    phone: varchar('phone', { length: 50 }),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }).notNull(),
    addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line_2', { length: 255 }),
    postalCode: varchar('postal_code', { length: 30 }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('addresses_user_id_idx').on(table.userId),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    status: orderStatusEnum('status').notNull().default('unpaid'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    shippingStatus: shippingStatusEnum('shipping_status').notNull().default('unshipped'),
    refundStatus: refundStatusEnum('refund_status').notNull().default('none'),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingAmount: numeric('shipping_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingMethod: varchar('shipping_method', { length: 100 }),
    paymentMethod: varchar('payment_method', { length: 100 }),
    airwallexPaymentIntentId: varchar('airwallex_payment_intent_id', { length: 64 }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 64 }),
    customerNote: text('customer_note'),
    shippingAddressId: uuid('shipping_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    billingAddressId: uuid('billing_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    internalNote: text('internal_note'),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedBy: uuid('terminated_by').references(() => admins.id, { onDelete: 'set null' }),
    placedAt: timestamp('placed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderNumberUnique: uniqueIndex('orders_number_unique').on(table.orderNumber),
    airwallexPaymentIntentIdx: index('orders_airwallex_payment_intent_idx').on(table.airwallexPaymentIntentId),
    stripePaymentIntentIdx: index('orders_stripe_payment_intent_idx').on(table.stripePaymentIntentId),
  }),
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  spu: varchar('spu', { length: 100 }).notNull(),
  variantLabel: varchar('variant_label', { length: 255 }),
  featureSelections: jsonb('feature_selections').$type<Array<{
    definitionId: string;
    definitionKey: string;
    definitionName: string;
    valueId: string;
    display: string;
    unit?: string | null;
  }>>().notNull().default([]),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderShipments = pgTable('order_shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  trackingNumber: varchar('tracking_number', { length: 120 }).notNull(),
  shippedAt: timestamp('shipped_at', { withTimezone: true }).notNull(),
  note: text('note'),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderShipmentItems = pgTable(
  'order_shipment_items',
  {
    shipmentId: uuid('shipment_id').notNull().references(() => orderShipments.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.shipmentId, table.orderItemId], name: 'order_shipment_items_pk' }),
  }),
);

export const orderCouponRedemptions = pgTable('order_coupon_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  couponCode: varchar('coupon_code', { length: 64 }).notNull(),
  couponName: varchar('coupon_name', { length: 255 }),
  discountType: varchar('discount_type', { length: 32 }).notNull(),
  discountValue: numeric('discount_value', { precision: 12, scale: 4 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  scopeSummary: text('scope_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderRefundRequests = pgTable('order_refund_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  refundType: refundTypeEnum('refund_type').notNull(),
  returnType: returnTypeEnum('return_type').notNull(),
  reason: text('reason'),
  requestedAmount: numeric('requested_amount', { precision: 12, scale: 2 }),
  processedAmount: numeric('processed_amount', { precision: 12, scale: 2 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedBy: uuid('processed_by').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderActionLogs = pgTable('order_action_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  actionType: orderActionTypeEnum('action_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    fullName: varchar('full_name', { length: 150 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    company: varchar('company', { length: 150 }),
    country: varchar('country', { length: 100 }),
    message: text('message').notNull(),
    status: inquiryStatusEnum('status').notNull().default('new'),
    salesStatus: inquirySalesStatusEnum('sales_status').notNull().default('unset'),
    awaitingAdmin: boolean('awaiting_admin').notNull().default(true),
    queueKind: inquiryQueueKindEnum('queue_kind'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedBy: uuid('terminated_by').references(() => admins.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    sourcePageUrl: text('source_page_url'),
    inquiryType: varchar('inquiry_type', { length: 80 }),
    handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'set null' }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    internalNote: text('internal_note'),
    quoteNumber: varchar('quote_number', { length: 32 }),
    rfqPayload: jsonb('rfq_payload').$type<Record<string, unknown>>(),
    quotedLines: jsonb('quoted_lines').$type<Record<string, unknown>[]>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    awaitingAdminIdx: index('inquiries_awaiting_admin_idx').on(table.awaitingAdmin),
    lastMessageAtIdx: index('inquiries_last_message_at_idx').on(table.lastMessageAt),
    quoteNumberUnique: uniqueIndex('inquiries_quote_number_unique').on(table.quoteNumber),
  }),
);

export const inquiryMessages = pgTable(
  'inquiry_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id').notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
    senderType: inquiryMessageSenderTypeEnum('sender_type').notNull(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inquiryCreatedIdx: index('inquiry_messages_inquiry_created_idx').on(table.inquiryId, table.createdAt),
  }),
);

export const inquiryProfiles = pgTable(
  'inquiry_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id').notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 150 }).notNull().default(''),
    email: varchar('email', { length: 320 }).notNull().default(''),
    country: varchar('country', { length: 100 }).notNull().default(''),
    phone: varchar('phone', { length: 50 }).notNull().default(''),
    jobTitle: varchar('job_title', { length: 150 }).notNull().default(''),
    companyName: varchar('company_name', { length: 150 }).notNull().default(''),
    vat: varchar('vat', { length: 80 }).notNull().default(''),
    companyWebsite: varchar('company_website', { length: 500 }).notNull().default(''),
    companySize: varchar('company_size', { length: 80 }).notNull().default(''),
    companyAddress: text('company_address').notNull().default(''),
    projectName: varchar('project_name', { length: 200 }).notNull().default(''),
    industry: varchar('industry', { length: 120 }).notNull().default(''),
    projectStart: varchar('project_start', { length: 80 }).notNull().default(''),
    annualTarget: varchar('annual_target', { length: 120 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inquiryUnique: uniqueIndex('inquiry_profiles_inquiry_id_unique').on(table.inquiryId),
  }),
);

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueWishlist: uniqueIndex('wishlists_user_product_unique').on(table.userId, table.productId),
  }),
);

export const compareItems = pgTable(
  'compare_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCompareItem: uniqueIndex('compare_items_user_product_unique').on(table.userId, table.productId),
  }),
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId], name: 'product_categories_pk' }),
  }),
);

export const productRelations = pgTable(
  'product_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    relatedProductId: uuid('related_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    relationType: productRelationTypeEnum('relation_type').notNull().default('custom'),
    relationLabel: varchar('relation_label', { length: 100 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRelation: uniqueIndex('product_relations_unique').on(table.productId, table.relatedProductId),
    productIdx: index('product_relations_product_idx').on(table.productId, table.sortOrder),
  }),
);

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    summary: text('summary'),
    content: text('content'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('cms_pages_slug_unique').on(table.slug),
  }),
);

export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placement: varchar('placement', { length: 100 }).notNull(),
    blockKey: varchar('block_key', { length: 150 }).notNull(),
    title: varchar('title', { length: 255 }),
    subtitle: varchar('subtitle', { length: 255 }),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    status: contentStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    placementKeyUnique: uniqueIndex('content_blocks_placement_key_unique').on(table.placement, table.blockKey),
  }),
);

export const editorialContents = pgTable(
  'editorial_contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentType: editorialContentTypeEnum('content_type').notNull().default('content'),
    contentModule: editorialContentModuleEnum('content_module').notNull().default('editorial'),
    boardKey: varchar('board_key', { length: 100 }).notNull().default('content'),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeStatusPublishedIdx: index('editorial_contents_type_status_published_idx').on(table.contentType, table.status, table.publishedAt),
    boardKeyIdx: index('editorial_contents_board_key_idx').on(table.boardKey),
    contentModuleBoardIdx: index('editorial_contents_content_module_board_idx').on(table.contentModule, table.boardKey),
  }),
);

export const editorialContentBoards = pgTable(
  'editorial_content_boards',
  {
    contentId: uuid('content_id').notNull().references(() => editorialContents.id, { onDelete: 'cascade' }),
    boardKey: varchar('board_key', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentId, table.boardKey], name: 'editorial_content_boards_pk' }),
    boardKeyIdx: index('editorial_content_boards_board_key_idx').on(table.boardKey),
  }),
);

export const editorialContentTranslations = pgTable(
  'editorial_content_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentId: uuid('content_id').notNull().references(() => editorialContents.id, { onDelete: 'cascade' }),
    contentType: editorialContentTypeEnum('content_type').notNull().default('content'),
    contentModule: editorialContentModuleEnum('content_module').notNull().default('editorial'),
    locale: varchar('locale', { length: 16 }).notNull().default('en-US'),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    summary: text('summary'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    payload: jsonb('payload').$type<EditorialContentPayload>().notNull().default({
      body: '',
      coverStyle: null,
      tags: [],
      relatedProductSlugs: [],
      authorName: null,
      authorTitle: null,
      authorBio: null,
      category: null,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contentLocaleUnique: uniqueIndex('editorial_content_translations_content_locale_unique').on(table.contentId, table.locale),
    moduleSlugLocaleUnique: uniqueIndex('editorial_content_translations_module_slug_locale_unique').on(table.contentModule, table.slug, table.locale),
    contentIdIdx: index('editorial_content_translations_content_id_idx').on(table.contentId),
  }),
);

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    status: newsletterStatusEnum('status').notNull().default('subscribed'),
    source: varchar('source', { length: 100 }),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('newsletter_subscribers_email_unique').on(table.email),
  }),
);

export const uiStrings = pgTable(
  'ui_strings',
  {
    site: varchar('site', { length: 16 }).notNull().default('web'),
    key: varchar('key', { length: 200 }).notNull(),
    defaultText: text('default_text').notNull(),
    group: varchar('group', { length: 64 }).notNull(),
    context: text('context'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.site, table.key] }),
    siteGroupIdx: index('ui_strings_site_group_idx').on(table.site, table.group),
    siteStatusIdx: index('ui_strings_site_status_idx').on(table.site, table.status),
  }),
);

export const uiStringTranslations = pgTable(
  'ui_string_translations',
  {
    site: varchar('site', { length: 16 }).notNull().default('web'),
    key: varchar('key', { length: 200 }).notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    value: text('value').notNull(),
    source: varchar('source', { length: 16 }).notNull().default('manual'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.site, table.key, table.locale] }),
    siteKeyFk: foreignKey({
      columns: [table.site, table.key],
      foreignColumns: [uiStrings.site, uiStrings.key],
    }).onDelete('cascade'),
    siteLocaleIdx: index('ui_string_translations_site_locale_idx').on(table.site, table.locale),
  }),
);

export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    badgeText: varchar('badge_text', { length: 120 }).notNull().default(''),
    extraText: varchar('extra_text', { length: 255 }).notNull().default(''),
    shortDescription: text('short_description'),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: varchar('seo_description', { length: 500 }),
    stats: jsonb('stats').$type<ProductStat[]>().notNull().default([]),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('USD'),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    moq: integer('moq').notNull().default(1),
    leadTimeMin: integer('lead_time_min').notNull().default(3),
    leadTimeMax: integer('lead_time_max').notNull().default(15),
    leadTimeUnit: varchar('lead_time_unit', { length: 20 }).notNull().default('business_days'),
    lifecycleStatus: productLifecycleEnum('lifecycle_status').notNull().default('active'),
    eolDate: timestamp('eol_date', { withTimezone: true }),
    lastTimeBuyDate: timestamp('last_time_buy_date', { withTimezone: true }),
    efficiencyClass: varchar('efficiency_class', { length: 20 }),
    payload: jsonb('payload').$type<AdminProductPayload>().notNull().default({
      coverUrl: null,
      coverAlt: null,
      videoUrl: null,
      gallery: [],
      tags: [],
      attachments: [],
      certifications: [],
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productLocaleUnique: uniqueIndex('product_translations_product_locale_unique').on(table.productId, table.locale),
    slugLocaleUnique: uniqueIndex('product_translations_slug_locale_unique').on(table.slug, table.locale),
    productIdIdx: index('product_translations_product_id_idx').on(table.productId),
  }),
);

export const brandNarratives = pgTable(
  'brand_narratives',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    gallery: jsonb('gallery').$type<ProductGalleryImage[]>().notNull().default([]),
    videoUrl: text('video_url').notNull().default(''),
    /** @deprecated use backgroundMode + backgroundValue */
    backgroundImage: text('background_image').notNull().default(''),
    /** solid | preset | upload | '' */
    backgroundMode: text('background_mode').notNull().default(''),
    /** solid token | preset id | R2 storage key when mode=upload */
    backgroundValue: text('background_value').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(true),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    heroCopyStyle: text('hero_copy_style'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('brand_narratives_slug_unique').on(table.slug),
    statusSortIdx: index('brand_narratives_status_sort_idx').on(table.status, table.sortOrder),
  }),
);

/** 多语言看板字段：标题、大标题、描述、SEO、数据指标 */
export const brandNarrativeTranslations = pgTable(
  'brand_narratives_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    narrativeId: uuid('narrative_id').notNull().references(() => brandNarratives.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    largeTitle: varchar('large_title', { length: 255 }).notNull().default(''),
    description: text('description').notNull().default(''),
    seoTitle: varchar('seo_title', { length: 255 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 500 }).notNull().default(''),
    stats: jsonb('stats').$type<BrandNarrativeStat[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    narrativeLocaleUnique: uniqueIndex('brand_narratives_i18n_narrative_locale_unique').on(table.narrativeId, table.locale),
    narrativeIdIdx: index('brand_narratives_i18n_narrative_id_idx').on(table.narrativeId),
  }),
);

/** 内容区块（不按语言分行，多语言全存在 blocks payload 内部） */
export const brandNarrativeContents = pgTable(
  'brand_narrative_contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    narrativeId: uuid('narrative_id').notNull().references(() => brandNarratives.id, { onDelete: 'cascade' }),
    blocks: jsonb('blocks').$type<BrandNarrativeBlockDraft[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    narrativeIdUnique: uniqueIndex('brand_narrative_contents_narrative_id_unique').on(table.narrativeId),
  }),
);

export const solutions = pgTable(
  'solutions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    categoryId: uuid('category_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    gallery: jsonb('gallery').$type<ProductGalleryImage[]>().notNull().default([]),
    videoUrl: text('video_url').notNull().default(''),
    /** @deprecated use backgroundMode + backgroundValue */
    backgroundImage: text('background_image').notNull().default(''),
    /** solid | preset | upload | '' */
    backgroundMode: text('background_mode').notNull().default(''),
    /** solid token | preset id | R2 storage key when mode=upload */
    backgroundValue: text('background_value').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(true),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    heroCopyStyle: text('hero_copy_style'),
    materials: jsonb('materials').$type<SolutionMaterial[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('solutions_slug_unique').on(table.slug),
    statusSortIdx: index('solutions_status_sort_idx').on(table.status, table.sortOrder),
    categoryIdIdx: index('solutions_category_id_idx').on(table.categoryId),
  }),
);

export const solutionTranslations = pgTable(
  'solutions_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    solutionId: uuid('solution_id').notNull().references(() => solutions.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    largeTitle: varchar('large_title', { length: 255 }).notNull().default(''),
    description: text('description').notNull().default(''),
    badgeText: varchar('badge_text', { length: 120 }).notNull().default(''),
    seoTitle: varchar('seo_title', { length: 255 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 500 }).notNull().default(''),
    stats: jsonb('stats').$type<SolutionStat[]>().notNull().default([]),
    productParams: jsonb('product_params').$type<SolutionProductParam[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    solutionLocaleUnique: uniqueIndex('solutions_i18n_solution_locale_unique').on(table.solutionId, table.locale),
    solutionIdIdx: index('solutions_i18n_solution_id_idx').on(table.solutionId),
  }),
);

export const solutionContents = pgTable(
  'solution_contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    solutionId: uuid('solution_id').notNull().references(() => solutions.id, { onDelete: 'cascade' }),
    blocks: jsonb('blocks').$type<SolutionBlockDraft[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    solutionIdUnique: uniqueIndex('solution_contents_solution_id_unique').on(table.solutionId),
  }),
);

export const solutionBoardLinks = pgTable(
  'solution_board_links',
  {
    solutionId: uuid('solution_id').notNull().references(() => solutions.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id').notNull().references(() => productCoverageBoards.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.solutionId, table.boardId] }),
    solutionIdIdx: index('solution_board_links_solution_id_idx').on(table.solutionId),
    boardIdIdx: index('solution_board_links_board_id_idx').on(table.boardId),
  }),
);

/* ───── Certified Surgeons (认证术者) ───── */

export const surgeonGradeKeyEnum = pgEnum('surgeon_grade_key', ['platinum', 'gold', 'silver']);

export const surgeons = pgTable(
  'surgeons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    avatar: text('avatar').notNull().default(''),
    gradeKey: surgeonGradeKeyEnum('grade_key').notNull().default('silver'),
    certificationYear: integer('certification_year'),
    surgeryCount: integer('surgery_count'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('surgeons_slug_unique').on(table.slug),
    sortIdx: index('surgeons_sort_idx').on(table.sortOrder),
  }),
);

export const surgeonTranslations = pgTable(
  'surgeons_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    surgeonId: uuid('surgeon_id').notNull().references(() => surgeons.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 120 }).notNull().default(''),
    position: varchar('position', { length: 200 }).notNull().default(''),
    institution: varchar('institution', { length: 200 }).notNull().default(''),
    expertise: varchar('expertise', { length: 300 }).notNull().default(''),
    experience: varchar('experience', { length: 300 }).notNull().default(''),
    gradeTitle: varchar('grade_title', { length: 120 }).notNull().default(''),
    detailDescription: text('detail_description').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    otherCertifications: jsonb('other_certifications').$type<SurgeonMetric[]>().notNull().default([]),
    specialties: jsonb('specialties').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    surgeonLocaleUnique: uniqueIndex('surgeons_i18n_surgeon_locale_unique').on(table.surgeonId, table.locale),
    surgeonIdIdx: index('surgeons_i18n_surgeon_id_idx').on(table.surgeonId),
  }),
);

/* ───── Industry Summits (行业峰会) ───── */

export const summitStatusEnum = pgEnum('summit_status', [
  'upcoming',
  'registering',
  'completed',
]);

export const summits = pgTable(
  'summits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    status: summitStatusEnum('status').notNull().default('upcoming'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    videoUrl: text('video_url').notNull().default(''),
    /** @deprecated use backgroundMode + backgroundValue */
    backgroundImage: text('background_image').notNull().default(''),
    /** solid | preset | upload | '' */
    backgroundMode: text('background_mode').notNull().default(''),
    /** solid token | preset id | R2 storage key when mode=upload */
    backgroundValue: text('background_value').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(true),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: false }),
    heroCopyStyle: text('hero_copy_style'),
    venueImage: text('venue_image').notNull().default(''),
    agenda: jsonb('agenda').$type<AgendaGroup[]>().notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('summits_slug_unique').on(table.slug),
    statusIdx: index('summits_status_idx').on(table.status),
    startDateIdx: index('summits_start_date_idx').on(table.startDate),
  }),
);

export const summitTranslations = pgTable(
  'summits_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    summitId: uuid('summit_id').notNull().references(() => summits.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 300 }).notNull().default(''),
    description: text('description').notNull().default(''),
    detailDescription: text('detail_description').notNull().default(''),
    scale: varchar('scale', { length: 200 }).notNull().default(''),
    duration: varchar('duration', { length: 100 }).notNull().default(''),
    location: varchar('location', { length: 300 }).notNull().default(''),
    address: varchar('address', { length: 400 }).notNull().default(''),
    transportation: text('transportation').notNull().default(''),
    stats: jsonb('stats').$type<SummitStat[]>().notNull().default([]),
    speakers: jsonb('speakers').$type<SpeakerItem[]>().notNull().default([]),
    sponsors: jsonb('sponsors').$type<SponsorItem[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    summitLocaleUnique: uniqueIndex('summits_i18n_summit_locale_unique').on(table.summitId, table.locale),
    summitIdIdx: index('summits_i18n_summit_id_idx').on(table.summitId),
  }),
);

/* ───── Partner Centers (合作中心) ───── */

export const centerRegionEnum = pgEnum('center_region', [
  'north-america',
  'south-america',
  'europe',
  'china',
  'asia-pacific',
  'africa',
]);

/** Uploaded media library; type e.g. background (shared 大背景图) */
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(),
    storageKey: text('storage_key').notNull(),
    filename: text('filename').notNull().default(''),
    contentType: text('content_type').notNull().default(''),
    byteSize: integer('byte_size').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeCreatedAtIdx: index('media_assets_type_created_at_idx').on(table.type, table.createdAt),
  }),
);

export const partnerCenters = pgTable(
  'partner_centers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    region: centerRegionEnum('region').notNull().default('asia-pacific'),
    email: varchar('email', { length: 255 }).notNull().default(''),
    website: varchar('website', { length: 300 }).notNull().default(''),
    coverImage: text('cover_image').notNull().default(''),
    /** preset | upload | '' */
    coverMode: text('cover_mode').notNull().default(''),
    /** preset id | R2 storage key when mode=upload */
    coverValue: text('cover_value').notNull().default(''),
    gallery: jsonb('gallery').$type<ProductGalleryImage[]>().notNull().default([]),
    videoUrl: text('video_url').notNull().default(''),
    logo: text('logo').notNull().default(''),
    /** @deprecated use backgroundMode + backgroundValue; kept for legacy/seed compatibility */
    backgroundImage: text('background_image').notNull().default(''),
    /** solid | preset | upload | '' */
    backgroundMode: text('background_mode').notNull().default(''),
    /** solid token | preset id | R2 storage key when mode=upload */
    backgroundValue: text('background_value').notNull().default(''),
    /** When true, detail hero shows cover image on the right over the background */
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(true),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    heroCopyStyle: text('hero_copy_style'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('partner_centers_slug_unique').on(table.slug),
    regionIdx: index('partner_centers_region_idx').on(table.region),
    sortIdx: index('partner_centers_sort_idx').on(table.sortOrder),
  }),
);

export const partnerCenterSurgeons = pgTable(
  'partner_center_surgeons',
  {
    centerId: uuid('center_id').notNull().references(() => partnerCenters.id, { onDelete: 'cascade' }),
    surgeonId: uuid('surgeon_id').notNull().references(() => surgeons.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.centerId, table.surgeonId] }),
    centerIdIdx: index('partner_center_surgeons_center_id_idx').on(table.centerId),
    surgeonIdIdx: index('partner_center_surgeons_surgeon_id_idx').on(table.surgeonId),
  }),
);

export const companyProfiles = pgTable('company_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyEmail: varchar('company_email', { length: 255 }).notNull().default(''),
  businessEmail: varchar('business_email', { length: 255 }).notNull().default(''),
  website: varchar('website', { length: 300 }).notNull().default(''),
  icpNumber: varchar('icp_number', { length: 120 }).notNull().default(''),
  publicFiles: jsonb('public_files').$type<CompanyPublicFile[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const companyProfileTranslations = pgTable(
  'company_profiles_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id').notNull().references(() => companyProfiles.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull().default(''),
    slogan: varchar('slogan', { length: 255 }).notNull().default(''),
    positioning: text('positioning').notNull().default(''),
    copyright: varchar('copyright', { length: 255 }).notNull().default(''),
    contactPhone: varchar('contact_phone', { length: 120 }).notNull().default(''),
    address: varchar('address', { length: 400 }).notNull().default(''),
    businessHours: varchar('business_hours', { length: 200 }).notNull().default(''),
    businessHotline: varchar('business_hotline', { length: 120 }).notNull().default(''),
    basicInfo: jsonb('basic_info').$type<CompanyLabelValue[]>().notNull().default([]),
    managementTeam: jsonb('management_team').$type<CompanyTeamMember[]>().notNull().default([]),
    offices: jsonb('offices').$type<CompanyOffice[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileLocaleUnique: uniqueIndex('company_profiles_i18n_profile_locale_unique').on(table.profileId, table.locale),
    profileIdIdx: index('company_profiles_i18n_profile_id_idx').on(table.profileId),
  }),
);

export const homepageConfigs = pgTable('homepage_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  bannerSlides: jsonb('banner_slides').$type<HomepageMediaSlide[]>().notNull().default([]),
  aboutSlides: jsonb('about_slides').$type<HomepageMediaSlide[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const homepageConfigTranslations = pgTable(
  'homepage_configs_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    configId: uuid('config_id').notNull().references(() => homepageConfigs.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    bannerTitle: text('banner_title').notNull().default(''),
    bannerSubtitle: text('banner_subtitle').notNull().default(''),
    bannerDescription: text('banner_description').notNull().default(''),
    solutionsTitle: text('solutions_title').notNull().default(''),
    solutionsDescription: text('solutions_description').notNull().default(''),
    aboutTitle: text('about_title').notNull().default(''),
    aboutDescription: text('about_description').notNull().default(''),
    stats: jsonb('stats').$type<HomepageStatItem[]>().notNull().default([]),
    globalTitle: text('global_title').notNull().default(''),
    globalDescription: text('global_description').notNull().default(''),
    educationTitle: text('education_title').notNull().default(''),
    educationDescription: text('education_description').notNull().default(''),
    educationItems: jsonb('education_items').$type<HomepageEducationItem[]>().notNull().default([]),
    solutionItems: jsonb('solutions_items').$type<HomepageSolutionItem[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    configLocaleUnique: uniqueIndex('homepage_configs_i18n_config_locale_unique').on(table.configId, table.locale),
    configIdIdx: index('homepage_configs_i18n_config_id_idx').on(table.configId),
  }),
);

export const websiteConfigs = pgTable('website_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  navColumns: jsonb('nav_columns').$type<NavColumn[]>().notNull().default([]),
  footerNavColumns: jsonb('footer_nav_columns').$type<NavColumn[]>().notNull().default([]),
  listHeroBoards: jsonb('list_hero_boards').$type<ListHeroBoardsRecord>().notNull().default({} as ListHeroBoardsRecord),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const socialMediaProfiles = pgTable('social_media_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  socialChannels: jsonb('social_channels').$type<SocialChannel[]>().notNull().default([]),
  overseasContacts: jsonb('overseas_contacts').$type<OverseasContact[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const socialMediaProfileTranslations = pgTable(
  'social_media_profiles_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id').notNull().references(() => socialMediaProfiles.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    featuredPosts: jsonb('featured_posts').$type<FeaturedPost[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileLocaleUnique: uniqueIndex('social_media_profiles_i18n_profile_locale_unique').on(table.profileId, table.locale),
    profileIdIdx: index('social_media_profiles_i18n_profile_id_idx').on(table.profileId),
  }),
);

export const partnerCenterTranslations = pgTable(
  'partner_centers_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    centerId: uuid('center_id').notNull().references(() => partnerCenters.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    name: varchar('name', { length: 200 }).notNull().default(''),
    description: text('description').notNull().default(''),
    detailDescription: text('detail_description').notNull().default(''),
    location: varchar('location', { length: 300 }).notNull().default(''),
    badgeText: varchar('badge_text', { length: 120 }).notNull().default(''),
    address: varchar('address', { length: 400 }).notNull().default(''),
    businessHours: varchar('business_hours', { length: 200 }).notNull().default(''),
    contact: varchar('contact', { length: 200 }).notNull().default(''),
    /** @deprecated moved to partner_centers.website; kept for legacy rows */
    website: varchar('website', { length: 300 }).notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    stats: jsonb('stats').$type<PartnerCenterMetric[]>().notNull().default([]),
    cooperationInfo: jsonb('cooperation_info').$type<PartnerCenterMetric[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    centerLocaleUnique: uniqueIndex('partner_centers_i18n_center_locale_unique').on(table.centerId, table.locale),
    centerIdIdx: index('partner_centers_i18n_center_id_idx').on(table.centerId),
  }),
);

/* ───── Academy (竑宇医疗学院) ───── */

export const academyCertificates = pgTable(
  'academy_certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    coverImage: text('cover_image').notNull().default(''),
    coverMode: text('cover_mode').notNull().default(''),
    coverValue: text('cover_value').notNull().default(''),
    gallery: jsonb('gallery').$type<ProductGalleryImage[]>().notNull().default([]),
    videoUrl: text('video_url').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(false),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    teacherCount: integer('teacher_count').notNull().default(0),
    studentCount: integer('student_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('academy_certificates_slug_unique').on(table.slug),
    statusSortIdx: index('academy_certificates_status_sort_idx').on(table.status, table.sortOrder),
  }),
);

export const academyCertificateTranslations = pgTable(
  'academy_certificates_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    subtitle: varchar('subtitle', { length: 255 }).notNull().default(''),
    badgeLabel: varchar('badge_label', { length: 120 }).notNull().default(''),
    summary: text('summary').notNull().default(''),
    description: text('description').notNull().default(''),
    seoTitle: varchar('seo_title', { length: 255 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 500 }).notNull().default(''),
    stats: jsonb('stats').$type<AcademyStat[]>().notNull().default([]),
    learnings: jsonb('learnings').$type<string[]>().notNull().default([]),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    tools: jsonb('tools').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    certificateLocaleUnique: uniqueIndex('academy_certificates_i18n_cert_locale_unique').on(table.certificateId, table.locale),
    certificateIdIdx: index('academy_certificates_i18n_certificate_id_idx').on(table.certificateId),
  }),
);

export const academyCourses = pgTable(
  'academy_courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    coverImage: text('cover_image').notNull().default(''),
    coverMode: text('cover_mode').notNull().default(''),
    coverValue: text('cover_value').notNull().default(''),
    gallery: jsonb('gallery').$type<ProductGalleryImage[]>().notNull().default([]),
    videoUrl: text('video_url').notNull().default(''),
    showCoverOnBackground: boolean('show_cover_on_background').notNull().default(false),
    coverDisplay: jsonb('cover_display').$type<HeroCoverDisplay>().notNull().default({ video: true, cover: true, gallery: true }),
    teacherCount: integer('teacher_count').notNull().default(0),
    studentCount: integer('student_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('academy_courses_slug_unique').on(table.slug),
    statusSortIdx: index('academy_courses_status_sort_idx').on(table.status, table.sortOrder),
  }),
);

export const academyCourseTranslations = pgTable(
  'academy_courses_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').notNull().references(() => academyCourses.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    subtitle: varchar('subtitle', { length: 255 }).notNull().default(''),
    badgeLabel: varchar('badge_label', { length: 120 }).notNull().default(''),
    summary: text('summary').notNull().default(''),
    description: text('description').notNull().default(''),
    seoTitle: varchar('seo_title', { length: 255 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 500 }).notNull().default(''),
    stats: jsonb('stats').$type<AcademyStat[]>().notNull().default([]),
    learnings: jsonb('learnings').$type<string[]>().notNull().default([]),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    tools: jsonb('tools').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    courseLocaleUnique: uniqueIndex('academy_courses_i18n_course_locale_unique').on(table.courseId, table.locale),
    courseIdIdx: index('academy_courses_i18n_course_id_idx').on(table.courseId),
  }),
);

export const academyCertificateCourses = pgTable(
  'academy_certificate_courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').notNull().references(() => academyCourses.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    certificateCourseUnique: uniqueIndex('academy_certificate_courses_certificate_course_unique').on(
      table.certificateId,
      table.courseId,
    ),
    certificateIdIdx: index('academy_certificate_courses_certificate_id_idx').on(table.certificateId),
    courseIdIdx: index('academy_certificate_courses_course_id_idx').on(table.courseId),
  }),
);

export const academyCertificateViews = pgTable(
  'academy_certificate_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCertificateUnique: uniqueIndex('academy_certificate_views_user_certificate_unique').on(
      table.userId,
      table.certificateId,
    ),
    userViewedIdx: index('academy_certificate_views_user_viewed_idx').on(table.userId, table.viewedAt),
  }),
);

export const academyCourseViews = pgTable(
  'academy_course_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').notNull().references(() => academyCourses.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCourseUnique: uniqueIndex('academy_course_views_user_course_unique').on(table.userId, table.courseId),
    userViewedIdx: index('academy_course_views_user_viewed_idx').on(table.userId, table.viewedAt),
  }),
);

export const academyCertificateCourseProgress = pgTable(
  'academy_certificate_course_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    certificateCourseId: uuid('certificate_course_id')
      .notNull()
      .references(() => academyCertificateCourses.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id'),
    lessonId: uuid('lesson_id'),
    positionSeconds: integer('position_seconds').notNull().default(0),
    completedLessonCount: integer('completed_lesson_count').notNull().default(0),
    totalLessonCount: integer('total_lesson_count').notNull().default(0),
    progressPercent: integer('progress_percent').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userLinkUnique: uniqueIndex('academy_certificate_course_progress_user_link_unique').on(
      table.userId,
      table.certificateCourseId,
    ),
    userUpdatedIdx: index('academy_certificate_course_progress_user_updated_idx').on(table.userId, table.updatedAt),
  }),
);

export const academyUnits = pgTable(
  'academy_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').notNull().references(() => academyCourses.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    coverImage: text('cover_image').notNull().default(''),
    coverMode: text('cover_mode').notNull().default(''),
    coverValue: text('cover_value').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    courseSortIdx: index('academy_units_course_sort_idx').on(table.courseId, table.sortOrder),
  }),
);

export const academyUnitTranslations = pgTable(
  'academy_units_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    unitId: uuid('unit_id').notNull().references(() => academyUnits.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unitLocaleUnique: uniqueIndex('academy_units_i18n_unit_locale_unique').on(table.unitId, table.locale),
    unitIdIdx: index('academy_units_i18n_unit_id_idx').on(table.unitId),
  }),
);

export const academyLessons = pgTable(
  'academy_lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    unitId: uuid('unit_id').notNull().references(() => academyUnits.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    videoUrl: text('video_url').notNull().default(''),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    materials: jsonb('materials').$type<AcademyLessonMaterial[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unitSortIdx: index('academy_lessons_unit_sort_idx').on(table.unitId, table.sortOrder),
  }),
);

export const academyLessonTranslations = pgTable(
  'academy_lessons_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id').notNull().references(() => academyLessons.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lessonLocaleUnique: uniqueIndex('academy_lessons_i18n_lesson_locale_unique').on(table.lessonId, table.locale),
    lessonIdIdx: index('academy_lessons_i18n_lesson_id_idx').on(table.lessonId),
  }),
);

export const academyLessonCompletions = pgTable(
  'academy_lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').notNull().references(() => academyLessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userLessonUnique: uniqueIndex('academy_lesson_completions_user_lesson_unique').on(table.userId, table.lessonId),
    userIdIdx: index('academy_lesson_completions_user_id_idx').on(table.userId),
    lessonIdIdx: index('academy_lesson_completions_lesson_id_idx').on(table.lessonId),
  }),
);

export const academyLessonNotes = pgTable(
  'academy_lesson_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').notNull().references(() => academyLessons.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    videoPositionSeconds: integer('video_position_seconds').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userLessonCreatedIdx: index('academy_lesson_notes_user_lesson_created_idx').on(
      table.userId,
      table.lessonId,
      table.createdAt,
    ),
  }),
);

export const academyQuestionBanks = pgTable(
  'academy_question_banks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    status: cmsStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    timeLimitMinutes: integer('time_limit_minutes'),
    maxRetakes: integer('max_retakes'),
    passScorePercent: integer('pass_score_percent').notNull().default(60),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('academy_question_banks_status_idx').on(table.status),
  }),
);

export const academyQuestionBankTranslations = pgTable(
  'academy_question_banks_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionBankId: uuid('question_bank_id').notNull().references(() => academyQuestionBanks.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bankLocaleUnique: uniqueIndex('academy_question_banks_i18n_bank_locale_unique').on(table.questionBankId, table.locale),
    bankIdIdx: index('academy_question_banks_i18n_bank_id_idx').on(table.questionBankId),
  }),
);

export const academyQuestions = pgTable(
  'academy_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionBankId: uuid('question_bank_id').notNull().references(() => academyQuestionBanks.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    questionType: academyQuestionTypeEnum('question_type').notNull(),
    score: integer('score').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bankSortIdx: index('academy_questions_bank_sort_idx').on(table.questionBankId, table.sortOrder),
  }),
);

export const academyQuestionTranslations = pgTable(
  'academy_questions_i18n',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id').notNull().references(() => academyQuestions.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    content: jsonb('content').$type<AcademyQuestionContent>().notNull().default({} as AcademyQuestionContent),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    questionLocaleUnique: uniqueIndex('academy_questions_i18n_question_locale_unique').on(table.questionId, table.locale),
    questionIdIdx: index('academy_questions_i18n_question_id_idx').on(table.questionId),
  }),
);

export const academyCertificateQuestionBanks = pgTable(
  'academy_certificate_question_banks',
  {
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    questionBankId: uuid('question_bank_id').notNull().references(() => academyQuestionBanks.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.certificateId, table.questionBankId] }),
    certificateIdIdx: index('academy_certificate_question_banks_certificate_id_idx').on(table.certificateId),
    questionBankIdIdx: index('academy_certificate_question_banks_bank_id_idx').on(table.questionBankId),
  }),
);

export const academyCertificateProgress = pgTable(
  'academy_certificate_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    completedLessonCount: integer('completed_course_count').notNull().default(0),
    totalLessonCount: integer('total_course_count').notNull().default(0),
    progressPercent: integer('progress_percent').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCertificateUnique: uniqueIndex('academy_certificate_progress_user_certificate_unique').on(
      table.userId,
      table.certificateId,
    ),
    userUpdatedIdx: index('academy_certificate_progress_user_updated_idx').on(table.userId, table.updatedAt),
  }),
);

export const academyExamAttempts = pgTable(
  'academy_exam_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    questionBankId: uuid('question_bank_id').notNull().references(() => academyQuestionBanks.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    score: integer('score'),
    totalScore: integer('total_score'),
    passed: boolean('passed'),
    answers: jsonb('answers').$type<Record<string, number | number[] | boolean | string>>().notNull().default({}),
    certificateMailStatus: varchar('certificate_mail_status', { length: 16 }).notNull().default('unsent'),
    certificateMailFile: text('certificate_mail_file'),
    certificateMailUpdatedAt: timestamp('certificate_mail_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCertificateIdx: index('academy_exam_attempts_user_certificate_idx').on(table.userId, table.certificateId),
    userIdIdx: index('academy_exam_attempts_user_id_idx').on(table.userId),
  }),
);

export const academyUserCertificates = pgTable(
  'academy_user_certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    certificateId: uuid('certificate_id').notNull().references(() => academyCertificates.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => academyExamAttempts.id, { onDelete: 'cascade' }),
    certificateNumber: varchar('certificate_number', { length: 64 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }).notNull().default(''),
    title: varchar('title', { length: 255 }).notNull().default(''),
    issuerName: varchar('issuer_name', { length: 255 }).notNull().default('上海竑宇医疗'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdUnique: uniqueIndex('academy_user_certificates_attempt_id_unique').on(table.attemptId),
    certificateNumberUnique: uniqueIndex('academy_user_certificates_number_unique').on(table.certificateNumber),
    userCertificateUnique: uniqueIndex('academy_user_certificates_user_certificate_unique').on(
      table.userId,
      table.certificateId,
    ),
    userIdIdx: index('academy_user_certificates_user_id_idx').on(table.userId),
    certificateIdIdx: index('academy_user_certificates_certificate_id_idx').on(table.certificateId),
  }),
);
