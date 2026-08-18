-- brand_narratives: 封面图从翻译表移到主表
ALTER TABLE brand_narratives ADD COLUMN IF NOT EXISTS cover_image text NOT NULL DEFAULT '';
--> statement-breakpoint

-- brand_narrative_contents: 内容区块独立存表
CREATE TABLE IF NOT EXISTS brand_narrative_contents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  narrative_id uuid NOT NULL REFERENCES brand_narratives(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS brand_narrative_contents_narrative_id_unique ON brand_narrative_contents (narrative_id);
--> statement-breakpoint

-- brand_narratives_i18n: payload 字段展开为独立列
ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS large_title varchar(255) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS seo_title varchar(255) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS seo_description varchar(500) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE brand_narratives_i18n ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- 数据迁移：payload → 独立字段
UPDATE brand_narratives_i18n
SET
  title         = COALESCE(NULLIF(TRIM(payload->'hero'->>'smallTitle'), ''), title),
  large_title   = COALESCE(NULLIF(TRIM(payload->'hero'->>'largeTitle'), ''), ''),
  description   = COALESCE(NULLIF(TRIM(payload->'hero'->>'description'), ''), ''),
  stats         = COALESCE((payload->>'stats')::jsonb, '[]'::jsonb)
WHERE payload IS NOT NULL AND large_title = '';
--> statement-breakpoint

-- 封面图迁移：取首条翻译的 coverImage → 主表
UPDATE brand_narratives n
SET cover_image = COALESCE(NULLIF(TRIM(t.payload->'hero'->>'coverImage'), ''), '')
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
--> statement-breakpoint

-- 内容区块迁移：brand_narratives.blocks → brand_narrative_contents
INSERT INTO brand_narrative_contents (narrative_id, blocks, created_at, updated_at)
SELECT id, COALESCE(blocks, '[]'::jsonb), now(), now()
FROM brand_narratives
WHERE NOT EXISTS (
  SELECT 1 FROM brand_narrative_contents WHERE narrative_id = brand_narratives.id
);
