import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[Telegram] Incoming:", body);

    // Extract message safely
    const message =
      body?.message?.text ||
      body?.edited_message?.text ||
      "";

    if (!message) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 🔥 THIS IS THE FIX FOR YOUR 401
    const response = await fetch(
      "https://atlas-agentic-framework.vercel.app/api/commands/ingest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceChannel: "telegram",

          // ✅ MUST BE REAL UUID FROM USERS TABLE
          sourceUserId: "cfcdb716-cdee-4c38-a3a6-80de2e6dac36",

          // keep your working company UUID (NOT "ARQIA")
          companyId: "64c8d2e8-da05-4f77-8898-9b1726bf8fd9",

          commandText: message,
        }),
      }
    );

    const data = await response.json();

    console.log("[Telegram] Routed:", data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Telegram] Error:", error);

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
