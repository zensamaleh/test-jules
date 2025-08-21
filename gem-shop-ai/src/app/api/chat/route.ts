import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddings, getChatCompletion } from '@/services/ai';
import { findRelevantChunksForGem, getGemById } from '@/services/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message: userMessage, gemId } = body;

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }
    if (!gemId || typeof gemId !== 'string') {
      return NextResponse.json({ error: 'A valid Gem ID is required.' }, { status: 400 });
    }

    console.log(`[Chat API] Received message for Gem ${gemId}: "${userMessage}"`);

    // 1. Fetch the Gem's configuration
    const gem = await getGemById(gemId);
    if (!gem) {
        return NextResponse.json({ error: 'Gem not found.' }, { status: 404 });
    }

    // 2. Get embedding for the user's message.
    console.log(`[Chat API] Generating embedding for message.`);
    const queryEmbedding = (await getEmbeddings([userMessage]))[0];

    // 3. Find relevant chunks specifically for this Gem.
    console.log(`[Chat API] Searching for relevant chunks for Gem ${gemId}.`);
    const relevantChunks = await findRelevantChunksForGem(gemId, queryEmbedding, 5);

    // 4. Use the Gem's specific system prompt.
    const systemPrompt = gem.system_prompt || `You are a helpful assistant named ${gem.name}.`;
    console.log(`[Chat API] Using system prompt for ${gem.name}`);

    // 5. Call the LLM with the Gem-specific context.
    console.log(`[Chat API] Calling LLM for chat completion.`);
    const llmResponse = await getChatCompletion(
      systemPrompt,
      userMessage,
      relevantChunks.map(c => c.text_excerpt)
    );

    // 6. Return the response and sources.
    const sourcesForClient = relevantChunks.map(chunk => {
        let name = chunk.document_id; // Default to document_id
        if (chunk.metadata) {
            try {
                const parsedMeta = JSON.parse(chunk.metadata);
                if (parsedMeta && typeof parsedMeta.source_filename === 'string') {
                    name = parsedMeta.source_filename;
                }
            } catch (e) {
                console.warn(`[Chat API] Failed to parse metadata for chunk ${chunk.id}`, e);
            }
        }
        return {
            ...chunk,
            name,
        };
    });

    console.log(`[Chat API] Sending response to client.`);
    return NextResponse.json({
      response: llmResponse,
      sources: sourcesForClient,
    });

  } catch (error) {
    console.error('[Chat API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `An internal server error occurred: ${errorMessage}` }, { status: 500 });
  }
}
