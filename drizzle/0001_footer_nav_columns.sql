ALTER TABLE "website_configs" ADD COLUMN IF NOT EXISTS "footer_nav_columns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "website_configs" SET "footer_nav_columns" = "nav_columns" WHERE COALESCE(jsonb_array_length("footer_nav_columns"), 0) = 0 AND COALESCE(jsonb_array_length("nav_columns"), 0) > 0;
