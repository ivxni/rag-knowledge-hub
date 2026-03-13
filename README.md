# Knowledge Hub — RAG-powered Knowledge Base

> **[Deutsche Version (README.de.md)](./README.de.md)**

A full-stack Retrieval-Augmented Generation (RAG) system built with Next.js and Supabase. Users can upload documents, ask questions, and receive AI-generated answers grounded in their own knowledge base with source citations.

## Development Methodology

### Problem Analysis

The challenge is to build an end-to-end RAG feature that demonstrates understanding of:
- **Document ingestion** (chunking, embedding, vector storage)
- **Semantic retrieval** (vector similarity search)
- **Grounded generation** (LLM answers constrained to retrieved context)
- **Full-stack integration** (API design, auth, persistence, UI)

The key constraint is that answers must be traceable back to source documents, not hallucinated from the LLM's training data.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  Landing Page → Auth → Dashboard → Workspace        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Login/   │  │  Workspace   │  │  Chat + Source │  │
│  │  Register │  │  Selection   │  │  Attribution   │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│                 API Layer (Route Handlers)           │
│  /api/chat  /api/documents/ingest  /api/workspaces  │
├─────────────────────────────────────────────────────┤
│                    RAG Pipeline                      │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐         │
│  │ Chunker │→ │ Embeddings│→ │ pgvector  │         │
│  └─────────┘  └───────────┘  └─────┬─────┘         │
│                                     ↓                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Generator │← │  Retriever│← │ Query Emb │       │
│  └───────────┘  └───────────┘  └───────────┘       │
├─────────────────────────────────────────────────────┤
│                   LLM Providers                      │
│  Claude (Generation)   Transformers.js (Embeddings)  │
├─────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + pgvector)        │
│  Auth │ Workspaces │ Documents │ Chunks │ Messages   │
│  Row-Level Security on all tables                    │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Server Components, Route Handlers, built-in auth patterns |
| Language | TypeScript (strict) | Type safety across the full stack |
| Styling | Tailwind CSS + shadcn/ui | Rapid, consistent UI with accessible components |
| Database | Supabase (PostgreSQL + pgvector) | Required stack, native vector support |
| Auth | Supabase Auth | Integrated with RLS, zero-config session management |
| Generation | Claude Sonnet 4 (Anthropic) | Strong instruction following, structured output, configurable via env |
| Embeddings | Transformers.js (all-MiniLM-L6-v2) | Local ONNX model, no API key needed, 384 dimensions |
| Testing | Vitest | Fast, ESM-native, excellent mocking |

### RAG Pipeline Design

**Ingestion Flow:**
1. User uploads document text (or clicks "Seed Demo Data" for pre-built knowledge base)
2. **Chunker** (`lib/rag/chunker.ts`): Recursive character splitter at ~500 token chunks with 50 token overlap. Splits on natural boundaries (paragraphs → sentences → words) to preserve semantic coherence.
3. **Embeddings** (`lib/llm/local-embeddings.ts`): Local inference via Transformers.js using `all-MiniLM-L6-v2` ONNX model. 384-dimensional vectors generated directly in Node.js — no external API key required.
4. **Storage**: Chunks + embeddings stored in `document_chunks` table with HNSW index for fast retrieval.

**Query Flow:**
1. User asks question
2. Question is embedded using the same local model (all-MiniLM-L6-v2)
3. **Retriever** (`lib/rag/retriever.ts`): pgvector cosine similarity search. Top-5 chunks above 0.3 similarity threshold. Uses a dedicated SQL function with `security definer` to join documents for title attribution.
4. **Generator** (`lib/rag/generator.ts`): Builds a structured system prompt with numbered source blocks. **Claude Sonnet 4** (`claude-sonnet-4-20250514`) generates an answer constrained to the provided context, with `[Source N]` citations. The model is configurable via `ANTHROPIC_MODEL` env var.

**Chunking Strategy Rationale:**
- 500 tokens balances context completeness with retrieval precision
- 50 token overlap prevents information loss at chunk boundaries
- Recursive splitting preserves paragraph/sentence structure over arbitrary cuts

**Embedding Strategy Rationale:**
- Local model eliminates external API dependency and cost
- `all-MiniLM-L6-v2` is a proven model for semantic search (MTEB benchmark)
- 384 dimensions are sufficient for RAG retrieval while reducing storage

### Prompt Engineering

The system prompt for the generator follows these principles:
- **Role definition**: Explicit knowledge-base assistant identity
- **Grounding constraint**: "Answer using ONLY the provided sources" prevents hallucination
- **Citation format**: "[Source N]" references for traceability
- **Fallback behavior**: Explicit instruction to state when sources are insufficient
- **Language matching**: Responds in the user's language

### Design Decisions & Trade-offs

