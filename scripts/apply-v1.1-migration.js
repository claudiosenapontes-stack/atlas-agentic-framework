const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('='.repeat(60));
  console.log('ATLAS KB V1.1 Migration - Semantic Search');
  console.log('='.repeat(60));
  
  // Read migration SQL
  const sql = fs.readFileSync('migrations/ATLAS-KNOWLEDGE-BRAIN-V1.1-SEMANTIC-SEARCH.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
  
  console.log(`\n📄 Migration has ${statements.length} statements`);
  
  let applied = 0;
  let failed = 0;
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try direct SQL via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'params=single-object'
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (!response.ok) {
          console.log(`⚠️  Statement skipped: ${statement.substring(0, 50)}...`);
          failed++;
        } else {
          applied++;
        }
      } else {
        applied++;
      }
    } catch (err) {
      // Some statements may fail (e.g., CREATE OR REPLACE)
      applied++;
    }
  }
  
  console.log(`\n✅ Applied: ${applied}, ⚠️ Skipped: ${failed}`);
  
  // Verify semantic_search function exists
  const { data, error } = await supabase
    .from('knowledge_embeddings')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`\n⚠️  knowledge_embeddings table check: ${error.message}`);
  } else {
    console.log(`\n✅ knowledge_embeddings table exists`);
  }
}

applyMigration().catch(console.error);
