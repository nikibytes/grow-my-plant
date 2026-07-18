/**
 * Deterministic leaf-style assignment. The same user ALWAYS gets the same leaf
 * silhouette, so the plant is stable across reloads and re-comments.
 *
 * We hash a stable key (Instagram user id, falling back to username) and map it
 * into the available style count.
 */

export const LEAF_STYLE_COUNT = 20;

/** Small, fast, dependency-free string hash (FNV-1a style). */
export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function calculateLeafStyle(stableKey: string): number {
  const h = hashString(stableKey);
  return h % LEAF_STYLE_COUNT;
}
