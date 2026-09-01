ALTER TABLE "ui_strings" ADD COLUMN IF NOT EXISTS "site" varchar(16) DEFAULT 'web' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ui_string_translations" ADD COLUMN IF NOT EXISTS "site" varchar(16) DEFAULT 'web' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ui_string_translations" DROP CONSTRAINT IF EXISTS "ui_string_translations_key_ui_strings_key_fk";
--> statement-breakpoint
ALTER TABLE "ui_strings" DROP CONSTRAINT IF EXISTS "ui_strings_pkey";
--> statement-breakpoint
ALTER TABLE "ui_string_translations" DROP CONSTRAINT IF EXISTS "ui_string_translations_pkey";
--> statement-breakpoint
ALTER TABLE "ui_string_translations" DROP CONSTRAINT IF EXISTS "ui_string_translations_key_locale_pk";
--> statement-breakpoint
ALTER TABLE "ui_strings" ADD CONSTRAINT "ui_strings_site_key_pk" PRIMARY KEY("site","key");
--> statement-breakpoint
ALTER TABLE "ui_string_translations" ADD CONSTRAINT "ui_string_translations_site_key_locale_pk" PRIMARY KEY("site","key","locale");
--> statement-breakpoint
ALTER TABLE "ui_string_translations" ADD CONSTRAINT "ui_string_translations_site_key_ui_strings_site_key_fk" FOREIGN KEY ("site","key") REFERENCES "public"."ui_strings"("site","key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ui_strings_site_group_idx" ON "ui_strings" USING btree ("site","group");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ui_strings_site_status_idx" ON "ui_strings" USING btree ("site","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ui_string_translations_site_locale_idx" ON "ui_string_translations" USING btree ("site","locale");
