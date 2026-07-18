"use client";

import { useEffect, useRef, useState } from "react";
import type { LeafData } from "@/components/Leaf";

/**
 * Subscribes to live leaf updates for a campaign.
 *  - Preferred: Server-Sent Events via /api/stream/[slug]
 *  - Fallback: poll /api/campaigns/[slug]/leaves every 5s if SSE errors
 *
 * Returns the full, de-duplicated leaf list plus the id of the most recently
 * arrived leaf (for the "new leaf" animation). Database is the source of truth
 * — a refresh always snaps to current state.
 */

export function useLiveLeaves(slug: string, initial: LeafData[]) {
  const [leaves, setLeaves] = useState<LeafData[]>(initial);
  const [latestLeafId, setLatestLeafId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const knownIds = useRef<Set<string>>(new Set(initial.map((l) => l.id)));
  const latestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashLatest(id: string) {
    setLatestLeafId(id);
    if (latestTimer.current) clearTimeout(latestTimer.current);
    latestTimer.current = setTimeout(() => setLatestLeafId(null), 5000);
  }

  // polling fallback
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/campaigns/${slug}/leaves`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: LeafData[] = data.leaves.map((l: any) => ({
          id: l.id,
          username: l.username,
          displayUsername: l.displayUsername,
          leafStyle: l.leafStyle,
          anchorIndex: l.anchorIndex,
          rotation: l.rotation,
          scale: l.scale,
          createdAt: l.createdAt,
        }));
        if (!alive) return;
        const merged = mergeLeaves(incoming);
        setLeaves(merged);
      } catch {
        /* ignore poll errors */
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [slug]);

  // SSE primary
  useEffect(() => {
    let alive = true;
    try {
      const es = new EventSource(`/api/stream/${slug}`);
      esRef.current = es;
      es.addEventListener("leaf", (ev) => {
        try {
          const l = JSON.parse((ev as MessageEvent).data);
          if (knownIds.current.has(l.id)) return;
          knownIds.current.add(l.id);
          const leaf: LeafData = {
            id: l.id,
            username: l.username,
            displayUsername: l.displayUsername,
            leafStyle: l.leafStyle,
            anchorIndex: l.anchorIndex,
            rotation: l.rotation,
            scale: l.scale,
            createdAt: l.createdAt,
          };
          setLeaves((prev) => mergeLeaves([...prev, leaf]));
          flashLatest(l.id);
        } catch {
          /* ignore malformed */
        }
      });
      es.onopen = () => alive && setConnected(true);
      es.onerror = () => {
        // EventSource auto-reconnects; polling fallback covers gaps.
        setConnected(false);
      };
    } catch {
      /* SSE unsupported — polling remains */
    }
    return () => {
      alive = false;
      esRef.current?.close();
    };
  }, [slug]);

  return { leaves, latestLeafId, connected };
}

/** Merge by id, preferring the existing record to keep stable anchor/style. */
function mergeLeaves(incoming: LeafData[]): LeafData[] {
  const map = new Map<string, LeafData>();
  for (const l of incoming) map.set(l.id, l);
  return Array.from(map.values()).sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );
}
