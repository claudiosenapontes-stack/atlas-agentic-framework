# ATLAS-SOPHIA-FINANCE-SEED-EXECUTION-016
# Canonical POST-Ready Payloads for ARQIA Finance V1

## API FIELD REFERENCE

| Entity | Required Fields | Optional Fields |
|--------|-----------------|-----------------|
| **Budgets** | company_id, fiscal_year, category, allocated, created_by | name, department, forecast |
| **Invoices** | company_id, vendor_name, invoice_number, amount, due_date, created_by | status |
| **Contracts** | company_id, counterparty, contract_type, start_date, created_by | value, end_date, status, visibility, title |
| **Approvals** | company_id, request_type, requestor_id, title, approver_id | amount |

**Valid company_id values:** `ARQIA`, `XGROUP`, `SENA`

---

## 1. BUDGETS (3)

### Budget 1: Q1 2026 Marketing
```json
{
  "company_id": "ARQIA",
  "fiscal_year": 2026,
  "category": "marketing",
  "allocated": 150000,
  "created_by": "sophia",
  "name": "Q1 2026 Marketing Budget",
  "department": "sales-marketing",
  "forecast": 150000
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"marketing","allocated":150000,"created_by":"sophia","name":"Q1 2026 Marketing Budget","department":"sales-marketing","forecast":150000}'
```

### Budget 2: Q2 2026 Engineering Infrastructure
```json
{
  "company_id": "ARQIA",
  "fiscal_year": 2026,
  "category": "engineering",
  "allocated": 200000,
  "created_by": "optimus",
  "name": "Q2 2026 Engineering Infrastructure",
  "department": "engineering",
  "forecast": 200000
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"engineering","allocated":200000,"created_by":"optimus","name":"Q2 2026 Engineering Infrastructure","department":"engineering","forecast":200000}'
```

### Budget 3: FY2026 Executive Operations
```json
{
  "company_id": "ARQIA",
  "fiscal_year": 2026,
  "category": "operations",
  "allocated": 500000,
  "created_by": "olivia",
  "name": "FY2026 Executive Operations",
  "department": "executive",
  "forecast": 500000
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","fiscal_year":2026,"category":"operations","allocated":500000,"created_by":"olivia","name":"FY2026 Executive Operations","department":"executive","forecast":500000}'
```

---

## 2. INVOICES (3)

### Invoice 1: AWS Cloud Services
```json
{
  "company_id": "ARQIA",
  "vendor_name": "Amazon Web Services",
  "invoice_number": "INV-2026-001",
  "amount": 12500.00,
  "due_date": "2026-03-31",
  "created_by": "optimus",
  "status": "pending"
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"Amazon Web Services","invoice_number":"INV-2026-001","amount":12500,"due_date":"2026-03-31","created_by":"optimus","status":"pending"}'
```

### Invoice 2: CreativeWorks Agency
```json
{
  "company_id": "ARQIA",
  "vendor_name": "CreativeWorks Agency",
  "invoice_number": "INV-2026-045",
  "amount": 28500.00,
  "due_date": "2026-04-10",
  "created_by": "sophia",
  "status": "pending"
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"CreativeWorks Agency","invoice_number":"INV-2026-045","amount":28500,"due_date":"2026-04-10","created_by":"sophia","status":"pending"}'
```

### Invoice 3: Counsel LLP Legal
```json
{
  "company_id": "ARQIA",
  "vendor_name": "Counsel LLP",
  "invoice_number": "INV-2026-089",
  "amount": 18500.00,
  "due_date": "2026-04-15",
  "created_by": "harvey",
  "status": "pending"
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","vendor_name":"Counsel LLP","invoice_number":"INV-2026-089","amount":18500,"due_date":"2026-04-15","created_by":"harvey","status":"pending"}'
```

---

## 3. CONTRACTS (2)

### Contract 1: Salesforce CRM
```json
{
  "company_id": "ARQIA",
  "counterparty": "Salesforce Inc.",
  "contract_type": "saas",
  "start_date": "2026-04-01",
  "created_by": "sophia",
  "value": 450000,
  "end_date": "2029-03-31",
  "status": "draft",
  "visibility": "confidential",
  "title": "Enterprise CRM License Agreement"
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/contracts" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","counterparty":"Salesforce Inc.","contract_type":"saas","start_date":"2026-04-01","created_by":"sophia","value":450000,"end_date":"2029-03-31","status":"draft","visibility":"confidential","title":"Enterprise CRM License Agreement"}'
```

### Contract 2: McKinsey Consulting
```json
{
  "company_id": "ARQIA",
  "counterparty": "McKinsey & Company",
  "contract_type": "consulting",
  "start_date": "2026-04-01",
  "created_by": "olivia",
  "value": 250000,
  "end_date": "2026-09-30",
  "status": "draft",
  "visibility": "confidential",
  "title": "Strategic Growth Advisory - Phase 1"
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/contracts" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","counterparty":"McKinsey & Company","contract_type":"consulting","start_date":"2026-04-01","created_by":"olivia","value":250000,"end_date":"2026-09-30","status":"draft","visibility":"confidential","title":"Strategic Growth Advisory - Phase 1"}'
```

---

## 4. APPROVALS (2)

### Approval 1: Marketing Budget Increase
```json
{
  "company_id": "ARQIA",
  "request_type": "budget_increase",
  "requestor_id": "sophia",
  "title": "Q1 Marketing Budget Increase Request",
  "approver_id": "claudio",
  "amount": 25000
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/approvals" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","request_type":"budget_increase","requestor_id":"sophia","title":"Q1 Marketing Budget Increase Request","approver_id":"claudio","amount":25000}'
```

### Approval 2: GitHub Copilot License
```json
{
  "company_id": "ARQIA",
  "request_type": "expense",
  "requestor_id": "optimus",
  "title": "GitHub Copilot Enterprise License",
  "approver_id": "claudio",
  "amount": 12000
}
```

**curl:**
```bash
curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/approvals" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"ARQIA","request_type":"expense","requestor_id":"optimus","title":"GitHub Copilot Enterprise License","approver_id":"claudio","amount":12000}'
```

---

## EXECUTION SUMMARY

| Entity | Count | Total Value |
|--------|-------|-------------|
| Budgets | 3 | $850,000 |
| Invoices | 3 | $59,500 |
| Contracts | 2 | $700,000 |
| Approvals | 2 | $37,000 |
| **TOTAL** | **10** | **$1,646,500** |

---

## TARGET

**Canonical URL:** `https://atlas-agentic-framework.vercel.app`

**Ready for execution when Finance APIs are live.**
