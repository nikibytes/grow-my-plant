// Deterministic leaf placement along an extracted branch skeleton.
// Pure function of (leaf index, stage) — SAME leaf always lands in the SAME
// spot, so search/zoom and refresh are stable. Replaces the old area-biased
// pixel sampling (detect_slots.py) and the non-deterministic random snippet.
//
// Model: each branch segment carries a `level` (graph hops from trunk base);
// weight = length * (level+1)^2 so thin outer branches get denser foliage than
// the thick trunk. Leaves are placed along each segment with tip bias (t:0.4→1)
// and spread perpendicular to the branch direction (no radial-circle artifact).

import type { BranchSeg, Slot } from "./growthStagesTypes";

// Small fast deterministic PRNG (mulberry32) seeded by the leaf index.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_DIST = 13; // px — reject placements closer than this (anti-overlap)

// Largest-remainder apportionment so per-branch counts sum to exactly `total`.
function allocate(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const floor = raw.map((n) => Math.floor(n));
  let rem = total - floor.reduce((a, b) => a + b, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floor.slice();
  for (let k = 0; k < order.length && rem > 0; k++) {
    out[order[k].i] += 1;
    rem--;
  }
  return out;
}

export function placeLeaves(
  branches: BranchSeg[],
  totalLeaves: number,
  startIndex = 0,
  opts?: { vh?: number; soilBand?: number }
): Slot[] {
  if (branches.length === 0) return [];
  const soilY = opts?.vh != null ? opts.vh - (opts.soilBand ?? 40) : Infinity;
  const weights = branches.map((b) => {
    const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    return len * Math.pow(b.level + 1, 2);
  });
  const counts = allocate(weights, totalLeaves);

  const leaves: Slot[] = [];
  const placed: { x: number; y: number }[] = [];

  branches.forEach((b, bi) => {
    const n = counts[bi];
    if (n <= 0) return;
    const dx = b.x2 - b.x1;
    const dy = b.y2 - b.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; // unit normal (perpendicular to branch)
    const ny = dx / len;
    const ux = dx / len; // unit along
    const uy = dy / len;

    let made = 0;
    let guard = 0;
    while (made < n && guard < n * 12) {
      guard++;
      const seed = (startIndex + leaves.length) * 2654435761 + bi * 40503 + made * 97 + 7;
      const r = rng(seed);
      const t = 0.4 + r() * 0.6; // bias toward the branch tip
      const along = (r() - 0.5) * 10;
      const spread = (r() - 0.5) * 26;
      const bx = b.x1 + ux * (t * len) + ux * along;
      const by = b.y1 + uy * (t * len) + uy * along;
      const x = Math.round(bx + nx * spread);
      const y = Math.round(by + ny * spread);
      // overlap rejection + keep leaves off the soil mound (trunk-base segs)
      if (y > soilY) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DIST)) continue;
      placed.push({ x, y });
      // leaf angle follows the branch direction + a little jitter
      const baseAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const angle = Math.round(baseAngle + (r() - 0.5) * 40);
      leaves.push({ x, y, angle });
      made++;
    }
    // if guard tripped, fill remaining without rejection to avoid infinite loop
    while (made < n) {
      const seed = (startIndex + leaves.length) * 2654435761 + bi * 40503 + made * 97 + 31;
      const r = rng(seed);
      const t = 0.4 + r() * 0.6;
      const along = (r() - 0.5) * 10;
      const spread = (r() - 0.5) * 26;
      const bx = b.x1 + ux * (t * len) + ux * along;
      const by = b.y1 + uy * (t * len) + uy * along;
      const x = Math.round(bx + nx * spread);
      const y = Math.round(by + ny * spread);
      const baseAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const angle = Math.round(baseAngle + (r() - 0.5) * 40);
      leaves.push({ x, y, angle });
      made++;
    }
  });

  return leaves;
}
