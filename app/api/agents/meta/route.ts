import { NextRequest, NextResponse } from "next/server";

// Agent skill trees
const skillTrees: Record<string, any> = {
  forge: {
    agentType: "forge",
    totalSkills: 12,
    unlockedSkills: 8,
    skills: [
      { id: "code_gen", name: "Code Generation", level: 5, maxLevel: 5, unlocked: true },
      { id: "refactoring", name: "Refactoring", level: 4, maxLevel: 5, unlocked: true },
      { id: "api_integration", name: "API Integration", level: 3, maxLevel: 5, unlocked: true },
      { id: "testing", name: "Testing", level: 2, maxLevel: 5, unlocked: true },
      { id: "architecture", name: "Architecture", level: 2, maxLevel: 5, unlocked: true },
      { id: "caching", name: "Caching Strategies", level: 1, maxLevel: 3, unlocked: true },
      { id: "optimization", name: "Performance Optimization", level: 1, maxLevel: 5, unlocked: true },
      { id: "security", name: "Security Best Practices", level: 0, maxLevel: 5, unlocked: true },
      { id: "ai_ml", name: "AI/ML Integration", level: 0, maxLevel: 5, unlocked: false },
      { id: "blockchain", name: "Blockchain Development", level: 0, maxLevel: 3, unlocked: false },
    ],
  },
  vector: {
    agentType: "vector",
    totalSkills: 10,
    unlockedSkills: 6,
    skills: [
      { id: "data_analysis", name: "Data Analysis", level: 5, maxLevel: 5, unlocked: true },
      { id: "visualization", name: "Visualization", level: 4, maxLevel: 5, unlocked: true },
      { id: "reporting", name: "Reporting", level: 3, maxLevel: 5, unlocked: true },
      { id: "ml_models", name: "ML Models", level: 2, maxLevel: 5, unlocked: true },
      { id: "statistics", name: "Statistics", level: 2, maxLevel: 5, unlocked: true },
      { id: "forecasting", name: "Forecasting", level: 1, maxLevel: 5, unlocked: true },
      { id: "nlp", name: "Natural Language Processing", level: 0, maxLevel: 5, unlocked: false },
      { id: "computer_vision", name: "Computer Vision", level: 0, maxLevel: 5, unlocked: false },
    ],
  },
  scout: {
    agentType: "scout",
    totalSkills: 8,
    unlockedSkills: 5,
    skills: [
      { id: "web_search", name: "Web Search", level: 5, maxLevel: 5, unlocked: true },
      { id: "data_gathering", name: "Data Gathering", level: 4, maxLevel: 5, unlocked: true },
      { id: "monitoring", name: "Monitoring", level: 3, maxLevel: 5, unlocked: true },
      { id: "reconnaissance", name: "Reconnaissance", level: 2, maxLevel: 5, unlocked: true },
      { id: "osint", name: "OSINT", level: 1, maxLevel: 5, unlocked: true },
      { id: "social_engineering", name: "Social Engineering Detection", level: 0, maxLevel: 3, unlocked: false },
    ],
  },
  guard: {
    agentType: "guard",
    totalSkills: 9,
    unlockedSkills: 6,
    skills: [
      { id: "security", name: "Security Auditing", level: 5, maxLevel: 5, unlocked: true },
      { id: "testing", name: "Penetration Testing", level: 3, maxLevel: 5, unlocked: true },
      { id: "validation", name: "Input Validation", level: 4, maxLevel: 5, unlocked: true },
      { id: "cryptography", name: "Cryptography", level: 2, maxLevel: 5, unlocked: true },
      { id: "threat_detection", name: "Threat Detection", level: 2, maxLevel: 5, unlocked: true },
      { id: "incident_response", name: "Incident Response", level: 1, maxLevel: 5, unlocked: true },
      { id: "forensics", name: "Digital Forensics", level: 0, maxLevel: 5, unlocked: false },
    ],
  },
  flux: {
    agentType: "flux",
    totalSkills: 11,
    unlockedSkills: 7,
    skills: [
      { id: "deployment", name: "Deployment", level: 5, maxLevel: 5, unlocked: true },
      { id: "infrastructure", name: "Infrastructure", level: 4, maxLevel: 5, unlocked: true },
      { id: "ci_cd", name: "CI/CD", level: 4, maxLevel: 5, unlocked: true },
      { id: "containers", name: "Containers", level: 3, maxLevel: 5, unlocked: true },
      { id: "orchestration", name: "Orchestration", level: 2, maxLevel: 5, unlocked: true },
      { id: "monitoring", name: "Monitoring", level: 2, maxLevel: 5, unlocked: true },
      { id: "cost_optimization", name: "Cost Optimization", level: 1, maxLevel: 5, unlocked: true },
      { id: "chaos_engineering", name: "Chaos Engineering", level: 0, maxLevel: 3, unlocked: false },
    ],
  },
};

