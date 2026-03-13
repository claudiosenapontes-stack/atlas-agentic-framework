import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/test/debug-events
// Debug endpoint to diagnose event logging issues

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 1: Check if we can get Supabase admin client
    const supabase = getSupabaseAdmin();
    results.steps.push({ step: 1, name: 'getSupabaseAdmin', status: 'success' });

    // Step 2: Try to query events table
    const { data: queryData, error: queryError } = await (supabase as any)
      .from('events')
      .select('id')
      .limit(1);

    if (queryError) {
      results.steps.push({
        step: 2,
        name: 'query events table',
        status: 'error',
        error: queryError.message,
        code: queryError.code,
      });
    } else {
      results.steps.push({
        step: 2,
        name: 'query events table',
        status: 'success',
        rowCount: queryData?.length ?? 0,
      });
    }

    // Step 3: Try to insert a test event
    const testEvent = {
      company_id: '29712e4c-a88a-4269-8adb-2802a79087a6',
      event_type: 'test.debug',
      actor_type: 'system',
      actor_id: 'debug',
      target_type: 'test',
      target_id: `test-${Date.now()}`,
      payload: { test: true, timestamp: new Date().toISOString() },
    };

    const { data: insertData, error: insertError } = await (supabase as any)
      .from('events')
      .insert(testEvent)
      .select();

    if (insertError) {
      results.steps.push({
        step: 3,
        name: 'insert test event',
        status: 'error',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
    } else {
      results.steps.push({
        step: 3,
        name: 'insert test event',
        status: 'success',
        insertedId: insertData?.[0]?.id,
      });
    }

    // Step 4: Check events table schema
    const { data: schemaData, error: schemaError } = await (supabase as any)
      .rpc('get_table_info', { table_name: 'events' });

    if (schemaError) {
      results.steps.push({
        step: 4,
        name: 'get table schema',
        status: 'skipped',
        reason: 'RPC not available',
      });
    } else {
      results.steps.push({
        step: 4,
        name: 'get table schema',
        status: 'success',
        schema: schemaData,
      });
    }

    // Step 5: Check RLS policies
    const { data: rlsData, error: rlsError } = await (supabase as any)
      .rpc('get_policies', { table_name: 'events' });

    if (rlsError) {
      results.steps.push({
        step: 5,
        name: 'get RLS policies',
        status: 'skipped',
        reason: 'RPC not available',
      });
    } else {
      results.steps.push({
        step: 5,
        name: 'get RLS policies',
        status: 'success',
        policies: rlsData,
      });
    }

    results.success = true;
    results.summary = {
      canQuery: !queryError,
      canInsert: !insertError,
      totalSteps: results.steps.length,
      errors: results.steps.filter((s: any) => s.status === 'error').length,
    };

  } catch (error) {
    results.success = false;
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results);
}
