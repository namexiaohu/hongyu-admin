-- brand_narratives.blocks 已迁入 brand_narrative_contents，删除冗余列
ALTER TABLE brand_narratives DROP COLUMN IF EXISTS blocks;
