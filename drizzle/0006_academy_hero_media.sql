ALTER TABLE "academy_certificates" ADD COLUMN IF NOT EXISTS "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD COLUMN IF NOT EXISTS "video_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "video_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
