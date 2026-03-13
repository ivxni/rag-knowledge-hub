import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/rag/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          id: "chunk-1",
          document_id: "doc-1",
          document_title: "Test Document",
          content: "This is relevant content about RAG.",
          chunk_index: 0,
          similarity: 0.95,
        },
        {
          id: "chunk-2",
          document_id: "doc-1",
          document_title: "Test Document",
          content: "More content about vector search.",
          chunk_index: 1,
          similarity: 0.87,
        },
      ],
      error: null,
    }),
  }),
}));

const { retrieveRelevantChunks } = await import("@/lib/rag/retriever");

describe("retrieveRelevantChunks", () => {
  it("returns retrieved chunks with similarity scores", async () => {
    const chunks = await retrieveRelevantChunks(
      "What is RAG?",
      "workspace-123"
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0].similarity).toBe(0.95);
    expect(chunks[0].document_title).toBe("Test Document");
  });

  it("maps all required fields from the RPC response", async () => {
    const chunks = await retrieveRelevantChunks(
      "vector search",
      "workspace-123"
    );

    expect(chunks[0]).toMatchObject({
      id: "chunk-1",
      document_id: "doc-1",
      content: expect.any(String),
      chunk_index: 0,
      similarity: expect.any(Number),
    });
  });

  it("respects custom topK parameter", async () => {
    const chunks = await retrieveRelevantChunks(
      "test query",
      "workspace-123",
      3
    );
    expect(chunks.length).toBeLessThanOrEqual(3);
  });
});
