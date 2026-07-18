/**
 * Shared repository interface. Both the SQLite (local-first) and Supabase
 * (production) implementations satisfy this contract, so the rest of the app
 * never needs to know which backend is active.
 */

import type {
  Campaign,
  EventProcessingStatus,
  Leaf,
} from "@/lib/types";

export interface Repo {
  ensureSchema(): Promise<void>;

  // ── Campaigns ──
  getActiveCampaignByMediaId(mediaId: string): Promise<Campaign | null>;
  getCampaignBySlug(slug: string): Promise<Campaign | null>;
  getCampaignById(id: string): Promise<Campaign | null>;
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null>;

  // ── Leaves ──
  getLeafByCommentId(commentId: string): Promise<Leaf | null>;
  updateLeafStatus(id: string, status: Leaf["status"]): Promise<boolean>;
  findLeafByUser(
    campaignId: string,
    userId: string | null,
    username: string,
  ): Promise<Leaf | null>;
  insertLeaf(input: InsertLeafInput): Promise<Leaf>;
  listVisibleLeaves(campaignId: string): Promise<Leaf[]>;
  countVisibleLeaves(campaignId: string): Promise<number>;
  getLatestLeaf(campaignId: string): Promise<Leaf | null>;

  // ── Events ──
  getEventByKey(key: string): Promise<{ processingStatus: string } | null>;
  insertEvent(input: InsertEventInput): Promise<void>;
  markEventStatus(
    key: string,
    status: EventProcessingStatus,
    errorMessage?: string,
  ): Promise<void>;
  listEvents(limit: number, status?: string): Promise<EventRow[]>;

  // ── Blocked users ──
  isUserBlocked(
    campaignId: string,
    userId: string | null,
    username: string,
  ): Promise<boolean>;
  blockUser(input: BlockUserInput): Promise<void>;
  listBlockedUsers(campaignId: string): Promise<BlockedUserRow[]>;
  deleteBlockedUser(blockedId: string): Promise<void>;
  resetLeaves(campaignId: string): Promise<void>;
}

export interface CreateCampaignInput {
  name: string;
  slug: string;
  instagramMediaId?: string | null;
  instagramPermalink?: string | null;
  triggerTerms?: string[];
  oneLeafPerUser?: boolean;
  moderationMode?: "automatic" | "manual";
  removeLeafOnCommentDelete?: boolean;
}

export interface InsertLeafInput {
  campaignId: string;
  instagramCommentId: string;
  instagramUserId?: string | null;
  instagramUsername: string;
  displayUsername: string;
  commentText?: string | null;
  leafStyle: number;
  anchorIndex: number;
  rotation: number | null;
  scale: number | null;
  status?: Leaf["status"];
}

export interface InsertEventInput {
  eventType: string;
  eventKey: string;
  payload: unknown;
}

export interface EventRow {
  id: string;
  eventType: string;
  eventKey: string;
  payload: unknown;
  processingStatus: EventProcessingStatus;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface BlockedUserRow {
  id: string;
  campaignId: string;
  instagramUserId: string | null;
  instagramUsername: string | null;
  reason: string | null;
  createdAt: string;
}

export interface BlockUserInput {
  campaignId: string;
  instagramUserId?: string | null;
  instagramUsername?: string | null;
  reason?: string | null;
}
