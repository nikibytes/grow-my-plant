import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[slug]/leaves → visible leaves (polling fallback + SSE payload).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const repo = getRepo();
  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) {
    return NextResponse.json({ error: "campaign-not-found" }, { status: 404 });
  }

  const leaves = await repo.listVisibleLeaves(campaign.id);
  return NextResponse.json({
    leaves: leaves.map((l) => ({
      id: l.id,
      username: l.instagramUsername,
      displayUsername: l.displayUsername,
      leafStyle: l.leafStyle,
      anchorIndex: l.anchorIndex,
      rotation: l.rotation,
      scale: l.scale,
      createdAt: l.createdAt,
      commentText: l.commentText,
    })),
  });
}
