const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

async function fixSearchVectors() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Search Vector Repair');
  console.log('='.repeat(60));
  
  // Fetch all documents
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id,title,summary,keywords`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (!response.ok) {
    console.error('Failed to fetch documents:', await response.text());
    return;
  }
  
  const docs = await response.json();
  console.log(`\n📁 Found ${docs.length} documents`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const doc of docs) {
    // Build search text
    const keywordsText = Array.isArray(doc.keywords) ? doc.keywords.join(' ') : '';
    const searchText = `${doc.title || ''} ${doc.summary || ''} ${keywordsText}`.trim();
    
    // Simple to_tsvector equivalent (just the text for now)
    const searchVector = searchText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    try {
      const patchResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?id=eq.${doc.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ search_vector: searchVector })
      });
      
      if (patchResponse.ok) {
        fixed++;
        process.stdout.write('.');
      } else {
        failed++;
        process.stdout.write('x');
      }
    } catch (err) {
      failed++;
      process.stdout.write('!');
    }
  }
  
  console.log(`\n\n✅ Fixed: ${fixed}, ❌ Failed: ${failed}`);
}

fixSearchVectors().catch(console.error);
