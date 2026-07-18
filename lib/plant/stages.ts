/**
 * Plant growth model. The stage is a pure function of the number of *visible*
 * leaves. Keeping it deterministic means it can be recomputed on the client
 * without ever disagreeing with the server.
 */

export type PlantStage =
  | "seed"
  | "sprout"
  | "small-plant"
  | "branched-plant"
  | "young-tree"
  | "flowering-tree"
  | "community-tree"
  | "magical-tree"
  | "forest";

export interface StageInfo {
  stage: PlantStage;
  label: string;
  /** Inclusive upper bound of leaves for this stage. */
  max: number;
}

export const STAGE_ORDER: StageInfo[] = [
  { stage: "seed", label: "Seed", max: 0 },
  { stage: "sprout", label: "Sprout", max: 5 },
  { stage: "small-plant", label: "Small Plant", max: 15 },
  { stage: "branched-plant", label: "Branched Plant", max: 30 },
  { stage: "young-tree", label: "Young Tree", max: 50 },
  { stage: "flowering-tree", label: "Flowering Tree", max: 100 },
  { stage: "community-tree", label: "Community Tree", max: 250 },
  { stage: "magical-tree", label: "Magical Tree", max: 500 },
  { stage: "forest", label: "Forest", max: Number.POSITIVE_INFINITY },
];

export function calculatePlantStage(totalLeaves: number): PlantStage {
  if (totalLeaves <= 0) return "seed";
  if (totalLeaves <= 5) return "sprout";
  if (totalLeaves <= 15) return "small-plant";
  if (totalLeaves <= 30) return "branched-plant";
  if (totalLeaves <= 50) return "young-tree";
  if (totalLeaves <= 100) return "flowering-tree";
  if (totalLeaves <= 250) return "community-tree";
  if (totalLeaves <= 500) return "magical-tree";
  return "forest";
}

export function stageLabel(stage: PlantStage): string {
  return STAGE_ORDER.find((s) => s.stage === stage)?.label ?? stage;
}

/**
 * Milestone targets from the spec. Used for progress indicators toward the
 * next plant evolution and (later) Instagram profile-picture updates.
 */
export const MILESTONES = [25, 50, 100, 250, 500] as const;

export function nextMilestone(totalLeaves: number): number | null {
  for (const m of MILESTONES) {
    if (totalLeaves < m) return m;
  }
  return null;
}