**Provider Abstraction:**
Separate interfaces for `GenerationProvider` and `EmbeddingProvider` because not all LLMs offer both capabilities (Claude has no embedding API). Factory pattern with singleton instances avoids repeated initialization.

**Local embeddings over cloud API:**
Using Transformers.js with an ONNX model running in Node.js eliminates the need for an OpenAI API key. The model (~23MB) is downloaded and cached on first use. Trade-off: slightly lower embedding quality than `text-embedding-3-small`, but sufficient for a demo RAG system.

**Non-streaming initial implementation:**
The chat uses synchronous request/response rather than streaming for the MVP. This simplifies error handling and source attribution (sources are returned alongside the answer). Streaming can be added by switching to the existing `streamAnswer()` function.

**Service client for embeddings:**
Vector insertions use the Supabase service role client (bypassing RLS) because pgvector columns require special handling. All other operations use the user-scoped client with RLS.

**Multi-tenant via workspaces:**
Each workspace isolates documents, chunks, and conversations. RLS policies ensure users only see their own data. The `workspace_id` column on `document_chunks` enables efficient filtered vector search.

**HNSW vs IVFFlat index:**
HNSW was chosen over IVFFlat for the vector index because it provides better recall at small dataset sizes without requiring training, which suits a demo/evaluation context.

## Project Structure

```
src/
  app/
    page.tsx                              # Landing page
    (auth)/
      login/page.tsx                      # Login form
      register/page.tsx                   # Registration form
      actions.ts                          # Server actions (login, register, logout)
    (dashboard)/
      layout.tsx                          # Sidebar + header layout
      dashboard/page.tsx                  # Workspace management
      workspace/[id]/
        layout.tsx                        # Chat/Documents tab navigation
        page.tsx                          # Chat interface
        documents/page.tsx                # Document management + viewer
    api/
      chat/route.ts                       # RAG query endpoint
      documents/route.ts                  # Document CRUD
      documents/ingest/route.ts           # Chunking + embedding pipeline
      workspaces/route.ts                 # Workspace CRUD + DELETE
      conversations/route.ts              # Conversation CRUD
      conversations/[id]/messages/route.ts
      seed/route.ts                       # Demo knowledge base seeding
  components/
    chat/                                 # Chat UI components
    layout/                               # Sidebar, Header
    ui/                                   # shadcn/ui primitives
  lib/
    supabase/                             # Client initialization
    llm/                                  # Provider abstraction
      types.ts                            # GenerationProvider / EmbeddingProvider interfaces
      anthropic.ts                        # Claude generation adapter
      local-embeddings.ts                 # Transformers.js local embedding adapter
    rag/                                  # Core RAG pipeline
      chunker.ts                          # Recursive text splitter
      embeddings.ts                       # Batch embedding generation
      retriever.ts                        # Vector similarity search
      generator.ts                        # Prompt construction + LLM call
    seed/                                 # Demo seed data + ingestion script
  types/index.ts                          # Shared TypeScript interfaces
  middleware.ts                           # Auth route protection
  __tests__/rag/                          # Unit tests
supabase/
  migration.sql                           # Database schema + RLS + functions
  migrate-384.sql                         # Migration for local embedding dimensions
```

## Setup & Run

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- Anthropic API key (Claude)

> **Note:** Embeddings run locally via Transformers.js — no OpenAI key needed.

### 1. Clone & Install

```bash
git clone <repo-url>
cd rag-knowledge-hub
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migration.sql`
3. Go to **Authentication → Settings** and disable "Confirm email" under Email Auth
4. Copy your project URL and keys from **Settings → API**

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Seed Knowledge Base

After registering and logging in, click **"Seed Demo Data"** on the dashboard. This creates an "AI Engineering Handbook" workspace with 7 pre-built documents covering AI/ML engineering topics. The documents are automatically chunked and embedded.

The first seed may take ~30 seconds as the embedding model (~23MB) is downloaded and cached.

### 6. Run Tests

```bash
npm test
```

## Potential Extensions

- **Streaming responses**: Switch from `generateAnswer` to `streamAnswer` for real-time token output
- **File upload**: Parse PDF/DOCX via server-side extraction before chunking
- **Hybrid search**: Combine vector similarity with full-text search (BM25) for better recall
- **Re-ranking**: Add a cross-encoder re-ranking step after initial retrieval
- **Conversation context**: Include previous messages in the generator prompt for follow-up questions
- **Admin dashboard**: Usage analytics, document management across workspaces
- **Rate limiting**: Token-based rate limiting on the chat API
- **n8n workflow automation**: Automate document ingestion via n8n workflows — e.g. watch a Google Drive folder, Notion database, or Confluence space and trigger the `/api/documents/ingest` endpoint whenever content changes, keeping the knowledge base always up-to-date
- **Deployment**: Vercel + Supabase hosted project for live demo
