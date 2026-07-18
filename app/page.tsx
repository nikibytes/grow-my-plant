import { getRepo } from "@/lib/database";
import { CommentGarden, type GardenLeafData } from "@/components/CommentGarden";

export const dynamic = "force-dynamic";

// The single site page: load the default (first) campaign and its live leaves,
// then render the Comment Garden. A 🌱 comment from Instagram (or the dev
// simulator) flows webhook → processComment → broadcast → this page live.
export default async function Home() {
  const repo = getRepo();
  await repo.ensureSchema();
  const campaigns = await repo.listCampaigns();

  if (campaigns.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-leaf-dark">
          🌿 Comment Garden
        </h1>
        <p className="mt-3 text-sm text-bark/70">
          No campaigns yet. Run <code>npm run seed</code> to grow the demo plant,
          or open <code>/admin</code> to set one up.
        </p>
      </main>
    );
  }

  const campaign = campaigns[0];
  const visibleLeaves = await repo.listVisibleLeaves(campaign.id);

  const initialLeaves: GardenLeafData[] = visibleLeaves.map((l) => ({
    id: l.id,
    username: l.instagramUsername,
    displayUsername: l.displayUsername,
    createdAt: l.createdAt,
    comment: l.commentText ?? "",
  }));

  return (
    <CommentGarden
      slug={campaign.slug}
      campaignName={campaign.name}
      initialLeaves={initialLeaves}
    />
  );
}
