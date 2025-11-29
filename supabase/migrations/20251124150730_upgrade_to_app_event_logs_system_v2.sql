/*
  # Upgrade to Comprehensive App Event Logs System

  1. Changes to existing app_logs table
    - Add new columns for event tracking
    - Handle existing data column migration safely
    
  2. Security Updates
    - Update RLS to allow anonymous inserts (for pre-login crashes)
    
  3. Performance
    - Add indexes for common queries
    
  4. Helper Function
    - Create batch insert function
*/

-- Add new columns to app_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN event_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'event_name'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN event_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN status text CHECK (status IN ('start', 'success', 'fail', 'info'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'house_id'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN house_id uuid REFERENCES houses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN session_id uuid REFERENCES game_sessions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'screen_name'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN screen_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'app_version'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN app_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'platform'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN platform text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'build_channel'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN build_channel text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'error_stack'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN error_stack text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'breadcrumbs'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN breadcrumbs jsonb;
  END IF;

  -- Add metadata column if it doesn't exist (keep old 'data' column for now)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE app_logs ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can insert their own logs" ON app_logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON app_logs;

-- Create new policies that allow anonymous inserts (for pre-login crashes)
CREATE POLICY "Anyone can insert app logs"
  ON app_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view their own logs
CREATE POLICY "Users can view their own logs"
  ON app_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role can view all logs (for admin debugging)
CREATE POLICY "Service role can view all logs"
  ON app_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_app_logs_event_type ON app_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_app_logs_event_name ON app_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_app_logs_status ON app_logs(status);
CREATE INDEX IF NOT EXISTS idx_app_logs_house_id ON app_logs(house_id) WHERE house_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_game_id ON app_logs(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_session_id ON app_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_screen_name ON app_logs(screen_name);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_app_logs_user_timestamp ON app_logs(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_event_type_timestamp ON app_logs(event_type, timestamp DESC) WHERE event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_house_timestamp ON app_logs(house_id, timestamp DESC) WHERE house_id IS NOT NULL;

-- Create batch insert function for performance
CREATE OR REPLACE FUNCTION insert_app_logs_batch(logs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_logs (
    level,
    message,
    event_type,
    event_name,
    status,
    user_id,
    house_id,
    game_id,
    session_id,
    screen_name,
    app_version,
    platform,
    build_channel,
    device_info,
    metadata,
    error_stack,
    breadcrumbs,
    timestamp
  )
  SELECT
    (log->>'level')::text,
    log->>'message',
    log->>'event_type',
    log->>'event_name',
    log->>'status',
    (log->>'user_id')::uuid,
    (log->>'house_id')::uuid,
    (log->>'game_id')::uuid,
    (log->>'session_id')::uuid,
    log->>'screen_name',
    log->>'app_version',
    log->>'platform',
    log->>'build_channel',
    log->'device_info',
    log->'metadata',
    log->>'error_stack',
    log->'breadcrumbs',
    COALESCE((log->>'timestamp')::timestamptz, now())
  FROM jsonb_array_elements(logs) AS log;
END;
$$;