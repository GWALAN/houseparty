/*
  # Create app logs table for remote logging

  1. New Tables
    - `app_logs`
      - `id` (uuid, primary key)
      - `level` (text) - log level: debug, info, warn, error
      - `message` (text) - log message
      - `data` (text) - additional data as JSON string
      - `timestamp` (timestamptz) - when the log occurred
      - `user_id` (uuid, nullable) - user who triggered the log
      - `device_info` (jsonb) - device information
      - `created_at` (timestamptz) - when record was created

  2. Security
    - Enable RLS on `app_logs` table
    - Add policy for authenticated users to insert their own logs
    - Add policy for service role to read all logs

  3. Indexes
    - Index on user_id for faster filtering
    - Index on timestamp for time-based queries
    - Index on level for filtering by severity
*/

CREATE TABLE IF NOT EXISTS app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  data text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Users can insert their own logs"
  ON app_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs"
  ON app_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);