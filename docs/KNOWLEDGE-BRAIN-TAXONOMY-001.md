# ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-TAXONOMY-001
## Knowledge Brain Canonical Taxonomy

**Status:** DEFINED  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  
**Scope:** Cross-agent document classification and extraction

---

## EXECUTIVE SUMMARY

Knowledge Brain requires a unified taxonomy that supports research retrieval (Einstein), legal review (Harvey), executive operations (Olivia), and system documentation (Optimus). This document defines the minimal extraction contract for maximum utility.

**Key Principle:** Rich enough for precise retrieval, simple enough for consistent extraction.

---

## 1. DOCUMENT CLASSES (8 Types)

| Class | Code | Description | Primary Consumer |
|-------|------|-------------|------------------|
| **Legal** | `LEGAL` | Contracts, agreements, filings, compliance docs | Harvey |
| **Research** | `RESEARCH` | Market analysis, technical research, reports | Einstein |
| **Executive** | `EXEC` | Decisions, strategies, board materials, OKRs | Olivia |
| **Product** | `PRODUCT` | PRDs, specs, roadmaps, user stories | Optimus |
| **Marketing** | `MKTG` | Campaigns, content, brand guidelines | Olivia |
| **Infrastructure** | `INFRA` | Architecture, runbooks, configs, APIs | Optimus |
| **Financial** | `FIN` | Budgets, forecasts, statements, invoices | Olivia |
| **Meeting** | `MEET` | Notes, transcripts, action items | All |

### Class-Specific Metadata (Minimal)

```typescript
// LEGAL
{ contract_type: "msa" | "sow" | "nda" | "employment" | "vendor" | "other" }

// RESEARCH  
{ research_type: "market" | "technical" | "competitive" | "regulatory" }

// EXEC
{ decision_type: "strategic" | "tactical" | "policy" | "resource" }

// PRODUCT
{ doc_type: "prd" | "spec" | "roadmap" | "user_story" }

// MKTG
{ channel: "email" | "social" | "web" | "events" | "content" }

// INFRA
{ doc_type: "architecture" | "runbook" | "config" | "api" }

// FIN
{ doc_type: "budget" | "forecast" | "statement" | "invoice" }

// MEET
{ meeting_type: "standup" | "review" | "planning" | "decision" }
```

---

## 2. ENTITY EXTRACTION FIELDS (8 Types)

| Entity | Field | Type | Example |
|--------|-------|------|---------|
| **Company** | `companies` | `string[]` | ["ARQIA", "XGROUP"] |
| **People** | `people` | `string[]` | ["Claudio Sena", "John Doe"] |
| **Jurisdiction** | `jurisdictions` | `string[]` | ["FL", "US-Federal", "EU"] |
| **Project** | `projects` | `string[]` | ["Atlas", "Severino"] |
| **Date** | `dates` | `Date[]` | ["2026-03-15"] |
| **Contract Party** | `contract_parties` | `string[]` | ["Vendor Inc"] |
| **Regulation/Code** | `regulations` | `string[]` | ["GDPR", "IBC 2021"] |
| **Deliverable** | `deliverables` | `string[]` | ["PRD", "Architecture Doc"] |

---

## 3. KNOWLEDGE ITEM TYPES (8 Types)

| Type | Code | Description | Example |
|------|------|-------------|---------|
| **Fact** | `FACT` | Verifiable statement | "FL requires 150mph wind rating" |
| **Policy** | `POLICY` | Organizational rule | "Contracts require legal review" |
| **Finding** | `FINDING` | Research conclusion | "Market size is $2B" |
| **Decision** | `DECISION` | Approved course of action | "Use PostgreSQL for primary DB" |
| **Precedent** | `PRECEDENT` | Past case guiding future | "2024 MSA template used" |
| **Requirement** | `REQ` | Must-be-met condition | "System must support 10k RPS" |
| **Contact** | `CONTACT` | Person/organization info | "Legal counsel: Jane Doe" |
| **Insight** | `INSIGHT` | Task-derived learning | "API timeout caused by..." |

---

## 4. RELATIONSHIP TYPES (7 Types)

| Relationship | Code | Direction | Example |
|--------------|------|-----------|---------|
| **Depends On** | `DEPENDS_ON` | Uni | "Feature X depends on API Y" |
| **Supersedes** | `SUPERSEDES` | Uni | "v2.0 supersedes v1.0" |
| **References** | `REFERENCES` | Uni | "PRD references market research" |
| **Derived From** | `DERIVED_FROM` | Uni | "Decision derived from findings" |
| **Blocks** | `BLOCKS` | Uni | "Bug #123 blocks release" |
| **Supports** | `SUPPORTS` | Uni | "Research supports decision" |
| **Applies To** | `APPLIES_TO` | Uni | "Code applies to jurisdiction FL" |

---

