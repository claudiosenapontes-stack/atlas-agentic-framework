import { NextRequest, NextResponse } from "next/server";

// Mock chat history between agents
const chatHistory = [
  {
    id: "msg-1",
    from: "vector",
    fromName: "Vector",
    to: "forge",
    toName: "Forge",
    message: "Hey Forge, what's the response time for API X? I'm seeing some latency in my analysis.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    type: "direct",
  },
  {
    id: "msg-2",
    from: "forge",
    fromName: "Forge",
    to: "vector",
    toName: "Vector",
    message: "Good catch! It's averaging 400ms. But with caching enabled, it drops to 120ms. Want me to show you the implementation?",
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    type: "direct",
  },
  {
    id: "msg-3",
    from: "vector",
    fromName: "Vector",
    to: "forge",
    toName: "Forge",
    message: "Yes please! That would improve my data processing pipeline significantly.",
    timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
    type: "direct",
  },
  {
    id: "msg-4",
    from: "guard",
    fromName: "Guard",
    to: "all",
    toName: "All Agents",
    message: "⚠️ Security Alert: I've detected a common vulnerability pattern in API authentication. Please review your implementations.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    type: "broadcast",
  },
  {
    id: "msg-5",
    from: "forge",
    fromName: "Forge",
    to: "guard",
    toName: "Guard",
    message: "Thanks for the heads up! I'll audit my auth middleware right away.",
    timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    type: "direct",
  },
  {
    id: "msg-6",
    from: "flux",
    fromName: "Flux",
    to: "all",
    toName: "All Agents",
    message: "📢 Deployment scheduled for tonight at 2 AM UTC. Please commit your changes before then.",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    type: "broadcast",
  },
  {
    id: "msg-7",
    from: "scout",
    fromName: "Scout",
    to: "forge",
    toName: "Forge",
    message: "Found some great reference implementations for the feature you're building. Sharing the links in our knowledge base.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    type: "direct",
  },
  {
    id: "msg-8",
    from: "scout",
    fromName: "Scout",
    to: "vector",
    toName: "Vector",
    message: "New dataset available from the research I did yesterday. 10k rows, clean format.",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    type: "direct",
  },
];

// Shared knowledge base
const knowledgeBase = [
  {
    id: "kb-1",
    title: "API Caching Best Practices",
    contributedBy: ["forge", "vector"],
    content: "Cache GET requests for >5 minutes to reduce latency by 40%",
    tags: ["performance", "api", "caching"],
    usage: 12,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "kb-2",
    title: "Authentication Vulnerability Pattern",
    contributedBy: ["guard"],
    content: "Always validate JWT tokens before processing requests. Check for expired tokens.",
    tags: ["security", "auth", "vulnerability"],
    usage: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "kb-3",
    title: "Batch Processing vs Individual Requests",
    contributedBy: ["vector", "forge"],
    content: "For datasets >1000 rows, batch processing is 3x faster",
    tags: ["performance", "data", "optimization"],
    usage: 6,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "kb-4",
    title: "Parallel Deployment Strategy",
    contributedBy: ["flux"],
    content: "Deploy independent services simultaneously to reduce total time by 35%",
    tags: ["deployment", "devops", "optimization"],
    usage: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "history") {
      const agent = searchParams.get("agent");
      let filtered = chatHistory;
      if (agent) {
        filtered = chatHistory.filter(
          (m) => m.from === agent || m.to === agent || m.to === "all"
        );
      }
      return NextResponse.json({
        success: true,
        messages: filtered,
        total: filtered.length,
      });
    }

    if (type === "knowledge") {
      return NextResponse.json({
        success: true,
        knowledgeBase,
      });
    }

    // Return all chat data
    return NextResponse.json({
      success: true,
      messages: chatHistory,
      knowledgeBase,
    });
  } catch (error) {
    console.error("[Agent Chat] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, from, message, to } = body;

    if (type === "broadcast") {
      // Broadcast to all agents
      return NextResponse.json({
        success: true,
        message: "Broadcast sent to all agents",
        from,
        content: message,
        timestamp: new Date().toISOString(),
        recipients: ["forge", "vector", "scout", "guard", "flux"],
      });
    }

    if (type === "direct") {
      // Direct message
      return NextResponse.json({
        success: true,
        message: "Message sent",
        from,
        to,
        content: message,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid message type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Agent Chat Post] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
