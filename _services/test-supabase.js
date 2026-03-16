console.log('Testing require...');
try {
  const { createClient } = require('@supabase/supabase-js');
  console.log('Supabase client loaded successfully');
} catch(e) {
  console.log('Require error:', e.message);
}
