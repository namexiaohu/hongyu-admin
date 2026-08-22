ALTER TABLE "summits_i18n" ADD COLUMN "stats" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "summits_i18n" ADD COLUMN "sponsors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN "video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN "background_image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN "background_mode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN "background_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "summits" ADD COLUMN "show_cover_on_background" boolean DEFAULT true NOT NULL;