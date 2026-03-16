const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Direct REST API insertion using fetch
const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const procedures = [
  {
    file: '/root/.openclaw/workspaces/einstein/docs/FINANCE-PROCEDURES-001.md',
    docClass: 'FIN',
    title: 'Finance Procedures Manual',
    summary: 'Monthly close, expense tracking, and financial reporting procedures'
  },
  {
    file: '/root/.openclaw/workspaces/einstein/docs/EO-PROCEDURES-001.md',
    docClass: 'EXEC',
    title: 'Executive Operations Procedures',
    summary: 'Decision templates, briefing formats, and executive workflows'
  },
  {
    file: '/root/.openclaw/workspaces/einstein/docs/SALES-PLAYBOOK-001.md',
    docClass: 'PRODUCT',
    title: 'Sales Playbook',
    summary: 'Sales processes, objection handling, and deal management'
  },
  {
    file: '/root/.openclaw/workspaces/einstein/docs/INFRA-RUNBOOK-001.md',
    docClass: 'INFRA',
    title: 'Infrastructure Runbook',
    summary: 'Deployment procedures, troubleshooting, and operational playbooks'
  }
];

function generateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

async function ingestProcedure(proc) {
  if (!fs.existsSync(proc.file)) {
    throw new Error(`File not found: ${proc.file}`);
  }
  
  const content = fs.readFileSync(proc.file, 'utf8');
  const checksum = generateChecksum(content);
  
  const payload = {
    title: proc.title,
    doc_class: proc.docClass,
    source_system: 'local',
    summary: proc.summary,
    keywords: proc.docClass === 'FIN' ? ['finance', 'monthly-close', 'expenses', 'reporting'] :
              proc.docClass === 'EXEC' ? ['executive', 'decisions', 'briefings', 'procedures'] :
              proc.docClass === 'PRODUCT' ? ['sales', 'playbook', 'deals', 'objections'] :
              ['infrastructure', 'runbook', 'deployment', 'troubleshooting'],
    entities: {
      doc_type: 'procedure',
      original_file: path.basename(proc.file)
    },
    metadata: {
      checksum: checksum,
      size_bytes: Buffer.byteLength(content),
      classification_confidence: 0.95,
      extraction_confidence: 0.95,
      source_path: proc.file
    },
    realm: proc.docClass === 'FIN' ? 'operations' : 
           proc.docClass === 'EXEC' ? 'executive-ops' :
           proc.docClass === 'PRODUCT' ? 'sales' : 'atlas-control',
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
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('='.repeat(60));
  console.log('ATLAS KB - Procedure Documents Ingestion');
  console.log('='.repeat(60));
  
  let inserted = 0;
  let failed = 0;
  
  for (const proc of procedures) {
    try {
      const result = await ingestProcedure(proc);
      inserted++;
      console.log(`   ✅ ${proc.docClass.padEnd(6)} | ${proc.title}`);
    } catch (err) {
      failed++;
      console.log(`   ❌ ${proc.docClass.padEnd(6)} | ${proc.title}`);
      console.log(`      Error: ${err.message.substring(0, 60)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Inserted: ${inserted}, Failed: ${failed}`);
  
  // Get total count
  const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_registry?select=id`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (countResponse.ok) {
    const docs = await countResponse.json();
    console.log(`Total documents in KB: ${docs.length}`);
  }
}

main().catch(console.error);
