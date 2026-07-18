import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { config } from "@/lib/config";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

// GET /api/admin/campaigns → list all campaigns
export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== config.adminSecret) return unauthorized();
  const repo = getRepo();
  await repo.ensureSchema();
  return NextResponse.json({ campaigns: await repo.listCampaigns() });
}

// POST /api/admin/campaigns → create a new campaign
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

  const triggers = Array.isArray(body.triggerTerms)
    ? (body.triggerTerms as string[])
    : undefined;

  const repo = getRepo();
  await repo.ensureSchema();
  const existing = await repo.getCampaignBySlug(slug);
  if (existing) return NextResponse.json({ error: "slug-taken" }, { status: 409 });

  const campaign = await repo.createCampaign({
    name,
    slug,
    instagramMediaId: body.instagramMediaId ? String(body.instagramMediaId) : null,
    instagramPermalink: body.instagramPermalink ? String(body.instagramPermalink) : null,
    triggerTerms: triggers,
    oneLeafPerUser: body.oneLeafPerUser !== false,
    moderationMode: body.moderationMode === "manual" ? "manual" : "automatic",
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
