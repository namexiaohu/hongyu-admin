ALTER TABLE "homepage_configs" ADD COLUMN IF NOT EXISTS "banner_carousel_fit_mode" text;
ALTER TABLE "homepage_configs" ADD COLUMN IF NOT EXISTS "about_carousel_fit_mode" text;

UPDATE "homepage_configs"
SET "banner_carousel_fit_mode" = 'contain'
WHERE "banner_carousel_fit_mode" IS NULL;

UPDATE "homepage_configs"
SET "about_carousel_fit_mode" = 'contain-center'
WHERE "about_carousel_fit_mode" IS NULL;
