/**
 * Local embedding provider using Transformers.js (ONNX runtime).
 *
 * Runs the all-MiniLM-L6-v2 model directly in Node.js — no external
 * API key required. The model (~23MB) is downloaded and cached on first use.
 * Produces 384-dimensional vectors suitable for cosine similarity search.
 */

import { pipeline } from "@xenova/transformers";
import type { EmbeddingProvider } from "./types";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const DIMENSIONS = 384;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME);
  }
  return extractorPromise;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  get dimensions(): number {
    return DIMENSIONS;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await getExtractor();
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const extractor = await getExtractor();
    const results: number[][] = [];

    // Process individually to avoid memory spikes with large batches
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      results.push(Array.from(output.data as Float32Array));
    }

    return results;
  }
}
