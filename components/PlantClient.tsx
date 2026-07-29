"use client";

import { useCallback, useMemo, useState } from "react";
import { CampaignHeader, NewestLeafBanner } from "@/components/CampaignHeader";
import { PlantCanvas } from "@/components/PlantCanvas";
import { JoinInstructions } from "@/components/JoinInstructions";
import { LeafSearch } from "@/components/LeafSearch";
import { usePlantStream, type LiveLeaf } from "@/lib/realtime/subscribe";
import type { LeafData } from "@/components/Leaf";
import { LEAF_ANCHORS } from "@/lib/plant/anchors";

export function PlantClient({
  slug,
  title,
  campaignName,
  instagramPermalink,
  triggerTerms,
  initialLeaves,
  initialTotal,
  initialStageLabel,
  initialNextMilestone,
  initialLatestUsername,
}: {
  slug: string;
  title?: string;
  campaignName: string;
  instagramPermalink: string;
  triggerTerms: string[];
  initialLeaves: LeafData[];
  initialTotal: number;
  initialStageLabel: string;
  initialNextMilestone: number | null;
  initialLatestUsername: string | null;
}) {
  const [leaves, setLeaves] = useState<LeafData[]>(initialLeaves);
  const [latestLeafId, setLatestLeafId] = useState<string | null>(null);
  const [highlightedLeafId, setHighlightedLeafId] = useState<string | null>(null);
  const [latestUsername, setLatestUsername] = useState<string | null>(initialLatestUsername);
  const [selected, setSelected] = useState<LeafData | null>(null);

  const trigger = triggerTerms[0] ?? "🌱";

  const onLeaf = useCallback((leaf: LiveLeaf) => {
    setLeaves((cur) => {
      if (cur.some((l) => l.id === leaf.id)) return cur;
      return [...cur, leaf];
    });
    setLatestLeafId(leaf.id);
    setLatestUsername(leaf.username);
    window.setTimeout(() => setLatestLeafId(null), 5000);
  }, []);

  const { connected } = usePlantStream(slug, onLeaf, initialLeaves.map((l) => l.id));

  const total = leaves.length;
  const stage = useMemo(() => {
    // recompute stage purely from count to stay in sync client-side
    if (total <= 0) return "Seed";
    if (total <= 5) return "Sprout";
    if (total <= 15) return "Small Plant";
    if (total <= 30) return "Branched Plant";
    if (total <= 50) return "Young Tree";
    if (total <= 100) return "Flowering Tree";
    if (total <= 250) return "Community Tree";
    if (total <= 500) return "Magical Tree";
    return "Forest";
  }, [total]);

  const nextMilestone = useMemo(() => {
    for (const m of [25, 50, 100, 250, 500]) if (total < m) return m;
    return null;
  }, [total]);

  const onFound = useCallback((leaf: LeafData) => {
    setHighlightedLeafId(leaf.id);
    setSelected(leaf);
  }, []);

  const onClearHighlight = useCallback(() => setHighlightedLeafId(null), []);

  const onSelectLeaf = useCallback((leaf: LeafData) => setSelected(leaf), []);

  return (
    <main className="flex min-h-screen w-screen flex-col items-center overflow-x-hidden pb-16">
      <CampaignHeader
        name={campaignName}
        title={title}
        totalLeaves={total}
        stageLabel={stage}
        nextMilestone={nextMilestone}
      />
      <NewestLeafBanner username={latestUsername} />

      <div className="mt-4 flex justify-center">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-medium ${connected ? "bg-leaf/15 text-leaf-dark" : "bg-amber-100 text-amber-800"
            }`}
        >
          {connected ? "● Live updates on" : "○ Live paused (polling)"}
        </span>
      </div>

      <PlantCanvas
        stage={stage.toLowerCase().replace(/\s+/g, "-")}
        leaves={leaves}
        latestLeafId={latestLeafId}
        highlightedLeafId={highlightedLeafId}
        onSelectLeaf={onSelectLeaf}
      />

      <LeafSearch leaves={leaves} onFound={onFound} onClear={onClearHighlight} />
      <JoinInstructions instagramPermalink={instagramPermalink} trigger={trigger} />

      {selected && (
        <LeafDetail leaf={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function LeafDetail({ leaf, onClose }: { leaf: LeafData; onClose: () => void }) {
  const joined = new Date(leaf.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">@{leaf.username}</h3>
        <p className="mt-1 text-sm text-bark/70">Joined the plant on {joined}</p>
        <p className="mt-2 text-xs text-bark/50">
          Leaf #{leaf.anchorIndex + 1} · style {leaf.leafStyle + 1}
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-dark"
        >
          Close
        </button>
      </div>
    </div>
  );
}
