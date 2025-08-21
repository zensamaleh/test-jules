-- Table to store the configuration of each specialized assistant (Gem).
CREATE TABLE gems (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid, -- For multi-tenant support
    name text NOT NULL,
    description text, -- The "mission" or "role" of the Gem
    system_prompt text, -- The base system prompt / instructions
    -- For now, we can embed rules in the system_prompt or add a simple text field.
    rules text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE gems IS 'Stores configured AI assistants, known as Gems, with their specific instructions and personality.';

-- Junction table to create a many-to-many relationship between Gems and Documents.
CREATE TABLE gem_documents (
    gem_id uuid NOT NULL REFERENCES gems(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (gem_id, document_id)
);

COMMENT ON TABLE gem_documents IS 'Links Gems to the specific documents they are allowed to use as their knowledge base.';

-- Optional: Add indexes for faster lookups.
CREATE INDEX idx_gems_tenant_id ON gems(tenant_id);
CREATE INDEX idx_gem_documents_gem_id ON gem_documents(gem_id);
CREATE INDEX idx_gem_documents_document_id ON gem_documents(document_id);
