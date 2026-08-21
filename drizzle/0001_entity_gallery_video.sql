ALTER TABLE "brand_narratives" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_narratives" ADD COLUMN "video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN "video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_centers" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_centers" ADD COLUMN "video_url" text DEFAULT '' NOT NULL;
