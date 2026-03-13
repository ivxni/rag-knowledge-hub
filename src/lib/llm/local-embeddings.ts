/**
 * Local embedding provider using Transformers.js (ONNX runtime).
 *
 * Runs the all-MiniLM-L6-v2 model directly in Node.js — no external
 * API key required. The model (~23MB) is downloaded and cached on first use.
 * Produces 384-dimensional vectors suitable for cosine similarity search.
 *
 * On Vercel serverless, uses /tmp for model caching and WASM backend
 * since native onnxruntime-node binaries aren't available.
 */

import { env, pipeline } from "@xenova/transformers";
import type { EmbeddingProvider } from "./types";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const DIMENSIONS = 384;
const IS_VERCEL = !!process.env.VERCEL;

if (IS_VERCEL) {
  env.cacheDir = "/tmp/transformers-cache";
}
env.useBrowserCache = false;

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
