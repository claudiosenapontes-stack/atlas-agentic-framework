const fs = require('fs');

const EMBEDDING_URL = 'http://localhost:3001';
const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

async function generateEmbeddingsSQL() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Generate Embeddings SQL');
  console.log('='.repeat(60));
  
  // Fetch documents
  const docsResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id,title,summary`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (!docsResponse.ok) {
    console.error('Failed to fetch documents:', await docsResponse.text());
    return;
  }
  
  const docs = await docsResponse.json();
  console.log(`\n📁 Found ${docs.length} documents\n`);
  
  const sqlLines = [
    '-- ATLAS KB Embeddings Generated',
    '-- Date: ' + new Date().toISOString(),
    '',
    'BEGIN;',
    ''
  ];
  
  let generated = 0;
  let failed = 0;
  
  for (const doc of docs) {
    try {
      const text = `${doc.title} ${doc.summary || ''}`.trim();
      
      const embedResponse = await fetch(`${EMBEDDING_URL}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 2000) })
      });
      
      if (!embedResponse.ok) {
        console.log(`   ❌ ${doc.title.substring(0, 40)}... - embedding failed`);
        failed++;
        continue;
      }
      
      const embedData = await embedResponse.json();
      const vectorStr = '[' + embedData.embedding.map(v => v.toFixed(6)).join(',') + ']';
      
      sqlLines.push(`INSERT INTO knowledge_embeddings (doc_id, embedding, model, created_at)`);
      sqlLines.push(`VALUES ('${doc.id}', '${vectorStr}'::vector(384), 'all-MiniLM-L6-v2', NOW())`);
      sqlLines.push(`ON CONFLICT (doc_id) DO UPDATE SET`);
      sqlLines.push(`  embedding = EXCLUDED.embedding,`);
      sqlLines.push(`  model = EXCLUDED.model,`);
      sqlLines.push(`  created_at = EXCLUDED.created_at;`);
      sqlLines.push('');
      
      generated++;
      console.log(`   ✅ ${doc.title.substring(0, 45)}`);
      
      await new Promise(r => setTimeout(r, 100));
      
    } catch (err) {
      console.log(`   ❌ ${doc.title?.substring(0, 40)}... - ${err.message}`);
      failed++;
    }
  }
  
  sqlLines.push('COMMIT;');
  
  const sqlFile = sqlLines.join('\n');
  fs.writeFileSync('scripts/generated-embeddings.sql', sqlFile);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Generated: ${generated}, Failed: ${failed}`);
  console.log(`SQL written to: scripts/generated-embeddings.sql`);
}

generateEmbeddingsSQL().catch(console.error);
