-- Grow My Plant — Supabase / Postgres schema
-- Run in the Supabase SQL editor (or `supabase db push`).

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instagram_media_id TEXT UNIQUE,
  instagram_permalink TEXT,
  trigger_terms JSONB NOT NULL DEFAULT '["🌱"]',
  one_leaf_per_user BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_mode TEXT NOT NULL DEFAULT 'automatic',
  remove_leaf_on_comment_delete BOOLEAN NOT NULL DEFAULT FALSE,
  current_stage TEXT NOT NULL DEFAULT 'seed',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  instagram_comment_id TEXT UNIQUE NOT NULL,
  instagram_user_id TEXT,
  instagram_username TEXT NOT NULL,
  display_username TEXT NOT NULL,
  comment_text TEXT,
  leaf_style INTEGER NOT NULL,
  anchor_index INTEGER NOT NULL,
  rotation NUMERIC,
  scale NUMERIC,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, instagram_user_id)
);

CREATE TABLE IF NOT EXISTS instagram_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_key TEXT UNIQUE,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  instagram_user_id TEXT,
  instagram_username TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_campaign ON leaves(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON instagram_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_blocked_campaign ON blocked_users(campaign_id);

-- Enable Realtime on leaves for the production live-update path.
ALTER PUBLICATION supabase_realtime ADD TABLE leaves;
