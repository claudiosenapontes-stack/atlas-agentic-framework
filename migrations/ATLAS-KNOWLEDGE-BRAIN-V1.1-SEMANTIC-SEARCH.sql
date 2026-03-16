-- ATLAS-KNOWLEDGE-BRAIN-V1.1-SEMANTIC-SEARCH
-- Semantic search functions and indexes for Knowledge Brain V1.1
-- Model: all-MiniLM-L6-v2 (384 dimensions)

-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  class_filter TEXT[] DEFAULT NULL,
  source_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  doc_id TEXT,
  title TEXT,
  doc_class TEXT,
  source TEXT,
  source_path TEXT,
  summary TEXT,
  keywords TEXT[],
  entities JSONB,
  classification_confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kr.doc_id,
    kr.title,
    kr.doc_class,
    kr.source,
    kr.source_path,
    kr.summary,
    kr.keywords,
    kr.entities,
    kr.classification_confidence,
    kr.created_at,
    kr.updated_at,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  JOIN knowledge_registry kr ON ke.doc_id = kr.doc_id
  WHERE kr.status = 'active'
    AND (class_filter IS NULL OR kr.doc_class = ANY(class_filter))
    AND (source_filter IS NULL OR kr.source = ANY(source_filter))
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HYBRID SEARCH FUNCTION (FTS + SEMANTIC)
-- ============================================

CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.7,
  fts_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  doc_id TEXT,
  title TEXT,
  doc_class TEXT,
  source TEXT,
  source_path TEXT,
  summary TEXT,
  keywords TEXT[],
  entities JSONB,
  classification_confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  semantic_score FLOAT,
  fts_score FLOAT,
  hybrid_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT
      kr.doc_id,
      1 - (ke.embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings ke
    JOIN knowledge_registry kr ON ke.doc_id = kr.doc_id
    WHERE kr.status = 'active'
      AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ),
  fts_results AS (
    SELECT
      kr.doc_id,
      ts_rank(
        to_tsvector('english', COALESCE(kr.title, '') || ' ' || kr.summary || ' ' || array_to_string(kr.keywords, ' ')),
        plainto_tsquery('english', query_text)
      ) AS rank
    FROM knowledge_registry kr
    WHERE kr.status = 'active'
      AND to_tsvector('english', COALESCE(kr.title, '') || ' ' || kr.summary || ' ' || array_to_string(kr.keywords, ' '))
          @@ plainto_tsquery('english', query_text)
  ),
  combined AS (
    SELECT
      COALESCE(s.doc_id, f.doc_id) AS doc_id,
      COALESCE(s.similarity, 0) AS semantic_score,
      COALESCE(f.rank, 0) AS fts_score
    FROM semantic_results s
    FULL OUTER JOIN fts_results f ON s.doc_id = f.doc_id
  )
  SELECT
    kr.doc_id,
    kr.title,
    kr.doc_class,
    kr.source,
    kr.source_path,
    kr.summary,
    kr.keywords,
    kr.entities,
    kr.classification_confidence,
    kr.created_at,
    kr.updated_at,
    c.semantic_score,
    c.fts_score,
    (c.semantic_score * semantic_weight + 
     CASE 
       WHEN MAX(c.fts_score) OVER () > 0 THEN (c.fts_score / MAX(c.fts_score) OVER ()) * fts_weight
       ELSE 0
     END
    ) AS hybrid_score
  FROM combined c
  JOIN knowledge_registry kr ON c.doc_id = kr.doc_id
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SIMILAR DOCUMENTS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION similar_documents(
  target_doc_id TEXT,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  doc_id TEXT,
  title TEXT,
  doc_class TEXT,
  source TEXT,
  summary TEXT,
  similarity FLOAT
) AS $$
DECLARE
  target_embedding vector(384);
BEGIN
  -- Get target document embedding
  SELECT ke.embedding INTO target_embedding
  FROM knowledge_embeddings ke
  WHERE ke.doc_id = target_doc_id;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    kr.doc_id,
    kr.title,
    kr.doc_class,
    kr.source,
    kr.summary,
    1 - (ke.embedding <=> target_embedding) AS similarity
  FROM knowledge_embeddings ke
  JOIN knowledge_registry kr ON ke.doc_id = kr.doc_id
  WHERE kr.doc_id != target_doc_id
    AND kr.status = 'active'
    AND 1 - (ke.embedding <=> target_embedding) > match_threshold
  ORDER BY ke.embedding <=> target_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EMBEDDING GENERATION STATUS VIEW
-- ============================================

CREATE OR REPLACE VIEW embedding_status AS
SELECT
  kr.doc_id,
  kr.title,
  kr.doc_class,
  CASE 
    WHEN ke.doc_id IS NOT NULL THEN 'embedded'
    ELSE 'pending'
  END AS embedding_status,
  ke.model AS embedding_model,
  ke.created_at AS embedded_at,
  kr.last_ingested_at
FROM knowledge_registry kr
LEFT JOIN knowledge_embeddings ke ON kr.doc_id = ke.doc_id
WHERE kr.status = 'active';

-- ============================================
-- EMBEDDING STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW embedding_stats AS
SELECT
  COUNT(*) AS total_documents,
  COUNT(ke.doc_id) AS documents_with_embeddings,
  COUNT(*) - COUNT(ke.doc_id) AS documents_pending,
  ROUND(COUNT(ke.doc_id) * 100.0 / NULLIF(COUNT(*), 0), 2) AS embedding_coverage_percent,
  COUNT(DISTINCT ke.model) AS models_used
FROM knowledge_registry kr
LEFT JOIN knowledge_embeddings ke ON kr.doc_id = ke.doc_id
WHERE kr.status = 'active';

-- ============================================
-- INDEX OPTIMIZATIONS
-- ============================================

-- Ensure vector index exists with proper list count for 20+ documents
-- For larger datasets (1000+), increase lists to sqrt(n/2)
CREATE INDEX IF NOT EXISTS idx_ke_vector_cosine ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Index for embedding status queries
CREATE INDEX IF NOT EXISTS idx_ke_created_at ON knowledge_embeddings(created_at);

-- ============================================
-- EMBEDDING GENERATION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS embedding_generation_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  doc_id TEXT NOT NULL REFERENCES knowledge_registry(doc_id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_egl_job_id ON embedding_generation_log(job_id);
CREATE INDEX IF NOT EXISTS idx_egl_doc_id ON embedding_generation_log(doc_id);
CREATE INDEX IF NOT EXISTS idx_egl_status ON embedding_generation_log(status);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT 'ATLAS-KNOWLEDGE-BRAIN-V1.1-SEMANTIC-SEARCH migration complete' as status;