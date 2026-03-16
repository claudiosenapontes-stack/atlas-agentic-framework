# ATLAS-SOPHIA-FINANCE-SEED-DATA-015
# Ready-to-POST payloads for Finance V1 testing
# Canonical host: https://atlas-agentic-framework.vercel.app

---

## 1. BUDGETS (3)

### Budget 1: Q1 2026 Marketing
```json
{
  "name": "Q1 2026 Marketing Budget",
  "category": "marketing",
  "fiscal_year": 2026,
  "fiscal_quarter": 1,
  "total_amount": 150000,
  "allocated_amount": 135000,
  "spent_amount": 87500,
  "remaining_amount": 62500,
  "currency": "USD",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "owner_id": "sophia",
  "status": "active",
  "description": "Q1 marketing campaigns, events, and digital advertising",
  "line_items": [
    {"category": "digital_ads", "allocated": 60000, "spent": 45000},
    {"category": "events", "allocated": 45000, "spent": 25000},
    {"category": "content", "allocated": 30000, "spent": 17500}
  ],
  "alert_threshold": 85
}
```

### Budget 2: Q2 2026 Engineering
```json
{
  "name": "Q2 2026 Engineering Infrastructure",
  "category": "engineering",
  "fiscal_year": 2026,
  "fiscal_quarter": 2,
  "total_amount": 200000,
  "allocated_amount": 180000,
  "spent_amount": 45000,
  "remaining_amount": 155000,
  "currency": "USD",
  "start_date": "2026-04-01",
  "end_date": "2026-06-30",
  "owner_id": "optimus",
  "status": "active",
  "description": "Cloud infrastructure, tooling, and developer resources",
  "line_items": [
    {"category": "cloud", "allocated": 100000, "spent": 25000},
    {"category": "saas_tools", "allocated": 50000, "spent": 15000},
    {"category": "hardware", "allocated": 30000, "spent": 5000}
  ],
  "alert_threshold": 80
}
```

### Budget 3: FY2026 Executive Operations
```json
{
  "name": "FY2026 Executive Operations",
  "category": "operations",
  "fiscal_year": 2026,
  "fiscal_quarter": null,
  "total_amount": 500000,
  "allocated_amount": 475000,
  "spent_amount": 125000,
  "remaining_amount": 375000,
  "currency": "USD",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "owner_id": "olivia",
  "status": "active",
  "description": "Annual executive operations, travel, and strategic initiatives",
  "line_items": [
    {"category": "travel", "allocated": 150000, "spent": 45000},
    {"category": "consulting", "allocated": 200000, "spent": 50000},
    {"category": "events", "allocated": 125000, "spent": 30000}
  ],
  "alert_threshold": 90
}
```

---

## 2. INVOICES (3)

### Invoice 1: Cloud Services - AWS
```json
{
  "invoice_number": "INV-2026-001",
  "vendor": "Amazon Web Services",
  "vendor_id": "aws",
  "amount": 12500.00,
  "currency": "USD",
  "issue_date": "2026-03-01",
  "due_date": "2026-03-31",
  "status": "pending",
  "category": "infrastructure",
  "budget_id": "<budget_id_for_q2_engineering>",
  "description": "March 2026 cloud infrastructure services",
  "line_items": [
    {"description": "EC2 Instances", "amount": 5000.00},
    {"description": "S3 Storage", "amount": 2000.00},
    {"description": "RDS Databases", "amount": 3500.00},
    {"description": "CloudFront CDN", "amount": 2000.00}
  ],
  "approver_ids": ["optimus", "harvey"],
  "notes": "Standard monthly cloud bill"
}
```

### Invoice 2: Marketing Agency - CreativeWorks
```json
{
  "invoice_number": "INV-2026-045",
  "vendor": "CreativeWorks Agency",
  "vendor_id": "creativeworks",
  "amount": 28500.00,
  "currency": "USD",
  "issue_date": "2026-03-10",
  "due_date": "2026-04-10",
  "status": "pending",
  "category": "marketing",
  "budget_id": "<budget_id_for_q1_marketing>",
  "description": "Q1 brand campaign creative and production",
  "line_items": [
    {"description": "Brand creative development", "amount": 15000.00},
    {"description": "Video production", "amount": 10000.00},
    {"description": "Social assets", "amount": 3500.00}
  ],
  "approver_ids": ["sophia", "claudio"],
  "notes": "Q1 campaign deliverables complete"
}
```

### Invoice 3: Legal Services - Counsel LLP
```json
{
  "invoice_number": "INV-2026-089",
  "vendor": "Counsel LLP",
  "vendor_id": "counsel_llp",
  "amount": 18500.00,
  "currency": "USD",
  "issue_date": "2026-03-15",
  "due_date": "2026-04-15",
  "status": "pending",
  "category": "legal",
  "budget_id": "<budget_id_for_fy_operations>",
  "description": "Contract review and IP advisory services",
  "line_items": [
    {"description": "Contract review - Vendor agreements", "amount": 8000.00},
    {"description": "IP trademark filing", "amount": 5500.00},
    {"description": "General counsel advisory", "amount": 5000.00}
  ],
  "approver_ids": ["harvey", "claudio"],
  "notes": "Urgent: Contracts needed for partner signing"
}
```

---

## 3. CONTRACTS (2)

