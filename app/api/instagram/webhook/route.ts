import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/instagram/verifyWebhook";

// GET → Meta verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = {
    "hub.mode": searchParams.get("hub.mode") ?? undefined,
    "hub.challenge": searchParams.get("hub.challenge") ?? undefined,
    "hub.verify_token": searchParams.get("hub.verify_token") ?? undefined,
  };
  const result = verifyWebhook(query);
  if (!result.ok) {
    return new NextResponse(result.error ?? "forbidden", { status: 403 });
  }
  return new NextResponse(result.challenge, { status: 200 });
}

// POST → incoming comment events. We ACK fast and process asynchronously.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  // Fire-and-forget the actual processing so we return 200 immediately.
  void handleAsync(body);

  // Meta just needs a 200 quickly.
  return new NextResponse("ok", { status: 200 });
}

async function handleAsync(body: unknown) {
  try {
    const { parseCommentEvents } = await import("@/lib/instagram/parseCommentEvent");
    const { processComment } = await import("@/lib/leaves/processComment");
    const { getRepo } = await import("@/lib/database");
    const events = parseCommentEvents(body);
    const repo = getRepo();
    for (const ev of events) {
      try {
        await processComment({
          commentId: ev.commentId,
          userId: ev.userId,
          username: ev.username,
          text: ev.text,
          mediaId: ev.mediaId,
        });
      } catch (err) {
        await repo.markEventStatus(ev.commentId, "failed", String(err));
      }
    }
  } catch (err) {
    // Top-level failure — log but never crash the webhook responder.
    console.error("[webhook] processing failed", err);
  }
}