## 5. MINIMUM EXTRACTION CONTRACT

### Required Fields (All Documents)

```typescript
{
  doc_id: string;           // Unique identifier
  doc_title: string;        // Document title
  doc_class: DocumentClass; // One of 8 classes
  
  source_location: string;  // URL, path, or reference
  extracted_at: Date;       // Extraction timestamp
  extracted_by: AgentID;    // Agent that extracted
  
  entities: {
    companies: string[];    // Minimum: empty array
    people: string[];
    projects: string[];
    dates: Date[];
  };
  
  summary: string;          // Max 500 characters
  keywords: string[];       // Max 10 keywords
}
```

### Extraction Confidence

| Level | Threshold | Action |
|-------|-----------|--------|
| **High** | >= 0.9 | Auto-accept, index immediately |
| **Medium** | 0.7 - 0.89 | Index with flag for review |
| **Low** | < 0.7 | Queue for human verification |

---

## 6. RECOMMENDED SEARCH FILTERS

### Einstein (Research)

```typescript
{
  doc_class: ["RESEARCH", "LEGAL", "PRODUCT"],
  entities: {
    regulations: string[],  // Building codes, standards
    jurisdictions: string[], // FL, Miami-Dade, etc.
    projects: string[]
  },
  knowledge_types: ["FACT", "FINDING", "PRECEDENT"],
  confidence: "high" | "medium",
  date_range: { from: Date, to: Date }
}
```

### Harvey (Legal)

```typescript
{
  doc_class: ["LEGAL", "EXEC"],
  entities: {
    contract_parties: string[],
    jurisdictions: string[],
    regulations: string[]
  },
  knowledge_types: ["POLICY", "DECISION", "PRECEDENT", "REQ"],
  relationships: ["SUPERSEDES", "APPLIES_TO", "REFERENCES"],
  verification_status: "verified"
}
```

### Olivia (Executive Ops)

```typescript
{
  doc_class: ["EXEC", "FIN", "MKTG", "MEET"],
  entities: {
    people: string[],
    projects: string[],
    companies: string[]
  },
  knowledge_types: ["DECISION", "CONTACT", "INSIGHT"],
  effective_date: { from: Date } // Current policies only
}
```

### Optimus (System Docs)

```typescript
{
  doc_class: ["INFRA", "PRODUCT"],
  entities: {
    projects: string[],
    deliverables: string[]
  },
  knowledge_types: ["REQ", "FACT", "DECISION"],
  relationships: ["DEPENDS_ON", "BLOCKS", "SUPERSEDES"]
}
```

---

## 7. CROSS-AGENT USAGE MATRIX

| Component | Einstein | Harvey | Olivia | Optimus |
|-----------|----------|--------|--------|---------|
| **Document Classes** | RESEARCH, LEGAL | LEGAL, EXEC | EXEC, FIN, MKTG | PRODUCT, INFRA |
| **Entity Focus** | regulations, jurisdictions | contract_parties, jurisdictions | people, projects | projects, deliverables |
| **Knowledge Types** | FACT, FINDING | POLICY, PRECEDENT | DECISION, CONTACT | REQ, INSIGHT |
| **Relationships** | SUPPORTS, APPLIES_TO | SUPERSEDES, REFERENCES | DERIVED_FROM | DEPENDS_ON, BLOCKS |

---

## 8. API CONTRACT

### Extract Knowledge

```
POST /api/knowledge/extract
{
  document: {
    id: string;
    content: string;
    format: "text" | "markdown" | "pdf";
  },
  options: {
    extract_entities: boolean;
    extract_relationships: boolean;
    classify_document: boolean;
    confidence_threshold: number; // default: 0.7
  }
}
```

### Search Knowledge

```
POST /api/knowledge/search
{
  query: string;
  filters: {
    doc_class?: DocumentClass[];
    entities?: Partial<ExtractedEntities>;
    knowledge_types?: KnowledgeType[];
    relationships?: RelationshipType[];
    confidence?: "high" | "medium" | "low";
    date_range?: { from: Date; to: Date };
  },
  limit: number; // default: 10
  offset: number;
}
```

### Store Knowledge Item

```
POST /api/knowledge/items
{
  type: KnowledgeType;
  statement: string;
  confidence: "high" | "medium" | "low";
  entities: ExtractedEntities;
  source_doc_id: string;
}
```

---

## 9. NO OVERDESIGN PRINCIPLES

1. **No nested entities** — Flat arrays only
2. **No recursive relationships** — Max 1 hop
3. **No document content storage** — Store metadata only, reference source
4. **No real-time sync** — Batch extraction on ingestion
5. **No automatic relationship inference** — Explicit only
6. **No versioning in taxonomy** — Use source document versioning

---

**Full Report:** `docs/KNOWLEDGE-BRAIN-TAXONOMY-001.md`

🎯 Einstein