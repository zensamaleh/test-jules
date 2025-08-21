import { NextRequest, NextResponse } from 'next/server';
import { createGem, linkDocumentsToGem, listAllGems } from '@/services/db';

export async function GET() {
    try {
        const gems = await listAllGems();
        return NextResponse.json(gems);
    } catch (error) {
        console.error('[API GET /gems] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to fetch Gems: ${errorMessage}` }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, documentIds } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required.' }, { status: 400 });
    }

    if (!Array.isArray(documentIds)) {
        return NextResponse.json({ error: 'documentIds must be an array.' }, { status: 400 });
    }

    // 1. Create the Gem
    console.log(`[API /gems] Creating Gem: ${name}`);
    const newGem = await createGem({
      name,
      description,
      // In a real app, you'd construct a more dynamic system prompt here
      // and likely store the rules in a structured way.
      system_prompt: `You are an AI assistant named "${name}". Your mission is: "${description}". You must strictly adhere to the information found in the provided documents and not invent answers.`,
    });

    // 2. Link documents if any are provided
    if (documentIds.length > 0) {
      console.log(`[API /gems] Linking ${documentIds.length} documents to Gem ${newGem.id}`);
      await linkDocumentsToGem(newGem.id, documentIds);
    }

    return NextResponse.json(newGem, { status: 201 });

  } catch (error) {
    console.error('[API /gems] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to create Gem: ${errorMessage}` }, { status: 500 });
  }
}
