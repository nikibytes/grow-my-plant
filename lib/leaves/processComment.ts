/**
 * Core leaf-creation service. This is the single funnel that turn a comment
 * event into a persisted leaf, used identically by BOTH the dev simulator and
 * the Instagram webhook handler. Instagram-specific logic lives only in
 * lib/instagram/*; this module is backend- and source-agnostic.
 */

import { getRepo } from "@/lib/database";
import type { Campaign, Leaf } from "@/lib/types";
import { isEligibleComment, parseTriggerTerms } from "@/lib/leaves/validateComment";
import { calculateLeafStyle } from "@/lib/leaves/calculateLeafStyle";
import { broadcastLeaf } from "@/lib/realtime/hub";

import { getLeafAnchor } from "@/lib/plant/anchors";
import { calculatePlantStage } from "@/lib/plant/stages";
import { getDisplayUsername, moderateUsername } from "@/lib/moderation/moderateUsername";
import type { CreateLeafResult } from "@/lib/leaves/createLeaf";

export interface CommentInput {
  commentId: string;
  userId: string | null;
  username: string;
  text: string;
  mediaId: string;
}

export type CreateLeafOutcome =
  | { created: true; leaf: Leaf; reason?: undefined }
  | { ignored: true; reason: string; leaf?: Leaf };

/**
 * Process a comment. Returns whether a leaf was created or why it was ignored.
 * Pure with respect to side effects beyond the database (idempotent on
 * commentId thanks to UNIQUE(instagram_comment_id)).
 */
export async function processComment(input: CommentInput): Promise<CreateLeafOutcome> {
  const repo = getRepo();

  // 1. Find the active campaign for the target media.
  let campaign: Campaign | null = await repo.getActiveCampaignByMediaId(input.mediaId);
  if (!campaign) {
    // Fallback: if target media ID isn't specifically mapped, find the default active campaign
    const campaigns = await repo.listCampaigns();
    campaign = campaigns.find((c) => c.isActive) ?? null;
  }
  if (!campaign) {
    return { ignored: true, reason: "unknown-media" };
  }

  // 2. Basic data guard.
  if (!input.commentId || !input.username) {
    return { ignored: true, reason: "missing-data" };
  }

  // 3. Idempotency: duplicate webhook delivery is ignored.
  const existingEvent = await repo.getEventByKey(input.commentId);
  if (existingEvent) {
    return { ignored: true, reason: "duplicate-event" };
  }

  // 4. Trigger match.
  const triggers = parseTriggerTerms(campaign.triggerTerms);
  if (!isEligibleComment(input.text, triggers)) {
    await repo.insertEvent({
      eventType: "comment.ignored.trigger",
      eventKey: input.commentId,
      payload: { username: input.username, reason: "trigger-not-found" },
    });
    await repo.markEventStatus(input.commentId, "ignored");
    return { ignored: true, reason: "trigger-not-found" };
  }

  // 5. Moderation of the username.
  const moderated = moderateUsername(input.username);
  if (!moderated.ok) {
    await repo.insertEvent({
      eventType: "comment.ignored.moderation",
      eventKey: input.commentId,
      payload: { username: input.username, reason: moderated.reason },
    });
    await repo.markEventStatus(input.commentId, "ignored", moderated.reason);
    return { ignored: true, reason: `moderation:${moderated.reason}` };
  }

  // 6. Blocked-user check.
  const blocked = await repo.isUserBlocked(campaign.id, input.userId, moderated.cleaned);
  if (blocked) {
    await repo.insertEvent({
      eventType: "comment.ignored.blocked",
      eventKey: input.commentId,
      payload: { username: moderated.cleaned, reason: "blocked-user" },
    });
    await repo.markEventStatus(input.commentId, "ignored", "blocked-user");
    return { ignored: true, reason: "blocked-user" };
  }

  // 7. One-leaf-per-user dedupe.
  const existingLeaf = await repo.findLeafByUser(campaign.id, input.userId, moderated.cleaned);
  if (existingLeaf) {
    await repo.insertEvent({
      eventType: "comment.ignored.duplicate",
      eventKey: input.commentId,
      payload: { username: moderated.cleaned, reason: "leaf-already-exists" },
    });
    await repo.markEventStatus(input.commentId, "ignored", "leaf-already-exists");
    return { ignored: true, reason: "leaf-already-exists", leaf: existingLeaf };
  }

  // 8. Persist the incoming event (for audit + idempotency).
  await repo.insertEvent({
    eventType: "comment.received",
    eventKey: input.commentId,
    payload: {
      username: moderated.cleaned,
      userId: input.userId,
      text: input.text,
      mediaId: input.mediaId,
    },
  });

  // 9. Assign style + anchor. Same user → same style (deterministic hash).
  const totalBefore = await repo.countVisibleLeaves(campaign.id);
  const anchor = getLeafAnchor(totalBefore); // 0-based next slot
  const style = calculateLeafStyle(input.userId ?? moderated.cleaned);

  const leaf = await repo.insertLeaf({
    campaignId: campaign.id,
    instagramCommentId: input.commentId,
    instagramUserId: input.userId,
    instagramUsername: moderated.cleaned,
    displayUsername: getDisplayUsername(moderated.cleaned),
    commentText: input.text,
    leafStyle: style,
    anchorIndex: anchor.index,
    rotation: anchor.rotation,
    scale: anchor.scale,
    status: campaign.moderationMode === "manual" ? "pending" : "visible",
  });

  // 10. Recompute + store plant stage.
  const totalAfter = await repo.countVisibleLeaves(campaign.id);
  const stage = calculatePlantStage(totalAfter);
  await repo.updateCampaign(campaign.id, { currentStage: stage });

  // 11. Broadcast to realtime subscribers.
  broadcastLeaf(campaign.id, leaf);

  await repo.markEventStatus(input.commentId, "processed");
  return { created: true, leaf };
}

// re-export the type so callers can import from one place
export type { CreateLeafResult };
