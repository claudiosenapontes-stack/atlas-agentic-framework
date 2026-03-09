import { NextRequest, NextResponse } from "next/server";

// Mock self-healing events
const healingEvents = [
  {
    id: "heal-1",
    agentName: "forge-123",
    agentType: "forge",
    event: "restart",
    reason: "Memory limit exceeded",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    autoHealed: true,
    restartCount: 1,
  },
  {
    id: "heal-2",
    agentName: "vector-456",
    agentType: "vector",
    event: "restart",
    reason: "Connection timeout",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    autoHealed: true,
    restartCount: 2,
  },
  {
    id: "heal-3",
    agentName: "forge-123",
    agentType: "forge",
    event: "restart",
    reason: "Unhandled exception",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    autoHealed: true,
    restartCount: 3,
  },
  {
    id: "heal-4",
    agentName: "scout-789",
    agentType: "scout",
    event: "alert",
    reason: "High CPU usage detected",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    autoHealed: false,
    restartCount: 0,
  },
];

// Auto-heal settings per agent type
const autoHealSettings: Record<string, boolean> = {
  forge: true,
  vector: true,
  scout: true,
  guard: true,
  flux: true,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");
    
    let events = healingEvents;
    if (agentType) {
      events = events.filter((e) => e.agentType === agentType);
    }

    // Calculate restart stats per agent
    const agentStats: Record<string, any> = {};
    const oneHourAgo = Date.now() - 1000 * 60 * 60;
    
    for (const event of healingEvents) {
      if (!agentStats[event.agentName]) {
        agentStats[event.agentName] = {
          name: event.agentName,
          type: event.agentType,
          restarts: 0,
          lastCrash: null,
          autoHealed: 0,
          alerts: 0,
        };
      }
      
      const eventTime = new Date(event.timestamp).getTime();
      if (eventTime > oneHourAgo && event.event === "restart") {
        agentStats[event.agentName].restarts++;
      }
      
      if (event.event === "restart") {
        agentStats[event.agentName].lastCrash = event.timestamp;
        if (event.autoHealed) {
          agentStats[event.agentName].autoHealed++;
        }
      } else if (event.event === "alert") {
        agentStats[event.agentName].alerts++;
      }
    }

    // Identify critical agents (>3 restarts in 1h)
    const criticalAgents = Object.values(agentStats).filter(
      (a: any) => a.restarts > 3
    );

    return NextResponse.json({
      success: true,
      events: events.slice(0, 50),
      agentStats: Object.values(agentStats),
      criticalAgents,
      autoHealSettings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Self-Heal] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, enabled } = body;

    if (!agentType || typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "agentType and enabled required" },
        { status: 400 }
      );
    }

    // Update setting (stub)
    autoHealSettings[agentType] = enabled;

    return NextResponse.json({
      success: true,
      agentType,
      enabled,
      message: `Auto-heal ${enabled ? "enabled" : "disabled"} for ${agentType}`,
    });
  } catch (error) {
    console.error("[Self-Heal Toggle] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
