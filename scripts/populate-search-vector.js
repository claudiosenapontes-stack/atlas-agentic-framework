const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

async function populateSearchVectors() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Populate Search Vectors');
  console.log('='.repeat(60));
  
  // Fetch all documents
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id,title,summary,keywords`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (!response.ok) {
    console.error('Failed to fetch:', await response.text());
    return;
  }
  
  const docs = await response.json();
  console.log(`Found ${docs.length} documents\n`);
  
  let fixed = 0;
  
  for (const doc of docs) {
    try {
      // Build search vector from title + summary + keywords
      const keywordsText = Array.isArray(doc.keywords) ? doc.keywords.join(' ') : '';
      const searchText = `${doc.title || ''} ${doc.summary || ''} ${keywordsText}`.trim();
      
      // Create simple tsvector-like text (lowercase, words separated)
      const searchVector = searchText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?id=eq.${doc.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ search_vector: searchVector })
      });
      
      if (patchRes.ok) {
        fixed++;
        console.log(`✅ ${doc.title.substring(0, 45)}`);
      } else {
        console.log(`❌ ${doc.title.substring(0, 40)}... - ${await patchRes.text()}`);
      }
    } catch (err) {
      console.log(`❌ ${doc.title?.substring(0, 40)}... - ${err.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Populated search_vector for ${fixed}/${docs.length} documents`);
}

populateSearchVectors().catch(console.error);
