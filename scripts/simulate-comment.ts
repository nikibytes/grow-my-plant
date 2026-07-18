/**
 * CLI helper to simulate a comment without using the HTTP layer.
 * Useful for quick local testing:
 *
 *   npm run simulate -- --username bob --text "🌱"
 *
 * (Any extra args are ignored; edit USER/TEXT below or pass via flags.)
 */

import { processComment } from "@/lib/leaves/processComment";
import { getRepo } from "@/lib/database";
import { config } from "@/lib/config";
import { randomUUID } from "node:crypto";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const repo = getRepo();
  await repo.ensureSchema();
  const res = await processComment({
    commentId: randomUUID(),
    userId: randomUUID(),
    username: arg("username", "cli_user"),
    text: arg("text", "🌱"),
    mediaId: config.instagramTargetMediaId || "demo-media",
  });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
