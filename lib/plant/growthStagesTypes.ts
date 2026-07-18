// Shared types for the tree growth-stage system.
// Single source of truth for stage geometry lives in growthStages.ts.

export type Slot = { x: number; y: number; angle: number };

/** A branch centerline segment (from the auto-extracted skeleton), 640x700 coords. */
export type BranchSeg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Graph hops from the trunk base; higher = thinner/outer branch = more leaves. */
  level: number;
};

export type GrowthStage = {
  /** Stable id, e.g. "stage-3". */
  id: string;
  /** Human label shown in the UI, e.g. "young tree". */
  name: string;
  /** Comment/leaf count required to ENTER this stage (inclusive). Ordered ascending. */
  minComments: number;
  /** Transparent tree PNG under /public, drawn as an SVG <image> in the 640x700 viewBox. */
  img: string;
  /** Canopy bounding ellipse for overflow-leaf placement (in 640x700 coords). */
  canopy: { cx: number; cy: number; rx: number; ry: number };
  /** Hand/auto leaf-anchor points for this specific tree shape. */
  slots: Slot[];
};
