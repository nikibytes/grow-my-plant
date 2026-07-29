/**
 * Parses a raw Meta/Instagram webhook payload into our internal
 * InstagramCommentEvent shape. Kept isolated so the rest of the app never
 * depends on Meta's exact envelope — if their schema changes, only this file
 * needs updating.
 *
 * The Instagram Graph webhook for comments delivers an array under `entry[].changes[]`
 * where `value` contains the comment fields, and `value.media_id` identifies
 * the target media.
 */

import type { InstagramCommentEvent } from "@/lib/types";

interface RawMedia {
  id?: string;
}
interface RawChange {
  field?: string;
  value?: {
    media_id?: string;
    media?: RawMedia; // real Meta payload nests media under `media.id`
    comment_id?: string;
    id?: string; // sometimes the comment id sits here
    text?: string;
    from?: { id?: string; username?: string; id_str?: string };
    username?: string;
    sender?: { id?: string; username?: string };
    timestamp?: string;
    parent_id?: string;
  };
}

interface RawEntry {
  id?: string;
  time?: number;
  changes?: RawChange[];
}

interface RawPayload {
  object?: string;
  entry?: RawEntry[];
}

/** Best-effort extraction of the comment author identity. */
function extractAuthor(value: NonNullable<RawChange["value"]>): {
  userId: string | null;
  username: string | null;
} {
  const from = value.from ?? value.sender;
  if (from) {
    const id = from.id ?? (from as { id_str?: string }).id_str ?? null;
    return { userId: id ?? null, username: from.username ?? null };
  }
  if (value.username) return { userId: null, username: value.username };
  return { userId: null, username: null };
}

export function parseCommentEvents(payload: unknown): InstagramCommentEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as RawPayload;
  const events: InstagramCommentEvent[] = [];

  // Normalize to an array of change values. The live Meta envelope is
  // entry[].changes[].value, but a bare `value` object (e.g. a single
  // comment snippet) is also accepted for testing.
  const changes: RawChange[] = [];
  if (Array.isArray(p.entry)) {
    for (const entry of p.entry) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "comments" && change.field !== "comment") continue;
        if (change.value) changes.push(change);
      }
    }
  } else {
    // bare value payload: treat the whole object as one comment `value`
    const v = p as unknown as RawChange["value"];
    if (v && (v.comment_id || (v as { id?: string }).id)) {
      changes.push({ field: "comments", value: v });
    }
  }

  for (const change of changes) {
    const v = change.value!;
    // Real Meta payload nests media under value.media.id; older stubs use
    // value.media_id. Fall back to entry.id only if neither is present.
    const mediaId =
      v.media_id ?? v.media?.id ?? p.entry?.[0]?.id ?? "";
    const commentId = v.comment_id ?? v.id ?? "";
    const { userId, username } = extractAuthor(v);
    const text = v.text ?? "";

    if (!commentId || !username) continue; // need both to act

    events.push({ commentId, userId, username, text, mediaId });
  }
  return events;
}
