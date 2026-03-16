# ATLAS-SOPHIA-DATA-REPLAY-PACKET-017
# Replayable Data Packets for Canonical Production

**Generated:** 2026-03-16  
**Target:** https://atlas-agentic-framework.vercel.app  
**Policy:** Do NOT replay duplicates

---

## CANONICAL PRODUCTION STATE (Current)

| Entity | Count | Notes |
|--------|-------|-------|
| **Leads** | 2 | 1 contacted (score 85), 1 new (score 75) |
| **Lead Activities** | 4 | Activity log exists |
| **Campaigns** | 2 | Active campaigns configured |
| **Knowledge Documents** | 1 | Smoke test doc present |
| **Budgets** | 0 | None created |
| **Invoices** | 0 | None created |
| **Contracts** | 0 | None created |
| **Approvals** | 0 | None created |
| **Executive Events** | 0 | None created |

---

## REPLAY PACKET CLASSIFICATION

### ✅ SAFE TO REPLAY

#### 1. Finance Seed Data (10 items)
**Status:** NOT in canonical  
**Action:** Full replay required  
**Source:** ATLAS-SOPHIA-FINANCE-SEED-EXECUTION-016

| # | Entity | Endpoint | Payload Status |
|---|--------|----------|----------------|
| 1 | Budget | POST /api/finance/budgets | Ready |
| 2 | Budget | POST /api/finance/budgets | Ready |
| 3 | Budget | POST /api/finance/budgets | Ready |
| 4 | Invoice | POST /api/finance/invoices | Ready |
| 5 | Invoice | POST /api/finance/invoices | Ready |
| 6 | Invoice | POST /api/finance/invoices | Ready |
| 7 | Contract | POST /api/finance/contracts | Ready |
| 8 | Contract | POST /api/finance/contracts | Ready |
| 9 | Approval | POST /api/finance/approvals | Ready |
| 10 | Approval | POST /api/finance/approvals | Ready |

**Total Value:** $1,646,500

---

#### 2. Hot Lead Test Record (1 item)
**Status:** PARTIALLY in canonical  
**Issue:** Lead exists but status="contacted" (not "new")  
**Action:** Create NEW hot lead with status="new" for testing

**Current canonical lead:**
- ID: `2329b89a-9790-4c4c-a3a7-4487fff63dc9`
- Score: 85
- Status: contacted ❌ (not eligible for hot_leads query)

**Replay Payload:**
```json
{
  "first_name": "Sarah",
  "last_name": "Chen",
  "company": "TechFlow Inc",
  "title": "VP of Engineering",
  "email": "sarah.chen@techflow.example",
  "source": "linkedin",
  "status": "new",
  "score": 92,
  "estimated_value": 45000,
  "notes": "Hot lead from LinkedIn - actively evaluating solutions",
  "agent_id": "sophia"
}
```

**Endpoint:** `POST /api/leads`

**Duplicate Check:** Safe (new email, new record)

---

#### 3. Lead Activity for Hot Lead (1 item)
**Status:** Activities exist (4) but may not be linked to new hot lead  
**Action:** Create activity after lead creation

**Replay Payload:**
```json
{
  "lead_id": "<USE_NEW_LEAD_ID>",
  "activity_type": "note",
  "content": "Initial contact from LinkedIn campaign. High intent, budget confirmed.",
  "agent_id": "sophia"
}
```

**Endpoint:** `POST /api/leads/activities`

---

### ❌ MUST NOT REPLAY

#### 1. Existing Leads (2 items)
**Reason:** Already in canonical production

| ID | Status | Action |
|----|--------|--------|
| `2329b89a-9790-4c4c-a3a7-4487fff63dc9` | contacted | SKIP - exists |
| `0c643582-1f60-4a22-abbf-73b3f801b161` | new | SKIP - exists |

#### 2. Existing Campaigns (2 items)
**Reason:** Production campaigns already configured

**Action:** Verify but do not recreate

---

