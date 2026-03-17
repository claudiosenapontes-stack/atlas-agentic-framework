/**
 * ATLAS-OPTIMUS-DECOMPOSE-WRITEPATH-FIX-9223
 * BUILD: 9223-CACHEBUST-$(date +%s)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MARKER = '9223-CACHEBUST-1742191200';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rid = randomUUID().slice(0,8);
  const start = Date.now();
  
  try {
    const body = await req.json();
    const tasks = body.tasks || [];
    
    if (!tasks.length) {
      return NextResponse.json({ success: false, error: 'tasks required', marker: MARKER, rid }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const missionId = params.id;
    const ts = new Date().toISOString();
    
    // Get mission
    const { data: mission } = await supabase.from('missions').select('id,phase,priority,company_id').eq('id', missionId).single();
    if (!mission) return NextResponse.json({ success: false, error: 'mission not found', marker: MARKER, rid }, { status: 404 });
    
    // Resolve agent IDs
    const payloads = [];
    for (const t of tasks) {
      const agentName = (t.assigned_agent_id || t.owner_agent || '').toLowerCase().trim();
      if (!agentName) return NextResponse.json({ success: false, error: 'agent required', marker: MARKER, rid }, { status: 400 });
      
      // Lookup agent UUID
      const { data: agent } = await supabase.from('agents').select('id').eq('name', agentName).maybeSingle();
      const ownerId = agent?.id || agentName;
      
      payloads.push({
        id: randomUUID(),
        title: t.title || 'Untitled',
        description: t.description || null,
        task_type: (t.task_type || 'implementation').toLowerCase(),
        status: 'pending',
        priority: (t.priority || mission.priority || 'medium').toLowerCase(),
        assigned_agent_id: agentName,
        owner_id: ownerId,
        mission_id: missionId,
        company_id: mission.company_id,
        metadata: { source: MARKER },
        created_at: ts,
        updated_at: ts
      });
    }
    
    // Insert
    const { data: created, error } = await supabase.from('tasks').insert(payloads).select('id,title,assigned_agent_id,owner_id,mission_id');
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      tasks: created || [],
      marker: MARKER,
      rid,
      duration: Date.now() - start
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, marker: MARKER, rid, duration: Date.now() - start }, { status: 500 });
  }
}
