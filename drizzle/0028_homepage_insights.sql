ALTER TABLE "homepage_configs"
  ADD COLUMN IF NOT EXISTS "insights_article_count" integer;

UPDATE "homepage_configs"
SET "insights_article_count" = 5
WHERE "insights_article_count" IS NULL;

ALTER TABLE "homepage_configs"
  ALTER COLUMN "insights_article_count" SET DEFAULT 5;

ALTER TABLE "homepage_configs"
  ALTER COLUMN "insights_article_count" SET NOT NULL;

ALTER TABLE "homepage_configs_i18n"
  ADD COLUMN IF NOT EXISTS "insights_title" text;

UPDATE "homepage_configs_i18n"
SET "insights_title" = ''
WHERE "insights_title" IS NULL;

ALTER TABLE "homepage_configs_i18n"
  ALTER COLUMN "insights_title" SET DEFAULT '';

ALTER TABLE "homepage_configs_i18n"
  ALTER COLUMN "insights_title" SET NOT NULL;
