# ATLAS-EINSTEIN-KNOWLEDGE-INGESTION-PIPELINE-001
## Knowledge Brain Ingestion Pipeline

**Status:** DEFINED  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  
**Scope:** Document ingestion from Drive, GitHub, and local sources

---

## EXECUTIVE SUMMARY

Knowledge Brain ingestion pipeline processes documents from Google Drive, GitHub repositories, and local filesystem. Documents flow through discovery, classification, entity extraction, and storage stages. Output follows the canonical taxonomy from ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-TAXONOMY-001.

**Key Principle:** Batch extraction, metadata-only storage, explicit relationships.

---

## 1. SOURCE CONNECTORS

### 1.1 Google Drive Connector

**Configuration:**
```typescript
{
  source: "google_drive";
  folder_ids: string[];           // Root folders to scan
  include_shared_drives: boolean;
  mime_types: string[];           // Filter by type
  exclude_patterns: string[];     // Regex patterns to skip
  poll_interval_minutes: number;  // Default: 60
  max_file_size_mb: number;       // Skip large files
}
```

**MIME Type Mapping:**

| MIME Type | Handler | doc_class Hint |
|-----------|---------|----------------|
| `application/vnd.google-apps.document` | Export as text | MEET, EXEC |
| `application/vnd.google-apps.spreadsheet` | Export as CSV | FIN, RESEARCH |
| `application/vnd.google-apps.presentation` | Export as text | MKTG, EXEC |
| `application/pdf` | OCR + text | LEGAL, RESEARCH |
| `text/plain` | Direct | INFRA, RESEARCH |
| `text/markdown` | Direct | INFRA, PRODUCT |
| `application/vnd.openxmlformats-officedocument` | Parse | LEGAL, EXEC |

### 1.2 GitHub Connector

**Configuration:**
```typescript
{
  source: "github";
  repos: string[];                // owner/repo format
  branches: string[];             // Default: ["main", "master"]
  include_paths: string[];        // e.g., ["docs/", "specs/"]
  exclude_paths: string[];        // e.g., ["node_modules/"]
  file_extensions: string[];      // e.g., [".md", ".txt"]
  poll_interval_minutes: number;  // Default: 30
  max_file_size_kb: number;       // Default: 500
}
```

**Path-to-Class Mapping:**

| Path Pattern | doc_class |
|--------------|-----------|
| `docs/architecture*` | INFRA |
| `docs/api*` | INFRA |
| `docs/runbooks*` | INFRA |
| `docs/adr*` | EXEC |
| `docs/prd*` | PRODUCT |
| `docs/legal*` | LEGAL |
| `docs/research*` | RESEARCH |
| `docs/meetings*` | MEET |

### 1.3 Local Documents Connector

**Configuration:**
```typescript
{
  source: "local";
  paths: string[];                // Absolute or relative paths
  recursive: boolean;
  watch_mode: boolean;            // Use fs.watch
  include_extensions: string[];   // [".md", ".txt", ".pdf"]
  exclude_patterns: string[];     // ["*.tmp", "*.log"]
  max_file_size_mb: number;
  modified_within_days: number | null;
}
```

---

## 2. INGESTION PIPELINE (6 STAGES)

```
DISCOVER → FETCH → CLASSIFY → EXTRACT ENTITIES → GENERATE SUMMARY → STORE
```

### Stage 1: Discover
Scan sources for new/modified documents.

**Output:**
```typescript
{
  doc_id: string;           // source:uuid format
  source: "google_drive" | "github" | "local";
  source_path: string;      // Original location
  source_id: string;        // Drive file ID, GitHub blob SHA
  modified_at: Date;
  checksum: string;         // SHA-256 of content
  size_bytes: number;
}
```

**Deduplication Logic:**
- New document → ingest
- Checksum changed → re-ingest
- Modified_at newer → re-ingest
- Otherwise → skip

### Stage 2: Fetch
Download/retrieve document content.

**Output:**
```typescript
{
  ref: DiscoveryResult;
  content: {
    text: string | null;
    binary: boolean;
    encoding: "utf-8" | "base64" | null;
  };
  metadata: {
    title: string | null;
    author: string | null;
    created_at: Date | null;
    mime_type: string;
  };
}
```

### Stage 3: Classify
Determine doc_class using taxonomy.

**Classification Rules:**

