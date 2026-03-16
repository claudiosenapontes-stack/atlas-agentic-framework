-- ATLAS-KNOWLEDGE-BRAIN-V1-001.sql
-- Knowledge Brain V1 Database Schema
-- Created: 2026-03-16

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- CORE REGISTRY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_registry (
  doc_id TEXT PRIMARY KEY,
  doc_class TEXT NOT NULL CHECK (doc_class IN (
    'LEGAL', 'RESEARCH', 'EXEC', 'PRODUCT',
    'MKTG', 'INFRA', 'FIN', 'MEET'
  )),
  source TEXT NOT NULL CHECK (source IN ('local', 'google_drive', 'github')),
  source_path TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  summary TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  entities JSONB NOT NULL DEFAULT '{}',
  checksum TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  extracted_by TEXT NOT NULL DEFAULT 'system',
  classification_confidence REAL NOT NULL CHECK (classification_confidence BETWEEN 0 AND 1),
  extraction_confidence REAL NOT NULL CHECK (extraction_confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'error')),
  last_ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ingest_version INTEGER NOT NULL DEFAULT 1
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_kr_fts ON knowledge_registry 
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || summary || ' ' || array_to_string(keywords, ' ')));

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_kr_doc_class ON knowledge_registry(doc_class);
CREATE INDEX IF NOT EXISTS idx_kr_source ON knowledge_registry(source);
CREATE INDEX IF NOT EXISTS idx_kr_status ON knowledge_registry(status);
CREATE INDEX IF NOT EXISTS idx_kr_extracted_at ON knowledge_registry(extracted_at);
CREATE INDEX IF NOT EXISTS idx_kr_entities ON knowledge_registry USING GIN(entities jsonb_path_ops);

-- ============================================
-- VECTOR EMBEDDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES knowledge_registry(doc_id) ON DELETE CASCADE,
  embedding vector(384),
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_ke_vector ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- INGESTION JOB TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('local', 'google_drive', 'github')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  documents_found INTEGER NOT NULL DEFAULT 0,
  documents_ingested INTEGER NOT NULL DEFAULT 0,
  documents_skipped INTEGER NOT NULL DEFAULT 0,
  documents_failed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ij_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ij_created_at ON ingestion_jobs(created_at);

-- ============================================
-- SOURCE CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS ingestion_sources (
  source_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('local', 'google_drive', 'github')),
  config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  last_scan_status TEXT,
  documents_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- DOCUMENT EXTRACTION RESULTS (DETAILED LOG)
-- ============================================
CREATE TABLE IF NOT EXISTS document_extraction_results (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id TEXT NOT NULL REFERENCES knowledge_registry(doc_id) ON DELETE CASCADE,
  extraction_version TEXT NOT NULL DEFAULT 'v1',
  raw_content_length INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  entities_found JSONB NOT NULL,
  classification_method TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  errors TEXT[],
  warnings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_der_doc_id ON document_extraction_results(doc_id);
CREATE INDEX IF NOT EXISTS idx_der_created_at ON document_extraction_results(created_at);

-- ============================================
-- DOCUMENTS TABLE (LEGACY/COMPATIBILITY)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY REFERENCES knowledge_registry(doc_id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  doc_type TEXT,
  source TEXT,
  source_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default sources
INSERT INTO ingestion_sources (source_id, source_type, config, enabled)
VALUES 
  ('local_arquia', 'local', '{"paths": ["/root/Documents/ARQIA"], "recursive": true, "watch": true}'::jsonb, true),
  ('local_atlas', 'local', '{"paths": ["/root/Documents/Atlas"], "recursive": true, "watch": true}'::jsonb, true)
ON CONFLICT (source_id) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================
CREATE OR REPLACE VIEW knowledge_registry_stats AS
SELECT
  doc_class,
  source,
  COUNT(*) as document_count,
  AVG(classification_confidence) as avg_classification_confidence,
  MIN(extracted_at) as first_extracted,
  MAX(extracted_at) as last_extracted
FROM knowledge_registry
WHERE status = 'active'
GROUP BY doc_class, source;

CREATE OR REPLACE VIEW ingestion_stats AS
SELECT
  source_type,
  status,
  COUNT(*) as job_count,
  SUM(documents_found) as total_found,
  SUM(documents_ingested) as total_ingested,
  SUM(documents_skipped) as total_skipped,
  SUM(documents_failed) as total_failed
FROM ingestion_jobs
GROUP BY source_type, status;

-- ============================================
-- FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION search_knowledge(
  query_text TEXT,
  class_filter TEXT[] DEFAULT NULL,
  source_filter TEXT[] DEFAULT NULL,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  doc_id TEXT,
  doc_class TEXT,
  title TEXT,
  summary TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kr.doc_id,
    kr.doc_class,
    kr.title,
    kr.summary,
    ts_rank(
      to_tsvector('english', COALESCE(kr.title, '') || ' ' || kr.summary || ' ' || array_to_string(kr.keywords, ' ')),
      plainto_tsquery('english', query_text)
    )::REAL as rank
  FROM knowledge_registry kr
  WHERE kr.status = 'active'
    AND (class_filter IS NULL OR kr.doc_class = ANY(class_filter))
    AND (source_filter IS NULL OR kr.source = ANY(source_filter))
    AND to_tsvector('english', COALESCE(kr.title, '') || ' ' || kr.summary || ' ' || array_to_string(kr.keywords, ' ')) 
        @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
SELECT 'ATLAS-KNOWLEDGE-BRAIN-V1-001 migration complete' as status;