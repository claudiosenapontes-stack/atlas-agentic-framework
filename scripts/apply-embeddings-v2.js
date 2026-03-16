const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyEmbeddings() {
  console.log('='.repeat(60));
  console.log('Applying Embeddings to Database (v2)');
  console.log('='.repeat(60));
  
  const sql = fs.readFileSync('scripts/generated-embeddings.sql', 'utf8');
  
  // Extract all VALUES clauses using regex
  const valueMatches = sql.matchAll(/VALUES \('([^']+)', '([^']+)'::vector\(384\)/g);
  const entries = [];
  
  for (const match of valueMatches) {
    const docId = match[1];
    const vectorStr = match[2];
    
    // Parse vector string to array
    const embedding = vectorStr
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(v => parseFloat(v.trim()));
    
    entries.push({ docId, embedding });
  }
  
  console.log(`Found ${entries.length} embeddings to insert\n`);
  
  let applied = 0;
  let failed = 0;
  
  for (const entry of entries) {
    try {
      const { error } = await supabase
        .from('knowledge_embeddings')
        .upsert({
          doc_id: entry.docId,
          embedding: entry.embedding,
          model: 'all-MiniLM-L6-v2',
          created_at: new Date().toISOString()
        }, { onConflict: 'doc_id' });
      
      if (error) {
        console.log(`   ❌ ${entry.docId.substring(0, 30)}... - ${error.message}`);
        failed++;
      } else {
        applied++;
        process.stdout.write('.');
        if (applied % 5 === 0) process.stdout.write(' ');
      }
    } catch (err) {
      console.log(`   ❌ ${entry.docId.substring(0, 30)}... - ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n\n✅ Applied: ${applied}, ❌ Failed: ${failed}`);
  
  // Verify
  const { data, error } = await supabase
    .from('knowledge_embeddings')
    .select('*');
  
  if (!error) {
    console.log(`\n✅ Total embeddings in database: ${data.length}`);
    if (data.length > 0) {
      console.log(`   Sample doc_id: ${data[0].doc_id}`);
      console.log(`   Embedding dimensions: ${data[0].embedding?.length || 'N/A'}`);
    }
  } else {
    console.log(`\n❌ Error checking count: ${error.message}`);
  }
}

applyEmbeddings();
