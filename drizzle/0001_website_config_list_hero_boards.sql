ALTER TABLE "website_configs" ADD COLUMN IF NOT EXISTS "list_hero_boards" jsonb DEFAULT '{}'::jsonb NOT NULL;
