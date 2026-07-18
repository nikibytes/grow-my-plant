import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { calculatePlantStage, nextMilestone, stageLabel } from "@/lib/plant/stages";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[slug]  → public campaign summary.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const repo = getRepo();
  await repo.ensureSchema();

  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) {
    return NextResponse.json({ error: "campaign-not-found" }, { status: 404 });
  }

  const totalLeaves = await repo.countVisibleLeaves(campaign.id);
  const latest = await repo.getLatestLeaf(campaign.id);
  const stage = calculatePlantStage(totalLeaves);
  const milestone = nextMilestone(totalLeaves);

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    instagramPermalink: campaign.instagramPermalink,
    totalLeaves,
    currentStage: stage,
    currentStageLabel: stageLabel(stage),
    nextMilestone: milestone,
    triggerTerms: campaign.triggerTerms,
    latestLeaf: latest
      ? {
          username: latest.instagramUsername,
          displayUsername: latest.displayUsername,
          createdAt: latest.createdAt,
        }
      : null,
  });
}
