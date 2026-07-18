import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { processComment } from "@/lib/leaves/processComment";
import { getRepo } from "@/lib/database";

/**
 * Development-only simulated comment endpoint.
 * POST /api/dev/simulate-comment  { username, text?, mediaId? }
 *
 * This is how the whole product is exercised BEFORE any Instagram credentials
 * exist. It is blocked outside development unless explicitly overridden.
 */
export async function POST(req: NextRequest) {
  if (config.isProd && process.env.ALLOW_SIMULATE !== "1") {
    return NextResponse.json({ error: "simulator-disabled-in-production" }, { status: 403 });
  }

  let body: { username?: string; text?: string; mediaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const text = body.text ?? "🌱";
  if (!username) {
    return NextResponse.json({ error: "username-required" }, { status: 400 });
  }

  const repo = getRepo();
  await repo.ensureSchema();

  // Resolve a target media id: explicit param > env target > first campaign.
  let mediaId = body.mediaId || config.instagramTargetMediaId;
  if (!mediaId) {
    const campaigns = await repo.listCampaigns();
    if (campaigns.length) mediaId = campaigns[0].instagramMediaId || `demo-media-${campaigns[0].id}`;
  }
  if (!mediaId) {
    return NextResponse.json({ error: "no-campaign-media" }, { status: 400 });
  }

  const commentId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await processComment({
    commentId,
    userId: null, // dev sims have no IG user id; dedupe falls back to username
    username,
    text,
    mediaId,
  });

  const created = "created" in result && result.created;
  return NextResponse.json(result, { status: created ? 201 : 200 });
}
