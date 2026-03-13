/**
 * Embedding provider using the HuggingFace Inference API (official SDK).
 *
 * Calls sentence-transformers/all-MiniLM-L6-v2 via the @huggingface/inference
 * SDK which handles task routing and provider selection automatically.
 *
 * 384-dimensional vectors, cosine similarity compatible.
 * Requires HUGGINGFACE_TOKEN (free account at huggingface.co).
 */

import { InferenceClient } from "@huggingface/inference";
import type { EmbeddingProvider } from "./types";

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const DIMENSIONS = 384;

function getClient(): InferenceClient {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    throw new Error(
      "HUGGINGFACE_TOKEN is not set. Get a free token at https://huggingface.co/settings/tokens"
    );
  }
  return new InferenceClient(token);
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  get dimensions(): number {
    return DIMENSIONS;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const client = getClient();
    const result = await client.featureExtraction({
      model: MODEL,
      inputs: text,
    });
    return result as number[];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const client = getClient();
    const results: number[][] = [];

    for (const text of texts) {
      const result = await client.featureExtraction({
        model: MODEL,
        inputs: text,
      });
      results.push(result as number[]);
    }

    return results;
  }
}
