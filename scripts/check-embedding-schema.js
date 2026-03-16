const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log('Checking knowledge_embeddings table schema...\n');
  
  // Try to get one row to see the structure
  const { data, error } = await supabase
    .from('knowledge_embeddings')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('Error querying table:', error.message);
    
    // Try to get column info via a different approach
    console.log('\nTrying alternative approach...');
    
    // Try inserting with explicit column names that match migration
    const { error: insertError } = await supabase
      .from('knowledge_embeddings')
      .insert({
        doc_id: 'test-doc-id',
        embedding: Array(384).fill(0.1),
        model: 'test-model',
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.log('Insert error:', insertError.message);
      console.log('Code:', insertError.code);
    } else {
      console.log('Test insert succeeded!');
      // Clean up
      await supabase.from('knowledge_embeddings').delete().eq('doc_id', 'test-doc-id');
    }
  } else {
    console.log('Table exists, structure:', Object.keys(data[0] || {}));
  }
}

checkSchema();
