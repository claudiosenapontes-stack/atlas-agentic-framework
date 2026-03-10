import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";
import { supabase } from "@/lib/supabase";

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

export async function GET() {
  try {
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

    // 2. Get tasks from Supabase database
    const { data: dbTasks, error: dbError } = await supabase
      .from("tasks")
      .select(`
        *,
        company:companies(id, name),
        assigned_agent:agents!tasks_assigned_agent_id_fkey(id, name, display_name)
      `)
      .order("created_at", { ascending: false });

    if (!dbError && dbTasks) {
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

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Tasks GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", tasks: [] },
      { status: 500 }
    );
  }
}
