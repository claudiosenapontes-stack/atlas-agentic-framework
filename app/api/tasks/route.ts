import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, company_id, priority, status, assigned_agent_id } = body;

    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { success: false, error: "Title must be less than 200 characters" },
        { status: 400 }
      );
    }

    const validPriorities = ["low", "medium", "high", "urgent"];
    const validStatuses = ["inbox", "in_progress", "review", "completed", "archived"];

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, error: `Priority must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Build insert object
    const insertData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || "medium",
      status: status || "inbox",
      company_id: company_id || null,
      assigned_agent_id: assigned_agent_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert task
    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert(insertData)
      .select(`
        *,
        company:companies(id, name),
        assigned_agent:agents!tasks_assigned_agent_id_fkey(id, name, display_name)
      `)
      .single();

    if (insertError) {
      console.error("[Task Create] Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to create task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
      createdAt: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error("[Task Create] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
