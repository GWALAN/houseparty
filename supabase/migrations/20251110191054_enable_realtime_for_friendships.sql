/*
  # Enable Realtime for Friendships Table

  1. Changes
    - Enable Realtime publication for the friendships table
    - This allows real-time subscriptions to receive DELETE, INSERT, and UPDATE events
    - Required for live friend list updates across connected clients

  2. Security
    - RLS policies already in place on friendships table
    - Only authorized users will receive events for their own friendships
*/

-- Enable Realtime for the friendships table
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
