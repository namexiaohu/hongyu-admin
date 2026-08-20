ALTER TABLE "homepage_configs_i18n"
  ADD COLUMN IF NOT EXISTS "education_title" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "education_description" text NOT NULL DEFAULT '';
