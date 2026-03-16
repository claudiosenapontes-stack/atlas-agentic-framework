# ATLAS-SHARED-KNOWLEDGE-ARCHITECTURE-001
## Shared Knowledge, Memory & Document Architecture

**Status:** DEFINED  
**Analyst:** Einstein (R&D Lead)  
**Date:** 2026-03-15  
**Scope:** Cross-realm knowledge management

---

## EXECUTIVE SUMMARY

Atlas requires a tiered knowledge architecture that distinguishes between personal agent memory, process context, organizational knowledge, and working artifacts. This document defines the canonical storage model, retrieval patterns, and platform boundaries.

**Key Principle:** Not all knowledge is equal. Agent memory is private, process memory is contextual, company knowledge is shared, and working artifacts are temporary.

---

## 1. KNOWLEDGE TAXONOMY

### 1.1 Agent Memory (Private)

**Definition:** Personal context, preferences, and continuity specific to a single agent.

| Attribute | Value |
|-----------|-------|
| **Scope** | Single agent only |
| **Lifetime** | Persistent (cross-session) |
| **Mutability** | Agent writes, system reads |
| **Examples** | User preferences, communication style, past mistakes, lessons learned |

**Storage:**
- `SOUL.md` — Core identity, boundaries, vibe
- `USER.md` — Who the agent serves
- `memory/YYYY-MM-DD.md` — Daily logs, raw context
- `MEMORY.md` — Curated long-term memory (main sessions only)
- `TOOLS.md` — Environment-specific notes

**Access Pattern:**
- Agent loads at session start
- Never shared with other agents
- Human can read; agents cannot read other agents' memory

---

### 1.2 Process Memory (Contextual)

**Definition:** State and context specific to a workflow, project, or execution.

| Attribute | Value |
|-----------|-------|
| **Scope** | Process participants |
| **Lifetime** | Duration of process + archive |
| **Mutability** | Any participant writes |
| **Examples** | Project decisions, task history, execution logs, checkpoint state |

**Storage:**
- Database tables (`executions`, `tasks`, `workflows`)
- Process-specific docs (`PROJECT-*.md`, `WORKFLOW-*.md`)
- Session transcripts (queryable via `memory_search`)

**Access Pattern:**
- Participants query via APIs
- Persistent across agent sessions
- Realm-scoped visibility

---

### 1.3 Company Knowledge (Shared)

**Definition:** Organizational knowledge accessible to all agents and humans.

| Attribute | Value |
|-----------|-------|
| **Scope** | All agents, all realms |
| **Lifetime** | Persistent, versioned |
| **Mutability** | Curated writes (not free-form) |
| **Examples** | Standards, procedures, contact info, product specs, compliance docs |

**Storage:**
- **Google Drive** — Canonical documents (source of truth)
- **GitHub** — Code, infrastructure, technical specs
- **Database** — Structured data, configurations
- **Confluence/Notion** — Wiki-style knowledge (if used)

**Access Pattern:**
- All agents can read
- Writes require approval/curation
- Version controlled

---

### 1.4 Working Artifacts (Temporary)

**Definition:** In-progress work, drafts, and ephemeral outputs.

| Attribute | Value |
|-----------|-------|
| **Scope** | Creator + collaborators |
| **Lifetime** | Temporary → promoted or deleted |
| **Mutability** | High (frequent changes) |
| **Examples** | Draft emails, scratch calculations, temporary files, WIP code |

**Storage:**
- Local workspace (`/tmp`, `./scratch`)
- Draft folders in Drive/Docs
- Uncommitted Git branches
- Session-local memory (not persisted)

**Access Pattern:**
- Creator owns
- Shared with explicit collaborators
- Promoted to Company Knowledge or deleted

---

## 2. CANONICAL STORAGE MODEL

### 2.1 Storage Hierarchy

