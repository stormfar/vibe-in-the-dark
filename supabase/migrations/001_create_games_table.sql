-- Migration 001: Create games table with JSONB storage
-- This is the ONLY migration you need to run!
-- Copy and paste this into Supabase SQL Editor and click "Run"

CREATE TABLE IF NOT EXISTS games (
  code TEXT PRIMARY KEY,
  game_data JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Create index on status within JSONB for filtering active games
CREATE INDEX IF NOT EXISTS idx_games_status ON games USING gin ((game_data->'status'));

-- Add trigger to automatically update updated_at timestamp and increment version
CREATE OR REPLACE FUNCTION update_games_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_metadata_trigger
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_metadata();

-- Optional: Helper function to cleanup old games
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM games
  WHERE created_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '2 hours') * 1000;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- You can manually run cleanup with: SELECT cleanup_old_games();
