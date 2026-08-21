-- 0033_narrative_solution_background
-- Partner centers: show_cover default true + backfill
ALTER TABLE "partner_centers"
  ALTER COLUMN "show_cover_on_background" SET DEFAULT true;
UPDATE "partner_centers" SET "show_cover_on_background" = true;

-- Brand narratives: big background + show cover (default on; leave background empty)
ALTER TABLE "brand_narratives"
  ADD COLUMN IF NOT EXISTS "background_image" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_mode" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_value" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean NOT NULL DEFAULT true;

UPDATE "brand_narratives" SET "show_cover_on_background" = true;

-- Solutions: same
ALTER TABLE "solutions"
  ADD COLUMN IF NOT EXISTS "background_image" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_mode" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_value" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean NOT NULL DEFAULT true;

UPDATE "solutions" SET "show_cover_on_background" = true;
