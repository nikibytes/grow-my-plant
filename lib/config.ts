/**
 * Central runtime configuration. All env access funnels through here so it is
 * easy to reason about what is required in local vs production mode.
 */

export const config = {
  databaseProvider: (process.env.DATABASE_PROVIDER ?? "sqlite").toLowerCase(),
  sqlitePath: process.env.SQLITE_PATH ?? "./data/grow-my-plant.db",

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  adminSecret: process.env.ADMIN_SECRET ?? "dev-secret",
  instagramVerifyToken: process.env.INSTAGRAM_VERIFY_TOKEN ?? "dev-verify-token",
  instagramTargetMediaId: process.env.INSTAGRAM_TARGET_MEDIA_ID ?? "",
  instagramPermalink: process.env.INSTAGRAM_PERMALINK ?? "https://www.instagram.com/",

  isProd: process.env.NODE_ENV === "production",
} as const;

export type AppConfig = typeof config;

export function isSupabaseEnabled(): boolean {
  return (
    config.databaseProvider === "supabase" &&
    !!config.supabaseUrl &&
    !!config.supabaseServiceRoleKey
  );
}