### Contract 1: Enterprise SaaS Agreement - Salesforce
```json
{
  "contract_type": "saas",
  "counterparty": "Salesforce Inc.",
  "counterparty_id": "salesforce",
  "title": "Enterprise CRM License Agreement",
  "description": "3-year enterprise CRM license with advanced analytics and AI features",
  "value": 450000.00,
  "currency": "USD",
  "start_date": "2026-04-01",
  "end_date": "2029-03-31",
  "renewal_date": "2029-02-01",
  "status": "draft",
  "owner_id": "sophia",
  "legal_owner_id": "harvey",
  "terms": {
    "payment_terms": "Annual upfront",
    "termination_notice_days": 90,
    "auto_renewal": true,
    "liability_cap": 1000000
  },
  "documents": [
    {"type": "master_agreement", "url": "https://docs.arqia.ai/contracts/salesforce-2026.pdf"},
    {"type": "data_processing_agreement", "url": "https://docs.arqia.ai/contracts/salesforce-dpa-2026.pdf"}
  ],
  "approvers": ["harvey", "claudio"],
  "tags": ["crm", "enterprise", "mission-critical"],
  "renewal_reminder_days": 60
}
```

### Contract 2: Consulting Agreement - McKinsey
```json
{
  "contract_type": "consulting",
  "counterparty": "McKinsey & Company",
  "counterparty_id": "mckinsey",
  "title": "Strategic Growth Advisory - Phase 1",
  "description": "6-month strategic consulting engagement for market expansion analysis",
  "value": 250000.00,
  "currency": "USD",
  "start_date": "2026-04-01",
  "end_date": "2026-09-30",
  "renewal_date": null,
  "status": "pending_approval",
  "owner_id": "olivia",
  "legal_owner_id": "harvey",
  "terms": {
    "payment_terms": "Monthly milestone-based",
    "termination_notice_days": 30,
    "auto_renewal": false,
    "confidentiality_period_years": 5
  },
  "documents": [
    {"type": "statement_of_work", "url": "https://docs.arqia.ai/contracts/mckinsey-sow-2026.pdf"},
    {"type": "consulting_agreement", "url": "https://docs.arqia.ai/contracts/mckinsey-master-2026.pdf"}
  ],
  "approvers": ["claudio"],
  "tags": ["consulting", "strategy", "growth"],
  "renewal_reminder_days": null
}
```

---

## 4. APPROVALS (2)

### Approval 1: Marketing Budget Increase
```json
{
  "request_type": "budget_increase",
  "title": "Q1 Marketing Budget Increase Request",
  "description": "Request for additional $25,000 to fund unexpected high-performing ad campaign opportunity. Current Q1 budget nearly exhausted but ROI is 4.5x.",
  "amount": 25000.00,
  "currency": "USD",
  "requester_id": "sophia",
  "department": "sales-marketing",
  "priority": "high",
  "related_entity_type": "budget",
  "related_entity_id": "<q1_marketing_budget_id>",
  "justification": "Meta campaign showing 4.5x ROAS. Additional budget would capture market opportunity before Q2 planning.",
  "attachments": [
    {"type": "campaign_report", "url": "https://docs.arqia.ai/reports/q1-meta-campaign.pdf"},
    {"type": "roi_analysis", "url": "https://docs.arqia.ai/analysis/q1-roi.xlsx"}
  ],
  "approvers": [
    {"role": "manager", "agent_id": "claudio", "status": "pending"},
    {"role": "finance", "agent_id": "harvey", "status": "pending"}
  ],
  "due_date": "2026-03-20"
}
```

### Approval 2: Engineering Tool Purchase
```json
{
  "request_type": "expense",
  "title": "GitHub Copilot Enterprise License",
  "description": "Annual license for 50 engineering team members for AI-assisted coding tool",
  "amount": 12000.00,
  "currency": "USD",
  "requester_id": "optimus",
  "department": "engineering",
  "priority": "medium",
  "related_entity_type": "budget",
  "related_entity_id": "<q2_engineering_budget_id>",
  "justification": "Pilot showed 30% productivity increase. Standardizing across team for Q2 feature velocity.",
  "attachments": [
    {"type": "pilot_results", "url": "https://docs.arqia.ai/reports/copilot-pilot.pdf"}
  ],
  "approvers": [
    {"role": "manager", "agent_id": "claudio", "status": "pending"},
    {"role": "finance", "agent_id": "harvey", "status": "pending"}
  ],
  "due_date": "2026-03-25"
}
```

---

## API ENDPOINTS (Ready to POST)

```bash
# Budgets
curl -X POST https://atlas-agentic-framework.vercel.app/api/finance/budgets \
  -H "Content-Type: application/json" \
  -d '<budget_payload>'

# Invoices
curl -X POST https://atlas-agentic-framework.vercel.app/api/finance/invoices \
  -H "Content-Type: application/json" \
  -d '<invoice_payload>'

# Contracts
curl -X POST https://atlas-agentic-framework.vercel.app/api/finance/contracts \
  -H "Content-Type: application/json" \
  -d '<contract_payload>'

# Approvals
curl -X POST https://atlas-agentic-framework.vercel.app/api/finance/approvals \
  -H "Content-Type: application/json" \
  -d '<approval_payload>'
```

---

## SUMMARY

| Type | Count | Ready to POST |
|------|-------|---------------|
| Budgets | 3 | ✅ |
| Invoices | 3 | ✅ |
| Contracts | 2 | ✅ |
| Approvals | 2 | ✅ |

**Total: 10 payloads ready for Finance V1 testing**
