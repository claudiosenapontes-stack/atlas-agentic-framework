# ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-SEARCH-SURFACE-003
## Knowledge Brain Search Surface Report

**Status:** V1 Search Surface Defined  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-16  
**Version:** 1.0

---

## 1. EXECUTIVE SUMMARY

Knowledge Brain V1 search surface provides **operator-usable retrieval** across 20+ ingested documents. Four core contracts defined: **Search**, **Registry Browse**, **Sources**, and **Document Detail**. Full-text search operational; semantic search pending embedding service (V1.1).

**Key Capabilities:**
- ✅ Full-text search (PostgreSQL tsvector)
- ✅ Structured filtering (8 doc classes, 8 entity types)
- ✅ Registry browsing with pagination
- ✅ Source connector management
- ✅ Document detail view with entity highlighting

**Current Gaps:**
- ⏳ Semantic search (requires embedding service)
- ⏳ Hybrid search (FTS + semantic)
- ⏳ Faceted search UI
- ⏳ Saved searches

---

## 2. ROUTE MAP

### API Routes

| Method | Route | Contract | Purpose |
|--------|-------|----------|---------|
| **GET** | `/api/knowledge/search` | Search | Full-text + filtered search |
| **GET** | `/api/knowledge/registry` | Registry Browse | List all documents |
| **GET** | `/api/knowledge/sources` | Sources | List configured sources |
| **POST** | `/api/knowledge/sources` | Sources | Add new source |
| **DELETE** | `/api/knowledge/sources/:id` | Sources | Remove source |
| **GET** | `/api/knowledge/documents/:docId` | Document Detail | Single document view |
| **GET** | `/api/knowledge/documents/:docId/download` | Document Detail | Fetch original content |
| **GET** | `/api/knowledge/entities` | Registry Browse | List all entities |
| **GET** | `/api/knowledge/stats` | Sources | Ingestion statistics |

### UI Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/knowledge` | Knowledge Brain Home | All users |
| `/knowledge/search` | Search Results | All users |
| `/knowledge/registry` | Document Registry | All users |
| `/knowledge/sources` | Source Management | Admin only |
| `/knowledge/documents/:docId` | Document Detail | All users |

---

## 3. SEARCH CONTRACT

### Endpoint
```
GET /api/knowledge/search?q={query}&filters={json}&sort={field}&order={asc|desc}&page={n}&limit={20|50|100}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Full-text search query (tsquery syntax supported) |
| `filters` | JSON | No | Structured filters (see below) |
| `sort` | enum | No | `relevance`, `title`, `created_at`, `updated_at`, `doc_class` |
| `order` | enum | No | `asc`, `desc` (default: `desc` for relevance, `asc` for others) |
| `page` | integer | No | Page number (1-indexed, default: 1) |
| `limit` | integer | No | Results per page (20, 50, 100; default: 20) |

### Filter Schema

```typescript
interface SearchFilters {
  // Document classification
  doc_class?: DocumentClass[];        // ["LEGAL", "RESEARCH", ...]
  source?: string[];                   // ["local_arquia", "google_drive"]
  
  // Entity filters
  entities?: {
    companies?: string[];
    people?: string[];
    projects?: string[];
    jurisdictions?: string[];
    regulations?: string[];
    contract_parties?: string[];
    deliverables?: string[];
  };
  
  // Date range
  created_after?: ISO8601Date;
  created_before?: ISO8601Date;
  updated_after?: ISO8601Date;
  updated_before?: ISO8601Date;
  
  // Content
  has_summary?: boolean;
  keyword_contains?: string[];
}
```

### Response Format

```typescript
interface SearchResponse {
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    query: string;
    filters_applied: SearchFilters;
    search_time_ms: number;
  };
  results: SearchResult[];
  facets: {
    doc_class: FacetCount[];
    source: FacetCount[];
    projects: FacetCount[];
    jurisdictions: FacetCount[];
    companies: FacetCount[];
  };
}

interface SearchResult {
  doc_id: string;
  title: string;
  doc_class: DocumentClass;
  source: string;
  source_path: string;
  summary: string;              // Max 500 chars
  summary_highlighted?: string; // With search term highlights
  keywords: string[];
  entities: ExtractedEntities;
  created_at: ISO8601Date;
  updated_at: ISO8601Date;
  score: number;                // Relevance score (0-1)
  excerpt?: string;             // Matching text excerpt with context
}

interface FacetCount {
  value: string;
  count: number;
}
```

### Search Examples

**Basic search:**
```
GET /api/knowledge/search?q=Atlas+Severino
```

**Filtered by class:**
```
GET /api/knowledge/search?q=contract&filters={"doc_class":["LEGAL"]}
```

**By entity (jurisdiction FL):**
```
GET /api/knowledge/search?filters={"entities":{"jurisdictions":["FL"]}}
```

**By project and date:**
```
GET /api/knowledge/search?filters={"entities":{"projects":["Knowledge Brain"]},"created_after":"2026-03-01"}
```

---

## 4. REGISTRY BROWSE CONTRACT

### Endpoint
```
GET /api/knowledge/registry?filters={json}&sort={field}&order={asc|desc}&page={n}&limit={20|50|100}
```

### Query Parameters

Same as Search contract, but `q` parameter is not supported (no full-text search).

### Response Format

```typescript
interface RegistryResponse {
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    filters_applied: SearchFilters;
    query_time_ms: number;
  };
  documents: RegistryDocument[];
  summary: {
    by_class: Record<DocumentClass, number>;
    by_source: Record<string, number>;
    total_entities: number;
    last_ingested: ISO8601Date;
  };
}

