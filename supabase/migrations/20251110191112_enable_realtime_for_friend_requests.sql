/*
  # Enable Realtime for Friend Requests Table

  1. Changes
    - Enable Realtime publication for the friend_requests table
    - This allows real-time subscriptions to receive events for new requests
    - Required for instant friend request notifications

  2. Security
    - RLS policies already in place on friend_requests table
    - Only authorized users will receive events for their own requests
*/

-- Enable Realtime for the friend_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
