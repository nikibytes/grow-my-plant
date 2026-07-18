import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { config } from "@/lib/config";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

// GET /api/admin/overview?slug=...  → campaign + leaves + events + blocked
export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== config.adminSecret) return unauthorized();

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug-required" }, { status: 400 });

  const repo = getRepo();
  await repo.ensureSchema();
  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) return NextResponse.json({ error: "campaign-not-found" }, { status: 404 });

  const [leaves, events, blocked] = await Promise.all([
    repo.listVisibleLeaves(campaign.id),
    repo.listEvents(50),
    repo.listBlockedUsers(campaign.id),
  ]);

  return NextResponse.json({
    campaign,
    leaves,
    events,
    blockedUsers: blocked,
  });
}

// POST /api/admin/campaigns  → create a new campaign
export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== config.adminSecret) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  if (!name || !slug) return NextResponse.json({ error: "name-and-slug-required" }, { status: 400 });

  const repo = getRepo();
  await repo.ensureSchema();
  const existing = await repo.getCampaignBySlug(slug);
  if (existing) return NextResponse.json({ error: "slug-taken" }, { status: 409 });

  const campaign = await repo.createCampaign({
    name,
    slug,
    instagramMediaId: body.instagramMediaId ? String(body.instagramMediaId) : null,
    instagramPermalink: body.instagramPermalink ? String(body.instagramPermalink) : null,
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
