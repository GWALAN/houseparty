/*
  # Fix analytics_events Foreign Key

  1. Changes
    - Drop the incorrect foreign key to `profiles` table
    - Add correct foreign key to `auth.users` table
    - This fixes the 409 conflict when trying to insert analytics events
    
  2. Notes
    - The error occurs because `profiles` table might not have all users
    - `auth.users` is the authoritative source of user records
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

-- Add the correct foreign key to auth.users
ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;