/**
 * SQLite repository implementation using Node's built-in `node:sqlite`
 * (available since Node 22.5). This is the zero-config local backend — no
 * external services required to run the whole product with simulated comments.
 */

import { DatabaseSync, type DatabaseSync as DBSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "@/lib/config";
import { SCHEMA_SQL } from "@/lib/database/schema";
import type {
  BlockedUserRow,
  BlockUserInput,
  CreateCampaignInput,
  EventRow,
  InsertEventInput,
  InsertLeafInput,
  Repo,
} from "@/lib/database/repo-interface";
import type {
  Campaign,
  EventProcessingStatus,
  Leaf,
} from "@/lib/types";
import { parseTriggerTerms } from "@/lib/leaves/validateComment";

// Node's SQLite only works in a single thread. Next.js dev runs API routes in
// the same process, so a module-level singleton is correct here.
let db: DBSync | null = null;

function getDb(): DBSync {
  if (db) return db;
  const path = config.sqlitePath;
  if (path !== ":memory:" && path.startsWith("./")) {
    mkdirSync(dirname(path), { recursive: true });
  }
  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_SQL);
  return db;
}

type Row = Record<string, unknown>;

function rowToCampaign(r: Row): Campaign {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    instagramMediaId: (r.instagram_media_id as string) ?? null,
    instagramPermalink: (r.instagram_permalink as string) ?? null,
    triggerTerms: parseTriggerTerms(r.trigger_terms as string),
    oneLeafPerUser: !!(r.one_leaf_per_user as number),
    moderationMode: (r.moderation_mode as Campaign["moderationMode"]) ?? "automatic",
    removeLeafOnCommentDelete: !!(r.remove_leaf_on_comment_delete as number),
    currentStage: r.current_stage as string,
    isActive: !!(r.is_active as number),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToLeaf(r: Row): Leaf {
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

export class SqliteRepo implements Repo {
  private d(): DBSync {
    return getDb();
  }

  async ensureSchema(): Promise<void> {
    getDb();
  }

  async getActiveCampaignByMediaId(mediaId: string) {
    const r = this
      .d()
      .prepare(
        "SELECT * FROM campaigns WHERE instagram_media_id = ? AND is_active = 1 LIMIT 1",
      )
      .get(mediaId) as Row | undefined;
    return r ? rowToCampaign(r) : null;
  }

  async getCampaignBySlug(slug: string) {
    const r = this
      .d()
      .prepare("SELECT * FROM campaigns WHERE slug = ? LIMIT 1")
      .get(slug) as Row | undefined;
    return r ? rowToCampaign(r) : null;
  }

  async getCampaignById(id: string) {
    const r = this.d().prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1").get(id) as
      | Row
      | undefined;
    return r ? rowToCampaign(r) : null;
  }

  async listCampaigns() {
    const rows = this.d().prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all() as Row[];
    return rows.map(rowToCampaign);
  }

  async createCampaign(input: CreateCampaignInput) {
    const id = randomUUID();
    const triggers = JSON.stringify(input.triggerTerms ?? ["🌱"]);
    this.d()
      .prepare(
        `INSERT INTO campaigns
          (id, name, slug, instagram_media_id, instagram_permalink, trigger_terms,
           one_leaf_per_user, moderation_mode, remove_leaf_on_comment_delete)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.name,
        input.slug,
        input.instagramMediaId ?? null,
        input.instagramPermalink ?? null,
        triggers,
        input.oneLeafPerUser ?? true ? 1 : 0,
        input.moderationMode ?? "automatic",
        input.removeLeafOnCommentDelete ?? false ? 1 : 0,
      );
    return (await this.getCampaignById(id))!;
  }

  async updateCampaign(id: string, patch: Partial<Campaign>) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    // field (camel) -> SQL column (snake)
    const map: Record<string, string> = {
      name: "name",
      slug: "slug",
      instagramMediaId: "instagram_media_id",
      instagramPermalink: "instagram_permalink",
      triggerTerms: "trigger_terms",
      oneLeafPerUser: "one_leaf_per_user",
      moderationMode: "moderation_mode",
      removeLeafOnCommentDelete: "remove_leaf_on_comment_delete",
      currentStage: "current_stage",
      isActive: "is_active",
    };
    for (const [field, col] of Object.entries(map)) {
      if (field in patch && patch[field as keyof Campaign] !== undefined) {
        sets.push(`${col} = ?`);
        const v = (patch as Record<string, unknown>)[field];
        if (col === "trigger_terms") vals.push(JSON.stringify(v));
        else if (typeof v === "boolean") vals.push(v ? 1 : 0);
        else vals.push(v as unknown);
      }
    }
    if (!sets.length) return this.getCampaignById(id);
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    this.d()
      .prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`)
      .run(...(vals as (string | number)[]));
    return this.getCampaignById(id);
  }

  async updateLeafStatus(id: string, status: Leaf["status"]) {
    const r = this
      .d()
      .prepare("UPDATE leaves SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, id);
    return r.changes > 0;
  }

  async getLeafByCommentId(commentId: string) {
    const r = this
      .d()
      .prepare("SELECT * FROM leaves WHERE instagram_comment_id = ? LIMIT 1")
      .get(commentId) as Row | undefined;
    return r ? rowToLeaf(r) : null;
  }

  async findLeafByUser(campaignId: string, userId: string | null, username: string) {
    let r: Row | undefined;
    if (userId) {
      r = this
        .d()
        .prepare(
          "SELECT * FROM leaves WHERE campaign_id = ? AND instagram_user_id = ? LIMIT 1",
        )
        .get(campaignId, userId) as Row | undefined;
    }
    if (!r) {
      r = this
        .d()
        .prepare(
          "SELECT * FROM leaves WHERE campaign_id = ? AND instagram_username = ? LIMIT 1",
        )
        .get(campaignId, username) as Row | undefined;
    }
    return r ? rowToLeaf(r) : null;
  }

  async insertLeaf(input: InsertLeafInput) {
    const id = randomUUID();
    this.d()
      .prepare(
        `INSERT INTO leaves
          (id, campaign_id, instagram_comment_id, instagram_user_id, instagram_username,
           display_username, comment_text, leaf_style, anchor_index, rotation, scale, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        input.campaignId,
        input.instagramCommentId,
        input.instagramUserId ?? null,
        input.instagramUsername,
        input.displayUsername,
        input.commentText ?? null,
        input.leafStyle,
        input.anchorIndex,
        input.rotation,
        input.scale,
        input.status ?? "visible",
      );
    return (await this.getLeafByCommentId(input.instagramCommentId))!;
  }

  async listVisibleLeaves(campaignId: string) {
    const rows = this
      .d()
      .prepare(
        "SELECT * FROM leaves WHERE campaign_id = ? AND status = 'visible' ORDER BY created_at ASC, anchor_index ASC",
      )
      .all(campaignId) as Row[];
    return rows.map(rowToLeaf);
  }

  async countVisibleLeaves(campaignId: string) {
    const r = this
      .d()
      .prepare(
        "SELECT COUNT(*) AS c FROM leaves WHERE campaign_id = ? AND status = 'visible'",
      )
      .get(campaignId) as { c: number };
    return r.c;
  }

  async getLatestLeaf(campaignId: string) {
    const r = this
      .d()
      .prepare(
        "SELECT * FROM leaves WHERE campaign_id = ? AND status = 'visible' ORDER BY created_at DESC, anchor_index DESC LIMIT 1",
      )
      .get(campaignId) as Row | undefined;
    return r ? rowToLeaf(r) : null;
  }

  async getEventByKey(key: string) {
    const r = this
      .d()
      .prepare("SELECT processing_status FROM instagram_events WHERE event_key = ? LIMIT 1")
      .get(key) as { processing_status: string } | undefined;
    return r ? { processingStatus: r.processing_status } : null;
  }

  async insertEvent(input: InsertEventInput) {
    const id = randomUUID();
    this.d()
      .prepare(
        `INSERT INTO instagram_events (id, event_type, event_key, payload)
         VALUES (?,?,?,?)`,
      )
      .run(id, input.eventType, input.eventKey, JSON.stringify(input.payload));
  }

  async markEventStatus(key: string, status: EventProcessingStatus, errorMessage?: string) {
    this.d()
      .prepare(
        `UPDATE instagram_events SET processing_status = ?, error_message = ?, processed_at = datetime('now') WHERE event_key = ?`,
      )
      .run(status, errorMessage ?? null, key);
  }

  async listEvents(limit: number, status?: string) {
    const rows = status
      ? (this
          .d()
          .prepare(
            "SELECT * FROM instagram_events WHERE processing_status = ? ORDER BY received_at DESC LIMIT ?",
          )
          .all(status, limit) as Row[])
      : (this.d().prepare("SELECT * FROM instagram_events ORDER BY received_at DESC LIMIT ?").all(limit) as Row[]);
    return rows.map(
      (r): EventRow => ({
        id: r.id as string,
        eventType: r.event_type as string,
        eventKey: r.event_key as string,
        payload: JSON.parse((r.payload as string) ?? "{}"),
        processingStatus: r.processing_status as EventProcessingStatus,
        errorMessage: (r.error_message as string) ?? null,
        receivedAt: r.received_at as string,
        processedAt: (r.processed_at as string) ?? null,
      }),
    );
  }

  async isUserBlocked(campaignId: string, userId: string | null, username: string) {
    if (userId) {
      const r = this
        .d()
        .prepare(
          "SELECT id FROM blocked_users WHERE campaign_id = ? AND instagram_user_id = ? LIMIT 1",
        )
        .get(campaignId, userId);
      if (r) return true;
    }
    const r2 = this
      .d()
      .prepare(
        "SELECT id FROM blocked_users WHERE campaign_id = ? AND instagram_username = ? LIMIT 1",
      )
      .get(campaignId, username);
    return !!r2;
  }

  async blockUser(input: BlockUserInput) {
    const id = randomUUID();
    this.d()
      .prepare(
        `INSERT INTO blocked_users (id, campaign_id, instagram_user_id, instagram_username, reason)
         VALUES (?,?,?,?,?)`,
      )
      .run(
        id,
        input.campaignId,
        input.instagramUserId ?? null,
        input.instagramUsername ?? null,
        input.reason ?? null,
      );
  }

  async deleteBlockedUser(blockedId: string): Promise<void> {
    this.d().prepare("DELETE FROM blocked_users WHERE id = ?").run(blockedId);
  }

  async resetLeaves(campaignId: string): Promise<void> {
    this.d().prepare("DELETE FROM leaves WHERE campaign_id = ?").run(campaignId);
    await this.updateCampaign(campaignId, { currentStage: "seed" });
  }

  async listBlockedUsers(campaignId: string) {
    const rows = this
      .d()
      .prepare("SELECT * FROM blocked_users WHERE campaign_id = ? ORDER BY created_at DESC")
      .all(campaignId) as Row[];
    return rows.map(
      (r): BlockedUserRow => ({
        id: r.id as string,
        campaignId: r.campaign_id as string,
        instagramUserId: (r.instagram_user_id as string) ?? null,
        instagramUsername: (r.instagram_username as string) ?? null,
        reason: (r.reason as string) ?? null,
        createdAt: r.created_at as string,
      }),
    );
  }
}
