const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';
const EMBEDDING_URL = 'http://localhost:3001';

async function generateEmbeddings() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Generate Document Embeddings (v2)');
  console.log('='.repeat(60));
  
  // Fetch all documents
  const docsResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id,title,summary`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (!docsResponse.ok) {
    console.error('Failed to fetch documents:', await docsResponse.text());
    return;
  }
  
  const docs = await docsResponse.json();
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
      
      // Convert embedding array to pgvector string format [x,y,z,...]
      const vectorString = '[' + embedData.embedding.join(',') + ']';
      
      // Store embedding using RPC
      const storeResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_embedding`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_doc_id: doc.id,
          p_embedding: vectorString,
          p_model: embedData.model || 'all-MiniLM-L6-v2'
        })
      });
      
      if (storeResponse.ok) {
        generated++;
        console.log(`   ✅ ${doc.title.substring(0, 45)}`);
      } else {
        const error = await storeResponse.text();
        console.log(`   ❌ ${doc.title.substring(0, 40)}... - ${error.substring(0, 60)}`);
        failed++;
      }
      
      // Delay to avoid overwhelming the service
      await new Promise(r => setTimeout(r, 150));
      
    } catch (err) {
      console.log(`   ❌ ${doc.title?.substring(0, 40)}... - ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Generated: ${generated}, Failed: ${failed}`);
  
  // Final count
  const finalResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_embeddings?select=id`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (finalResponse.ok) {
    const final = await finalResponse.json();
    console.log(`\n✅ Total embeddings in database: ${final.length}`);
  }
}

generateEmbeddings().catch(console.error);
