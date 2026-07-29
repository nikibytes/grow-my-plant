"use client";

import { useEffect, useRef, useState } from "react";
import { LEAF_ANCHORS } from "@/lib/plant/anchors";
import { Leaf, type LeafData } from "./Leaf";

/**
 * Renders the tree backdrop + all leaves on a fixed 200x260 viewBox, scaled to
 * fit its container. New leaves animate in; a highlighted leaf (deep-linked or
 * searched) gets a persistent glow.
 */
export function PlantCanvas({
  stage,
  leaves,
  latestLeafId,
  highlightedLeafId,
  onSelectLeaf,
}: {
  stage: string;
  leaves: LeafData[];
  latestLeafId: string | null;
  highlightedLeafId?: string | null;
  onSelectLeaf?: (leaf: LeafData) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-[200/300]">
      <svg
        ref={svgRef}
        viewBox="0 0 200 300"
        className="w-full h-full drop-shadow-sm"
        role="img"
        aria-label="Community plant"
      >
        {/* sky / soil backdrop */}
        <defs>
          <radialGradient id="canopy" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f3fff6" />
            <stop offset="100%" stopColor="#dff5e6" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="200" height="300" fill="url(#canopy)" rx="18" />

        {/* pot + soil */}
        <ellipse cx="100" cy="262" rx="44" ry="10" fill="#7a5236" />
        <path d="M62 262 L72 296 L128 296 L138 262 Z" fill="#8d6240" />
        <rect x="60" y="256" width="80" height="10" rx="4" fill="#6d4c41" />

        {/* trunk — grows with stage */}
        <Trunk stage={stage} />

        {/* leaves */}
        {leaves.map((leaf) => {
          const anchor = LEAF_ANCHORS[leaf.anchorIndex % LEAF_ANCHORS.length];
          if (!anchor) return null;
          return (
            <Leaf
              key={leaf.id}
              leaf={leaf}
              anchor={anchor}
              isNew={leaf.id === latestLeafId}
              highlighted={leaf.id === highlightedLeafId}
              onSelect={onSelectLeaf}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Trunk({ stage }: { stage: string }) {
  // The trunk is always present; it visually lengthens with the stage.
  const heights: Record<string, number> = {
    seed: 0,
    sprout: 14,
    "small-plant": 30,
    "branched-plant": 48,
    "young-tree": 64,
    "flowering-tree": 95,
    "community-tree": 92,
    "magical-tree": 104,
    forest: 116,
  };
  const h = heights[stage] ?? 60;
  const topY = 256 - h;
  return (
    <g>
      <path
        d={`M94 ${256} L96 ${topY} Q100 ${topY - 6} 104 ${topY} L106 ${256} Z`}
        fill="#6d4c41"
      />
      {/* primary boughs appear from small-plant onward */}
      {(heights[stage] ?? 0) > 26 && (
        <>
          <path d="M98 220 Q80 200 70 184" stroke="#6d4c41" strokeWidth="4" fill="none" />
          <path d="M102 220 Q120 200 130 184" stroke="#6d4c41" strokeWidth="4" fill="none" />
        </>
      )}
      {(heights[stage] ?? 0) > 44 && (
        <>
          <path d="M99 196 Q86 178 76 162" stroke="#6d4c41" strokeWidth="3.4" fill="none" />
          <path d="M101 196 Q114 178 124 162" stroke="#6d4c41" strokeWidth="3.4" fill="none" />
        </>
      )}
      {(heights[stage] ?? 0) > 60 && (
        <>
          <path d="M100 176 Q92 158 88 142" stroke="#6d4c41" strokeWidth="3" fill="none" />
          <path d="M100 176 Q108 158 112 142" stroke="#6d4c41" strokeWidth="3" fill="none" />
        </>
      )}
    </g>
  );
}
