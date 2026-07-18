/**
 * Admin authentication helper. The dashboard and mutating endpoints are
 * protected by a shared ADMIN_SECRET passed via the `x-admin-secret` header
 * (or `?admin_secret=` query param). In production you'd wire this to a real
 * auth provider; the secret check is the minimum gate the spec requires.
 */

import { config } from "@/lib/config";

export function isAuthorized(headers: Headers, searchParams?: URLSearchParams): boolean {
  const headerSecret = headers.get("x-admin-secret");
  const querySecret = searchParams?.get("admin_secret");
  const provided = headerSecret ?? querySecret;
  if (!provided) return false;
  // constant-time-ish compare (good enough for a shared secret gate)
  const a = String(provided);
  const b = String(config.adminSecret);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export const UNAUTHORIZED = { error: "unauthorized" } as const;
