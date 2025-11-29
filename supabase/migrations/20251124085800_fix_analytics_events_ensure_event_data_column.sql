/*
  # Fix Analytics Events - Ensure event_data Column Exists

  1. Changes
    - Verify and add event_data column to analytics_events table if missing
    - This column is required by game invitation functions but may not exist in new database
  
  2. Impact
    - Fixes accept_game_invitation and decline_game_invitation errors
    - Allows proper logging of analytics events with contextual data
*/

-- Ensure event_data column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'event_data'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN event_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Ensure index exists for event_data queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_data 
ON analytics_events USING gin(event_data);