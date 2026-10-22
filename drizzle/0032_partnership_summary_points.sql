ALTER TABLE "website_configs"
  ADD COLUMN IF NOT EXISTS "partnership" jsonb DEFAULT '{"showSummaryPoints":true}'::jsonb NOT NULL;
