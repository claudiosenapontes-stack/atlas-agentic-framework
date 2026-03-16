# ATLAS-HARVEY-OPTIMUS-FINANCE-CANONICAL-SCHEMA-RECOVERY-011

## Execution Order

### STEP 1: Run Base Schema SQL
**File:** `20260316_finance_base_schema.sql`
**Action:** Execute in Supabase SQL Editor
**Purpose:** Create core finance tables from scratch

**Tables Created:**
- `budgets` — Department budgets with spend tracking
- `invoices` — Vendor invoice management
- `contracts` — Legal contract lifecycle
- `approvals` — Finance approval workflow

**Includes:**
- Primary keys, foreign keys, check constraints
- Indexes for performance
- RLS policies
- Auto-updated timestamp triggers

---

### STEP 2: Run Phase 1 Patch SQL
**File:** `20260316_finance_phase1_patch.sql`
**Action:** Execute in Supabase SQL Editor
**Purpose:** Additional alignment patches and seed data

**Patches Applied:**
- Virtual column `name` on budgets (aliases category)
- Virtual column `display_name` for UI
- Constraint validation (idempotent)
- Seed data for ARQIA (3 sample budgets)

---

### STEP 3: Run Verification Queries
**File:** `20260316_finance_verification.sql`
**Action:** Execute in Supabase SQL Editor (read-only, safe)
**Purpose:** Confirm schema alignment

**Validates:**
- All 4 tables exist
- Required columns present
- Constraints active
- Indexes created
- API field compatibility
- Test insert/rollback works

---

## Expected Results After Execution

### API Response Changes

| Endpoint | Before | After |
|----------|--------|-------|
| GET /api/finance/budgets?company_id=ARQIA | 500 - table missing | 200 - [] or seeded data |
| GET /api/finance/invoices?company_id=ARQIA | 500 - table missing | 200 - [] |
| GET /api/finance/contracts?company_id=ARQIA | 500 - table missing | 200 - [] |
| GET /api/finance/approvals?company_id=ARQIA | 500 - column missing | 200 - [] |
| GET /api/finance/snapshot?company_id=ARQIA | 500 - table missing | 200 - metrics object |

### Required POST Fields (Validation Active)

```
POST /api/finance/budgets
  Required: company_id, fiscal_year, category, allocated, created_by

POST /api/finance/invoices
  Required: company_id, vendor_name, invoice_number, amount, due_date, created_by

POST /api/finance/contracts
  Required: company_id, counterparty, contract_type, start_date, created_by

POST /api/finance/approvals
  Required: company_id, request_type, requestor_id, title, approver_id
```

---

## File Locations

```
/root/.openclaw/workspaces/atlas-agentic-framework/supabase/migrations/
├── 20260316_finance_base_schema.sql      (Step 1 - REQUIRED)
├── 20260316_finance_phase1_patch.sql     (Step 2 - RECOMMENDED)
└── 20260316_finance_verification.sql     (Step 3 - VALIDATION)
```

---

## Harvey Coordination Notes

**Legal Schema Elements:**
- `contracts.is_privileged` — Attorney-client privilege flag
- `contracts.privileged_reason` — Privilege documentation
- `contracts.termination_clause` — Contract termination terms
- `contracts.renewal_terms` — Auto-renewal provisions

**Finance Schema Elements:**
- `budgets.alert_threshold` — % at which alerts trigger
- `budgets.remaining` — Auto-calculated (allocated - spent)
- `invoices.total_amount` — Auto-calculated (amount + tax - discount)
- `approvals.category` — Expense categorization

**Compliance Ready:**
- All tables have `created_at`, `updated_at` audit trails
- `created_by` field for accountability
- RLS policies for row-level security
- Check constraints for data integrity

---

## Rollback Plan (If Needed)

```sql
-- Emergency rollback - drop all finance tables
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;
```

**⚠️ WARNING:** Rollback destroys all finance data. Use with caution.

---

## Next Steps After Schema Deployment

1. **Verify via API:**
   ```bash
   curl "https://atlas-agentic-framework.vercel.app/api/finance/snapshot?company_id=ARQIA"
   ```

2. **Test POST (validation only - no actual insert):**
   ```bash
   curl -X POST "https://atlas-agentic-framework.vercel.app/api/finance/budgets" \
     -H "Content-Type: application/json" \
     -d '{}'
   # Expected: 400 with field requirements
   ```

3. **Harvey Validation:**
   - Confirm UI loads without "NOT CONNECTED" state
   - Verify finance pages show seed data
   - Test approval workflow (pending → approved)

---

## Status: READY FOR DEPLOYMENT

**Prepared by:** Optimus (Productivity Lead)  
**Review by:** Harvey (Finance & Legal)  
**Deployment:** Canonical Production (atlas-agentic-framework)
