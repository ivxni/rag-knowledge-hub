/**
 * Embedding provider using the Hugging Face Inference API.
 *
 * Calls sentence-transformers/all-MiniLM-L6-v2 via HTTP — same model
 * previously run locally via ONNX, now served by HF for reliable
 * deployment on serverless platforms (Vercel).
 *
 * 384-dimensional vectors, cosine similarity compatible.
 * Requires HUGGINGFACE_TOKEN (free account at huggingface.co).
 */

import type { EmbeddingProvider } from "./types";

const MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2";
const DIMENSIONS = 384;
const BATCH_SIZE = 16;

export class LocalEmbeddingProvider implements EmbeddingProvider {
  get dimensions(): number {
    return DIMENSIONS;
  }

  private get headers(): Record<string, string> {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
      throw new Error(
        "HUGGINGFACE_TOKEN is not set. Get a free token at https://huggingface.co/settings/tokens"
      );
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.callApi([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const embeddings = await this.callApi(batch);
      results.push(...embeddings);
    }
    return results;
  }

  private async callApi(inputs: string[]): Promise<number[][]> {
    const res = await fetch(MODEL_URL, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ inputs, options: { wait_for_model: true } }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HF Embedding API error ${res.status}: ${body}`);
    }

    return res.json();
  }
}
