// Deterministic, STABLE leaf placement along extracted branch skeletons.
//
// KEY INVARIANT: leaf[i]'s position is a pure function of (branches, i).
// Adding leaf[i+1] must never move any leaf 0..i.
//
// Strategy:
//   1. Pre-build cumulative weighted branch selection table (ordered by
//      descending branch weight: outer/thinner = more foliage). This table
//      is fixed for a given stage skeleton.
//   2. For each leaf index i, deterministically pick a branch using a
//      weighted random selection seeded by i alone — no global allocation
//      that changes with total count.
//   3. Place the leaf along the chosen branch, seeded by i.
//   4. Reject placements below the soil line or overlapping existing leaves.
//      On rejection, cycle through the remaining branches (still deterministic).
//
// This guarantees existing leaf positions never change as new leaves arrive.

import type { BranchSeg, Slot } from "./growthStagesTypes";

/** Small fast deterministic PRNG (mulberry32) seeded by a 32-bit integer. */
function rng(seed: number) {
  let a = (seed >>> 0) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_DIST = 14; // px minimum gap between leaf centres (anti-overlap)

/** Place a single leaf on branch `b` in a structured, alternating pattern. */
function placeStructuredOnBranch(
  b: BranchSeg,
  countOnBranch: number,
  r: () => number
): { x: number; y: number; angle: number } {
  const dx = b.x2 - b.x1;
  const dy = b.y2 - b.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // unit normal (perpendicular to branch)
  const ny = dx / len;
  const ux = dx / len; // unit along branch
  const uy = dy / len;

  // Alternate sides (0=right, 1=left, 2=right...)
  const side = countOnBranch % 2 === 0 ? 1 : -1;
  
  // Start near the tip (t=0.95) and work downwards. Tighter spacing for denser branches.
  const pairIdx = Math.floor(countOnBranch / 2);
  const spacing = 15 / len; // t-units per 15px
  
  let t = 0.95 - (pairIdx * spacing);
  
  // If we run out of branch length, scatter along the branch
  if (t < 0.1) t = 0.1 + r() * 0.8;

  // Small outward spread to attach to the branch side
  const spread = side * (8 + r() * 4); // 8-12px outward

  const x = Math.round(b.x1 + ux * (t * len) + nx * spread);
  const y = Math.round(b.y1 + uy * (t * len) + ny * spread);

  // Angle points outward and slightly upward. Very little jitter for a clean look.
  const baseAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const angle = Math.round(baseAngle + side * 45 + (r() - 0.5) * 5);

  return { x, y, angle };
}

export function placeLeaves(
  branches: BranchSeg[],
  totalLeaves: number,
  startIndex = 0,
  opts?: { vh?: number; soilBand?: number; canopy?: { cx: number; cy: number; rx: number; ry: number } }
): Slot[] {
  if (branches.length === 0 || totalLeaves === 0) return [];

  // Soil boundary: reject any leaf whose y falls at or below this.
  const soilY =
    opts?.vh != null ? opts.vh - (opts.soilBand ?? 44) : Infinity;

  // Per-branch weights: longer + outer (higher level) branches get more leaves.
  const bWeights = branches.map((b) => {
    const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    return len * Math.pow(b.level + 1, 2);
  });
  const totalWeight = bWeights.reduce((a, b) => a + b, 0) || 1;

  // Cumulative distribution for weighted branch selection.
  const cumulative: number[] = [];
  let cum = 0;
  for (const w of bWeights) {
    cum += w / totalWeight;
    cumulative.push(cum);
  }

  function pickBranch(v: number): number {
    for (let k = 0; k < cumulative.length; k++) {
      if (v <= cumulative[k]) return k;
    }
    return cumulative.length - 1;
  }

  const slots: Slot[] = [];
  const placed: { x: number; y: number }[] = [];
  const branchCounts = new Array(branches.length).fill(0);

  for (let i = 0; i < totalLeaves; i++) {
    const leafIdx = startIndex + i;

    // Primary seed is a pure function of this leaf index only.
    const seedBase = (leafIdx * 2654435761) >>> 0;
    const r0 = rng(seedBase);
    const preferredBranch = pickBranch(r0());

    let placed_ok = false;

    // Try preferred branch first, then cycle through remaining branches.
    for (let attempt = 0; attempt < branches.length; attempt++) {
      const bi = (preferredBranch + attempt) % branches.length;
      const r = rng((seedBase + attempt * 997 + bi * 40503 + 1) >>> 0);
      const { x, y, angle } = placeStructuredOnBranch(branches[bi], branchCounts[bi], r);

      if (y > soilY) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DIST)) continue;

      placed.push({ x, y });
      slots.push({ x, y, angle });
      branchCounts[bi]++;
      placed_ok = true;
      break;
    }

    if (!placed_ok) {
      // Dense tree: relax overlap but keep soil guard.
      for (let attempt = 0; attempt < branches.length; attempt++) {
          const bi = (preferredBranch + attempt) % branches.length;
          const r = rng((seedBase + attempt * 997 + bi * 40503 + 99) >>> 0);
          const { x, y, angle } = placeStructuredOnBranch(branches[bi], branchCounts[bi], r);
          if (y <= soilY) {
            placed.push({ x, y });
            slots.push({ x, y, angle });
            branchCounts[bi]++;
            placed_ok = true;
            break;
          }
        }
        if (!placed_ok) {
          const r = rng((seedBase + 9999) >>> 0);
          const bi = preferredBranch;
          const { x, y, angle } = placeStructuredOnBranch(branches[bi], branchCounts[bi], r);
          placed.push({ x, y });
          slots.push({ x, y, angle });
          branchCounts[bi]++;
        }
      }
    }

  return slots;
}
