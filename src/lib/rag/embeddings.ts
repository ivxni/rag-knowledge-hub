/**
 * Embedding generation wrapper.
 *
 * Handles batch processing to stay within API rate limits.
 * The batch size of 20 balances throughput with reliability —
 * larger batches risk timeouts on slower connections.
 */

import { getEmbeddingProvider } from "@/lib/llm";

const BATCH_SIZE = 20;

/** Generate a single embedding vector for a query or text passage. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  return provider.generateEmbedding(text);
}

/** Generate embeddings for multiple texts, processing in batches. */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await provider.generateEmbeddings(batch);
    results.push(...embeddings);
  }

  return results;
}
