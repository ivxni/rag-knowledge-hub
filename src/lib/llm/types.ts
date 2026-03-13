/**
 * Abstract interfaces for LLM providers.
 *
 * Generation and embedding are separated because not all providers
 * offer both capabilities (e.g., Claude has no embedding API).
 * Generation uses Anthropic Claude; embeddings use HuggingFace Inference API.
 */

export interface GenerationProvider {
  generateResponse(systemPrompt: string, userMessage: string): Promise<string>;
  streamResponse(systemPrompt: string, userMessage: string): Promise<ReadableStream>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  /** Vector dimensionality — must match the pgvector column definition. */
  get dimensions(): number;
}

export interface LLMConfig {
  generation: {
    provider: "anthropic";
    model?: string;
  };
  embedding: {
    provider: "huggingface";
    model?: string;
  };
}
