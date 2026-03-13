/**
 * Recursive character text splitter for document chunking.
 *
 * Strategy: Split on natural language boundaries in priority order
 * (paragraphs → sentences → words → characters) to preserve semantic
 * coherence within each chunk. Overlap between chunks prevents
 * information loss at boundaries.
 *
 * Default: ~500 chars per chunk with 50 char overlap.
 */

export interface ChunkOptions {
  maxChunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    start_char: number;
    end_char: number;
  };
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxChunkSize: 500,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", ". ", ", ", " ", ""],
};

/**
 * Splits text into overlapping chunks suitable for embedding and retrieval.
 * Returns chunks with sequential indexes and character offset metadata.
 */
export function chunkText(
  text: string,
  options: Partial<ChunkOptions> = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rawChunks = recursiveSplit(text, opts.separators!, opts.maxChunkSize);
  return mergeWithOverlap(rawChunks, opts.maxChunkSize, opts.chunkOverlap);
}

/**
 * Recursively splits text using a cascade of separators.
 * If the first separator produces chunks that are still too large,
 * falls back to the next separator in the list.
 */
function recursiveSplit(
  text: string,
  separators: string[],
  maxSize: number
): string[] {
  if (text.length <= maxSize) return [text];
  if (separators.length === 0) {
    return [text.slice(0, maxSize)];
  }

  const separator = separators[0];
  const remainingSeparators = separators.slice(1);

  const splits =
    separator === "" ? text.split("") : text.split(separator);

  const result: string[] = [];
  let current = "";

  for (const split of splits) {
    const candidate =
      current.length === 0 ? split : current + separator + split;

    if (candidate.length > maxSize) {
      if (current.length > 0) result.push(current);

      if (split.length > maxSize) {
        const subChunks = recursiveSplit(split, remainingSeparators, maxSize);
        result.push(...subChunks);
        current = "";
      } else {
        current = split;
      }
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) result.push(current);
  return result;
}

/**
 * Adds overlap by prepending the tail of each previous chunk.
 * This ensures context continuity when a relevant passage
 * spans a chunk boundary.
 */
function mergeWithOverlap(
  chunks: string[],
  maxSize: number,
  overlap: number
): TextChunk[] {
  const result: TextChunk[] = [];
  let charOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    let content = chunks[i].trim();
    if (content.length === 0) continue;

    if (overlap > 0 && i > 0) {
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-overlap);
      const merged = overlapText + " " + content;
      content = merged.length <= maxSize ? merged : content;
    }

    result.push({
      content,
      index: result.length,
      metadata: {
        start_char: charOffset,
        end_char: charOffset + chunks[i].length,
      },
    });

    charOffset += chunks[i].length;
  }

  return result;
}
