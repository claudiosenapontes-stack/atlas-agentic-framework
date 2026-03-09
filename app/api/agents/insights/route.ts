import { NextRequest, NextResponse } from "next/server";

// Mock learned insights
const insights = [
  {
    id: "insight-1",
    agentType: "forge",
    agentName: "forge-001",
    category: "performance",
    title: "API Response Optimization",
    description: "API X responds 40% faster with cache enabled for GET requests",
    confidence: 95,
    occurrences: 12,
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    shared: true,
    sharedWith: ["forge", "vector"],
  },
  {
    id: "insight-2",
    agentType: "vector",
    agentName: "vector-002",
    category: "pattern",
    title: "Data Processing Pattern",
    description: "Chunking large datasets (>10MB) improves processing speed by 60%",
    confidence: 88,
    occurrences: 8,
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    shared: true,
    sharedWith: ["vector", "scout"],
  },
  {
    id: "insight-3",
    agentType: "scout",
    agentName: "scout-001",
    category: "error_prevention",
    title: "Rate Limit Detection",
    description: "Adding 500ms delay between requests prevents 429 errors on API Y",
    confidence: 92,
    occurrences: 15,
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    shared: false,
    sharedWith: [],
  },
  {
    id: "insight-4",
    agentType: "guard",
    agentName: "guard-001",
    category: "error_prevention",
    title: "Input Validation Rule",
    description: "Validating email format before DB insert reduces errors by 75%",
    confidence: 98,
    occurrences: 24,
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    shared: true,
    sharedWith: ["forge", "guard", "flux"],
  },
  {
    id: "insight-5",
    agentType: "flux",
    agentName: "flux-001",
    category: "performance",
    title: "Deployment Parallelization",
    description: "Deploying 3 services simultaneously reduces total time by 35%",
    confidence: 85,
    occurrences: 6,
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    lastSeen: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    shared: false,
    sharedWith: [],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");
    const category = searchParams.get("category");
    const sharedOnly = searchParams.get("sharedOnly") === "true";

    let filteredInsights = insights;

    if (agentType) {
      filteredInsights = filteredInsights.filter((i) => i.agentType === agentType);
    }

    if (category) {
      filteredInsights = filteredInsights.filter((i) => i.category === category);
    }

    if (sharedOnly) {
      filteredInsights = filteredInsights.filter((i) => i.shared);
    }

    // Calculate stats
    const stats = {
      total: insights.length,
      shared: insights.filter((i) => i.shared).length,
      byCategory: {
        performance: insights.filter((i) => i.category === "performance").length,
        pattern: insights.filter((i) => i.category === "pattern").length,
        error_prevention: insights.filter((i) => i.category === "error_prevention").length,
      },
      avgConfidence: Math.round(
        insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
      ),
    };

    return NextResponse.json({
      success: true,
      insights: filteredInsights,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Insights] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, shared } = body;

    if (!insightId || typeof shared !== "boolean") {
      return NextResponse.json(
        { success: false, error: "insightId and shared required" },
        { status: 400 }
      );
    }

    const insight = insights.find((i) => i.id === insightId);
    if (!insight) {
      return NextResponse.json(
        { success: false, error: "Insight not found" },
        { status: 404 }
      );
    }

    // Update sharing status (stub)
    insight.shared = shared;
    if (shared) {
      insight.sharedWith = ["forge", "vector", "scout", "guard", "flux"];
    } else {
      insight.sharedWith = [];
    }

    return NextResponse.json({
      success: true,
      insight,
      message: `Insight ${shared ? "shared" : "unshared"}`,
    });
  } catch (error) {
    console.error("[Insights Share] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
