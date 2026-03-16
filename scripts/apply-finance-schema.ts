/**
 * ATLAS-HARVEY-FINANCE-V1-SCHEMA-APPLY
 * Applies schema patches using Supabase Admin client
 */

import { getSupabaseAdmin } from '../lib/supabase-admin.js';

const patches = [
  {
    name: 'Add budgets.name column',
    sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name VARCHAR(255)`
  },
  {
    name: 'Populate budgets.name from category',
    sql: `UPDATE budgets SET name = category WHERE name IS NULL`
  },
  {
    name: 'Make budgets.name NOT NULL',
    sql: `ALTER TABLE budgets ALTER COLUMN name SET NOT NULL`
  },
  {
    name: 'Add budgets.status column',
    sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`
  },
  {
    name: 'Drop budgets status constraint if exists',
    sql: `ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_status_check`
  },
  {
    name: 'Add budgets status constraint',
    sql: `ALTER TABLE budgets ADD CONSTRAINT budgets_status_check CHECK (status IN ('active', 'frozen', 'exceeded'))`
  },
  {
    name: 'Drop invoices status constraint',
    sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`
  },
  {
    name: 'Add invoices status constraint',
    sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('pending', 'paid', 'overdue', 'disputed'))`
  },
  {
    name: 'Add contracts.title column',
    sql: `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title VARCHAR(255)`
  },
  {
    name: 'Populate contracts.title',
    sql: `UPDATE contracts SET title = counterparty || ' - ' || contract_type WHERE title IS NULL`
  },
  {
    name: 'Make contracts.title NOT NULL',
    sql: `ALTER TABLE contracts ALTER COLUMN title SET NOT NULL`
  },
  {
    name: 'Drop contracts status constraint',
    sql: `ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check`
  },
  {
    name: 'Add contracts status constraint',
    sql: `ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN ('draft', 'negotiating', 'active', 'expired', 'terminated'))`
  },
  {
    name: 'Create idx_budgets_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status)`
  },
  {
    name: 'Create idx_invoices_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`
  },
  {
    name: 'Create idx_contracts_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`
  },
  {
    name: 'Create idx_approvals_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`
  }
];

async function applyPatches() {
  console.log('🔄 ATLAS-HARVEY-FINANCE-V1-SCHEMA-APPLY');
  console.log('=====================================\n');
  
  const supabase = getSupabaseAdmin();
  const results = [];
  
  for (const patch of patches) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: patch.sql });
      
      if (error) {
        // Try alternative: direct query
        const { error: queryError } = await supabase.from('_temp_schema_apply').select('*').limit(0);
        console.log(`  ⚠️  ${patch.name}: ${error.message}`);
        results.push({ name: patch.name, status: 'skipped', error: error.message });
      } else {
        console.log(`  ✅ ${patch.name}`);
        results.push({ name: patch.name, status: 'applied' });
      }
    } catch (err: any) {
      console.log(`  ❌ ${patch.name}: ${err.message}`);
      results.push({ name: patch.name, status: 'error', error: err.message });
    }
  }
  
  console.log('\n=====================================');
  console.log('Schema patch application complete.');
  
  const applied = results.filter(r => r.status === 'applied').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`Applied: ${applied} | Skipped: ${skipped} | Errors: ${errors}`);
  
  return results;
}

applyPatches().catch(console.error);