CREATE TABLE IF NOT EXISTS "academy_lesson_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "content" text NOT NULL,
  "video_position_seconds" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_lesson_notes"
    ADD CONSTRAINT "academy_lesson_notes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_lesson_notes"
    ADD CONSTRAINT "academy_lesson_notes_lesson_id_academy_lessons_id_fk"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "academy_lesson_notes_user_lesson_created_idx"
  ON "academy_lesson_notes" ("user_id", "lesson_id", "created_at" DESC);
