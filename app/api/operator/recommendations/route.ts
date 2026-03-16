import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface OperatorRecommendation {
  id: string;
  type: "retry_policy" | "circuit_breaker" | "resource_scaling" | "manual_review";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  pattern: {
    signature: string;
    occurrences: number;
    timeframe: string;
    affectedTasks: string[];
  };
  currentPolicy: {
    maxAttempts: number;
    backoffStrategy: string;
    baseDelayMs: number;
  };
  proposedPolicy: {
    maxAttempts: number;
    backoffStrategy: string;
    baseDelayMs: number;
    jitter: boolean;
  };
  expectedImpact: {
    reducedDeadLetterRate: string;
    estimatedSavings: string;
    confidence: number;
  };
  status: "pending_review" | "approved" | "applied" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  appliedAt?: string;
  appliedBy?: string;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  
  const status = searchParams.get("status") || "pending_review";
  const priority = searchParams.get("priority");
  const forceRefresh = searchParams.get("refresh") === "true";
  
  try {
    let query = (supabase as any)
      .from("operator_recommendations")
      .select("*")
      .is("deleted_at", null);
    
    if (status !== "all") {
      query = query.eq("status", status);
    }
    
    if (priority) {
      query = query.eq("priority", priority);
    }
    
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

    const freshRecs = await generateAndPersistRecommendations(supabase);

    return NextResponse.json({
      success: true,
      recommendations: freshRecs,
      source: "fresh",
      count: freshRecs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[OperatorRecommendations] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    const body = await req.json();
    const { recommendationId, action, reviewedBy, reason } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { success: false, error: "recommendationId and action required" },
        { status: 400 }
      );
    }

    const actor = reviewedBy || "system";

    const { data: rec, error: fetchError } = await (supabase as any)
      .from("operator_recommendations")
      .select("*")
      .eq("id", recommendationId)
      .single();

    if (fetchError || !rec) {
      return NextResponse.json(
        { success: false, error: "Recommendation not found" },
        { status: 404 }
      );
    }

    if (action === "apply") {
      const applyResult = await applyPolicyChange(supabase, rec, actor);

      if (applyResult.success) {
        const { error: updateError } = await (supabase as any)
          .from("operator_recommendations")
          .update({
            status: "applied",
            reviewed_at: new Date().toISOString(),
            reviewed_by: actor,
            applied_at: new Date().toISOString(),
            applied_by: actor,
          })
          .eq("id", recommendationId);

        if (updateError) {
          return NextResponse.json({
            success: false,
            error: "Failed to update recommendation: " + updateError.message,
          }, { status: 500 });
        }

        await logAuditEvent(supabase, {
          recommendationId,
          action: "applied",
          performedBy: actor,
          previousStatus: rec.status,
          newStatus: "applied",
          reason,
          metadata: { policyId: applyResult.policyId }
        });

        return NextResponse.json({
          success: true,
          message: "Recommendation applied successfully",
          recommendationId,
          policyId: applyResult.policyId,
          policy: applyResult.policy,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: applyResult.error,
        }, { status: 500 });
      }
    }

    if (action === "reject") {
      const { error: updateError } = await (supabase as any)
        .from("operator_recommendations")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: actor,
        })
        .eq("id", recommendationId);

      if (updateError) {
        return NextResponse.json({
          success: false,
          error: "Failed to update recommendation: " + updateError.message,
        }, { status: 500 });
      }

      await logAuditEvent(supabase, {
        recommendationId,
        action: "rejected",
        performedBy: actor,
        previousStatus: rec.status,
        newStatus: "rejected",
        reason,
      });

      return NextResponse.json({
        success: true,
        message: "Recommendation rejected",
        recommendationId,
      });
    }

    if (action === "approve") {
      const { error: updateError } = await (supabase as any)
        .from("operator_recommendations")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: actor,
        })
        .eq("id", recommendationId);

      if (updateError) {
        return NextResponse.json({
          success: false,
          error: "Failed to update recommendation: " + updateError.message,
        }, { status: 500 });
      }

      await logAuditEvent(supabase, {
        recommendationId,
        action: "approved",
        performedBy: actor,
        previousStatus: rec.status,
        newStatus: "approved",
        reason,
      });

      return NextResponse.json({
        success: true,
        message: "Recommendation approved (ready to apply)",
        recommendationId,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'apply', 'approve', or 'reject'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[OperatorRecommendations] POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function generateAndPersistRecommendations(supabase: any): Promise<OperatorRecommendation[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: executions } = await (supabase as any)
    .from("executions")
    .select("id, task_id, status, failure_class, error_message, retry_count, created_at")
    .gte("created_at", since)
    .in("status", ["failed", "dead_letter"])
    .limit(200);

  if (!executions || executions.length < 3) {
    return [];
  }

  const patterns: Map<string, any[]> = new Map();
  
  for (const exec of executions) {
    const signature = exec.failure_class || extractErrorSignature(exec.error_message);
    if (!patterns.has(signature)) patterns.set(signature, []);
    patterns.get(signature)!.push(exec);
  }

  const recommendations: OperatorRecommendation[] = [];
  
  patterns.forEach((execs, signature) => {
    if (execs.length < 2) return;

    const deadLetters = execs.filter((e: any) => e.status === "dead_letter");
    const avgRetries = execs.reduce((sum: number, e: any) => sum + (e.retry_count || 0), 0) / execs.length;
    const confidence = Math.min(90, 50 + execs.length * 5);
    
    if (avgRetries >= 1 && deadLetters.length >= 0) {
      const rec: OperatorRecommendation = {
        id: `rec-${Date.now()}-${signature.slice(0, 8)}`,
        type: "retry_policy",
        priority: deadLetters.length > 5 ? "critical" : "high",
        title: `High Retry Rate: ${signature}`,
        description: `${execs.length} failures with avg ${avgRetries.toFixed(1)} retries. ${deadLetters.length} reached dead letter queue.`,
        pattern: { signature, occurrences: execs.length, timeframe: "24h", affectedTasks: Array.from(new Set(execs.map((e: any) => e.task_id).filter(Boolean))) },
        currentPolicy: { maxAttempts: 3, backoffStrategy: "exponential", baseDelayMs: 1000 },
        proposedPolicy: { maxAttempts: Math.min(7, Math.ceil(avgRetries * 1.5)), backoffStrategy: "exponential", baseDelayMs: 2000, jitter: true },
        expectedImpact: { reducedDeadLetterRate: "~30%", estimatedSavings: `${(deadLetters.length * 0.05).toFixed(2)} USD/day`, confidence },
        status: "pending_review",
        createdAt: new Date().toISOString(),
      };
      recommendations.push(rec);
      persistRecommendation(supabase, rec);
    }
  });

  return recommendations.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
}

async function persistRecommendation(supabase: any, rec: OperatorRecommendation): Promise<void> {
  try {
    await (supabase as any).from("operator_recommendations").upsert({
      id: rec.id,
      type: rec.type,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      pattern_signature: rec.pattern.signature,
      pattern_occurrences: rec.pattern.occurrences,
      pattern_timeframe: rec.pattern.timeframe,
      pattern_affected_tasks: rec.pattern.affectedTasks,
      current_policy: rec.currentPolicy,
      proposed_policy: rec.proposedPolicy,
      expected_impact: rec.expectedImpact,
      status: rec.status,
      created_at: rec.createdAt,
      source: "execution_pattern_learning",
      confidence: rec.expectedImpact.confidence,
    }, { onConflict: "id", ignoreDuplicates: true });
  } catch (err) {
    console.error("[OperatorRecommendations] Persist error:", err);
  }
}

async function applyPolicyChange(supabase: any, rec: any, actor: string): Promise<{ success: boolean; policy?: any; policyId?: string; error?: string }> {
  try {
    const { data: policy, error } = await (supabase as any)
      .from("retry_policies")
      .insert({
        name: `adaptive-${rec.pattern_signature.slice(0, 30)}`,
        pattern_signature: rec.pattern_signature,
        max_attempts: rec.proposed_policy.maxAttempts,
        backoff_strategy: rec.proposed_policy.backoffStrategy,
        base_delay_ms: rec.proposed_policy.baseDelayMs,
        jitter: rec.proposed_policy.jitter,
        is_active: true,
        source: "execution_pattern_learning",
        recommendation_id: rec.id,
        created_by: actor,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, policyId: policy.id, policy: rec.proposed_policy };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function logAuditEvent(supabase: any, event: any): Promise<void> {
  try {
    await (supabase as any).from("recommendation_audit_log").insert({
      recommendation_id: event.recommendationId,
      action: event.action,
      performed_by: event.performedBy,
      performed_by_type: "user",
      previous_status: event.previousStatus,
      new_status: event.newStatus,
      change_reason: event.reason || null,
      metadata: event.metadata || {},
    });
  } catch (err) {
    console.error("[OperatorRecommendations] Audit log error:", err);
  }
}

function dbToApi(db: any): OperatorRecommendation {
  return {
    id: db.id,
    type: db.type,
    priority: db.priority,
    title: db.title,
    description: db.description,
    pattern: { signature: db.pattern_signature, occurrences: db.pattern_occurrences, timeframe: db.pattern_timeframe, affectedTasks: db.pattern_affected_tasks || [] },
    currentPolicy: db.current_policy,
    proposedPolicy: db.proposed_policy,
    expectedImpact: db.expected_impact,
    status: db.status,
    createdAt: db.created_at,
    reviewedAt: db.reviewed_at,
    reviewedBy: db.reviewed_by,
    appliedAt: db.applied_at,
    appliedBy: db.applied_by,
  };
}

function extractErrorSignature(errorMessage: string | null): string {
  if (!errorMessage) return "unknown";
  return errorMessage.toLowerCase().replace(/\d+/g, "N").replace(/['"`][^'"`]*['"`]/g, "STR").slice(0, 40);
}
