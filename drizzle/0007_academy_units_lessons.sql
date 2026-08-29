CREATE TABLE IF NOT EXISTS "academy_units" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL REFERENCES "academy_courses"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "cover_image" text DEFAULT '' NOT NULL,
  "cover_mode" text DEFAULT '' NOT NULL,
  "cover_value" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_units_course_sort_idx" ON "academy_units" USING btree ("course_id","sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_units_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "unit_id" uuid NOT NULL REFERENCES "academy_units"("id") ON DELETE cascade,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_units_i18n_unit_locale_unique" ON "academy_units_i18n" USING btree ("unit_id","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_units_i18n_unit_id_idx" ON "academy_units_i18n" USING btree ("unit_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_lessons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "unit_id" uuid NOT NULL REFERENCES "academy_units"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "video_url" text DEFAULT '' NOT NULL,
  "duration_seconds" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_lessons_unit_sort_idx" ON "academy_lessons" USING btree ("unit_id","sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academy_lessons_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id" uuid NOT NULL REFERENCES "academy_lessons"("id") ON DELETE cascade,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academy_lessons_i18n_lesson_locale_unique" ON "academy_lessons_i18n" USING btree ("lesson_id","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academy_lessons_i18n_lesson_id_idx" ON "academy_lessons_i18n" USING btree ("lesson_id");
