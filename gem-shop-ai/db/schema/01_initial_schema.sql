-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for uploaded documents / data sources
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,           -- For multi-tenant support
  name text,                -- Filename or data source name
  source_type text NOT NULL, -- e.g., "csv", "pdf", "shopify"
  source_ref text,          -- Original id, filename, or reference
  content text,             -- Full content, if applicable
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table for text chunks and their vector embeddings
CREATE TABLE embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  vector vector(1536) NOT NULL, -- Depends on the embedding model, 1536 is common for OpenAI
  text_excerpt text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create an index for efficient vector similarity search
-- Using ivfflat as recommended in the plan.
CREATE INDEX ON embeddings USING ivfflat (vector vector_l2_ops) WITH (lists = 100);

-- Add comments for clarity
COMMENT ON TABLE documents IS 'Stores metadata about ingested source documents and data.';
COMMENT ON TABLE embeddings IS 'Stores text chunks (excerpts) and their corresponding vector embeddings for semantic search.';
COMMENT ON COLUMN embeddings.vector IS 'Vector representation of the text_excerpt, used for similarity search.';
