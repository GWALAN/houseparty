/*
  # Add Ongoing Game Status Support

  1. Changes
    - Adds 'ongoing' status to game_sessions table
    - Adds paused_at timestamp for pause/resume functionality
    - Adds last_updated_at for tracking score updates
    - Updates existing status check constraint to include 'ongoing'
    - Adds index on status for faster queries
    
  2. Purpose
    - Enable multi-day/week/month game sessions
    - Allow players to update scores over extended periods
    - Track when games are paused vs actively being played
    - Support real-time leaderboard updates for active games
*/

-- Drop existing status constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'game_sessions' AND constraint_name = 'game_sessions_status_check'
  ) THEN
    ALTER TABLE game_sessions DROP CONSTRAINT game_sessions_status_check;
  END IF;
END $$;

-- Add new columns for ongoing game support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN paused_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'last_updated_at'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN last_updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add updated status constraint that includes 'ongoing'
ALTER TABLE game_sessions 
  ADD CONSTRAINT game_sessions_status_check 
  CHECK (status IN ('active', 'ongoing', 'completed', 'cancelled'));

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_game_sessions_status 
  ON game_sessions(status) 
  WHERE status IN ('active', 'ongoing');

-- Create function to update last_updated_at automatically
CREATE OR REPLACE FUNCTION update_game_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update timestamp when session is modified
DROP TRIGGER IF EXISTS trigger_update_game_session_timestamp ON game_sessions;
CREATE TRIGGER trigger_update_game_session_timestamp
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_session_timestamp();

-- Create function to auto-update session timestamp when scores change
CREATE OR REPLACE FUNCTION update_session_on_score_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE game_sessions 
  SET last_updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on session_scores to update parent session
DROP TRIGGER IF EXISTS trigger_update_session_on_score ON session_scores;
CREATE TRIGGER trigger_update_session_on_score
  AFTER INSERT OR UPDATE ON session_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_score_change();

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.status IS 'Game status: active (current session), ongoing (multi-day tracking), completed (finished), cancelled (abandoned)';
COMMENT ON COLUMN game_sessions.paused_at IS 'Timestamp when an ongoing game was paused';
COMMENT ON COLUMN game_sessions.last_updated_at IS 'Last time any score was updated for this session';
