/**
 * RAG answer generator.
 *
 * Constructs a system prompt that includes retrieved document chunks
 * as numbered sources, then sends the user query to the LLM.
 * The prompt explicitly constrains the model to answer ONLY from
 * the provided context to prevent hallucination.
 */

import { getGenerationProvider } from "@/lib/llm";
import type { RetrievedChunk, SourceReference } from "@/types";

/**
 * Builds the system prompt with embedded source context.
 * Each source is numbered and includes its document title
 * and relevance score for transparency.
 */
function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const contextBlocks = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: "${chunk.document_title}" (relevance: ${(chunk.similarity * 100).toFixed(1)}%)]\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  return `You are a knowledgeable assistant that answers questions based on the provided knowledge base.

INSTRUCTIONS:
- Answer the question using ONLY the information from the provided sources below.
- If the sources don't contain enough information, clearly state that and explain what you can infer.
- Reference sources by their number (e.g., [Source 1]) when citing information.
- Be concise but thorough. Use structured formatting (bullet points, headers) when appropriate.
- Respond in the same language as the user's question.

KNOWLEDGE BASE CONTEXT:
${contextBlocks}`;
}

/** Generate a complete answer with source citations (non-streaming). */
export async function generateAnswer(
  query: string,
  chunks: RetrievedChunk[]
): Promise<{ answer: string; sources: SourceReference[] }> {
  const provider = getGenerationProvider();
  const systemPrompt = buildSystemPrompt(chunks);
  const answer = await provider.generateResponse(systemPrompt, query);

  const sources: SourceReference[] = chunks.map((chunk) => ({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    document_title: chunk.document_title,
    content: chunk.content,
    similarity: chunk.similarity,
  }));

  return { answer, sources };
}

/** Generate a streaming answer with source citations. */
export async function streamAnswer(
  query: string,
  chunks: RetrievedChunk[]
): Promise<{ stream: ReadableStream; sources: SourceReference[] }> {
  const provider = getGenerationProvider();
  const systemPrompt = buildSystemPrompt(chunks);
  const stream = await provider.streamResponse(systemPrompt, query);

  const sources: SourceReference[] = chunks.map((chunk) => ({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    document_title: chunk.document_title,
    content: chunk.content,
    similarity: chunk.similarity,
  }));

  return { stream, sources };
}
