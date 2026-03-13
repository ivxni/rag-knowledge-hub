-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Workspaces (multi-tenant)
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  chunk_count integer default 0,
  created_at timestamptz default now() not null
);

-- Document chunks with vector embeddings
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  content text not null,
  embedding vector(384),
  chunk_index integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Conversation',
  created_at timestamptz default now() not null
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now() not null
);

-- Indexes for performance
create index idx_documents_workspace on public.documents(workspace_id);
create index idx_chunks_workspace on public.document_chunks(workspace_id);
create index idx_chunks_document on public.document_chunks(document_id);
create index idx_conversations_workspace on public.conversations(workspace_id);
create index idx_messages_conversation on public.messages(conversation_id);

-- HNSW index for fast vector similarity search
create index idx_chunks_embedding on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS Policies: Users can only access data in their own workspaces
create policy "Users can view own workspaces"
  on public.workspaces for select
  using (created_by = auth.uid());

create policy "Users can create workspaces"
  on public.workspaces for insert
  with check (created_by = auth.uid());

create policy "Users can update own workspaces"
  on public.workspaces for update
  using (created_by = auth.uid());

create policy "Users can delete own workspaces"
  on public.workspaces for delete
  using (created_by = auth.uid());

create policy "Users can view documents in own workspaces"
  on public.documents for select
  using (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can create documents in own workspaces"
  on public.documents for insert
  with check (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can delete documents in own workspaces"
  on public.documents for delete
  using (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can view chunks in own workspaces"
  on public.document_chunks for select
  using (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can create chunks in own workspaces"
  on public.document_chunks for insert
  with check (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can delete chunks in own workspaces"
  on public.document_chunks for delete
  using (workspace_id in (select id from public.workspaces where created_by = auth.uid()));

create policy "Users can view own conversations"
  on public.conversations for select
  using (user_id = auth.uid());

create policy "Users can create conversations"
  on public.conversations for insert
  with check (user_id = auth.uid());

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (user_id = auth.uid());

create policy "Users can view messages in own conversations"
  on public.messages for select
  using (conversation_id in (select id from public.conversations where user_id = auth.uid()));

create policy "Users can create messages in own conversations"
  on public.messages for insert
  with check (conversation_id in (select id from public.conversations where user_id = auth.uid()));

-- Vector similarity search function
create or replace function match_document_chunks(
  query_embedding vector(384),
  target_workspace_id uuid,
  match_count int default 5,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  chunk_index int,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    d.title as document_title,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.workspace_id = target_workspace_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
