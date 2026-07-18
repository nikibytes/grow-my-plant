/**
 * Lightweight realtime hub.
 *
 * The spec's preferred path is Supabase Realtime, but to keep the LOCAL build
 * working with zero external services we implement a tiny in-process
 * Server-Sent Events (SSE) broadcast. When running a single Node server this
 * works perfectly for live leaf updates. In multi-instance production you'd
 * swap this for Supabase Realtime / Ably / Pusher (same subscribe interface).
 *
 * The frontend subscribes via EventSource to /api/stream/[slug]; if SSE fails
 * it transparently falls back to polling /api/campaigns/[slug]/leaves.
 */

import type { Leaf } from "@/lib/types";

type Listener = (leaf: Leaf) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(campaignId: string, listener: Listener): () => void {
  let set = channels.get(campaignId);
  if (!set) {
    set = new Set();
    channels.set(campaignId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) channels.delete(campaignId);
  };
}

export function broadcastLeaf(campaignId: string, leaf: Leaf): void {
  const set = channels.get(campaignId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(leaf);
    } catch {
      // a broken listener must not take down the broadcast
    }
  }
}
