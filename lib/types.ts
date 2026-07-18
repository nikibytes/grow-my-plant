/**
 * Shared domain types used across API routes, services and the frontend.
 * These mirror the database shape but are safe to import in the browser too.
 */

export type LeafStatus = "pending" | "approved" | "visible" | "hidden" | "removed";

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  instagramMediaId: string | null;
  instagramPermalink: string | null;
  triggerTerms: string[];
  oneLeafPerUser: boolean;
  moderationMode: "automatic" | "manual";
  removeLeafOnCommentDelete: boolean;
  currentStage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Leaf {
  id: string;
  campaignId: string;
  instagramCommentId: string;
  instagramUserId: string | null;
  instagramUsername: string;
  displayUsername: string;
  commentText: string | null;
  leafStyle: number;
  anchorIndex: number;
  rotation: number | null;
  scale: number | null;
  status: LeafStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramCommentEvent {
  commentId: string;
  userId: string | null;
  username: string;
  text: string;
  mediaId: string;
}

export type EventProcessingStatus =
  | "pending"
  | "processed"
  | "ignored"
  | "failed";
