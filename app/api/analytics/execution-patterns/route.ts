import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/analytics/execution-patterns
 * 
 * Phase 5 Workstream 1: Execution Pattern Learning
 * Analyzes execution_attempts and executions for failure/retry patterns
 * 
 * Query params:
 * - timeframe: 1h, 6h, 24h, 7d (default: 24h)
 * - groupBy: task_type, failure_class, agent (default: failure_class)
 */

interface FailurePattern {
  signature: string;
  count: number;
  taskIds: string[];
  retryDistribution: { attempt: number; count: number }[];
  avgRetryCount: number;
  recommendedPolicy: {
    maxAttempts: number;
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
    baseDelayMs: number;
    jitter: boolean;
  };
  confidence: number;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  
  const timeframe = searchParams.get("timeframe") || "24h";
  const groupBy = searchParams.get("groupBy") || "failure_class";
  
  // Calculate time window
  const hours = timeframe === "1h" ? 1 : timeframe === "6h" ? 6 : timeframe === "7d" ? 168 : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  try {
    // Fetch failed executions with retry info
    const { data: executions, error } = await (supabase as any)
      .from("executions")
      .select("id, task_id, agent_id, status, failure_class, failure_reason, error_message, attempt_number, retry_count, retry_policy_name, created_at, completed_at")
      .gte("created_at", since)
      .in("status", ["failed", "dead_letter", "completed"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[ExecutionPatterns] Query error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Fetch task details for type grouping
    const taskIdSet = new Set<string>();
    executions?.forEach((e: any) => {
      if (e.task_id) taskIdSet.add(e.task_id);
    });
    const taskIds = Array.from(taskIdSet);
    const { data: tasks } = await (supabase as any)
      .from("tasks")
      .select("id, type, name, priority")
      .in("id", taskIds.slice(0, 100));

    const taskMap: Map<string, any> = new Map((tasks || []).map((t: any) => [t.id, t]));

    // Analyze patterns
    const patterns = analyzePatterns(executions || [], taskMap, groupBy);

    // Generate adaptive recommendations
    const recommendations = generateRecommendations(patterns);

    // Calculate summary stats
    const summary = {
      totalExecutions: executions?.length || 0,
      failedCount: executions?.filter((e: any) => e.status === "failed").length || 0,
      deadLetterCount: executions?.filter((e: any) => e.status === "dead_letter").length || 0,
      successAfterRetry: executions?.filter((e: any) => e.status === "completed" && (e.retry_count || 0) > 0).length || 0,
      avgRetriesBeforeDeadLetter: calculateAvgRetries(executions?.filter((e: any) => e.status === "dead_letter") || []),
      mostCommonFailureClass: getMostCommon(executions?.filter((e: any) => e.failure_class).map((e: any) => e.failure_class) || []),
    };

    return NextResponse.json({
      success: true,
      timeframe,
      groupBy,
      summary,
      patterns,
      recommendations,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[ExecutionPatterns] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

function analyzePatterns(executions: any[], taskMap: Map<string, any>, groupBy: string): FailurePattern[] {
  const patterns: Map<string, any[]> = new Map();

  // Group executions by signature
  for (const exec of executions) {
    let key: string;
    
    if (groupBy === "failure_class") {
      key = exec.failure_class || "unknown";
    } else if (groupBy === "task_type") {
      const task = taskMap.get(exec.task_id);
      key = task?.type || "unknown";
    } else if (groupBy === "agent") {
      key = exec.agent_id || "unassigned";
    } else {
      // Create signature from error message pattern
      key = extractErrorSignature(exec.error_message);
    }

    if (!patterns.has(key)) {
      patterns.set(key, []);
    }
    patterns.get(key)!.push(exec);
  }

  // Build pattern objects
  const results: FailurePattern[] = [];
  
  patterns.forEach((execs, signature) => {
    if (execs.length < 2) return; // Skip singletons

    const retryDist = calculateRetryDistribution(execs);
    const avgRetry = execs.reduce((sum: number, e: any) => sum + (e.retry_count || 0), 0) / execs.length;
    
    // Determine recommended retry policy based on pattern
    const recommendedPolicy = inferOptimalPolicy(signature, execs, avgRetry);
    
    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(95, 50 + execs.length * 5 + (retryDist.length > 1 ? 10 : 0));

    const taskIdSet = new Set<string>();
    execs.forEach((e: any) => {
      if (e.task_id) taskIdSet.add(e.task_id);
    });

    results.push({
      signature,
      count: execs.length,
      taskIds: Array.from(taskIdSet),
      retryDistribution: retryDist,
      avgRetryCount: Math.round(avgRetry * 10) / 10,
      recommendedPolicy,
      confidence,
    });
  });

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

function extractErrorSignature(errorMessage: string | null): string {
  if (!errorMessage) return "unknown_error";
  
  // Normalize common error patterns
  const normalized = errorMessage
    .toLowerCase()
    .replace(/\d+/g, "N") // Replace numbers with N
    .replace(/['"`][^'"`]*['"`]/g, "STR") // Replace quoted strings
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "UUID") // UUIDs
    .replace(/\s+/g, "_")
    .slice(0, 50);
  
  return normalized;
}

function calculateRetryDistribution(executions: any[]): { attempt: number; count: number }[] {
  const dist = new Map<number, number>();
  
  for (const exec of executions) {
    const retryCount = exec.retry_count || 0;
    dist.set(retryCount, (dist.get(retryCount) || 0) + 1);
  }
  
  return Array.from(dist.entries())
    .map(([attempt, count]) => ({ attempt, count }))
    .sort((a, b) => a.attempt - b.attempt);
}

function inferOptimalPolicy(signature: string, executions: any[], avgRetry: number): FailurePattern["recommendedPolicy"] {
  // Analyze success rate after retries
  const successAfterRetry = executions.filter((e: any) => e.status === "completed" && (e.retry_count || 0) > 0).length;
  const failedAfterRetry = executions.filter((e: any) => e.status === "dead_letter").length;
  
  const successRate = successAfterRetry / (successAfterRetry + failedAfterRetry + 0.001);
  
  // Default policy
  const policy: FailurePattern["recommendedPolicy"] = {
    maxAttempts: 3,
    backoffStrategy: "exponential",
    baseDelayMs: 1000,
    jitter: true,
  };

  // Adjust based on pattern
  if (signature.includes("transient") || signature.includes("timeout")) {
    // Transient failures benefit from more retries with exponential backoff
    policy.maxAttempts = Math.min(5, Math.ceil(avgRetry * 1.5));
    policy.backoffStrategy = "exponential";
    policy.baseDelayMs = 2000;
  } else if (signature.includes("validation") || signature.includes("invalid")) {
    // Validation errors are immediate - don't retry
    policy.maxAttempts = 1;
    policy.backoffStrategy = "fixed";
    policy.baseDelayMs = 0;
  } else if (signature.includes("rate_limit") || signature.includes("throttle")) {
    // Rate limits need longer delays
    policy.maxAttempts = 3;
    policy.backoffStrategy = "exponential";
    policy.baseDelayMs = 5000;
  }

  // If success rate is high after retries, allow more attempts
  if (successRate > 0.7) {
    policy.maxAttempts = Math.min(7, policy.maxAttempts + 2);
  }

  return policy;
}

function generateRecommendations(patterns: FailurePattern[]): any[] {
  const recommendations = [];

  // Find patterns with high failure counts
  const highVolumePatterns = patterns.filter(p => p.count >= 5);
  
  for (const pattern of highVolumePatterns) {
    if (pattern.avgRetryCount > 3) {
      recommendations.push({
        type: "retry_policy_adjustment",
        priority: "high",
        pattern: pattern.signature,
        currentBehavior: `${pattern.count} executions, avg ${pattern.avgRetryCount} retries`,
        recommendation: `Increase max_attempts to ${pattern.recommendedPolicy.maxAttempts}, use ${pattern.recommendedPolicy.backoffStrategy} backoff`,
        expectedImpact: "Reduce dead_letter rate by ~30%",
        confidence: pattern.confidence,
      });
    }

    if (pattern.confidence > 80 && pattern.count > 10) {
      recommendations.push({
        type: "circuit_breaker_candidate",
        priority: "medium",
        pattern: pattern.signature,
        recommendation: "Consider circuit breaker for this failure signature",
        threshold: `After ${Math.ceil(pattern.count * 0.3)} failures in 5 minutes`,
        confidence: pattern.confidence,
      });
    }
  }

  // General recommendations
  if (patterns.length > 0) {
    const transientPattern = patterns.find(p => p.signature.includes("transient"));
    if (transientPattern && transientPattern.avgRetryCount > 2) {
      recommendations.push({
        type: "global_policy_update",
        priority: "high",
        recommendation: "Update default retry policy for transient failures",
        current: "3 attempts, 1s base delay",
        proposed: "5 attempts, 2s base delay, exponential backoff",
      });
    }
  }

  return recommendations.sort((a, b) => 
    (a.priority === "high" ? 2 : a.priority === "medium" ? 1 : 0) - 
    (b.priority === "high" ? 2 : b.priority === "medium" ? 1 : 0)
  );
}

function calculateAvgRetries(executions: any[]): number {
  if (executions.length === 0) return 0;
  const total = executions.reduce((sum, e) => sum + (e.retry_count || 0), 0);
  return Math.round((total / executions.length) * 10) / 10;
}

function getMostCommon(items: string[]): string {
  if (items.length === 0) return "none";
  
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
}
