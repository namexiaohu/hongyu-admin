-- 0030_surgeon_profile_fields
ALTER TABLE "surgeons"
  ADD COLUMN IF NOT EXISTS "certification_year" integer,
  ADD COLUMN IF NOT EXISTS "surgery_count" integer;
--> statement-breakpoint
ALTER TABLE "surgeons_i18n"
  ADD COLUMN IF NOT EXISTS "detail_description" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "other_certifications" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "specialties" jsonb NOT NULL DEFAULT '[]'::jsonb;
