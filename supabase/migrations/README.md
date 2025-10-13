# Supabase Migration

This directory contains the SQL migration for the Vibe in the Dark database schema.

## Quick Start

There's only **ONE migration file** to run! 🎉

1. Log in to your Supabase dashboard at https://supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **"+ New query"**
5. Copy and paste the contents of `001_create_games_table.sql`
6. Click **"Run"**

That's it! ✅

## What Does This Migration Do?

Creates a single `games` table that stores entire game state as JSONB:

```sql
CREATE TABLE games (
  code TEXT PRIMARY KEY,           -- Game code like "VIBE"
  game_data JSONB NOT NULL,        -- Entire game object as JSON
  created_at BIGINT NOT NULL,      -- Unix timestamp in milliseconds
  version INTEGER NOT NULL DEFAULT 1, -- For optimistic locking
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Why JSONB?

- ✅ **Simple** - One table instead of 6 normalized tables
- ✅ **Fast** - Single query to get entire game state
- ✅ **Flexible** - Matches in-memory structure exactly
- ✅ **Efficient** - PostgreSQL JSONB is indexed and performant
- ✅ **Perfect for ephemeral game data**

The entire `Game` object (with participants, votes, reactions, etc.) is stored as a JSON blob in `game_data`.

### Optimistic Locking

The `version` column prevents race conditions when multiple players update simultaneously:
- Each update checks the current version
- If version changed (someone else updated), the operation retries with fresh data
- Adds ~1-2ms latency but ensures no lost updates
- Automatic retry with max 3 attempts

## Indexes

The migration creates two indexes:
1. `idx_games_created_at` - For cleanup of old games
2. `idx_games_status` - For filtering by game status (lobby, active, etc.)

## Cleanup

The migration includes a helper function to delete games older than 2 hours:

```sql
SELECT cleanup_old_games();
```

This returns the number of games deleted. You can run this manually or set up a cron job in Supabase if needed.

## Verification

After running the migration, verify it was successful:

```sql
-- Check the table exists
SELECT * FROM games LIMIT 1;

-- Should return an empty result or your games
```

## Rollback (if needed)

If you need to start fresh:

```sql
DROP TABLE IF EXISTS games CASCADE;
DROP FUNCTION IF EXISTS update_games_metadata() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_games() CASCADE;
```

Then re-run the migration.