interface RegistryDocument {
  doc_id: string;
  title: string;
  doc_class: DocumentClass;
  classification_confidence: number;
  source: string;
  source_path: string;
  file_type: string;            // pdf, docx, txt, md, etc.
  file_size_bytes: number;
  checksum: string;
  summary: string;
  keywords: string[];
  entity_counts: Record<EntityType, number>;
  created_at: ISO8601Date;
  updated_at: ISO8601Date;
  last_ingested_at: ISO8601Date;
  ingestion_job_id: string;
}
```

---

## 5. SOURCES CONTRACT

### List Sources
```
GET /api/knowledge/sources
```

**Response:**
```typescript
interface SourcesResponse {
  sources: Source[];
  stats: {
    total_documents: number;
    total_sources: number;
    last_ingestion: ISO8601Date;
  };
}

interface Source {
  source_id: string;
  source_type: "local" | "google_drive" | "github";
  name: string;
  config: SourceConfig;
  status: "active" | "paused" | "error";
  last_scan_at: ISO8601Date | null;
  document_count: number;
  error_message?: string;
  created_at: ISO8601Date;
  updated_at: ISO8601Date;
}
```

### Add Source
```
POST /api/knowledge/sources
```

**Request Body:**
```typescript
interface CreateSourceRequest {
  source_type: "local" | "google_drive" | "github";
  name: string;
  config: SourceConfig;
}
```

### Remove Source
```
DELETE /api/knowledge/sources/:source_id
```

### Trigger Ingestion
```
POST /api/knowledge/sources/:source_id/ingest
```

---

## 6. DOCUMENT DETAIL CONTRACT

### Get Document
```
GET /api/knowledge/documents/:doc_id
```

**Response:**
```typescript
interface DocumentDetailResponse {
  doc_id: string;
  title: string;
  doc_class: DocumentClass;
  classification_confidence: number;
  classification_method: "path" | "content" | "ml";
  
  source: {
    source_id: string;
    source_type: string;
    source_path: string;
    original_url?: string;
  };
  
  content: {
    file_type: string;
    file_size_bytes: number;
    checksum: string;
    mime_type: string;
    text_extracted: boolean;
    text_preview?: string;
  };
  
  extraction: {
    summary: string;
    keywords: string[];
    entities: ExtractedEntities;
    extraction_confidence: number;
    extracted_at: ISO8601Date;
  };
  
  related: {
    by_project: RelatedDoc[];
    by_jurisdiction: RelatedDoc[];
    by_company: RelatedDoc[];
    by_keyword: RelatedDoc[];
  };
}

interface ExtractedEntities {
  companies: string[];
  people: string[];
  projects: string[];
  jurisdictions: string[];
  dates: string[];
  contract_parties: string[];
  regulations: string[];
  deliverables: string[];
}
```

---

## 7. DOCUMENT CLASSES

| Value | Label | Description | Primary Consumer |
|-------|-------|-------------|------------------|
| `LEGAL` | Legal | Contracts, agreements, terms, compliance docs | Harvey |
| `RESEARCH` | Research | Market research, technical analysis, studies | Einstein |
| `EXEC` | Executive | Strategic decisions, board materials, exec summaries | Olivia |
| `PRODUCT` | Product | PRDs, specs, roadmaps, feature docs | Optimus |
| `MKTG` | Marketing | Campaigns, collateral, brand guidelines | Olivia |
| `INFRA` | Infrastructure | Architecture, devops, API docs, configs | Optimus |
| `FIN` | Financial | Budgets, forecasts, financial statements | Olivia |
| `MEET` | Meeting | Notes, minutes, action items, summaries | All |

---

## 8. CURRENT GAPS

### V1.0 Operational (Now)
- ✅ Full-text search (PostgreSQL tsvector)
- ✅ Structured filtering (8 classes, 8 entity types)
- ✅ Registry browse with pagination
- ✅ Source management
- ✅ Document detail view

### V1.1 Gaps (Next 48h)

| Gap | Impact | Solution |
|-----|--------|----------|
| **Semantic search** | Cannot find conceptually related docs | Implement embedding service with all-MiniLM-L6-v2 |
| **Hybrid search** | Cannot combine FTS + semantic ranking | Build hybrid query combining tsvector + cosine similarity |
| **Similar documents** | Cannot find semantically similar docs | Requires embedding comparison |
| **Saved searches** | Users cannot save query patterns | Add user preferences table |

---

**Report Generated:** 2026-03-16  
**Status:** ✅ **V1 SEARCH SURFACE DEFINED**

🎯 Einstein