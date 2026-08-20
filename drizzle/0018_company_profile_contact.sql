ALTER TABLE "company_profiles"
  ADD COLUMN IF NOT EXISTS "company_email" varchar(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "business_email" varchar(255) NOT NULL DEFAULT '';

UPDATE "company_profiles"
SET "company_email" = "email"
WHERE "company_email" = '' AND "email" <> '';

ALTER TABLE "company_profiles"
  DROP COLUMN IF EXISTS "phone",
  DROP COLUMN IF EXISTS "email";

ALTER TABLE "company_profiles_i18n"
  ADD COLUMN IF NOT EXISTS "contact_phone" varchar(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "address" varchar(400) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "business_hours" varchar(200) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "business_hotline" varchar(120) NOT NULL DEFAULT '';
