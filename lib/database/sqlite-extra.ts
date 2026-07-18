/**
 * Small set of helpers used by the admin API when running on SQLite. These
 * reach the DB singleton directly for operations not surfaced by the generic
 * Repo interface (leaf-by-id, direct status update, event/campaign listings).
 * On Supabase these would be replaced by equivalent client calls.
 */

import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "@/lib/config";
import { SCHEMA_SQL } from "@/lib/database/schema";
import type { Leaf } from "@/lib/types";

let db: DatabaseSync | null = null;

export function getDbForAdmin(): DatabaseSync {
  if (db) return db;
  const path = config.sqlitePath;
  if (path !== ":memory:" && path.startsWith("./")) {
    mkdirSync(dirname(path), { recursive: true });
  }
  db = new DatabaseSync(path);
  db.exec(SCHEMA_SQL);
  return db;
}

export async function getLeafById(id: string): Promise<Leaf | null> {
  const r = getDbForAdmin()
    .prepare("SELECT * FROM leaves WHERE id = ? LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    instagramCommentId: r.instagram_comment_id as string,
    instagramUserId: (r.instagram_user_id as string) ?? null,
    instagramUsername: r.instagram_username as string,
    displayUsername: r.display_username as string,
    commentText: (r.comment_text as string) ?? null,
    leafStyle: r.leaf_style as number,
    anchorIndex: r.anchor_index as number,
    rotation: (r.rotation as number | null) ?? null,
    scale: (r.scale as number | null) ?? null,
    status: r.status as Leaf["status"],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}
