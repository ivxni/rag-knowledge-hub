/** Multi-tenant workspace container for documents and conversations. */
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

/** A document uploaded to a workspace's knowledge base. */
export interface Document {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  chunk_count: number;
  created_at: string;
}

/** A chunk of a document with its vector embedding for similarity search. */
export interface DocumentChunk {
  id: string;
  document_id: string;
  workspace_id: string;
  content: string;
  embedding: number[];
  chunk_index: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceReference[] | null;
  created_at: string;
}

/** Reference to a retrieved chunk included as a citation in an assistant message. */
export interface SourceReference {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  /** Cosine similarity score between the query and this chunk (0-1). */
  similarity: number;
}

/** A chunk returned by the vector similarity search during retrieval. */
export interface RetrievedChunk {
  id: string;
  document_id: string;
  document_title: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

export interface ChatRequest {
  workspace_id: string;
  conversation_id?: string;
  query: string;
}

export interface IngestRequest {
  workspace_id: string;
  title: string;
  content: string;
}
