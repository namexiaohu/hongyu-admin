ALTER TABLE "editorial_contents"
  ADD COLUMN IF NOT EXISTS "body_link_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "editorial_contents"
  ADD COLUMN IF NOT EXISTS "body_link_url" text DEFAULT '' NOT NULL;
