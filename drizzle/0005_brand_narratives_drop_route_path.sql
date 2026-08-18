-- brand_narratives: route_path 与 slug 完全冗余，删除
DROP INDEX IF EXISTS brand_narratives_route_path_unique;
--> statement-breakpoint
ALTER TABLE brand_narratives DROP COLUMN IF EXISTS route_path;
