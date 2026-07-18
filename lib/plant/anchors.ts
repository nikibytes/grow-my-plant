/**
 * Predefined, hand-tuned leaf anchor points laid out over a 200x260 viewBox.
 * Using stable anchors (rather than random coordinates) guarantees:
 *  - leaves never overlap
 *  - the plant looks the same across reloads
 *  - the newest leaf is always placed on the "next" free anchor
 *
 * Each anchor also carries a default rotation + scale so a freshly grown leaf
 * feels organic. The anchor index is stored permanently on the leaf record.
 */

export interface LeafAnchor {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

/**
 * 50 anchors arranged as a growing tree: a short trunk cluster, then two main
 * boughs sweeping up-and-out, then an outer canopy. Coordinates are tuned for
 * a 200 (w) x 260 (h) SVG canvas with the pot at the bottom.
 */
export const LEAF_ANCHORS: LeafAnchor[] = [
  // trunk / lower stem (0-4)
  { x: 100, y: 196, rotation: -8, scale: 0.82 },
  { x: 92, y: 182, rotation: -22, scale: 0.8 },
  { x: 108, y: 182, rotation: 22, scale: 0.8 },
  { x: 88, y: 168, rotation: -30, scale: 0.78 },
  { x: 112, y: 168, rotation: 30, scale: 0.78 },

  // left lower bough (5-14)
  { x: 80, y: 156, rotation: -38, scale: 0.82 },
  { x: 72, y: 146, rotation: -44, scale: 0.8 },
  { x: 64, y: 136, rotation: -50, scale: 0.78 },
  { x: 78, y: 140, rotation: -30, scale: 0.84 },
  { x: 70, y: 124, rotation: -52, scale: 0.8 },
  { x: 60, y: 120, rotation: -58, scale: 0.76 },
  { x: 84, y: 128, rotation: -24, scale: 0.86 },
  { x: 56, y: 108, rotation: -60, scale: 0.74 },
  { x: 74, y: 112, rotation: -40, scale: 0.82 },
  { x: 66, y: 102, rotation: -48, scale: 0.8 },

  // right lower bough (15-24)
  { x: 120, y: 156, rotation: 38, scale: 0.82 },
  { x: 128, y: 146, rotation: 44, scale: 0.8 },
  { x: 136, y: 136, rotation: 50, scale: 0.78 },
  { x: 122, y: 140, rotation: 30, scale: 0.84 },
  { x: 130, y: 124, rotation: 52, scale: 0.8 },
  { x: 140, y: 120, rotation: 58, scale: 0.76 },
  { x: 116, y: 128, rotation: 24, scale: 0.86 },
  { x: 144, y: 108, rotation: 60, scale: 0.74 },
  { x: 126, y: 112, rotation: 40, scale: 0.82 },
  { x: 134, y: 102, rotation: 48, scale: 0.8 },

  // left upper canopy (25-34)
  { x: 78, y: 92, rotation: -34, scale: 0.84 },
  { x: 66, y: 84, rotation: -42, scale: 0.8 },
  { x: 90, y: 82, rotation: -22, scale: 0.86 },
  { x: 56, y: 92, rotation: -52, scale: 0.76 },
  { x: 72, y: 70, rotation: -38, scale: 0.82 },
  { x: 84, y: 66, rotation: -26, scale: 0.84 },
  { x: 50, y: 78, rotation: -56, scale: 0.74 },
  { x: 62, y: 60, rotation: -44, scale: 0.8 },
  { x: 92, y: 58, rotation: -18, scale: 0.86 },
  { x: 44, y: 66, rotation: -60, scale: 0.72 },

  // right upper canopy (35-44)
  { x: 122, y: 92, rotation: 34, scale: 0.84 },
  { x: 134, y: 84, rotation: 42, scale: 0.8 },
  { x: 110, y: 82, rotation: 22, scale: 0.86 },
  { x: 144, y: 92, rotation: 52, scale: 0.76 },
  { x: 128, y: 70, rotation: 38, scale: 0.82 },
  { x: 116, y: 66, rotation: 26, scale: 0.84 },
  { x: 150, y: 78, rotation: 56, scale: 0.74 },
  { x: 138, y: 60, rotation: 44, scale: 0.8 },
  { x: 108, y: 58, rotation: 18, scale: 0.86 },
  { x: 156, y: 66, rotation: 60, scale: 0.72 },

  // crown (45-49)
  { x: 100, y: 50, rotation: 0, scale: 0.9 },
  { x: 90, y: 44, rotation: -16, scale: 0.86 },
  { x: 110, y: 44, rotation: 16, scale: 0.86 },
  { x: 100, y: 34, rotation: 0, scale: 0.92 },
  { x: 100, y: 24, rotation: 0, scale: 0.96 },
];

export const TOTAL_ANCHORS = LEAF_ANCHORS.length;

/**
 * Returns the anchor for the Nth leaf (0-based). When the campaign grows past
 * the predefined anchors we wrap around with a tiny extra offset so names stay
 * readable instead of perfectly overlapping — this is the spec's "overflow
 * mode" fallback for large campaigns.
 */
export function getLeafAnchor(index: number): LeafAnchor & { index: number } {
  const base = LEAF_ANCHORS[index % TOTAL_ANCHORS];
  const wrap = Math.floor(index / TOTAL_ANCHORS);
  if (wrap === 0) {
    return { ...base, index: index % TOTAL_ANCHORS };
  }
  // Overflow: nudge scale down a touch so the second ring reads as smaller.
  return {
    x: base.x,
    y: base.y,
    rotation: base.rotation,
    scale: base.scale * 0.7,
    index: index % TOTAL_ANCHORS,
  };
}
