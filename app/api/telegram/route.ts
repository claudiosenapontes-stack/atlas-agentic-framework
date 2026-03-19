import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[Telegram] Incoming:", body);

    const telegramMessage = body?.message || body?.edited_message;

    if (!telegramMessage) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const messageText = telegramMessage?.text || "";
    if (!messageText) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const telegramUserId = telegramMessage?.from?.id?.toString() || null;
    const telegramChatId = telegramMessage?.chat?.id?.toString() || null;
    const telegramMessageId = telegramMessage?.message_id?.toString() || null;

    console.log("[Telegram] Extracted Identity:", {
      telegramUserId,
      telegramChatId,
      telegramMessageId,
      messageText,
    });

    const response = await fetch(
      "https://atlas-agentic-framework.vercel.app/api/commands/ingest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceChannel: "telegram",
          sourceUserId: telegramChatId ?? telegramUserId,
          sourceMessageId: telegramMessageId,
          companyId: "64c8d2e8-da05-4f77-8898-9b1726bf8fd9",
          commandText: messageText,
          metadata: {
            telegramUserId,
            telegramChatId,
            telegramMessageId,
            telegramUsername: telegramMessage?.from?.username ?? null,
            telegramFirstName: telegramMessage?.from?.first_name ?? null,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("[Telegram] Routed:", data);

    return NextResponse.json({ success: true, routed: data });
  } catch (error) {
    console.error("[Telegram] Error:", error);

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
