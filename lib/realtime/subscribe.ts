"use client";

/**
 * Client-side realtime subscription. Prefers Server-Sent Events (SSE) against
 * /api/stream/[slug]; on failure transparently falls back to polling the
 * leaves endpoint every few seconds. Returns the latest leaf as it arrives.
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

export function usePlantStream(slug: string, onLeaf: (leaf: LiveLeaf) => void) {
  const [connected, setConnected] = useState(false);
  const onLeafRef = useRef(onLeaf);
  onLeafRef.current = onLeaf;

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const startPolling = (knownIds: Set<string>) => {
      pollTimer = setInterval(async () => {
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
          /* ignore, will retry */
        }
      }, 5000);
    };

    const knownIds = new Set<string>();

    try {
      es = new EventSource(`/api/stream/${slug}`);
      es.addEventListener("ready", () => !cancelled && setConnected(true));
      es.addEventListener("leaf", (e) => {
        if (cancelled) return;
        try {
          const leaf = JSON.parse((e as MessageEvent).data) as LiveLeaf;
          knownIds.add(leaf.id);
          onLeafRef.current(leaf);
        } catch {
          /* ignore malformed */
        }
      });
      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        es?.close();
        es = null;
        startPolling(knownIds);
      };
    } catch {
      startPolling(knownIds);
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [slug]);

  return { connected };
}
