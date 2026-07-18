import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { config } from "@/lib/config";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

// POST /api/admin/block  { campaignSlug, username, reason? }
export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== config.adminSecret) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const slug = String(body.campaignSlug ?? "").trim();
  const username = String(body.username ?? "").trim();
  if (!slug || !username) return NextResponse.json({ error: "slug-and-username-required" }, { status: 400 });

  const repo = getRepo();
  await repo.ensureSchema();
  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) return NextResponse.json({ error: "campaign-not-found" }, { status: 404 });

  await repo.blockUser({ campaignId: campaign.id, instagramUsername: username, reason: body.reason ? String(body.reason) : null });
  return NextResponse.json({ ok: true });
}