| Pattern | doc_class | Confidence |
|---------|-----------|------------|
| `\b(MSA|SOW|NDA|contract|agreement)\b` | LEGAL | 0.9 |
| `\b(architecture|runbook|config|API)\b` | INFRA | 0.8 |
| `\b(PRD|product|roadmap|feature)\b` | PRODUCT | 0.8 |
| `\b(meeting|notes|standup|retrospective)\b` | MEET | 0.9 |
| `\b(decision|strategy|OKR|board)\b` | EXEC | 0.8 |
| `\b(research|analysis|market|study)\b` | RESEARCH | 0.8 |
| `\b(budget|forecast|financial|invoice)\b` | FIN | 0.9 |
| `\b(marketing|campaign|brand|content)\b` | MKTG | 0.8 |

**Classification Priority:**
1. Path-based hints (highest priority for GitHub)
2. Content-based patterns
3. Return highest confidence result

### Stage 4: Extract Entities
Extract companies, people, projects, jurisdictions, dates.

**Output:**
```typescript
{
  companies: string[];       // ARQIA, XGROUP, Vendor Inc
  people: string[];          // Claudio Sena, John Doe
  projects: string[];        // Atlas, Severino
  jurisdictions: string[];   // FL, US-Federal, EU
  dates: Date[];             // ISO dates found
  contract_parties?: string[];   // LEGAL only
  regulations?: string[];        // LEGAL, RESEARCH
  deliverables?: string[];       // PRODUCT, INFRA
}
```

**Entity Patterns:**
- Companies: `ARQIA`, `XGROUP`, `[Name] Inc/LLC/Corp`
- People: `First Last`, `Claudio Sena`
- Projects: `Atlas`, `Severino`, `[Name] Project`
- Jurisdictions: `FL`, `Florida`, `Miami-Dade`, `EU`, `IBC 2021`
- Dates: ISO format `YYYY-MM-DD`, month names

### Stage 5: Generate Summary
Create 500-char summary and extract keywords.

**Output:**
```typescript
{
  summary: string;          // Max 500 chars
  keywords: string[];       // Max 10 keywords
  confidence: number;       // Summary quality score
}
```

**Algorithm:**
1. Extract first meaningful paragraph (>50 chars)
2. Truncate to 500 chars intelligently
3. Extract keywords via frequency analysis
4. Calculate confidence score

### Stage 6: Store
Write to knowledge_registry.

**Upsert Logic:**
- If doc_id exists → update record
- If doc_id new → insert record
- Track ingest_version for re-ingestion history

---

## 3. OUTPUT FORMAT

### Registry Record Schema

```typescript
{
  // Identity
  doc_id: string;           // source:uuid format
  doc_class: "LEGAL" | "RESEARCH" | "EXEC" | "PRODUCT" | 
              "MKTG" | "INFRA" | "FIN" | "MEET";
  
  // Source
  source: "google_drive" | "github" | "local";
  source_path: string;
  source_id: string;
  source_url: string | null;
  
  // Content metadata
  title: string | null;
  author: string | null;
  checksum: string;
  size_bytes: number;
  
  // Extraction results
  entities: {
    companies: string[];
    people: string[];
    projects: string[];
    jurisdictions: string[];
    dates: Date[];
    contract_parties?: string[];
    regulations?: string[];
    deliverables?: string[];
  };
  
  summary: string;          // Max 500 chars
  keywords: string[];       // Max 10 keywords
  
  // Processing metadata
  extracted_at: Date;
  extracted_by: AgentID;
  classification_confidence: number;
  extraction_confidence: number;
  
  // Status
  status: "active" | "deprecated" | "error";
  last_ingested_at: Date;
  ingest_version: number;
}
```

---

## 4. API CONTRACT

### Trigger Ingestion

```
POST /api/knowledge/ingest
{
  source: "google_drive" | "github" | "local";
  config: SourceConfig;
  options: {
    dry_run: boolean;       // Validate without storing
    force_reingest: boolean; // Ignore checksums
    max_documents: number;  // Limit for testing
  }
}

Response:
{
  job_id: UUID;
  status: "queued" | "running" | "completed" | "error";
  documents_found: number;
  documents_ingested: number;
  documents_skipped: number;
  errors: string[];
}
```

### Get Ingestion Status

```
GET /api/knowledge/ingest/:jobId

Response:
{
  job_id: UUID;
  status: string;
  progress: {
    stage: "discover" | "fetch" | "classify" | "extract" | "summarize" | "store";
    completed: number;
    total: number;
  };
  results: KnowledgeRegistryRecord[];
}
```

### Query Registry

