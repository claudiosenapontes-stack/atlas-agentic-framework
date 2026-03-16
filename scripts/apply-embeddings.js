const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyEmbeddings() {
  console.log('='.repeat(60));
  console.log('Applying Embeddings to Database');
  console.log('='.repeat(60));
  
  const sql = fs.readFileSync('scripts/generated-embeddings.sql', 'utf8');
  
  // Parse individual INSERT statements
  const statements = sql
    .split('\n')
    .filter(line => line.trim().startsWith('INSERT'))
    .map(line => line.trim());
  
  console.log(`Found ${statements.length} INSERT statements\n`);
  
  let applied = 0;
  let failed = 0;
  
  for (const stmt of statements) {
    try {
      // Extract values from INSERT statement
      const match = stmt.match(/VALUES \('([^']+)', '([^']+)'/);
      if (!match) {
        console.log('   ⚠️ Could not parse statement');
        continue;
      }
      
      const docId = match[1];
      const vectorStr = match[2];
      
      // Convert vector string to array
      const embedding = vectorStr
        .replace('[', '')
        .replace(']', '')
        .split(',')
        .map(v => parseFloat(v.trim()));
      
      // Insert via Supabase
      const { error } = await supabase
        .from('knowledge_embeddings')
        .upsert({
          doc_id: docId,
          embedding: embedding,
          model: 'all-MiniLM-L6-v2',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.log(`   ❌ ${docId.substring(0, 20)}... - ${error.message}`);
        failed++;
      } else {
        applied++;
        process.stdout.write('.');
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n\n✅ Applied: ${applied}, ❌ Failed: ${failed}`);
  
  // Verify
  const { data, error } = await supabase
    .from('knowledge_embeddings')
    .select('*', { count: 'exact' });
  
  if (!error) {
    console.log(`\n✅ Total embeddings in database: ${data.length}`);
  }
}

applyEmbeddings();
