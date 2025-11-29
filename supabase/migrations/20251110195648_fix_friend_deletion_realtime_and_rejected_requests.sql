/*
  # Fix Friend Deletion Realtime and Rejected Request Issues

  1. Changes
    - Modify unique_friend_request constraint to only apply to 'pending' and 'accepted' requests
    - This allows sending new requests after blocking/unblocking
    - Add index for better query performance on status column
  
  2. Notes
    - Users can now send friend requests after unblocking
    - Old rejected requests won't block new requests
    - Realtime will be fixed in frontend code
*/

-- Drop the old unique constraint
ALTER TABLE friend_requests 
DROP CONSTRAINT IF EXISTS unique_friend_request;

-- Create a partial unique index that only applies to pending/accepted requests
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_friend_request 
ON friend_requests (sender_id, recipient_id) 
WHERE status IN ('pending', 'accepted');

-- Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_status 
ON friend_requests (status);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status 
ON friend_requests (recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status 
ON friend_requests (sender_id, status);
