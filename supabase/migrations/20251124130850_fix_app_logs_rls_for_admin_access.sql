/*
  # Fix app_logs RLS for Admin Access
  
  1. Changes
    - Add policy to allow service role to view all logs
    - This enables viewing logs in Supabase Dashboard
    - Keep existing user policies intact
  
  2. Security
    - Users can still only view their own logs
    - Service role and admins can view all logs for debugging
*/

-- Add policy for service role to view all logs
CREATE POLICY "Service role can view all logs"
  ON app_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Add policy for admins to view all logs (optional - only if you have admin role)
-- If you want to add admin users later, uncomment this:
-- CREATE POLICY "Admins can view all logs"
--   ON app_logs
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid()
--       AND is_admin = true
--     )
--   );
