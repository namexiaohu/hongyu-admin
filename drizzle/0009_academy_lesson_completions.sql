CREATE TABLE IF NOT EXISTS "academy_lesson_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "completed_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_lesson_completions"
    ADD CONSTRAINT "academy_lesson_completions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_lesson_completions"
    ADD CONSTRAINT "academy_lesson_completions_lesson_id_academy_lessons_id_fk"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_lesson_completions_user_lesson_unique"
  ON "academy_lesson_completions" ("user_id", "lesson_id");
CREATE INDEX IF NOT EXISTS "academy_lesson_completions_user_id_idx"
  ON "academy_lesson_completions" ("user_id");
CREATE INDEX IF NOT EXISTS "academy_lesson_completions_lesson_id_idx"
  ON "academy_lesson_completions" ("lesson_id");
