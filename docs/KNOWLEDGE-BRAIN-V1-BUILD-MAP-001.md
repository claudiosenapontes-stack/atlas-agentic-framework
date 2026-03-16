# ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-V1-BUILD-MAP-001
## Knowledge Brain V1 Production Build Map

**Status:** READY FOR V1 BUILD  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-16

---

## 1. FINAL V1 PURPOSE

Knowledge Brain V1 is the **canonical organizational memory** for ARQIA/XGROUP/SENA ENTERPRISES. It unifies documents from Drive, GitHub, and local sources into a searchable, classified knowledge base.

**V1 Scope:**
- Ingest from Google Drive and GitHub
- Classify into 8 document types
- Extract 8 entity types
- Full-text + semantic search
- Cross-realm query API

**Out of Scope:**
- Real-time collaborative editing
- Version control
- Complex relationship graphs (V2)

---

## 2. PAGE/MENU PROPOSAL

```
Atlas Mission Control
├── Dashboard
├── Realms
│   ├── Executive Ops (Olivia)
│   ├── Finance (Henry)
│   ├── Sales (Sophia)
│   ├── Tech (Optimus)
│   └── Strategy (Einstein)
├── Knowledge Brain
│   ├── Search        ← PRIMARY
│   ├── Sources
│   ├── Registry
│   └── Settings
├── Tasks
├── Events
└── Admin
```

---

## 3. TAXONOMY LOCK (V1)

### Document Classes (8) — LOCKED

| Code | Name | Consumer |
|------|------|----------|
| `LEGAL` | Legal | Harvey |
| `RESEARCH` | Research | Einstein |
| `EXEC` | Executive | Olivia |
| `PRODUCT` | Product | Optimus |
| `MKTG` | Marketing | Olivia |
| `INFRA` | Infrastructure | Optimus |
| `FIN` | Financial | Henry |
| `MEET` | Meeting | All |

### Entity Types (8) — LOCKED

| Field | V1 Extraction |
|-------|---------------|
| `companies` | Auto |
| `people` | Auto |
| `projects` | Auto |
| `jurisdictions` | Auto |
| `dates` | Auto |
| `contract_parties` | LEGAL only |
| `regulations` | LEGAL, RESEARCH |
| `deliverables` | PRODUCT, INFRA |

---

## 4. INGESTION SOURCES

| Priority | Source | Config |
|----------|--------|--------|
| P0 | Local | `~/Documents/ARQIA/`, watch mode |
| P0 | Drive | Folder: `ARQIA Knowledge/`, poll 60min |
| P1 | GitHub | Repos: `arquia/docs`, poll 30min |

---

## 5. SEARCH SURFACES

| Type | Method | Status |
|------|--------|--------|
| Full-Text | PostgreSQL tsvector | P0 |
| Semantic | Vector similarity | P0 |
| Filter | Structured query | P0 |
| Hybrid | Combined | P1 |

### API Endpoints

```
POST /api/knowledge/search        # Universal search
POST /api/knowledge/search/semantic  # Semantic only
GET  /api/knowledge/docs/:id      # Document lookup
POST /api/knowledge/ingest        # Trigger ingestion
GET  /api/knowledge/registry      # Browse all
```

---

## 6. CROSS-REALM USE CASES

| Realm | Primary Classes | Key Use Case |
|-------|-----------------|--------------|
| **Executive Ops** (Olivia) | EXEC, MEET, FIN | Decision prep, briefings |
| **Finance** (Henry) | FIN, LEGAL, EXEC | Contract review, budgets |
| **Sales** (Sophia) | MKTG, RESEARCH, PRODUCT | Proposals, market intel |
| **Tech** (Optimus) | INFRA, PRODUCT, RESEARCH | Architecture, API design |
| **Strategy** (Einstein) | RESEARCH, EXEC, LEGAL | Regulatory, market entry |

---

## 7. EXACT API SURFACE

### Core Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/knowledge/search` | POST | All | Universal search |
| `/api/knowledge/docs/:id` | GET | All | Get document |
| `/api/knowledge/ingest` | POST | Admin | Trigger ingestion |
| `/api/knowledge/sources` | GET/POST | Admin | Manage sources |
| `/api/knowledge/registry` | GET | Admin | Browse registry |

