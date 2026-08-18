DROP TABLE IF EXISTS "brand_narrative_translations";--> statement-breakpoint
DROP TABLE IF EXISTS "brand_narratives_i18n";--> statement-breakpoint
DROP TABLE IF EXISTS "brand_narratives";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."brand_narrative_hero_class";--> statement-breakpoint
CREATE TABLE "brand_narratives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"route_path" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_narratives_i18n" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"narrative_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"title" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_narratives_i18n" ADD CONSTRAINT "brand_narratives_i18n_narrative_id_brand_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."brand_narratives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_narratives_slug_unique" ON "brand_narratives" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_narratives_route_path_unique" ON "brand_narratives" USING btree ("route_path");--> statement-breakpoint
CREATE INDEX "brand_narratives_status_sort_idx" ON "brand_narratives" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_narratives_i18n_narrative_locale_unique" ON "brand_narratives_i18n" USING btree ("narrative_id","locale");--> statement-breakpoint
CREATE INDEX "brand_narratives_i18n_narrative_id_idx" ON "brand_narratives_i18n" USING btree ("narrative_id");
