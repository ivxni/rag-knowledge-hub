/**
 * RAG Chat endpoint.
 *
 * Orchestrates the full RAG pipeline:
 * 1. Authenticate the user
 * 2. Create or reuse a conversation thread
 * 3. Persist the user message
 * 4. Retrieve relevant document chunks via vector similarity search
 * 5. Generate a grounded answer using the LLM with retrieved context
 * 6. Persist the assistant response with source references
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retrieveRelevantChunks } from "@/lib/rag/retriever";
import { generateAnswer } from "@/lib/rag/generator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id, conversation_id, query } = await request.json();
    if (!workspace_id || !query) {
      return NextResponse.json(
        { error: "workspace_id and query are required" },
        { status: 400 }
      );
    }

    let activeConversationId = conversation_id;

    // Auto-create conversation on first message with truncated query as title
    if (!activeConversationId) {
      const title = query.length > 50 ? query.slice(0, 50) + "..." : query;
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ workspace_id, user_id: user.id, title })
        .select()
        .single();

      if (convError) throw convError;
      activeConversationId = conv.id;
    }

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: query,
    });

    // Core RAG: retrieve relevant chunks, then generate grounded answer
    const chunks = await retrieveRelevantChunks(query, workspace_id);
    const { answer, sources } = await generateAnswer(query, chunks);

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: answer,
      sources,
    });

    return NextResponse.json({
      answer,
      sources,
      conversation_id: activeConversationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
