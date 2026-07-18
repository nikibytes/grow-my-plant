/**
 * DDL shared (morphologically) by SQLite and Supabase. The SQLite version uses
 * TEXT in place of TIMESTAMPTZ / JSONB, handled in the repo layer.
 * The canonical Postgres/JSONB version lives in supabase/migrations/0001_init.sql.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instagram_media_id TEXT,
  instagram_permalink TEXT,
  trigger_terms TEXT NOT NULL DEFAULT '["🌱"]',
  one_leaf_per_user INTEGER NOT NULL DEFAULT 1,
  moderation_mode TEXT NOT NULL DEFAULT 'automatic',
  remove_leaf_on_comment_delete INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'seed',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leaves (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  instagram_comment_id TEXT UNIQUE NOT NULL,
  instagram_user_id TEXT,
  instagram_username TEXT NOT NULL,
  display_username TEXT NOT NULL,
  comment_text TEXT,
  leaf_style INTEGER NOT NULL,
  anchor_index INTEGER NOT NULL,
  rotation REAL,
  scale REAL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, instagram_user_id)
);

CREATE TABLE IF NOT EXISTS instagram_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_key TEXT UNIQUE,
  payload TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS blocked_users (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id),
  instagram_user_id TEXT,
  instagram_username TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaves_campaign ON leaves(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON instagram_events(processing_status);
`;