### ✅ ALREADY EXISTS CANONICALLY

| Entity | Count | Verification Endpoint |
|--------|-------|----------------------|
| Campaigns | 2 | `GET /api/campaigns` |
| Knowledge Docs | 1 | `GET /api/knowledge` |
| Leads | 2 | `GET /api/leads` |
| Lead Activities | 4 | `GET /api/leads/activities` |

---

## REPLAY EXECUTION PLAN

### Phase 1: Finance Data (Immediate)
```bash
# Execute all 10 finance payloads
# See: ATLAS-SOPHIA-FINANCE-SEED-EXECUTION-016.md
```

### Phase 2: Hot Lead Test Data
```bash
# Create hot lead with status="new"
curl -X POST "https://atlas-agentic-framework.vercel.app/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Sarah",
    "last_name": "Chen",
    "company": "TechFlow Inc",
    "title": "VP of Engineering",
    "email": "sarah.chen@techflow.example",
    "source": "linkedin",
    "status": "new",
    "score": 92,
    "estimated_value": 45000,
    "notes": "Hot lead from LinkedIn - actively evaluating solutions",
    "agent_id": "sophia"
  }'
```

### Phase 3: Verify
```bash
# Check hot leads query returns results
curl -s "https://atlas-agentic-framework.vercel.app/api/leads?hot_only=true" | jq '.leads | length'

# Expected: 1 (the new hot lead)
```

---

## PAYLOAD MANIFEST

### Finance (Ready to Execute)

**Budget 1:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"marketing","allocated":150000,"created_by":"sophia","name":"Q1 2026 Marketing Budget","department":"sales-marketing","forecast":150000}'
```

**Budget 2:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"engineering","allocated":200000,"created_by":"optimus","name":"Q2 2026 Engineering Infrastructure","department":"engineering","forecast":200000}'
```

**Budget 3:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"operations","allocated":500000,"created_by":"olivia","name":"FY2026 Executive Operations","department":"executive","forecast":500000}'
```

**Invoice 1:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"Amazon Web Services","invoice_number":"INV-2026-001","amount":12500,"due_date":"2026-03-31","created_by":"optimus","status":"pending"}'
```

**Invoice 2:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"CreativeWorks Agency","invoice_number":"INV-2026-045","amount":28500,"due_date":"2026-04-10","created_by":"sophia","status":"pending"}'
```

**Invoice 3:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"Counsel LLP","invoice_number":"INV-2026-089","amount":18500,"due_date":"2026-04-15","created_by":"harvey","status":"pending"}'
```

**Contract 1:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/contracts" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","counterparty":"Salesforce Inc.","contract_type":"saas","start_date":"2026-04-01","created_by":"sophia","value":450000,"end_date":"2029-03-31","status":"draft","visibility":"confidential","title":"Enterprise CRM License Agreement"}'
```

**Contract 2:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/contracts" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","counterparty":"McKinsey & Company","contract_type":"consulting","start_date":"2026-04-01","created_by":"olivia","value":250000,"end_date":"2026-09-30","status":"draft","visibility":"confidential","title":"Strategic Growth Advisory - Phase 1"}'
```

**Approval 1:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/approvals" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","request_type":"budget_increase","requestor_id":"sophia","title":"Q1 Marketing Budget Increase Request","approver_id":"claudio","amount":25000}'
```

**Approval 2:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/approvals" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","request_type":"expense","requestor_id":"optimus","title":"GitHub Copilot Enterprise License","approver_id":"claudio","amount":12000}'
```

---

## SUMMARY

| Category | Items | Value | Status |
|----------|-------|-------|--------|
| **Safe to Replay** | 11 | $1,646,500 + 1 hot lead | Ready |
| **Must Not Replay** | 4 | N/A | Already exists |
| **Already Canonical** | 9 | N/A | Verified |

**Total New Records:** 11  
**Total Value:** $1,646,500 (Finance) + Pipeline value (Hot Lead)

**Next Action:** Execute replay when Finance APIs are live.
