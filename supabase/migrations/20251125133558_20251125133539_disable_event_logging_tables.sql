/*
  # Disable Event Logging Tables

  1. Changes
    - Disable realtime for `analytics_events` table
    - Disable realtime for `app_logs` table
    - This stops event log generation for these tables

  2. Security
    - Tables remain accessible but stop generating events
    - Reduces database load and log noise
*/

-- Disable realtime for analytics_events (ignore if not in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE analytics_events;
EXCEPTION
  WHEN OTHERS THEN
    -- Table not in publication, skip
    NULL;
END $$;

-- Disable realtime for app_logs (ignore if not in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE app_logs;
EXCEPTION
  WHEN OTHERS THEN
    -- Table not in publication, skip
    NULL;
END $$;

-- Add comment to document the change
COMMENT ON TABLE analytics_events IS 'Analytics events table - realtime disabled';
COMMENT ON TABLE app_logs IS 'Application logs table - realtime disabled';
