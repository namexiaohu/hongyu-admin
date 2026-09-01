ALTER TABLE "homepage_configs" ADD COLUMN IF NOT EXISTS "about_hero_copy_style" text;

UPDATE "homepage_configs"
SET "about_hero_copy_style" = 'dark'
WHERE "about_hero_copy_style" IS NULL;
