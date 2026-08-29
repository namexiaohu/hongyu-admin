CREATE TABLE IF NOT EXISTS "academy_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" "cms_status" DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "cover_image" text DEFAULT '' NOT NULL,
  "cover_mode" text DEFAULT '' NOT NULL,
  "cover_value" text DEFAULT '' NOT NULL,
  "teacher_count" integer DEFAULT 0 NOT NULL,
  "student_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificates_slug_unique" ON "academy_certificates" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_certificates_status_sort_idx" ON "academy_certificates" ("status", "sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_certificates_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "certificate_id" uuid NOT NULL REFERENCES "academy_certificates"("id") ON DELETE cascade,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "seo_title" varchar(255) DEFAULT '' NOT NULL,
  "seo_description" varchar(500) DEFAULT '' NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "learnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificates_i18n_cert_locale_unique" ON "academy_certificates_i18n" ("certificate_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_certificates_i18n_certificate_id_idx" ON "academy_certificates_i18n" ("certificate_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" "cms_status" DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "cover_image" text DEFAULT '' NOT NULL,
  "cover_mode" text DEFAULT '' NOT NULL,
  "cover_value" text DEFAULT '' NOT NULL,
  "teacher_count" integer DEFAULT 0 NOT NULL,
  "student_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_courses_slug_unique" ON "academy_courses" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_courses_status_sort_idx" ON "academy_courses" ("status", "sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_courses_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL REFERENCES "academy_courses"("id") ON DELETE cascade,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "seo_title" varchar(255) DEFAULT '' NOT NULL,
  "seo_description" varchar(500) DEFAULT '' NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "learnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_courses_i18n_course_locale_unique" ON "academy_courses_i18n" ("course_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_courses_i18n_course_id_idx" ON "academy_courses_i18n" ("course_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_certificate_courses" (
  "certificate_id" uuid NOT NULL REFERENCES "academy_certificates"("id") ON DELETE cascade,
  "course_id" uuid NOT NULL REFERENCES "academy_courses"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("certificate_id", "course_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_certificate_courses_certificate_id_idx" ON "academy_certificate_courses" ("certificate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_certificate_courses_course_id_idx" ON "academy_certificate_courses" ("course_id");
