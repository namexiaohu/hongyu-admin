ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
ALTER TABLE "brand_narratives" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
ALTER TABLE "solutions" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
ALTER TABLE "partner_centers" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":true}'::jsonb NOT NULL;
ALTER TABLE "summits" ADD COLUMN IF NOT EXISTS "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":false}'::jsonb NOT NULL;
