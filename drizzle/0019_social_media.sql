CREATE TABLE IF NOT EXISTS "social_media_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "social_channels" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "overseas_contacts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_media_profiles_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "social_media_profiles"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "featured_posts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_media_profiles_i18n_profile_locale_unique"
  ON "social_media_profiles_i18n" ("profile_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_media_profiles_i18n_profile_id_idx"
  ON "social_media_profiles_i18n" ("profile_id");
