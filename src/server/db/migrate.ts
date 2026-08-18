import { sql } from 'drizzle-orm';
import { db } from './index';

export async function runMigrations() {
  const statements = [
    // Enum type
    `DO $$ BEGIN CREATE TYPE product_lifecycle AS ENUM ('new', 'active', 'nfd', 'eol', 'last_time_buy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

    // Products table - new columns
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS moq integer DEFAULT 1`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_min integer DEFAULT 3`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_max integer DEFAULT 15`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_unit varchar(20) DEFAULT 'business_days'`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lifecycle_status product_lifecycle DEFAULT 'active'`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS eol_date timestamptz`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS last_time_buy_date timestamptz`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS efficiency_class varchar(20)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS configuration_rules jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS torque_curve_data jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS paid_sample_enabled boolean DEFAULT false`,

    // Product features - new columns
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS feature_value_min numeric(12,4)`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS feature_value_max numeric(12,4)`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS value_type varchar(20) DEFAULT 'text'`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS conditional_value jsonb`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS spec_category varchar(50) DEFAULT 'general'`,

    // Product images - new columns
    `ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_dimension boolean DEFAULT false`,
    `ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_type varchar(50) DEFAULT 'gallery'`,

    // Product translations table
    `CREATE TABLE IF NOT EXISTS product_translations (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      locale varchar(16) NOT NULL DEFAULT 'en',
      name varchar(255),
      short_description text,
      description text,
      seo_title varchar(255),
      seo_description varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS product_translations_product_locale_unique ON product_translations (product_id, locale)`,

    // ── brand_narratives: 封面图字段从翻译表迁移到主表 ─────────────────────────
    `ALTER TABLE brand_narratives ADD COLUMN IF NOT EXISTS cover_image text NOT NULL DEFAULT ''`,

    // ── brand_narrative_contents: 新表，存内容区块（多语言全在 blocks payload） ──
    `CREATE TABLE IF NOT EXISTS brand_narrative_contents (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      narrative_id uuid NOT NULL REFERENCES brand_narratives(id) ON DELETE CASCADE,
      blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS brand_narrative_contents_narrative_id_unique ON brand_narrative_contents (narrative_id)`,

    // ── brand_narratives_i18n: 展开 payload 为独立字段 ─────────────────────────
    `ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS large_title varchar(255) NOT NULL DEFAULT ''`,
    `ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT ''`,
    `ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS seo_title varchar(255) NOT NULL DEFAULT ''`,
    `ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS seo_description varchar(500) NOT NULL DEFAULT ''`,
    `ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '[]'::jsonb`,

    // ── 迁移现有 payload 数据 → 独立字段（payload 列已删除时跳过） ──────────────
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'brand_narratives_i18n' AND column_name = 'payload'
       ) THEN
         UPDATE brand_narratives_i18n
         SET
           title          = COALESCE(NULLIF(TRIM(payload->'hero'->>'smallTitle'), ''), title),
           large_title    = COALESCE(NULLIF(TRIM(payload->'hero'->>'largeTitle'), ''), large_title),
           description    = COALESCE(NULLIF(TRIM(payload->'hero'->>'description'), ''), description),
           stats          = COALESCE((payload->>'stats')::jsonb, stats)
         WHERE payload IS NOT NULL;

         UPDATE brand_narratives n
         SET cover_image = COALESCE(NULLIF(TRIM(t.payload->'hero'->>'coverImage'), ''), n.cover_image)
         FROM brand_narratives_i18n t
         WHERE t.narrative_id = n.id
           AND n.cover_image = ''
           AND t.payload->'hero'->>'coverImage' IS NOT NULL
           AND t.id = (
             SELECT id FROM brand_narratives_i18n
             WHERE narrative_id = n.id
             ORDER BY locale
             LIMIT 1
           );
       END IF;
     END $$;`,

    // ── brand_narrative_contents：把 brand_narratives.blocks 移入新表 ─────────────
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'brand_narratives' AND column_name = 'blocks'
       ) THEN
         INSERT INTO brand_narrative_contents (narrative_id, blocks, created_at, updated_at)
         SELECT id, COALESCE(blocks, '[]'::jsonb), now(), now()
         FROM brand_narratives
         ON CONFLICT (narrative_id) DO NOTHING;
       END IF;
     END $$;`,

    `DROP INDEX IF EXISTS brand_narratives_route_path_unique`,
    `ALTER TABLE brand_narratives DROP COLUMN IF EXISTS route_path`,
    `ALTER TABLE brand_narratives DROP COLUMN IF EXISTS blocks`,
    `ALTER TABLE brand_narratives_i18n DROP COLUMN IF EXISTS payload`,
  ];

  try {
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
    console.log('[DB] Auto-migration completed successfully');
  } catch (error) {
    console.error('[DB] Auto-migration error:', error);
  }
}
