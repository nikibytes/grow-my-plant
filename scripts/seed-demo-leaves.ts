/**
 * Seed script: creates a demo campaign and a handful of demo leaves so the
 * plant page renders something immediately. Run with:
 *
 *   npm run seed
 *
 * Uses the same repo layer as the app, so it works on SQLite (local) and
 * Supabase (if configured).
 */

import { getRepo } from "@/lib/database";
import { config } from "@/lib/config";
import { processComment } from "@/lib/leaves/processComment";

const SLUG = "community-plant";
const MEDIA_ID = config.instagramTargetMediaId || "demo-media-1";

const DEMO_NAMES = [
  "riya_ai",
  "marcus_grows",
  "lemon_tree",
  "sunny.plants",
  "the_forest_freak",
  "olive.oil",
  "green_thumb_guru",
  "bean_sprout",
  "fernando",
  "pixel_leaf",
  "mossy_maya",
  "tomas_tree",
];

async function main() {
  const repo = getRepo();
  await repo.ensureSchema();

  let campaign = await repo.getCampaignBySlug(SLUG);
  if (!campaign) {
    campaign = await repo.createCampaign({
      name: "Community Plant",
      slug: SLUG,
      instagramMediaId: MEDIA_ID,
      instagramPermalink: config.instagramPermalink,
      triggerTerms: ["🌱"],
      oneLeafPerUser: true,
      moderationMode: "automatic",
    });
    console.log("Created demo campaign:", campaign.slug);
  } else {
    console.log("Campaign already exists:", campaign.slug);
  }

  let created = 0;
  for (const name of DEMO_NAMES) {
    const res = await processComment({
      commentId: `seed_${name}`,
      userId: null,
      username: name,
      text: "🌱",
      mediaId: campaign.instagramMediaId ?? MEDIA_ID,
    });
    if ("created" in res && res.created) created++;
  }
  console.log(`Seeded ${created} demo leaves. Open /plant/${SLUG}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
