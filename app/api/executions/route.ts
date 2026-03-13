import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from '@supabase/supabase-js';

// Admin client for operations requiring elevated privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET /api/executions
 * Query executions by taskId, agentId, or status
 * Canonical execution read endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("executions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (taskId) {
      query = query.eq("task_id", taskId);
    }
    if (agentId) {
      query = query.eq("agent_id", agentId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Executions API] GET error:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to fetch executions",
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      executions: data || [],
      count: data?.length || 0,
      total: count || 0,
      query: {
        taskId,
        agentId,
        status,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Executions API] GET exception:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/executions
 * Create a new execution record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task_id,
      agent_id,
      status = "pending",
      started_at,
      output_preview,
      error_message,
    } = body;

    // Validation
    if (!task_id) {
      return NextResponse.json(
        { success: false, error: "task_id is required" },
        { status: 400 }
      );
    }

    if (!agent_id) {
      return NextResponse.json(
        { success: false, error: "agent_id is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "running", "completed", "failed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Insert execution record
    const insertData: any = {
      task_id,
      agent_id,
      status,
      started_at: started_at || new Date().toISOString(),
    };

    // Optional fields
    if (output_preview !== undefined) insertData.output_preview = output_preview;
    if (error_message !== undefined) insertData.error_message = error_message;

    const { data, error } = await supabaseAdmin
      .from("executions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[Executions API] POST error:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create execution",
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: data,
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error("[Executions API] POST exception:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
