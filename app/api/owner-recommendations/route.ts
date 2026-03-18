import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// ATLAS-PHASE5-SCOPED-1268: Owner-Useful Recommendation Categories
type RecommendationCategory = 
  | "retry_optimization"
  | "routing_optimization"
  | "escalation_optimization"
  | "task_assignment_optimization";

interface OwnerRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  context: {
    affectedWorkflows: string[];
    affectedTasks: string[];
    affectedLeads?: string[];
    timeframe: string;
    occurrenceCount: number;
  };
  currentState: {
    avgRetries: number;
    failureRate: string;
    routingAccuracy?: number;
    taskLoadVariance?: number;
  };
  proposedChange: {
    action: string;
    params: Record<string, any>;
    expectedImprovement: string;
  };
  ownerImpact: {
    timeSaved: string;
    leadsRecovered: number;
    tasksPrevented: number;
    confidence: number;
  };
  status: "pending_review" | "approved" | "applied" | "rejected";
  relevantPages: ("/events" | "/tasks" | "/hot-leads")[];
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  
  const category = searchParams.get("category") as RecommendationCategory | null;
  const priority = searchParams.get("priority");
  const page = searchParams.get("page") as "/events" | "/tasks" | "/hot-leads" | null;
  const forceRefresh = searchParams.get("refresh") === "true";
  
  try {
    let query = (supabase as any)
      .from("owner_recommendations")
      .select("*")
      .is("deleted_at", null);
    
    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (page) query = query.contains("relevant_pages", [page]);
    
    const { data: cachedRecs, error: cacheError } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (!forceRefresh && !cacheError && cachedRecs?.length > 0) {
      return NextResponse.json({
        success: true,
        recommendations: cachedRecs.map(dbToApi),
        source: "cache",
        count: cachedRecs.length,
        timestamp: new Date().toISOString(),
      });
    }

    const freshRecs = await generateOwnerRecommendations(supabase);

    return NextResponse.json({
      success: true,
      recommendations: freshRecs,
      source: "fresh",
      count: freshRecs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[OwnerRecommendations] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function generateOwnerRecommendations(supabase: any): Promise<OwnerRecommendation[]> {
  const recs: OwnerRecommendation[] = [];
  
  const retryRecs = await detectRetryOptimizations(supabase);
  recs.push(...retryRecs);
  
  const routingRecs = await detectRoutingOptimizations(supabase);
  recs.push(...routingRecs);
  
  const escalationRecs = await detectEscalationOptimizations(supabase);
  recs.push(...escalationRecs);
  
  const assignmentRecs = await detectAssignmentOptimizations(supabase);
  recs.push(...assignmentRecs);
  
  for (const rec of recs) await persistOwnerRecommendation(supabase, rec);
  
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    return p !== 0 ? p : b.ownerImpact.confidence - a.ownerImpact.confidence;
  });
}

async function detectRetryOptimizations(supabase: any): Promise<OwnerRecommendation[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: executions } = await (supabase as any)
    .from("executions")
    .select("id, task_id, status, failure_class, error_message, retry_count, created_at")
    .gte("created_at", since)
    .in("status", ["failed", "dead_letter"])
    .limit(200);

  if (!executions || executions.length < 2) return [];
  
  const patterns: Map<string, any[]> = new Map();
  for (const exec of executions) {
    const signature = exec.failure_class || extractSignature(exec.error_message);
    if (!patterns.has(signature)) patterns.set(signature, []);
    patterns.get(signature)!.push(exec);
  }
  
  const recs: OwnerRecommendation[] = [];
  
  patterns.forEach((execs, signature) => {
    if (execs.length < 2) return;
    const deadLetters = execs.filter((e: any) => e.status === "dead_letter");
    const avgRetries = execs.reduce((sum: number, e: any) => sum + (e.retry_count || 0), 0) / execs.length;
    
    if (avgRetries >= 2 || deadLetters.length > 0) {
      recs.push({
        id: `rec-retry-${Date.now()}-${signature.slice(0, 8)}`,
        category: "retry_optimization",
        priority: deadLetters.length > 2 ? "high" : "medium",
        title: `Fix High Retry Rate: ${signature}`,
        description: `${execs.length} executions failing with avg ${avgRetries.toFixed(1)} retries. ${deadLetters.length} reached dead letter.`,
        context: { affectedWorkflows: [], affectedTasks: execs.map((e: any) => e.task_id).filter(Boolean).slice(0, 10), timeframe: "24h", occurrenceCount: execs.length },
        currentState: { avgRetries: Math.round(avgRetries * 10) / 10, failureRate: "N/A" },
        proposedChange: { action: "increase_retry_attempts", params: { maxAttempts: Math.min(7, Math.ceil(avgRetries * 1.5)) }, expectedImprovement: `Recover ${deadLetters.length} stuck tasks` },
        ownerImpact: { timeSaved: `${Math.round(execs.length * 5)} min/day`, leadsRecovered: 0, tasksPrevented: deadLetters.length, confidence: Math.min(90, 50 + execs.length * 5) },
        status: "pending_review",
        relevantPages: ["/tasks", "/events"],
        createdAt: new Date().toISOString(),
      });
    }
  });
  
  return recs;
}

