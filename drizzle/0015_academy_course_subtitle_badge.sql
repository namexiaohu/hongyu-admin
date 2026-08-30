ALTER TABLE "academy_courses_i18n"
  ADD COLUMN IF NOT EXISTS "subtitle" varchar(255) DEFAULT '' NOT NULL;

ALTER TABLE "academy_courses_i18n"
  ADD COLUMN IF NOT EXISTS "badge_label" varchar(120) DEFAULT '' NOT NULL;
