import { NextRequest, NextResponse } from "next/server";

interface ABTestRequest {
  agentTypeA: string;
  agentTypeB: string;
  taskId: string;
}

interface Metrics {
  completionTime: number;
  success: boolean;
  errorCount: number;
  outputQuality: number;
}

const TASK_NAMES: Record<string, string> = {
  "task-1": "Generate React Component",
  "task-2": "Vector Search Query",
  "task-3": "Monitor Services",
  "task-4": "Process API Request",
};

function simulateMetrics(agentVersion: string): Metrics {
  const versionMatch = agentVersion.match(/-v(\d+)/);
  const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;

  const baseTime = 2.5 - version * 0.2;
  const completionTime = Math.max(0.6, parseFloat((baseTime + Math.random() * 0.4).toFixed(1)));
  const outputQuality = Math.min(98, Math.round(70 + version * 8 + Math.random() * 10));
  const successRate = Math.min(0.98, 0.85 + version * 0.04);
  const success = Math.random() < successRate;
  const errorCount = success ? (Math.random() < 0.1 ? 1 : 0) : Math.floor(Math.random() * 3) + 1;

  return {
    completionTime,
    success,
    errorCount,
    outputQuality,
  };
}

function pickWinner(metricsA: Metrics, metricsB: Metrics): "A" | "B" | "tie" {
  let scoreA = 0;
  let scoreB = 0;

  if (metricsA.completionTime < metricsB.completionTime) scoreA += 2;
  else if (metricsB.completionTime < metricsA.completionTime) scoreB += 2;

  if (metricsA.success && !metricsB.success) scoreA += 3;
  else if (metricsB.success && !metricsA.success) scoreB += 3;

  if (metricsA.errorCount < metricsB.errorCount) scoreA += 1;
  else if (metricsB.errorCount < metricsA.errorCount) scoreB += 1;

  if (metricsA.outputQuality > metricsB.outputQuality) scoreA += 2;
  else if (metricsB.outputQuality > metricsA.outputQuality) scoreB += 2;

  if (scoreA === scoreB) return "tie";
  return scoreA > scoreB ? "A" : "B";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ABTestRequest;
    const { agentTypeA, agentTypeB, taskId } = body;

    if (!agentTypeA || !agentTypeB || !taskId) {
      return NextResponse.json(
        { error: "agentTypeA, agentTypeB, and taskId are required" },
        { status: 400 }
      );
    }

    const metricsA = simulateMetrics(agentTypeA);
    const metricsB = simulateMetrics(agentTypeB);
    const winner = pickWinner(metricsA, metricsB);

    return NextResponse.json({
      taskName: TASK_NAMES[taskId] ?? taskId,
      metrics: {
        agentA: metricsA,
        agentB: metricsB,
      },
      winner,
    });
  } catch (error) {
    console.error("ab-test error", error);
    return NextResponse.json({ error: "A/B test failed" }, { status: 500 });
  }
}
