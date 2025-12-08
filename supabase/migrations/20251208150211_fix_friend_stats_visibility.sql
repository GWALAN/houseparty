/*
  # Fix Friend Stats Visibility
  
  1. Problem
    - Users cannot view their friends' game stats
    - RLS policies only allow viewing own scores or scores in shared houses
  
  2. Solution
    - Add policy to allow viewing session scores of friends
    - This enables the player-stats page to work correctly when viewing friends
  
  3. Security
    - Only works for confirmed friendships (both users accepted)
    - Maintains privacy for non-friends
*/

-- Allow users to view session scores of their friends
CREATE POLICY "Users can view their friends' session scores"
  ON session_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = session_scores.user_id)
        OR
        (friendships.friend_id = auth.uid() AND friendships.user_id = session_scores.user_id)
      )
    )
  );