const fs = require('fs');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

async function applyEmbeddings() {
  console.log('='.repeat(60));
  console.log('Applying Embeddings via Direct REST API');
  console.log('='.repeat(60));
  
  const sql = fs.readFileSync('scripts/generated-embeddings.sql', 'utf8');
  
  // Extract all VALUES clauses
  const valueMatches = sql.matchAll(/VALUES \('([^']+)', '([^']+)'::vector\(384\)/g);
  const entries = [];
  
  for (const match of valueMatches) {
    const docId = match[1];
    const vectorStr = match[2];
    entries.push({ docId, vectorStr });
  }
  
  console.log(`Found ${entries.length} embeddings to insert\n`);
  
  let applied = 0;
  let failed = 0;
  
  for (const entry of entries) {
    try {
      // Use direct REST API withPrefer: resolution=merge-duplicates
      const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_embeddings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          doc_id: entry.docId,
          embedding: entry.vectorStr,  // Send as string, pgvector will parse
          model: 'all-MiniLM-L6-v2',
          created_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        applied++;
        process.stdout.write('.');
        if (applied % 5 === 0) process.stdout.write(' ');
      } else {
        const error = await response.text();
        console.log(`\n   ❌ ${entry.docId.substring(0, 30)}... - ${response.status}: ${error.substring(0, 60)}`);
        failed++;
      }
    } catch (err) {
      console.log(`\n   ❌ ${entry.docId.substring(0, 30)}... - ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n\n✅ Applied: ${applied}, ❌ Failed: ${failed}`);
  
  // Verify
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_embeddings?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`\n✅ Total embeddings in database: ${data.length}`);
    }
  } catch (e) {
    console.log(`\n❌ Verification failed: ${e.message}`);
  }
}

applyEmbeddings();