```
COMPANY KNOWLEDGE (Shared, Persistent)
├── Google Drive ── Canonical documents, specs, standards
├── GitHub ──────── Code, infrastructure, technical specs  
├── Database ────── Structured data, configurations
└── Wiki ────────── Procedural knowledge, how-tos

PROCESS MEMORY (Contextual, Session-Spanning)
├── Database ────── executions, tasks, workflows
├── Process Docs ── PROJECT-*.md, WORKFLOW-*.md
└── Transcripts ─── Session logs, queryable history

AGENT MEMORY (Private, Persistent)
├── SOUL.md ─────── Core identity
├── USER.md ─────── Who I serve
├── memory/*.md ─── Daily logs
└── MEMORY.md ───── Curated long-term memory

WORKING ARTIFACTS (Temporary)
├── Scratch ─────── /tmp, ./scratch
├── Drafts ──────── Unpublished Drive docs
└── Session Local ─ Unpersisted context
```

### 2.2 Storage Decision Matrix

| Content Type | Primary Storage | Secondary | Never Store |
|--------------|-----------------|-----------|-------------|
| **Agent identity** | `SOUL.md` (local) | — | Database |
| **User context** | `USER.md` (local) | — | Shared drive |
| **Daily logs** | `memory/*.md` (local) | — | Company wiki |
| **Curated memory** | `MEMORY.md` (local) | — | Database |
| **Process state** | Database | Process docs | Agent memory |
| **Project plans** | Drive/GitHub | Database | Agent memory |
| **Meeting notes** | Drive | Database | Scratch |
| **Code** | GitHub | — | Drive |
| **Configs** | Database/GitHub | — | Drive |
| **Running logs** | Database | — | Drive |
| **Drafts/WIP** | Scratch/Draft | — | Canonical |
| **Standards** | Drive/GitHub | — | Scratch |

---

## 3. SHARED RETRIEVAL MODEL

### 3.1 Retrieval Methods

| Method | Use Case | Scope | Latency |
|--------|----------|-------|---------|
| **Semantic Search** | Find by meaning | Company + Process | ~100ms |
| **Structured Query** | Exact lookups | Database | ~10ms |
| **Graph Traversal** | Relationship nav | All linked data | ~50ms |
| **Full-Text Search** | Keyword matching | Documents | ~100ms |
| **Memory Recall** | Agent context | Agent Memory | ~10ms |

### 3.2 Retrieval Priority

```
User Query
    │
    ├── 1. AGENT MEMORY ─────── Personal context (if main session)
    │
    ├── 2. PROCESS MEMORY ───── Current execution context
    │
    ├── 3. COMPANY KNOWLEDGE ─ Organizational knowledge
    │
    └── 4. WORKING ARTIFACTS ─ Current drafts (if referenced)
```

---

## 4. CROSS-AGENT DOCUMENT ACCESS MODEL

### 4.1 Permission Levels

| Level | Scope | Example |
|-------|-------|---------|
| **Private** | Agent-only | SOUL.md, USER.md |
| **Realm** | Same realm | Process docs, configs |
| **Shared** | All Atlas agents | Standards, playbooks |
| **Human** | Human readable | Reports, summaries |
| **Public** | External | Customer docs |

### 4.2 Access Matrix (Example)

| Document | Einstein | Optimus | Severino | Human |
|----------|----------|---------|----------|-------|
| SOUL.md (Einstein) | ✅ RW | ❌ | ❌ | ✅ R |
| Process docs | ✅ R | ✅ R | ✅ RW | ✅ R |
| Drive standards | ✅ R | ✅ R | ✅ R | ✅ RW |
| GitHub specs | ✅ R | ✅ RW | ✅ R | ✅ R |
| Task state | ✅ R | ✅ R | ✅ RW | ✅ R |

---

## 5. TASK-TO-DOCUMENT LINKING

### 5.1 Link Types

