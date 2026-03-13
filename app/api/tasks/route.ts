import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Map cron schedule to human-readable format
function formatSchedule(schedule: any): string {
  if (!schedule) return "Unknown";
  
  if (schedule.kind === "cron") {
    const expr = schedule.expr;
    if (expr === "0 7 * * *") return "Daily at 7:00 AM";
    if (expr === "0 8 * * *") return "Daily at 8:00 AM";
    if (expr === "0 14 * * *") return "Daily at 2:00 PM";
    if (expr === "0 18 * * *") return "Daily at 6:00 PM";
    if (expr === "0 20 * * 0") return "Sunday at 8:00 PM";
    if (expr === "0 17 * * 5") return "Friday at 5:00 PM";
    return expr;
  }
  
  if (schedule.kind === "every") {
    const ms = schedule.everyMs;
    if (ms < 60000) return `Every ${ms / 1000}s`;
    if (ms < 3600000) return `Every ${Math.round(ms / 60000)}min`;
    return `Every ${Math.round(ms / 3600000)}h`;
  }
  
  return schedule.kind;
}

// Determine priority based on agent role
function getPriority(agentId: string): string {
  const highPriority = ["henry", "severino", "sophia"];
  if (highPriority.includes(agentId?.toLowerCase())) return "high";
  return "medium";
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeChildren = searchParams.get("includeChildren") === "true";
    const taskId = searchParams.get("taskId");

    const openclaw = getOpenClawClient();
    const tasks: any[] = [];

    // 1. Get real cron jobs from OpenClaw
    try {
      const cronJobs = await openclaw.getCronJobs();
      
      for (const job of cronJobs) {
        const agentId = job.agentId || "system";
        const isEnabled = job.enabled !== false;
        
        // Determine status based on job state
        let status = "planned";
        if (!isEnabled) status = "blocked";
        else if (job.state?.lastRunStatus === "ok") status = "completed";
        else if (job.state?.lastRunStatus === "error") status = "blocked";
        else if (job.state?.lastRunStatus === "running") status = "in_progress";
        
        tasks.push({
          id: job.id,
          title: job.name || "Unnamed Task",
          description: job.payload?.message?.substring(0, 200) || "",
          priority: getPriority(agentId),
          status: status,
          assigned_agent_id: agentId,
          assigned_agent: { name: agentId, display_name: agentId },
          schedule: formatSchedule(job.schedule),
          nextRun: job.state?.nextRunAtMs 
            ? new Date(job.state.nextRunAtMs).toISOString()
            : null,
          lastRun: job.state?.lastRunAtMs
            ? new Date(job.state.lastRunAtMs).toISOString()
            : null,
          source: "openclaw",
          created_at: new Date(job.createdAtMs).toISOString(),
        });
      }
    } catch (error) {
      console.log("[Tasks GET] OpenClaw not available, using database only");
    }

    // 2. Get tasks from Supabase database (use admin client to bypass RLS)
    let dbTasks: any[] = [];
    let childTasks: any[] = [];
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      // Build base query
      let query = supabaseAdmin
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by taskId if provided
      if (taskId) {
        query = query.eq("id", taskId);
      }
      
      const result = await query;
      
      if (result.error) {
        console.error("[Tasks API] Query error:", result.error.message);
      } else {
        dbTasks = result.data || [];
        console.log("[Tasks API] Retrieved", dbTasks.length, "tasks");

        // If includeChildren, fetch child tasks for all parent tasks
        if (includeChildren && dbTasks.length > 0) {
          const parentIds = dbTasks
            .filter((t: any) => !t.parent_task_id) // Only get children of root tasks
            .map((t: any) => t.id);
          
          if (parentIds.length > 0) {
            const { data: children, error: childrenError } = await supabaseAdmin
              .from("tasks")
              .select("*")
              .in("parent_task_id", parentIds)
              .order("created_at", { ascending: true });
            
            if (!childrenError && children) {
              childTasks = children;
              console.log("[Tasks API] Retrieved", childTasks.length, "child tasks");
            }
          }
        }
        
        // Add company/agent placeholders for compatibility
        const enrichTask = (task: any) => ({
          ...task,
          company: task.company_id ? { id: task.company_id, name: "Unknown" } : null,
          assigned_agent: task.assigned_agent_id ? { 
            id: task.assigned_agent_id, 
            name: task.assigned_agent_id,
            display_name: task.assigned_agent_id 
          } : null
        });

        dbTasks = dbTasks.map(enrichTask);
        childTasks = childTasks.map(enrichTask);
      }
    } catch (err: any) {
      console.error("[Tasks API] Exception:", err?.message || err);
    }

    if (dbTasks.length > 0) {
      for (const task of dbTasks) {
        // Only add if not already from OpenClaw
        const exists = tasks.find(t => t.id === task.id);
        if (!exists) {
          tasks.push({
            ...task,
            source: "database",
          });
        }
      }
    }

    // Sort by priority then by created_at
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => {
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const response: any = {
      success: true,
      tasks,
      count: tasks.length,
      timestamp: new Date().toISOString(),
    };

    // Include child tasks if requested
    if (includeChildren && childTasks.length > 0) {
      response.childTasks = childTasks;
      response.childCount = childTasks.length;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("[Tasks GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", tasks: [] },
      { status: 500 }
    );
  }
}
