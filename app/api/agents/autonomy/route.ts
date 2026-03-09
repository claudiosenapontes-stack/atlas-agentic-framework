import { NextRequest, NextResponse } from "next/server";

// Autonomy settings
let autonomyLevel = 75; // 0-100
let humanOverrideActive = false;

// Decision log
const decisionLog = [
  {
    id: "dec-1",
    agentType: "forge",
    agentName: "forge-001",
    decision: "Retry failed API call",
    context: "API X returned 500 error",
    action: "Retry with exponential backoff (3 attempts)",
    confidence: 85,
    autonomyUsed: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    outcome: "success",
  },
  {
    id: "dec-2",
    agentType: "vector",
    agentName: "vector-002",
    decision: "Switch to batch processing",
    context: "Dataset size: 5000 rows",
    action: "Process in chunks of 1000 rows",
    confidence: 92,
    autonomyUsed: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    outcome: "success",
  },
  {
    id: "dec-3",
    agentType: "guard",
    agentName: "guard-001",
    decision: "Block suspicious request",
    context: "Multiple failed auth attempts from IP",
    action: "Rate limit IP and alert security team",
    confidence: 98,
    autonomyUsed: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    outcome: "pending_review",
  },
  {
    id: "dec-4",
    agentType: "flux",
    agentName: "flux-001",
    decision: "Rollback deployment",
    context: "Error rate >5% after deployment",
    action: "Automatic rollback to previous version",
    confidence: 88,
    autonomyUsed: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    outcome: "success",
  },
  {
    id: "dec-5",
    agentType: "scout",
    agentName: "scout-001",
    decision: "Request human verification",
    context: "Ambiguous data source credibility",
    action: "Flagged for human review",
    confidence: 45,
    autonomyUsed: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    outcome: "pending_human",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");

    let decisions = decisionLog;
    if (agentType) {
      decisions = decisions.filter((d) => d.agentType === agentType);
    }

    // Calculate stats
    const stats = {
      total: decisionLog.length,
      autonomous: decisionLog.filter((d) => d.autonomyUsed).length,
      humanRequired: decisionLog.filter((d) => !d.autonomyUsed).length,
      success: decisionLog.filter((d) => d.outcome === "success").length,
      avgConfidence: Math.round(
        decisionLog.reduce((sum, d) => sum + d.confidence, 0) / decisionLog.length
      ),
    };

    return NextResponse.json({
      success: true,
      decisions,
      stats,
      autonomyLevel,
      humanOverrideActive,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Autonomy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "setLevel") {
      const { level } = body;
      if (typeof level !== "number" || level < 0 || level > 100) {
        return NextResponse.json(
          { success: false, error: "Level must be 0-100" },
          { status: 400 }
        );
      }
      autonomyLevel = level;
      return NextResponse.json({
        success: true,
        autonomyLevel,
        message: `Autonomy level set to ${level}%`,
      });
    }

    if (action === "override") {
      const { decisionId, approved } = body;
      humanOverrideActive = true;
      
      // Update decision
      const decision = decisionLog.find((d) => d.id === decisionId);
      if (decision) {
        decision.outcome = approved ? "approved" : "rejected";
        decision.autonomyUsed = false;
      }

      return NextResponse.json({
        success: true,
        decisionId,
        approved,
        message: approved ? "Decision approved" : "Decision rejected",
      });
    }

    if (action === "clearOverride") {
      humanOverrideActive = false;
      return NextResponse.json({
        success: true,
        humanOverrideActive: false,
        message: "Human override cleared",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Autonomy Post] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
