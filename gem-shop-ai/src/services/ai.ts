import OpenAI from 'openai';

// It's best practice to use environment variables for API keys.
// The user will need to set this up in their environment.
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("Warning: OPENAI_API_KEY environment variable not set. AI services will not function.");
}

const openai = new OpenAI({
  apiKey: apiKey || 'DUMMY_KEY', // Fallback to a dummy key to avoid app crash
});

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generates embeddings for an array of texts using the specified model.
 * @param texts An array of strings to be converted into embeddings.
 * @returns A promise that resolves to an array of vector embeddings.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!apiKey) {
    console.error("Cannot generate embeddings: OPENAI_API_KEY is not set.");
    // Return dummy vectors of the correct dimension to avoid breaking the flow
    return texts.map(() => Array(1536).fill(0));
  }

  // OpenAI's API can handle multiple inputs in a single request.
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map((embedding) => embedding.embedding);
}

/**
 * Generates a chat completion response based on a prompt and context.
 * @param systemPrompt The instructions for the AI model.
 * @param userQuestion The user's question.
 * @param contextChunks The relevant text chunks retrieved from the database.
 * @returns A promise that resolves to the AI's response message.
 */
export async function getChatCompletion(systemPrompt: string, userQuestion: string, contextChunks: string[]): Promise<string> {
  if (!apiKey) {
    console.error("Cannot get chat completion: OPENAI_API_KEY is not set.");
    return "Je ne peux pas répondre pour le moment car ma connexion aux services d'IA n'est pas configurée (clé API manquante).";
  }

  const context = contextChunks.join('\n\n---\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
            role: 'user',
            content: `Voici des extraits de documents pertinents pour ma question:\n\n${context}\n\nMa question est: "${userQuestion}"`,
        }
      ],
      temperature: 0.2, // Lower temperature for more factual answers
      max_tokens: 1000,
    });

    return response.choices[0].message?.content || "Je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Error getting chat completion:", error);
    return "Une erreur est survenue en contactant le service d'IA.";
  }
}
