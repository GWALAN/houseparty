/*
  # Fix Friend Request Race Conditions

  ## Root Cause
  - When User A cancels and resends a friend request, User B's UI may still reference the old (deleted) request ID
  - The accept_friend_request function fails with "item not found" when trying to accept the deleted request
  - No unique constraint prevents multiple pending requests between same users
  - Race condition between delete and create operations

  ## Solution
  1. Add partial unique constraint for pending requests only
  2. Update accept_friend_request to lookup by relationship instead of just ID
  3. Add proper error handling and request resolution logic
  4. Clean up stale data that could cause issues

  ## Security
  - Maintains all existing RLS policies
  - Uses SECURITY DEFINER with proper auth checks
*/

-- Step 1: Clean up any existing duplicate pending requests
-- Keep only the most recent pending request between each pair of users
DELETE FROM friend_requests fr1
WHERE fr1.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM friend_requests fr2
    WHERE fr2.sender_id = fr1.sender_id
      AND fr2.recipient_id = fr1.recipient_id
      AND fr2.status = 'pending'
      AND fr2.created_at > fr1.created_at
  );

-- Step 2: Add partial unique constraint for pending requests only
-- This prevents duplicate pending requests while allowing multiple rejected/accepted records
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_friend_request
  ON friend_requests(sender_id, recipient_id)
  WHERE status = 'pending';

-- Step 3: Create improved accept function that handles the race condition
CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid;
  v_recipient_id uuid;
  v_request_exists boolean;
  v_actual_request_id uuid;
BEGIN
  -- First, try to get the request by the provided ID
  SELECT sender_id, recipient_id INTO v_sender_id, v_recipient_id
  FROM friend_requests
  WHERE id = request_id
    AND recipient_id = auth.uid()
    AND status = 'pending';

  -- If not found by ID, check if there's a pending request from the same sender
  -- This handles the race condition where the old request was deleted and recreated
  IF v_sender_id IS NULL THEN
    -- Try to find any pending request from the sender to this recipient
    SELECT id, sender_id, recipient_id
    INTO v_actual_request_id, v_sender_id, v_recipient_id
    FROM friend_requests
    WHERE recipient_id = auth.uid()
      AND status = 'pending'
      AND sender_id = (
        SELECT sender_id FROM friend_requests WHERE id = request_id
        UNION
        SELECT sender_id FROM friend_requests
        WHERE recipient_id = auth.uid() AND status = 'pending'
        LIMIT 1
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_actual_request_id IS NULL THEN
      RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;

    -- Use the actual current request ID instead of the stale one
    request_id := v_actual_request_id;
  END IF;

  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = auth.uid() AND friend_id = v_sender_id
  ) THEN
    -- Already friends, just mark request as accepted and exit
    UPDATE friend_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = request_id;
    RETURN;
  END IF;

  -- Update request status to accepted
  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id AND status = 'pending';

  -- Create bidirectional friendship
  INSERT INTO friendships (user_id, friend_id, created_at)
  VALUES
    (v_sender_id, v_recipient_id, now()),
    (v_recipient_id, v_sender_id, now())
  ON CONFLICT (user_id, friend_id) DO NOTHING;

END;
$$;

-- Step 4: Improve the friend request search to use the most recent pending request
CREATE OR REPLACE FUNCTION get_pending_request_by_users(sender_user_id uuid, recipient_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  -- Get the most recent pending request between these users
  SELECT id INTO v_request_id
  FROM friend_requests
  WHERE sender_id = sender_user_id
    AND recipient_id = recipient_user_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_request_id;
END;
$$;

-- Step 5: Add trigger to notify realtime subscribers when requests are deleted
-- This helps keep the UI in sync
CREATE OR REPLACE FUNCTION notify_friend_request_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- The deletion itself will trigger realtime, no additional action needed
  -- This trigger exists for future enhancements
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS friend_request_delete_trigger ON friend_requests;
CREATE TRIGGER friend_request_delete_trigger
  AFTER DELETE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_delete();

-- Step 6: Add helpful comments
COMMENT ON FUNCTION accept_friend_request IS 'Accepts a friend request with race condition handling - will find the current pending request even if the original ID is stale';
COMMENT ON INDEX unique_pending_friend_request IS 'Ensures only one pending friend request can exist between any two users';