### Database Schema

```sql
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
  keywords TEXT[] NOT NULL,
  entities JSONB NOT NULL,
  checksum TEXT NOT NULL,
  extracted_at TIMESTAMP NOT NULL,
  classification_confidence REAL NOT NULL,
  status TEXT DEFAULT 'active'
);

-- Full-text index
CREATE INDEX idx_kr_fts ON knowledge_registry 
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || array_to_string(keywords, ' ')));

-- Vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE knowledge_embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES knowledge_registry(doc_id),
  embedding vector(384),
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2'
);
CREATE INDEX idx_ke_vector ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops);
```

---

## 8. LIVE REQUIREMENTS

### LIVE Search

| Requirement | Implementation |
|-------------|----------------|
| Query latency < 500ms | PostgreSQL + indexes |
| Index freshness < 5 min | Sync trigger on ingest |
| 99.9% uptime | Read replica |
| 50+ concurrent users | Connection pooling |

### LIVE Ingest

| Requirement | Implementation |
|-------------|----------------|
| Detection < 5 min | Webhook preferred, polling fallback |
| Processing < 30s/doc | Async job queue |
| 100 docs/hour throughput | Worker pool |
| Failure handling | Retry 3x, then quarantine |

---

## 9. EMBEDDING PROVIDER

### Recommended: all-MiniLM-L6-v2

| Attribute | Value |
|-----------|-------|
| Dimensions | 384 |
| Max tokens | 256 |
| Model size | ~80MB |
| Inference | ~10ms/doc (CPU) |
| License | Apache 2.0 |

**Why:** Open source, fast, sufficient quality, no API dependency.

### Alternative: OpenAI text-embedding-3-small

| Attribute | Value |
|-----------|-------|
| Dimensions | 1536 |
| Cost | $0.02/1M tokens |
| Latency | 100-300ms |

**Use when:** Higher quality needed, budget allows.

---

## 10. STORAGE ARCHITECTURE

### Stored in Knowledge Brain

| Data | Storage |
|------|---------|
| doc_id, doc_class | PostgreSQL |
| title, summary | PostgreSQL |
| keywords | PostgreSQL array |
| entities | PostgreSQL JSONB |
| embedding | PostgreSQL pgvector |
| source metadata | PostgreSQL |

### Source-of-Truth Elsewhere

| Data | Source |
|------|--------|
| Full document content | Drive / GitHub / Local |
| Document versions | Drive / GitHub native |
| Permissions | Drive / GitHub ACLs |
| Binary files | Drive / GitHub (URL only) |

### Indexed Fields

| Index | Purpose |
|-------|---------|
| Full-text (GIN) | Keyword search |
| Vector (IVFFlat) | Semantic similarity |
| B-tree | doc_class, source, status |
| GIN | entities JSONB |
| B-tree | extracted_at |

---

## 11. BUILD PHASES (4 Weeks)

### Week 1: Foundation
- Database schema
- Local connector
- Classification engine
- Entity extraction
- Summary generation

### Week 2: Ingestion
- Drive connector
- GitHub connector
- Ingestion API
- Job queue
- Webhook handlers

### Week 3: Search
- Full-text search
- Semantic search
- Search API
- Search UI
- Filter components

### Week 4: UI Polish
- Sources management
- Registry browser
- Document detail view
- Cross-realm widgets
- Testing & QA

**Total: ~186 hours (~4.5 weeks)**

---

## 12. SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| Search latency | < 500ms p95 |
| Ingestion rate | 100 docs/hour |
| Classification accuracy | > 85% |
| Entity extraction recall | > 80% |
| Uptime | 99.9% |
| Document coverage | > 90% of Drive/GitHub docs |

---

**Full Report:** `docs/KNOWLEDGE-BRAIN-V1-BUILD-MAP-001.md`
**Depends On:** Taxonomy, Ingestion Pipeline, Shared Knowledge Architecture

🎯 Einstein