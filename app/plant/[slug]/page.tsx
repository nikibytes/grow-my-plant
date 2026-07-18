import { getRepo } from "@/lib/database";
import { calculatePlantStage, stageLabel, nextMilestone } from "@/lib/plant/stages";
import type { Leaf } from "@/lib/types";
import { PlantClient } from "@/components/PlantClient";

export const dynamic = "force-dynamic";

export default async function PlantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = getRepo();
  await repo.ensureSchema();

  const campaign = await repo.getCampaignBySlug(slug);
  if (!campaign) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Plant not found 🥀</h1>
        <p className="mt-2 text-sm text-bark/70">
          This campaign doesn’t exist yet.
        </p>
      </main>
    );
  }

  const visibleLeaves = await repo.listVisibleLeaves(campaign.id);
  const latest = await repo.getLatestLeaf(campaign.id);
  const total = visibleLeaves.length;
  const stage = calculatePlantStage(total);

  const initialLeaves = visibleLeaves.map((l: Leaf) => ({
    id: l.id,
    username: l.instagramUsername,
    displayUsername: l.displayUsername,
    leafStyle: l.leafStyle,
    anchorIndex: l.anchorIndex,
    rotation: l.rotation,
    scale: l.scale,
    createdAt: l.createdAt,
  }));

  return (
    <PlantClient
      slug={slug}
      campaignName={campaign.name}
      instagramPermalink={campaign.instagramPermalink ?? "https://www.instagram.com/"}
      triggerTerms={campaign.triggerTerms}
      initialLeaves={initialLeaves}
      initialTotal={total}
      initialStageLabel={stageLabel(stage)}
      initialNextMilestone={nextMilestone(total)}
      initialLatestUsername={latest?.instagramUsername ?? null}
    />
  );
}
