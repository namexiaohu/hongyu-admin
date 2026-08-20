CREATE TABLE IF NOT EXISTS "inquiry_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inquiry_id" uuid NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
  "full_name" varchar(150) DEFAULT '' NOT NULL,
  "email" varchar(320) DEFAULT '' NOT NULL,
  "country" varchar(100) DEFAULT '' NOT NULL,
  "phone" varchar(50) DEFAULT '' NOT NULL,
  "job_title" varchar(150) DEFAULT '' NOT NULL,
  "company_name" varchar(150) DEFAULT '' NOT NULL,
  "vat" varchar(80) DEFAULT '' NOT NULL,
  "company_website" varchar(500) DEFAULT '' NOT NULL,
  "company_size" varchar(80) DEFAULT '' NOT NULL,
  "company_address" text DEFAULT '' NOT NULL,
  "project_name" varchar(200) DEFAULT '' NOT NULL,
  "industry" varchar(120) DEFAULT '' NOT NULL,
  "project_start" varchar(80) DEFAULT '' NOT NULL,
  "annual_target" varchar(120) DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inquiry_profiles_inquiry_id_unique" ON "inquiry_profiles" ("inquiry_id");
--> statement-breakpoint
INSERT INTO "inquiry_profiles" (
  "inquiry_id",
  "full_name",
  "email",
  "country",
  "phone",
  "job_title",
  "company_name",
  "vat",
  "company_website",
  "company_size",
  "company_address",
  "project_name",
  "industry",
  "project_start",
  "annual_target"
)
SELECT
  i.id,
  COALESCE(NULLIF(i.rfq_payload->'contact'->>'fullName', ''), i.full_name, ''),
  COALESCE(NULLIF(i.rfq_payload->'contact'->>'email', ''), i.email, ''),
  COALESCE(NULLIF(i.rfq_payload->'contact'->>'country', ''), i.country, ''),
  COALESCE(NULLIF(i.rfq_payload->'contact'->>'phone', ''), i.phone, ''),
  COALESCE(i.rfq_payload->'contact'->>'jobTitle', ''),
  COALESCE(NULLIF(i.rfq_payload->'contact'->>'company', ''), i.company, ''),
  COALESCE(i.rfq_payload->'contact'->>'vat', ''),
  COALESCE(i.rfq_payload->'contact'->>'website', ''),
  COALESCE(i.rfq_payload->'contact'->>'companySize', ''),
  COALESCE(i.rfq_payload->'contact'->>'companyAddress', ''),
  COALESCE(i.rfq_payload->'project'->>'projectName', ''),
  COALESCE(i.rfq_payload->'project'->>'industry', ''),
  COALESCE(i.rfq_payload->'project'->>'targetStartDate', ''),
  COALESCE(i.rfq_payload->'project'->>'annualVolumeEstimate', '')
FROM "inquiries" i
WHERE NOT EXISTS (
  SELECT 1 FROM "inquiry_profiles" p WHERE p.inquiry_id = i.id
);
