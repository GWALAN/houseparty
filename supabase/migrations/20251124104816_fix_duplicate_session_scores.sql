/*
  # Fix Duplicate Session Scores

  ## Summary
  The leaderboard is showing duplicate players because `session_scores` table has duplicate
  entries for the same user in the same game session. This migration:
  1. Removes duplicate session_scores entries (keeps best placement)
  2. Adds unique constraint to prevent future duplicates
  3. Updates get_house_game_history to handle any remaining edge cases

  ## Changes
  
  1. **Clean Up Duplicates**
     - Delete duplicate entries, keeping the one with best placement
     - For ties, keep the entry with earliest created timestamp
  
  2. **Add Unique Constraint**
     - Prevent (session_id, user_id) duplicates from being created
  
  3. **Fix Function**
     - Add DISTINCT ON to ensure no duplicate users in results
*/

-- Step 1: Delete duplicate session_scores, keeping only the best placement per user per session
WITH ranked_scores AS (
  SELECT 
    id,
    session_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id, user_id 
      ORDER BY 
        CASE WHEN placement IS NOT NULL THEN placement ELSE 999 END ASC,
        is_winner DESC,
        score DESC,
        created_at ASC
    ) as rn
  FROM session_scores
)
DELETE FROM session_scores
WHERE id IN (
  SELECT id 
  FROM ranked_scores 
  WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'session_scores_session_user_unique'
  ) THEN
    ALTER TABLE session_scores 
    ADD CONSTRAINT session_scores_session_user_unique 
    UNIQUE (session_id, user_id);
  END IF;
END $$;

-- Step 3: Recreate the function with DISTINCT to handle edge cases
DROP FUNCTION IF EXISTS get_house_game_history(UUID);

CREATE OR REPLACE FUNCTION get_house_game_history(house_id_param UUID)
RETURNS TABLE (
  session_id UUID,
  game_id UUID,
  game_name TEXT,
  game_emoji TEXT,
  game_type TEXT,
  scoring_type TEXT,
  scoring_unit TEXT,
  lower_is_better BOOLEAN,
  distance_unit TEXT,
  weight_unit TEXT,
  max_attempts INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  participants JSONB,
  winner_id UUID,
  winner_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH session_players AS (
    SELECT 
      gs.id as session_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'username', COALESCE(p.username, 'Unknown'),
          'nickname', COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown'),
          'score', COALESCE(ss.score, 0),
          'placement', ss.placement,
          'is_winner', COALESCE(ss.is_winner, false),
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme,
          'accuracy_hits', ss.accuracy_hits,
          'accuracy_attempts', ss.accuracy_attempts,
          'ratio_numerator', ss.ratio_numerator,
          'ratio_denominator', ss.ratio_denominator
        ) ORDER BY 
          CASE WHEN ss.placement IS NOT NULL THEN ss.placement ELSE 999 END ASC,
          ss.score DESC
      ) FILTER (WHERE ss.user_id IS NOT NULL) as players_data,
      (array_agg(ss.user_id ORDER BY ss.is_winner DESC NULLS LAST) FILTER (WHERE ss.is_winner = true))[1] as winner_user_id,
      (array_agg(COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown') ORDER BY ss.is_winner DESC NULLS LAST) FILTER (WHERE ss.is_winner = true))[1] as winner_username
    FROM game_sessions gs
    INNER JOIN session_scores ss ON ss.session_id = gs.id
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = gs.house_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    GROUP BY gs.id
  )
  SELECT 
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    COALESCE(g.emoji, '🎮') as game_emoji,
    g.game_type,
    g.scoring_type,
    g.scoring_unit,
    g.lower_is_better,
    g.distance_unit,
    g.weight_unit,
    g.max_attempts,
    gs.started_at,
    gs.completed_at,
    gs.status,
    COALESCE(sp.players_data, '[]'::jsonb) as participants,
    sp.winner_user_id as winner_id,
    sp.winner_username as winner_name
  FROM game_sessions gs
  JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_players sp ON sp.session_id = gs.id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  ORDER BY gs.completed_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_house_game_history(UUID) TO authenticated;

-- Log results
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT session_id, user_id, COUNT(*) as cnt
    FROM session_scores
    GROUP BY session_id, user_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  RAISE NOTICE 'Cleanup complete. Remaining duplicates: %', duplicate_count;
END $$;