/**
 * Seed script for the AI Engineering Handbook demo workspace.
 *
 * Creates a workspace with pre-built documents that are automatically
 * chunked and embedded. Handles re-seeding by cleaning up failed
 * attempts (documents with 0 chunks from missing API keys).
 */

import { createServiceClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/rag/chunker";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import { seedDocuments } from "./documents";

const WORKSPACE_NAME = "AI Engineering Handbook";
const WORKSPACE_DESCRIPTION =
  "Comprehensive knowledge base covering AI/ML engineering topics";

export interface SeedResult {
  workspace_id: string;
  documents_ingested: number;
}

export async function seed(userId: string): Promise<SeedResult> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", WORKSPACE_NAME)
    .eq("created_by", userId)
    .maybeSingle();

  let workspaceId: string;

  if (existing) {
    workspaceId = existing.id;

    // Check if documents are fully ingested (have chunks)
    const { data: docs } = await supabase
      .from("documents")
      .select("id, chunk_count")
      .eq("workspace_id", workspaceId);

    const fullyIngested = docs?.every((d) => d.chunk_count > 0) && (docs?.length ?? 0) > 0;

    if (fullyIngested) {
      return { workspace_id: workspaceId, documents_ingested: 0 };
    }

    // Clean up incomplete documents (0 chunks = failed embedding)
    if (docs && docs.length > 0) {
      const badDocIds = docs.filter((d) => d.chunk_count === 0).map((d) => d.id);
      if (badDocIds.length > 0) {
        await supabase.from("documents").delete().in("id", badDocIds);
      }
    }
  } else {
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: WORKSPACE_NAME,
        description: WORKSPACE_DESCRIPTION,
        created_by: userId,
      })
      .select("id")
      .single();

    if (wsError) throw wsError;
    workspaceId = workspace.id;
  }

  // Check which documents already exist (successfully) to avoid duplicates
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("title")
    .eq("workspace_id", workspaceId);

  const existingTitles = new Set(existingDocs?.map((d) => d.title) ?? []);

  let documentsIngested = 0;

  for (const doc of seedDocuments) {
    if (existingTitles.has(doc.title)) continue;

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        title: doc.title,
        content: doc.content,
      })
      .select("id")
      .single();

    if (docError) throw docError;

    const chunks = chunkText(doc.content);
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    const chunkRecords = chunks.map((chunk, i) => ({
      document_id: document.id,
      workspace_id: workspaceId,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      chunk_index: chunk.index,
      metadata: chunk.metadata,
    }));

    const { error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    await supabase
      .from("documents")
      .update({ chunk_count: chunks.length })
      .eq("id", document.id);

    documentsIngested++;
  }

  return { workspace_id: workspaceId, documents_ingested: documentsIngested };
}