```
GET /api/knowledge/registry
{
  doc_class?: string[];
  entities?: {
    companies?: string[];
    people?: string[];
    projects?: string[];
  };
  keywords?: string[];
  date_range?: { from: Date; to: Date };
  limit: number;
  offset: number;
}

Response:
{
  total: number;
  records: KnowledgeRegistryRecord[];
}
```

---

## 5. DATABASE SCHEMA

### knowledge_registry Table

```sql
CREATE TABLE knowledge_registry (
  -- Identity
  doc_id TEXT PRIMARY KEY,
  doc_class TEXT NOT NULL CHECK (doc_class IN (
    'LEGAL', 'RESEARCH', 'EXEC', 'PRODUCT',
    'MKTG', 'INFRA', 'FIN', 'MEET'
  )),
  
  -- Source
  source TEXT NOT NULL CHECK (source IN ('google_drive', 'github', 'local')),
  source_path TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  
  -- Content metadata
  title TEXT,
  author TEXT,
  checksum TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  
  -- Extraction results (JSONB for flexibility)
  entities JSONB NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  
  -- Processing metadata
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  extracted_by TEXT NOT NULL,
  classification_confidence REAL NOT NULL CHECK (classification_confidence BETWEEN 0 AND 1),
  extraction_confidence REAL NOT NULL CHECK (extraction_confidence BETWEEN 0 AND 1),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'error')),
  last_ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ingest_version INTEGER NOT NULL DEFAULT 1,
  
  -- Indexes
  CONSTRAINT valid_entities CHECK (jsonb_typeof(entities) = 'object')
);

-- Indexes for common queries
CREATE INDEX idx_kr_doc_class ON knowledge_registry(doc_class);
CREATE INDEX idx_kr_source ON knowledge_registry(source);
CREATE INDEX idx_kr_status ON knowledge_registry(status);
CREATE INDEX idx_kr_keywords ON knowledge_registry USING GIN(keywords);
CREATE INDEX idx_kr_entities ON knowledge_registry USING GIN(entities);
CREATE INDEX idx_kr_extracted_at ON knowledge_registry(extracted_at);
```

---

## 6. IMPLEMENTATION CHECKLIST

### P0 (Core Pipeline)

| Component | Owner | Time | Files |
|-----------|-------|------|-------|
| Database schema | Severino | 30 min | migration file |
| Local connector | Optimus | 1 hour | `lib/connectors/local.ts` |
| Classification engine | Einstein | 1 hour | `lib/classification.ts` |
| Entity extraction | Einstein | 1 hour | `lib/extraction.ts` |
| Summary generation | Einstein | 1 hour | `lib/summarization.ts` |
| Registry store | Severino | 30 min | `lib/registry.ts` |
| API endpoints | Severino | 1 hour | `app/api/knowledge/*` |

**Total P0:** ~6 hours

### P1 (Source Connectors)

| Component | Owner | Time | Dependencies |
|-----------|-------|------|--------------|
| Google Drive connector | Optimus | 2 hours | Google API creds |
| GitHub connector | Optimus | 2 hours | GitHub App/token |
| Webhook handlers | Severino | 1 hour | Endpoint security |
| Polling scheduler | Severino | 1 hour | Cron/job queue |

**Total P1:** ~6 hours

### P2 (Enhancements)

| Component | Owner | Time |
|-----------|-------|------|
| OCR for PDFs | Optimus | 2 hours |
| Confidence scoring ML | Einstein | 4 hours |
| Relationship inference | Einstein | 3 hours |
| Duplicate detection | Optimus | 2 hours |

**Total P2:** ~11 hours

---

## 7. ERROR HANDLING

| Error Type | Handling | Retry |
|------------|----------|-------|
| Source unavailable | Log, mark job failed | Yes (3x backoff) |
| Download timeout | Skip document, continue | Yes (immediate) |
| Parse error | Store with status="error" | No |
| Classification low confidence | Store with flag for review | No |
| Database error | Rollback, mark failed | Yes (3x) |

---

## 8. NO OVERDESIGN PRINCIPLES

1. **No content storage** — Store metadata only, reference source
2. **No real-time processing** — Batch ingestion on schedule
3. **No automatic relationships** — Explicit linking only
4. **No ML classification (P0)** — Heuristics first, ML later
5. **No versioning** — Use source document versioning
6. **No full-text search (P0)** — Keywords + summary only

---

**Full Report:** `docs/KNOWLEDGE-INGESTION-PIPELINE-001.md`
**Depends On:** `docs/KNOWLEDGE-BRAIN-TAXONOMY-001.md`

🎯 Einstein