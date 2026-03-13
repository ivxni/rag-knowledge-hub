/**
 * Vector similarity retriever.
 *
 * Embeds the user query, then calls a Supabase RPC function that performs
 * cosine similarity search on the document_chunks table using pgvector.
 * Results are filtered by workspace_id for multi-tenant isolation and
 * by a minimum similarity threshold to discard irrelevant matches.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embeddings";
import type { RetrievedChunk } from "@/types";

const DEFAULT_TOP_K = 5;
/** Minimum cosine similarity (0-1) for a chunk to be considered relevant. */
const SIMILARITY_THRESHOLD = 0.3;

/**
 * Retrieves the most relevant document chunks for a given query
 * within a specific workspace using vector similarity search.
 */
export async function retrieveRelevantChunks(
  query: string,
  workspaceId: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    target_workspace_id: workspaceId,
    match_count: topK,
    match_threshold: SIMILARITY_THRESHOLD,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  return (data ?? []).map(
    (row: {
      id: string;
      document_id: string;
      document_title: string;
      content: string;
      chunk_index: number;
      similarity: number;
    }) => ({
      id: row.id,
      document_id: row.document_id,
      document_title: row.document_title,
      content: row.content,
      chunk_index: row.chunk_index,
      similarity: row.similarity,
    })
  );
}
