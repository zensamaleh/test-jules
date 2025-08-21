import { promises as fs } from 'fs';
import path from 'path';
// import pdf from 'pdf-parse'; // Will be dynamically imported
import { parse } from 'csv-parse/sync';

/**
 * A simple text chunking strategy.
 * Splits text into chunks of a specified size with overlap.
 * @param text The text to chunk.
 * @param chunkSize The size of each chunk in characters.
 * @param overlap The number of characters to overlap between chunks.
 * @returns An array of text chunks.
 */
function chunkText(text: string, chunkSize: number = 1500, overlap: number = 200): string[] {
    const chunks: string[] = [];
    if (!text) {
        return chunks;
    }
    // Replace multiple newlines/spaces with a single space for cleaner chunks
    const cleanedText = text.replace(/\s+/g, ' ').trim();

    let i = 0;
    while (i < cleanedText.length) {
        const end = Math.min(i + chunkSize, cleanedText.length);
        chunks.push(cleanedText.slice(i, end));
        i += chunkSize - overlap;
        if (i >= end) { // Ensure we don't get stuck in an infinite loop
            break;
        }
    }
    return chunks;
}

async function parsePdf(filePath: string): Promise<string> {
    const pdf = (await import('pdf-parse')).default;
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

async function parseCsv(filePath:string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
    });
    // Convert each row into a readable string format, like "column1: value1, column2: value2".
    return records.map((row: unknown) => {
        if (row && typeof row === 'object') {
            return Object.entries(row)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
        }
        return '';
    }).filter(Boolean).join('\n\n'); // filter(Boolean) removes empty strings
}

/**
 * Processes a file from a given path, extracts text, and splits it into chunks.
 * @param filePath The path to the file to be ingested.
 * @param originalFilename The original name of the file, used to determine file type.
 * @returns A promise that resolves to an array of text chunks.
 */
export async function processFileForIngestion(filePath: string, originalFilename: string): Promise<string[]> {
    console.log(`Starting ingestion for ${originalFilename} from path ${filePath}`);
    const fileExtension = path.extname(originalFilename).toLowerCase();
    let rawText = '';

    try {
        switch (fileExtension) {
            case '.pdf':
                rawText = await parsePdf(filePath);
                break;
            case '.csv':
                rawText = await parseCsv(filePath);
                break;
            case '.txt':
            case '.md':
                rawText = await fs.readFile(filePath, 'utf-8');
                break;
            default:
                console.warn(`Unsupported file type: ${fileExtension}. No specific parser available.`);
                // Optionally, you could try a generic text read as a fallback
                return [];
        }

        if (!rawText.trim()) {
            console.log(`No text content extracted from ${originalFilename}.`);
            return [];
        }

        console.log(`Extracted raw text. Length: ${rawText.length}. Now chunking...`);

        const textChunks = chunkText(rawText);

        console.log(`Chunked text into ${textChunks.length} chunks.`);

        return textChunks;

    } catch (error) {
        console.error(`Failed to process file ${originalFilename}:`, error);
        throw new Error(`Failed to ingest file: ${originalFilename}`);
    }
}
