import { NextRequest } from "next/server";
import { getRepo } from "@/lib/database";
import { subscribe } from "@/lib/realtime/hub";

// GET /api/stream/[slug] → Server-Sent Events stream of new leaves.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const repo = getRepo();
  await repo.ensureSchema();
  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) {
    return new Response("campaign not found", { status: 404 });
  }
  const campaignId = campaign.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Initial comment so the client knows the channel is open.
      send("ready", { campaignId });

      const unsubscribe = subscribe(campaignId, (leaf) => {
        send("leaf", {
          id: leaf.id,
          username: leaf.instagramUsername,
          displayUsername: leaf.displayUsername,
          leafStyle: leaf.leafStyle,
          anchorIndex: leaf.anchorIndex,
          rotation: leaf.rotation,
          scale: leaf.scale,
          createdAt: leaf.createdAt,
        });
      });

      // Heartbeat keeps proxies from closing the connection.
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* stream closed */
        }
      }, 25000);

      const close = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
