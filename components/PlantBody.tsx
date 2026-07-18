"use client";

/**
 * The static plant body (pot + trunk + branch skeleton). Leaves are layered on
 * top by PlantCanvas. The structure is drawn for a 200 x 260 viewBox.
 */

export function PlantBody({ stage }: { stage: string }) {
  // Branch length / fullness scales subtly with the stage for a "growing" feel.
  const trunkH = stage === "seed" ? 8 : stage === "sprout" ? 28 : 150;
  const showBranches = stage !== "seed" && stage !== "sprout";

  return (
    <g>
      {/* Pot */}
      <path d="M70 232 L130 232 L122 258 L78 258 Z" fill="#b9764a" />
      <rect x="66" y="224" width="68" height="12" rx="4" fill="#c98a5c" />

      {/* Soil */}
      <ellipse cx="100" cy="226" rx="30" ry="5" fill="#5b3a25" />

      {/* Trunk */}
      <rect
        x="94"
        y={232 - trunkH}
        width="12"
        height={trunkH}
        rx="5"
        fill="#8a5a36"
      />

      {showBranches && (
        <g stroke="#8a5a36" strokeWidth="7" strokeLinecap="round" fill="none">
          {/* left boughs */}
          <path d="M100 150 C80 140 64 130 52 110" />
          <path d="M100 168 C82 162 70 150 58 132" />
          {/* right boughs */}
          <path d="M100 150 C120 140 136 130 148 110" />
          <path d="M100 168 C118 162 130 150 142 132" />
          {/* upper crown */}
          <path d="M100 120 C92 100 92 80 100 60" />
          <path d="M100 120 C80 110 72 92 76 74" />
          <path d="M100 120 C120 110 128 92 124 74" />
        </g>
      )}

      {stage === "seed" && (
        <g>
          {/* a little seed sitting in the soil */}
          <ellipse cx="100" cy="222" rx="6" ry="8" fill="#caa472" />
          <path d="M100 214 C100 206 104 202 108 202" stroke="#4caf50" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {stage === "sprout" && (
        <path d="M100 204 C100 190 96 182 88 180 C96 184 100 192 100 204 Z" fill="#6fbf73" />
      )}
    </g>
  );
}
