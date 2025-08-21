import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable not set. AI services will not function.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');

// As of late 2024, these are the recommended models.
const EMBEDDING_MODEL_NAME = 'text-embedding-004';
const CHAT_MODEL_NAME = 'gemini-1.5-flash-latest';

/**
 * Generates embeddings for an array of texts using the Gemini model.
 * @param texts An array of strings to be converted into embeddings.
 * @returns A promise that resolves to an array of vector embeddings.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!apiKey) {
    console.error("Cannot generate embeddings: GEMINI_API_KEY is not set.");
    // The default embedding dimension for text-embedding-004 is 768.
    return texts.map(() => Array(768).fill(0));
  }

  const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });

  // The API can handle multiple texts at once.
  const result = await embeddingModel.batchEmbedContents({
    requests: texts.map(text => ({ content: { role: "user", parts: [{ text }] } })),
  });

  return result.embeddings.map(embedding => embedding.values);
}

/**
 * Generates a chat completion response based on a prompt and context using Gemini.
 * @param systemPrompt The instructions for the AI model.
 * @param userQuestion The user's question.
 * @param contextChunks The relevant text chunks retrieved from the database.
 * @returns A promise that resolves to the AI's response message.
 */
export async function getChatCompletion(systemPrompt: string, userQuestion: string, contextChunks: string[]): Promise<string> {
  if (!apiKey) {
    console.error("Cannot get chat completion: GEMINI_API_KEY is not set.");
    return "Je ne peux pas répondre pour le moment car ma connexion aux services d'IA n'est pas configurée (clé API manquante).";
  }

  const chatModel = genAI.getGenerativeModel({
    model: CHAT_MODEL_NAME,
    systemInstruction: systemPrompt,
  });

  const context = contextChunks.join('\n\n---\n\n');
  const prompt = `Voici des extraits de documents pertinents pour ma question:\n\nCONTEXT:\n${context}\n\nQUESTION:\n${userQuestion}`;

  try {
    const result = await chatModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting chat completion from Gemini:", error);
    return "Une erreur est survenue en contactant le service d'IA de Google.";
  }
}
