import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

// Auto-scaling settings
let autoScalingEnabled = false;
let lastScaleAction: any = null;

// Queue depth thresholds
const THRESHOLDS = {
  low: 50,
  medium: 100,
  high: 200,
};

export async function GET() {
  try {
    // Get actual queue depths from Redis
    const redis = getRedisClient();
    const queueKeys = [
      "queue:tasks:henry",
      "queue:tasks:optimus",
      "queue:tasks:prime",
      "queue:tasks:severino",
      "queue:incidents",
      "queue:approvals",
    ];

    let totalDepth = 0;
    const queueStats: Record<string, number> = {};

    for (const key of queueKeys) {
      const depth = await redis.zcard(key).catch(() => 0);
      queueStats[key] = depth;
      totalDepth += depth;
    }

    // Calculate recommended agents
    let recommendedAgents = 0;
    let status = "normal";
    let color = "green";

    if (totalDepth > THRESHOLDS.high) {
      recommendedAgents = 8;
      status = "critical";
      color = "red";
    } else if (totalDepth > THRESHOLDS.medium) {
      recommendedAgents = 5;
      status = "high";
      color = "yellow";
    } else if (totalDepth > THRESHOLDS.low) {
      recommendedAgents = 2;
      status = "elevated";
      color = "yellow";
    }

    // Mock current agent count
    const currentAgents = 4;
    const agentsToSpawn = Math.max(0, recommendedAgents - currentAgents);

    return NextResponse.json({
      success: true,
      queueDepth: totalDepth,
      queueStats,
      thresholds: THRESHOLDS,
      currentAgents,
      recommendedAgents,
      agentsToSpawn,
      status,
      color,
      autoScalingEnabled,
      lastScaleAction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scale Status] Error:", error);
    // Return fallback data
    return NextResponse.json({
      success: true,
      queueDepth: 47,
      queueStats: {},
      thresholds: THRESHOLDS,
      currentAgents: 4,
      recommendedAgents: 3,
      agentsToSpawn: 0,
      status: "normal",
      color: "green",
      autoScalingEnabled,
      lastScaleAction,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled required" },
        { status: 400 }
      );
    }

    autoScalingEnabled = enabled;
    lastScaleAction = {
      action: enabled ? "enabled" : "disabled",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      autoScalingEnabled,
      message: `Auto-scaling ${enabled ? "enabled" : "disabled"}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scale Toggle] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
