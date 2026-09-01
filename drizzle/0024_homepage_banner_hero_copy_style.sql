ALTER TABLE "homepage_configs" ADD COLUMN IF NOT EXISTS "banner_hero_copy_style" text;

UPDATE "homepage_configs"
SET "banner_hero_copy_style" = 'light'
WHERE "banner_hero_copy_style" IS NULL;