// Agent self-reflections
const reflections = [
  {
    id: "ref-1",
    agentType: "forge",
    agentName: "forge-001",
    type: "performance",
    insight: "Discovered that caching API X responses reduces latency by 40%",
    confidence: 95,
    impact: "high",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "ref-2",
    agentType: "vector",
    agentName: "vector-002",
    type: "pattern",
    insight: "Identified that batch processing is 3x faster than individual requests for datasets >1000 rows",
    confidence: 88,
    impact: "high",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "ref-3",
    agentType: "scout",
    agentName: "scout-001",
    type: "improvement",
    insight: "Learned to prioritize sources by credibility score, improving accuracy by 25%",
    confidence: 92,
    impact: "medium",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "ref-4",
    agentType: "guard",
    agentName: "guard-001",
    type: "pattern",
    insight: "Detected common vulnerability pattern in API authentication - now checks proactively",
    confidence: 98,
    impact: "critical",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "ref-5",
    agentType: "flux",
    agentName: "flux-001",
    type: "performance",
    insight: "Parallel deployments reduce total time by 35% when services have no dependencies",
    confidence: 85,
    impact: "medium",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

// Collaboration network
const collaborationNetwork = {
  nodes: [
    { id: "forge", name: "Forge", type: "forge", connections: 12 },
    { id: "vector", name: "Vector", type: "vector", connections: 8 },
    { id: "scout", name: "Scout", type: "scout", connections: 6 },
    { id: "guard", name: "Guard", type: "guard", connections: 10 },
    { id: "flux", name: "Flux", type: "flux", connections: 9 },
  ],
  edges: [
    { source: "forge", target: "guard", weight: 5, type: "security_review" },
    { source: "forge", target: "flux", weight: 8, type: "deployment" },
    { source: "vector", target: "scout", weight: 4, type: "data_sharing" },
    { source: "scout", target: "forge", weight: 6, type: "requirements" },
    { source: "guard", target: "flux", weight: 7, type: "security_scan" },
    { source: "vector", target: "forge", weight: 3, type: "analytics" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "skills") {
      const agentType = searchParams.get("agentType");
      if (agentType && skillTrees[agentType]) {
        return NextResponse.json({
          success: true,
          skillTree: skillTrees[agentType],
        });
      }
      return NextResponse.json({
        success: true,
        skillTrees,
      });
    }

    if (type === "reflections") {
      const agentType = searchParams.get("agentType");
      let filtered = reflections;
      if (agentType) {
        filtered = reflections.filter((r) => r.agentType === agentType);
      }
      return NextResponse.json({
        success: true,
        reflections: filtered,
        total: reflections.length,
      });
    }

    if (type === "network") {
      return NextResponse.json({
        success: true,
        network: collaborationNetwork,
      });
    }

    // Return all meta data
    return NextResponse.json({
      success: true,
      skillTrees,
      reflections,
      network: collaborationNetwork,
    });
  } catch (error) {
    console.error("[Agent Meta] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, skillId } = body;

    // Stub for training/improving agents
    return NextResponse.json({
      success: true,
      message: `Training initiated for ${agentType} - ${skillId}`,
      estimatedTime: "5 minutes",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Agent Meta Train] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
