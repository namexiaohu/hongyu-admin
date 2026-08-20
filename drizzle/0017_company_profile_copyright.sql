ALTER TABLE "company_profiles_i18n"
  ADD COLUMN IF NOT EXISTS "copyright" varchar(255) NOT NULL DEFAULT '';
