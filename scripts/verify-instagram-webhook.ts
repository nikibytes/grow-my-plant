/**
 * Standalone verification of the Instagram webhook pipeline (AC1–AC4).
 * Run with:  npx tsx scripts/verify-instagram-webhook.ts
 *
 * Uses a FRESH temp SQLite database and unique IDs per run so it is
 * deterministic (no cross-run pollution of the real ./data DB).
 *
 * Covers:
 *  - AC1: X-Hub-Signature-256 verify accepts correct HMAC, rejects wrong/missing
 *  - AC3: parseCommentEvents() normalizes a Meta `comments` change into our shape
 *  - AC4: (integration) processComment grows a leaf from a 🌱 comment,
 *         and replays the SAME commentId as a duplicate (ignored)
 */
import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- isolate environment BEFORE any module that reads it is imported ---
const SECRET = "test-app-secret";
const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
process.env.INSTAGRAM_APP_SECRET = SECRET;
process.env.SQLITE_PATH = join(mkdtempSync(join(tmpdir(), "gmp-verify-")), "verify.db");
process.env.INSTAGRAM_TARGET_MEDIA_ID = "media_" + runId;

const { verifySignature } = await import("@/lib/instagram/verifyWebhook");
const { parseCommentEvents } = await import("@/lib/instagram/parseCommentEvent");
const { processComment } = await import("@/lib/leaves/processComment");
const { getRepo } = await import("@/lib/database");
const { config } = await import("@/lib/config");
(config as { instagramAppSecret: string }).instagramAppSecret = SECRET;

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

// ---- AC1: signature verification ----
const payload = JSON.stringify({
  object: "instagram",
  entry: [
    {
      id: "ig_user_1",
      time: 1700000000,
      changes: [
        {
          field: "comments",
          value: {
            media_id: config.instagramTargetMediaId,
            comment_id: "c_" + runId,
            text: "love this 🌱",
            from: { id: "u_1", username: "alice" },
          },
        },
      ],
    },
  ],
});

const goodSig = "sha256=" + createHmac("sha256", SECRET).update(payload).digest("hex");
check("AC1 accepts correct HMAC", verifySignature(payload, goodSig) === true);
check("AC1 rejects wrong HMAC", verifySignature(payload, "sha256=" + "0".repeat(64)) === false);
check("AC1 rejects missing header", verifySignature(payload, null) === false);

// ---- AC3: parse comment event ----
const events = parseCommentEvents(JSON.parse(payload));
check("AC3 parses one comment event", events.length === 1);
check("AC3 maps commentId", events[0]?.commentId === "c_" + runId);
check("AC3 maps username", events[0]?.username === "alice");
check("AC3 maps userId", events[0]?.userId === "u_1");
check("AC3 maps mediaId", events[0]?.mediaId === config.instagramTargetMediaId);
check("AC3 maps text", events[0]?.text === "love this 🌱");

// ---- AC4: full leaf growth via processComment (isolated sqlite) ----
const repo = getRepo();
await repo.ensureSchema();
await repo.createCampaign({
  name: "verify",
  slug: "verify-" + runId,
  instagramMediaId: config.instagramTargetMediaId,
  triggerTerms: ["🌱"],
  moderationMode: "automatic",
});

const campaignId = (await repo.getActiveCampaignByMediaId(config.instagramTargetMediaId))!.id;
const before = await repo.countVisibleLeaves(campaignId);
const result = await processComment({
  commentId: "c_" + runId,
  userId: "u_1",
  username: "alice",
  text: "love this 🌱",
  mediaId: config.instagramTargetMediaId,
});
const after = await repo.countVisibleLeaves(campaignId);

check("AC4 processComment created a leaf", "created" in result && result.created === true);
check("AC4 leaf count increased by 1", after === before + 1);

// idempotency: replay same commentId => ignored
const again = await processComment({
  commentId: "c_" + runId,
  userId: "u_1",
  username: "alice",
  text: "love this 🌱",
  mediaId: config.instagramTargetMediaId,
});
check("AC4 duplicate comment is ignored", "ignored" in again);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
