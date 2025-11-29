/*
  # Enable Realtime for Game Tracking Tables

  ## Critical Issue
  The leaderboard and game history screens rely on real-time subscriptions to update when games finish
  or scores change, but realtime was never enabled for the game_sessions and session_scores tables.

  This causes:
  - Leaderboard not updating when games complete
  - Score changes not propagating to viewers
  - Users having to manually refresh to see results

  ## Solution
  Enable Supabase realtime for both tables and set REPLICA IDENTITY to FULL so that realtime
  events include all column data needed by subscribers.

  ## Tables Affected
  - game_sessions: Main table for game tracking
  - session_scores: Individual player scores per session

  ## Impact
  After this migration, any INSERT, UPDATE, or DELETE on these tables will trigger realtime
  events that subscribers can listen to, enabling live leaderboard updates.
*/

-- Enable realtime for game_sessions table
ALTER TABLE game_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;

-- Enable realtime for session_scores table
ALTER TABLE session_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE session_scores;

-- Add comments for documentation
COMMENT ON TABLE game_sessions IS 'Game session tracking with realtime enabled for live updates';
COMMENT ON TABLE session_scores IS 'Player scores per session with realtime enabled for live leaderboards';
