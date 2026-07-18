/**
 * Trigger / eligibility validation for comments.
 */

export function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Returns true when the comment contains at least one of the configured
 * trigger terms. The default trigger is the seed emoji 🌱.
 */
export function isEligibleComment(text: string, triggers: string[]): boolean {
  const normalized = normalizeText(text);
  return triggers.some((t) => normalized.includes(t.trim().toLowerCase()));
}

export const DEFAULT_TRIGGERS = ["🌱"];

export function parseTriggerTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const out = raw.filter((x) => typeof x === "string" && x.length > 0);
    return out.length ? (out as string[]) : DEFAULT_TRIGGERS;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseTriggerTerms(parsed);
    } catch {
      // not JSON — treat the whole string as a single trigger term
    }
    return raw.length ? [raw] : DEFAULT_TRIGGERS;
  }
  return DEFAULT_TRIGGERS;
}
