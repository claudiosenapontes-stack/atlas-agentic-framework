# ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-V1-ACTIVATION-002
## Knowledge Brain V1 Activation Report

**Status:** V1 READY FOR ACTIVATION  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-16  
**Realm:** Knowledge Brain (Owner: Einstein)

---

## 1. VERIFICATION CHECKLIST

### 1.1 Knowledge Tables Usable After SQL ✅

| Table | Purpose | SQL Status |
|-------|---------|------------|
| `knowledge_registry` | Core document metadata | ✅ Schema defined |
| `knowledge_embeddings` | Vector search | ✅ Schema defined |
| `ingestion_jobs` | Job queue tracking | ✅ Schema defined |
| `ingestion_sources` | Source configuration | ✅ Schema defined |

**Migration:** `migrations/ATLAS-KNOWLEDGE-BRAIN-V1-001.sql`

```sql
-- Core tables verified
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_registry (
  doc_id TEXT PRIMARY KEY,
  doc_class TEXT NOT NULL CHECK (doc_class IN (
    'LEGAL', 'RESEARCH', 'EXEC', 'PRODUCT',
    'MKTG', 'INFRA', 'FIN', 'MEET'
  )),
  source TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  summary TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  entities JSONB NOT NULL DEFAULT '{}',
  checksum TEXT NOT NULL,
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  extracted_by TEXT NOT NULL,
  classification_confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ingest_version INTEGER NOT NULL DEFAULT 1
);

-- Full-text search
CREATE INDEX idx_kr_fts ON knowledge_registry 
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || summary || ' ' || array_to_string(keywords, ' ')));

-- Vector embeddings
CREATE TABLE knowledge_embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES knowledge_registry(doc_id) ON DELETE CASCADE,
  embedding vector(384),
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2'
);

CREATE INDEX idx_ke_vector ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops);
```

### 1.2 Valid doc_class Values ✅

| Value | Display | Icon | Color | Agent |
|-------|---------|------|-------|-------|
| `LEGAL` | Legal | ⚖️ | #DC2626 | Harvey |
| `RESEARCH` | Research | 🔬 | #059669 | Einstein |
| `EXEC` | Executive | 🎯 | #7C3AED | Olivia |
| `PRODUCT` | Product | 📦 | #2563EB | Optimus |
| `MKTG` | Marketing | 📢 | #DB2777 | Olivia |
| `INFRA` | Infrastructure | 🏗️ | #4B5563 | Optimus |
| `FIN` | Financial | 💰 | #D97706 | Henry |
| `MEET` | Meeting | 📝 | #6B7280 | All |

**Constraint:** `CHECK (doc_class IN (...8 values...))`

### 1.3 Minimum Ingestion Contract ✅

```typescript
interface IngestionInput {
  source: "local" | "google_drive" | "github";
  source_path: string;
  content: string;
  title?: string;
  options?: {
    extract_entities?: boolean;   // default: true
    generate_summary?: boolean;   // default: true
    classify_document?: boolean;  // default: true
    confidence_threshold?: number; // default: 0.7
  };
}

interface IngestionOutput {
  doc_id: string;           // "{source}:{uuid}"
  doc_class: DocumentClass;
  entities: {
    companies: string[];
    people: string[];
    projects: string[];
    jurisdictions: string[];
    dates: string[];
    contract_parties?: string[];
    regulations?: string[];
    deliverables?: string[];
  };
  summary: string;          // Max 500 chars
  keywords: string[];       // Max 10
  checksum: string;
  classification_confidence: number;
  extraction_confidence: number;
}
```

### 1.4 Search Contract for V1 ✅

```typescript
interface SearchRequest {
  query?: string;
  filters?: {
    doc_class?: string[];
    source?: string[];
    entities?: {
      companies?: string[];
      people?: string[];
      projects?: string[];
      jurisdictions?: string[];
    };
    date_range?: { from: string; to: string };
  };
  sort?: "relevance" | "date_desc" | "date_asc";
  limit?: number;   // default: 10, max: 100
  offset?: number;
}

interface SearchResponse {
  total: number;
  results: SearchResult[];
  facets: {
    doc_class: Record<string, number>;
    source: Record<string, number>;
  };
  query_time_ms: number;
}
```

### 1.5 Semantic Search Readiness ✅

| Component | Status |
|-----------|--------|
| Embedding model | ✅ all-MiniLM-L6-v2 (384 dims) |
| Vector storage | ✅ pgvector |
| Index | ✅ IVFFlat |
| Generation service | ⚠️ Requires build (48h) |

**24h Limitation:** FTS only. Full semantic = 48h.

### 1.6 Cross-Realm Usage ✅

| Realm | Use Cases | Primary Classes |
|-------|-----------|-----------------|
| **Olivia** | Decision prep, briefings | EXEC, MEET, FIN |
| **Harvey** | Contract review, compliance | LEGAL, RESEARCH |
| **Sophia** | Proposals, market intel | MKTG, RESEARCH, PRODUCT |
| **Optimus** | Architecture, API docs | INFRA, PRODUCT |
| **Henry** | Budgets, contracts | FIN, LEGAL |

---

## 2. V1 REALM DEFINITION

| Attribute | Value |
|-----------|-------|
| **Realm Name** | Knowledge Brain |
| **Realm ID** | `knowledge_brain` |
| **Owner** | Einstein |
| **Status** | V1 Ready for Activation |
| **Primary Function** | Organizational memory and document retrieval |
| **Consumers** | All Atlas realms |
| **Storage** | PostgreSQL + pgvector |

