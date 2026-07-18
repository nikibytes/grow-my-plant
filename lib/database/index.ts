/**
 * Repository factory. Picks the backend based on DATABASE_PROVIDER:
 *   - "supabase"  → SupabaseRepo (requires NEXT_PUBLIC_SUPABASE_URL + service role key)
 *   - anything else → SqliteRepo (built-in Node SQLite, zero config)
 *
 * The singleton is cached per-process so dev hot-reload doesn't open a million
 * database handles. Both repos are statically imported; only the active one is
 * instantiated. SupabaseRepo performs no network calls at construction time,
 * so importing it on the SQLite path is free.
 */

import type { Repo } from "@/lib/database/repo-interface";
import { isSupabaseEnabled } from "@/lib/config";
import { SqliteRepo } from "@/lib/database/sqlite-repo";
import { SupabaseRepo } from "@/lib/database/supabase-repo";

let cached: Repo | null = null;

export function getRepo(): Repo {
  if (cached) return cached;
  cached = isSupabaseEnabled() ? new SupabaseRepo() : new SqliteRepo();
  return cached!;
}
