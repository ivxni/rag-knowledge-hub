/**
 * LLM Provider Factory.
 *
 * Uses singleton pattern to avoid re-initializing clients on every request.
 * Generation: Anthropic Claude (cloud API).
 * Embeddings: Local Transformers.js model (no API key needed).
 */

import { AnthropicProvider } from "./anthropic";
import { LocalEmbeddingProvider } from "./local-embeddings";
import type { GenerationProvider, EmbeddingProvider } from "./types";

let generationInstance: GenerationProvider | null = null;
let embeddingInstance: EmbeddingProvider | null = null;

export function getGenerationProvider(): GenerationProvider {
  if (!generationInstance) {
    generationInstance = new AnthropicProvider();
  }
  return generationInstance;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingInstance) {
    embeddingInstance = new LocalEmbeddingProvider();
  }
  return embeddingInstance;
}

export type { GenerationProvider, EmbeddingProvider } from "./types";
