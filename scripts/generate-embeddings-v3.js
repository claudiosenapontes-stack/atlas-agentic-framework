const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';
const EMBEDDING_URL = 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateEmbeddings() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Generate Document Embeddings (v3)');
  console.log('='.repeat(60));
  
  // Fetch all documents
  const { data: docs, error: docsError } = await supabase
    .from('knowledge_registry')
    .select('id,title,summary');
  
  if (docsError) {
    console.error('Failed to fetch documents:', docsError);
    return;
  }
  
  console.log(`\n📁 Found ${docs.length} documents\n`);
  
  let generated = 0;
  let failed = 0;
  
  for (const doc of docs) {
    try {
      // Prepare text for embedding
      const text = `${doc.title} ${doc.summary || ''}`.trim();
      
      // Generate embedding
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
      
      // Store embedding - try array format
      const { error: insertError } = await supabase
        .from('knowledge_embeddings')
        .insert({
          doc_id: doc.id,
          embedding: embedData.embedding,
          model: embedData.model || 'all-MiniLM-L6-v2',
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        // Try upsert on conflict
        const { error: upsertError } = await supabase
          .from('knowledge_embeddings')
          .upsert({
            doc_id: doc.id,
            embedding: embedData.embedding,
            model: embedData.model || 'all-MiniLM-L6-v2',
            created_at: new Date().toISOString()
          });
        
        if (upsertError) {
          console.log(`   ❌ ${doc.title.substring(0, 40)}... - ${upsertError.message}`);
          failed++;
          continue;
        }
      }
      
      generated++;
      console.log(`   ✅ ${doc.title.substring(0, 45)}`);
      
      // Delay to avoid overwhelming
      await new Promise(r => setTimeout(r, 100));
      
    } catch (err) {
      console.log(`   ❌ ${doc.title?.substring(0, 40)}... - ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Generated: ${generated}, Failed: ${failed}`);
  
  // Final count
  const { count, error: countError } = await supabase
    .from('knowledge_embeddings')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`\n✅ Total embeddings in database: ${count}`);
  }
}

generateEmbeddings().catch(console.error);
