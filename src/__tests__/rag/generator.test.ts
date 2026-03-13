import { describe, it, expect, vi } from "vitest";
import type { RetrievedChunk } from "@/types";

vi.mock("@/lib/llm", () => ({
  getGenerationProvider: () => ({
    generateResponse: vi.fn().mockResolvedValue(
      "Based on the provided sources, RAG combines retrieval with generation. [Source 1]"
    ),
    streamResponse: vi.fn().mockResolvedValue(new ReadableStream()),
  }),
}));

const { generateAnswer, streamAnswer } = await import(
  "@/lib/rag/generator"
);

const mockChunks: RetrievedChunk[] = [
  {
    id: "chunk-1",
    document_id: "doc-1",
    document_title: "RAG Architecture",
    content: "RAG combines retrieval with generation for grounded answers.",
    chunk_index: 0,
    similarity: 0.92,
  },
  {
    id: "chunk-2",
    document_id: "doc-2",
    document_title: "Prompt Engineering",
    content: "System prompts define the AI behavior and constraints.",
    chunk_index: 1,
    similarity: 0.85,
  },
];

describe("generateAnswer", () => {
  it("returns an answer string and source references", async () => {
    const { answer, sources } = await generateAnswer(
      "What is RAG?",
      mockChunks
    );

    expect(typeof answer).toBe("string");
    expect(answer.length).toBeGreaterThan(0);
    expect(sources).toHaveLength(2);
  });

  it("maps source references from chunks", async () => {
    const { sources } = await generateAnswer("What is RAG?", mockChunks);

    expect(sources[0]).toMatchObject({
      chunk_id: "chunk-1",
      document_id: "doc-1",
      document_title: "RAG Architecture",
      similarity: 0.92,
    });

    expect(sources[1]).toMatchObject({
      chunk_id: "chunk-2",
      document_id: "doc-2",
      document_title: "Prompt Engineering",
    });
  });

  it("handles empty chunks array", async () => {
    const { answer, sources } = await generateAnswer("Any question?", []);
    expect(typeof answer).toBe("string");
    expect(sources).toHaveLength(0);
  });
});

describe("streamAnswer", () => {
  it("returns a stream and source references", async () => {
    const { stream, sources } = await streamAnswer(
      "What is RAG?",
      mockChunks
    );

    expect(stream).toBeInstanceOf(ReadableStream);
    expect(sources).toHaveLength(2);
  });
});
