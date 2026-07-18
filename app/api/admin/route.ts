import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { isAuthorized, UNAUTHORIZED } from "@/lib/admin/auth";
import { calculatePlantStage } from "@/lib/plant/stages";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin?slug=...  → dashboard data (auth required)
 * POST /api/admin          → actions: block, unblock, setTrigger, setMedia,
 *                            activate, deactivate, addTestLeaf, resetDemo
 */

export async function GET(req: NextRequest) {
  if (!isAuthorized(req.headers, req.nextUrl.searchParams)) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug-required" }, { status: 400 });

  const repo = getRepo();
  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) return NextResponse.json({ error: "campaign-not-found" }, { status: 404 });

  const leaves = await repo.listVisibleLeaves(campaign.id);
  const blocked = await repo.listBlockedUsers(campaign.id);
  const events = await repo.listEvents(50);

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      instagramMediaId: campaign.instagramMediaId,
      instagramPermalink: campaign.instagramPermalink,
      triggerTerms: campaign.triggerTerms,
      oneLeafPerUser: campaign.oneLeafPerUser,
      moderationMode: campaign.moderationMode,
      removeLeafOnCommentDelete: campaign.removeLeafOnCommentDelete,
      currentStage: campaign.currentStage,
      isActive: campaign.isActive,
    },
    totalLeaves: leaves.length,
    stage: calculatePlantStage(leaves.length),
    leaves: leaves.map((l) => ({
      id: l.id,
      username: l.instagramUsername,
      displayUsername: l.displayUsername,
      leafStyle: l.leafStyle,
      anchorIndex: l.anchorIndex,
      status: l.status,
      createdAt: l.createdAt,
    })),
    blockedUsers: blocked,
    recentEvents: events,
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req.headers, req.nextUrl.searchParams)) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const action = body.action;
  const repo = getRepo();

  switch (action) {
    case "block": {
      const campaignId = String(body.campaignId);
      const username = body.username ? String(body.username) : null;
      const userId = body.userId ? String(body.userId) : null;
      if (!campaignId) return NextResponse.json({ error: "campaignId-required" }, { status: 400 });
      await repo.blockUser({ campaignId, instagramUserId: userId, instagramUsername: username, reason: body.reason ? String(body.reason) : null });
      return NextResponse.json({ ok: true });
    }
    case "unblock": {
      // unblock by username within campaign
      const campaignId = String(body.campaignId);
      const username = body.username ? String(body.username) : null;
      if (!campaignId || !username) return NextResponse.json({ error: "campaignId+username-required" }, { status: 400 });
      const blocked = await repo.listBlockedUsers(campaignId);
      const target = blocked.find((b) => b.instagramUsername === username);
      if (!target) return NextResponse.json({ error: "not-blocked" }, { status: 404 });
      // delete from blocked_users
      await deleteBlocked(repo, target.id);
      return NextResponse.json({ ok: true });
    }
    case "setTrigger": {
      const id = String(body.id);
      const terms = Array.isArray(body.triggerTerms) ? (body.triggerTerms as string[]) : [String(body.triggerTerms)];
      await repo.updateCampaign(id, { triggerTerms: terms });
      return NextResponse.json({ ok: true });
    }
    case "setMedia": {
      const id = String(body.id);
      await repo.updateCampaign(id, {
        instagramMediaId: body.mediaId ? String(body.mediaId) : null,
        instagramPermalink: body.permalink ? String(body.permalink) : undefined,
      });
      return NextResponse.json({ ok: true });
    }
    case "activate":
    case "deactivate": {
      const id = String(body.id);
      await repo.updateCampaign(id, { isActive: action === "activate" });
      return NextResponse.json({ ok: true });
    }
    case "addTestLeaf": {
      const campaignId = String(body.campaignId);
      const username = String(body.username ?? `test_${Math.floor(Math.random() * 9999)}`);
      // delegate to the same service path used by real comments
      const { processComment } = await import("@/lib/leaves/processComment");
      const { randomUUID } = await import("node:crypto");
      const res = await processComment({
        commentId: randomUUID(),
        userId: randomUUID(),
        username,
        text: "🌱",
        mediaId: (await repo.getCampaignById(campaignId))?.instagramMediaId ?? "demo-media",
      });
      return NextResponse.json(res);
    }
    case "resetDemo": {
      const id = String(body.id);
      await resetCampaignLeaves(repo, id);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "unknown-action" }, { status: 400 });
  }
}

// Direct DB helpers for admin-only deletes (not part of the public Repo API).
async function deleteBlocked(repo: ReturnType<typeof getRepo>, blockedId: string): Promise<void> {
  const anyRepo = repo as unknown as { deleteBlockedUser?: (id: string) => Promise<void> };
  if (typeof anyRepo.deleteBlockedUser === "function") {
    await anyRepo.deleteBlockedUser(blockedId);
  }
}

async function resetCampaignLeaves(repo: ReturnType<typeof getRepo>, campaignId: string): Promise<void> {
  const anyRepo = repo as unknown as { resetLeaves?: (id: string) => Promise<void> };
  if (typeof anyRepo.resetLeaves === "function") {
    await anyRepo.resetLeaves(campaignId);
  }
}
