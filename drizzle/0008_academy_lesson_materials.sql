ALTER TABLE "academy_lessons" ADD COLUMN IF NOT EXISTS "materials" jsonb DEFAULT '[]'::jsonb NOT NULL;
