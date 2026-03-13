import { NextRequest, NextResponse } from "next/server";
import { acquireLock, LockKeys } from "@/lib/redis";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LOCK_TTL_SECONDS = 60;

/**
 * POST /api/tasks/delegate
 * Create a child task delegated from a parent task to another agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parentTaskId,
      delegateAgentId,
      title,
      description,
      priority = "medium",
      payload,
    } = body;

    // Validation
    if (!parentTaskId || typeof parentTaskId !== "string") {
      return NextResponse.json(
        { success: false, error: "parentTaskId is required" },
        { status: 400 }
      );
    }

    if (!delegateAgentId || typeof delegateAgentId !== "string") {
      return NextResponse.json(
        { success: false, error: "delegateAgentId is required" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Resolve originator agent (from headers or context)
    // For now, use a header or default - in production this comes from auth
    const originatorAgentId = request.headers.get("x-agent-id") || "system";

    // Step 2: Resolve agent identifiers to UUIDs
    const { data: delegateAgent, error: delegateAgentError } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("name", delegateAgentId)
      .single<{id: string}>();

    if (delegateAgentError || !delegateAgent) {
      return NextResponse.json(
        { success: false, error: `Delegate agent not found: ${delegateAgentId}` },
        { status: 400 }
      );
    }

    // Step 3: Resolve originator agent to UUID
    const { data: originatorAgent, error: originatorAgentError } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("name", originatorAgentId)
      .single<{id: string}>();

    const originatorUuid = originatorAgent?.id || null;

    // Step 4: Verify parent task exists
    const { data: parentTask, error: parentError } = await supabaseAdmin
      .from("tasks")
      .select("id, status, company_id")
      .eq("id", parentTaskId)
      .single<{id: string, status: string, company_id: string | null}>();

    if (parentError || !parentTask) {
      return NextResponse.json(
        { success: false, error: "Parent task not found" },
        { status: 404 }
      );
    }

    // Step 5: Check for circular delegation
    // Ensure parent is not itself a child of a chain containing this would-be child
    const { data: ancestorChain, error: ancestorError } = await supabaseAdmin
      .from("tasks")
      .select("id, parent_task_id")
      .eq("id", parentTaskId)
      .single();

    // Build ancestor chain to check for circular reference
    let currentId = parentTaskId;
    const visitedIds = new Set<string>();
    let depth = 0;
    const MAX_DEPTH = 10;

    while (currentId && depth < MAX_DEPTH) {
      if (visitedIds.has(currentId)) {
        return NextResponse.json(
          { success: false, error: "Circular delegation detected in parent chain" },
          { status: 400 }
        );
      }
      visitedIds.add(currentId);

      const { data: ancestor } = await supabaseAdmin
        .from("tasks")
        .select("parent_task_id")
        .eq("id", currentId)
        .single();

      currentId = (ancestor as any)?.parent_task_id || null;
      depth++;
    }

    // Step 6: Create delegated child task
    const delegatedTask = {
      title,
      description: description || null,
      priority,
      status: "inbox", // Pre-assigned but still needs to be claimed
      assigned_agent_id: delegateAgent.id, // Pre-assigned to delegate
      company_id: (parentTask as any).company_id,
      parent_task_id: parentTaskId,
      delegated_by: originatorUuid,
      delegated_at: new Date().toISOString(),
      task_type: payload?.task_type || "implementation",
      task_order: 9999,
    };

    const { data: childTask, error: createError } = await supabaseAdmin
      .from("tasks")
      .insert(delegatedTask as any)
      .select()
      .single();

    if (createError) {
      console.error("[Task Delegate] Error creating delegated task:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create delegated task", details: createError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      delegated: true,
      childTaskId: (childTask as any).id,
      parentTaskId,
      delegateAgentId,
      delegateAgentUuid: delegateAgent.id,
      originatorAgentId,
      originatorAgentUuid: originatorUuid,
      title,
      status: "inbox",
      delegatedAt: delegatedTask.delegated_at,
    });

  } catch (error) {
    console.error("[Task Delegate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
