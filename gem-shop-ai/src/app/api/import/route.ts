import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Import our new services using the configured path alias
import { processFileForIngestion } from '@/services/ingestion';
import { getEmbeddings } from '@/services/ai';
import * as db from '@/services/db';

/**
 * Handles the entire ingestion pipeline for a given file.
 * This is designed to be run as a background process.
 * @param filePath The path to the saved file.
 * @param filename The original name of the file.
 */
async function handleIngestion(filePath: string, filename: string) {
  try {
    console.log(`[Ingestion] Starting for ${filename}`);
    // 1. Process file to get text chunks
    const textChunks = await processFileForIngestion(filePath, filename);
    if (!textChunks || textChunks.length === 0) {
      console.log(`[Ingestion] No text chunks to process for ${filename}.`);
      return;
    }

    // 2. Get embeddings for the chunks
    console.log(`[Ingestion] Generating embeddings for ${textChunks.length} chunks.`);
    const embeddings = await getEmbeddings(textChunks);

    // 3. Save document and embeddings to the database
    console.log(`[Ingestion] Saving to database.`);
    const document = await db.insertDocument({
      name: filename,
      source_type: path.extname(filename).substring(1) || 'file',
    });

    const embeddingData = textChunks.map((chunk, i) => ({
      document_id: document.id,
      chunk_index: i,
      text_excerpt: chunk,
      vector: embeddings[i],
      metadata: JSON.stringify({ source_filename: filename, chunk_index: i }),
    }));

    await db.insertEmbeddings(embeddingData);

    console.log(`[Ingestion] Successfully completed for ${filename}.`);
    // Optional: Clean up the uploaded file after processing
    // await fs.unlink(filePath);

  } catch (error) {
    console.error(`[Ingestion] Background process failed for ${filename}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // In a real app, you might want to use a temporary directory
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    console.log(`File uploaded to ${filePath}. Triggering background ingestion.`);

    // Fire-and-forget the ingestion process.
    // In a real production app, this should be handed off to a robust job queue system
    // (e.g., BullMQ, RabbitMQ, AWS SQS) to ensure reliability and scalability.
    handleIngestion(filePath, file.name);

    return NextResponse.json({
      success: true,
      filename: file.name,
      message: 'File upload received. Ingestion process has started in the background.'
    });

  } catch (error) {
    console.error('Upload API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