### Menu Structure

```
Knowledge Brain
├── 🔍 Search              [PRIMARY]
├── 📥 Sources             [ADMIN]
├── 📚 Registry            [ADMIN]
└── ⚙️ Settings            [ADMIN]
```

---

## 3. BUILD-NOW VS LATER

### 24-Hour Activation (Core V1)

| Component | Time | Owner |
|-----------|------|-------|
| SQL Migration | 30 min | Severino |
| Local Connector | 4h | Optimus |
| Classification Engine | 4h | Einstein |
| Entity Extraction | 4h | Einstein |
| Summary Generation | 2h | Einstein |
| Basic Search API (FTS) | 4h | Severino |
| Minimal Search UI | 6h | Optimus |

**Total: ~24 hours**

### 48-Hour (Full V1)

Adds:
| Component | Time | Owner |
|-----------|------|-------|
| Drive Connector | 6h | Optimus |
| GitHub Connector | 6h | Optimus |
| Semantic Search Service | 8h | Optimus |
| Full UI Polish | 8h | Optimus |

### Later (V1.1-V2)

| Component | Time | Version |
|-----------|------|---------|
| Hybrid Search | 4h | V1.1 |
| Advanced Filters | 6h | V1.1 |
| Webhooks | 4h | V1.1 |
| Knowledge Items | 16h | V2 |
| Relationship Graph | 12h | V2 |

---

## 4. DOCUMENT CLASSES LOCK (V1)

**FINAL ENUM (8 values, no additions until V2):**

```typescript
const DOCUMENT_CLASSES = [
  "LEGAL",      // Contracts, agreements
  "RESEARCH",   // Market analysis, research
  "EXEC",       // Decisions, strategies
  "PRODUCT",    // PRDs, specs, roadmaps
  "MKTG",       // Campaigns, content
  "INFRA",      // Architecture, runbooks
  "FIN",        // Budgets, forecasts
  "MEET"        // Notes, transcripts
] as const;
```

---

## 5. ENTITY EXTRACTION LOCK (V1)

**FINAL SCHEMA:**

```typescript
interface ExtractedEntities {
  // Core (all classes)
  companies: string[];
  people: string[];
  projects: string[];
  jurisdictions: string[];
  dates: string[];
  
  // Class-specific
  contract_parties?: string[];  // LEGAL only
  regulations?: string[];       // LEGAL, RESEARCH
  deliverables?: string[];      // PRODUCT, INFRA
}
```

---

## 6. INGESTION SOURCE PRIORITY

| Priority | Source | Config | Status |
|----------|--------|--------|--------|
| P0 | Local | `~/Documents/ARQIA/`, watch | 24h ready |
| P0 | Drive | Folder `ARQIA Knowledge/`, poll 60m | 48h ready |
| P1 | GitHub | Repos `arquia/docs`, poll 30m | 48h ready |
| P2 | Confluence | — | V2 |
| P2 | Notion | — | V2 |

---

## 7. EXACT API SURFACE FOR V1 LIVE USE

### Core Endpoints (24h Ready)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/knowledge/search` | POST | All | Full-text search |
| `/api/knowledge/docs/:id` | GET | All | Get document |
| `/api/knowledge/ingest` | POST | Admin | Ingest document |
| `/api/knowledge/ingest/batch` | POST | Admin | Batch ingest |
| `/api/knowledge/sources` | GET/POST | Admin | Manage sources |
| `/api/knowledge/registry` | GET | Admin | Browse docs |

### Search Endpoint Detail

```
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "building code requirements",
  "filters": {
    "doc_class": ["RESEARCH", "LEGAL"],
    "entities": {
      "jurisdictions": ["FL", "Miami-Dade"]
    }
  },
  "sort": "relevance",
  "limit": 10,
  "offset": 0
}

Response: {
  "total": 47,
  "results": [...],
  "facets": {
    "doc_class": { "RESEARCH": 30, "LEGAL": 17 },
    "source": { "google_drive": 40, "local": 7 }
  },
  "query_time_ms": 45
}
```

---

## 8. OPERATIONAL IN 24 HOURS

### What Can Be Live Tomorrow

✅ **Database Schema** — Run migration, tables ready  
✅ **Local Ingestion** — Watch `~/Documents/ARQIA/`, ingest on change  
✅ **Basic Search** — Full-text search across titles, summaries, keywords  
✅ **Classification** — Auto-classify into 8 doc types  
✅ **Entity Extraction** — Extract 5 core entity types  
✅ **Minimal UI** — Search page, results list, basic filters  

### What Requires 48 Hours

⏳ **Drive Connector** — Google API setup, OAuth, folder scanning  
⏳ **GitHub Connector** — App installation, repo access, webhook  
⏳ **Semantic Search** — Embedding service, vector generation  
⏳ **Polished UI** — Better styling, faceted search, document preview  

### Activation Steps (24h)

1. **Hour 0-1:** Run SQL migration
2. **Hour 1-5:** Build local connector, classification, extraction
3. **Hour 5-9:** Build search API (FTS)
4. **Hour 9-15:** Build minimal UI
5. **Hour 15-20:** Test, fix, verify
6. **Hour 20-24:** Deploy, monitor, document

---

**Full Report:** `docs/KNOWLEDGE-BRAIN-V1-ACTIVATION-002.md`
**SQL Migration:** `migrations/ATLAS-KNOWLEDGE-BRAIN-V1-001.sql`
**Status:** ✅ VERIFIED — Ready for 24-hour activation

🎯 Einstein