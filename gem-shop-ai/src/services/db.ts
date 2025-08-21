import sql from '@/lib/db'; // Import the real DB client

// --- TYPE DEFINITIONS ---
// These interfaces describe the shape of the data returned from the database.

export interface Document {
  id: string;
  tenant_id?: string | null;
  name: string;
  source_type: string;
  source_ref?: string | null;
  content?: string | null;
  metadata?: object | null;
  created_at: Date;
}

export interface Embedding {
  id: string;
  document_id: string;
  chunk_index: number;
  vector: number[];
  text_excerpt: string;
  metadata?: string | null; // Storing as a JSON string
  created_at: Date;
}

export interface Gem {
    id: string;
    tenant_id?: string | null;
    name: string;
    description: string;
    system_prompt?: string | null;
    rules?: string | null;
    created_at: Date;
    updated_at: Date;
}

// This type is used for the bulk insert helper
type EmbeddingToInsert = Omit<Embedding, 'id' | 'created_at'>;


// --- DATABASE FUNCTIONS ---

export async function insertDocument(doc: Omit<Document, 'id' | 'created_at'>): Promise<Document> {
  const result = await sql<Document[]>`
    INSERT INTO documents (name, source_type, source_ref, content, metadata)
    VALUES (${doc.name}, ${doc.source_type}, ${doc.source_ref || null}, ${doc.content || null}, ${doc.metadata ? JSON.stringify(doc.metadata) : null})
    RETURNING *;
  `;
  return result[0];
}

export async function insertEmbeddings(embeddings: EmbeddingToInsert[]): Promise<void> {
    // The 'postgres' library is highly efficient at handling bulk inserts.
    // We just pass the array of objects and the keys to insert.
    await sql`
        INSERT INTO embeddings (document_id, chunk_index, vector, text_excerpt, metadata)
        ${sql(embeddings, 'document_id', 'chunk_index', 'vector', 'text_excerpt', 'metadata')}
    `;
}

export async function createGem(gemData: Omit<Gem, 'id' | 'created_at' | 'updated_at'>): Promise<Gem> {
    const result = await sql<Gem[]>`
        INSERT INTO gems (name, description, system_prompt, rules)
        VALUES (${gemData.name}, ${gemData.description}, ${gemData.system_prompt || null}, ${gemData.rules || null})
        RETURNING *;
    `;
    return result[0];
}

export async function linkDocumentsToGem(gem_id: string, document_ids: string[]): Promise<void> {
    if (document_ids.length === 0) return;
    const links = document_ids.map(doc_id => ({ gem_id, document_id: doc_id }));
    await sql`
        INSERT INTO gem_documents (gem_id, document_id)
        ${sql(links, 'gem_id', 'document_id')}
    `;
}

export async function listAllDocuments(): Promise<Document[]> {
    return await sql<Document[]>`SELECT * FROM documents ORDER BY created_at DESC;`;
}

export async function listAllGems(): Promise<Gem[]> {
    return await sql<Gem[]>`SELECT * FROM gems ORDER BY created_at DESC;`;
}

export async function getGemById(id: string): Promise<Gem | undefined> {
    const result = await sql<Gem[]>`SELECT * FROM gems WHERE id = ${id};`;
    return result[0];
}

export async function findRelevantChunksForGem(gem_id: string, queryVector: number[], topK: number = 5): Promise<(Embedding & {similarity: number})[]> {
    // pgvector uses a string representation for vectors: '[1,2,3]'
    const vectorString = `[${queryVector.join(',')}]`;

    // This query finds the document IDs for the gem, then uses them to filter
    // the embeddings table and performs a cosine distance search (1 - similarity).
    const results = await sql<(Embedding & {similarity: number})[]>`
        SELECT
            e.*,
            1 - (e.vector <=> ${vectorString}) as similarity
        FROM embeddings e
        WHERE e.document_id IN (
            SELECT document_id FROM gem_documents WHERE gem_id = ${gem_id}
        )
        ORDER BY similarity DESC
        LIMIT ${topK};
    `;
    return results;
}
