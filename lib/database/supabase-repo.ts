/**
 * Supabase repository implementation for production. Uses the service-role key
 * server-side (never exposed to the browser). Mirrors the SQLite repo's
 * behaviour. Requires the schema in supabase/migrations/0001_init.sql.
 *
 * NOTE: We intentionally avoid pulling `@supabase/supabase-js` at module load
 * when Supabase is not the active provider, so the local-first default has no
 * hard dependency on it at runtime.
 */

import { config } from "@/lib/config";
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
import { randomUUID } from "node:crypto";

// Lazy import so the package is only required when actually used.
async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

function mapCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    instagramMediaId: (r.instagram_media_id as string) ?? null,
    instagramPermalink: (r.instagram_permalink as string) ?? null,
    triggerTerms: parseTriggerTerms(r.trigger_terms),
    oneLeafPerUser: r.one_leaf_per_user as boolean,
    moderationMode: r.moderation_mode as Campaign["moderationMode"],
    removeLeafOnCommentDelete: r.remove_leaf_on_comment_delete as boolean,
    currentStage: r.current_stage as string,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapLeaf(r: Record<string, unknown>): Leaf {
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

export class SupabaseRepo implements Repo {
  async ensureSchema(): Promise<void> {
    // Schema is managed via migration SQL in Supabase; nothing to do at runtime.
  }

  private async sb() {
    return client();
  }

  async getActiveCampaignByMediaId(mediaId: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("campaigns")
      .select("*")
      .eq("instagram_media_id", mediaId)
      .eq("is_active", true)
      .maybeSingle();
    return data ? mapCampaign(data as Record<string, unknown>) : null;
  }

  async getCampaignBySlug(slug: string) {
    const sb = await this.sb();
    const { data } = await sb.from("campaigns").select("*").eq("slug", slug).maybeSingle();
    return data ? mapCampaign(data as Record<string, unknown>) : null;
  }

  async getCampaignById(id: string) {
    const sb = await this.sb();
    const { data } = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
    return data ? mapCampaign(data as Record<string, unknown>) : null;
  }

  async listCampaigns() {
    const sb = await this.sb();
    const { data } = await sb.from("campaigns").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((r) => mapCampaign(r as Record<string, unknown>));
  }

  async createCampaign(input: CreateCampaignInput) {
    const sb = await this.sb();
    const { data, error } = await sb
      .from("campaigns")
      .insert({
        id: randomUUID(),
        name: input.name,
        slug: input.slug,
        instagram_media_id: input.instagramMediaId ?? null,
        instagram_permalink: input.instagramPermalink ?? null,
        trigger_terms: input.triggerTerms ?? ["🌱"],
        one_leaf_per_user: input.oneLeafPerUser ?? true,
        moderation_mode: input.moderationMode ?? "automatic",
        remove_leaf_on_comment_delete: input.removeLeafOnCommentDelete ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return mapCampaign(data as Record<string, unknown>);
  }

  async updateCampaign(id: string, patch: Partial<Campaign>) {
    const sb = await this.sb();
    const { error } = await sb.from("campaigns").update(patch).eq("id", id);
    if (error) throw error;
    return this.getCampaignById(id);
  }

  async updateLeafStatus(id: string, status: Leaf["status"]) {
    const sb = await this.sb();
    const { error } = await sb.from("leaves").update({ status }).eq("id", id);
    if (error) throw error;
    return true;
  }

  async getLeafByCommentId(commentId: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("leaves")
      .select("*")
      .eq("instagram_comment_id", commentId)
      .maybeSingle();
    return data ? mapLeaf(data as Record<string, unknown>) : null;
  }

  async findLeafByUser(campaignId: string, userId: string | null, username: string) {
    const sb = await this.sb();
    if (userId) {
      const { data } = await sb
        .from("leaves")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("instagram_user_id", userId)
        .maybeSingle();
      if (data) return mapLeaf(data as Record<string, unknown>);
    }
    const { data } = await sb
      .from("leaves")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("instagram_username", username)
      .maybeSingle();
    return data ? mapLeaf(data as Record<string, unknown>) : null;
  }

  async insertLeaf(input: InsertLeafInput) {
    const sb = await this.sb();
    const { data, error } = await sb
      .from("leaves")
      .insert({
        id: randomUUID(),
        campaign_id: input.campaignId,
        instagram_comment_id: input.instagramCommentId,
        instagram_user_id: input.instagramUserId ?? null,
        instagram_username: input.instagramUsername,
        display_username: input.displayUsername,
        comment_text: input.commentText ?? null,
        leaf_style: input.leafStyle,
        anchor_index: input.anchorIndex,
        rotation: input.rotation,
        scale: input.scale,
        status: input.status ?? "visible",
      })
      .select()
      .single();
    if (error) throw error;
    return mapLeaf(data as Record<string, unknown>);
  }

  async listVisibleLeaves(campaignId: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("leaves")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "visible")
      .order("created_at", { ascending: true })
      .order("anchor_index", { ascending: true });
    return (data ?? []).map((r) => mapLeaf(r as Record<string, unknown>));
  }

  async countVisibleLeaves(campaignId: string) {
    const sb = await this.sb();
    const { count } = await sb
      .from("leaves")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "visible");
    return count ?? 0;
  }

  async getLatestLeaf(campaignId: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("leaves")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? mapLeaf(data as Record<string, unknown>) : null;
  }

  async getEventByKey(key: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("instagram_events")
      .select("processing_status")
      .eq("event_key", key)
      .maybeSingle();
    return data ? { processingStatus: (data as { processing_status: string }).processing_status } : null;
  }

  async insertEvent(input: InsertEventInput) {
    const sb = await this.sb();
    await sb.from("instagram_events").insert({
      id: randomUUID(),
      event_type: input.eventType,
      event_key: input.eventKey,
      payload: input.payload,
    });
  }

  async markEventStatus(key: string, status: EventProcessingStatus, errorMessage?: string) {
    const sb = await this.sb();
    await sb
      .from("instagram_events")
      .update({ processing_status: status, error_message: errorMessage ?? null, processed_at: new Date().toISOString() })
      .eq("event_key", key);
  }

  async listEvents(limit: number, status?: string) {
    const sb = await this.sb();
    let q = sb.from("instagram_events").select("*").order("received_at", { ascending: false }).limit(limit);
    if (status) q = q.eq("processing_status", status);
    const { data } = await q;
    return (data ?? []).map(
      (r): EventRow => ({
        id: r.id as string,
        eventType: r.event_type as string,
        eventKey: r.event_key as string,
        payload: r.payload,
        processingStatus: r.processing_status as EventProcessingStatus,
        errorMessage: (r.error_message as string) ?? null,
        receivedAt: r.received_at as string,
        processedAt: (r.processed_at as string) ?? null,
      }),
    );
  }

  async isUserBlocked(campaignId: string, userId: string | null, username: string) {
    const sb = await this.sb();
    if (userId) {
      const { data } = await sb
        .from("blocked_users")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("instagram_user_id", userId)
        .maybeSingle();
      if (data) return true;
    }
    const { data } = await sb
      .from("blocked_users")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("instagram_username", username)
      .maybeSingle();
    return !!data;
  }

  async blockUser(input: BlockUserInput) {
    const sb = await this.sb();
    await sb.from("blocked_users").insert({
      id: randomUUID(),
      campaign_id: input.campaignId,
      instagram_user_id: input.instagramUserId ?? null,
      instagram_username: input.instagramUsername ?? null,
      reason: input.reason ?? null,
    });
  }

  async deleteBlockedUser(blockedId: string): Promise<void> {
    const sb = await this.sb();
    await sb.from("blocked_users").delete().eq("id", blockedId);
  }

  async resetLeaves(campaignId: string): Promise<void> {
    const sb = await this.sb();
    await sb.from("leaves").delete().eq("campaign_id", campaignId);
    await this.updateCampaign(campaignId, { currentStage: "seed" });
  }

  async listBlockedUsers(campaignId: string) {
    const sb = await this.sb();
    const { data } = await sb
      .from("blocked_users")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(
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
