/**
 * Local embedding provider using Transformers.js (ONNX WASM runtime).
 *
 * Runs the all-MiniLM-L6-v2 model directly in Node.js — no external
 * API key required. Uses the WASM backend (onnxruntime-web) for
 * compatibility with both local dev and Vercel serverless.
 * The model (~23MB) is downloaded and cached on first use.
 * Produces 384-dimensional vectors suitable for cosine similarity search.
 *
 * onnxruntime-node is replaced by onnxruntime-web via npm overrides
 * in package.json to avoid native binary issues on Vercel serverless.
 * The import is dynamic to prevent module-load crashes.
 */

import type { EmbeddingProvider } from "./types";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const DIMENSIONS = 384;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { env, pipeline } = await import("@xenova/transformers");

      if (process.env.VERCEL) {
        env.cacheDir = "/tmp/transformers-cache";
      }
      env.useBrowserCache = false;

      return pipeline("feature-extraction", MODEL_NAME);
    })();
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
