const fs = require('fs');
const path = require('path');

// Direct REST API insertion using fetch
const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

async function insertDocument(doc) {
  // Map to the actual schema in the database
  const payload = {
    title: doc.title,
    doc_class: doc.doc_class,
    source_system: doc.source.startsWith('local') ? 'local' : doc.source,
    summary: doc.summary,
    keywords: doc.keywords || [],
    entities: doc.entities || {},
    metadata: {
      checksum: doc.checksum,
      size_bytes: doc.size_bytes,
      classification_confidence: doc.classification_confidence,
      extraction_confidence: doc.extraction_confidence,
      original_doc_id: doc.doc_id,
      source_path: doc.source_path
    },
    realm: 'executive-ops',
    owner_agent_id: 'einstein',
    visibility: 'internal',
    status: 'active'
  };
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return true;
}

async function insertDocuments() {
  console.log('='.repeat(60));
  console.log('ATLAS Knowledge Brain - DB Insertion Pipeline');
  console.log('='.repeat(60));
  
  // Load ingestion report
  const reportPath = path.join(__dirname, '../docs/KNOWLEDGE_BRAIN_INGESTION_REPORT.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Ingestion report not found:', reportPath);
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  console.log(`\n📁 Loaded ${report.documents.length} documents from report`);
  
  let inserted = 0;
  let failed = 0;
  
  for (const doc of report.documents) {
    try {
      await insertDocument(doc);
      inserted++;
      console.log(`   ✅ Inserted: ${doc.doc_class.padEnd(10)} | ${doc.title.substring(0, 45)}`);
    } catch (err) {
      console.log(`   ❌ Failed: ${doc.doc_class.padEnd(10)} | ${doc.title.substring(0, 40)}`);
      console.log(`      Error: ${err.message.substring(0, 80)}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('INSERTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Documents Processed: ${report.documents.length}`);
  console.log(`   Successfully Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
  
  // Verify count
  const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id&limit=1000`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  if (countResponse.ok) {
    const docs = await countResponse.json();
    console.log(`\n✅ Total documents in knowledge_registry: ${docs.length}`);
  } else {
    console.log(`\n⚠️  Could not verify count: ${await countResponse.text()}`);
  }
}

insertDocuments().catch(console.error);
