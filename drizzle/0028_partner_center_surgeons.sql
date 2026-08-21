-- 0028_partner_center_surgeons: M2M between partner centers and surgeons
CREATE TABLE IF NOT EXISTS "partner_center_surgeons" (
  "center_id" uuid NOT NULL REFERENCES "partner_centers"("id") ON DELETE CASCADE,
  "surgeon_id" uuid NOT NULL REFERENCES "surgeons"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("center_id", "surgeon_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_center_surgeons_center_id_idx"
  ON "partner_center_surgeons" ("center_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_center_surgeons_surgeon_id_idx"
  ON "partner_center_surgeons" ("surgeon_id");
