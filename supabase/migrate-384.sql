-- Migration: Change vector dimension from 1536 to 384
-- Run this in the Supabase SQL Editor if you already ran the original migration.sql

-- 1. Clear existing chunks (they have no valid embeddings anyway)
TRUNCATE TABLE public.document_chunks;

-- 2. Also clean up documents that reference 0 chunks
DELETE FROM public.documents WHERE chunk_count = 0;

-- 3. Drop objects that depend on the old vector dimension
DROP INDEX IF EXISTS idx_chunks_embedding;
DROP FUNCTION IF EXISTS match_document_chunks(vector, uuid, int, float);

-- 4. Change column to 384 dimensions
ALTER TABLE public.document_chunks DROP COLUMN embedding;
ALTER TABLE public.document_chunks ADD COLUMN embedding vector(384);

-- 5. Recreate HNSW index
CREATE INDEX idx_chunks_embedding ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. Recreate match function with 384 dimensions
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  target_workspace_id uuid,
  match_count int default 5,
  match_threshold float default 0.3
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.title AS document_title,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  JOIN public.documents d ON d.id = dc.document_id
  WHERE dc.workspace_id = target_workspace_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
