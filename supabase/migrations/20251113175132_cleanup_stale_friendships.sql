/*
  # Clean Up Stale Friendships
  
  1. Problem
    - One-way friendships exist (where reverse doesn't exist)
    - Friendships involving blocked users
    - Self-friendships (should never exist)
  
  2. Solution
    - Remove self-friendships
    - Remove friendships involving blocked users
    - Remove one-way friendships where reverse doesn't exist
  
  3. Impact
    - Ensures friendships table only contains valid bidirectional friendships
    - Prevents stale friends from appearing in player select lists
    - Cleans up historical data from before RLS policies existed
*/

-- Remove self-friendships (should be blocked by constraint but clean anyway)
DELETE FROM friendships
WHERE user_id = friend_id;

-- Remove friendships involving blocked users
DELETE FROM friendships f
WHERE EXISTS (
  SELECT 1 FROM blocked_users b
  WHERE (b.blocker_id = f.user_id AND b.blocked_id = f.friend_id)
     OR (b.blocker_id = f.friend_id AND b.blocked_id = f.user_id)
);

-- Remove one-way friendships (where reverse doesn't exist)
-- This is the main fix for stale data
DELETE FROM friendships f
WHERE NOT EXISTS (
  SELECT 1 FROM friendships f2
  WHERE f2.user_id = f.friend_id
    AND f2.friend_id = f.user_id
);
