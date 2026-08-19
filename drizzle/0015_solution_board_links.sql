-- 0015_solution_board_links: Many-to-many between solutions and product coverage boards
CREATE TABLE IF NOT EXISTS "solution_board_links" (
  "solution_id" uuid NOT NULL REFERENCES "solutions"("id") ON DELETE CASCADE,
  "board_id"    uuid NOT NULL REFERENCES "product_coverage_boards"("id") ON DELETE CASCADE,
  PRIMARY KEY ("solution_id", "board_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "solution_board_links_solution_id_idx"
  ON "solution_board_links" ("solution_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "solution_board_links_board_id_idx"
  ON "solution_board_links" ("board_id");
--> statement-breakpoint

-- Drop foreign key constraint and make category_id nullable (no longer required)
ALTER TABLE "solutions" DROP CONSTRAINT IF EXISTS "solutions_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "solutions" ALTER COLUMN "category_id" DROP NOT NULL;
