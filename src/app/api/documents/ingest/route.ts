/**
 * Document ingestion pipeline.
 *
 * Processes a raw text document into searchable vector embeddings:
 * 1. Store the original document in the documents table
 * 2. Split content into overlapping chunks (preserving semantic boundaries)
 * 3. Generate embedding vectors for each chunk via OpenAI
 * 4. Store chunks + embeddings in document_chunks (using service client to bypass RLS)
 * 5. Update the document's chunk_count for display purposes
 *
 * Uses the service role client for chunk insertion because the pgvector
 * column requires direct write access not available through RLS policies.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/rag/chunker";
import { generateEmbeddings } from "@/lib/rag/embeddings";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id, title, content } = await request.json();
    if (!workspace_id || !title || !content) {
      return NextResponse.json(
        { error: "workspace_id, title, and content are required" },
        { status: 400 }
      );
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({ workspace_id, title, content })
      .select()
      .single();

    if (docError) throw docError;

    const chunks = chunkText(content);
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Service client bypasses RLS for vector column writes
    const serviceClient = createServiceClient();
    const chunkRecords = chunks.map((chunk, i) => ({
      document_id: document.id,
      workspace_id,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      chunk_index: chunk.index,
      metadata: chunk.metadata,
    }));

    const { error: chunkError } = await serviceClient
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    await supabase
      .from("documents")
      .update({ chunk_count: chunks.length })
      .eq("id", document.id);

    return NextResponse.json({
      document_id: document.id,
      chunk_count: chunks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
