-- 0029_partner_center_editor_fields
ALTER TABLE "partner_centers"
  ADD COLUMN IF NOT EXISTS "email" varchar(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "website" varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_image" text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE "partner_centers" AS c
SET "website" = COALESCE((
  SELECT NULLIF(TRIM(t."website"), '')
  FROM "partner_centers_i18n" t
  WHERE t."center_id" = c."id"
  ORDER BY CASE WHEN t."locale" IN ('zh-CN', 'zh') THEN 0 ELSE 1 END, t."locale"
  LIMIT 1
), '')
WHERE COALESCE(TRIM(c."website"), '') = '';
--> statement-breakpoint
ALTER TABLE "partner_centers_i18n"
  ADD COLUMN IF NOT EXISTS "detail_description" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "stats" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "cooperation_info" jsonb NOT NULL DEFAULT '[]'::jsonb;