async function detectRoutingOptimizations(supabase: any): Promise<OwnerRecommendation[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: events } = await (supabase as any)
    .from("events")
    .select("id, routed_to_agent_id, routing_reason, created_at")
    .gte("created_at", since)
    .limit(500);
  
  if (!events || events.length < 10) return [];
  
  const unassigned = events.filter((e: any) => !e.routed_to_agent_id || e.routing_reason === "general_task_default");
  if (unassigned.length < 5) return [];
  
  const routingAccuracy = ((events.length - unassigned.length) / events.length) * 100;
  
  return [{
    id: `rec-route-${Date.now()}`,
    category: "routing_optimization",
    priority: routingAccuracy < 70 ? "high" : "medium",
    title: "Improve Event-to-Agent Routing",
    description: `${unassigned.length} events (${(100 - routingAccuracy).toFixed(0)}%) received default routing.`,
    context: { affectedWorkflows: [], affectedTasks: [], timeframe: "24h", occurrenceCount: unassigned.length },
    currentState: { avgRetries: 0, failureRate: "0%", routingAccuracy: Math.round(routingAccuracy) },
    proposedChange: { action: "update_routing_rules", params: { enableIntentClassification: true }, expectedImprovement: "Improve routing accuracy to 85%+" },
    ownerImpact: { timeSaved: `${Math.round(unassigned.length * 2)} min/day`, leadsRecovered: 0, tasksPrevented: Math.floor(unassigned.length * 0.3), confidence: 75 },
    status: "pending_review",
    relevantPages: ["/events", "/tasks"],
    createdAt: new Date().toISOString(),
  }];
}

async function detectEscalationOptimizations(supabase: any): Promise<OwnerRecommendation[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: events } = await (supabase as any)
    .from("events")
    .select("id, event_type, created_at")
    .eq("event_type", "lead.scored.hot")
    .gte("created_at", since)
    .limit(100);
  
  if (!events || events.length < 3) return [];
  
  return [{
    id: `rec-escalation-${Date.now()}`,
    category: "escalation_optimization",
    priority: "high",
    title: "Optimize Hot Lead Response Time",
    description: `${events.length} hot leads detected in 24h. Ensure <2min response SLA.`,
    context: { affectedWorkflows: ["hot-lead-capture"], affectedTasks: [], affectedLeads: events.map((e: any) => e.id).slice(0, 10), timeframe: "24h", occurrenceCount: events.length },
    currentState: { avgRetries: 0, failureRate: "0%" },
    proposedChange: { action: "enable_immediate_notification", params: { channels: ["telegram", "in_app"] }, expectedImprovement: "Reduce lead response time to <2min" },
    ownerImpact: { timeSaved: "N/A", leadsRecovered: Math.floor(events.length * 0.2), tasksPrevented: 0, confidence: 85 },
    status: "pending_review",
    relevantPages: ["/hot-leads", "/events"],
    createdAt: new Date().toISOString(),
  }];
}

async function detectAssignmentOptimizations(supabase: any): Promise<OwnerRecommendation[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: tasks } = await (supabase as any)
    .from("tasks")
    .select("id, assigned_agent_id, status, created_at")
    .gte("created_at", since)
    .not("assigned_agent_id", "is", null)
    .limit(500);
  
  if (!tasks || tasks.length < 10) return [];
  
  const agentTaskCounts: Map<string, number> = new Map();
  tasks.forEach((t: any) => {
    const id = t.assigned_agent_id;
    agentTaskCounts.set(id, (agentTaskCounts.get(id) || 0) + 1);
  });
  
  const counts = Array.from(agentTaskCounts.values());
  if (counts.length < 2) return [];
  
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = Math.max(...counts);
  const variance = max - avg;
  
  if (variance / avg < 0.5) return [];
  
  const overloadedAgents = Array.from(agentTaskCounts.entries())
    .filter(([_, count]) => count > avg * 1.5)
    .map(([id, _]) => id);
  
  return [{
    id: `rec-assign-${Date.now()}`,
    category: "task_assignment_optimization",
    priority: variance / avg > 1.0 ? "high" : "medium",
    title: "Rebalance Task Workload",
    description: `${overloadedAgents.length} agents have 2x+ average workload. Redistribute for efficiency.`,
    context: { affectedWorkflows: [], affectedTasks: tasks.filter((t: any) => overloadedAgents.includes(t.assigned_agent_id)).map((t: any) => t.id).slice(0, 10), timeframe: "7d", occurrenceCount: tasks.length },
    currentState: { avgRetries: 0, failureRate: "0%", taskLoadVariance: Math.round((variance / avg) * 100) },
    proposedChange: { action: "enable_load_balancing", params: { maxQueueSize: Math.ceil(avg * 1.3) }, expectedImprovement: "Balance task load across agents" },
    ownerImpact: { timeSaved: `${Math.round(overloadedAgents.length * 15)} min/day`, leadsRecovered: 0, tasksPrevented: Math.floor(tasks.length * 0.1), confidence: 80 },
    status: "pending_review",
    relevantPages: ["/tasks"],
    createdAt: new Date().toISOString(),
  }];
}

async function persistOwnerRecommendation(supabase: any, rec: OwnerRecommendation): Promise<void> {
  try {
    await (supabase as any).from("owner_recommendations").upsert({
      id: rec.id,
      category: rec.category,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      context: rec.context,
      current_state: rec.currentState,
      proposed_change: rec.proposedChange,
      owner_impact: rec.ownerImpact,
      relevant_pages: rec.relevantPages,
      status: rec.status,
      created_at: rec.createdAt,
    }, { onConflict: "id", ignoreDuplicates: true });
  } catch (err) {
    console.error("[OwnerRecommendations] Persist error:", err);
  }
}

function dbToApi(db: any): OwnerRecommendation {
  return {
    id: db.id,
    category: db.category,
    priority: db.priority,
    title: db.title,
    description: db.description,
    context: db.context,
    currentState: db.current_state,
    proposedChange: db.proposed_change,
    ownerImpact: db.owner_impact,
    status: db.status,
    relevantPages: db.relevant_pages,
    createdAt: db.created_at,
  };
}

function extractSignature(errorMessage: string | null): string {
  if (!errorMessage) return "unknown";
  return errorMessage.toLowerCase().replace(/\d+/g, "N").slice(0, 30);
}
