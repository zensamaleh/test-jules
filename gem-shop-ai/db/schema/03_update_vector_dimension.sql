-- The new Gemini embedding model (text-embedding-004) has a dimension of 768.
-- The previous OpenAI model (text-embedding-3-small) had a dimension of 1536.
-- We need to alter the 'vector' column to match the new dimension.

-- WARNING: This is a destructive operation. It will remove all existing data
-- in the 'embeddings' table. In a real production environment with existing data,
-- you would need a more sophisticated migration strategy, such as:
-- 1. Create a new temporary table with the correct dimension.
-- 2. Backfill the new table by re-calculating embeddings for all existing documents.
-- 3. Swap the tables and drop the old one.

-- For this development stage, we will simply clear the table and alter the column.
TRUNCATE TABLE embeddings;

ALTER TABLE embeddings
ALTER COLUMN vector TYPE vector(768);

COMMENT ON COLUMN embeddings.vector IS 'Vector representation (Gemini, 768 dimensions) of the text_excerpt.';
