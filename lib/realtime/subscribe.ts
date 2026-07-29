"use client";

/**
 * Client-side realtime subscription. Uses Server-Sent Events (SSE) for instant
 * push delivery AND polls /api/campaigns/[slug]/leaves every 5 s as a reliable
 * safety net. In Next.js dev mode, the in-process SSE hub can't broadcast
 * across isolated module instances, so polling guarantees updates always arrive.
 */

import { useEffect, useRef, useState } from "react";

export interface LiveLeaf {
  id: string;
  username: string;
  displayUsername: string;
  leafStyle: number;
  anchorIndex: number;
  rotation: number | null;
  scale: number | null;
  createdAt: string;
}

export function usePlantStream(
  slug: string,
  onLeaf: (leaf: LiveLeaf) => void,
  initialLeafIds?: string[],
) {
  const [connected, setConnected] = useState(false);
  const onLeafRef = useRef(onLeaf);
  onLeafRef.current = onLeaf;

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    // Seed with IDs already rendered server-side so we don't re-fire them.
    const knownIds = new Set<string>(initialLeafIds ?? []);

    const poll = async () => {
      try {
        const res = await fetch(`/api/campaigns/${slug}/leaves`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data.leaves)) return;
        for (const l of data.leaves as LiveLeaf[]) {
          if (!knownIds.has(l.id)) {
            knownIds.add(l.id);
            onLeafRef.current(l);
          }
        }
      } catch {
        /* ignore, will retry next tick */
      }
    };

    // Always poll every 2.5 s — works even when SSE broadcast is broken in dev.
    poll();
    pollTimer = setInterval(poll, 2500);

    // Also try SSE for instant push when it works (production / single process).
    try {
      es = new EventSource(`/api/stream/${slug}`);
      es.addEventListener("ready", () => !cancelled && setConnected(true));
      es.addEventListener("leaf", (e) => {
        if (cancelled) return;
        try {
          const leaf = JSON.parse((e as MessageEvent).data) as LiveLeaf;
          if (!knownIds.has(leaf.id)) {
            knownIds.add(leaf.id);
            onLeafRef.current(leaf);
          }
        } catch {
          /* ignore malformed */
        }
      });
      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        es?.close();
        es = null;
      };
    } catch {
      /* EventSource not supported — polling handles it */
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return { connected };
}
