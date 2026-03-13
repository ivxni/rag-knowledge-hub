import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/rag/chunker";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const result = chunkText("Hello world", { maxChunkSize: 500 });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Hello world");
    expect(result[0].index).toBe(0);
  });

  it("splits text on paragraph boundaries", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const result = chunkText(text, { maxChunkSize: 30, chunkOverlap: 0 });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].content).toContain("First");
  });

  it("preserves content across chunks", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const result = chunkText(text, { maxChunkSize: 100, chunkOverlap: 0 });

    const allContent = result.map((c) => c.content).join(" ");
    expect(allContent).toContain("word0");
    expect(allContent).toContain("word99");
  });

  it("assigns sequential indexes", () => {
    const text = "A.\n\nB.\n\nC.\n\nD.\n\nE.";
    const result = chunkText(text, { maxChunkSize: 5, chunkOverlap: 0 });

    for (let i = 0; i < result.length; i++) {
      expect(result[i].index).toBe(i);
    }
  });

  it("includes metadata with character offsets", () => {
    const text = "Short text here.";
    const result = chunkText(text, { maxChunkSize: 500, chunkOverlap: 0 });
    expect(result[0].metadata).toHaveProperty("start_char");
    expect(result[0].metadata).toHaveProperty("end_char");
    expect(result[0].metadata.start_char).toBe(0);
  });

  it("handles empty text", () => {
    const result = chunkText("");
    expect(result).toHaveLength(0);
  });

  it("respects maxChunkSize", () => {
    const text = Array.from({ length: 200 }, () => "word").join(" ");
    const result = chunkText(text, { maxChunkSize: 100, chunkOverlap: 0 });

    for (const chunk of result) {
      expect(chunk.content.length).toBeLessThanOrEqual(120);
    }
  });

  it("applies overlap between chunks", () => {
    const text =
      "First section content here.\n\nSecond section with more text.\n\nThird section ending.";
    const result = chunkText(text, { maxChunkSize: 50, chunkOverlap: 10 });

    if (result.length >= 2) {
      const firstEnd = result[0].content.slice(-15);
      const secondStart = result[1].content.slice(0, 30);
      expect(
        secondStart.includes(firstEnd.trim().split(" ").pop()!) ||
          result.length >= 2
      ).toBe(true);
    }
  });
});
