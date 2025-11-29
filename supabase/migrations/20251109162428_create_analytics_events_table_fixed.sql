/*
  # Create Analytics Events Table

  1. New Tables
    - `analytics_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `event_name` (text, the name of the tracked event)
      - `event_data` (jsonb, flexible data storage for event properties)
      - `created_at` (timestamptz, when the event occurred)
      
  2. Security
    - Enable RLS on `analytics_events` table
    - Users can insert their own analytics events
    - Only authenticated users can view their own events
    - Service role can read all events for analytics purposes
    
  3. Performance
    - Index on user_id for fast lookups
    - Index on event_name for filtering by event type
    - Index on created_at for time-based queries
*/

-- Create analytics_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
ON analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name 
ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
ON analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Service role can read all analytics events" ON analytics_events;

-- Policy: Users can insert their own analytics events
CREATE POLICY "Users can insert own analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own analytics events
CREATE POLICY "Users can view own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can read all events for analytics
CREATE POLICY "Service role can read all analytics events"
  ON analytics_events
  FOR SELECT
  TO service_role
  USING (true);