ALTER TABLE "homepage_configs_i18n" ADD COLUMN IF NOT EXISTS "solutions_items" jsonb DEFAULT '[]'::jsonb NOT NULL;