| Type | Description |
|------|-------------|
| **created** | Document produced by task |
| **references** | Task uses document as input |
| **updates** | Task modifies existing doc |
| **blocks** | Task waiting on document |
| **derived** | Doc derived from task output |

### 5.2 Automatic Linking

| Action | Link Created |
|--------|--------------|
| Write Drive doc during task | `created` |
| Read Drive doc during task | `references` |
| Commit code during task | `created` |
| Update DB during task | `updates` |
| Task blocked on doc | `blocks` |

---

## 6. PLATFORM BOUNDARIES

### 6.1 Google Drive

**Use For:**
- ✅ Canonical documents (PRDs, specs, meeting notes)
- ✅ Shared standards and procedures
- ✅ Reports and deliverables
- ✅ Long-form content

**Don't Use For:**
- ❌ Code (use GitHub)
- ❌ Structured data (use Database)
- ❌ Temporary files (use scratch)
- ❌ Agent-private memory

**Naming Convention:**
```
[TYPE]-[PROJECT]-[DESCRIPTION]-[STATUS]
PRD-Atlas-Knowledge-Architecture-v1.2-Draft
SPEC-Severino-Heartbeat-Protocol-Final
MEET-2026-03-15-Executive-Review-Notes
```

### 6.2 Google Docs

**Use For:**
- ✅ Collaborative editing
- ✅ Documents requiring comments/suggestions
- ✅ Final deliverables
- ✅ Meeting notes (real-time)

**Don't Use For:**
- ❌ Structured data (use Sheets)
- ❌ Code (use GitHub)
- ❌ Configurations (use DB/YAML)

### 6.3 Google Sheets

**Use For:**
- ✅ Structured data tables
- ✅ Tracking spreadsheets
- ✅ Data analysis
- ✅ Checklists and inventories

**Don't Use For:**
- ❌ Long-form prose (use Docs)
- ❌ Code (use GitHub)
- ❌ Large datasets (use Database)

### 6.4 GitHub

**Use For:**
- ✅ Code (all languages)
- ✅ Infrastructure configs (Terraform, Docker)
- ✅ Technical specifications
- ✅ API documentation
- ✅ Runbooks (as markdown)

**Don't Use For:**
- ❌ Business documents (use Drive)
- ❌ Meeting notes (use Drive)
- ❌ Customer-facing docs (use Drive)

### 6.5 Database (Supabase)

**Use For:**
- ✅ Runtime state (tasks, executions, workflows)
- ✅ Configuration data
- ✅ Structured relationships
- ✅ Queryable metadata
- ✅ Audit logs

**Don't Use For:**
- ❌ Large text content (use Drive)
- ❌ Binary files (use Drive/S3)
- ❌ Versioned documents (use GitHub/Drive)

---

## 7. IMPLEMENTATION PRIORITIES

### P0 (Required for MVP)

| Component | Owner | Time | Dependencies |
|-----------|-------|------|--------------|
| Agent memory system | Each agent | 1 day | Workspace setup |
| Process memory tables | Severino | 2 days | Database schema |
| Drive organization | Henry | 1 day | Drive access |
| GitHub repo structure | Optimus | 1 day | Repo creation |
| Basic document linking | Severino | 2 days | Task system |

### P1 (Required for Scale)

| Component | Owner | Time | Dependencies |
|-----------|-------|------|--------------|
| Semantic search index | Einstein | 3 days | Vector DB |
| Cross-agent permissions | Severino | 2 days | Auth system |
| Working artifacts cleanup | Optimus | 1 day | Cron jobs |
| Document versioning | Henry | 2 days | Drive API |

### P2 (Future Enhancements)

| Component | Owner | Time |
|-----------|-------|------|
| Graph-based retrieval | Einstein | 3 days |
| Automatic categorization | Einstein | 2 days |
| Knowledge quality scoring | Einstein | 2 days |

---

**Full Report:** `docs/SHARED-KNOWLEDGE-ARCHITECTURE-001.md`

🎯 Einstein