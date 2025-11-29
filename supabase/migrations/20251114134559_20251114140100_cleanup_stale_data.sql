/*
  # Cleanup Stale Friendship and Request Data

  1. Purpose
    - Remove any orphaned friendship records (one-way friendships)
    - Remove any stale rejected friend requests
    - Ensure data consistency before going live

  2. Changes
    - Delete friendships without reciprocal records
    - Delete old rejected friend requests to allow re-sending
*/

-- Clean up one-way friendships (should be bidirectional)
DELETE FROM friendships f1
WHERE NOT EXISTS (
  SELECT 1 FROM friendships f2
  WHERE f2.user_id = f1.friend_id
    AND f2.friend_id = f1.user_id
);

-- Clean up rejected friend requests older than 1 day
-- This allows users to send fresh requests after rejection
DELETE FROM friend_requests
WHERE status = 'rejected'
  AND created_at < NOW() - INTERVAL '1 day';

-- Note: accepted requests are kept for historical purposes
-- Note: pending requests are kept until they're acted upon