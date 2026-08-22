ALTER TABLE "brand_narratives" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_narratives" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial_contents" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial_contents" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_centers" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_centers" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cover_image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN IF NOT EXISTS "cover_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN IF NOT EXISTS "cover_value" text DEFAULT '' NOT NULL;