import type { Leaf } from "@/lib/types";

/**
 * createLeaf output type. Kept tiny + explicit so it can be reused by the
 * Instagram module without importing the whole service.
 */
export interface CreateLeafResult {
  created: boolean;
  leaf?: Leaf;
  reason?: string;
}
