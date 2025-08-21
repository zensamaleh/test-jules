import { NextResponse } from 'next/server';
import { listAllDocuments } from '@/services/db';

export async function GET() {
  try {
    const documents = await listAllDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error('[API /documents] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to fetch documents: ${errorMessage}` }, { status: 500 });
  }
}
